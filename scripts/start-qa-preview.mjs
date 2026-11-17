// Run with the process tool or an ordinary local terminal; never against live data.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
const fixture = JSON.parse(
  readFileSync("research/blueprint-fixture.json", "utf8"),
);
if (
  dirname(fixture.root) !== tmpdir() ||
  !basename(fixture.root).startsWith("toc-blueprint-qa-") ||
  !existsSync(fixture.databasePath)
)
  throw new Error("Prepare a new disposable QA fixture first.");
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "0.0.0.0",
    "--port",
    process.env.PORT || "3000",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_PUBLIC_PREVIEW_MODE: "true",
      NEXT_PUBLIC_SITE_URL: "",
      SESSION_SECRET: fixture.sessionSecret,
      DATABASE_PATH: fixture.databasePath,
      PRIVATE_STORAGE_PATH: fixture.storagePath,
      SMTP_PASS: "",
      AI_ENABLED: "false",
      MALWARE_SCANNER_PATH: "",
    },
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
