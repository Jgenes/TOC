import test from "node:test";
import assert from "node:assert/strict";
import { inquirySchema, canTransition, todayInTanzania } from "../lib/inquiry";
const valid = {
  origin: "quotation",
  service: "catering",
  name: "Preview Customer",
  email: "preview@example.test",
  phone: "+255 700 000 001",
  location: "Dodoma",
  region: "Dodoma",
  eventType: "Corporate event",
  guestCount: 100,
  preferences: ["Menu guidance requested"],
  serviceStyle: "discuss",
  dateFlexible: true,
  consent: true,
};
test("valid requests are parsed and defaults applied", () => {
  const result = inquirySchema.safeParse(valid);
  assert.equal(result.success, true);
  if (result.success)
    assert.deepEqual(result.data.preferences, ["Menu guidance requested"]);
});
test("quotation requires a valid service and contact details", () => {
  assert.equal(
    inquirySchema.safeParse({ ...valid, service: "ict-solutions" }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, phone: "123" }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, email: "bad" }).success,
    false,
  );
});
test("privacy consent is mandatory", () => {
  assert.equal(
    inquirySchema.safeParse({ ...valid, consent: false }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, consent: undefined }).success,
    false,
  );
});
test("negative guests, past dates and impossible dates are rejected", () => {
  assert.equal(
    inquirySchema.safeParse({ ...valid, guestCount: -10 }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, guestCount: 1.5 }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, eventDate: "2020-01-01" }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, eventDate: "2099-02-31" }).success,
    false,
  );
});
test("bots and oversized fields are rejected", () => {
  assert.equal(
    inquirySchema.safeParse({ ...valid, website: "https://spam.test" }).success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, message: "x".repeat(3001) }).success,
    false,
  );
});
test("date is required if flexibility is disabled", () => {
  assert.equal(
    inquirySchema.safeParse({ ...valid, dateFlexible: false, eventDate: "" })
      .success,
    false,
  );
  assert.equal(
    inquirySchema.safeParse({
      ...valid,
      dateFlexible: false,
      eventDate: todayInTanzania(),
    }).success,
    true,
  );
});
test("contact requires a real message but phone is optional", () => {
  assert.equal(
    inquirySchema.safeParse({
      origin: "contact",
      service: "contact",
      name: "Preview Customer",
      email: "preview@example.test",
      message: "A test contact inquiry.",
      consent: true,
    }).success,
    true,
  );
  assert.equal(
    inquirySchema.safeParse({ ...valid, origin: "contact", message: "short" })
      .success,
    false,
  );
});
test("review cannot be bypassed, reopening is permitted", () => {
  assert.equal(canTransition("new", "closed"), false);
  assert.equal(canTransition("new", "contacted"), false);
  assert.equal(canTransition("new", "in_review"), true);
  assert.equal(canTransition("in_review", "contacted"), true);
  assert.equal(canTransition("contacted", "closed"), true);
  assert.equal(canTransition("closed", "in_review"), true);
});
