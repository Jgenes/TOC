import { randomUUID } from "node:crypto";
import { z } from "zod";
import { audit, demand, platformDb } from "./platform-store";
import { authorize, type Principal } from "./platform-auth";
import { queueMail } from "./platform-mail";
import { company } from "./content";

export const privacyRequestSchema = z
  .object({
    category: z.enum(["access", "correction", "deletion", "retention"]),
    details: z.string().trim().min(10).max(2000),
  })
  .strict();
export function privacyRequests(user: Principal, management = false) {
  if (management) authorize(user, "settings.manage");
  return platformDb()
    .prepare(
      `SELECT p.id,p.reference,p.user_id,p.category,p.details,p.state,p.resolution,p.version,p.created_at,p.updated_at,u.name,u.email FROM privacy_requests p JOIN platform_users u ON u.id=p.user_id ${management ? "" : "WHERE p.user_id=?"} ORDER BY p.created_at DESC LIMIT 500`,
    )
    .all(...(management ? [] : [user.id]));
}
export function createPrivacyRequest(
  user: Principal,
  input: z.infer<typeof privacyRequestSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    demand(
      !db
        .prepare(
          "SELECT 1 FROM privacy_requests WHERE user_id=? AND category=? AND state IN ('received','in_review')",
        )
        .get(user.id, input.category),
      409,
      "An open request of this kind already exists. Review its status or contact the company.",
    );
    const id = randomUUID(),
      reference = `TOC-P-${id.slice(0, 8).toUpperCase()}`,
      now = new Date().toISOString();
    db.prepare(
      "INSERT INTO privacy_requests(id,reference,user_id,category,details,state,created_at,updated_at) VALUES(?,?,?,?,?,'received',?,?)",
    ).run(id, reference, user.id, input.category, input.details, now, now);
    audit(
      user.id,
      "privacy.request_received",
      "privacy_request",
      id,
      undefined,
      { category: input.category },
    );
    queueMail(
      `privacy-received:${id}`,
      user.email,
      `[${reference}] Data-rights request received`,
      "Your TOC data-rights request has been recorded. Sign in to Profile & security to review its status. A responsible person must assess identity, scope and applicable retention obligations; nothing has been automatically erased.",
    );
    queueMail(
      `privacy-staff:${id}`,
      company.email,
      `[${reference}] Data-rights review required`,
      "A verified account submitted a data-rights request. An authorized administrator must review it in Settings & integrations. Do not send customer records through an unrestricted link.",
    );
    return { id, reference, state: "received" };
  })();
}
export const privacyActionSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    state: z.enum(["in_review", "completed", "declined"]),
    resolution: z.string().trim().min(20).max(3000),
    identityVerified: z.literal(true),
  })
  .strict();
export function resolvePrivacyRequest(
  user: Principal,
  input: z.infer<typeof privacyActionSchema>,
) {
  authorize(user, "settings.manage");
  const db = platformDb();
  return db.transaction(() => {
    const row = db
      .prepare("SELECT * FROM privacy_requests WHERE id=?")
      .get(input.id) as
      | { user_id: string; state: string; version: number; reference: string }
      | undefined;
    demand(row, 404, "Data-rights request not found.");
    demand(
      row.version === input.expectedVersion,
      409,
      "This request changed. Refresh before deciding.",
    );
    demand(
      input.state === "in_review"
        ? row.state === "received"
        : row.state === "in_review",
      409,
      "Review the received request before recording a final outcome.",
    );
    db.prepare(
      "UPDATE privacy_requests SET state=?,resolution=?,version=version+1,updated_at=? WHERE id=?",
    ).run(input.state, input.resolution, new Date().toISOString(), input.id);
    audit(
      user.id,
      `privacy.${input.state}`,
      "privacy_request",
      input.id,
      { state: row.state },
      { state: input.state },
      input.resolution,
    );
    const account = db
      .prepare("SELECT email FROM platform_users WHERE id=?")
      .get(row.user_id) as { email: string };
    queueMail(
      `privacy-status:${input.id}:${row.version + 1}`,
      account.email,
      `[${row.reference}] Data-rights status updated`,
      "Your TOC data-rights request has an update. Sign in to the protected portal to review the response. No records are attached to this email.",
    );
    return {
      ok: true,
      notice:
        "This records the reviewed outcome. It does not execute erasure, alter audit evidence or override a lawful retention hold. Record the separately completed action and any retention grounds accurately.",
    };
  })();
}
