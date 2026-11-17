// Shared request validators for transport-only endpoints. Domain validators live
// beside their business rules; both the route and OpenAPI generator use these.
import { z } from "zod";
import { resourceSchema } from "./platform-operations";
import { supplierSchema } from "./platform-suppliers";
import { operationalSettingsSchema } from "./platform-jobs";

const uuid = z.string().uuid();
const email = z.string().trim().email().max(254);
const reason = z.string().trim().min(10).max(2000);
const token = z.object({ token: z.string().max(100) });

export const platformInputs = {
  Login: z.object({ email, password: z.string().max(128) }),
  Token: token,
  Email: z.object({ email }),
  PasswordReset: token.extend({ password: z.string().min(12).max(128) }),
  MfaCode: z.object({ code: z.string().max(6) }),
  DraftDelete: z.object({ expectedVersion: z.number().int().min(0) }).strict(),
  ClaimLink: z.object({ reference: z.string().trim().max(100), email }),
  Feedback: z.object({
    inquiryId: uuid,
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().min(3).max(3000),
  }),
  Profile: z
    .object({
      name: z.string().trim().min(2).max(100),
      organization: z.string().trim().max(150),
      phone: z.string().trim().max(30),
      address: z.string().trim().max(250),
    })
    .strict(),
  PasswordChange: z.object({
    current: z.string().max(128),
    password: z.string().min(12).max(128),
  }),
  Decline: z.object({ id: uuid, reason }),
  ApprovePriceBook: z.object({ id: uuid, reason }),
  ResourceSave: z.object({
    id: uuid.optional(),
    expectedVersion: z.number().int().positive().optional(),
    resource: resourceSchema,
  }),
  SupplierSave: z
    .object({
      id: uuid.optional(),
      expectedVersion: z.number().int().positive().optional(),
      supplier: supplierSchema,
    })
    .strict(),
  Invite: z.object({ name: z.string().trim().min(2).max(100), email }),
  MfaReset: z.object({
    id: uuid,
    reason: z.string().trim().min(20).max(2000),
    identityVerified: z.literal(true),
  }),
  Redirect: z.object({
    from: z.string().regex(/^\/(?:news|projects|services)\/[a-z0-9-]+$/),
    to: z.string().regex(/^\/(?:news|projects|services)\/[a-z0-9-]+$/),
    // Preserve the existing untrimmed redirect-evidence validator.
    reason: z.string().min(10).max(2000),
  }),
  SettingsUpdate: z.object({
    settings: operationalSettingsSchema,
    expectedVersion: z.number().int().positive(),
    reason,
  }),
  EstimateRequest: z
    .object({
      items: z
        .array(
          z
            .object({
              bookId: uuid,
              ruleId: z.string().max(80),
              quantity: z.string().regex(/^\d{1,7}(?:\.\d{1,3})?$/),
            })
            .strict(),
        )
        .min(1)
        .max(20),
    })
    .strict(),
};
