import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { additionalServiceOptions } from "./service-fields";
import { audit, demand, platformDb } from "./platform-store";
import { isPreview } from "./content";

export const roles = [
  "administrator",
  "publisher",
  "editor",
  "marketing",
  "department_manager",
  "finance",
  "operations",
  "auditor",
  "customer",
] as const;
export type Role = (typeof roles)[number];
export const userInput = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
export type Principal = {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  departments: string[];
  authority: {
    quotation?: boolean;
    pricing?: boolean;
    booking?: boolean;
    maxQuotationMinor?: number;
    maxDiscountBps?: number;
  };
  verified: boolean;
  mfa: boolean;
};
type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  roles: string;
  departments: string;
  authority: string;
  state: string;
  verified_at: string | null;
  totp_secret: string | null;
  last_totp_step: number;
};
export const ACCOUNT_COOKIE = "toc_account_session";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(value, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}
export function verifyPassword(value: string, encoded: string) {
  try {
    const [kind, salt, digest] = encoded.split(":");
    if (
      kind !== "scrypt" ||
      !/^[a-f0-9]{32}$/.test(salt) ||
      !/^[a-f0-9]{128}$/.test(digest)
    )
      return false;
    return timingSafeEqual(
      scryptSync(value, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
      }),
      Buffer.from(digest, "hex"),
    );
  } catch {
    return false;
  }
}
export function createUser(
  input: z.infer<typeof userInput>,
  assignedRoles: Role[] = ["customer"],
  departments: string[] = [],
  verified = false,
) {
  const db = platformDb(),
    now = new Date().toISOString(),
    id = randomUUID();
  demand(
    !db.prepare("SELECT id FROM platform_users WHERE email=?").get(input.email),
    409,
    "An account already exists. Sign in or reset your password.",
  );
  db.prepare(
    "INSERT INTO platform_users(id,email,name,password_hash,roles,departments,verified_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    input.email,
    input.name,
    passwordHash(input.password),
    JSON.stringify(assignedRoles),
    JSON.stringify(departments),
    verified ? now : null,
    now,
    now,
  );
  audit(id, "account.created", "user", id, undefined, {
    roles: assignedRoles,
    departments,
  });
  return id;
}
export function createAccountSession(
  userId: string,
  mfa = false,
  pending = false,
) {
  const token = randomBytes(32).toString("base64url");
  platformDb()
    .prepare(
      "INSERT INTO platform_sessions(token_hash,user_id,mfa_verified,expires_at,created_at) VALUES(?,?,?,?,?)",
    )
    .run(
      hashToken(token),
      userId,
      mfa ? 1 : 0,
      Date.now() + (pending ? 10 * 60 * 1000 : 8 * 60 * 60 * 1000),
      new Date().toISOString(),
    );
  return token;
}
export function setAccountCookie(
  response: NextResponse,
  token: string,
  request: NextRequest,
  pending = false,
) {
  response.cookies.set(ACCOUNT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isPreview || request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: pending ? 600 : 28800,
  });
}
export function sessionUser(
  request: NextRequest,
  allowPending = false,
): Principal | null {
  const token = request.cookies.get(ACCOUNT_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const row = platformDb()
    .prepare(
      "SELECT u.*,s.mfa_verified FROM platform_sessions s JOIN platform_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.state='active'",
    )
    .get(hashToken(token), Date.now()) as
    (UserRow & { mfa_verified: number }) | undefined;
  if (!row || !row.verified_at) return null;
  const userRoles = JSON.parse(row.roles) as Role[];
  const staff = userRoles.some((role) => role !== "customer");
  if (staff && !row.mfa_verified && !allowPending) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: userRoles,
    departments: JSON.parse(row.departments),
    authority: JSON.parse(row.authority),
    verified: true,
    mfa: !!row.mfa_verified,
  };
}
export function requireUser(request: NextRequest) {
  const user = sessionUser(request);
  demand(
    user,
    401,
    "Please sign in. Staff sessions also require authenticator verification.",
  );
  return user;
}
export function hasPermission(
  user: Principal,
  action: string,
  department?: string,
) {
  const has = (...values: Role[]) =>
    user.roles.some((role) => values.includes(role));
  let permitted = false;
  if (action === "users.manage" || action === "settings.manage")
    permitted = has("administrator");
  if (action === "audit.read") permitted = has("administrator", "auditor");
  if (action === "content.edit")
    permitted = has(
      "administrator",
      "publisher",
      "editor",
      "marketing",
      "department_manager",
    );
  if (action === "content.publish") permitted = has("publisher");
  if (action === "inquiry.read" || action === "inquiry.edit")
    permitted =
      has("department_manager", "operations", "finance") ||
      (action === "inquiry.read" && has("auditor"));
  if (action === "quotation.edit" || action === "quotation.read")
    permitted =
      has("department_manager", "finance") ||
      (action === "quotation.read" && has("operations", "auditor"));
  if (action === "quotation.technical") permitted = has("department_manager");
  if (action === "quotation.finance") permitted = has("finance");
  if (action === "quotation.approve")
    permitted = has("finance") && !!user.authority.quotation;
  if (action === "pricing.edit")
    permitted = has("department_manager", "finance");
  if (action === "pricing.approve")
    permitted = has("finance") && !!user.authority.pricing;
  if (
    action === "booking.manage" ||
    action === "resource.manage" ||
    action === "project.edit"
  )
    permitted = has("operations", "department_manager");
  if (action === "supplier.read")
    permitted = has("operations", "department_manager", "finance", "auditor");
  if (action === "supplier.manage")
    permitted = has("operations", "department_manager");
  if (action === "supplier.approve")
    permitted = has("operations") && !!user.authority.booking;
  if (action === "resource.publish")
    permitted = has("operations") && !!user.authority.booking;
  if (action === "booking.confirm")
    permitted = has("operations") && !!user.authority.booking;
  if (action === "reports.read")
    permitted = has("department_manager", "finance", "operations", "auditor");
  if (action === "ai.editor")
    permitted = has("publisher", "editor", "marketing");
  if (department && !user.departments.includes(department)) return false;
  return permitted;
}
export function authorize(
  user: Principal,
  action: string,
  department?: string,
) {
  demand(
    hasPermission(user, action, department),
    403,
    "Your account does not have permission for this action or department.",
  );
}
export function publicUser(user: Principal | null) {
  return user;
}
export function loginAccount(email: string, password: string) {
  const row = platformDb()
    .prepare("SELECT * FROM platform_users WHERE email=?")
    .get(email.toLowerCase()) as UserRow | undefined;
  // The same KDF is used on unknown users to reduce account-enumeration timing.
  const dummy = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
  const valid = verifyPassword(password, row?.password_hash || dummy);
  demand(
    valid && row && row.state === "active" && row.verified_at,
    401,
    "Sign-in failed. Check your details and verify your email before signing in.",
  );
  const staff = (JSON.parse(row.roles) as Role[]).some(
    (role) => role !== "customer",
  );
  audit(row.id, "account.password_verified", "user", row.id);
  return { id: row.id, staff, setupRequired: staff && !row.totp_secret };
}
export function issueToken(
  purpose: "verify" | "reset" | "claim",
  email: string,
  userId: string | null,
  recordId?: string,
) {
  const token = randomBytes(32).toString("base64url");
  const db = platformDb();
  if (purpose !== "claim")
    db.prepare(
      "UPDATE platform_tokens SET used_at=? WHERE purpose=? AND email=? AND used_at IS NULL",
    ).run(new Date().toISOString(), purpose, email);
  db.prepare(
    "INSERT INTO platform_tokens(token_hash,user_id,purpose,record_id,email,expires_at) VALUES(?,?,?,?,?,?)",
  ).run(
    hashToken(token),
    userId,
    purpose,
    recordId || null,
    email,
    Date.now() + (purpose === "claim" ? 7 * 86400000 : 60 * 60 * 1000),
  );
  return token;
}
export function tokenRecord(token: string, purpose: string) {
  demand(
    /^[a-zA-Z0-9_-]{43}$/.test(token),
    400,
    "This link is invalid or expired.",
  );
  const row = platformDb()
    .prepare(
      "SELECT * FROM platform_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>?",
    )
    .get(hashToken(token), purpose, Date.now()) as
    | {
        token_hash: string;
        user_id: string | null;
        record_id: string | null;
        email: string;
      }
    | undefined;
  demand(row, 400, "This link is invalid or expired.");
  return row;
}
export function verifyAccountEmail(token: string) {
  const db = platformDb();
  return db.transaction(() => {
    const row = tokenRecord(token, "verify"),
      now = new Date().toISOString();
    db.prepare(
      "UPDATE platform_users SET verified_at=?,updated_at=? WHERE id=? AND state='active'",
    ).run(now, now, row.user_id);
    db.prepare("UPDATE platform_tokens SET used_at=? WHERE token_hash=?").run(
      now,
      row.token_hash,
    );
    audit(row.user_id!, "account.email_verified", "user", row.user_id!);
  })();
}
export function resetAccountPassword(token: string, password: string) {
  const db = platformDb();
  return db.transaction(() => {
    const row = tokenRecord(token, "reset"),
      now = new Date().toISOString();
    db.prepare(
      "UPDATE platform_users SET password_hash=?,updated_at=? WHERE id=?",
    ).run(passwordHash(password), now, row.user_id);
    db.prepare("UPDATE platform_sessions SET expires_at=0 WHERE user_id=?").run(
      row.user_id,
    );
    db.prepare("UPDATE platform_tokens SET used_at=? WHERE token_hash=?").run(
      now,
      row.token_hash,
    );
    audit(row.user_id!, "account.password_reset", "user", row.user_id!);
  })();
}
const base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function decodeBase32(value: string) {
  let bits = "";
  for (const letter of value)
    bits += base32.indexOf(letter).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function generateSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5)
    result += base32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return result;
}
function encryptionKey() {
  demand(
    (process.env.SESSION_SECRET?.length || 0) >= 32,
    503,
    "The account encryption key is not configured.",
  );
  return createHash("sha256").update(process.env.SESSION_SECRET!).digest();
}
function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv),
    body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
function decrypt(value: string) {
  const bytes = Buffer.from(value, "base64url"),
    cipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      bytes.subarray(0, 12),
    );
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    cipher.update(bytes.subarray(28)),
    cipher.final(),
  ]).toString("utf8");
}
export function totpCode(
  secret: string,
  step = Math.floor(Date.now() / 30000),
) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac("sha1", decodeBase32(secret))
    .update(counter)
    .digest();
  const offset = hash[19] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
export function beginMfa(user: Principal) {
  const db = platformDb(),
    row = db
      .prepare(
        "SELECT totp_secret,last_totp_step FROM platform_users WHERE id=?",
      )
      .get(user.id) as { totp_secret: string | null; last_totp_step: number };
  demand(
    !row.totp_secret || row.last_totp_step === 0,
    409,
    "An authenticator is already registered. Use the existing authenticator or contact an administrator.",
  );
  const secret = generateSecret();
  db.prepare("UPDATE platform_users SET totp_secret=? WHERE id=?").run(
    encrypt(secret),
    user.id,
  );
  return {
    secret,
    uri: `otpauth://totp/TOC:${encodeURIComponent(user.email)}?secret=${secret}&issuer=TOC&algorithm=SHA1&digits=6&period=30`,
  };
}
export function verifyMfa(user: Principal, code: string) {
  demand(/^\d{6}$/.test(code), 422, "Enter the six-digit authenticator code.");
  const db = platformDb();
  return db.transaction(() => {
    const row = db
      .prepare(
        "SELECT totp_secret,last_totp_step FROM platform_users WHERE id=?",
      )
      .get(user.id) as { totp_secret: string | null; last_totp_step: number };
    demand(row.totp_secret, 409, "Set up an authenticator first.");
    const secret = decrypt(row.totp_secret),
      current = Math.floor(Date.now() / 30000);
    const step = [current - 1, current, current + 1].find(
      (step) =>
        step > row.last_totp_step &&
        timingSafeEqual(Buffer.from(totpCode(secret, step)), Buffer.from(code)),
    );
    demand(step, 401, "That code is invalid, expired or already used.");
    db.prepare("UPDATE platform_users SET last_totp_step=? WHERE id=?").run(
      step,
      user.id,
    );
    audit(user.id, "account.mfa_verified", "user", user.id);
  })();
}
export const roleUpdateSchema = z.object({
  id: z.string().uuid(),
  roles: z.array(z.enum(roles)).min(1).max(9),
  departments: z.array(z.enum(additionalServiceOptions)).max(5),
  authority: z.object({
    quotation: z.boolean(),
    pricing: z.boolean(),
    booking: z.boolean(),
    maxQuotationMinor: z.number().int().min(0).max(900000000000).default(0),
    maxDiscountBps: z.number().int().min(0).max(10000).default(0),
  }),
  state: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(10).max(1000),
});
export function updateAccess(
  actor: Principal,
  input: z.infer<typeof roleUpdateSchema>,
) {
  authorize(actor, "users.manage");
  demand(
    input.id !== actor.id,
    403,
    "Use a second authorized administrator to change your own privileges.",
  );
  const db = platformDb(),
    before = db
      .prepare(
        "SELECT id,email,roles,departments,authority,state FROM platform_users WHERE id=?",
      )
      .get(input.id);
  demand(before, 404, "Account not found.");
  db.transaction(() => {
    db.prepare(
      "UPDATE platform_users SET roles=?,departments=?,authority=?,state=?,updated_at=? WHERE id=?",
    ).run(
      JSON.stringify(input.roles),
      JSON.stringify(input.departments),
      JSON.stringify(input.authority),
      input.state,
      new Date().toISOString(),
      input.id,
    );
    db.prepare("DELETE FROM platform_sessions WHERE user_id=?").run(input.id);
    audit(
      actor.id,
      "account.access_changed",
      "user",
      input.id,
      before,
      {
        roles: input.roles,
        departments: input.departments,
        authority: input.authority,
        state: input.state,
      },
      input.reason,
    );
  })();
}
