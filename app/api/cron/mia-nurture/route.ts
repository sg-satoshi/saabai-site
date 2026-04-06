import { Resend } from "resend";
import { getPendingNurture, markNurtureSent } from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const DAY_MS = 24 * 60 * 60 * 1000;

function buildDay2Html(name?: string, business?: string, industry?: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || null;
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  const businessLine = business
    ? `I had another look at what you described — ${business.toLowerCase().replace(/\.$/, "")}.`
    : "I had another look at our chat from yesterday.";
  const industryNote = industry
    ? `Most ${industry.toLowerCase()} businesses we work with see the biggest gains in the first 60 days — the automatable work is usually hiding in plain sight.`
    : "Most businesses we work with see the biggest gains in the first 60 days — the automatable work is usually hiding in plain sight.";

  return {
    subject: firstName ? `${firstName}, quick one from Saabai` : "Quick one from Saabai",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Saabai · From Shane</p>
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">${greeting}</h1>
        </div>
        <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">${businessLine} ${industryNote}</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">The strategy call is 30 minutes and free. I come in prepared — I've already read your chat with Mia, so you don't start from scratch. You leave with a clear picture of what's automatable and what it costs. No pitch deck, no junior sales process.</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">If the timing's off, no worries. But if the problem's still there — which it usually is — this is the fastest way to understand what fixing it actually looks like.</p>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book Your Free Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · 30 minutes · No obligation</p>
          <div style="border-top: 1px solid #e8e8ec; padding-top: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 4px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0;">Saabai · AI Automation for Professional Firms</p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildDay5Html(name?: string, business?: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || null;
  const greeting = firstName ? `${firstName},` : "One last one —";
  const context = business
    ? `From what you shared with Mia, there's a real automation opportunity in ${business.toLowerCase().replace(/\.$/, "")}.`
    : "From your chat with Mia, there are clear opportunities worth a proper look.";

  return {
    subject: firstName ? `Last one, ${firstName}` : "Last one from Saabai",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Saabai · From Shane</p>
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">${greeting}</h1>
        </div>
        <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">${context}</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">I won't keep following up after this — that's not how we operate. But if the problems you described are still there next week or next quarter — the call is free and the offer doesn't expire.</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">When the time's right, just book a time. I'll know who you are.</p>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book a Free Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · 30 minutes · Pick your time</p>
          <div style="border-top: 1px solid #e8e8ec; padding-top: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 4px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0;">Saabai · AI Automation for Professional Firms</p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ skipped: "no resend key" });
  }

  const now = Date.now();
  const records = await getPendingNurture();

  let day2Sent = 0;
  let day5Sent = 0;
  const errors: string[] = [];

  for (const record of records) {
    const capturedMs = new Date(record.capturedAt).getTime();
    const daysSince = (now - capturedMs) / DAY_MS;

    // Day 2 — send between day 1.5 and day 3
    if (!record.day2Sent && daysSince >= 1.5 && daysSince < 3) {
      const { subject, html } = buildDay2Html(record.name, record.business, record.industry);
      try {
        await resend.emails.send({
          from: "Shane at Saabai.ai <hello@saabai.ai>",
          to: [record.email],
          subject,
          html,
          replyTo: "hello@saabai.ai",
        });
        await markNurtureSent(record.id, "day2");
        day2Sent++;
      } catch (err) {
        errors.push(`day2 ${record.email}: ${String(err)}`);
      }
    }

    // Day 5 — send between day 4.5 and day 7
    if (!record.day5Sent && daysSince >= 4.5 && daysSince < 7) {
      const { subject, html } = buildDay5Html(record.name, record.business);
      try {
        await resend.emails.send({
          from: "Shane at Saabai.ai <hello@saabai.ai>",
          to: [record.email],
          subject,
          html,
          replyTo: "hello@saabai.ai",
        });
        await markNurtureSent(record.id, "day5");
        day5Sent++;
      } catch (err) {
        errors.push(`day5 ${record.email}: ${String(err)}`);
      }
    }
  }

  console.log(`[mia-nurture] day2=${day2Sent} day5=${day5Sent} errors=${errors.length}`);
  return Response.json({ ok: true, day2Sent, day5Sent, errors });
}
