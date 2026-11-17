// Generates a reviewable OpenAPI 3.1 contract; never opens a database or uses credentials.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { platformInputs } from "../lib/platform-api-schema";
import { inquirySchema } from "../lib/inquiry";
import { userInput, roleUpdateSchema } from "../lib/platform-auth";
import { saveContentSchema, publishSchema } from "../lib/platform-cms";
import {
  assignmentSchema,
  classificationSchema,
  quoteSchema,
  quoteActionSchema,
  acceptSchema,
  priceBookSchema,
  messageSchema,
} from "../lib/platform-business";
import {
  bookingSchema,
  bookingActionSchema,
  visitSchema,
  milestoneSchema,
  resourceSchema,
  reportFilters,
} from "../lib/platform-operations";
import { aiInput } from "../lib/platform-ai";
import { saveDraftSchema, draftDataSchema } from "../lib/platform-drafts";
import { assessmentSchema } from "../lib/platform-crm";
import {
  supplierSchema,
  supplierActionSchema,
} from "../lib/platform-suppliers";
import { auditFilters } from "../lib/platform-audit";
import {
  privacyRequestSchema,
  privacyActionSchema,
} from "../lib/platform-privacy";
import { operationalSettingsSchema } from "../lib/platform-jobs";
const sourceSchemas: Record<string, z.ZodType> = {
  Inquiry: inquirySchema,
  Registration: userInput,
  AccessUpdate: roleUpdateSchema,
  ContentSave: saveContentSchema,
  PublicationAction: publishSchema,
  Assignment: assignmentSchema,
  Classification: classificationSchema,
  QuotationDraft: quoteSchema,
  QuotationAction: quoteActionSchema,
  AcceptQuotation: acceptSchema,
  PriceBookProposal: priceBookSchema,
  BookingDraft: bookingSchema,
  BookingAction: bookingActionSchema,
  VisitAction: visitSchema,
  Milestone: milestoneSchema,
  Resource: resourceSchema,
  ReportFilters: reportFilters,
  AssistantInput: aiInput,
  AccountDraftSave: saveDraftSchema,
  DraftData: draftDataSchema,
  Assessment: assessmentSchema,
  Supplier: supplierSchema,
  SupplierAction: supplierActionSchema,
  AuditFilters: auditFilters,
  PrivacyRequest: privacyRequestSchema,
  PrivacyAction: privacyActionSchema,
  OperationsSettings: operationalSettingsSchema,
  Message: messageSchema,
  Empty: z
    .unknown()
    .describe(
      "A JSON body must be supplied; its value is ignored. Conventionally send {}.",
    ),
  ...platformInputs,
};
type S = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` }),
  array = (items: S) => ({ type: "array", items }),
  object = (properties: Record<string, S>, required: string[] = []) => ({
    type: "object",
    properties,
    required,
  }),
  closedObject = (properties: Record<string, S>, required: string[] = []) => ({
    ...object(properties, required),
    additionalProperties: false,
  }),
  s = { type: "string" },
  b = { type: "boolean" },
  n = { type: "number" },
  integer = { type: "integer" },
  nullable = (schema: S) => ({ anyOf: [schema, { type: "null" }] }),
  dateTime = { type: "string", format: "date-time" };
const schemas: Record<string, S> = {};
for (const [name, schema] of Object.entries(sourceSchemas)) {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  delete json.$schema;
  schemas[name] = json as S;
}
Object.assign(schemas, {
  ReferenceReceipt: object({ reference: s }, ["reference"]),
  DraftSaved: object({ version: integer, retentionDays: { const: 30 } }, [
    "version",
    "retentionDays",
  ]),
  RevisionHistory: object(
    {
      revisions: array(
        object({
          id: s,
          item_id: s,
          version: integer,
          data: { type: "object" },
          author_id: s,
          source_reference: s,
          state: s,
          created_at: dateTime,
        }),
      ),
    },
    ["revisions"],
  ),
  BackgroundResult: object(
    {
      publishing: s,
      reminders: { type: "object" },
      mail: { type: "object" },
      files: { type: "object" },
      expiredDraftsRemoved: integer,
    },
    ["publishing", "mail", "files"],
  ),
  LegacyLogin: z.toJSONSchema(z.object({ password: z.string().max(256) })),
  LegacyStatus: z.toJSONSchema(
    z.object({ status: z.enum(["new", "in_review", "contacted", "closed"]) }),
  ),
  SupplierRecord: object(
    {
      id: s,
      name: s,
      department: s,
      category: s,
      contact_name: s,
      email: s,
      phone: s,
      capability_evidence: s,
      state: s,
      version: integer,
      author_id: s,
      approved_by: nullable(s),
      approval_evidence: s,
      approved_until: nullable(dateTime),
      updated_at: dateTime,
    },
    ["id", "name", "state", "version"],
  ),
  Error: object(
    {
      error: s,
      requestId: s,
      fields: {
        oneOf: [
          { type: "object", additionalProperties: s },
          array(object({ path: s, message: s }, ["path", "message"])),
        ],
      },
    },
    ["error"],
  ),
  Ok: object({ ok: { const: true } }, ["ok"]),
  Created: object({ id: { type: "string", format: "uuid" } }, ["id"]),
  ContentSaved: object({ id: s, revisionId: s, version: integer }, [
    "id",
    "revisionId",
    "version",
  ]),
  QuotationCreated: object(
    { id: s, quotationId: s, reference: s, version: integer },
    ["id", "quotationId", "reference", "version"],
  ),
  BookingCreated: object(
    { id: s, reference: s, status: { const: "pending" } },
    ["id", "reference", "status"],
  ),
  UploadReceipt: object(
    { id: s, state: { const: "quarantined" }, message: s },
    ["id", "state", "message"],
  ),
  InvitationCreated: object({ id: s, previewLinks: array(s) }, ["id"]),
  PrivacyCreated: object(
    { id: s, reference: s, state: { const: "received" } },
    ["id", "reference", "state"],
  ),
  PrivacyReviewed: object({ ok: { const: true }, notice: s }, ["ok", "notice"]),
  FeedbackReceipt: object(
    { ok: { const: true }, published: { const: false } },
    ["ok", "published"],
  ),
  PasswordChanged: object(
    { ok: { const: true }, signInAgain: { const: true } },
    ["ok", "signInAgain"],
  ),
  ClassificationReceipt: object(
    { ok: { const: true }, originalSubmissionPreserved: { const: true } },
    ["ok", "originalSubmissionPreserved"],
  ),
  AcceptanceReceipt: object(
    { ok: { const: true }, bookingConfirmed: { const: false } },
    ["ok", "bookingConfirmed"],
  ),
  InquiryReceipt: object(
    {
      reference: s,
      createdAt: dateTime,
      deliveryStatus: {
        enum: [
          "preview_local_only",
          "saved_for_review",
          "email_sent",
          "email_failed",
        ],
      },
      previewClaimPath: {
        type: "string",
        description:
          "Preview-only synthetic testing; never returned in production.",
      },
    },
    ["reference", "createdAt", "deliveryStatus"],
  ),
  AccountLinkResponse: object({ message: s, preview: b, previewLink: s }, [
    "message",
  ]),
  Principal: object(
    {
      id: s,
      email: s,
      name: s,
      roles: array(s),
      departments: array(s),
      authority: object({
        quotation: b,
        pricing: b,
        booking: b,
        maxQuotationMinor: integer,
        maxDiscountBps: integer,
      }),
      verified: b,
      mfa: b,
    },
    ["id", "email", "name", "roles", "departments"],
  ),
  Session: object(
    {
      user: nullable(ref("Principal")),
      mfaPending: b,
      preview: b,
      accountsConfigured: b,
    },
    ["user", "preview"],
  ),
  LoginResponse: object({ ok: b, mfaRequired: b, setupRequired: b }, [
    "ok",
    "mfaRequired",
  ]),
  MfaSetup: object({ secret: s, uri: s }, ["secret", "uri"]),
  PublicContent: object(
    {
      id: s,
      type: s,
      slug: s,
      data: {
        type: "object",
        additionalProperties: true,
        description:
          "Published bilingual content. Internal source/rights/client permission evidence is removed. Editorial data is validated by the type-specific schema in lib/platform-cms.ts.",
      },
      publishedAt: dateTime,
      revisionId: s,
      version: integer,
    },
    ["id", "type", "slug", "data", "revisionId", "version"],
  ),
  ContentItems: object({ items: array(ref("PublicContent")) }, ["items"]),
  PublicBundle: object(
    {
      catalog: array({
        type: "object",
        description:
          "Published bilingual service data; no internal rights evidence.",
      }),
      profile: {
        type: "object",
        description: "Centrally managed public company identity/contact data.",
      },
      content: array(ref("PublicContent")),
    },
    ["catalog", "profile", "content"],
  ),
  Work: object(
    {
      inquiry_id: s,
      customer_id: nullable(s),
      department: s,
      version: integer,
      assigned_to: nullable(s),
      priority: s,
      next_action: s,
      due_at: nullable(dateTime),
      qualification: s,
      qualified_at: nullable(dateTime),
      classification_json: nullable(s),
      updated_at: dateTime,
      assessment_json: nullable(s),
      outcome: s,
      outcome_at: nullable(dateTime),
    },
    ["inquiry_id", "version"],
  ),
  InquiryRecord: {
    allOf: [
      ref("Inquiry"),
      object(
        {
          id: s,
          reference: s,
          status: s,
          createdAt: dateTime,
          updatedAt: dateTime,
          work: ref("Work"),
        },
        ["id", "reference", "status"],
      ),
    ],
  },
  QuoteSnapshot: object(
    {
      scope: s,
      terms: s,
      expiresOn: { type: "string", format: "date" },
      currency: { const: "TZS" },
      items: array({
        type: "object",
        description:
          "Immutable calculated line; input fields plus unitMinor, quantityMilli, netMinor, taxMinor, totalMinor and discountMinor.",
        additionalProperties: true,
      }),
      subtotalMinor: integer,
      taxMinor: integer,
      discountMinor: integer,
      totalMinor: integer,
      discountBps: integer,
      departments: array(s),
      customer: object({ name: s, email: s, organization: s }),
      inquiryReference: s,
    },
    ["scope", "terms", "expiresOn", "currency", "items", "totalMinor"],
  ),
  QuoteRecord: object(
    {
      id: s,
      quotation_id: s,
      reference: s,
      inquiry_id: s,
      version: integer,
      current_version: integer,
      status: s,
      issued_at: nullable(dateTime),
      accepted_at: nullable(dateTime),
      snapshot: ref("QuoteSnapshot"),
      acceptance_terms: nullable(s),
      author_id: s,
      technical_by: nullable(s),
      finance_by: nullable(s),
      approved_by: nullable(s),
      accepted_by: nullable(s),
      created_at: dateTime,
    },
    ["id", "reference", "version", "status", "snapshot"],
  ),
  BookingRecord: object(
    {
      id: s,
      reference: s,
      quotation_version_id: s,
      inquiry_id: s,
      status: s,
      starts_at: dateTime,
      ends_at: dateTime,
      version: integer,
      supervisor_id: nullable(s),
      team: s,
      conditions_json: s,
      confirmed_by: nullable(s),
      created_at: dateTime,
    },
    ["id", "reference", "status"],
  ),
  VisitRecord: object(
    {
      id: s,
      booking_id: s,
      starts_at: dateTime,
      checklist: array(object({ label: s, done: b })),
      supervisor_id: nullable(s),
      team: s,
      issues: s,
      reviewed_by: nullable(s),
      completed_at: nullable(dateTime),
      status: s,
      version: integer,
    },
    ["id", "booking_id", "status"],
  ),
  ProjectRecord: object(
    {
      id: s,
      booking_id: s,
      inquiry_id: s,
      title: s,
      department: s,
      version: integer,
      milestones: array(
        object({
          label: s,
          complete: b,
          completedAt: nullable(dateTime),
          publicUpdate: s,
          evidence: s,
          by: s,
        }),
      ),
    },
    ["id", "milestones"],
  ),
  Document: object(
    {
      id: s,
      name: s,
      inquiry_id: nullable(s),
      department: s,
      mime: s,
      size: integer,
      scan_state: { enum: ["quarantined", "clean", "rejected"] },
      visibility: s,
      created_at: dateTime,
    },
    ["id", "name", "scan_state"],
  ),
  Documents: object({ documents: array(ref("Document")) }, ["documents"]),
  InquiryDetail: object(
    {
      inquiry: ref("InquiryRecord"),
      work: ref("Work"),
      messages: array(ref("MessageRecord")),
      documents: array(ref("Document")),
    },
    ["inquiry", "work", "messages", "documents"],
  ),
  Report: object(
    Object.fromEntries([
      ...["asOf", "period", "notice"].map((k) => [k, s]),
      ...[
        "inquiries",
        "qualifiedInquiries",
        "lostOpportunities",
        "pendingApprovals",
        "issuedVersions",
        "acceptedVersions",
        "confirmedBookings",
        "quotedMinor",
        "confirmedBookingMinor",
        "lostOffers",
        "overdueFollowups",
      ].map((k) => [k, integer]),
      ...[
        "acceptanceRate",
        "bookingConversion",
        "qualifiedIssuanceRate",
        "qualifiedBookingConversion",
        "averageResponseHours",
        "averageQualifiedQuotationTurnaroundHours",
        "averageQuotationTurnaroundHours",
      ].map((k) => [k, nullable(n)]),
      ["filters", ref("ReportFilters")],
      ["invoicedMinor", { type: "null" }],
      ["collectedMinor", { type: "null" }],
      ["byDivision", { type: "object", additionalProperties: integer }],
      [
        "metricCoverage",
        object({
          respondedInquiries: integer,
          qualifiedIssuedInquiries: integer,
        }),
      ],
    ]),
  ),
  Workspace: object(
    {
      user: ref("Principal"),
      capabilities: { type: "object", additionalProperties: b },
      preview: b,
      inquiries: array(ref("InquiryRecord")),
      quotations: array(ref("QuoteRecord")),
      bookings: array(ref("BookingRecord")),
      visits: array(ref("VisitRecord")),
      projects: array(ref("ProjectRecord")),
      profile: { type: "object" },
      report: ref("Report"),
      content: array({ type: "object" }),
      resources: array({ type: "object" }),
      suppliers: array(ref("SupplierRecord")),
      audit: array({ type: "object" }),
      privacyRequests: array(ref("PrivacyRequestRecord")),
      directory: array(
        object({ id: s, name: s, roles: array(s), departments: array(s) }),
      ),
      users: array(
        object({
          id: s,
          email: s,
          name: s,
          roles: array(s),
          departments: array(s),
          authority: { type: "object" },
          state: s,
          verified_at: nullable(dateTime),
          mfa_enabled: integer,
          created_at: dateTime,
        }),
      ),
      priceBooks: array({ type: "object" }),
      media: array(ref("Document")),
      privacyQueue: array(ref("PrivacyRequestRecord")),
      operationSettings: object({
        version: integer,
        quotationReminderDays: integer,
        followupReminderHours: integer,
        customerExpiryReminders: b,
      }),
      workerRuns: array(
        object({
          id: s,
          started_at: dateTime,
          finished_at: nullable(dateTime),
          state: s,
          summary: nullable(s),
        }),
      ),
      notifications: array(
        object({
          id: s,
          dedup_key: s,
          state: s,
          attempts: integer,
          last_error: nullable(s),
          created_at: dateTime,
          sent_at: nullable(dateTime),
        }),
      ),
      settings: object({
        smtpConfigured: b,
        aiConfigured: b,
        malwareScannerConfigured: b,
        paymentConfigured: { const: false },
        messagingConfigured: { const: false },
        analyticsConfigured: { const: false },
        storage: s,
        preview: b,
      }),
    },
    [
      "user",
      "inquiries",
      "quotations",
      "bookings",
      "visits",
      "projects",
      "preview",
    ],
  ),
  Portal: closedObject(
    {
      user: ref("Principal"),
      capabilities: { type: "object", additionalProperties: b },
      preview: b,
      privacyRequests: array(ref("PrivacyRequestRecord")),
      inquiries: array(ref("CustomerInquiry")),
      quotations: array(ref("CustomerQuote")),
      bookings: array(ref("CustomerBooking")),
      visits: array(ref("CustomerVisit")),
      projects: array(ref("CustomerProject")),
      profile: { type: "object" },
    },
    [
      "user",
      "capabilities",
      "preview",
      "privacyRequests",
      "inquiries",
      "quotations",
      "bookings",
      "visits",
      "projects",
      "profile",
    ],
  ),
  DraftResponse: object(
    {
      draft: nullable(
        object({
          data: ref("DraftData"),
          step: integer,
          version: integer,
          updated_at: dateTime,
          retentionDays: { const: 30 },
        }),
      ),
    },
    ["draft"],
  ),
  AuditPage: object(
    {
      items: array(
        object({
          id: s,
          actor_id: s,
          actor_name: nullable(s),
          action: s,
          target_type: s,
          target_id: s,
          reason: s,
          before_json: nullable(s),
          after_json: nullable(s),
          created_at: dateTime,
        }),
      ),
      total: integer,
      offset: integer,
      limit: integer,
    },
    ["items", "total", "offset", "limit"],
  ),
  AssistantOutput: object(
    {
      mode: s,
      aiUsed: b,
      answer: s,
      sources: array(
        object({ id: s, title: s, href: s, revisionId: s, version: integer }),
      ),
      recommendedServices: array(s),
      missingFields: array(s),
      requiresCustomerReview: b,
      requiresHumanReview: b,
      submitted: { const: false },
      saved: { const: false },
      pricingAuthorized: { const: false },
      scope: s,
      approvedRateReferences: array(
        object({
          priceRuleId: s,
          description: s,
          department: s,
          effectiveTo: dateTime,
        }),
      ),
      draft: { oneOf: [s, { type: "object" }] },
      sourceInquiryId: s,
      primaryService: nullable(s),
      additionalServices: array(s),
      urgency: s,
      nextAction: s,
      published: { const: false },
      contact: s,
      metrics: ref("Report"),
      disclosure: s,
      notice: s,
    },
    ["mode", "aiUsed"],
  ),
  Pricing: object(
    {
      options: array(
        object({
          bookId: s,
          id: s,
          description: s,
          unit: s,
          unitPrice: s,
          taxBps: integer,
          taxInclusive: b,
          department: s,
          effectiveTo: dateTime,
          public: { const: true },
        }),
      ),
      nonbinding: { const: true },
    },
    ["options", "nonbinding"],
  ),
  Estimate: object(
    {
      currency: { const: "TZS" },
      nonbinding: { const: true },
      items: array({ type: "object" }),
      subtotalMinor: integer,
      taxMinor: integer,
      totalMinor: integer,
      discountMinor: integer,
      notice: s,
    },
    ["currency", "nonbinding", "totalMinor"],
  ),
  Equipment: object(
    {
      items: array(
        object({ id: s, name: s, department: s, category: s, ownership: s }),
      ),
      notice: s,
    },
    ["items", "notice"],
  ),
  MessageRecord: object(
    {
      id: s,
      inquiry_id: s,
      author_id: s,
      author: nullable(s),
      body: s,
      visibility: { enum: ["customer", "internal"] },
      created_at: dateTime,
    },
    ["id", "body", "visibility", "created_at"],
  ),
  PrivacyRequestRecord: object(
    {
      id: s,
      reference: s,
      user_id: s,
      category: s,
      details: s,
      state: s,
      resolution: s,
      version: integer,
      created_at: dateTime,
      updated_at: dateTime,
      name: s,
      email: s,
    },
    ["id", "reference", "state", "version"],
  ),
  CustomerWork: closedObject(
    {
      inquiry_id: s,
      customer_id: nullable(s),
      department: s,
      assigned_to: { type: "null" },
      priority: { const: "normal" },
      next_action: s,
      due_at: { type: "null" },
      version: integer,
      updated_at: dateTime,
    },
    [
      "inquiry_id",
      "customer_id",
      "department",
      "assigned_to",
      "priority",
      "next_action",
      "due_at",
      "version",
      "updated_at",
    ],
  ),
  CustomerInquiry: {
    allOf: [
      ref("Inquiry"),
      object(
        {
          id: s,
          reference: s,
          status: s,
          createdAt: dateTime,
          updatedAt: dateTime,
          work: ref("CustomerWork"),
          messages: array(ref("MessageRecord")),
          documents: array(ref("Document")),
        },
        ["id", "reference", "status", "work"],
      ),
    ],
  },
  CustomerLine: closedObject(
    {
      description: s,
      quantity: s,
      unit: s,
      unitPrice: s,
      taxBps: integer,
      taxInclusive: b,
      department: s,
      unitMinor: integer,
      quantityMilli: integer,
      netMinor: integer,
      taxMinor: integer,
      totalMinor: integer,
      discountMinor: integer,
    },
    [
      "description",
      "quantity",
      "unit",
      "unitPrice",
      "department",
      "totalMinor",
    ],
  ),
  CustomerSnapshot: closedObject(
    {
      currency: { const: "TZS" },
      scope: s,
      terms: s,
      expiresOn: { type: "string", format: "date" },
      company: { type: "object" },
      customer: object({ name: s, email: s, organization: s }),
      inquiryReference: s,
      departments: array(s),
      createdAt: dateTime,
      discountBps: integer,
      subtotalMinor: integer,
      taxMinor: integer,
      discountMinor: integer,
      totalMinor: integer,
      items: array(ref("CustomerLine")),
    },
    ["scope", "terms", "expiresOn", "currency", "items", "totalMinor"],
  ),
  CustomerQuote: closedObject(
    {
      id: s,
      quotation_id: s,
      reference: s,
      inquiry_id: s,
      version: integer,
      current_version: integer,
      status: s,
      issued_at: dateTime,
      accepted_at: nullable(dateTime),
      acceptance_terms: nullable(s),
      created_at: dateTime,
      snapshot: ref("CustomerSnapshot"),
    },
    ["id", "reference", "version", "status", "issued_at", "snapshot"],
  ),
  CustomerBooking: closedObject(
    {
      id: s,
      reference: s,
      quotation_version_id: s,
      inquiry_id: s,
      status: s,
      starts_at: dateTime,
      ends_at: dateTime,
      version: integer,
      created_at: dateTime,
    },
    ["id", "reference", "status", "starts_at", "ends_at"],
  ),
  CustomerVisit: closedObject(
    {
      id: s,
      booking_id: s,
      starts_at: dateTime,
      checklist: array(object({ label: s, done: b })),
      status: s,
      completed_at: nullable(dateTime),
      version: integer,
    },
    ["id", "booking_id", "status"],
  ),
  CustomerProject: closedObject(
    {
      id: s,
      booking_id: s,
      inquiry_id: s,
      title: s,
      department: s,
      version: integer,
      created_at: dateTime,
      milestones: array(
        closedObject(
          {
            label: s,
            complete: b,
            completedAt: nullable(dateTime),
            publicUpdate: s,
          },
          ["label", "complete"],
        ),
      ),
    },
    ["id", "milestones"],
  ),
  DataExport: closedObject(
    {
      generatedAt: dateTime,
      savedDraft: {
        anyOf: [
          { type: "null" },
          { $ref: "#/components/schemas/DraftResponse/properties/draft" },
        ],
      },
      account: closedObject(
        { id: s, name: s, email: s, profile: { type: "object" } },
        ["id", "name", "email", "profile"],
      ),
      inquiries: array(ref("CustomerInquiry")),
      quotations: array(ref("CustomerQuote")),
      bookings: array(ref("CustomerBooking")),
      visits: array(ref("CustomerVisit")),
      projects: array(ref("CustomerProject")),
      feedback: array(
        object({
          inquiry_id: s,
          rating: integer,
          body: s,
          created_at: dateTime,
        }),
      ),
      privacyRequests: array(ref("PrivacyRequestRecord")),
      notice: s,
    },
    [
      "generatedAt",
      "savedDraft",
      "account",
      "inquiries",
      "quotations",
      "bookings",
      "visits",
      "projects",
      "feedback",
      "privacyRequests",
      "notice",
    ],
  ),
  LegacyInquiries: object({ inquiries: array(ref("InquiryRecord")) }, [
    "inquiries",
  ]),
  LegacyStatusReceipt: object({ inquiry: ref("InquiryRecord") }, ["inquiry"]),
  Suppliers: object({ items: array(ref("SupplierRecord")) }, ["items"]),
});
const paths: Record<string, Record<string, unknown>> = {};
function operation(
  path: string,
  method: "get" | "post" | "patch",
  summary: string,
  permission: string,
  response = "Ok",
  request?: string,
  status = 200,
  publicAccess = false,
  parameters: S[] = [],
) {
  const errors = Object.fromEntries(
    [400, 401, 403, 404, 409, 413, 422, 429, 500, 503].map((code) => [
      code,
      {
        description: (
          {
            400: "Malformed request",
            401: "Verified sign-in/MFA required",
            403: "Role, department, ownership, independence or origin denied",
            404: "Not found",
            409: "Version/state/resource conflict",
            413: "Body or file too large",
            422: "Schema or business validation failed",
            429: "Rate/usage limit",
            500: "Unexpected failure; use saved reference and verify before retry",
            503: "Dependency not enabled or unavailable",
          } as Record<number, string>
        )[code],
        content: { "application/json": { schema: ref("Error") } },
      },
    ]),
  );
  const op: S = {
    summary,
    description: permission,
    operationId: `${method}_${path.replace(/[^a-z0-9]+/gi, "_")}`,
    tags: [
      path.includes("/admin/")
        ? "Staff"
        : path.includes("/auth/")
          ? "Identity"
          : "Platform",
    ],
    security: publicAccess ? [] : [{ accountSession: [] }],
    parameters,
    responses: {
      ...errors,
      [status]: {
        description:
          "Successful operation; notification acceptance is not mailbox receipt; an inquiry/acceptance is never a booking.",
        content: { "application/json": { schema: ref(response) } },
      },
    },
  };
  if (request)
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: ref(request) } },
    };
  paths[path] ??= {};
  paths[path][method] = op;
}
const query = (name: string, schema: S, description: string): S => ({
  name,
  in: "query",
  schema,
  description,
  required: false,
});
const idParam: S = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};
operation(
  "/api/inquiries",
  "post",
  "Save a contact or five-division quotation inquiry",
  "Public; 24 KiB JSON, honeypot, origin and per-instance rate limits. Required fields are conditional on service; see lib/inquiry.ts and service-fields.ts. Saves inquiry/routing/claim/ack/staff outbox atomically, then attempts fixed-recipient staff SMTP. Never resubmit just because notification failed.",
  "InquiryReceipt",
  "Inquiry",
  201,
  true,
  [
    {
      name: "Idempotency-Key",
      in: "header",
      required: false,
      schema: { type: "string", pattern: "^[a-zA-Z0-9_-]{16,128}$" },
      description:
        "Strongly recommended. Reuse for identical retries; changed validated payload returns 409. Exact replay returns the saved receipt and Idempotency-Replayed:true.",
    },
  ],
);
const api = "/api/platform/";
operation(
  api + "health",
  "get",
  "Database/application liveness",
  "Public; no customer information or secrets.",
  "Ok",
  undefined,
  200,
  true,
);
(paths[api + "health"].get as S).responses = {
  200: {
    description: "Database query succeeded",
    content: {
      "application/json": {
        schema: object({ status: { const: "ok" } }, ["status"]),
      },
    },
  },
  500: {
    description: "Health check failed",
    content: { "application/json": { schema: ref("Error") } },
  },
};
operation(
  api + "auth/session",
  "get",
  "Read session and MFA/preview state",
  "Public; staff identity is withheld before completed MFA.",
  "Session",
  undefined,
  200,
  true,
);
operation(
  api + "public",
  "get",
  "Read public site configuration and published catalogue",
  "Public. Source/evidence fields are removed; this is not a private workspace export.",
  "PublicBundle",
  undefined,
  200,
  true,
);
operation(
  api + "content",
  "get",
  "List only published public content",
  "Public; internal permission/source evidence is removed. Unpublishing removes the item and associated service content immediately.",
  "ContentItems",
  undefined,
  200,
  true,
  [query("type", s, "Optional CMS type")],
);
operation(
  api + "pricing",
  "get",
  "List current approved public rate rules",
  "Public; no internal books, expired rules or unpublished divisions.",
  "Pricing",
  undefined,
  200,
  true,
);
operation(
  api + "equipment",
  "get",
  "Read approved public equipment catalogue",
  "Public; excludes quantity, personnel, location, supplier contacts and condition notes. Not date-specific availability.",
  "Equipment",
  undefined,
  200,
  true,
);
for (const [route, response, description] of [
  [
    "workspace",
    "Workspace",
    "Staff account; module, department and delegated capabilities determine returned records.",
  ],
  [
    "portal",
    "Portal",
    "Verified account; own records only, irrespective of staff roles.",
  ],
  [
    "auth/inquiry-draft",
    "DraftResponse",
    "Verified account's own incomplete draft; expired drafts return null.",
  ],
  [
    "reports",
    "Report",
    "reports.read; department-scoped EAT inquiry-created cohort, current outcomes. No invoices/payments connected.",
  ],
  [
    "audit",
    "AuditPage",
    "audit.read; non-administrators only see authorized record targets. Filtering occurs before pagination.",
  ],
  [
    "suppliers",
    "Suppliers",
    "supplier.read; department-scoped confidential supplier records.",
  ],
  [
    "company-documents",
    "Documents",
    "content.edit; company assets restricted by department.",
  ],
] as const) {
  let params: S[] = [];
  if (route === "reports")
    params = [
      query(
        "from",
        { type: "string", format: "date" },
        "Inclusive EAT inquiry-created date",
      ),
      query(
        "to",
        { type: "string", format: "date" },
        "Inclusive EAT inquiry-created date",
      ),
      query("division", s, "Authorized division"),
    ];
  if (route === "audit")
    params = [
      ...["from", "to", "actor", "action", "target", "search"].map((k) =>
        query(
          k,
          s,
          k === "from" || k === "to"
            ? "UTC date boundary"
            : "Case-insensitive authorized-history filter",
        ),
      ),
      query("offset", { type: "integer", minimum: 0 }, "Default 0"),
      query(
        "limit",
        { type: "integer", minimum: 1, maximum: 100 },
        "Default 50",
      ),
    ];
  operation(
    api + route,
    "get",
    `Read ${route}`,
    description,
    response,
    undefined,
    200,
    false,
    params,
  );
}

operation(
  api + "inquiries/{id}",
  "get",
  "Read inquiry, messages and approved document metadata",
  "Owner or permitted department. Customers cannot see internal messages or documents.",
  "InquiryDetail",
  undefined,
  200,
  false,
  [idParam],
);
operation(
  api + "content/{id}/history",
  "get",
  "Read content revision history",
  "content.edit for the item's department, with separate corporate-editorial access.",
  "RevisionHistory",
  undefined,
  200,
  false,
  [idParam],
);
const binary = (
  route: string,
  mime: string,
  description: string,
  publicAccess = false,
) => {
  operation(
    api + route,
    "get",
    "Download protected/published file",
    description,
    "Ok",
    undefined,
    200,
    publicAccess,
    route.includes("{id}") ? [idParam] : [],
  );
  const op = paths[api + route].get as S;
  op.responses = {
    ...(op.responses as S),
    200: {
      description,
      headers: {
        "Content-Disposition": {
          description:
            "Attachment for documents, PDFs and owned JSON export; images may be inline.",
          schema: s,
        },
      },
      content: {
        [mime]: {
          schema:
            mime === "application/json"
              ? ref("DataExport")
              : { type: "string", format: "binary" },
        },
      },
    },
    423: {
      description: "File quarantined or rejected",
      content: { "application/json": { schema: ref("Error") } },
    },
  };
};
binary(
  "auth/data-export",
  "application/json",
  "Owned customer records only, with explicit private-field exclusion; not a general staff export.",
);
binary(
  "documents/{id}",
  "application/octet-stream",
  "Owner/department access; clean scanner result and checksum required.",
);
binary(
  "company-media/{id}",
  "image/webp",
  "Scoped editor access, clean scan and checksum required.",
);
binary(
  "quotations/{id}/pdf",
  "application/pdf",
  "Owner receives issued versions only. Generated from the immutable exact-version snapshot; excludes private notes.",
);
binary(
  "public-documents/{id}",
  "application/pdf",
  "Only clean files referenced by currently published approved document content.",
  true,
);
binary(
  "public-media/{id}",
  "image/webp",
  "Only clean images referenced by currently published approved content.",
  true,
);
const posts: [string, string, string, string, number, boolean, string][] = [
  [
    "auth/register",
    "Registration",
    "AccountLinkResponse",
    "Prepare verified customer registration",
    202,
    true,
    "Public. Enumeration-resistant response. Verification email queued; preview links only in preview.",
  ],
  [
    "auth/login",
    "Login",
    "LoginResponse",
    "Password sign-in",
    200,
    true,
    "Staff receive a ten-minute pending-MFA session, not privileged access. Customers require verified email.",
  ],
  [
    "auth/logout",
    "Empty",
    "Ok",
    "Revoke current session",
    200,
    true,
    "Revokes session and expires cookie.",
  ],
  [
    "auth/verify",
    "Token",
    "Ok",
    "Consume one-use email verification",
    200,
    true,
    "Hashed token, one-hour expiry.",
  ],
  [
    "auth/reset-request",
    "Email",
    "AccountLinkResponse",
    "Request password reset",
    202,
    true,
    "Enumeration-resistant. Queues one-use one-hour reset link.",
  ],
  [
    "auth/resend",
    "Email",
    "AccountLinkResponse",
    "Resend email verification",
    202,
    true,
    "Enumeration-resistant response.",
  ],
  [
    "auth/reset",
    "PasswordReset",
    "Ok",
    "Consume password reset",
    200,
    true,
    "Revokes account sessions; staff still require MFA.",
  ],
  [
    "auth/mfa-setup",
    "Empty",
    "MfaSetup",
    "Enroll staff authenticator",
    200,
    false,
    "Pending password-authenticated staff session allowed; encrypted TOTP secret; keep result private.",
  ],
  [
    "auth/mfa-verify",
    "MfaCode",
    "Ok",
    "Verify staff TOTP",
    200,
    false,
    "Pending staff session; six digits, 30-second step, replay protection. Replaces pending cookie with MFA-verified session.",
  ],
  [
    "inquiries/claim-link",
    "ClaimLink",
    "AccountLinkResponse",
    "Request secure inquiry-claim link",
    202,
    true,
    "One-use seven-day token sent only to original inquiry email; reference alone grants no access.",
  ],
  [
    "inquiries/claim",
    "Token",
    "ReferenceReceipt",
    "Claim inquiry into verified account",
    200,
    false,
    "Verified matching account email and valid unused claim token.",
  ],
  [
    "estimates",
    "EstimateRequest",
    "Estimate",
    "Calculate nonbinding estimate",
    200,
    true,
    "Server re-resolves current approved public rules; fixed-point math. No booking, offer or price promise.",
  ],
  [
    "assistant",
    "AssistantInput",
    "AssistantOutput",
    "Governed assistance gateway",
    200,
    true,
    "Public chat/recommend/inquiry-draft/portfolio retrieve published sources. Other modules require scoped staff permissions. No automatic record creation, pricing, publication or commercial approval. Disabled/unavailable providers fall back safely; content generation returns 503 when disabled.",
  ],
  [
    "auth/inquiry-draft",
    "AccountDraftSave",
    "DraftSaved",
    "Save owned incomplete inquiry draft",
    200,
    false,
    "Expected version 0 for no live draft. Thirty-day expiry. Consent must be false; partial contact text allowed.",
  ],
  [
    "auth/inquiry-draft/delete",
    "DraftDelete",
    "Ok",
    "Delete owned saved draft",
    200,
    false,
    "Optimistic version; never deletes submitted inquiries.",
  ],
  [
    "privacy-requests",
    "PrivacyRequest",
    "PrivacyCreated",
    "Create owned data-rights request",
    201,
    false,
    "Manual identity-attested legal review; no automatic erasure.",
  ],
  [
    "admin/privacy/action",
    "PrivacyAction",
    "PrivacyReviewed",
    "Review data-rights request",
    200,
    false,
    "settings.manage; identity attestation, version, decision and evidence.",
  ],
  [
    "messages",
    "Message",
    "Created",
    "Send message or internal note",
    201,
    false,
    "Owner can send customer messages only. Staff need inquiry.edit for the record. Notifications omit message contents.",
  ],
  [
    "feedback",
    "Feedback",
    "FeedbackReceipt",
    "Record private post-service feedback",
    201,
    false,
    "Owner; completed booking required; not published as a testimonial.",
  ],
  [
    "auth/profile",
    "Profile",
    "Ok",
    "Update own profile",
    200,
    false,
    "Identity/ownership unchanged.",
  ],
  [
    "auth/password",
    "PasswordChange",
    "PasswordChanged",
    "Change own password and revoke sessions",
    200,
    false,
    "Current password required.",
  ],
  [
    "admin/inquiries",
    "Assignment",
    "Ok",
    "Assign inquiry and follow-up",
    200,
    false,
    "inquiry.edit, valid scoped staff assignee, expected work version and legal status transition.",
  ],
  [
    "admin/inquiries/classification",
    "Classification",
    "ClassificationReceipt",
    "Correct service classification",
    200,
    false,
    "Reviewed correction preserves original submission; requires all affected scope and no live offers/active bookings.",
  ],
  [
    "admin/inquiries/assessment",
    "Assessment",
    "Ok",
    "Record reviewed qualification/outcome",
    200,
    false,
    "inquiry.edit; qualification requires three human attestations. Won requires authorized booking; lost cannot contradict confirmed work.",
  ],
  [
    "admin/content",
    "ContentSave",
    "ContentSaved",
    "Save revision without replacing live content",
    201,
    false,
    "content.edit and department; type-specific bilingual structured data validation. Existing live revision remains unchanged.",
  ],
  [
    "admin/content/action",
    "PublicationAction",
    "Ok",
    "Submit, approve, publish, restore or withdraw content",
    200,
    false,
    "Independent publisher approval; evidence/rights gates; version checks; scheduling/expiry. Drafting does not confer publishing authority.",
  ],
  [
    "admin/quotations",
    "QuotationDraft",
    "QuotationCreated",
    "Prepare immutable quotation version",
    201,
    false,
    "quotation.edit; server calculations; approved rule provenance or explained manual proposal; current routing consistency.",
  ],
  [
    "admin/quotations/action",
    "QuotationAction",
    "Ok",
    "Review or issue quotation version",
    200,
    false,
    "Author cannot approve self. Separate scoped technical reviews, finance review and delegated final approval. Current limits rechecked at issuance.",
  ],
  [
    "quotations/accept",
    "AcceptQuotation",
    "AcceptanceReceipt",
    "Accept exact current issued offer",
    200,
    false,
    "Owner only; exact version, validity and terms confirmation; acceptance is not booking.",
  ],
  [
    "quotations/decline",
    "Decline",
    "Ok",
    "Decline current issued offer",
    200,
    false,
    "Owner only; reason retained.",
  ],
  [
    "admin/pricing",
    "PriceBookProposal",
    "Created",
    "Propose versioned price book",
    201,
    false,
    "pricing.edit; effective dates/rules validated. No invented automatic rates.",
  ],
  [
    "admin/pricing/approve",
    "ApprovePriceBook",
    "Ok",
    "Independently approve price book",
    200,
    false,
    "pricing.approve delegated finance authority, different author.",
  ],
  [
    "admin/resources",
    "ResourceSave",
    "Created",
    "Save versioned resource record",
    201,
    false,
    "resource.manage; old/new scope; no active allocations while changing. resource.publish delegation and evidence required for catalogue display.",
  ],
  [
    "admin/suppliers",
    "SupplierSave",
    "Created",
    "Save supplier proposal",
    201,
    false,
    "supplier.manage; scope/version checks; editing clears approval; no active allocation edits.",
  ],
  [
    "admin/suppliers/action",
    "SupplierAction",
    "Ok",
    "Approve or suspend supplier arrangement",
    200,
    false,
    "supplier.approve; independent operations authority and future approval expiry. Contacts/evidence remain private.",
  ],
  [
    "admin/bookings",
    "BookingDraft",
    "BookingCreated",
    "Prepare pending booking",
    201,
    false,
    "booking.manage; current accepted offer, valid supervisor, bounded recurrence and resource scope. Does not reserve by itself.",
  ],
  [
    "admin/bookings/action",
    "BookingAction",
    "Ok",
    "Confirm, start, complete or cancel booking",
    200,
    false,
    "Confirmation requires delegated operations authority in every division, recorded conditions, safety checks, transactional capacity/maintenance and current supplier arrangements. Completion requires reviewed visits and ordered milestones.",
  ],
  [
    "admin/visits",
    "VisitAction",
    "Ok",
    "Record visit checklist and supervisor review",
    200,
    false,
    "booking.manage, expected version, confirmed booking, completed checklist and review evidence.",
  ],
  [
    "admin/projects/milestone",
    "Milestone",
    "Ok",
    "Complete next delivery gate",
    200,
    false,
    "project.edit; in-order completion; mandatory internal evidence, separately reviewed optional customer update.",
  ],
  [
    "admin/users/access",
    "AccessUpdate",
    "Ok",
    "Update roles, scope and delegated authority",
    200,
    false,
    "users.manage; no self privilege changes, preserves active administration, revokes affected sessions.",
  ],
  [
    "admin/users/invite",
    "Invite",
    "InvitationCreated",
    "Invite individual account",
    201,
    false,
    "users.manage; account starts as customer until explicitly assigned access; queued verification/reset links.",
  ],
  [
    "admin/users/reset-mfa",
    "MfaReset",
    "Ok",
    "Recover another staff authenticator",
    200,
    false,
    "users.manage; cannot reset own; identity verified and reason mandatory; sessions revoked.",
  ],
  [
    "admin/redirects",
    "Redirect",
    "Ok",
    "Save public permanent redirect",
    200,
    false,
    "content.publish; no chains or loops, target must be published.",
  ],
  [
    "admin/settings/operations",
    "SettingsUpdate",
    "Ok",
    "Change bounded reminder settings",
    200,
    false,
    "settings.manage; expected version/reason; never accepts secret configuration.",
  ],
  [
    "admin/jobs",
    "Empty",
    "BackgroundResult",
    "Manually run bounded background work",
    200,
    false,
    "settings.manage; scheduled deployment worker still required. Publishing, reminders, mail up to 25, scan up to 10, expired draft purge; heartbeat retained.",
  ],
];
for (const [
  route,
  request,
  response,
  summary,
  status,
  pub,
  description,
] of posts)
  operation(
    api + route,
    "post",
    summary,
    description,
    response,
    request,
    status,
    pub,
  );
operation(
  api + "documents/upload",
  "post",
  "Upload to private quarantine",
  "Owner for inquiry or scoped editor for company asset; 5 MiB, signature checks, image re-encoding, UUID storage key. No download or publication until scanner passes. Customers cannot create internal-only evidence.",
  "UploadReceipt",
  undefined,
  201,
  false,
  [
    query(
      "inquiryId",
      { type: "string", format: "uuid" },
      "Required for inquiry upload",
    ),
    query("scope", { enum: ["company"] }, "Company upload instead of inquiry"),
    query(
      "department",
      s,
      "Company scope; corporate editing requires editorial role",
    ),
    query("name", s, "Original filename, sanitized by server"),
    query(
      "visibility",
      { enum: ["customer", "internal"] },
      "Customer uploads must be customer-visible",
    ),
  ],
);
(paths[api + "documents/upload"].post as S).requestBody = {
  required: true,
  content: {
    "application/octet-stream": {
      schema: { type: "string", format: "binary", maxLength: 5242880 },
    },
  },
};
// Legacy inbox is intentionally unavailable in production; document its retained preview contract.
for (const [route, method, request] of [
  ["/api/staff/inquiries", "get", undefined],
  ["/api/staff/inquiries/{id}", "patch", "LegacyStatus"],
  ["/api/staff/login", "post", "LegacyLogin"],
  ["/api/staff/logout", "post", "Empty"],
] as const) {
  operation(
    route,
    method,
    "Legacy preview-only inbox",
    "Deprecated preview-only shared-password workflow. Use /admin and individual MFA accounts. Disabled in production.",
    route.endsWith("/{id}")
      ? "LegacyStatusReceipt"
      : method === "get"
        ? "LegacyInquiries"
        : "Ok",
    route.endsWith("logout") ? undefined : request,
    200,
    route.endsWith("login") || route.endsWith("logout"),
    route.endsWith("{id}") ? [idParam] : [],
  );
  (paths[route][method] as S).deprecated = true;
  if (method !== "post")
    (paths[route][method] as S).security = [{ legacyPreview: [] }];
}

const spec = {
  openapi: "3.1.0",
  info: {
    title: "TOC corporate and operations API",
    version: "2.0.0",
    description:
      "Implementation contract for the user-supplied 159-page November 2026 blueprint, including ICT and Cleaning. Same-origin cookie API, not an unauthenticated integration API. Platform and intake mutations validate Origin and are per-instance rate-limited. Retained legacy preview endpoints have their own documented limits. Staff require completed MFA, department access and explicit commercial delegation where stated. Money is integer minor units or input decimal strings; timestamps ISO UTC unless date-only. Error schemas and request schemas do not capture every stateful business rule; descriptions and source validation are authoritative. No payments/SMS/WhatsApp/HR integration is activated.",
  },
  servers: [
    { url: "/", description: "Same origin as the running Next.js application" },
  ],
  tags: [{ name: "Platform" }, { name: "Identity" }, { name: "Staff" }],
  paths,
  components: {
    securitySchemes: {
      legacyPreview: {
        type: "apiKey",
        in: "cookie",
        name: "toc_staff_session",
        description:
          "Deprecated preview-only signed inbox session. Unavailable in production.",
      },
      accountSession: {
        type: "apiKey",
        in: "cookie",
        name: "toc_account_session",
        description:
          "HTTP-only SameSite=Lax eight-hour verified session; ten-minute pending staff sessions only permit MFA operations. Secure in production.",
      },
    },
    schemas,
  },
};
const destination = process.argv[2] || "docs/openapi.json";
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(spec, null, 2) + "\n");
console.log(
  `OpenAPI written: ${Object.keys(paths).length} paths; ${Object.values(paths).reduce((sum, item) => sum + Object.keys(item).length, 0)} operations; ${Object.keys(schemas).length} schemas.`,
);
