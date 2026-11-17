import { z } from "zod";
import {
  additionalServiceOptions,
  divisionFields,
  divisionPreferenceOptions,
  eventTypeOptions,
  cateringStyleOptions,
  regions,
  inquiryDivisionFields,
} from "./service-fields";

export const serviceSlugs = [
  "event-management",
  "catering",
  "entertainment",
  "general-cleaning",
  "ict-solutions",
  "not-sure",
  "contact",
] as const;
export const inquiryStatuses = [
  "new",
  "in_review",
  "contacted",
  "closed",
] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];
export type InquiryDeliveryStatus =
  "preview_local_only" | "saved_for_review" | "email_sent" | "email_failed";

export function todayInTanzania() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const inquirySchema = z
  .object({
    origin: z.enum(["quotation", "contact"]),
    schemaVersion: z.literal(1).default(1),
    language: z.enum(["en", "sw"]).default("en"),
    privacyNoticeVersion: z.literal("2026-11-17").default("2026-11-17"),
    service: z.enum(serviceSlugs),
    name: z.string().trim().min(2, "Please enter your name.").max(100),
    organization: z.string().trim().max(150).optional().default(""),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .max(254),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+()\d\s.\-]*$/, "Please enter a valid telephone number.")
      .optional()
      .default(""),
    eventType: z.string().trim().max(100).optional().default(""),
    eventDate: z.string().max(10).optional().default(""),
    dateFlexible: z.boolean().optional().default(true),
    location: z.string().trim().max(200).optional().default(""),
    region: z.enum(regions).or(z.literal("")).default(""),
    alternativeDate: z.string().max(10).default(""),
    cateringRequired: z.enum(["yes", "no"]).or(z.literal("")).default(""),
    leadSource: z
      .enum(["search", "referral", "social", "returning", "other"])
      .or(z.literal(""))
      .default(""),
    guestCount: z.number().int().min(1).max(100000).optional(),
    pricingSelections: z
      .array(
        z
          .object({
            bookId: z.string().uuid(),
            ruleId: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(80),
            quantity: z
              .string()
              .regex(/^\d{1,7}(?:\.\d{1,3})?$/)
              .refine(
                (value) => Number(value) > 0 && Number(value) <= 1000000,
                "Use a quantity from 0.001 to 1,000,000.",
              ),
          })
          .strict(),
      )
      .max(20)
      .refine(
        (items) =>
          new Set(items.map((item) => `${item.bookId}:${item.ruleId}`)).size ===
          items.length,
        "Combine duplicate rate choices into one quantity.",
      )
      .default([]),
    preferences: z
      .array(z.string().trim().max(100))
      .max(15)
      .optional()
      .default([]),
    serviceStyle: z.string().trim().max(100).optional().default(""),
    dietary: z.string().trim().max(500).optional().default(""),
    budget: z.string().trim().max(80).optional().default(""),
    message: z.string().trim().max(3000).optional().default(""),
    additionalServices: z
      .array(z.enum(additionalServiceOptions))
      .max(5)
      .optional()
      .default([]),
    propertyType: z.string().trim().max(100).optional().default(""),
    area: z.string().trim().max(20).optional().default(""),
    floors: z.string().trim().max(10).optional().default(""),
    frequency: z.string().trim().max(30).optional().default(""),
    inspectionDate: z.string().max(10).optional().default(""),
    supplies: z.string().trim().max(30).optional().default(""),
    accessRestrictions: z.string().trim().max(1000).optional().default(""),
    ictCategory: z.string().trim().max(50).optional().default(""),
    existingSystem: z.string().trim().max(500).optional().default(""),
    affectedUsers: z.string().trim().max(10).optional().default(""),
    urgency: z.string().trim().max(30).optional().default(""),
    deliveryMode: z.string().trim().max(30).optional().default(""),
    consultation: z.string().trim().max(200).optional().default(""),
    eventDuration: z.string().trim().max(1000).optional().default(""),
    venueStatus: z.string().trim().max(1000).optional().default(""),
    eventLogistics: z.string().trim().max(1000).optional().default(""),
    mealTimes: z.string().trim().max(1000).optional().default(""),
    kitchenAccess: z.string().trim().max(1000).optional().default(""),
    cateringLogistics: z.string().trim().max(1000).optional().default(""),
    productionDuration: z.string().trim().max(1000).optional().default(""),
    powerAvailability: z.string().trim().max(1000).optional().default(""),
    productionSafety: z.string().trim().max(1000).optional().default(""),
    consent: z.literal(true, {
      error: "Please agree to the privacy notice.",
    }),
    website: z.string().max(0).optional().default(""),
  })
  .superRefine((value, context) => {
    if (value.origin === "quotation") {
      if (value.service === "contact")
        context.addIssue({
          code: "custom",
          path: ["service"],
          message: "Please choose a service.",
        });
      const eventService = [
        "event-management",
        "catering",
        "entertainment",
      ].includes(value.service);
      if (!value.region)
        context.addIssue({
          code: "custom",
          path: ["region"],
          message: "Please choose the service region or remote location.",
        });
      if (
        eventService &&
        !eventTypeOptions.some((option) => option.value === value.eventType)
      )
        context.addIssue({
          code: "custom",
          path: ["eventType"],
          message: "Please choose an approved occasion category.",
        });
      if (eventService && !value.guestCount)
        context.addIssue({
          code: "custom",
          path: ["guestCount"],
          message: "Please enter the approximate attendance or guest count.",
        });
      if (
        (value.service === "catering" ||
          (value.service === "event-management" &&
            value.cateringRequired === "yes")) &&
        !cateringStyleOptions.some(
          (option) => option.value === value.serviceStyle,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["serviceStyle"],
          message: "Choose a serving style or request guidance.",
        });
      if (value.alternativeDate && !isValidFutureDate(value.alternativeDate))
        context.addIssue({
          code: "custom",
          path: ["alternativeDate"],
          message:
            "Please choose a valid alternative date today or in the future.",
        });
      if (value.phone.replace(/\D/g, "").length < 7)
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Please enter a telephone number with at least 7 digits.",
        });
      if (value.location.length < 2)
        context.addIssue({
          code: "custom",
          path: ["location"],
          message: "Please tell us the planned location.",
        });
      if (!value.dateFlexible && !value.eventDate)
        context.addIssue({
          code: "custom",
          path: ["eventDate"],
          message: "Choose a date or select date to be confirmed.",
        });
    }
    if (value.origin === "quotation") {
      for (const field of inquiryDivisionFields(
        value.service,
        value.cateringRequired,
      )) {
        const raw = value[field.key as keyof typeof value];
        const text = typeof raw === "string" ? raw : "";
        const issue = (message: string) =>
          context.addIssue({ code: "custom", path: [field.key], message });
        if (field.required && !text)
          issue(`Please enter ${field.label.en.toLowerCase()}.`);
        if (
          text &&
          field.options &&
          !field.options.some((option) => option.value === text)
        )
          issue("Please select an available option.");
        if (
          text &&
          field.type === "number" &&
          (!/^\d+(?:\.\d{1,2})?$/.test(text) ||
            Number(text) <= 0 ||
            Number(text) > (field.max || 10000000) ||
            (field.key !== "area" && !Number.isInteger(Number(text))))
        )
          issue("Please enter a positive number within the supported range.");
        if (text && field.type === "date" && !isValidFutureDate(text))
          issue("Please choose a valid date today or in the future.");
      }
      const availablePreferences = divisionPreferenceOptions[value.service];
      if (
        availablePreferences &&
        ((!value.preferences.length &&
          ["general-cleaning", "catering", "entertainment"].includes(
            value.service,
          )) ||
          value.preferences.some(
            (item) =>
              !availablePreferences.some((option) => option.en === item),
          ))
      )
        context.addIssue({
          code: "custom",
          path: ["preferences"],
          message:
            "Select at least one listed requirement, or request guidance where offered.",
        });
      if (value.service === "ict-solutions" && value.message.length < 10)
        context.addIssue({
          code: "custom",
          path: ["message"],
          message:
            "Please describe your technical problem in at least 10 characters. Do not include credentials.",
        });
      if (
        new Set(value.additionalServices).size !==
          value.additionalServices.length ||
        value.additionalServices.includes(
          value.service as (typeof additionalServiceOptions)[number],
        )
      )
        context.addIssue({
          code: "custom",
          path: ["additionalServices"],
          message: "Please do not repeat additional services.",
        });
    }
    if (value.origin === "contact" && value.message.length < 10)
      context.addIssue({
        code: "custom",
        path: ["message"],
        message: "Please write a message of at least 10 characters.",
      });
    if (value.eventDate) {
      const parsed = new Date(`${value.eventDate}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value.eventDate
      )
        context.addIssue({
          code: "custom",
          path: ["eventDate"],
          message: "Please enter a valid date.",
        });
      else if (value.eventDate < todayInTanzania())
        context.addIssue({
          code: "custom",
          path: ["eventDate"],
          message: "Please choose today or a future date.",
        });
    }
  });
export type Inquiry = z.infer<typeof inquirySchema>;
export type StoredInquiry = Inquiry & {
  id: string;
  reference: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
};

const transitions: Record<InquiryStatus, InquiryStatus[]> = {
  new: ["in_review"],
  in_review: ["contacted", "closed"],
  contacted: ["in_review", "closed"],
  closed: ["in_review"],
};
export const canTransition = (from: InquiryStatus, to: InquiryStatus) =>
  from === to || transitions[from].includes(to);
export const nextStatuses = (from: InquiryStatus) => transitions[from];

export function isValidFutureDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= todayInTanzania()
  );
}
