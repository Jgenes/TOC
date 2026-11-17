import { z } from "zod";

export const serviceSlugs = [
  "event-management",
  "catering",
  "entertainment",
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
    guestCount: z.number().int().min(1).max(100000).optional(),
    preferences: z
      .array(z.string().trim().max(100))
      .max(15)
      .optional()
      .default([]),
    serviceStyle: z.string().trim().max(100).optional().default(""),
    dietary: z.string().trim().max(500).optional().default(""),
    budget: z.string().trim().max(80).optional().default(""),
    message: z.string().trim().max(3000).optional().default(""),
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
