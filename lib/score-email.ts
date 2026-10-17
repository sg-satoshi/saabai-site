import { TIERS, type ScoreResult } from "./blueprint";
import { buildScorePdf } from "./score-pdf";
import type { ScanReport } from "./site-scan/types";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type ScoreMail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

/** Anything with Resend's send shape. Tests pass a fake, so no real email is ever sent from tests. */
export type MailSender = (m: ScoreMail) => Promise<{ error?: unknown }>;

export async function buildVisitorEmail(opts: { from: string; email: string; name?: string; result: ScoreResult; withPdf: boolean; scan?: ScanReport | null }): Promise<ScoreMail> {
  const { result: r, name, withPdf, scan } = opts;
  const rec = TIERS[r.recommended];
  const hi = name ? `Hi ${esc(name)},` : "Hi,";
  const pdfLine = withPdf ? `<p>Your results are attached as a PDF, so you can keep them, print them or forward them to your team.</p>` : "";
  const scanLine = scan && scan.mode !== "blocked" ? `<p>${scan.overall === 0 && scan.mode === "no_website" ? "We did not detect a website for your business, which scores 0 out of 100." : `Your website ${esc(scan.domain)} scored <b>${scan.overall} out of 100</b>.`} ${withPdf ? "Page 3 of the PDF has the full website report." : ""}</p>` : "";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
<div style="background:#0b092e;padding:28px 32px;border-radius:12px 12px 0 0"><p style="color:#62c5d1;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 6px">Your AI Readiness Score</p><h1 style="color:#fff;margin:0;font-size:40px">${r.total} <span style="font-size:16px;color:#a5b4fc">out of 100</span></h1></div>
<div style="background:#f8f8fb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e5ee;border-top:0">
<p>${hi}</p><p><b>${esc(r.headline)}.</b> ${esc(r.summary)} We estimate ${esc(r.hours)} could be automated.</p>${pdfLine}${scanLine}
<h3 style="margin:24px 0 8px">Three quick wins for this week</h3><ol>${r.wins.map((w) => `<li style="margin-bottom:8px"><b>${esc(w.title)}</b><br>${esc(w.body)}</li>`).join("")}</ol>
<p style="margin-top:24px">Recommended next step: <b>${rec.name} Blueprint (${rec.priceLabel})</b>. The fee is credited if you build with us within 30 days.</p>
<p><a href="https://saabai.ai/blueprint/checkout?tier=${rec.id}" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Get my ${rec.name} Blueprint</a></p>
<p style="color:#666;font-size:13px">Shane Goldberg, Saabai</p></div></div>`;
  const mail: ScoreMail = { from: opts.from, to: [opts.email], subject: withPdf ? `Your AI Readiness Report (PDF): ${r.total}/100` : `Your AI Readiness Score: ${r.total}/100`, html };
  if (withPdf) {
    try {
      const bytes = await buildScorePdf({ result: r, name, scan });
      mail.attachments = [{ filename: "Saabai-AI-Readiness-Report.pdf", content: Buffer.from(bytes) }];
    } catch (err) {
      // Never lose the email because the PDF failed: send the normal results email without it.
      console.error("[score pdf] generation failed, sending email without PDF", err);
      mail.html = mail.html.replace(pdfLine, "");
      mail.subject = `Your AI Readiness Score: ${r.total}/100`;
    }
  }
  return mail;
}
