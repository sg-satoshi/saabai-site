import { Resend } from "resend";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "edge";

// Use the PlasticOnline-specific Resend account for all Rex emails
const resend = new Resend(process.env.PLON_RESEND_API_KEY ?? process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.PLON_FROM_EMAIL ?? "Rex at PlasticOnline <onboarding@resend.dev>";
const TEAM_EMAIL = process.env.PLON_TEAM_EMAIL ?? "enquiries@plasticonline.com.au";
const SHOP_URL = "https://www.plasticonline.com.au/shop/";
const CONTACT_URL = "https://www.plasticonline.com.au/contact/";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPrice(text: string): string | null {
  const match = text.match(/\[(\$[\d,]+\.?\d*(?:\s*Ex\s*GST)?)\]/i) || text.match(/(\$[\d,]+\.?\d*(?:\s*Ex\s*GST)?)/i);
  return match ? match[1] : null;
}

function formatTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => {
      const label = m.role === "user" ? "Customer" : "Rex";
      const content = m.content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      return `${label}: ${content}`;
    })
    .join("\n\n");
}

interface ConversationAnalysis {
  quoteDetails: string;
  price: string;
  summary: string;
}

async function analyseConversation(transcript: string): Promise<ConversationAnalysis | null> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `You are analysing a sales chat between Rex (AI sales agent at PlasticOnline) and a customer.

TRANSCRIPT:
${transcript}

Extract the following and return as JSON only — no markdown, no explanation:
{
  "quoteDetails": "The specific product(s) quoted — material, colour, thickness, dimensions, quantity. E.g. '3mm Grey Polycarbonate 1200×600mm x2'. If multiple items, list each on a new line. If no quote was given, write 'No quote provided'.",
  "price": "The final quoted price including Ex GST. E.g. '$185.50 Ex GST'. If multiple prices, list the total. If no price, write 'Not quoted'.",
  "summary": "2-3 sentence plain English summary of what the customer was after, what Rex quoted, and any next steps or customer intent."
}`,
    });
    let json = text.trim();
    if (json.startsWith("```")) json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(json) as ConversationAnalysis;
  } catch {
    return null;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

const EMAIL_STYLES = `
  body { margin:0; padding:0; background:#f0f0f0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  a { color:#e13f00; text-decoration:none; }
  a:hover { text-decoration:underline; }
`;

function emailShell(headerSubtitle: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">

    <!-- Header -->
    <tr><td style="background:#1a1a1a;padding:32px 40px 28px;border-radius:12px 12px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Plastic<span style="color:#e13f00;">Online</span></p>
            <p style="margin:6px 0 0;font-size:13px;color:#999999;letter-spacing:0.3px;">Australia's Largest Range of Cut-to-Size Plastics</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <p style="margin:0;font-size:12px;color:#666666;line-height:1.8;">Gold Coast, QLD<br><a href="tel:0755646744" style="color:#e13f00;font-weight:600;">(07) 5564 6744</a></p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Orange accent bar -->
    <tr><td style="background:#e13f00;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Subtitle band -->
    <tr><td style="background:#ffffff;padding:20px 40px 0;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#e13f00;text-transform:uppercase;letter-spacing:1px;">${headerSubtitle}</p>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#ffffff;padding:24px 40px 40px;">
      ${body}
    </td></tr>

    <!-- Trust bar -->
    <tr><td style="background:#f7f7f7;padding:20px 40px;border-top:1px solid #e8e8e8;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:0 8px;">
            <p style="margin:0;font-size:12px;font-weight:700;color:#1a1a1a;">Up to 10 free cuts</p>
            <p style="margin:2px 0 0;font-size:11px;color:#888;">included every order</p>
          </td>
          <td align="center" style="padding:0 8px;border-left:1px solid #ddd;border-right:1px solid #ddd;">
            <p style="margin:0;font-size:12px;font-weight:700;color:#1a1a1a;">115+ materials</p>
            <p style="margin:2px 0 0;font-size:11px;color:#888;">in stock, Gold Coast</p>
          </td>
          <td align="center" style="padding:0 8px;">
            <p style="margin:0;font-size:12px;font-weight:700;color:#1a1a1a;">Fast dispatch</p>
            <p style="margin:2px 0 0;font-size:11px;color:#888;">ships within days</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#1a1a1a;padding:24px 40px;border-radius:0 0 12px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#888888;line-height:1.8;">
              <a href="${SHOP_URL}" style="color:#e13f00;font-weight:600;">Shop</a> &nbsp;·&nbsp;
              <a href="${CONTACT_URL}" style="color:#e13f00;font-weight:600;">Contact</a> &nbsp;·&nbsp;
              <a href="tel:0755646744" style="color:#e13f00;font-weight:600;">(07) 5564 6744</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#555555;">
              13 Distribution Avenue, Molendinar QLD 4214 &nbsp;·&nbsp; Mon–Fri 7:30am–4:00pm
            </p>
          </td>
          <td align="right" style="vertical-align:bottom;">
            <a href="${CONTACT_URL}" style="font-size:11px;color:#444444;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function quoteEmailHtml(note: string) {
  // Strip markdown price links [$xx](url) → just keep the price text
  const cleanNote = (note || "Custom cut-to-size order")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "");

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Your quote is ready.</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#666666;">Rex has put together the following for you.</p>

    <!-- Quote box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f9f9f9;border-left:4px solid #e13f00;border-radius:0 8px 8px 0;padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#e13f00;text-transform:uppercase;letter-spacing:1px;">Quote Details</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.8;font-weight:500;">${cleanNote}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:15px;color:#3e3e3e;line-height:1.8;">
      When you're ready to lock it in, head to our shop and place your order. All cuts are included — no hidden setup fees.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#3e3e3e;line-height:1.8;">
      Need a different size or material? Just reply to this email and we'll sort it out.
    </p>

    <!-- CTA button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:#e13f00;border-radius:40px;">
          <a href="${SHOP_URL}" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Place Your Order &rarr;</a>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="border-top:1px solid #eeeeee;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#888888;line-height:1.8;">
      Questions? Call us on <a href="tel:0755646744" style="color:#e13f00;font-weight:600;">(07) 5564 6744</a> or
      <a href="${CONTACT_URL}" style="color:#e13f00;font-weight:600;">get in touch online</a> — we're here Mon–Fri, 7:30am–4:00pm.
    </p>
  `;

  return emailShell("Your Quote from Rex", body);
}

function followUpEmailHtml(note: string) {
  const cleanNote = (note || "Your custom cut-to-size order")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "");

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Still need that plastic cut?</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#666666;">Hey, Rex here — just checking in on your quote from yesterday.</p>

    <!-- Quote box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f9f9f9;border-left:4px solid #e13f00;border-radius:0 8px 8px 0;padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#e13f00;text-transform:uppercase;letter-spacing:1px;">Your Quote</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.8;font-weight:500;">${cleanNote}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:15px;color:#3e3e3e;line-height:1.8;">
      Your order is ready to go whenever you are. We've got everything in stock and it'll be cut and dispatched within a few business days.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#3e3e3e;line-height:1.8;">
      If the size changed or you need something different, just reply here — happy to re-quote in seconds.
    </p>

    <!-- CTA button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:#e13f00;border-radius:40px;">
          <a href="${SHOP_URL}" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Complete Your Order &rarr;</a>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="border-top:1px solid #eeeeee;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#888888;line-height:1.8;">
      Not ready yet? No worries at all.
      <a href="${CONTACT_URL}" style="color:#e13f00;font-weight:600;">Get in touch</a> when the time is right
      or call us on <a href="tel:0755646744" style="color:#e13f00;font-weight:600;">(07) 5564 6744</a>.
    </p>
  `;

  return emailShell("Following Up On Your Quote", body);
}

function teamNotificationHtml(
  email: string,
  note: string,
  source: string,
  mobile: string | undefined,
  despatch: string | undefined,
  analysis: ConversationAnalysis | null,
  transcript: string,
) {
  const despatchLabel = despatch === "pickup" ? "Pick up" : despatch === "delivery" ? "Delivery" : "Not specified";
  const timeStr = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" });

  // Format transcript for HTML — each speaker block gets a coloured row
  const transcriptHtml = transcript
    ? transcript.split("\n\n").map(block => {
        const isRex = block.startsWith("Rex:");
        const bg = isRex ? "#f0f7ff" : "#f9f9f9";
        const labelColour = isRex ? "#0077cc" : "#333";
        const lines = block.split("\n");
        const label = lines[0].split(":")[0];
        const content = block.replace(/^(Rex|Customer): /, "").replace(/\n/g, "<br>");
        return `<tr>
          <td style="padding:10px 14px;background:${bg};vertical-align:top;width:80px;font-weight:700;color:${labelColour};font-size:12px;white-space:nowrap;">${label}</td>
          <td style="padding:10px 14px;background:${bg};color:#333;font-size:13px;line-height:1.6;">${content}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="2" style="padding:12px;color:#888;font-size:13px;">No transcript available</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e7ef;">

        <!-- Header -->
        <tr><td style="background:#0084FF;padding:20px 28px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">New Rex Lead</p>
          <p style="margin:4px 0 0;color:#b3d9ff;font-size:12px;">${timeStr} AEST · ${source}</p>
        </td></tr>

        <!-- Customer details -->
        <tr><td style="padding:24px 28px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;">Customer</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr>
              <td style="padding:8px 12px;background:#f4f8ff;font-weight:600;font-size:13px;color:#555;width:110px;">Email</td>
              <td style="padding:8px 12px;background:#f4f8ff;font-size:13px;"><a href="mailto:${email}" style="color:#0084FF;font-weight:700;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;">Mobile</td>
              <td style="padding:8px 12px;font-size:13px;color:#333;">${mobile || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f4f8ff;font-weight:600;font-size:13px;color:#555;">Despatch</td>
              <td style="padding:8px 12px;background:#f4f8ff;font-size:13px;color:#333;">${despatchLabel}</td>
            </tr>
          </table>
        </td></tr>

        ${analysis ? `
        <!-- Quote summary -->
        <tr><td style="padding:20px 28px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;">Quote</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr>
              <td style="padding:8px 12px;background:#f4f8ff;font-weight:600;font-size:13px;color:#555;width:110px;">Details</td>
              <td style="padding:8px 12px;background:#f4f8ff;font-size:13px;color:#333;line-height:1.5;">${analysis.quoteDetails.replace(/\n/g, "<br>")}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;">Price</td>
              <td style="padding:8px 12px;font-size:14px;font-weight:700;color:#0084FF;">${analysis.price}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f4f8ff;font-weight:600;font-size:13px;color:#555;vertical-align:top;">Summary</td>
              <td style="padding:8px 12px;background:#f4f8ff;font-size:13px;color:#333;line-height:1.6;">${analysis.summary}</td>
            </tr>
          </table>
        </td></tr>
        ` : note ? `
        <!-- Fallback note -->
        <tr><td style="padding:20px 28px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;">Note</p>
          <div style="background:#f4f8ff;border-radius:6px;padding:12px 14px;font-size:13px;color:#333;line-height:1.6;">${note}</div>
        </td></tr>
        ` : ""}

        <!-- Transcript -->
        <tr><td style="padding:20px 28px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;">Full Conversation</p>
          <table style="border-collapse:collapse;width:100%;border:1px solid #e0e7ef;border-radius:6px;overflow:hidden;">
            ${transcriptHtml}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 28px 24px;">
          <p style="margin:16px 0 0;color:#aaa;font-size:11px;">Rex chat widget · PlasticOnline</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { source, email, note, mobile, despatch, messages, timestamp } = await req.json();

    // Build transcript and run AI analysis upfront (used in team email)
    const transcript = messages && messages.length > 0 ? formatTranscript(messages) : "";
    const analysis = transcript ? await analyseConversation(transcript) : null;

    // Build subject line from analysis or fallback to note price
    const fallbackPrice = extractPrice(note ?? "");
    const price = analysis?.price && analysis.price !== "Not quoted" ? analysis.price : fallbackPrice;
    const productSnippet = analysis?.quoteDetails && analysis.quoteDetails !== "No quote provided"
      ? analysis.quoteDetails.split("\n")[0].slice(0, 60)
      : note?.slice(0, 60) ?? "Enquiry";
    const teamSubject = price
      ? `Rex Lead: ${email ?? "anonymous"} — ${productSnippet} — ${price}`
      : `Rex Lead: ${email ?? "anonymous"} — ${productSnippet}`;

    const tasks: Promise<unknown>[] = [];

    if (email) {
      // 1. Immediate quote email to customer
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Your quote from Rex at PlasticOnline",
          html: quoteEmailHtml(note ?? ""),
        })
      );

      // 2. Follow-up email — 22 hours later
      const followUpAt = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Still need that plastic cut? Your quote is ready",
          html: followUpEmailHtml(note ?? ""),
          scheduledAt: followUpAt,
        } as Parameters<typeof resend.emails.send>[0])
      );
    }

    // 3. Team notification — rich email with AI summary + full transcript
    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: TEAM_EMAIL,
        subject: teamSubject,
        html: teamNotificationHtml(email ?? "unknown", note ?? "", source ?? "unknown", mobile, despatch, analysis, transcript),
      })
    );

    // 4. Make.com webhook (if configured)
    if (process.env.LEAD_WEBHOOK_URL) {
      tasks.push(
        fetch(process.env.LEAD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: source ?? "rex", email, note, timestamp }),
        })
      );
    }

    await Promise.allSettled(tasks);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[rex-leads]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
