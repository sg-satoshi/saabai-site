import { patchDoc } from "@/lib/growth/store";
import { recordEvent } from "@/lib/growth/events";
import { CONSENT_LABELS, CONSENT_WORDING_VERSION, findTestimonialByToken, type Testimonial } from "@/lib/growth/growth2";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const t = typeof b.token === "string" ? await findTestimonialByToken(b.token) : null;
  if (!t) return Response.json({ error: "This link isn't valid" }, { status: 404 });
  if (["received", "approved", "published"].includes(t.status)) return Response.json({ error: "Thanks, we already have your feedback" }, { status: 409 });
  const rating = Number(b.rating);
  if (!(rating >= 1 && rating <= 5)) return Response.json({ error: "Pick a rating from 1 to 5" }, { status: 400 });
  const consent = Object.keys(CONSENT_LABELS).includes(b.consent) ? (b.consent as Testimonial["consent"]) : "internal";
  const quote = typeof b.quote === "string" ? b.quote.trim().slice(0, 800) : "";
  await patchDoc<Testimonial>("testimonials", t.id, { status: "received", rating, quote, consent, consentAt: new Date().toISOString(), consentWording: CONSENT_WORDING_VERSION });
  await recordEvent({ contactId: t.email, type: "testimonial_received", refId: t.id, meta: { rating, consent } });
  // Low ratings alert Shane privately; no public review ask for them.
  if (rating <= 3 && process.env.RESEND_API_KEY) {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "Saabai Alerts <hello@saabai.ai>", to: [process.env.GROWTH_ALERT_EMAIL || "hello@saabai.ai"],
      subject: `Low Blueprint rating: ${rating}/5 from ${t.name || t.email}`,
      html: `<p>${escapeHtml(t.name || t.email)} rated their Blueprint ${rating}/5.</p><blockquote>${escapeHtml(quote || "(no comment)")}</blockquote>`,
    }).catch(() => null);
  }
  return Response.json({ ok: true, googleReview: rating >= 4 ? process.env.GOOGLE_REVIEW_URL || null : null });
}
