// Synthetic data ONLY. Never imports an existing deployment database or env file.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import type { Principal, Role } from "../lib/platform-auth";

if (process.env.NEXT_PUBLIC_PREVIEW_MODE === "false")
  throw new Error("Browser fixtures are forbidden with live delivery enabled.");
const root = mkdtempSync(join(tmpdir(), "toc-blueprint-qa-"));
const secret = randomBytes(48).toString("hex");
Object.assign(process.env, {
  NEXT_PUBLIC_PREVIEW_MODE: "true",
  DATABASE_PATH: join(root, "toc.sqlite"),
  PRIVATE_STORAGE_PATH: join(root, "documents"),
  SESSION_SECRET: secret,
  AI_ENABLED: "false",
  SMTP_PASS: "",
});
const auth = await import("../lib/platform-auth");
const { platformDb } = await import("../lib/platform-store");
const business = await import("../lib/platform-business");
const cms = await import("../lib/platform-cms");
const ops = await import("../lib/platform-operations");
const { inquirySchema } = await import("../lib/inquiry");
const { saveInquiry, database } = await import("../lib/database");
const departments = [
  "event-management",
  "catering",
  "general-cleaning",
  "ict-solutions",
  "entertainment",
];
const password = randomBytes(24).toString("base64url");
const evidence =
  "SYNTHETIC QA ONLY. Not TOC commercial, project or media evidence.";
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();
function person(
  name: string,
  roles: Role[],
  authority: Principal["authority"] = {},
): Principal {
  const email = `${name.toLowerCase().replaceAll(" ", "-")}@example.test`;
  const id = auth.createUser(
    { name, email, password },
    roles,
    roles.includes("customer") ? [] : departments,
    true,
  );
  platformDb()
    .prepare("UPDATE platform_users SET authority=? WHERE id=?")
    .run(JSON.stringify(authority), id);
  return {
    id,
    name,
    email,
    roles,
    departments: roles.includes("customer") ? [] : departments,
    authority,
    verified: true,
    mfa: true,
  };
}
const customer = person("Synthetic QA Customer", ["customer"]);
const staff = person(
  "Synthetic QA Coordinator",
  [
    "administrator",
    "publisher",
    "department_manager",
    "finance",
    "operations",
    "auditor",
  ],
  {
    quotation: true,
    pricing: true,
    booking: true,
    maxQuotationMinor: 1000000000,
    maxDiscountBps: 2000,
  },
);
const author = person("Synthetic QA Author", ["department_manager", "editor"]);
const technical = person("Synthetic QA Technical", ["department_manager"]);
const finance = person("Synthetic QA Finance", ["finance"]);
const approver = person("Synthetic QA Approver", ["finance"], {
  quotation: true,
  pricing: true,
  maxQuotationMinor: 1000000000,
  maxDiscountBps: 2000,
});
const mfa = auth.beginMfa(staff);
const records: Record<string, string> = {};
for (const division of departments) {
  const parsed = inquirySchema.parse({
    origin: "quotation",
    service: division,
    name: customer.name,
    email: customer.email,
    phone: "+255700000001",
    location: "SYNTHETIC QA Dodoma location",
    region: "Dodoma",
    consent: true,
    dateFlexible: true,
    ...(["event-management", "catering", "entertainment"].includes(division)
      ? {
          eventType: "Corporate event",
          guestCount: 50,
          cateringRequired: "no",
          serviceStyle: "discuss",
        }
      : {}),
    ...(division === "catering"
      ? { preferences: ["Menu guidance requested"] }
      : {}),
    ...(division === "entertainment"
      ? { preferences: ["Technical guidance requested"] }
      : {}),
    ...(division === "general-cleaning"
      ? {
          propertyType: "office",
          frequency: "weekly",
          preferences: ["Office cleaning"],
        }
      : {}),
    ...(division === "ict-solutions"
      ? {
          ictCategory: "website",
          urgency: "normal",
          message: "Synthetic QA website discovery. No production credentials.",
        }
      : {}),
  });
  const saved = saveInquiry(parsed),
    record = business.inquiryById(saved.id);
  records[division] = record.id;
  business.claimInquiry(customer, business.createInquiryClaim(record));
  business.postMessage(author, {
    inquiryId: record.id,
    body: "Synthetic customer-visible progress message.",
    visibility: "customer",
  });
  business.postMessage(author, {
    inquiryId: record.id,
    body: "PRIVATE STAFF QA MARKER",
    visibility: "internal",
  });
  const book = business.createPriceBook(
    author,
    business.priceBookSchema.parse({
      name: `SYNTHETIC QA ${division} rate — not a TOC price`,
      department: division,
      effectiveFrom: new Date(Date.now() - 60000).toISOString(),
      effectiveTo: future(7),
      rules: [
        {
          id: "qa-assessment",
          description: "SYNTHETIC QA assessment unit — not a TOC price",
          unit: "hour",
          unitPrice: "20.00",
          taxBps: 0,
          taxInclusive: false,
          public: true,
        },
      ],
    }),
  );
  business.approvePriceBook(approver, book.id, evidence);
  if (["general-cleaning", "ict-solutions"].includes(division)) {
    const offer = business.createQuotation(
      author,
      business.quoteSchema.parse({
        inquiryId: record.id,
        items: [
          {
            description: "SYNTHETIC QA service",
            quantity: "2",
            unit: "hour",
            unitPrice: "20.00",
            taxBps: 0,
            taxInclusive: false,
            department: division,
            priceRuleId: `${book.id}:qa-assessment`,
          },
        ],
        discountBps: 0,
        expiresOn: future(6).slice(0, 10),
        scope: evidence,
        terms: evidence,
        pricingReason: evidence,
      }),
    );
    business.actOnQuotation(author, {
      id: offer.id,
      action: "submit",
      reason: evidence,
    });
    business.actOnQuotation(technical, {
      id: offer.id,
      action: "technical",
      department: division as "general-cleaning",
      reason: evidence,
    });
    business.actOnQuotation(finance, {
      id: offer.id,
      action: "finance",
      reason: evidence,
    });
    business.actOnQuotation(approver, {
      id: offer.id,
      action: "approve",
      reason: evidence,
    });
    business.actOnQuotation(approver, {
      id: offer.id,
      action: "issue",
      reason: evidence,
    });
    if (division === "general-cleaning") {
      business.acceptQuotation(customer, {
        id: offer.id,
        version: 1,
        confirm: true,
        terms: evidence,
      });
      ops.createBooking(
        staff,
        ops.bookingSchema.parse({
          quotationVersionId: offer.id,
          startsAt: future(2),
          endsAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
          supervisorId: staff.id,
          team: "PRIVATE TEAM QA MARKER",
          resources: [],
          frequency: "weekly",
          visits: 3,
        }),
      );
    }
  }
}
const suppliers = await import("../lib/platform-suppliers");
const qaSupplier = suppliers.saveSupplier(
  author,
  suppliers.supplierSchema.parse({
    name: "SYNTHETIC QA supplier — no live arrangement",
    department: "entertainment",
    category: "Synthetic display hire",
    contactName: "PRIVATE QA supplier contact",
    email: "supplier@example.test",
    phone: "",
    capabilityEvidence: evidence,
  }),
);
ops.saveResource(
  staff,
  ops.resourceSchema.parse({
    name: "SYNTHETIC QA display — no TOC availability claim",
    department: "entertainment",
    category: "display",
    ownership: "hired",
    supplierId: qaSupplier.id,
    quantity: 1,
    state: "available",
    maintenanceDue: null,
    published: true,
    publicationEvidence: evidence,
    location: "PRIVATE STORAGE QA MARKER",
  }),
);
for (const type of ["project", "article", "page"] as const) {
  const saved = cms.saveContent(
    author,
    cms.saveContentSchema.parse({
      type,
      slug: `synthetic-qa-${type}`,
      department: "",
      data: {
        title: {
          en: `SYNTHETIC QA ${type} — not TOC evidence`,
          sw: `JARIBIO ${type} — si ushahidi wa TOC`,
        },
        summary: {
          en: evidence,
          sw: "Taarifa za majaribio pekee, si ushahidi wa biashara.",
        },
        body: {
          en: evidence,
          sw: "Taarifa za majaribio pekee, si ushahidi wa biashara.",
        },
        ...(type === "project"
          ? {
              service: "ict-solutions",
              year: 2026,
              location: "Synthetic Dodoma",
              clientApproved: true,
              permissionEvidence: evidence,
            }
          : {}),
        ...(type === "article"
          ? {
              author: "Synthetic QA editor",
              date: new Date().toISOString().slice(0, 10),
            }
          : {}),
        seo: {
          title: `Synthetic QA ${type}`,
          description: evidence,
          canonicalPath:
            type === "page"
              ? `/synthetic-qa-${type}`
              : `/${type === "article" ? "news" : "projects"}/synthetic-qa-${type}`,
          socialTitle: "Synthetic social preview",
          socialDescription: evidence,
        },
      },
      sourceReference: evidence,
    }),
  );
  const act = (action: "submit" | "approve" | "publish", actor: Principal) =>
    cms.changePublication(actor, {
      id: saved.id,
      expectedVersion: cms
        .listContent(staff)
        .find((item) => item.id === saved.id)!.version,
      action,
      reason: evidence,
    });
  act("submit", author);
  act("approve", staff);
  act("publish", staff);
}
const fixture = {
  root,
  databasePath: process.env.DATABASE_PATH,
  storagePath: process.env.PRIVATE_STORAGE_PATH,
  sessionSecret: secret,
  password,
  customer: { ...customer, session: auth.createAccountSession(customer.id) },
  staff: {
    ...staff,
    session: auth.createAccountSession(staff.id, true),
    totpSecret: mfa.secret,
  },
  records,
  supplierId: qaSupplier.id,
  createdAt: new Date().toISOString(),
};
mkdirSync("research", { recursive: true });
writeFileSync(
  resolve("research/blueprint-fixture.json"),
  JSON.stringify(fixture),
  { mode: 0o600 },
);
database().close();
console.log(
  "Disposable synthetic browser fixture prepared. Secrets are confined to ignored research/blueprint-fixture.json; never publish this file.",
);
