import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "../../../lib/html-escape";
import { claimScoreLinkSlot, releaseScoreLinkSlot, saveScoreLinkSubscriber } from "../../../lib/subscribers";
import { isSuppressed, unsubHeaders, unsubUrl } from "../../../lib/growth/consent";
import { SCORE_LINK_RATE_SECONDS, handleScoreLink } from "../../../lib/score-link";

export const runtime = "nodejs";

const FROM = "Shane at Saabai <hello@saabai.ai>";

function resendKey(): string {
  return (process.env.RESEND_API_KEY ?? "").replace(/[\s\n]/g, "");
}

async function resend(payload: Record<string, unknown>): Promise<boolean> {
  const key = resendKey();
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[subscribe] send failed:", err);
    return false;
  }
}

/**
 * Exit pop-up "Email me the link" (offer: "score_link"). One email with the free AI score link.
 * The old AI Readiness checklist email is retired (Shane, 29 Oct 2026): requests without
 * offer "score_link" are refused and nothing is stored or sent.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  if (body?.offer !== "score_link") {
    return NextResponse.json({ ok: false, error: "This offer has ended. Take the free AI score at saabai.ai/score." }, { status: 410 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";

  try {
    const result = await handleScoreLink(
      { email: body.email, marketingConsent: body.marketingConsent, source: body.source, ip: ip || undefined },
      {
        isSuppressed,
        claimRateSlot: (email) => claimScoreLinkSlot(email, SCORE_LINK_RATE_SECONDS),
        releaseRateSlot: releaseScoreLinkSlot,
        save: saveScoreLinkSubscriber,
        unsubUrl,
        unsubHeaders,
        send: (m) => resend({ from: FROM, to: m.to, subject: m.subject, html: m.html, text: m.text, headers: m.headers }),
        notify: async (i) => {
          // Internal alert, one per sign-up, kept as today.
          await resend({
            from: FROM,
            to: "hello@saabai.ai",
            subject: `Exit pop-up: score link sent to ${i.email}`,
            html: `<p><strong>Score link sent from the exit pop-up</strong></p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(i.email)}</li>
  <li><strong>Page:</strong> ${escapeHtml(i.source)}</li>
  <li><strong>Marketing consent:</strong> ${i.marketingConsent ? "yes" : "no"}</li>
  <li><strong>Saved to list:</strong> ${i.stored ? "yes" : "no (storage unavailable)"}</li>
</ul>`,
          }).catch(() => false);
        },
      },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[subscribe] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
