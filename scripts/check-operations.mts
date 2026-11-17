// Safe local monitoring output: counts/health only, never recipients, payloads or secret paths.
import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { operationalHealth } from "../lib/platform-monitoring";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Hosting environment. */
}
const positive = (name: string, fallback: number) => {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error("Invalid monitoring threshold.");
  return value;
};
try {
  const path = resolve(process.env.DATABASE_PATH || "data/toc.sqlite");
  if (!existsSync(path)) {
    console.log(
      JSON.stringify({
        ok: false,
        checks: { database: false },
        error: "Database is missing.",
      }),
    );
    process.exitCode = 1;
  } else {
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try {
      const result = operationalHealth(db, {
        workerMinutes: positive("OPS_MAX_WORKER_AGE_MINUTES", 10),
        notificationMinutes: positive("OPS_MAX_NOTIFICATION_AGE_MINUTES", 30),
      });
      console.log(
        JSON.stringify({
          ...result,
          preview: process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false",
        }),
      );
      if (!result.ok) process.exitCode = 1;
    } finally {
      db.close();
    }
  }
} catch {
  // Database/OS errors can contain private paths. Alert without printing their stack or data.
  console.log(
    JSON.stringify({
      ok: false,
      checks: { readable: false },
      error:
        "Operational checks failed. Review database access, schema and positive thresholds in the private hosting environment.",
    }),
  );
  process.exitCode = 1;
}
