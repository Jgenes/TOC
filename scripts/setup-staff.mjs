import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const path = ".env.local";
let env = existsSync(path)
  ? readFileSync(path, "utf8")
  : "NEXT_PUBLIC_PREVIEW_MODE=true\nDATABASE_PATH=./data/toc.sqlite\n";
if (/^STAFF_PASSWORD=.+$/m.test(env) && /^SESSION_SECRET=.{32,}$/m.test(env)) {
  console.log(
    "Staff credentials already exist in .env.local. They have not been changed.",
  );
  process.exit(0);
}
const password = randomBytes(18).toString("base64url");
const secret = randomBytes(48).toString("base64url");
env = env
  .replace(/^STAFF_PASSWORD=.*\n?/gm, "")
  .replace(/^SESSION_SECRET=.*\n?/gm, "");
writeFileSync(
  path,
  `${env.trim()}\nSTAFF_PASSWORD=${password}\nSESSION_SECRET=${secret}\n`,
  { mode: 0o600 },
);
writeFileSync(
  "STAFF-ACCESS.txt",
  `TOC WEBSITE — LOCAL PREVIEW STAFF ACCESS\n\nOpen the website and select Staff access in the footer, or visit /staff.\n\nPassword: ${password}\n\nThis is a generated password for this local preview only. Keep it private.\nThe inbox displays actual test submissions made through this website.\nSign out when finished; sessions expire after 8 hours.\n\nBefore production: replace this password and SESSION_SECRET in your hosting environment, use HTTPS, configure persistent database storage, and upgrade to individual accounts and roles for a multi-user team.\n\nNever upload .env.local or this file to public hosting or source control.\n`,
  { mode: 0o600 },
);
console.log(
  "Generated secure local staff access. See STAFF-ACCESS.txt. Restart the server to activate the credentials.",
);
