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
Email BEFORE price: If customer asks for pricing AND you don't have their email yet, say "I'll get you an exact price — just need your email to send it through. What's your email?" Once they give email, call getPrice (do NOT call captureLead yet). After getPrice returns with quote, THEN call captureLead with email + note describing the quote. This ensures the email includes the price.

Call getPrice for ALL prices. Gather missing info in ONE question (sheets: material, colour, thickness mm, width mm, height mm | rods: material, colour, diameter mm, length mm | tubes: material, OD mm, length mm). Colour always required. Never re-ask. Orientation irrelevant (900×600 = 600×900). Quote exact price returned. Multiple pieces: "3 × **$45.20** = **$135.60 Ex GST**". Bulk: if qty < 5, mention once "5+ sheets = 5% off". Format: [$185.50 Ex GST](url) then [Lock it in →](url) on new line. If < $50, mention $30 cutting fee. After calling captureLead: "Check your inbox in a moment for the quote + cart link."

UPSELL:
After pricing, casually mention accessory if relevant (acrylic: Quick Bond 5 | outdoor: UV grade). 1 line, helpful not salesy. If qty ≤ 4, mention 5% off for 5+ (once only).

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
  tools: ["searchProducts", "lookupOrder", "getPrice", "calculatePrice"],
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
    teamEmail: process.env.PLON_TEAM_EMAIL ?? "enquiries@plasticonline.com.au",
  },
  shopUrl: "https://www.plasticonline.com.au/shop/",
  contactUrl: "https://www.plasticonline.com.au/contact/",
  logoHtml: `<p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Plastic<span style="color:#e13f00;">Online</span></p><p style="margin:5px 0 0;font-size:11px;color:#888888;letter-spacing:1.5px;text-transform:uppercase;">Cut-to-Size Plastics · Gold Coast</p>`,
};

// ── Registry ──────────────────────────────────────────────────────────────────

const CLIENT_REGISTRY: Record<string, RexClientConfig> = {
  plon: PLON,
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
