import { z } from "zod";
import { requireInquiry, workFor } from "./platform-business";
import type { Principal } from "./platform-auth";
import { audit, demand, platformDb } from "./platform-store";

// Deliberately human-attested. A model, estimate or acknowledgement cannot qualify a lead.
export const assessmentSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    qualification: z.enum(["unreviewed", "qualified", "not_qualified"]),
    serviceFit: z.boolean(),
    requirementsReviewed: z.boolean(),
    contactable: z.boolean(),
    outcome: z.enum(["open", "won", "lost"]),
    reason: z.string().trim().min(10).max(3000),
  })
  .strict();
export function assessInquiry(
  user: Principal,
  input: z.infer<typeof assessmentSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    requireInquiry(user, input.id, "inquiry.edit");
    const old = workFor(input.id);
    demand(
      old.version === input.expectedVersion,
      409,
      "The inquiry changed. Reload before assessing it.",
    );
    if (input.qualification === "qualified")
      demand(
        input.serviceFit && input.requirementsReviewed && input.contactable,
        422,
        "Qualification requires reviewed service fit, minimum requirements and a usable follow-up contact.",
      );
    const confirmed = db
      .prepare(
        "SELECT id FROM bookings WHERE inquiry_id=? AND status IN ('confirmed','in_progress','completed') LIMIT 1",
      )
      .get(input.id);
    if (input.outcome === "won")
      demand(
        confirmed,
        409,
        "Record an authorized confirmed booking before marking an opportunity won.",
      );
    if (input.outcome === "lost")
      demand(
        !confirmed,
        409,
        "Resolve confirmed or delivered work before marking this opportunity lost.",
      );
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE inquiry_work SET qualification=?,qualified_at=?,assessment_json=?,outcome=?,outcome_at=?,version=version+1,updated_at=? WHERE inquiry_id=?",
    ).run(
      input.qualification,
      input.qualification === "qualified" ? old.qualified_at || now : null,
      JSON.stringify({
        serviceFit: input.serviceFit,
        requirementsReviewed: input.requirementsReviewed,
        contactable: input.contactable,
        reason: input.reason,
        reviewedBy: user.id,
        reviewedAt: now,
      }),
      input.outcome,
      input.outcome === "open"
        ? null
        : old.outcome === input.outcome
          ? old.outcome_at
          : now,
      now,
      input.id,
    );
    audit(
      user.id,
      "inquiry.assessed",
      "inquiry",
      input.id,
      { qualification: old.qualification, outcome: old.outcome },
      input,
      input.reason,
    );
    return { ok: true };
  })();
}
