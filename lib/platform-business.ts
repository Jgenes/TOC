import { randomUUID } from "node:crypto";
import { z } from "zod";
import { listInquiries, changeInquiryStatus } from "./database";
import {
  inquiryStatuses,
  todayInTanzania,
  isValidFutureDate,
  type StoredInquiry,
} from "./inquiry";
import { additionalServiceOptions } from "./service-fields";
import {
  authorize,
  hasPermission,
  issueToken,
  tokenRecord,
  type Principal,
} from "./platform-auth";
import { audit, demand, nextReference, platformDb } from "./platform-store";
import { queueMail } from "./platform-mail";
import { publicBundle } from "./platform-cms";

type Work = {
  inquiry_id: string;
  customer_id: string | null;
  assigned_to: string | null;
  department: string;
  classification_json: string | null;
  priority: string;
  next_action: string;
  due_at: string | null;
  version: number;
  updated_at: string;
  qualification: string;
  qualified_at: string | null;
  assessment_json: string | null;
  outcome: string;
  outcome_at: string | null;
};
export function registerInquiryWork(inquiry: StoredInquiry) {
  const primary = additionalServiceOptions.includes(
    inquiry.service as (typeof additionalServiceOptions)[number],
  )
    ? inquiry.service
    : "event-management";
  platformDb()
    .prepare(
      "INSERT OR IGNORE INTO inquiry_work(inquiry_id,department,priority,updated_at) VALUES(?,?,?,?)",
    )
    .run(
      inquiry.id,
      primary,
      inquiry.urgency || "normal",
      new Date().toISOString(),
    );
}
export function inquiryById(id: string) {
  const row = platformDb()
    .prepare("SELECT * FROM inquiries WHERE id=?")
    .get(id) as
    | {
        id: string;
        reference: string;
        status: StoredInquiry["status"];
        payload: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  demand(row, 404, "Inquiry not found.");
  const inquiry = {
    ...JSON.parse(row.payload),
    id: row.id,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as StoredInquiry;
  registerInquiryWork(inquiry);
  return inquiry;
}
export function inquiryDepartments(inquiry: StoredInquiry): string[] {
  const routing = workFor(inquiry.id);
  if (routing?.classification_json) {
    const classified = JSON.parse(routing.classification_json) as {
      additionalServices: string[];
    };
    return [routing.department, ...classified.additionalServices];
  }
  return [
    ...new Set([
      additionalServiceOptions.includes(
        inquiry.service as (typeof additionalServiceOptions)[number],
      )
        ? inquiry.service
        : "event-management",
      ...(inquiry.additionalServices || []),
      ...(inquiry.service === "event-management" &&
      inquiry.cateringRequired === "yes"
        ? ["catering"]
        : []),
    ]),
  ];
}
export function workFor(id: string) {
  return platformDb()
    .prepare("SELECT * FROM inquiry_work WHERE inquiry_id=?")
    .get(id) as Work;
}
export function canReadInquiry(user: Principal, inquiry: StoredInquiry) {
  const work = workFor(inquiry.id);
  return (
    work?.customer_id === user.id ||
    inquiryDepartments(inquiry).some((department) =>
      hasPermission(user, "inquiry.read", department),
    )
  );
}
export function requireInquiry(
  user: Principal,
  id: string,
  action = "inquiry.read",
) {
  const inquiry = inquiryById(id),
    work = workFor(id);
  if (action === "own")
    demand(
      work.customer_id === user.id,
      403,
      "This record does not belong to your account.",
    );
  else if (action === "inquiry.read")
    demand(
      canReadInquiry(user, inquiry),
      403,
      "You do not have access to this record.",
    );
  else
    demand(
      inquiryDepartments(inquiry).some((department) =>
        hasPermission(user, action, department),
      ),
      403,
      "Your role or department does not permit this action.",
    );
  return inquiry;
}
export function accessibleInquiries(user: Principal) {
  return listInquiries(null)
    .filter((inquiry) => {
      registerInquiryWork(inquiry);
      return canReadInquiry(user, inquiry);
    })
    .map((inquiry) => ({ ...inquiry, work: workFor(inquiry.id) }));
}
export function createInquiryClaim(inquiry: StoredInquiry) {
  registerInquiryWork(inquiry);
  const token = issueToken("claim", inquiry.email, null, inquiry.id);
  return token;
}
export function claimInquiry(user: Principal, token: string) {
  const db = platformDb();
  return db.transaction(() => {
    const claim = tokenRecord(token, "claim");
    demand(claim.record_id, 400, "Invalid claim.");
    demand(
      claim.email.toLowerCase() === user.email.toLowerCase() && user.verified,
      403,
      "Sign in with the verified email used for this inquiry.",
    );
    const inquiry = inquiryById(claim.record_id),
      work = workFor(inquiry.id);
    demand(
      !work.customer_id || work.customer_id === user.id,
      409,
      "This inquiry is already assigned to another account.",
    );
    db.prepare(
      "UPDATE inquiry_work SET customer_id=?,version=version+1,updated_at=? WHERE inquiry_id=?",
    ).run(user.id, new Date().toISOString(), inquiry.id);
    db.prepare("UPDATE platform_tokens SET used_at=? WHERE token_hash=?").run(
      new Date().toISOString(),
      claim.token_hash,
    );
    audit(user.id, "inquiry.claimed", "inquiry", inquiry.id);
    return { reference: inquiry.reference };
  })();
}
export const assignmentSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  assignedTo: z.string().uuid().nullable(),
  priority: z.enum(["planning", "normal", "high", "critical"]),
  nextAction: z.string().trim().min(3).max(1000),
  dueAt: z.string().datetime().nullable(),
  status: z.enum(inquiryStatuses).optional(),
});
export function assignInquiry(
  user: Principal,
  input: z.infer<typeof assignmentSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const inquiry = requireInquiry(user, input.id, "inquiry.edit"),
      before = workFor(input.id);
    demand(
      before.version === input.expectedVersion,
      409,
      "The inquiry changed. Reload before saving.",
    );
    if (input.assignedTo) {
      const staff = db
        .prepare(
          "SELECT roles,departments,state FROM platform_users WHERE id=?",
        )
        .get(input.assignedTo) as
        { roles: string; departments: string; state: string } | undefined;
      demand(
        staff?.state === "active" &&
          JSON.parse(staff.roles).some((role: string) =>
            ["department_manager", "operations", "finance"].includes(role),
          ) &&
          inquiryDepartments(inquiry).some((department) =>
            JSON.parse(staff.departments).includes(department),
          ),
        422,
        "Choose an active staff member authorized for a relevant department.",
      );
    }
    if (input.status) {
      const changed = changeInquiryStatus(input.id, input.status);
      if ("error" in changed)
        demand(
          false,
          changed.status || 409,
          changed.error || "Status change failed.",
        );
    }
    db.prepare(
      "UPDATE inquiry_work SET assigned_to=?,priority=?,next_action=?,due_at=?,version=version+1,updated_at=? WHERE inquiry_id=?",
    ).run(
      input.assignedTo,
      input.priority,
      input.nextAction,
      input.dueAt,
      new Date().toISOString(),
      input.id,
    );
    audit(user.id, "inquiry.assigned", "inquiry", input.id, before, input);
    if (input.assignedTo && input.assignedTo !== before.assigned_to) {
      const staff = db
        .prepare("SELECT email FROM platform_users WHERE id=?")
        .get(input.assignedTo) as { email: string };
      queueMail(
        `assignment:${input.id}:${before.version + 1}`,
        staff.email,
        `[${inquiry.reference}] Assigned inquiry`,
        "A TOC inquiry has been assigned to you. Sign in to the staff dashboard to review the request. No booking or commercial commitment is implied.",
      );
    }
    return { ok: true };
  })();
}
export function inquiryMessages(user: Principal, id: string) {
  requireInquiry(user, id);
  const own = workFor(id).customer_id === user.id;
  return platformDb()
    .prepare(
      `SELECT m.id,m.author_id,m.body,m.visibility,m.created_at,u.name AS author FROM customer_messages m LEFT JOIN platform_users u ON u.id=m.author_id WHERE m.inquiry_id=? ${own ? "AND m.visibility='customer'" : ""} ORDER BY m.created_at`,
    )
    .all(id);
}
export const messageSchema = z.object({
  inquiryId: z.string().uuid(),
  body: z.string().trim().min(2).max(5000),
  visibility: z.enum(["customer", "internal"]).default("customer"),
});
export function postMessage(
  user: Principal,
  input: z.infer<typeof messageSchema>,
) {
  const inquiry = requireInquiry(user, input.inquiryId),
    own = workFor(input.inquiryId).customer_id === user.id;
  if (own)
    demand(
      input.visibility === "customer",
      403,
      "Customers cannot create internal notes.",
    );
  else requireInquiry(user, input.inquiryId, "inquiry.edit");
  const id = randomUUID();
  platformDb().transaction(() => {
    platformDb()
      .prepare(
        "INSERT INTO customer_messages(id,inquiry_id,author_id,body,visibility,created_at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        id,
        input.inquiryId,
        user.id,
        input.body,
        input.visibility,
        new Date().toISOString(),
      );
    audit(user.id, "message.created", "inquiry", input.inquiryId, undefined, {
      messageId: id,
      visibility: input.visibility,
    });
    if (!own && input.visibility === "customer")
      queueMail(
        `message:${id}`,
        inquiry.email,
        `[${inquiry.reference}] New message from TOC`,
        "A new message is available in your TOC customer portal. Sign in to view it. Do not reply with passwords or sensitive credentials.",
      );
  })();
  return { id };
}
export function decimalMinor(value: string) {
  demand(
    /^\d{1,10}(?:\.\d{1,2})?$/.test(value),
    422,
    "Use a nonnegative monetary amount with up to two decimal places.",
  );
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  demand(result <= 900000000000n, 422, "Amount exceeds the supported limit.");
  return Number(result);
}
const roundRatio = (numerator: bigint, denominator: bigint) => {
  const value = (numerator + denominator / 2n) / denominator;
  demand(
    value <= 900000000000n,
    422,
    "A line amount exceeds the supported monetary limit.",
  );
  return Number(value);
};
export const quoteItemSchema = z
  .object({
    description: z.string().trim().min(3).max(500),
    quantity: z.string().regex(/^\d{1,7}(?:\.\d{1,3})?$/),
    unit: z.string().trim().min(1).max(40),
    unitPrice: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
    taxBps: z.number().int().min(0).max(10000),
    taxInclusive: z.boolean(),
    department: z.enum(additionalServiceOptions),
    priceRuleId: z.string().max(200).optional(),
  })
  .strict();
export const quoteSchema = z
  .object({
    inquiryId: z.string().uuid(),
    quotationId: z.string().uuid().optional(),
    items: z.array(quoteItemSchema).min(1).max(50),
    discountBps: z.number().int().min(0).max(10000).default(0),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    terms: z.string().trim().min(10).max(8000),
    scope: z.string().trim().min(10).max(8000),
    pricingReason: z.string().trim().min(10).max(2000),
    currency: z.literal("TZS").default("TZS"),
  })
  .strict();
export function calculateQuote(
  input: Pick<z.infer<typeof quoteSchema>, "items" | "discountBps">,
) {
  let subtotal = 0,
    tax = 0,
    discount = 0;
  const items = input.items.map((item) => {
    const [whole, fraction = ""] = item.quantity.split("."),
      milli = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
    demand(
      milli > 0 && milli <= 1000000000,
      422,
      "Quantities must be positive and within range.",
    );
    const rate = decimalMinor(item.unitPrice),
      gross = roundRatio(BigInt(rate) * BigInt(milli), 1000n),
      lineDiscount = roundRatio(
        BigInt(gross) * BigInt(input.discountBps),
        10000n,
      ),
      afterDiscount = gross - lineDiscount;
    const exclusive = item.taxInclusive
      ? roundRatio(BigInt(afterDiscount) * 10000n, BigInt(10000 + item.taxBps))
      : afterDiscount;
    const lineTax = item.taxInclusive
      ? afterDiscount - exclusive
      : roundRatio(BigInt(exclusive) * BigInt(item.taxBps), 10000n);
    subtotal += exclusive;
    tax += lineTax;
    discount += lineDiscount;
    return {
      ...item,
      unitMinor: rate,
      quantityMilli: milli,
      netMinor: exclusive,
      taxMinor: lineTax,
      totalMinor: exclusive + lineTax,
      discountMinor: lineDiscount,
    };
  });
  demand(
    subtotal + tax <= 900000000000,
    422,
    "Quotation exceeds the supported total.",
  );
  return {
    items,
    subtotalMinor: subtotal,
    taxMinor: tax,
    discountMinor: discount,
    totalMinor: subtotal + tax,
  };
}
type QuoteVersion = {
  id: string;
  quotation_id: string;
  version: number;
  snapshot: string;
  status: string;
  author_id: string;
  technical_by: string | null;
  finance_by: string | null;
  approved_by: string | null;
  issued_at: string | null;
  accepted_by: string | null;
  created_at: string;
};
export function quoteVersion(
  user: Principal,
  id: string,
  action = "quotation.read",
) {
  const row = platformDb()
    .prepare(
      "SELECT v.*,q.reference,q.inquiry_id,q.current_version FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id WHERE v.id=?",
    )
    .get(id) as
    | (QuoteVersion & {
        reference: string;
        inquiry_id: string;
        current_version: number;
      })
    | undefined;
  demand(row, 404, "Quotation not found.");
  const work =
    workFor(row.inquiry_id) ||
    (inquiryById(row.inquiry_id), workFor(row.inquiry_id));
  if (work.customer_id === user.id)
    demand(
      !!row.issued_at && action === "quotation.read",
      403,
      "This quotation is not available to your account.",
    );
  else requireInquiry(user, row.inquiry_id, action);
  return row;
}
export function createQuotation(
  user: Principal,
  input: z.infer<typeof quoteSchema>,
) {
  const inquiry = requireInquiry(user, input.inquiryId, "quotation.edit");
  demand(
    isValidFutureDate(input.expiresOn),
    422,
    "Set a valid future expiry date.",
  );
  const departments = inquiryDepartments(inquiry);
  for (const item of input.items)
    demand(
      departments.includes(item.department) &&
        hasPermission(user, "quotation.edit", item.department),
      403,
      "Each line item must be in an authorized department on the inquiry.",
    );
  const db = platformDb();
  // A claimed rule is resolved on the server. Browser-supplied rates never redefine it.
  const resolvedItems = input.items.map((item) => {
    if (!item.priceRuleId) return item; // Explicit manual proposal; reason and commercial approval remain mandatory.
    const [bookId, ruleId, extra] = item.priceRuleId.split(":");
    const book = db
      .prepare("SELECT * FROM price_books WHERE id=?")
      .get(bookId) as
      | {
          state: string;
          department: string;
          effective_from: string;
          effective_to: string;
          rules_json: string;
        }
      | undefined;
    const now = new Date().toISOString();
    demand(
      !extra &&
        book?.state === "approved" &&
        book.effective_from <= now &&
        book.effective_to > now &&
        book.department === item.department,
      422,
      "That price-book version is unavailable, expired or outside the line's department.",
    );
    const rule = (
      JSON.parse(book.rules_json) as {
        id: string;
        description: string;
        unit: string;
        unitPrice: string;
        taxBps: number;
        taxInclusive: boolean;
      }[]
    ).find((rule) => rule.id === ruleId);
    demand(rule, 422, "The approved pricing rule does not exist.");
    return {
      ...item,
      description: rule.description,
      unit: rule.unit,
      unitPrice: rule.unitPrice,
      taxBps: rule.taxBps,
      taxInclusive: rule.taxInclusive,
    };
  });
  const computed = calculateQuote({ ...input, items: resolvedItems });
  return db.transaction(() => {
    const now = new Date().toISOString();
    let quotationId = input.quotationId,
      reference: string,
      version = 1;
    if (quotationId) {
      const q = db
        .prepare("SELECT * FROM quotations WHERE id=? AND inquiry_id=?")
        .get(quotationId, input.inquiryId) as
        { id: string; reference: string } | undefined;
      demand(q, 404, "Quotation not found.");
      reference = q.reference;
      const latest = db
        .prepare(
          "SELECT MAX(version) AS version FROM quotation_versions WHERE quotation_id=?",
        )
        .get(quotationId) as { version: number };
      version = latest.version + 1;
    } else {
      quotationId = randomUUID();
      reference = nextReference("Q");
      db.prepare(
        "INSERT INTO quotations(id,reference,inquiry_id,created_at) VALUES(?,?,?,?)",
      ).run(quotationId, reference, input.inquiryId, now);
    }
    const id = randomUUID(),
      snapshot = {
        ...input,
        ...computed,
        company: publicBundle().profile,
        customer: {
          name: inquiry.name,
          organization: inquiry.organization,
          email: inquiry.email,
        },
        inquiryReference: inquiry.reference,
        departments,
        createdAt: now,
      };
    db.prepare(
      "INSERT INTO quotation_versions(id,quotation_id,version,snapshot,author_id,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, quotationId, version, JSON.stringify(snapshot), user.id, now);
    audit(user.id, "quotation.draft_created", "quotation", id, undefined, {
      reference,
      version,
      totalMinor: computed.totalMinor,
    });
    return { id, quotationId, reference, version };
  })();
}
export const quoteActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "submit",
    "technical",
    "finance",
    "approve",
    "issue",
    "reject",
  ]),
  department: z.enum(additionalServiceOptions).optional(),
  reason: z.string().trim().min(10).max(2000),
});
export function actOnQuotation(
  user: Principal,
  input: z.infer<typeof quoteActionSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const row = quoteVersion(user, input.id, "quotation.edit"),
      snapshot = JSON.parse(row.snapshot);
    if (input.action !== "reject")
      demand(
        [...snapshot.departments].sort().join(",") ===
          inquiryDepartments(inquiryById(row.inquiry_id)).sort().join(","),
        409,
        "The inquiry classification changed. Create a new quotation revision and repeat review.",
      );
    const permission =
      input.action === "technical"
        ? "quotation.technical"
        : input.action === "finance"
          ? "quotation.finance"
          : ["approve", "issue", "reject"].includes(input.action)
            ? "quotation.approve"
            : "quotation.edit";
    requireInquiry(user, row.inquiry_id, permission);
    demand(
      input.action === "submit"
        ? row.status === "draft"
        : input.action === "issue"
          ? row.status === "approved"
          : row.status === "pending_approval",
      409,
      "That action is not valid for the quotation's current state.",
    );
    if (["technical", "finance", "approve"].includes(input.action))
      demand(
        row.author_id !== user.id,
        403,
        "The author cannot approve their own quotation.",
      );
    if (input.action === "submit")
      db.prepare(
        "UPDATE quotation_versions SET status='pending_approval' WHERE id=?",
      ).run(row.id);
    if (input.action === "technical") {
      demand(
        row.finance_by !== user.id,
        403,
        "Technical and financial review require different people.",
      );
      demand(
        input.department && snapshot.departments.includes(input.department),
        422,
        "Choose a department in this quotation.",
      );
      authorize(user, "quotation.technical", input.department);
      const approvals = JSON.parse(row.technical_by || "{}");
      approvals[input.department] = user.id;
      db.prepare("UPDATE quotation_versions SET technical_by=? WHERE id=?").run(
        JSON.stringify(approvals),
        row.id,
      );
    }
    if (input.action === "finance") {
      demand(
        snapshot.departments.every((department: string) =>
          hasPermission(user, "quotation.finance", department),
        ),
        403,
        "Financial review requires authorization for every included division.",
      );
      const technical = Object.values(JSON.parse(row.technical_by || "{}"));
      demand(
        !technical.includes(user.id),
        403,
        "Technical and financial review require different people.",
      );
      db.prepare("UPDATE quotation_versions SET finance_by=? WHERE id=?").run(
        user.id,
        row.id,
      );
    }
    if (input.action === "approve") {
      demand(
        row.finance_by !== user.id,
        403,
        "Financial review and final approval require different authorized people.",
      );
      demand(
        snapshot.totalMinor <= (user.authority.maxQuotationMinor || 0) &&
          snapshot.discountBps <= (user.authority.maxDiscountBps || 0),
        403,
        "This quotation or discount exceeds your explicitly delegated approval limits.",
      );
      demand(
        snapshot.departments.every((department: string) =>
          hasPermission(user, "quotation.approve", department),
        ),
        403,
        "Final commercial approval requires authority for every division on a bundled offer.",
      );
      const technical = JSON.parse(row.technical_by || "{}");
      demand(
        !Object.values(technical).includes(user.id) &&
          !Object.values(technical).includes(row.finance_by),
        403,
        "Technical and commercial approval must remain segregated.",
      );
      demand(
        snapshot.departments.every(
          (department: string) => technical[department],
        ) && row.finance_by,
        409,
        "Every department and finance must review the quotation before approval.",
      );
      db.prepare(
        "UPDATE quotation_versions SET status='approved',approved_by=? WHERE id=?",
      ).run(user.id, row.id);
    }
    if (input.action === "reject")
      db.prepare(
        "UPDATE quotation_versions SET status='rejected' WHERE id=?",
      ).run(row.id);
    if (input.action === "issue") {
      demand(
        snapshot.totalMinor <= (user.authority.maxQuotationMinor || 0) &&
          snapshot.discountBps <= (user.authority.maxDiscountBps || 0),
        403,
        "Issuance exceeds your current delegated quotation or discount limit.",
      );
      demand(
        row.version > row.current_version,
        409,
        "A newer or equal version has already been issued. Create and review a new revision.",
      );
      demand(
        snapshot.departments.every((department: string) =>
          hasPermission(user, "quotation.approve", department),
        ),
        403,
        "Issuance requires delegated authority for all included divisions.",
      );
      demand(
        snapshot.expiresOn >= todayInTanzania(),
        409,
        "This quotation has expired.",
      );
      const acceptedBooking = db
        .prepare(
          "SELECT 1 FROM bookings b JOIN quotation_versions v ON v.id=b.quotation_version_id WHERE v.quotation_id=? AND b.status!='cancelled'",
        )
        .get(row.quotation_id);
      demand(
        !acceptedBooking,
        409,
        "An operational booking exists. Resolve it before issuing a replacement offer.",
      );
      db.prepare(
        "UPDATE quotation_versions SET status='superseded' WHERE quotation_id=? AND status IN ('issued','negotiation','accepted')",
      ).run(row.quotation_id);
      db.prepare(
        "UPDATE quotation_versions SET status='issued',issued_at=? WHERE id=?",
      ).run(new Date().toISOString(), row.id);
      db.prepare("UPDATE quotations SET current_version=? WHERE id=?").run(
        row.version,
        row.quotation_id,
      );
      const inquiry = inquiryById(row.inquiry_id);
      queueMail(
        `quote-issued:${row.id}`,
        inquiry.email,
        `[${row.reference} v${row.version}] Your TOC quotation`,
        "Your staff-approved quotation is available in the TOC customer portal. Sign in to review its exact version, prices, expiry and terms. Acceptance does not automatically confirm a booking.",
      );
    }
    audit(
      user.id,
      `quotation.${input.action}`,
      "quotation",
      row.id,
      { status: row.status },
      undefined,
      input.reason,
    );
    return { ok: true };
  })();
}
export const acceptSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  confirm: z.literal(true),
  terms: z.string().trim().min(10).max(8000),
});
export function acceptQuotation(
  user: Principal,
  input: z.infer<typeof acceptSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const row = quoteVersion(user, input.id);
    requireInquiry(user, row.inquiry_id, "own");
    const snapshot = JSON.parse(row.snapshot);
    demand(
      row.version === input.version &&
        row.current_version === row.version &&
        row.status === "issued",
      409,
      "Only the exact current issued version may be accepted.",
    );
    demand(
      snapshot.expiresOn >= todayInTanzania(),
      409,
      "This offer has expired. Request a revised quotation.",
    );
    demand(
      snapshot.terms === input.terms,
      409,
      "The terms do not match this version. Reload the offer.",
    );
    db.prepare(
      "UPDATE quotation_versions SET status='accepted',accepted_by=?,accepted_at=?,acceptance_terms=? WHERE id=?",
    ).run(user.id, new Date().toISOString(), snapshot.terms, row.id);
    audit(user.id, "quotation.accepted", "quotation", row.id, undefined, {
      version: row.version,
      terms: snapshot.terms,
      bookingConfirmed: false,
    });
    return { ok: true, bookingConfirmed: false };
  })();
}
export function listQuotations(user: Principal) {
  const inquiries = accessibleInquiries(user),
    ids = new Set(inquiries.map((item) => item.id));
  return (
    platformDb()
      .prepare(
        "SELECT v.*,q.reference,q.inquiry_id,q.current_version FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id ORDER BY v.created_at DESC",
      )
      .all() as (QuoteVersion & { inquiry_id: string })[]
  )
    .filter(
      (row) =>
        ids.has(row.inquiry_id) &&
        (workFor(row.inquiry_id).customer_id !== user.id || !!row.issued_at),
    )
    .map((row) => ({ ...row, snapshot: JSON.parse(row.snapshot) }));
}
export const priceBookSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    department: z.enum(additionalServiceOptions),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime(),
    rules: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(80),
            description: z.string().min(3).max(300),
            unit: z.string().min(1).max(40),
            unitPrice: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
            taxBps: z.number().int().min(0).max(10000),
            taxInclusive: z.boolean(),
            public: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export function createPriceBook(
  user: Principal,
  input: z.infer<typeof priceBookSchema>,
) {
  authorize(user, "pricing.edit", input.department);
  demand(
    input.effectiveTo > input.effectiveFrom,
    422,
    "The end date must follow the start date.",
  );
  for (const rule of input.rules) decimalMinor(rule.unitPrice);
  demand(
    new Set(input.rules.map((rule) => rule.id)).size === input.rules.length,
    422,
    "Rule identifiers must be unique.",
  );
  const id = randomUUID();
  platformDb()
    .prepare(
      "INSERT INTO price_books(id,name,department,rules_json,effective_from,effective_to,author_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      input.name,
      input.department,
      JSON.stringify(input.rules),
      input.effectiveFrom,
      input.effectiveTo,
      user.id,
      new Date().toISOString(),
    );
  audit(user.id, "pricing.proposed", "price_book", id);
  return { id };
}
export function approvePriceBook(user: Principal, id: string, reason: string) {
  const db = platformDb();
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM price_books WHERE id=?").get(id) as
      { department: string; author_id: string; state: string } | undefined;
    demand(row, 404, "Price book not found.");
    authorize(user, "pricing.approve", row.department);
    demand(
      row.author_id !== user.id,
      403,
      "A different authorized finance officer must approve this price book.",
    );
    demand(row.state === "draft", 409, "This price book is already reviewed.");
    db.prepare(
      "UPDATE price_books SET state='approved',approved_by=? WHERE id=?",
    ).run(user.id, id);
    audit(
      user.id,
      "pricing.approved",
      "price_book",
      id,
      undefined,
      undefined,
      reason,
    );
    return { ok: true };
  })();
}
export function publicPricing() {
  const now = new Date().toISOString();
  return (
    platformDb()
      .prepare(
        "SELECT id,name,department,rules_json,effective_from,effective_to FROM price_books WHERE state='approved' AND effective_from<=? AND effective_to>?",
      )
      .all(now, now) as {
      id: string;
      name: string;
      department: string;
      rules_json: string;
      effective_from: string;
      effective_to: string;
    }[]
  )
    .filter((book) =>
      publicBundle().catalog.some(
        (service) => service.slug === book.department,
      ),
    )
    .flatMap((book) =>
      JSON.parse(book.rules_json)
        .filter((rule: { public: boolean }) => rule.public)
        .map((rule: Record<string, unknown>) => ({
          ...rule,
          bookId: book.id,
          department: book.department,
          effectiveTo: book.effective_to,
        })),
    );
}

export function declineQuotation(user: Principal, id: string, reason: string) {
  const db = platformDb();
  return db.transaction(() => {
    const row = quoteVersion(user, id);
    requireInquiry(user, row.inquiry_id, "own");
    demand(
      row.status === "issued" && row.version === row.current_version,
      409,
      "Only the current issued offer may be declined.",
    );
    db.prepare(
      "UPDATE quotation_versions SET status='rejected' WHERE id=?",
    ).run(row.id);
    audit(
      user.id,
      "quotation.declined",
      "quotation",
      row.id,
      undefined,
      undefined,
      reason,
    );
    postMessage(user, {
      inquiryId: row.inquiry_id,
      body: `Customer declined ${row.reference} v${row.version}: ${reason}`,
      visibility: "customer",
    });
    return { ok: true };
  })();
}

export const classificationSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    primaryService: z.enum(additionalServiceOptions),
    additionalServices: z.array(z.enum(additionalServiceOptions)).max(4),
    reason: z.string().trim().min(10).max(2000),
  })
  .strict()
  .refine(
    (value) =>
      !value.additionalServices.includes(value.primaryService) &&
      new Set(value.additionalServices).size ===
        value.additionalServices.length,
    "Use unique additional divisions, different from the primary division.",
  );
export function correctClassification(
  user: Principal,
  input: z.infer<typeof classificationSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    requireInquiry(user, input.id, "inquiry.edit");
    const before = workFor(input.id);
    demand(
      !db
        .prepare(
          "SELECT 1 FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id WHERE q.inquiry_id=? AND v.status IN ('issued','accepted','negotiation')",
        )
        .get(input.id) &&
        !db
          .prepare(
            "SELECT 1 FROM bookings WHERE inquiry_id=? AND status NOT IN ('completed','cancelled')",
          )
          .get(input.id),
      409,
      "Resolve live offers and operational commitments before changing their departmental classification.",
    );
    demand(
      before.version === input.expectedVersion,
      409,
      "The routing changed. Refresh before correcting it.",
    );
    demand(
      [input.primaryService, ...input.additionalServices].every((department) =>
        hasPermission(user, "inquiry.edit", department),
      ),
      403,
      "Classification corrections require authorization for every destination division. Escalate cross-division transfers to an authorized coordinator.",
    );
    const correction = {
      additionalServices: input.additionalServices,
      reviewedBy: user.id,
      reason: input.reason,
    };
    db.prepare(
      "UPDATE inquiry_work SET department=?,classification_json=?,assigned_to=NULL,next_action='Review corrected classification and assign an authorized officer',due_at=NULL,version=version+1,updated_at=? WHERE inquiry_id=?",
    ).run(
      input.primaryService,
      JSON.stringify(correction),
      new Date().toISOString(),
      input.id,
    );
    audit(
      user.id,
      "inquiry.classification_corrected",
      "inquiry",
      input.id,
      {
        department: before.department,
        classification: before.classification_json,
      },
      { department: input.primaryService, ...correction },
      input.reason,
    );
    return { ok: true, originalSubmissionPreserved: true };
  })();
}

export function resolvePublicPriceSelections(
  selections: { bookId: string; ruleId: string; quantity: string }[],
  service?: string,
) {
  const options = publicPricing();
  return selections.map((item) => {
    const rule = options.find(
      (option: Record<string, unknown>) =>
        option.bookId === item.bookId &&
        option.id === item.ruleId &&
        (!service || option.department === service),
    );
    demand(
      rule,
      422,
      "A selected public rate is unavailable, expired or belongs to a different division. Remove or refresh the estimate options, then request an assessment.",
    );
    return {
      description: rule.description,
      quantity: item.quantity,
      unit: rule.unit,
      unitPrice: rule.unitPrice,
      taxBps: rule.taxBps,
      taxInclusive: rule.taxInclusive,
      department: rule.department,
      priceRuleId: `${item.bookId}:${item.ruleId}`,
    };
  });
}
