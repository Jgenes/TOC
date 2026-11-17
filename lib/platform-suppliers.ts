import { randomUUID } from "node:crypto";
import { z } from "zod";
import { additionalServiceOptions } from "./service-fields";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import { audit, demand, platformDb } from "./platform-store";

export const supplierSchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    department: z.enum(additionalServiceOptions),
    category: z.string().trim().min(3).max(100),
    contactName: z.string().trim().max(100),
    email: z.string().trim().email().max(254).or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+()\d\s.\-]*$/),
    capabilityEvidence: z.string().trim().min(10).max(3000),
  })
  .strict();
export type SupplierRow = {
  id: string;
  name: string;
  department: string;
  category: string;
  contact_name: string;
  email: string;
  phone: string;
  capability_evidence: string;
  state: string;
  author_id: string;
  approved_by: string | null;
  approval_evidence: string;
  approved_until: string | null;
  version: number;
  updated_at: string;
};
export function supplierById(id: string) {
  return platformDb()
    .prepare("SELECT * FROM platform_suppliers WHERE id=?")
    .get(id) as SupplierRow | undefined;
}
export function listSuppliers(user: Principal) {
  authorize(user, "supplier.read");
  return (
    platformDb()
      .prepare("SELECT * FROM platform_suppliers ORDER BY name")
      .all() as SupplierRow[]
  ).filter((row) => hasPermission(user, "supplier.read", row.department));
}
export function saveSupplier(
  user: Principal,
  input: z.infer<typeof supplierSchema>,
  id?: string,
  expectedVersion?: number,
) {
  authorize(user, "supplier.manage", input.department);
  const db = platformDb(),
    key = id || randomUUID();
  return db.transaction(() => {
    const old = id ? supplierById(id) : undefined;
    if (id) {
      demand(old, 404, "Supplier not found.");
      authorize(user, "supplier.manage", old.department);
      demand(
        old.version === expectedVersion,
        409,
        "This supplier changed. Reload before editing.",
      );
      const active = db
        .prepare(
          "SELECT b.id FROM resources r JOIN resource_allocations a ON a.resource_id=r.id JOIN bookings b ON b.id=a.booking_id WHERE r.supplier_id=? AND b.status IN ('confirmed','in_progress') LIMIT 1",
        )
        .get(id);
      demand(
        !active,
        409,
        "Resolve active supplier allocations before changing the approved arrangement. Suspend the supplier if there is a safety concern.",
      );
      demand(
        !db
          .prepare(
            "SELECT id FROM resources WHERE supplier_id=? AND department!=? LIMIT 1",
          )
          .get(id, input.department),
        409,
        "Reassign linked resources before changing the supplier department.",
      );
    }
    db.prepare(
      "INSERT INTO platform_suppliers(id,name,department,category,contact_name,email,phone,capability_evidence,author_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,department=excluded.department,category=excluded.category,contact_name=excluded.contact_name,email=excluded.email,phone=excluded.phone,capability_evidence=excluded.capability_evidence,author_id=excluded.author_id,state='proposed',approved_by=NULL,approved_until=NULL,approval_evidence='',version=platform_suppliers.version+1,updated_at=excluded.updated_at",
    ).run(
      key,
      input.name,
      input.department,
      input.category,
      input.contactName,
      input.email,
      input.phone,
      input.capabilityEvidence,
      user.id,
      new Date().toISOString(),
    );
    audit(user.id, "supplier.saved", "supplier", key, old, input);
    return { id: key };
  })();
}
export const supplierActionSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    action: z.enum(["approve", "suspend"]),
    reason: z.string().trim().min(10).max(3000),
    approvedUntil: z.string().datetime().optional(),
  })
  .strict();
export function actOnSupplier(
  user: Principal,
  input: z.infer<typeof supplierActionSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const row = supplierById(input.id);
    demand(row, 404, "Supplier not found.");
    authorize(user, "supplier.approve", row.department);
    demand(
      row.version === input.expectedVersion,
      409,
      "This supplier changed. Reload before acting.",
    );
    if (input.action === "approve") {
      demand(
        row.state !== "approved",
        409,
        "Edit and reassess an arrangement before approving it again.",
      );
      demand(
        row.author_id !== user.id,
        403,
        "A different delegated operations officer must approve this supplier.",
      );
      demand(
        input.approvedUntil && Date.parse(input.approvedUntil) > Date.now(),
        422,
        "Record a future expiry for the reviewed supplier arrangement.",
      );
    }
    db.prepare(
      "UPDATE platform_suppliers SET state=?,approved_by=?,approval_evidence=?,approved_until=?,version=version+1,updated_at=? WHERE id=?",
    ).run(
      input.action === "approve" ? "approved" : "suspended",
      user.id,
      input.reason,
      input.action === "approve" ? input.approvedUntil : null,
      new Date().toISOString(),
      row.id,
    );
    audit(
      user.id,
      `supplier.${input.action}`,
      "supplier",
      row.id,
      { state: row.state },
      { approvedUntil: input.approvedUntil },
      input.reason,
    );
    return { ok: true };
  })();
}
export function requireSupplierArrangement(
  id: string | null | undefined,
  department: string,
  endsAt: string,
) {
  const row = id ? supplierById(id) : undefined;
  demand(
    row &&
      row.department === department &&
      row.state === "approved" &&
      row.approved_until &&
      Date.parse(row.approved_until) > Date.parse(endsAt),
    409,
    "A hired or partner resource needs a current, independently approved supplier arrangement covering the full booking.",
  );
  return row;
}
