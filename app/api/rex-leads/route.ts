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

const LOGO_URL = "https://www.plasticonline.com.au/wp-content/uploads/2025/11/Plastic-Online-Red_black.png";

function cleanNote(raw: string): string {
  return (raw || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

/* ── Shared header + footer shell ── */
function emailShell(preheader: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
    body{margin:0;padding:0;background:#f2f2f2;}
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Logo header -->
  <tr><td style="background:#1a1a1a;padding:28px 40px 24px;border-radius:16px 16px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <img src="${LOGO_URL}" width="180" alt="PlasticOnline" style="display:block;max-width:180px;height:auto;">
        </td>
        <td align="right" style="vertical-align:middle;">
          <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.9;">
            Gold Coast, QLD<br>
            <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:700;">(07) 5564 6744</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Red accent line -->
  <tr><td style="background:#e13f00;height:5px;font-size:0;line-height:0;"></td></tr>

  <!-- Body card -->
  <tr><td style="background:#ffffff;padding:40px 40px 36px;border-radius:0;">
    ${body}
  </td></tr>

  <!-- Trust strip -->
  <tr><td style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #ebebeb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="width:33%;padding:0 6px;border-right:1px solid #e0e0e0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">10 free cuts</p>
          <p style="margin:3px 0 0;font-size:11px;color:#999999;">included every order</p>
        </td>
        <td align="center" style="width:33%;padding:0 6px;border-right:1px solid #e0e0e0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">115+ materials</p>
          <p style="margin:3px 0 0;font-size:11px;color:#999999;">in stock, Gold Coast</p>
        </td>
        <td align="center" style="width:33%;padding:0 6px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">Fast dispatch</p>
          <p style="margin:3px 0 0;font-size:11px;color:#999999;">within a few business days</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1a1a1a;padding:24px 40px;border-radius:0 0 16px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#888888;line-height:1.9;">
            <a href="${SHOP_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">Shop</a>
            <span style="color:#444;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">Contact Us</a>
            <span style="color:#444;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:600;">(07) 5564 6744</a>
          </p>
          <p style="margin:0;font-size:11px;color:#555555;">
            13 Distribution Avenue, Molendinar QLD 4214 &nbsp;·&nbsp; Mon–Fri 7:30am–4:00pm AEST
          </p>
        </td>
        <td align="right" valign="bottom">
          <a href="${CONTACT_URL}" style="font-size:11px;color:#444444;text-decoration:none;">Unsubscribe</a>
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

/* ── Customer quote email ── */
function quoteEmailHtml(note: string) {
  const quote = cleanNote(note) || "Custom cut-to-size order";

  return emailShell("Your PlasticOnline quote is ready to order", `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.2;">Your quote is ready.</h1>
    <p style="margin:0 0 32px;font-size:15px;color:#777777;line-height:1.6;">Rex has put this together for you — lock it in when you're ready.</p>

    <!-- Quote card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:#fafafa;border:1px solid #ebebeb;border-left:5px solid #e13f00;border-radius:8px;padding:22px 24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1.5px;">Your Quote</p>
          <p style="margin:0;font-size:15px;font-weight:500;color:#1a1a1a;line-height:1.9;">${quote}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      Ready to order? Head to the shop, add your item to cart, and we'll have it cut and dispatched within a few business days.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      Need a different size, thickness, or material? Just reply directly to this email and we'll re-quote in seconds.
    </p>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="background:#e13f00;border-radius:50px;mso-padding-alt:0;">
          <a href="${SHOP_URL}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.4px;border-radius:50px;">Place Your Order &rarr;</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="border-top:1px solid #ebebeb;"></td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#999999;line-height:1.9;">
      Questions? Call <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:600;">(07) 5564 6744</a>
      or <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">get in touch online</a>.
      We're here Mon–Fri, 7:30am–4:00pm.
    </p>
  `);
}

/* ── Follow-up email (22hrs later) ── */
function followUpEmailHtml(note: string) {
  const quote = cleanNote(note) || "Your custom cut-to-size order";

  return emailShell("Still need that plastic cut? Your quote is waiting.", `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.2;">Still need that plastic cut?</h1>
    <p style="margin:0 0 32px;font-size:15px;color:#777777;line-height:1.6;">Hey, Rex here — just following up on your quote from yesterday.</p>

    <!-- Quote card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:#fafafa;border:1px solid #ebebeb;border-left:5px solid #e13f00;border-radius:8px;padding:22px 24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1.5px;">Your Quote</p>
          <p style="margin:0;font-size:15px;font-weight:500;color:#1a1a1a;line-height:1.9;">${quote}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      Everything is in stock and ready to cut. Your order will be dispatched within a few business days from our Gold Coast warehouse.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      Size changed? Different material? Just reply to this email — happy to re-quote straight away.
    </p>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="background:#e13f00;border-radius:50px;mso-padding-alt:0;">
          <a href="${SHOP_URL}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.4px;border-radius:50px;">Complete Your Order &rarr;</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="border-top:1px solid #ebebeb;"></td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#999999;line-height:1.9;">
      Not ready yet? No worries at all.
      <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">Get in touch</a> when the time is right,
      or call us on <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:600;">(07) 5564 6744</a>.
    </p>
  `);
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

  // Each message is a full-width block — no two-column layout
  const transcriptHtml = transcript
    ? transcript.split("\n\n").map(block => {
        const isRex = block.startsWith("Rex:");
        const label = isRex ? "Rex" : "Customer";
        const labelColour = isRex ? "#e13f00" : "#1a1a1a";
        const bg = isRex ? "#fff8f6" : "#f8f8f8";
        const border = isRex ? "#e13f00" : "#cccccc";
        const content = block.replace(/^(Rex|Customer):\s*/, "").replace(/\n/g, "<br>");
        return `
          <tr><td style="padding:4px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 0 5px;">
                <span style="font-size:11px;font-weight:800;color:${labelColour};text-transform:uppercase;letter-spacing:1px;">${label}</span>
              </td></tr>
              <tr><td style="background:${bg};border:1px solid ${border}20;border-left:3px solid ${border};border-radius:0 8px 8px 0;padding:12px 16px;">
                <p style="margin:0;font-size:14px;color:#2a2a2a;line-height:1.8;">${content}</p>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="height:10px;font-size:0;"></td></tr>`;
      }).join("")
    : `<tr><td style="padding:16px;color:#999;font-size:13px;font-style:italic;">No transcript available</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body,table,td,p,a{-webkit-text-size-adjust:100%;}body{margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}</style>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:24px 36px 20px;border-radius:16px 16px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <img src="${LOGO_URL}" width="160" alt="PlasticOnline" style="display:block;max-width:160px;height:auto;">
        </td>
        <td align="right" style="vertical-align:middle;">
          <p style="margin:0;font-size:11px;color:#666666;line-height:1.8;">Rex Chat Lead &nbsp;·&nbsp; ${timeStr} AEST</p>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#e13f00;height:5px;font-size:0;line-height:0;"></td></tr>

  <!-- Alert band -->
  <tr><td style="background:#ffffff;padding:20px 36px 0;">
    <p style="margin:0;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1.5px;">New Lead from Rex Widget</p>
  </td></tr>

  <!-- Customer card -->
  <tr><td style="background:#ffffff;padding:16px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebeb;border-radius:10px;overflow:hidden;">
      <tr><td colspan="2" style="background:#f8f8f8;padding:10px 16px;border-bottom:1px solid #ebebeb;">
        <p style="margin:0;font-size:11px;font-weight:800;color:#888888;text-transform:uppercase;letter-spacing:1px;">Customer Details</p>
      </td></tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;">Email</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:700;border-bottom:1px solid #f2f2f2;"><a href="mailto:${email}" style="color:#e13f00;text-decoration:none;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;background:#fafafa;">Mobile</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f2f2f2;background:#fafafa;">${mobile || "<span style='color:#bbb;font-style:italic;'>Not provided</span>"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;white-space:nowrap;">Despatch</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;">${despatchLabel}</td>
      </tr>
    </table>
  </td></tr>

  ${analysis ? `
  <!-- Quote card -->
  <tr><td style="background:#ffffff;padding:16px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebeb;border-radius:10px;overflow:hidden;">
      <tr><td colspan="2" style="background:#fff8f6;padding:10px 16px;border-bottom:1px solid #fde0d8;">
        <p style="margin:0;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1px;">Quote Summary</p>
      </td></tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;vertical-align:top;">Details</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;line-height:1.8;border-bottom:1px solid #f2f2f2;">${analysis.quoteDetails.replace(/\n/g, "<br>")}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;background:#fafafa;">Price</td>
        <td style="padding:12px 16px;font-size:17px;font-weight:800;color:#e13f00;border-bottom:1px solid #f2f2f2;background:#fafafa;">${analysis.price}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;vertical-align:top;white-space:nowrap;">Summary</td>
        <td style="padding:12px 16px;font-size:14px;color:#3e3e3e;line-height:1.8;">${analysis.summary}</td>
      </tr>
    </table>
  </td></tr>
  ` : note ? `
  <tr><td style="background:#ffffff;padding:16px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebeb;border-left:4px solid #e13f00;border-radius:8px;">
      <tr><td style="padding:14px 18px;font-size:14px;color:#1a1a1a;line-height:1.8;">${note}</td></tr>
    </table>
  </td></tr>
  ` : ""}

  <!-- Transcript -->
  <tr><td style="background:#ffffff;padding:16px 36px 28px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#888888;text-transform:uppercase;letter-spacing:1px;">Full Conversation</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${transcriptHtml}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1a1a1a;padding:18px 36px;border-radius:0 0 16px 16px;">
    <p style="margin:0;font-size:11px;color:#555555;">Rex AI Chat Widget &nbsp;·&nbsp; PlasticOnline &nbsp;·&nbsp; <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;">plasticonline.com.au</a></p>
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

    // 3. Team notification — reply-to set to customer so hitting Reply goes straight to them
    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: TEAM_EMAIL,
        replyTo: email ?? undefined,
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
