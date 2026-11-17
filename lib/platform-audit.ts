import { z } from "zod";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import { accessibleInquiries, listQuotations } from "./platform-business";
import { operationalRecords } from "./platform-operations";
import { listSuppliers } from "./platform-suppliers";
import { platformDb } from "./platform-store";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
export const auditFilters = z
  .object({
    from: date.optional(),
    to: date.optional(),
    actor: z.string().trim().max(150).optional(),
    action: z.string().trim().max(100).optional(),
    target: z.string().trim().max(100).optional(),
    search: z.string().trim().max(200).optional(),
    offset: z.coerce.number().int().min(0).max(10000000).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()
  .refine(
    (v) => !v.from || !v.to || v.to >= v.from,
    "The end date must not precede the start date.",
  );
export type AuditEvent = {
  id: string;
  actor_id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
  before_json: string | null;
  after_json: string | null;
};
export function listAuditEvents(
  user: Principal,
  filters: z.infer<typeof auditFilters> = { offset: 0, limit: 50 },
) {
  authorize(user, "audit.read");
  const db = platformDb(),
    isAdmin = user.roles.includes("administrator");
  const permitted = new Set<string>([user.id]);
  if (!isAdmin) {
    const inquiries = accessibleInquiries(user),
      ops = operationalRecords(user);
    for (const row of [
      ...inquiries,
      ...listQuotations(user),
      ...ops.bookings,
      ...ops.visits,
      ...ops.projects,
    ])
      if ("id" in row) permitted.add(String(row.id));
    const resources = db
      .prepare("SELECT id,department FROM resources")
      .all() as { id: string; department: string }[];
    for (const row of resources)
      if (user.departments.includes(row.department)) permitted.add(row.id);
    if (hasPermission(user, "supplier.read"))
      for (const row of listSuppliers(user)) permitted.add(row.id);
  }
  const conditions: string[] = [],
    parameters: string[] = [];
  if (filters.from) {
    conditions.push("a.created_at>=?");
    parameters.push(filters.from + "T00:00:00.000Z");
  }
  if (filters.to) {
    conditions.push("a.created_at<=?");
    parameters.push(filters.to + "T23:59:59.999Z");
  }
  const all = db
    .prepare(
      `SELECT a.*,u.name AS actor_name FROM platform_audit a LEFT JOIN platform_users u ON u.id=a.actor_id ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY a.created_at DESC,a.id DESC`,
    )
    .all(...parameters) as AuditEvent[];
  const contains = (text: string | undefined, query: string | undefined) =>
    !query || (text || "").toLowerCase().includes(query.toLowerCase());
  const rows = all.filter(
    (row) =>
      (isAdmin || permitted.has(row.target_id)) &&
      contains(`${row.actor_id} ${row.actor_name || ""}`, filters.actor) &&
      contains(row.action, filters.action) &&
      contains(`${row.target_type} ${row.target_id}`, filters.target) &&
      contains(
        `${row.actor_name || row.actor_id} ${row.action} ${row.target_type} ${row.target_id} ${row.reason}`,
        filters.search,
      ),
  );
  return {
    items: rows.slice(filters.offset, filters.offset + filters.limit),
    total: rows.length,
    offset: filters.offset,
    limit: filters.limit,
  };
}
