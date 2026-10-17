import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { TIERS, scoreAnswers } from "@/lib/blueprint";
import { addInteraction, upsertScoreLead } from "@/lib/saabai-crm";
import { ATTR_COOKIE, parseAttr } from "@/lib/growth/attribution";
import { recordEvent, touchContact } from "@/lib/growth/events";
import { recordConversion } from "@/lib/exp/track";
import { buildConsentRecord } from "@/lib/score-consent";
import { getReport } from "@/lib/site-scan/store";
import { buildVisitorEmail, esc, type MailSender } from "@/lib/score-email";

export const runtime = "nodejs";

/** Accepts "example.com.au" or a full URL. Returns a clean https URL or undefined. */
function normaliseWebsite(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, 200);
  if (!t) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

// Emails the visitor their AI Readiness Score and notifies Saabai of the lead.
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; website?: string; answers?: Record<string, number>; pdf?: boolean; consent?: boolean; pageUrl?: string; scanId?: string; industry?: string; suburb?: string; goal?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().slice(0, 200);
  const name = (body.name ?? "").trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const answers: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.answers ?? {})) if (typeof v === "number") answers[k.slice(0, 40)] = v;
  const r = scoreAnswers(answers);
  const rec = TIERS[r.recommended];
  const website = normaliseWebsite(body.website);
  // Website scan (only when the scanner flag/admin produced one). Loaded server side by id, never trusted from the client.
  const scan = typeof body.scanId === "string" ? await getReport(body.scanId) : null;
  // PDF box: a PDF is attached when requested. Marketing consent is recorded separately (unticked by default).
  const withPdf = body.pdf === true;
  const consent = withPdf ? buildConsentRecord({ accepted: body.consent, pageUrl: body.pageUrl }) : null;

  // Split testing: count this enquiry against the visitor's variant (server side, never blocks).
  await recordConversion(req, "form_submit");

  // Save every /score lead to the CRM (deduped by email). Never block the email on CRM failure.
  try {
    const id = await upsertScoreLead({ email, name, website, score: r.total, answers, recommendedTier: rec.name });
    if (!id) console.error("[blueprint score] CRM unavailable, lead not saved");
    else if (consent) {
      await addInteraction(id, { type: "consent", notes: JSON.stringify(consent) });
    }
  } catch (err) {
    console.error("[blueprint score] CRM save failed", err);
  }

  // Journey + source tracking (first-party sb_attr cookie). Never blocks the email.
  const attr = parseAttr(req.cookies.get(ATTR_COOKIE)?.value);
  await Promise.all([
    touchContact(email, attr, name),
    recordEvent({ contactId: email, type: "score_taken", meta: { score: r.total, tier: rec.name, website, ...(scan ? { site_score: scan.overall, site_mode: scan.mode, industry: String(body.industry ?? "").slice(0, 60), suburb: String(body.suburb ?? "").slice(0, 60), goal: String(body.goal ?? "").slice(0, 40) } : {}), source: attr?.l, firstTouch: attr?.f } }),
    ...(consent ? [recordEvent({ contactId: email, type: "note", meta: { kind: "marketing_consent", ...consent } })] : []),
  ]);

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  const from = process.env.BLUEPRINT_FROM_EMAIL || "Shane at Saabai <hello@saabai.ai>";
  const resend = new Resend(key);
  const send: MailSender = (m) => resend.emails.send(m);
  const visitorMail = await buildVisitorEmail({ from, email, name, result: r, withPdf, scan });

  const results = await Promise.allSettled([
    send(visitorMail),
    resend.emails.send({
      from,
      to: ["hello@saabai.ai"],
      subject: `New AI score lead: ${name || email} scored ${r.total}`,
      html: `<p>${esc(name || "(no name)")} &lt;${esc(email)}&gt; scored ${r.total}. Recommended: ${rec.name}.${website ? ` Website: ${esc(website)}` : ""} Saved to the CRM (source: score).${consent ? ` PDF requested. Marketing consent: ${consent.accepted ? "YES" : "no"} (${esc(consent.at)}).` : ""}</p><pre>${esc(JSON.stringify(answers))}</pre>`,
    }),
  ]);
  const first = results[0];
  const ok = first.status === "fulfilled" && !first.value.error;
  if (!ok) console.error("[blueprint score] email failed", first.status === "fulfilled" ? first.value.error : first.reason);
  return NextResponse.json({ ok, score: r.total }, { status: ok ? 200 : 502 });
}
