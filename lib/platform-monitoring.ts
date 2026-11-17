// Read-only local health checks. No recipients, payloads, identifiers or secrets leave this projection.
import type Database from "better-sqlite3";

export type MonitoringThresholds = {
  workerMinutes: number;
  notificationMinutes: number;
};
export function operationalHealth(
  db: Database.Database,
  thresholds: MonitoringThresholds,
  now = Date.now(),
) {
  for (const value of Object.values(thresholds))
    if (!Number.isFinite(value) || value <= 0)
      throw new Error("Monitoring thresholds must be positive minutes.");
  const exists = (table: string) =>
    !!db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(table);
  const schemaReady = exists("job_runs") && exists("notification_outbox");
  const latest = exists("job_runs")
    ? (db
        .prepare(
          "SELECT state,started_at,finished_at FROM job_runs ORDER BY started_at DESC LIMIT 1",
        )
        .get() as
        | { state: string; started_at: string; finished_at: string | null }
        | undefined)
    : undefined;
  const completed = exists("job_runs")
    ? (db
        .prepare(
          "SELECT finished_at FROM job_runs WHERE state='completed' ORDER BY started_at DESC LIMIT 1",
        )
        .get() as { finished_at: string | null } | undefined)
    : undefined;
  const pending = exists("notification_outbox")
    ? (db
        .prepare(
          "SELECT COUNT(*) AS n,MIN(created_at) AS oldest FROM notification_outbox WHERE state IN ('pending','retry','sending')",
        )
        .get() as { n: number; oldest: string | null })
    : { n: 0, oldest: null };
  const failed = exists("notification_outbox")
    ? (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM notification_outbox WHERE state='failed'",
          )
          .get() as { n: number }
      ).n
    : 0;
  const fresh = (time: string | null | undefined, minutes: number) => {
    const age = time ? now - Date.parse(time) : NaN;
    return Number.isFinite(age) && age >= -60000 && age < minutes * 60000;
  };
  const checks = {
    database: db.pragma("quick_check", { simple: true }) === "ok",
    schemaReady,
    workerFresh: fresh(completed?.finished_at, thresholds.workerMinutes),
    latestWorkerNotFailed: !!latest && latest.state !== "failed",
    noStuckWorker:
      !!latest &&
      (latest.state !== "running" ||
        fresh(latest.started_at, thresholds.workerMinutes)),
    queueAgeAcceptable:
      pending.n === 0 || fresh(pending.oldest, thresholds.notificationMinutes),
    noExhaustedNotifications: failed === 0,
  };
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    pendingNotifications: pending.n,
    exhaustedNotifications: failed,
    checkedAt: new Date(now).toISOString(),
  };
}
