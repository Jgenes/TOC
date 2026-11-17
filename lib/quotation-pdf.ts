import PDFDocument from "pdfkit";
import { company } from "./content";
import { quoteVersion } from "./platform-business";
import type { Principal } from "./platform-auth";
import { audit, demand } from "./platform-store";

export async function quotationPdf(user: Principal, id: string) {
  const row = quoteVersion(user, id),
    snapshot = JSON.parse(row.snapshot),
    corporate = snapshot.company || company;
  demand(
    !!row.approved_by && !["draft", "pending_approval"].includes(row.status),
    409,
    "The PDF is available after commercial approval.",
  );
  const pdf = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: `${row.reference} v${row.version}`,
      Author: corporate.name,
      Subject:
        "Staff-reviewed quotation; separate booking authorization required",
    },
  });
  const chunks: Buffer[] = [];
  const buffer = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
  const money = (minor: number) =>
    new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 2,
    }).format(minor / 100);
  pdf.fillColor("#c41b24").fontSize(23).text("TOC INVESTMENT");
  pdf
    .fillColor("#171717")
    .fontSize(10)
    .text("COMPANY LIMITED — TOUCH OF CLASS")
    .text(corporate.location)
    .text(corporate.email);
  pdf
    .moveDown()
    .fontSize(19)
    .text("QUOTATION")
    .fontSize(11)
    .text(
      `${row.reference}  |  Version ${row.version}  |  ${row.status.toUpperCase()}`,
    )
    .text(`Inquiry: ${snapshot.inquiryReference}`)
    .text(`Valid through: ${snapshot.expiresOn}`);
  pdf
    .moveDown()
    .font("Helvetica-Bold")
    .text(snapshot.customer.name)
    .font("Helvetica")
    .text(snapshot.customer.organization || "")
    .text(snapshot.customer.email);
  pdf
    .moveDown()
    .font("Helvetica-Bold")
    .text("Scope")
    .font("Helvetica")
    .text(snapshot.scope);
  pdf.moveDown().font("Helvetica-Bold").text("Line items").font("Helvetica");
  for (const item of snapshot.items) {
    if (pdf.y > 700) pdf.addPage();
    pdf
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .text(item.description)
      .font("Helvetica")
      .fontSize(10)
      .text(
        `${item.quantity} ${item.unit} x ${money(item.unitMinor)}; tax ${item.taxBps / 100}% ${item.taxInclusive ? "included" : "exclusive"}; ${item.department}`,
      )
      .text(
        `Net ${money(item.netMinor)}   Tax ${money(item.taxMinor)}   Total ${money(item.totalMinor)}`,
      );
  }
  pdf
    .moveDown()
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Net subtotal: ${money(snapshot.subtotalMinor)}`)
    .text(`Tax: ${money(snapshot.taxMinor)}`)
    .text(`Total: ${money(snapshot.totalMinor)}`)
    .font("Helvetica")
    .text(
      `Discount applied: ${snapshot.discountBps / 100}% (${money(snapshot.discountMinor)})`,
    );
  pdf
    .moveDown()
    .font("Helvetica-Bold")
    .text("Terms")
    .font("Helvetica")
    .text(snapshot.terms);
  pdf
    .moveDown()
    .fontSize(9)
    .fillColor("#444444")
    .text(
      "This offer preserves the approved version and financial snapshot. Customer acceptance applies only to the exact valid issued version. Acceptance is not a booking confirmation. TOC operations must separately verify resources, contractual and payment requirements and authorize the booking. No payment is collected by this document.",
    );
  if (row.status === "approved")
    pdf
      .moveDown()
      .fillColor("#c41b24")
      .text("APPROVED — NOT YET ISSUED TO CUSTOMER");
  pdf.end();
  audit(user.id, "quotation.pdf_downloaded", "quotation", id);
  return { bytes: await buffer, name: `${row.reference}-v${row.version}.pdf` };
}
