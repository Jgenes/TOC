// Server-side only: imported by the inquiry API, never by a client component.
import nodemailer, {
  type SendMailOptions,
  type SMTPTransportOptions,
  type SMTPSentMessageInfo,
} from "nodemailer";
import { z } from "zod";
import { company, isPreview, services } from "./content";
import type { Inquiry, InquiryDeliveryStatus, StoredInquiry } from "./inquiry";

type Receipt = Pick<StoredInquiry, "reference" | "createdAt">;
type MailTransport = {
  sendMail(
    message: SendMailOptions,
  ): Promise<Pick<SMTPSentMessageInfo, "accepted">>;
};
type DeliveryOptions = {
  preview?: boolean;
  environment?: Readonly<Record<string, string | undefined>>;
  createTransport?: (config: SMTPTransportOptions) => MailTransport;
};

const smtpSchema = z.object({
  SMTP_HOST: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/)
    .default("mail.tocinvestment.co.tz"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_SECURE: z.enum(["true", "false"]).default("true"),
  SMTP_USER: z.string().trim().email().default(company.email),
  SMTP_PASS: z.string().min(1),
});

export function buildInquiryEmail(
  inquiry: Inquiry,
  receipt: Receipt,
  sender: string,
): SendMailOptions {
  const kind =
    inquiry.origin === "contact"
      ? "New contact message"
      : "New quotation request";
  const service =
    services.find((item) => item.slug === inquiry.service)?.title.en ||
    (inquiry.service === "contact"
      ? "General inquiry"
      : "Help choosing a service");
  const text = [
    company.name,
    kind,
    "",
    `Reference: ${receipt.reference}`,
    `Submitted (UTC): ${receipt.createdAt}`,
    `Form: ${inquiry.origin}`,
    `Service: ${service}`,
    "",
    "CONTACT DETAILS",
    `Name: ${inquiry.name}`,
    `Organization: ${inquiry.organization || "Not supplied"}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone || "Not supplied"}`,
    "",
    "EVENT / SERVICE DETAILS",
    `Event type: ${inquiry.eventType || "Not supplied"}`,
    `Preferred date: ${inquiry.eventDate || "To be confirmed"}`,
    `Date flexible / to be confirmed: ${inquiry.dateFlexible ? "Yes" : "No"}`,
    `Location: ${inquiry.location || "Not supplied"}`,
    `Guests: ${inquiry.guestCount ?? "To be discussed"}`,
    `Preferences: ${inquiry.preferences.join(", ") || "None supplied"}`,
    `Serving style: ${inquiry.serviceStyle || "To be discussed"}`,
    `Dietary requirements: ${inquiry.dietary || "None supplied"}`,
    `Budget: ${inquiry.budget || "To be discussed"}`,
    "",
    "MESSAGE",
    inquiry.message || "No message supplied.",
    "",
    `Privacy consent for this inquiry: ${inquiry.consent ? "Yes" : "No"}`,
    "",
    "This inquiry is also saved in the website staff inbox.",
    "Reply to this email to contact the customer. This is not a confirmed booking or a formal quotation.",
  ].join("\n");

  return {
    // Never use a visitor's address as From: it would break sender authentication.
    from: { name: company.name, address: sender },
    // The public form cannot choose recipients or turn this into an email relay.
    to: { name: "TOC inquiries", address: company.email },
    replyTo: {
      name: inquiry.name.replace(/[\r\n]/g, " "),
      address: inquiry.email,
    },
    subject: `[${receipt.reference}] ${kind} — ${service}`,
    text,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export async function notifyInquiry(
  inquiry: Inquiry,
  receipt: Receipt,
  options: DeliveryOptions = {},
): Promise<InquiryDeliveryStatus> {
  // Preview submissions must never leave the server, even with credentials set.
  if (options.preview ?? isPreview) return "preview_local_only";

  const environment = options.environment ?? process.env;
  if (!environment.SMTP_PASS) {
    console.warn("Inquiry email is not configured; saved in the staff inbox.", {
      reference: receipt.reference,
    });
    return "saved_for_review";
  }

  try {
    const config = smtpSchema.parse(environment);
    const secure = config.SMTP_SECURE === "true";
    const createTransport =
      options.createTransport ??
      ((settings: SMTPTransportOptions) =>
        nodemailer.createTransport(settings));
    // A non-pooled transport closes its SMTP connection after this message.
    const transport = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure,
      requireTLS: !secure,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const result = await transport.sendMail(
      buildInquiryEmail(inquiry, receipt, config.SMTP_USER),
    );
    const accepted = result.accepted.some(
      (recipient) => recipient.toLowerCase() === company.email.toLowerCase(),
    );
    if (!accepted) throw new Error("RECIPIENT_NOT_ACCEPTED");
    // SMTP acceptance is not a guarantee of final inbox delivery.
    return "email_sent";
  } catch {
    // SMTP errors can contain credentials, addresses or message contents.
    // Deliberately log only a safe, server-generated inquiry reference.
    console.error(
      "Inquiry email could not be sent; saved in the staff inbox.",
      {
        reference: receipt.reference,
      },
    );
    return "email_failed";
  }
}
