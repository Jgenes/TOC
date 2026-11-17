import test from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SMTPTransportOptions } from "nodemailer";
import { company } from "../lib/content";
import { inquirySchema } from "../lib/inquiry";
import { buildInquiryEmail, notifyInquiry } from "../lib/inquiry-email";

const inquiry = inquirySchema.parse({
  origin: "quotation",
  service: "catering",
  name: "Synthetic Customer",
  organization: "Example Organization",
  email: "customer@example.test",
  phone: "+255 700 000 001",
  eventType: "Conference or workshop",
  region: "Dodoma",
  eventDate: "2099-12-31",
  dateFlexible: false,
  location: "Dodoma test venue",
  guestCount: 80,
  preferences: ["Lunch or dinner buffet", "Service staff"],
  serviceStyle: "Buffet",
  dietary: "Vegetarian options",
  budget: "TZS 5,000,000",
  message: "Synthetic inquiry only.\nPlease discuss the menu with us.",
  consent: true,
});
const receipt = {
  reference: "TOC-2026-ABCD1234",
  createdAt: "2026-11-17T06:00:00.000Z",
};
const environment = { SMTP_PASS: "synthetic-test-password-not-a-real-secret" };

test("quotation email includes every form detail and the saved reference", () => {
  const mail = buildInquiryEmail(inquiry, receipt, company.email);
  assert.equal(mail.to && typeof mail.to, "object");
  assert.deepEqual(mail.to, { name: "TOC inquiries", address: company.email });
  assert.deepEqual(mail.from, { name: company.name, address: company.email });
  assert.deepEqual(mail.replyTo, {
    name: inquiry.name,
    address: inquiry.email,
  });
  assert.match(String(mail.subject), /New quotation request/);
  for (const value of [
    receipt.reference,
    receipt.createdAt,
    inquiry.name,
    inquiry.organization,
    inquiry.email,
    inquiry.phone,
    inquiry.eventType,
    inquiry.eventDate,
    inquiry.location,
    String(inquiry.guestCount),
    ...inquiry.preferences,
    inquiry.serviceStyle,
    inquiry.dietary,
    inquiry.budget,
    inquiry.message,
    "Catering & food services",
    "Form: quotation",
    "Date flexible / to be confirmed: No",
    "Privacy consent for this inquiry: Yes",
  ]) {
    assert.ok(
      String(mail.text).includes(value),
      `Missing email detail: ${value}`,
    );
  }
  assert.ok(!String(mail.text).includes("website:"));
  assert.equal(mail.html, undefined);
  assert.equal(mail.disableFileAccess, true);
  assert.equal(mail.disableUrlAccess, true);
});

test("contact emails handle optional fields and keep the recipient fixed", () => {
  const contact = inquirySchema.parse({
    origin: "contact",
    service: "contact",
    name: "Contact Customer",
    email: "contact@example.test",
    message: "A synthetic contact message.",
    consent: true,
    to: "untrusted@example.test",
    from: "untrusted@example.test",
    subject: "Untrusted subject",
  });
  const mail = buildInquiryEmail(contact, receipt, company.email);
  assert.match(String(mail.subject), /New contact message — General inquiry/);
  assert.match(String(mail.text), /Phone: Not supplied/);
  assert.match(String(mail.text), /Preferred date: To be confirmed/);
  assert.match(String(mail.text), /Date flexible \/ to be confirmed: Yes/);
  assert.match(String(mail.text), /A synthetic contact message\./);
  assert.deepEqual(mail.to, { name: "TOC inquiries", address: company.email });
  assert.ok(!String(mail.subject).includes("Untrusted"));
});

test("Nodemailer serializes untrusted names as data, not additional headers", async () => {
  const mail = buildInquiryEmail(
    { ...inquiry, name: "Synthetic Customer\r\nBcc: untrusted@example.test" },
    receipt,
    company.email,
  );
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  const result = await transport.sendMail(mail);
  assert.deepEqual(result.envelope.to, [company.email]);
  assert.equal(result.envelope.from, company.email);
  const headers = result.message.toString().split(/\r?\n\r?\n/)[0];
  assert.doesNotMatch(headers, /^Bcc:/im);
  assert.doesNotMatch(headers, /^Cc:/im);
});

test("preview never creates an SMTP connection, even with credentials", async () => {
  const status = await notifyInquiry(inquiry, receipt, {
    preview: true,
    environment,
    createTransport: () => assert.fail("Preview must not connect to SMTP"),
  });
  assert.equal(status, "preview_local_only");
});

test("missing mailbox password leaves the inquiry saved without claiming email", async (t) => {
  const warning = t.mock.method(console, "warn", () => {});
  const status = await notifyInquiry(inquiry, receipt, {
    preview: false,
    environment: {},
    createTransport: () => assert.fail("Missing credentials must not connect"),
  });
  assert.equal(status, "saved_for_review");
  assert.equal(warning.mock.callCount(), 1);
});

test("SMTP defaults use the supplied mailbox and strict implicit TLS on port 465", async () => {
  let configuration: SMTPTransportOptions | undefined;
  const status = await notifyInquiry(inquiry, receipt, {
    preview: false,
    environment,
    createTransport: (config) => {
      configuration = config;
      return {
        async sendMail(mail) {
          assert.deepEqual(mail.from, {
            name: company.name,
            address: company.email,
          });
          return { accepted: [company.email] };
        },
      };
    },
  });
  assert.equal(status, "email_sent");
  assert.equal(configuration?.host, "mail.tocinvestment.co.tz");
  assert.equal(configuration?.port, 465);
  assert.equal(configuration?.secure, true);
  assert.equal(configuration?.requireTLS, false);
  assert.deepEqual(configuration?.auth, {
    user: company.email,
    pass: environment.SMTP_PASS,
  });
  assert.equal(configuration?.tls?.minVersion, "TLSv1.2");
  assert.equal(configuration?.tls?.rejectUnauthorized, true);
  assert.equal(configuration?.connectionTimeout, 8000);
  assert.equal(configuration?.greetingTimeout, 8000);
  assert.equal(configuration?.socketTimeout, 10000);
  assert.equal(configuration?.logger, false);
  assert.equal(configuration?.debug, false);
});

test("STARTTLS configuration still requires encryption and certificate validation", async () => {
  const status = await notifyInquiry(inquiry, receipt, {
    preview: false,
    environment: {
      ...environment,
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_USER: "sender@example.test",
    },
    createTransport: (config) => {
      assert.equal(config.port, 587);
      assert.equal(config.secure, false);
      assert.equal(config.requireTLS, true);
      assert.equal(config.tls?.rejectUnauthorized, true);
      return {
        async sendMail(mail) {
          assert.deepEqual(mail.from, {
            name: company.name,
            address: "sender@example.test",
          });
          return { accepted: [company.email.toUpperCase()] };
        },
      };
    },
  });
  assert.equal(status, "email_sent");
});

test("invalid SMTP settings fail safely before connecting", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  const connect = t.mock.fn(() => ({
    async sendMail() {
      return { accepted: [company.email] };
    },
  }));
  for (const invalid of [
    { SMTP_PORT: "invalid" },
    { SMTP_PORT: "0" },
    { SMTP_PORT: "65536" },
    { SMTP_SECURE: "yes" },
    { SMTP_USER: "sender@example.test\r\nBcc: other@example.test" },
    { SMTP_HOST: "https://mail.example.test" },
  ]) {
    const status = await notifyInquiry(inquiry, receipt, {
      preview: false,
      environment: { ...environment, ...invalid },
      createTransport: connect,
    });
    assert.equal(status, "email_failed");
  }
  assert.equal(connect.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 6);
  assert.ok(!JSON.stringify(error.mock.calls).includes(environment.SMTP_PASS));
});

test("SMTP failure does not expose transport errors or customer details in logs", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const status = await notifyInquiry(inquiry, receipt, {
    preview: false,
    environment,
    createTransport: () => ({
      async sendMail() {
        throw new Error(
          `Authentication failed: ${environment.SMTP_PASS} ${inquiry.email}`,
        );
      },
    }),
  });
  assert.equal(status, "email_failed");
  assert.deepEqual(log.mock.calls[0].arguments, [
    "Inquiry email could not be sent; saved in the staff inbox.",
    { reference: receipt.reference },
  ]);
});

test("a resolved send without acceptance by TOC is not reported as sent", async (t) => {
  t.mock.method(console, "error", () => {});
  const status = await notifyInquiry(inquiry, receipt, {
    preview: false,
    environment,
    createTransport: () => ({
      async sendMail() {
        return { accepted: ["another@example.test"] };
      },
    }),
  });
  assert.equal(status, "email_failed");
});
