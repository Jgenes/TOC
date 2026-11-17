import { randomUUID } from "node:crypto";
import { z } from "zod";
import { audit, demand, platformDb } from "./platform-store";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import { runPublishingJobs } from "./platform-cms";
import { processNotificationOutbox, queueMail } from "./platform-mail";
import { scanQuarantinedDocuments } from "./platform-documents";
import { inquiryById, inquiryDepartments } from "./platform-business";
import { purgeExpiredDrafts } from "./platform-drafts";
import { todayInTanzania } from "./inquiry";

export const operationalSettingsSchema = z
  .object({
    quotationReminderDays: z.number().int().min(1).max(30),
    followupReminderHours: z.number().int().min(1).max(168),
    customerExpiryReminders: z.boolean(),
  })
  .strict();
export function operationalSettings() {
  const row = platformDb()
    .prepare(
      "SELECT data,version FROM platform_configuration WHERE id='operations'",
    )
    .get() as { data: string; version: number } | undefined;
  return {
    version: row?.version || 1,
    ...(row
      ? operationalSettingsSchema.parse(JSON.parse(row.data))
      : {
          quotationReminderDays: 3,
          followupReminderHours: 24,
          customerExpiryReminders: false,
        }),
  };
}
export function saveOperationalSettings(
  user: Principal,
  settings: z.infer<typeof operationalSettingsSchema>,
  expectedVersion: number,
  reason: string,
) {
  authorize(user, "settings.manage");
  const db = platformDb();
  return db.transaction(() => {
    const before = operationalSettings();
    demand(
      before.version === expectedVersion,
      409,
      "Settings changed. Refresh before saving.",
    );
    db.prepare(
      "INSERT INTO platform_configuration(id,data,version) VALUES('operations',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version",
    ).run(JSON.stringify(settings), before.version + 1);
    audit(
      user.id,
      "settings.operations_changed",
      "settings",
      "operations",
      before,
      settings,
      reason,
    );
    return { ok: true };
  })();
}
function assignedEmail(userId: string | null, inquiryId: string) {
  if (!userId) return null;
  const row = platformDb()
    .prepare("SELECT * FROM platform_users WHERE id=? AND state='active'")
    .get(userId) as
    | {
        id: string;
        email: string;
        name: string;
        roles: string;
        departments: string;
        authority: string;
      }
    | undefined;
  if (!row) return null;
  const user = {
    ...row,
    roles: JSON.parse(row.roles),
    departments: JSON.parse(row.departments),
    authority: JSON.parse(row.authority),
    verified: true,
    mfa: true,
  } as Principal;
  return inquiryDepartments(inquiryById(inquiryId)).some((department) =>
    hasPermission(user, "inquiry.read", department),
  )
    ? row.email
    : null;
}
export function runReminderJobs() {
  const db = platformDb(),
    settings = operationalSettings(),
    now = Date.now(),
    today = todayInTanzania(),
    cutoff = new Date(now + settings.quotationReminderDays * 86400000)
      .toISOString()
      .slice(0, 10);
  let followups = 0,
    quotations = 0,
    expired = 0;
  db.transaction(() => {
    const work = db
      .prepare(
        "SELECT w.*,i.reference FROM inquiry_work w JOIN inquiries i ON i.id=w.inquiry_id WHERE w.due_at IS NOT NULL AND w.due_at<=? AND i.status!='closed'",
      )
      .all(
        new Date(now + settings.followupReminderHours * 3600000).toISOString(),
      ) as {
      inquiry_id: string;
      assigned_to: string | null;
      version: number;
      reference: string;
    }[];
    for (const row of work) {
      const email = assignedEmail(row.assigned_to, row.inquiry_id);
      if (!email) continue;
      queueMail(
        `followup:${row.inquiry_id}:${row.version}`,
        email,
        `[${row.reference}] Follow-up due`,
        "An assigned TOC inquiry is approaching or has passed its follow-up deadline. Sign in to your authorized staff workspace to review it. No customer details are included in this reminder.",
      );
      followups++;
    }
    const offers = db
      .prepare(
        "SELECT v.id,v.snapshot,v.author_id,q.inquiry_id,q.reference FROM quotation_versions v JOIN quotations q ON q.id=v.quotation_id WHERE v.status='issued' AND v.version=q.current_version",
      )
      .all() as {
      id: string;
      snapshot: string;
      inquiry_id: string;
      reference: string;
      author_id: string;
    }[];
    for (const row of offers) {
      const snapshot = JSON.parse(row.snapshot);
      if (snapshot.expiresOn < today) {
        db.prepare(
          "UPDATE quotation_versions SET status='expired' WHERE id=? AND status='issued'",
        ).run(row.id);
        audit("scheduler", "quotation.expired", "quotation", row.id);
        expired++;
        continue;
      }
      if (snapshot.expiresOn > cutoff) continue;
      const owner =
          (
            db
              .prepare(
                "SELECT assigned_to FROM inquiry_work WHERE inquiry_id=?",
              )
              .get(row.inquiry_id) as { assigned_to: string | null } | undefined
          )?.assigned_to || row.author_id,
        email = assignedEmail(owner, row.inquiry_id);
      if (email) {
        queueMail(
          `quote-expiry-staff:${row.id}`,
          email,
          `[${row.reference}] Quotation approaching expiry`,
          "An issued TOC offer is approaching its recorded expiry date. Review the authorized quotation and follow up if appropriate. The offer has not been extended automatically.",
        );
        quotations++;
      }
      if (settings.customerExpiryReminders) {
        const inquiry = inquiryById(row.inquiry_id);
        queueMail(
          `quote-expiry-customer:${row.id}`,
          inquiry.email,
          `[${row.reference}] Quotation validity reminder`,
          "Your TOC offer is approaching the validity date shown in your customer portal. Please review the exact current version, or request a revision if your requirements have changed. This reminder does not confirm a booking or extend the offer.",
        );
      }
    }
  })();
  return {
    followups,
    quotations,
    expired,
    notice:
      "Counts are eligible reminders; the outbox deduplicates previously queued events.",
  };
}
export async function runBackgroundJobs() {
  const db = platformDb(),
    id = randomUUID(),
    start = new Date().toISOString();
  db.prepare(
    "INSERT INTO job_runs(id,started_at,state) VALUES(?,?,'running')",
  ).run(id, start);
  try {
    runPublishingJobs();
    const reminders = runReminderJobs(),
      mail = await processNotificationOutbox(25),
      files = scanQuarantinedDocuments(10);
    const result = {
      publishing: "processed",
      reminders,
      mail,
      files,
      expiredDraftsRemoved: purgeExpiredDrafts(),
    };
    db.prepare(
      "UPDATE job_runs SET state='completed',finished_at=?,summary=? WHERE id=?",
    ).run(new Date().toISOString(), JSON.stringify(result), id);
    return result;
  } catch (error) {
    db.prepare(
      "UPDATE job_runs SET state='failed',finished_at=?,summary='Worker failed; inspect private hosting diagnostics without customer data' WHERE id=?",
    ).run(new Date().toISOString(), id);
    throw error;
  }
}
