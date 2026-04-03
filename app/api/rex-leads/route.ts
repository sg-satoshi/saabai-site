import { Resend } from "resend";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { trackLead, extractMaterial, parsePriceValue } from "../../../lib/rex-stats";
import type { CheckoutData } from "../../../lib/url-generator";

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

// Map keywords in quote note → product page URL
const PRODUCT_URLS: Array<[RegExp, string]> = [
  [/acrylic mirror|eurom(i|ir)/i,       "https://www.plasticonline.com.au/product/euromir-acrylic-mirror/"],
  [/mirror/i,                            "https://www.plasticonline.com.au/product/silver-gold-commercial-acrylic-mirror/"],
  [/acrylic.*rod|rod.*acrylic/i,         "https://www.plasticonline.com.au/product/acrylic-clear-rod/"],
  [/acrylic.*tube|tube.*acrylic/i,       "https://www.plasticonline.com.au/product/acrylic-clear-tubes/"],
  [/acrylic/i,                           "https://www.plasticonline.com.au/product/acrylic-sheet/"],
  [/polycarbonate.*rod/i,                "https://www.plasticonline.com.au/product/polycarbonate-tube/"],
  [/polycarbonate.*tube/i,               "https://www.plasticonline.com.au/product/polycarbonate-tube/"],
  [/polycarbonate|perspex pc/i,          "https://www.plasticonline.com.au/product/polycarbonate-sheet/"],
  [/seaboard|marine.*hdpe/i,             "https://www.plasticonline.com.au/product/seaboard-hdpe-marine-grade/"],
  [/playground.*hdpe|hdpe.*playground/i, "https://www.plasticonline.com.au/product/hdpe-playground-board/"],
  [/hdpe.*rod|rod.*hdpe/i,               "https://www.plasticonline.com.au/product/hdpe-high-density-polyethylene-rod/"],
  [/hdpe|polyethylene|cutting board/i,   "https://www.plasticonline.com.au/product/hdpe-polyethylene-cutting-board/"],
  [/uhmwpe.*rod/i,                       "https://www.plasticonline.com.au/product/uhmwpe-rod-natural-only-white/"],
  [/uhmwpe/i,                            "https://www.plasticonline.com.au/product/uhmwpe-sheet/"],
  [/acetal.*rod|pom.*rod/i,              "https://www.plasticonline.com.au/product/acetal-rod/"],
  [/acetal|pom/i,                        "https://www.plasticonline.com.au/product/acetal-pom-c-plastic-sheet/"],
  [/nylon.*rod/i,                        "https://www.plasticonline.com.au/product/nylon-rod/"],
  [/nylon/i,                             "https://www.plasticonline.com.au/product/nylon-sheet/"],
  [/ptfe.*rod|teflon.*rod/i,             "https://www.plasticonline.com.au/product/ptfe-teflon-virgin-rod/"],
  [/ptfe|teflon/i,                       "https://www.plasticonline.com.au/product/ptfe-teflon-sheet/"],
  [/peek.*rod/i,                         "https://www.plasticonline.com.au/product/peek-rod/"],
  [/peek/i,                              "https://www.plasticonline.com.au/product/peek-polyether-ether-ketone-sheet/"],
  [/pvc.*rod/i,                          "https://www.plasticonline.com.au/product/grey-pvc-rod/"],
  [/foam.*pvc|pvc.*foam/i,               "https://www.plasticonline.com.au/product/foam-pvc/"],
  [/pvc/i,                               "https://www.plasticonline.com.au/product/pvc-sheet/"],
  [/polypropylene.*rod|pp.*rod/i,        "https://www.plasticonline.com.au/product/polypropylene-pp-rod/"],
  [/polypropylene|pp sheet/i,            "https://www.plasticonline.com.au/product/polypropylene/"],
  [/petg/i,                              "https://www.plasticonline.com.au/product/petg-polyethylene-terephthalate-glycol-modified-sheet/"],
  [/abs/i,                               "https://www.plasticonline.com.au/product/abs-sheet/"],
  [/hips/i,                              "https://www.plasticonline.com.au/product/hips-sheet/"],
  [/corflute/i,                          "https://www.plasticonline.com.au/product/corflute-corragatted-flute-board/"],
  [/acm|acp|aluminium composite/i,       "https://www.plasticonline.com.au/product/acm/"],
];

function resolveProductUrl(text: string): string {
  for (const [pattern, url] of PRODUCT_URLS) {
    if (pattern.test(text)) return url;
  }
  return SHOP_URL;
}

const LOGO_HTML = `<p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Plastic<span style="color:#e13f00;">Online</span></p><p style="margin:5px 0 0;font-size:11px;color:#888888;letter-spacing:1.5px;text-transform:uppercase;">Cut-to-Size Plastics · Gold Coast</p>`;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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
          ${LOGO_HTML}
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
          <p style="margin:0;font-size:11px;color:#444444;">Questions? Reply to this email.</p>
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

/**
 * Extract cart URL from Rex's last message (looks for Lock it in → links)
 */
function extractCartUrl(note: string): string | null {
  // Match markdown link format: [Lock it in →](url) or [anytext](url)  
  const match = note.match(/\[(?:Lock it in|Add to cart|View product)[^\]]*\]\((https?:\/\/[^)]+)\)/i);
  return match ? match[1] : null;
}

/**
 * Enhance a cart/product URL with checkout pre-fill parameters
 */
function enhanceUrlWithCheckout(baseUrl: string, customerData: CheckoutData): string {
  try {
    const url = new URL(baseUrl);
    
    // Parse name into first/last
    if (customerData.name) {
      const parts = customerData.name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      if (firstName) url.searchParams.set("billing_first_name", firstName);
      if (lastName) url.searchParams.set("billing_last_name", lastName);
    }
    
    if (customerData.email) url.searchParams.set("billing_email", customerData.email);
    if (customerData.phone) url.searchParams.set("billing_phone", customerData.phone);
    
    // Parse address (format: "123 Main St, Brisbane, QLD, 4000")
    if (customerData.address) {
      const parts = customerData.address.split(",").map(s => s.trim());
      if (parts[0]) url.searchParams.set("billing_address_1", parts[0]);
      if (parts[1]) url.searchParams.set("billing_city", parts[1]);
      if (parts[2]) url.searchParams.set("billing_state", parts[2]);
      if (parts[3]) url.searchParams.set("billing_postcode", parts[3]);
    }
    
    // Set shipping method
    if (customerData.deliveryMethod === "pickup") {
      url.searchParams.set("shipping_method", "local_pickup");
    } else if (customerData.deliveryMethod === "delivery") {
      url.searchParams.set("shipping_method", "flat_rate");
    }
    
    // Keep as cart URL - WooCommerce will add item, then billing params persist to checkout
    // Do NOT redirect to /checkout here - breaks add-to-cart functionality
    
    return url.toString();
  } catch {
    return baseUrl; // Fall back to original URL if parsing fails
  }
}

/* ── Customer quote email ── */
function quoteEmailHtml(note: string, analysis: ConversationAnalysis | null, name?: string, customerData?: CheckoutData) {
  const quote = cleanNote(note) || "Custom cut-to-size order";
  let productUrl = resolveProductUrl(analysis?.quoteDetails ?? quote);
  
  // If we have customer data and can extract cart URL from note, enhance it with checkout params
  const cartUrl = extractCartUrl(note);
  if (cartUrl && customerData && (customerData.name || customerData.email)) {
    productUrl = enhanceUrlWithCheckout(cartUrl, customerData);
  }
  
  const price = analysis?.price && analysis.price !== "Not quoted" ? analysis.price : extractPrice(note);
  const quoteDetails = analysis?.quoteDetails && analysis.quoteDetails !== "No quote provided"
    ? analysis.quoteDetails
    : quote;

  return emailShell("Your PlasticOnline quote is ready to order", `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.2;">${name ? `Hey ${escapeHtml(name.trim().split(/\s+/)[0] || name.trim())}, your quote is ready.` : "Your quote is ready."}</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#777777;line-height:1.6;">Lock it in when you're ready — we'll cut and dispatch within a few business days.</p>

    <!-- Quote card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#fafafa;border:1px solid #ebebeb;border-left:5px solid #e13f00;border-radius:8px;padding:22px 24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1.5px;">Your Quote</p>
          <p style="margin:0 0 ${price ? "12px" : "0"};font-size:15px;font-weight:500;color:#1a1a1a;line-height:1.9;">${quoteDetails.replace(/\n/g, "<br>")}</p>
          ${price ? `<p style="margin:0;font-size:22px;font-weight:800;color:#e13f00;letter-spacing:-0.5px;">${price}</p>` : ""}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 28px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      ${customerData && (customerData.name || customerData.email) 
        ? "Your details are pre-filled at checkout — we'll add it to your cart, then you just confirm and you're done." 
        : "Size or material changed? Just reply to this email and we'll re-quote straight away."}
    </p>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="background:#e13f00;border-radius:50px;mso-padding-alt:0;">
          <a href="${productUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.4px;border-radius:50px;">${customerData && (customerData.name || customerData.email) ? "Add to Cart & Checkout" : "Place Your Order"} &rarr;</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="border-top:1px solid #ebebeb;"></td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#999999;line-height:1.9;">
      Questions? Call <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:600;">(07) 5564 6744</a>
      or <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">get in touch online</a>.
      Mon–Fri 7:30am–4:00pm AEST.
    </p>
  `);
}

/* ── Follow-up email (22hrs later) ── */
function followUpEmailHtml(note: string, analysis: ConversationAnalysis | null, name?: string, customerData?: CheckoutData) {
  const quote = cleanNote(note) || "Your custom cut-to-size order";
  let productUrl = resolveProductUrl(analysis?.quoteDetails ?? quote);
  
  // If we have customer data and can extract cart URL from note, enhance it with checkout params
  const cartUrl = extractCartUrl(note);
  if (cartUrl && customerData && (customerData.name || customerData.email)) {
    productUrl = enhanceUrlWithCheckout(cartUrl, customerData);
  }
  
  const price = analysis?.price && analysis.price !== "Not quoted" ? analysis.price : extractPrice(note);
  const quoteDetails = analysis?.quoteDetails && analysis.quoteDetails !== "No quote provided"
    ? analysis.quoteDetails
    : quote;

  return emailShell("Still need that plastic cut? Your quote is waiting.", `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.2;">${name ? `Hey ${escapeHtml(name.trim().split(/\s+/)[0] || name.trim())}, still need that cut?` : "Still need that plastic cut?"}</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#777777;line-height:1.6;">Rex here — just checking in on your quote from yesterday.</p>

    <!-- Quote card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#fafafa;border:1px solid #ebebeb;border-left:5px solid #e13f00;border-radius:8px;padding:22px 24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#e13f00;text-transform:uppercase;letter-spacing:1.5px;">Your Quote</p>
          <p style="margin:0 0 ${price ? "12px" : "0"};font-size:15px;font-weight:500;color:#1a1a1a;line-height:1.9;">${quoteDetails.replace(/\n/g, "<br>")}</p>
          ${price ? `<p style="margin:0;font-size:22px;font-weight:800;color:#e13f00;letter-spacing:-0.5px;">${price}</p>` : ""}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 28px;font-size:15px;color:#3e3e3e;line-height:1.9;">
      ${customerData && (customerData.name || customerData.email)
        ? "Everything's in stock. We'll add it to your cart and your checkout is pre-filled — just confirm and you're done."
        : "Everything's in stock. Just <a href=\"" + productUrl + "\" style=\"color:#e13f00;font-weight:700;text-decoration:none;\">place your order online</a> or reply here if anything's changed."}
    </p>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="background:#e13f00;border-radius:50px;mso-padding-alt:0;">
          <a href="${productUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.4px;border-radius:50px;">${customerData && (customerData.name || customerData.email) ? "Add to Cart & Checkout" : "Complete Your Order"} &rarr;</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="border-top:1px solid #ebebeb;"></td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#999999;line-height:1.9;">
      Not ready yet? No worries.
      <a href="${CONTACT_URL}" style="color:#e13f00;text-decoration:none;font-weight:600;">Get in touch</a> when the time's right,
      or call <a href="tel:0755646744" style="color:#e13f00;text-decoration:none;font-weight:600;">(07) 5564 6744</a>.
    </p>
  `);
}

function teamNotificationHtml(
  name: string | undefined,
  email: string,
  note: string,
  source: string,
  mobile: string | undefined,
  address: string | undefined,
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
          ${LOGO_HTML}
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
      ${name ? `<tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;">Name</td>
        <td style="padding:12px 16px;font-size:15px;font-weight:800;color:#1a1a1a;border-bottom:1px solid #f2f2f2;">${escapeHtml(name)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;">Email</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:700;border-bottom:1px solid #f2f2f2;"><a href="mailto:${email}" style="color:#e13f00;text-decoration:none;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;background:#fafafa;">Mobile</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f2f2f2;background:#fafafa;">${mobile || "<span style='color:#bbb;font-style:italic;'>Not provided</span>"}</td>
      </tr>
      ${address ? `<tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#888888;width:100px;border-bottom:1px solid #f2f2f2;white-space:nowrap;">Address</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f2f2f2;">${escapeHtml(address)}</td>
      </tr>` : ""}
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
    const { source, name, email, note, mobile, address, despatch, messages, timestamp } = await req.json();

    // Build transcript and run AI analysis upfront (used in team email)
    const transcript = messages && messages.length > 0 ? formatTranscript(messages) : "";
    const analysis = transcript ? await analyseConversation(transcript) : null;

    // Track to Redis (fire and forget — never blocks response)
    const priceStr = analysis?.price && analysis.price !== "Not quoted" ? analysis.price : extractPrice(note ?? "") ?? undefined;
    trackLead({
      timestamp: timestamp ?? new Date().toISOString(),
      source:    source ?? "unknown",
      name:      name ?? undefined,
      email:     email ?? undefined,
      price:     priceStr,
      priceValue: priceStr ? parsePriceValue(priceStr) : undefined,
      material:  extractMaterial(analysis?.quoteDetails ?? note ?? "") ?? undefined,
      despatch:  despatch ?? undefined,
    }).catch(() => {});

    // Build subject line from analysis or fallback to note price
    const fallbackPrice = extractPrice(note ?? "");
    const price = analysis?.price && analysis.price !== "Not quoted" ? analysis.price : fallbackPrice;
    const productSnippet = analysis?.quoteDetails && analysis.quoteDetails !== "No quote provided"
      ? analysis.quoteDetails.split("\n")[0].slice(0, 60)
      : note?.slice(0, 60) ?? "Enquiry";
    const leadName: string | null = name ?? null;
    const displayName = leadName ? `${leadName} (${email ?? "anonymous"})` : (email ?? "anonymous");
    const teamSubject = price
      ? `Rex Lead: ${displayName} — ${productSnippet} — ${price}`
      : `Rex Lead: ${displayName} — ${productSnippet}`;

    // Build customer data for checkout pre-fill (if available)
    const customerData: CheckoutData | undefined = (name || email || mobile || address) ? {
      name: name ?? undefined,
      email: email ?? undefined,
      phone: mobile ?? undefined,
      address: address ?? undefined,
      deliveryMethod: despatch === "pickup" ? "pickup" : despatch === "delivery" ? "delivery" : undefined,
    } : undefined;

    const tasks: Promise<unknown>[] = [];

    if (email) {
      // 1. Immediate quote email to customer (with one-click checkout if data available)
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Your quote from Rex at PlasticOnline",
          html: quoteEmailHtml(note ?? "", analysis, leadName ?? undefined, customerData),
        })
      );

      // 2. Follow-up email — 22 hours later (with one-click checkout if data available)
      const followUpAt = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Still need that plastic cut? Your quote is ready",
          html: followUpEmailHtml(note ?? "", analysis, leadName ?? undefined, customerData),
          scheduledAt: followUpAt,
        } as Parameters<typeof resend.emails.send>[0])
      );
    }

    // 3. Team notification — From is set to the customer's name so Pipedrive identifies the contact,
    //    Reply-To is the customer's actual email so hitting Reply goes straight to them.
    const teamFrom = email && leadName
      ? `${leadName} via Rex <rex@plasticonline.com.au>`
      : email
      ? `${email} via Rex <rex@plasticonline.com.au>`
      : FROM_EMAIL;
    tasks.push(
      resend.emails.send({
        from: teamFrom,
        to: TEAM_EMAIL,
        replyTo: email ? [email] : undefined,
        subject: teamSubject,
        html: teamNotificationHtml(leadName ?? undefined, email ?? "unknown", note ?? "", source ?? "unknown", mobile, address, despatch, analysis, transcript),
      })
    );

    // 4. Make.com webhook (if configured)
    if (process.env.LEAD_WEBHOOK_URL) {
      tasks.push(
        fetch(process.env.LEAD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source:       source ?? "rex",
            email,
            name,
            mobile:       mobile ?? null,
            address:      address ?? null,
            despatch:     despatch ?? null,
            note,
            timestamp,
            quoteDetails: analysis?.quoteDetails ?? null,
            price:        analysis?.price ?? null,
            priceParsed:  priceStr ? parsePriceValue(priceStr) : null,
            material:     extractMaterial(analysis?.quoteDetails ?? note ?? "") ?? null,
            summary:      analysis?.summary ?? null,
            transcript,
          }),
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
