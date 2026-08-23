/**
 * Invoice email + PDF generation (Phase 3 "send").
 *
 * Sends a B2B consulting invoice (SG-NNN) to the client's email as a PDF
 * attachment via Resend. The attachment is ALWAYS named "Invoice SG-NNN.pdf"
 * (owner requirement) — never bare "SG-NNN.pdf". This is a real financial
 * side-effect, so the MCP tool that calls it is approval-gated upstream.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { MY_INFO, PAY_INFO, type Invoice, type InvoiceClient } from "./invoice-store";

const FROM_EMAIL = "Saabai <noreply@saabai.ai>";

export function invoiceFileName(number: string): string {
  return `Invoice ${number}.pdf`;
}

/** Build a clean, professional invoice PDF. Returns bytes (Uint8Array). */
export async function buildInvoicePdf(invoice: Invoice, client: InvoiceClient): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const left = 48;
  let y = height - 56;
  const right = width - 48;

  // ── Header ───────────────────────────────────────────────────────────────
  page.drawText("INVOICE", { x: left, y: y + 8, size: 28, font: bold, color: rgb(0.04, 0.04, 0.18) });
  page.drawText(invoice.number, { x: right - 130, y: y + 8, size: 20, font: bold, color: rgb(0.25, 0.25, 0.25) });
  y -= 26;
  page.drawText(`Date: ${invoice.date}`, { x: right - 130, y: y, size: 11, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 26;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1.2, color: rgb(0.04, 0.04, 0.18) });
  y -= 24;

  // ── From / Bill To ───────────────────────────────────────────────────────
  page.drawText("From", { x: left, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  y -= 16;
  page.drawText(MY_INFO.name, { x: left, y, size: 12, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 15;
  page.drawText(`ABN: ${MY_INFO.abn}`, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 15;
  page.drawText(MY_INFO.address, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 15;
  page.drawText(MY_INFO.email, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 15;
  page.drawText(MY_INFO.phone, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  const bx = width / 2 + 10;
  page.drawText("Bill To", { x: bx, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  y -= 16;
  page.drawText(client.name, { x: bx, y, size: 12, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 15;
  if (client.address) {
    page.drawText(client.address, { x: bx, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 15;
  }
  if (client.email) {
    page.drawText(client.email, { x: bx, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 15;
  }

  y -= 24;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.8, 0.8, 0.8) });
  y -= 16;

  // ── Line items table ─────────────────────────────────────────────────────
  const colDesc = left;
  const colHours = right - 150;
  const colRate = right - 80;
  const colAmt = right;

  page.drawText("Description", { x: colDesc, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  page.drawText("Hours", { x: colHours, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  page.drawText("Rate", { x: colRate, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  page.drawText("Amount", { x: colAmt - 60, y, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.8, 0.8, 0.8) });
  y -= 16;

  const money = (n: number) => "$" + n.toFixed(2);
  for (const li of invoice.lineItems) {
    // Wrap description if it is long.
    const desc = li.description.length > 52 ? li.description.slice(0, 49) + "..." : li.description;
    page.drawText(desc, { x: colDesc, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(li.hours ? String(li.hours) : "-", { x: colHours, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(li.rate ? money(li.rate) : "-", { x: colRate, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(money(li.total), { x: colAmt - 60, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 16;
  }

  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  // ── Totals ───────────────────────────────────────────────────────────────
  const rightCol = right - 60;
  function totalRow(label: string, value: string, boldRow: boolean) {
    page.drawText(label, { x: rightCol - 90, y, size: 11, font: boldRow ? bold : font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: rightCol, y, size: 11, font: boldRow ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
  }
  totalRow("Subtotal", money(invoice.subtotal), false);
  totalRow("GST", money(invoice.gst), false);
  totalRow("Total", money(invoice.total), true);

  y -= 14;
  page.drawLine({ start: { x: right - 140, y }, end: { x: right, y }, thickness: 1, color: rgb(0.04, 0.04, 0.18) });
  y -= 28;

  // ── Payment details ──────────────────────────────────────────────────────
  page.drawText("Payment Details", { x: left, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 15;
  page.drawText(`Account Name: ${PAY_INFO.accountName}`, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 15;
  page.drawText(`BSB: ${PAY_INFO.bsb} · Account: ${PAY_INFO.accountNumber}`, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 15;
  page.drawText(`ABN: ${MY_INFO.abn}`, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  if (invoice.notes) {
    // Move to a lower area to avoid overlap; keep it simple.
    page.drawText(`Notes: ${invoice.notes}`, { x: left, y: 70, size: 9, font, color: rgb(0.45, 0.45, 0.45) });
  }

  page.drawText(`Please pay within 14 days. Thank you.`, { x: left, y: 56, size: 9, font, color: rgb(0.45, 0.45, 0.45) });

  return doc.save();
}

/** Email the invoice PDF to the client via Resend. */
export async function sendInvoiceEmail(
  invoice: Invoice,
  client: InvoiceClient
): Promise<{ sent: boolean; to: string; filename: string; invoiceNumber: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const to = client.email;
  if (!to) throw new Error(`Client '${client.name}' has no email address to send to`);
  if (to === "NO_EMAIL") throw new Error(`Client '${client.name}' has no email address to send to`);

  const pdf = await buildInvoicePdf(invoice, client);
  const filename = invoiceFileName(invoice.number);
  const base64 = Buffer.from(pdf).toString("base64");

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Invoice ${invoice.number} from Saabai`,
    html: `<p>Hi ${client.name},</p>
<p>Please find attached invoice <strong>${invoice.number}</strong>.</p>
<p>Total due: <strong>$${invoice.total.toFixed(2)}</strong>.</p>
<p>Payment details are on the invoice. Thank you.</p>
<p>Saabai</p>`,
    attachments: [{ filename, content: base64 }],
  });

  return { sent: true, to, filename, invoiceNumber: invoice.number };
}
