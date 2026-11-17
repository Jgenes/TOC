import { z } from "zod";
import { inquirySchema } from "./inquiry";
import { audit, demand, platformDb } from "./platform-store";
import type { Principal } from "./platform-auth";

// Incomplete RFQ drafts cannot carry consent or confer any commercial authority.
export const draftDataSchema = z
  .object(inquirySchema.shape)
  .omit({ consent: true, website: true })
  .partial()
  .extend({
    // Partially typed contact fields are valid in a draft, not a submission.
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().max(254).optional(),
    phone: z.string().trim().max(30).optional(),
    service: inquirySchema.shape.service.or(z.literal("")).optional(),
    pricingSelections: z
      .array(
        z
          .object({
            bookId: z.string().max(36),
            ruleId: z.string().max(80),
            quantity: z.string().max(20),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    consent: z.literal(false).default(false),
    website: z.literal("").default(""),
  })
  .strict();
export const saveDraftSchema = z
  .object({
    data: draftDataSchema,
    step: z.number().int().min(0).max(4),
    expectedVersion: z.number().int().min(0),
  })
  .strict();
const DAYS = 30;
export function accountDraft(user: Principal) {
  const row = platformDb()
    .prepare(
      "SELECT data,step,version,updated_at FROM inquiry_drafts WHERE user_id=? AND expires_at>?",
    )
    .get(user.id, Date.now()) as
    | { data: string; step: number; version: number; updated_at: string }
    | undefined;
  return row
    ? { ...row, data: JSON.parse(row.data), retentionDays: DAYS }
    : null;
}
export function saveAccountDraft(
  user: Principal,
  input: z.infer<typeof saveDraftSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const old = accountDraft(user);
    demand(
      (old?.version || 0) === input.expectedVersion,
      409,
      "Your saved draft changed in another tab. Reload it before overwriting.",
    );
    const version = (old?.version || 0) + 1,
      now = new Date().toISOString();
    db.prepare(
      "INSERT INTO inquiry_drafts(user_id,data,step,version,updated_at,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,step=excluded.step,version=excluded.version,updated_at=excluded.updated_at,expires_at=excluded.expires_at",
    ).run(
      user.id,
      JSON.stringify(input.data),
      input.step,
      version,
      now,
      Date.now() + DAYS * 86400000,
    );
    audit(user.id, "inquiry.draft_saved", "user", user.id, undefined, {
      version,
      step: input.step,
    });
    return { version, retentionDays: DAYS };
  })();
}
export function deleteAccountDraft(user: Principal, expectedVersion: number) {
  const db = platformDb();
  return db.transaction(() => {
    const old = accountDraft(user);
    demand(
      !old || old.version === expectedVersion,
      409,
      "A newer saved draft exists. Reload it before deleting.",
    );
    db.prepare("DELETE FROM inquiry_drafts WHERE user_id=?").run(user.id);
    audit(user.id, "inquiry.draft_removed", "user", user.id);
    return { ok: true };
  })();
}
export function purgeExpiredDrafts() {
  return platformDb()
    .prepare("DELETE FROM inquiry_drafts WHERE expires_at<=?")
    .run(Date.now()).changes;
}
