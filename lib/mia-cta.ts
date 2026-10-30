/**
 * Mia's call-to-action ladder: free AI score → Blueprint → websites → call with Shane.
 * Labels and price hints come from lib/mia-offers.ts (single source).
 * Every link carries UTM tags plus the chat session id (utm_term) so a score,
 * purchase or Calendly booking can be tied back to the conversation.
 */
import { GST } from "@/lib/entity";
import { LINKS, WEBSITE_PLANS } from "./mia-offers";
import { TIERS } from "./blueprint";
import { formatAud } from "./money";

export const CTA_STEPS = ["score", "blueprint", "websites", "call"] as const;
export type CtaStep = (typeof CTA_STEPS)[number];

export function isCtaStep(v: unknown): v is CtaStep {
  return typeof v === "string" && (CTA_STEPS as readonly string[]).includes(v);
}

const aud = formatAud;

export const CTA_META: Record<CtaStep, { label: string; sub: string; base: string }> = {
  score: { label: "Get my free AI score", sub: "Free · about 3 minutes", base: LINKS.score },
  blueprint: {
    label: "See the Blueprint",
    sub: `From ${TIERS.starter.priceLabel} · ${GST.short} · credited toward a build`,
    base: LINKS.blueprint,
  },
  websites: {
    label: "See website plans",
    sub: `From ${aud(WEBSITE_PLANS[0].build)} + ${aud(WEBSITE_PLANS[0].monthly)}/mo care · ${GST.short}`,
    base: LINKS.websites,
  },
  call: { label: "Book a call with Shane", sub: "Free · 30 minutes · No obligation", base: LINKS.booking },
};

/** Tracked link for a step. `page` is the path the chat was on, `sid` the chat session id. */
export function ctaHref(step: CtaStep, opts: { page?: string; sid?: string } = {}): string {
  const u = new URL(CTA_META[step].base);
  u.searchParams.set("utm_source", "mia");
  u.searchParams.set("utm_medium", "chat");
  u.searchParams.set("utm_campaign", `mia_${step}`);
  if (opts.page) u.searchParams.set("utm_content", opts.page.slice(0, 100));
  if (opts.sid) u.searchParams.set("utm_term", opts.sid.slice(0, 64));
  return u.toString();
}

/** Short random id for this browser session's chat. */
export function newSessionId(): string {
  const a = new Uint8Array(8);
  globalThis.crypto.getRandomValues(a);
  return "mia_" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
