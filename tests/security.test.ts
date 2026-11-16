import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createStaffSession,
  validStaffSession,
  passwordMatches,
} from "../lib/security";
process.env.STAFF_PASSWORD = "unit-test-only-password";
process.env.SESSION_SECRET = "unit-test-only-secret-at-least-32-characters";
test("staff password is checked without a public default", () => {
  assert.equal(passwordMatches("unit-test-only-password"), true);
  assert.equal(passwordMatches("incorrect"), false);
});
test("signed sessions validate and tampering fails", () => {
  const session = createStaffSession();
  assert.equal(validStaffSession(session), true);
  assert.equal(validStaffSession(session + "bad"), false);
  assert.equal(validStaffSession("unsigned"), false);
  assert.equal(validStaffSession(undefined), false);
});
test("expired sessions are rejected", () => {
  const payload = Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url");
  const sig = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
  assert.equal(validStaffSession(`${payload}.${sig}`), false);
});
