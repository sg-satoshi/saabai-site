import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { TIERS, scoreAnswers } from "@/lib/blueprint";

export const runtime = "nodejs";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Emails the visitor their AI Readiness Score and notifies Saabai of the lead.
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; answers?: Record<string, number> };
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
  console.log(`[blueprint score] ${email} scored ${r.total}, recommended ${rec.name}`);

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  const from = process.env.BLUEPRINT_FROM_EMAIL || "Shane at Saabai <hello@saabai.ai>";
  const resend = new Resend(key);
  const hi = name ? `Hi ${esc(name)},` : "Hi,";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
<div style="background:#0b092e;padding:28px 32px;border-radius:12px 12px 0 0"><p style="color:#62c5d1;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 6px">Your AI Readiness Score</p><h1 style="color:#fff;margin:0;font-size:40px">${r.total} <span style="font-size:16px;color:#a5b4fc">out of 100</span></h1></div>
<div style="background:#f8f8fb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e5ee;border-top:0">
<p>${hi}</p><p><b>${esc(r.headline)}.</b> ${esc(r.summary)} We estimate ${esc(r.hours)} could be automated.</p>
<h3 style="margin:24px 0 8px">Three quick wins for this week</h3><ol>${r.wins.map((w) => `<li style="margin-bottom:8px"><b>${esc(w.title)}</b><br>${esc(w.body)}</li>`).join("")}</ol>
<p style="margin-top:24px">Recommended next step: <b>${rec.name} Blueprint (${rec.priceLabel})</b>. The fee is credited if you build with us within 30 days.</p>
<p><a href="https://saabai.ai/blueprint/checkout?tier=${rec.id}" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Get my ${rec.name} Blueprint</a></p>
<p style="color:#666;font-size:13px">Shane Goldberg, Saabai</p></div></div>`;

  const results = await Promise.allSettled([
    resend.emails.send({ from, to: [email], subject: `Your AI Readiness Score: ${r.total}/100`, html }),
    resend.emails.send({
      from,
      to: ["hello@saabai.ai"],
      subject: `New AI score lead: ${name || email} scored ${r.total}`,
      html: `<p>${esc(name || "(no name)")} &lt;${esc(email)}&gt; scored ${r.total}. Recommended: ${rec.name}.</p><pre>${esc(JSON.stringify(answers))}</pre>`,
    }),
  ]);
  const first = results[0];
  const ok = first.status === "fulfilled" && !first.value.error;
  if (!ok) console.error("[blueprint score] email failed", first.status === "fulfilled" ? first.value.error : first.reason);
  return NextResponse.json({ ok, score: r.total }, { status: ok ? 200 : 502 });
}
