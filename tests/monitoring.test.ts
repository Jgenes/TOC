import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { operationalHealth } from "../lib/platform-monitoring";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const now = Date.parse("2026-11-17T12:00:00.000Z"),
  thresholds = { workerMinutes: 10, notificationMinutes: 30 };
const time = (minutes: number) => new Date(now - minutes * 60000).toISOString();
function fixture() {
  const db = new Database(":memory:");
  db.exec(
    "CREATE TABLE job_runs(id TEXT,state TEXT,started_at TEXT,finished_at TEXT);CREATE TABLE notification_outbox(id TEXT,state TEXT,created_at TEXT,recipient TEXT,body TEXT);",
  );
  db.prepare("INSERT INTO job_runs VALUES('completed','completed',?,?)").run(
    time(2),
    time(1),
  );
  db.prepare(
    "INSERT INTO notification_outbox VALUES('pending','pending',?,'PRIVATE EMAIL','PRIVATE PAYLOAD')",
  ).run(time(3));
  return db;
}
test("operational health is read-only, uses approved thresholds and excludes notification payloads", () => {
  const db = fixture();
  try {
    assert.equal(operationalHealth(db, thresholds, now).ok, true);
    assert.equal(
      operationalHealth(
        db,
        { workerMinutes: 0.5, notificationMinutes: 30 },
        now,
      ).checks.workerFresh,
      false,
    );
    const report = operationalHealth(
      db,
      { workerMinutes: 10, notificationMinutes: 2 },
      now,
    );
    assert.equal(report.ok, false);
    assert.equal(report.pendingNotifications, 1);
    assert.equal(report.checks.queueAgeAcceptable, false);
    assert.ok(!JSON.stringify(report).includes("PRIVATE"));
    assert.equal(
      (
        db.prepare("SELECT COUNT(*) AS n FROM notification_outbox").get() as {
          n: number;
        }
      ).n,
      1,
    );
    assert.throws(() =>
      operationalHealth(
        db,
        { workerMinutes: NaN, notificationMinutes: 30 },
        now,
      ),
    );
  } finally {
    db.close();
  }
});
test("a fresh successful worker does not hide a later failed or stuck run or exhausted mail", () => {
  const db = fixture();
  try {
    db.prepare("INSERT INTO job_runs VALUES('latest','failed',?,?)").run(
      time(0.5),
      time(0.4),
    );
    assert.equal(
      operationalHealth(db, thresholds, now).checks.latestWorkerNotFailed,
      false,
    );
    db.prepare(
      "UPDATE job_runs SET state='running',started_at=?,finished_at=NULL WHERE id='latest'",
    ).run(time(0));
    assert.equal(operationalHealth(db, thresholds, now).ok, true);
    db.prepare("DELETE FROM job_runs WHERE id='completed'").run();
    db.prepare("UPDATE job_runs SET started_at=? WHERE id='latest'").run(
      time(11),
    );
    const stuck = operationalHealth(db, thresholds, now);
    assert.equal(stuck.checks.noStuckWorker, false);
    assert.equal(stuck.checks.workerFresh, false);
    db.prepare("UPDATE notification_outbox SET state='failed'").run();
    assert.equal(
      operationalHealth(db, thresholds, now).exhaustedNotifications,
      1,
    );
    assert.equal(
      operationalHealth(db, thresholds, now).checks.noExhaustedNotifications,
      false,
    );
  } finally {
    db.close();
  }
});
test("missing schema and invalid/future timestamps fail closed", () => {
  const db = new Database(":memory:");
  try {
    assert.equal(operationalHealth(db, thresholds, now).ok, false);
    assert.equal(
      operationalHealth(db, thresholds, now).checks.schemaReady,
      false,
    );
  } finally {
    db.close();
  }
  const ready = fixture();
  try {
    ready.prepare("UPDATE job_runs SET finished_at='not-a-date'").run();
    assert.equal(
      operationalHealth(ready, thresholds, now).checks.workerFresh,
      false,
    );
    ready.prepare("UPDATE job_runs SET finished_at=?").run(time(-5));
    assert.equal(
      operationalHealth(ready, thresholds, now).checks.workerFresh,
      false,
    );
  } finally {
    ready.close();
  }
});
test("ops CLI refuses to create a missing database or disclose its private path", () => {
  const directory = mkdtempSync(join(tmpdir(), "toc-monitoring-"));
  const missing = join(directory, "PRIVATE-never-create.sqlite");
  try {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/check-operations.mts"],
      {
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: missing },
        timeout: 15000,
      },
    );
    assert.equal(result.status, 1);
    assert.equal(existsSync(missing), false);
    assert.equal(JSON.parse(result.stdout).ok, false);
    assert.ok(!result.stdout.includes("PRIVATE"));
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
