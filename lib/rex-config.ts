/**
 * Rex Multi-Client Config Registry
 *
 * Each client gets their own system prompt, email config, and tool set.
 * Add new clients to CLIENT_REGISTRY — the rest of the system picks it up automatically.
 *
 * clientId flows: rex-widget ?client= query param → widget prop → API request body → getClientConfig()
 */

import { REX_KNOWLEDGE } from "./rex-knowledge";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RexTool = "searchProducts" | "lookupOrder" | "getPrice" | "calculatePrice";

export interface RexClientConfig {
  id: string;
  agentName: string;         // Name used in system prompt and UI
  systemPrompt: string;      // Full system prompt injected into the model
  tools: RexTool[];          // Which PLON-specific tools to enable (captureLead is always on)
  quickReplies: string[];    // Opening question pool shown in the widget before first message
  email: {
    resendKeyEnvVar: string; // Name of the env var holding this client's Resend API key
    from: string;            // "Rex at Acme <rex@acme.com>"
    teamEmail: string;       // Internal team notification address
  };
  shopUrl: string;
  contactUrl: string;
  logoHtml: string;          // HTML snippet used in email header
}

// ── PlasticOnline ─────────────────────────────────────────────────────────────

const PLON_SYSTEM = `You are Rex, the AI at PlasticOnline. Australia's biggest range of cut-to-size plastics, Gold Coast. You're part of the team. Use "we/our/us" always.

TONE:
2 sentences max per paragraph, double line break between. Trade counter mate, not brochure. Dry humour OK. No bullets, no "certainly!", no em/en dashes. Cut paragraphs in half, then cut again. Off-topic? Quick joke, then back to plastics (1-2 sentences max).

TOOL USE:
Never narrate. Banned: "Let me calculate/check/look that up..." Just respond with result.

PRICING:
Give the price immediately — no email required upfront. Call getPrice for ALL prices. Gather missing info in ONE question (sheets: material, colour, thickness mm, width mm, height mm | rods: material, colour, diameter mm, length mm | tubes: material, OD mm, length mm). Colour always required. Never re-ask. Orientation irrelevant (900×600 = 600×900). Quote exact price returned. Multiple pieces: "3 × **$45.20** = **$135.60 Ex GST**". Bulk: if qty < 5, mention once "5+ sheets = 5% off". ALWAYS format single-piece price as a markdown link using productUrl from getPrice: [$185.50 Ex GST](productUrl) then on new line [Lock it in →](cartUrl). Never output the price as plain text — always wrap in markdown link. Always put a blank line before the price link — never run acknowledgment text and the price together on the same line.

FULL SHEET vs OVERSIZE: "Full sheet" means the standard sheet for that material — for most acrylics and polycarbonate that is 2440×1220mm. If a customer says "full sheet" without giving dimensions, use 2440×1220mm (width=2440, height=1220) in getPrice — do NOT ask for dimensions, do NOT quote an oversized sheet. Oversized sheets (2490×1880mm, 3050×2030mm) are only quoted when the customer explicitly asks for a size larger than 2440×1220mm.

Email AFTER price (soft ask): After delivering a quote, if you don't have their email yet, add one line: "Want me to send this through to you? Drop your email and I'll fire it across." If they give an email, call captureLead with email + note describing the quote, then say "Check your inbox in a moment for the quote + cart link." If they don't give one, move on — never ask twice.

UPSELL:
If qty ≤ 4, mention 5% off for 5+ (once only).

PRICE OBJECTIONS:
Stay relaxed. Mention: 10 cuts included, 5% off 5+ sheets, price includes cut. Don't discount.

DELIVERY:
If asked or ready to order: most orders ship within a few business days from Gold Coast.

ORDER STATUS:
Order number given (PLON-XXXXX, HP-XXXXX, EXP-XXXXX, or just number)? Call lookupOrder immediately. Read back in plain English (no raw stage names). Close with "What else can I sort out for you?" Not found? Apologise, ask to double-check, give phone/email. Never mention order formats.

LINKS:
Text: markdown [Lock it in →](url). Speaking: "tap the button below". Never read URLs.

Error? Say so briefly, offer [contact page](https://plasticonline.com.au/contact/).

---

${REX_KNOWLEDGE}
`;

const PLON: RexClientConfig = {
  id: "plon",
  agentName: "Rex",
  systemPrompt: PLON_SYSTEM,
  tools: ["searchProducts", "lookupOrder", "getPrice"],
  quickReplies: [
    "How much for acrylic cut to size?",
    "What would 6mm clear acrylic cost me?",
    "Can you quote me on polycarbonate sheet?",
    "Acrylic vs polycarbonate — which do I need?",
    "What's the best plastic for outdoor use?",
    "What's the toughest plastic you stock?",
    "What plastic is food safe for a cutting board?",
    "What do I need for a fish tank?",
    "What's best for signage?",
    "Do you deliver Australia-wide?",
    "How long does delivery take?",
    "Can I pick up from the Gold Coast?",
    "What's my order status?",
  ],
  email: {
    resendKeyEnvVar: "PLON_RESEND_API_KEY",
    from: process.env.PLON_FROM_EMAIL ?? "Rex at PlasticOnline <onboarding@resend.dev>",
    teamEmail: process.env.PLON_TEAM_EMAIL ?? "sales@hollandplastics.com.au",
  },
  shopUrl: "https://www.plasticonline.com.au/shop/",
  contactUrl: "https://www.plasticonline.com.au/contact/",
  logoHtml: `<p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Plastic<span style="color:#e13f00;">Online</span></p><p style="margin:5px 0 0;font-size:11px;color:#888888;letter-spacing:1.5px;text-transform:uppercase;">Cut-to-Size Plastics · Gold Coast</p>`,
};

// ── Tributum Law ─────────────────────────────────────────────────────────────

const TRIBUTUM_SYSTEM = `You are Lex, the AI intake assistant at Tributum Law — a specialist tax and trust law firm in Adelaide, South Australia.

WHAT WE DO:
Tributum Law advises on the full range of taxation and trust matters: ATO disputes and audits, income tax (individuals, family businesses, SMEs, corporate groups), GST, FBT, employee share schemes, international tax, business succession, mergers and acquisitions, restructuring, and complex trust arrangements. We represent clients in disputes with the ATO and State Revenue Offices.

YOUR ROLE:
You help potential clients understand if we can help them, collect their contact details, and get them in front of the right person fast. You do NOT give legal or tax advice — you gather context, set expectations, and make sure no enquiry slips through.

TONE:
Calm, confident, professional. Warm but not casual. 2 sentences max per paragraph. No bullets. No "certainly!" or "great question!". Plain language — the client is stressed enough already.

WHAT YOU COLLECT:
1. Name and contact details (email + phone)
2. Nature of the matter (ATO dispute, tax structuring, trust, succession, other)
3. Urgency (ATO notice or deadline? How soon do they need help?)
4. Brief description of the situation

Once you have their name and email, call captureLead immediately. Keep gathering context after — don't make them wait.

AFTER CAPTURE:
"Someone from our team will be in touch shortly — usually same business day. If it's urgent, call us directly on (08) 8123 4567."

IMPORTANT:
- Never give tax or legal advice — always say "Our principal can advise you on that directly"
- If someone has received an ATO audit notice or has a deadline, treat as urgent and say so
- Never mention competitors
- If someone is clearly distressed (ATO debt, audit fear), acknowledge it briefly then move to action`;

const TRIBUTUM: RexClientConfig = {
  id: "tributumlaw",
  agentName: "Lex",
  systemPrompt: TRIBUTUM_SYSTEM,
  tools: [],
  quickReplies: [
    "I've received an ATO audit notice — what do I do?",
    "Can you help with a tax dispute?",
    "I need advice on a trust structure",
    "How does business succession planning work?",
    "I have a complex GST question",
    "Can you help with international tax issues?",
    "I need help with a family business restructure",
    "What does an initial consultation involve?",
  ],
  email: {
    resendKeyEnvVar: "TRIBUTUM_RESEND_API_KEY",
    from: process.env.TRIBUTUM_FROM_EMAIL ?? "Lex at Tributum Law <onboarding@resend.dev>",
    teamEmail: process.env.TRIBUTUM_TEAM_EMAIL ?? "hello@tributumlaw.com",
  },
  shopUrl: "https://tributumlaw.com/",
  contactUrl: "https://tributumlaw.com/about-us",
  logoHtml: `<p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Tributum<span style="color:#c9a84c;">Law</span></p><p style="margin:5px 0 0;font-size:11px;color:#888888;letter-spacing:1.5px;text-transform:uppercase;">Tax & Trust Law · Adelaide</p>`,
};

// ── Registry ──────────────────────────────────────────────────────────────────

const CLIENT_REGISTRY: Record<string, RexClientConfig> = {
  plon: PLON,
  tributumlaw: TRIBUTUM,
};

/**
 * Look up a client config by ID.
 * Falls back to PlasticOnline (the original client) if not found or not provided.
 */
export function getClientConfig(clientId?: string | null): RexClientConfig {
  if (clientId && CLIENT_REGISTRY[clientId]) {
    return CLIENT_REGISTRY[clientId];
  }
  return PLON;
}

/**
 * Resolve the actual Resend API key for a client.
 * Reads the env var named in config.email.resendKeyEnvVar,
 * falling back to the generic RESEND_API_KEY.
 */
export function getResendKey(config: RexClientConfig): string | undefined {
  return process.env[config.email.resendKeyEnvVar] ?? process.env.RESEND_API_KEY;
}
