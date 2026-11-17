import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { z } from "zod";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Hosting may provide environment variables directly. */
}
const { createUser, roles, userInput } = await import("../lib/platform-auth");
const { platformDb, audit } = await import("../lib/platform-store");
const preview = process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false";
if ((process.env.SESSION_SECRET?.length || 0) < 32)
  throw new Error(
    "Configure SESSION_SECRET with at least 32 random characters before creating a staff account.",
  );
if (existsSync("ACCOUNT-ACCESS.txt"))
  throw new Error(
    "ACCOUNT-ACCESS.txt already exists. Store it securely and remove it before bootstrapping a new database.",
  );
const email =
  process.env.TOC_BOOTSTRAP_EMAIL ||
  (preview ? "preview-operator@example.test" : "");
if (!email)
  throw new Error(
    "Set TOC_BOOTSTRAP_EMAIL privately before production bootstrap.",
  );
const assigned = z
  .array(z.enum(roles))
  .min(1)
  .parse((process.env.TOC_BOOTSTRAP_ROLES || "administrator").split(","));
if (
  platformDb()
    .prepare(
      "SELECT 1 FROM platform_users WHERE roles LIKE '%administrator%' LIMIT 1",
    )
    .get()
)
  throw new Error(
    "An administrator already exists. Use the audited account-invitation and access-review workflow instead of bootstrapping again.",
  );
if (!assigned.includes("administrator"))
  throw new Error("The initial account must include the administrator role.");
const password = randomBytes(24).toString("base64url"),
  input = userInput.parse({
    email,
    name:
      process.env.TOC_BOOTSTRAP_NAME ||
      (preview ? "Preview operator" : "TOC administrator"),
    password,
  });
const { additionalServiceOptions } = await import("../lib/service-fields");
const id = createUser(input, assigned, [...additionalServiceOptions], true);
audit(
  "deployment-operator",
  "account.bootstrap_verified",
  "user",
  id,
  undefined,
  { roles: assigned, preview },
  "Initial administrator created by a deployment operator through the local CLI. Commercial authority is not automatically granted.",
);
writeFileSync(
  "ACCOUNT-ACCESS.txt",
  `PRIVATE — DO NOT COMMIT OR SHARE IN CHAT\n\n${preview ? "Preview" : "Production"} individual account\nEmail: ${input.email}\nPassword: ${password}\n\nOpen /admin. Add the time-based authenticator at first sign-in.\nRoles: ${assigned.join(", ")}\nNo quotation, pricing or booking approval authority is delegated by this command.\nInvite a second publisher for separation of duties. Review staff identity, roles and authority before enabling access.\nRotate the password after handover and remove this file when stored securely.\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Initial individual account created. Private credentials are in ignored ACCOUNT-ACCESS.txt; they are not printed. Open /admin and enroll an authenticator. Never commit the credential file.",
);
platformDb().close();
