import { randomUUID } from "node:crypto";
import { z } from "zod";
import { additionalServiceOptions } from "./service-fields";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import {
  accessibleInquiries,
  inquiryById,
  inquiryDepartments,
  quoteVersion,
  requireInquiry,
  workFor,
} from "./platform-business";
import { audit, demand, nextReference, platformDb } from "./platform-store";
import { publicBundle } from "./platform-cms";
import { queueMail } from "./platform-mail";
import { supplierById, requireSupplierArrangement } from "./platform-suppliers";

export const resourceSchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    department: z.enum(additionalServiceOptions),
    category: z.enum([
      "sound",
      "lighting",
      "display",
      "camera",
      "equipment",
      "vehicle",
      "personnel",
      "other",
    ]),
    ownership: z.enum(["owned", "hired", "partner"]),
    quantity: z.number().int().positive().max(100000),
    state: z.enum(["available", "maintenance", "unavailable"]),
    maintenanceDue: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    published: z.boolean(),
    supplierId: z.string().uuid().nullable().default(null),
    location: z.string().trim().max(200).default(""),
    conditionNote: z.string().trim().max(2000).default(""),
    publicationEvidence: z.string().trim().max(2000).default(""),
  })
  .strict();
export function saveResource(
  user: Principal,
  input: z.infer<typeof resourceSchema>,
  id?: string,
  expectedVersion?: number,
) {
  authorize(user, "resource.manage", input.department);
  const db = platformDb();
  if (input.published) {
    authorize(user, "resource.publish", input.department);
    demand(
      input.publicationEvidence.length >= 10,
      422,
      "Record approved public-catalogue evidence without customer details.",
    );
  }
  const key = id || randomUUID();
  db.transaction(() => {
    if (id) {
      const old = db
        .prepare("SELECT department,version FROM resources WHERE id=?")
        .get(id) as { department: string; version: number } | undefined;
      demand(old, 404, "Resource not found.");
      authorize(user, "resource.manage", old.department);
      demand(
        old.version === expectedVersion,
        409,
        "This resource changed. Reload its current version before editing.",
      );
    }
    if (input.supplierId) {
      const supplier = supplierById(input.supplierId);
      demand(
        supplier &&
          supplier.department === input.department &&
          input.ownership !== "owned",
        422,
        "Choose a supplier in the same department for a hired or partner resource.",
      );
    }
    const active = db
      .prepare(
        "SELECT COALESCE(SUM(a.quantity),0) AS count FROM resource_allocations a JOIN bookings b ON b.id=a.booking_id WHERE a.resource_id=? AND b.status NOT IN ('cancelled','completed')",
      )
      .get(key) as { count: number };
    if (id)
      demand(
        active.count === 0,
        409,
        "Resolve active allocations before changing this resource.",
      );
    db.prepare(
      "INSERT INTO resources(id,name,department,category,ownership,quantity,state,maintenance_due,published,created_at,location,condition_note,publication_evidence) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,department=excluded.department,category=excluded.category,ownership=excluded.ownership,quantity=excluded.quantity,state=excluded.state,maintenance_due=excluded.maintenance_due,published=excluded.published,location=excluded.location,condition_note=excluded.condition_note,publication_evidence=excluded.publication_evidence,version=resources.version+1",
    ).run(
      key,
      input.name,
      input.department,
      input.category,
      input.ownership,
      input.quantity,
      input.state,
      input.maintenanceDue,
      input.published ? 1 : 0,
      new Date().toISOString(),
      input.location,
      input.conditionNote,
      input.publicationEvidence,
    );
    db.prepare("UPDATE resources SET supplier_id=? WHERE id=?").run(
      input.supplierId,
      key,
    );
    audit(user.id, "resource.saved", "resource", key, undefined, input);
  })();
  return { id: key };
}
export const bookingSchema = z
  .object({
    quotationVersionId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    supervisorId: z.string().uuid(),
    team: z.string().trim().min(3).max(2000),
    resources: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            quantity: z.number().int().positive().max(100000),
          })
          .strict(),
      )
      .max(100),
    frequency: z.enum(["once", "daily", "weekly", "monthly"]).default("once"),
    visits: z.number().int().min(1).max(52).default(1),
  })
  .strict();
export function createBooking(
  user: Principal,
  input: z.infer<typeof bookingSchema>,
) {
  const version = quoteVersion(
    user,
    input.quotationVersionId,
    "booking.manage",
  );
  demand(
    version.status === "accepted" &&
      version.current_version === version.version,
    409,
    "A current, customer-accepted quotation is required.",
  );
  demand(
    input.endsAt > input.startsAt && input.startsAt > new Date().toISOString(),
    422,
    "Choose a future start and an end after the start.",
  );
  const inquiry = inquiryById(version.inquiry_id),
    departments = inquiryDepartments(inquiry);
  if (input.frequency !== "once")
    demand(
      departments.includes("general-cleaning"),
      422,
      "Recurring visits are available for cleaning contracts only.",
    );
  demand(
    input.frequency !== "once" || input.visits === 1,
    422,
    "A one-time booking must have exactly one visit.",
  );
  demand(
    new Set(input.resources.map((item) => item.id)).size ===
      input.resources.length,
    422,
    "Do not repeat a resource.",
  );
  const db = platformDb();
  return db.transaction(() => {
    const supervisor = db
      .prepare("SELECT roles,departments,state FROM platform_users WHERE id=?")
      .get(input.supervisorId) as
      { roles: string; departments: string; state: string } | undefined;
    demand(
      supervisor?.state === "active" &&
        JSON.parse(supervisor.roles).some((role: string) =>
          ["operations", "department_manager"].includes(role),
        ) &&
        departments.some((department) =>
          JSON.parse(supervisor.departments).includes(department),
        ),
      422,
      "Assign an active authorized supervisor.",
    );
    demand(
      !db
        .prepare("SELECT id FROM bookings WHERE quotation_version_id=?")
        .get(version.id),
      409,
      "A booking already exists for this quotation version.",
    );
    const id = randomUUID(),
      reference = nextReference("B"),
      now = new Date().toISOString();
    db.prepare(
      "INSERT INTO bookings(id,reference,quotation_version_id,inquiry_id,starts_at,ends_at,supervisor_id,team,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      reference,
      version.id,
      inquiry.id,
      input.startsAt,
      input.endsAt,
      input.supervisorId,
      input.team,
      now,
    );
    for (const allocation of input.resources) {
      const resource = db
        .prepare("SELECT department,quantity FROM resources WHERE id=?")
        .get(allocation.id) as
        { department: string; quantity: number } | undefined;
      demand(
        resource &&
          departments.includes(resource.department) &&
          hasPermission(user, "resource.manage", resource.department) &&
          allocation.quantity <= resource.quantity,
        422,
        "A selected resource is invalid or outside the approved scope.",
      );
      db.prepare(
        "INSERT INTO resource_allocations(booking_id,resource_id,quantity) VALUES(?,?,?)",
      ).run(id, allocation.id, allocation.quantity);
    }
    const cleaning = departments.includes("general-cleaning"),
      checklist = cleaning
        ? [
            "Approved scope and access confirmed",
            "Work areas cleaned",
            "Floor care completed as scoped",
            "Washrooms inspected as scoped",
            "Supplies and waste handled as agreed",
            "Customer handover recorded",
          ]
        : [
            "Authorized scope confirmed",
            "Safety and venue checks recorded",
            "Agreed service delivered",
            "Handover and outstanding issues recorded",
          ];
    for (let index = 0; index < input.visits; index++) {
      const date = new Date(input.startsAt);
      if (input.frequency === "daily")
        date.setUTCDate(date.getUTCDate() + index);
      if (input.frequency === "weekly")
        date.setUTCDate(date.getUTCDate() + 7 * index);
      if (input.frequency === "monthly") {
        const day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + index);
        const last = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate();
        date.setUTCDate(Math.min(day, last));
      }
      db.prepare(
        "INSERT INTO service_visits(id,booking_id,starts_at,supervisor_id,team,checklist) VALUES(?,?,?,?,?,?)",
      ).run(
        randomUUID(),
        id,
        date.toISOString(),
        input.supervisorId,
        input.team,
        JSON.stringify(checklist.map((label) => ({ label, done: false }))),
      );
    }
    if (input.visits > 1) {
      const last = db
        .prepare(
          "SELECT MAX(starts_at) AS value FROM service_visits WHERE booking_id=?",
        )
        .get(id) as { value: string };
      const duration = Date.parse(input.endsAt) - Date.parse(input.startsAt);
      db.prepare("UPDATE bookings SET ends_at=? WHERE id=?").run(
        new Date(Date.parse(last.value) + duration).toISOString(),
        id,
      );
    }
    const labels = departments.includes("ict-solutions")
      ? [
          "Discovery",
          "Design",
          "Authorization",
          "Implementation",
          "Testing",
          "Handover",
          "Closure",
        ]
      : [
          "Planning",
          "Preparation",
          "Execution",
          "Quality review",
          "Completion",
        ];
    db.prepare(
      "INSERT INTO delivery_projects(id,booking_id,inquiry_id,title,department,milestones,created_at) VALUES(?,?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      id,
      inquiry.id,
      `${reference} — service delivery`,
      workFor(inquiry.id).department,
      JSON.stringify(
        labels.map((label) => ({
          label,
          complete: false,
          evidence: "",
          completedAt: null,
        })),
      ),
      now,
    );
    audit(user.id, "booking.pending_created", "booking", id, undefined, {
      reference,
      quotationVersionId: version.id,
      visits: input.visits,
    });
    return { id, reference, status: "pending" };
  })();
}
export const bookingActionSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  action: z.enum(["confirm", "start", "complete", "cancel"]),
  conditions: z.object({
    contract: z.boolean(),
    payment: z.boolean(),
    staff: z.boolean(),
    resources: z.boolean(),
    safety: z.boolean(),
    permits: z.boolean().optional(),
    musicRights: z.boolean().optional(),
    electrical: z.boolean().optional(),
    rigging: z.boolean().optional(),
    equipmentInspection: z.boolean().optional(),
    competentCrew: z.boolean().optional(),
  }),
  reason: z.string().trim().min(10).max(2000),
});
export function bookingById(
  user: Principal,
  id: string,
  action = "inquiry.read",
) {
  const row = platformDb()
    .prepare("SELECT * FROM bookings WHERE id=?")
    .get(id) as
    | {
        id: string;
        inquiry_id: string;
        quotation_version_id: string;
        status: string;
        starts_at: string;
        ends_at: string;
        version: number;
        reference: string;
      }
    | undefined;
  demand(row, 404, "Booking not found.");
  requireInquiry(user, row.inquiry_id, action);
  return row;
}
// Called inside the booking mutation transaction, both when committing and before work starts.
function requireBookingResources(booking: ReturnType<typeof bookingById>) {
  const db = platformDb();
  const allocations = db
    .prepare(
      "SELECT a.resource_id,a.quantity,r.state,r.quantity AS capacity,r.maintenance_due,r.supplier_id,r.department,r.ownership FROM resource_allocations a JOIN resources r ON r.id=a.resource_id WHERE a.booking_id=?",
    )
    .all(booking.id) as {
    resource_id: string;
    quantity: number;
    state: string;
    capacity: number;
    maintenance_due: string | null;
    supplier_id: string | null;
    department: string;
    ownership: string;
  }[];
  for (const allocation of allocations) {
    if (allocation.ownership !== "owned")
      requireSupplierArrangement(
        allocation.supplier_id,
        allocation.department,
        booking.ends_at,
      );
    demand(
      allocation.state === "available" &&
        (!allocation.maintenance_due ||
          allocation.maintenance_due > booking.ends_at.slice(0, 10)),
      409,
      "A selected resource is unavailable or due for maintenance.",
    );
    const overlap = db
      .prepare(
        "SELECT COALESCE(SUM(a.quantity),0) AS used FROM resource_allocations a JOIN bookings b ON b.id=a.booking_id WHERE a.resource_id=? AND b.id!=? AND b.status IN ('confirmed','in_progress') AND b.starts_at<? AND b.ends_at>?",
      )
      .get(
        allocation.resource_id,
        booking.id,
        booking.ends_at,
        booking.starts_at,
      ) as { used: number };
    demand(
      overlap.used + allocation.quantity <= allocation.capacity,
      409,
      "Resource conflict: this booking would exceed available capacity.",
    );
  }
}
export function actOnBooking(
  user: Principal,
  input: z.infer<typeof bookingActionSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const booking = bookingById(
      user,
      input.id,
      input.action === "confirm" ? "booking.confirm" : "booking.manage",
    );
    demand(
      booking.version === input.expectedVersion,
      409,
      "The booking changed. Reload before acting.",
    );
    if (input.action === "confirm") {
      demand(
        booking.status === "pending",
        409,
        "Only a pending booking can be confirmed.",
      );
      demand(
        inquiryDepartments(inquiryById(booking.inquiry_id)).every(
          (department) => hasPermission(user, "booking.confirm", department),
        ),
        403,
        "Booking confirmation requires delegated operations authority for every included division.",
      );
      const q = db
        .prepare(
          "SELECT v.status,v.version,q.current_version FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id WHERE v.id=?",
        )
        .get(booking.quotation_version_id) as {
        status: string;
        version: number;
        current_version: number;
      };
      demand(
        q.status === "accepted" && q.version === q.current_version,
        409,
        "The accepted quotation version is no longer current.",
      );
      demand(
        [
          input.conditions.contract,
          input.conditions.payment,
          input.conditions.staff,
          input.conditions.resources,
          input.conditions.safety,
        ].every(Boolean),
        422,
        "Confirm contract, payment requirements, staff, resources and safety before committing.",
      );
      if (
        inquiryDepartments(inquiryById(booking.inquiry_id)).some((department) =>
          ["entertainment", "event-management"].includes(department),
        )
      )
        demand(
          [
            input.conditions.permits,
            input.conditions.musicRights,
            input.conditions.electrical,
            input.conditions.rigging,
            input.conditions.equipmentInspection,
            input.conditions.competentCrew,
          ].every(Boolean),
          422,
          "Record performance/music rights, event/venue permits, electrical safety, rigging, inspection and competent-crew checks (or a documented not-applicable assessment).",
        );
      requireBookingResources(booking);
      db.prepare(
        "UPDATE bookings SET status='confirmed',conditions_json=?,confirmed_by=?,version=version+1 WHERE id=?",
      ).run(JSON.stringify(input.conditions), user.id, booking.id);
      const inquiry = inquiryById(booking.inquiry_id);
      queueMail(
        `booking-confirmed:${booking.id}`,
        inquiry.email,
        `[${booking.reference}] TOC booking confirmed`,
        "Your TOC service booking has been confirmed by authorized operations staff. Sign in to the customer portal to review its schedule and agreed details.",
      );
    }
    if (input.action === "start") {
      demand(
        booking.status === "confirmed",
        409,
        "Confirm the booking before starting work.",
      );
      // A supplier may have been suspended since confirmation. Never start on stale safety assumptions.
      requireBookingResources(booking);
      db.prepare(
        "UPDATE bookings SET status='in_progress',version=version+1 WHERE id=?",
      ).run(booking.id);
    }
    if (input.action === "complete") {
      demand(
        booking.status === "in_progress",
        409,
        "Start the booking before closing it.",
      );
      const incomplete = db
        .prepare(
          "SELECT id FROM service_visits WHERE booking_id=? AND status!='completed' LIMIT 1",
        )
        .get(booking.id);
      demand(
        !incomplete,
        409,
        "Every visit needs a completed checklist and supervisor review.",
      );
      const project = db
        .prepare("SELECT milestones FROM delivery_projects WHERE booking_id=?")
        .get(booking.id) as { milestones: string };
      demand(
        JSON.parse(project.milestones).every(
          (milestone: { complete: boolean }) => milestone.complete,
        ),
        409,
        "Complete the project milestones with evidence first.",
      );
      db.prepare(
        "UPDATE bookings SET status='completed',version=version+1 WHERE id=?",
      ).run(booking.id);
      const inquiry = inquiryById(booking.inquiry_id);
      queueMail(
        `feedback:${booking.id}`,
        inquiry.email,
        `[${booking.reference}] Service closeout`,
        "TOC has recorded completion of the agreed service. Sign in to review the delivery timeline and leave feedback. Contact the team about any outstanding concerns.",
      );
    }
    if (input.action === "cancel") {
      demand(
        !["completed", "cancelled"].includes(booking.status),
        409,
        "This booking cannot be cancelled.",
      );
      db.prepare(
        "UPDATE bookings SET status='cancelled',version=version+1 WHERE id=?",
      ).run(booking.id);
    }
    audit(
      user.id,
      `booking.${input.action}`,
      "booking",
      booking.id,
      { status: booking.status },
      undefined,
      input.reason,
    );
    return { ok: true };
  })();
}
export const visitSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  checklist: z
    .array(z.object({ label: z.string().max(300), done: z.boolean() }).strict())
    .min(1)
    .max(40),
  issues: z.string().trim().max(3000),
  action: z.enum(["save", "submit", "review"]),
});
export function updateVisit(
  user: Principal,
  input: z.infer<typeof visitSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const row = db
      .prepare("SELECT * FROM service_visits WHERE id=?")
      .get(input.id) as
      | {
          booking_id: string;
          version: number;
          status: string;
          checklist: string;
          supervisor_id: string;
        }
      | undefined;
    demand(row, 404, "Visit not found.");
    const booking = bookingById(user, row.booking_id, "booking.manage");
    demand(
      ["confirmed", "in_progress"].includes(booking.status),
      409,
      "The booking must be active.",
    );
    demand(
      row.version === input.expectedVersion,
      409,
      "This visit changed. Reload before saving.",
    );
    demand(
      row.status !== "completed",
      409,
      "A reviewed visit is immutable. Record a new issue or follow-up instead.",
    );
    const previous = JSON.parse(row.checklist) as {
      label: string;
      done: boolean;
    }[];
    demand(
      JSON.stringify(previous.map((item) => item.label)) ===
        JSON.stringify(input.checklist.map((item) => item.label)),
      422,
      "Checklist scope cannot be silently changed.",
    );
    let status = row.status;
    if (input.action === "submit") {
      demand(
        input.checklist.every((item) => item.done),
        422,
        "Complete every checklist item before supervisor review.",
      );
      status = "awaiting_review";
    }
    if (input.action === "review") {
      demand(
        row.status === "awaiting_review" && previous.every((item) => item.done),
        409,
        "Submit a completed checklist for review first.",
      );
      demand(
        user.id === row.supervisor_id ||
          hasPermission(
            user,
            "booking.confirm",
            inquiryById(booking.inquiry_id).service,
          ),
        403,
        "The assigned supervisor or delegated operations approver must review this visit.",
      );
      demand(
        input.checklist.every((item) => item.done),
        422,
        "Reviewed checklists must be complete.",
      );
      status = "completed";
    }
    db.prepare(
      "UPDATE service_visits SET checklist=?,issues=?,status=?,reviewed_by=?,completed_at=?,version=version+1 WHERE id=?",
    ).run(
      JSON.stringify(input.checklist),
      input.issues,
      status,
      input.action === "review" ? user.id : null,
      input.action === "review" ? new Date().toISOString() : null,
      input.id,
    );
    audit(user.id, `visit.${input.action}`, "visit", input.id, undefined, {
      status,
      issues: input.issues,
    });
    return { ok: true };
  })();
}
export const milestoneSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  index: z.number().int().min(0).max(20),
  evidence: z.string().trim().min(10).max(4000),
  publicUpdate: z.string().trim().max(1000).optional(),
});
export function completeMilestone(
  user: Principal,
  input: z.infer<typeof milestoneSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const row = db
      .prepare("SELECT * FROM delivery_projects WHERE id=?")
      .get(input.id) as
      | {
          inquiry_id: string;
          booking_id: string;
          version: number;
          milestones: string;
        }
      | undefined;
    demand(row, 404, "Project not found.");
    requireInquiry(user, row.inquiry_id, "project.edit");
    demand(
      row.version === input.expectedVersion,
      409,
      "The project changed. Reload before saving.",
    );
    const booking = bookingById(user, row.booking_id, "project.edit");
    demand(
      ["confirmed", "in_progress"].includes(booking.status),
      409,
      "Confirm the booking before recording delivery milestones.",
    );
    const milestones = JSON.parse(row.milestones) as {
      label: string;
      complete: boolean;
      evidence: string;
      completedAt: string | null;
      publicUpdate?: string;
    }[];
    demand(
      milestones[input.index] &&
        !milestones[input.index].complete &&
        milestones.slice(0, input.index).every((item) => item.complete),
      409,
      "Complete milestones in order and preserve earlier evidence.",
    );
    milestones[input.index] = {
      ...milestones[input.index],
      complete: true,
      evidence: input.evidence,
      ...(input.publicUpdate ? { publicUpdate: input.publicUpdate } : {}),
      completedAt: new Date().toISOString(),
    };
    db.prepare(
      "UPDATE delivery_projects SET milestones=?,version=version+1 WHERE id=?",
    ).run(JSON.stringify(milestones), input.id);
    audit(
      user.id,
      "project.milestone_completed",
      "project",
      input.id,
      undefined,
      { index: input.index, evidence: input.evidence },
    );
    const inquiry = inquiryById(row.inquiry_id);
    queueMail(
      `milestone:${input.id}:${input.index}`,
      inquiry.email,
      `[${inquiry.reference}] Project progress update`,
      "A project milestone has been recorded by TOC staff. Sign in to view the delivery timeline and any outstanding actions.",
    );
    return { ok: true };
  })();
}
export function operationalRecords(user: Principal) {
  const ids = new Set(accessibleInquiries(user).map((inquiry) => inquiry.id)),
    db = platformDb();
  const bookings = (
    db.prepare("SELECT * FROM bookings ORDER BY starts_at DESC").all() as {
      id: string;
      inquiry_id: string;
      conditions_json: string;
    }[]
  ).filter((row) => ids.has(row.inquiry_id));
  const bookingIds = new Set(bookings.map((row) => row.id));
  return {
    bookings,
    visits: (
      db.prepare("SELECT * FROM service_visits ORDER BY starts_at").all() as {
        booking_id: string;
        checklist: string;
      }[]
    )
      .filter((row) => bookingIds.has(row.booking_id))
      .map((row) => ({ ...row, checklist: JSON.parse(row.checklist) })),
    projects: (
      db
        .prepare("SELECT * FROM delivery_projects ORDER BY created_at DESC")
        .all() as {
        id: string;
        booking_id: string;
        inquiry_id: string;
        version: number;
        milestones: string;
      }[]
    )
      .filter((row) => ids.has(row.inquiry_id))
      .map((row) => ({ ...row, milestones: JSON.parse(row.milestones) })),
  };
}
const reportDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date.");
export const reportFilters = z
  .object({
    from: reportDate.optional(),
    to: reportDate.optional(),
    division: z.enum(additionalServiceOptions).optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || value.to >= value.from,
    "The end date must not precede the start date.",
  );
export function operationalReport(
  user: Principal,
  filters: z.infer<typeof reportFilters> = {},
) {
  authorize(user, "reports.read");
  if (filters.division) authorize(user, "reports.read", filters.division);
  const inquiries = accessibleInquiries(user).filter((row) => {
      const localDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Dar_es_Salaam",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(row.createdAt));
      return (
        (!filters.from || localDate >= filters.from) &&
        (!filters.to || localDate <= filters.to) &&
        (!filters.division ||
          inquiryDepartments(row).includes(filters.division))
      );
    }),
    ids = new Set(inquiries.map((row) => row.id)),
    db = platformDb();
  const versions = (
    db
      .prepare(
        "SELECT v.*,q.inquiry_id FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id",
      )
      .all() as {
      id: string;
      status: string;
      snapshot: string;
      inquiry_id: string;
      issued_at: string | null;
    }[]
  ).filter((row) => ids.has(row.inquiry_id));
  const bookings = operationalRecords(user).bookings.filter((row) =>
      ids.has(row.inquiry_id),
    ),
    issued = versions.filter((row) => !!row.issued_at),
    accepted = issued.filter((row) => row.status === "accepted"),
    confirmed = bookings.filter((row) =>
      ["confirmed", "in_progress", "completed"].includes(
        (row as { status?: string }).status || "",
      ),
    );
  const firstIssued = new Map<string, number>();
  for (const row of issued) {
    const time = Date.parse(row.issued_at!);
    firstIssued.set(
      row.inquiry_id,
      Math.min(time, firstIssued.get(row.inquiry_id) || Infinity),
    );
  }
  const turnaround = inquiries.flatMap((inquiry) => {
    const issue = firstIssued.get(inquiry.id);
    return issue === undefined
      ? []
      : [Math.max(0, issue - Date.parse(inquiry.createdAt)) / 3600000];
  });
  const qualified = inquiries.filter(
      (row) => row.work.qualification === "qualified" && row.work.qualified_at,
    ),
    qualifiedIds = new Set(qualified.map((row) => row.id));
  const qualifiedIssued = new Set(
    issued
      .filter((row) => qualifiedIds.has(row.inquiry_id))
      .map((row) => row.inquiry_id),
  );
  const qualifiedTurnaround = qualified.flatMap((row) => {
    const issue = firstIssued.get(row.id),
      qualifiedAt = Date.parse(row.work.qualified_at!);
    // Offers predating qualification do not establish a qualification-to-offer duration.
    return issue === undefined || issue < qualifiedAt
      ? []
      : [(issue - qualifiedAt) / 3600000];
  });
  const meaningfulResponses = db
    .prepare(
      "SELECT m.inquiry_id,MIN(m.created_at) AS responded_at FROM customer_messages m JOIN platform_users u ON u.id=m.author_id WHERE m.visibility='customer' AND u.roles!='[\"customer\"]' AND m.author_id!=COALESCE((SELECT customer_id FROM inquiry_work WHERE inquiry_id=m.inquiry_id),'') GROUP BY m.inquiry_id",
    )
    .all() as { inquiry_id: string; responded_at: string }[];
  const responseHours = meaningfulResponses
    .flatMap((row) => {
      const inquiry = inquiries.find((i) => i.id === row.inquiry_id);
      return inquiry
        ? [
            (Date.parse(row.responded_at) - Date.parse(inquiry.createdAt)) /
              3600000,
          ]
        : [];
    })
    .filter((value) => value >= 0);
  const confirmedInquiryIds = new Set(confirmed.map((row) => row.inquiry_id));
  const sum = (rows: typeof versions) =>
    rows.reduce((total, row) => total + JSON.parse(row.snapshot).totalMinor, 0);
  return {
    asOf: new Date().toISOString(),
    period:
      filters.from || filters.to || filters.division
        ? `Inquiry-created cohort in EAT: ${filters.from || "earliest retained"} to ${filters.to || "present"}${filters.division ? ` · ${filters.division}` : ""}`
        : "All retained records visible to your departments",
    filters,
    inquiries: inquiries.length,
    qualifiedInquiries: qualified.length,
    qualifiedIssuanceRate: qualified.length
      ? qualifiedIssued.size / qualified.length
      : null,
    qualifiedBookingConversion: qualified.length
      ? [...confirmedInquiryIds].filter((id) => qualifiedIds.has(id)).length /
        qualified.length
      : null,
    averageResponseHours: responseHours.length
      ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length
      : null,
    averageQualifiedQuotationTurnaroundHours: qualifiedTurnaround.length
      ? qualifiedTurnaround.reduce((a, b) => a + b, 0) /
        qualifiedTurnaround.length
      : null,
    lostOpportunities: inquiries.filter((row) => row.work.outcome === "lost")
      .length,
    metricCoverage: {
      respondedInquiries: responseHours.length,
      qualifiedIssuedInquiries: qualifiedTurnaround.length,
    },
    byDivision: Object.fromEntries(
      additionalServiceOptions.map((department) => [
        department,
        inquiries.filter((inquiry) =>
          inquiryDepartments(inquiry).includes(department),
        ).length,
      ]),
    ),
    pendingApprovals: versions.filter(
      (row) => row.status === "pending_approval",
    ).length,
    issuedVersions: issued.length,
    acceptedVersions: accepted.length,
    acceptanceRate: issued.length ? accepted.length / issued.length : null,
    confirmedBookings: confirmed.length,
    bookingConversion: inquiries.length
      ? confirmedInquiryIds.size / inquiries.length
      : null,
    quotedMinor: sum(issued.filter((row) => row.status !== "superseded")),
    confirmedBookingMinor: sum(
      versions.filter((row) =>
        confirmed.some(
          (booking) =>
            (booking as unknown as { quotation_version_id: string })
              .quotation_version_id === row.id,
        ),
      ),
    ),
    averageQuotationTurnaroundHours: turnaround.length
      ? turnaround.reduce((a, b) => a + b, 0) / turnaround.length
      : null,
    lostOffers: issued.filter((row) =>
      ["rejected", "expired"].includes(row.status),
    ).length,
    overdueFollowups: inquiries.filter(
      (row) =>
        row.work.due_at &&
        row.work.due_at < new Date().toISOString() &&
        row.status !== "closed",
    ).length,
    invoicedMinor: null,
    collectedMinor: null,
    notice:
      "Quotation value is not revenue. Booking value, invoices and cash receipts are separate measures. First-offer turnaround uses the earliest issued version per inquiry. Acceptance rate uses all historically issued versions, including superseded, expired and declined offers; booking conversion uses distinct confirmed inquiry IDs. Qualification is an explicit staff assessment of service fit, requirements and contactability. Qualified rates use distinct qualified inquiry IDs. Meaningful response uses the first customer-visible staff message, not automated acknowledgements. Qualified turnaround excludes offers issued before qualification. Lost opportunities are staff-reviewed losses, not expired offers. Marketing attribution, invoices and reconciled payments are not connected. Division counts can overlap for bundled inquiries.",
  };
}

export function publicResourceCatalogue() {
  const divisions = new Set(publicBundle().catalog.map((row) => row.slug));
  return (
    platformDb()
      .prepare(
        "SELECT id,name,department,category,ownership FROM resources WHERE published=1 AND state='available' AND length(publication_evidence)>=10 AND category!='personnel' ORDER BY name",
      )
      .all() as {
      id: string;
      name: string;
      department: string;
      category: string;
      ownership: string;
    }[]
  ).filter((row) =>
    divisions.has(row.department as (typeof additionalServiceOptions)[number]),
  );
}
