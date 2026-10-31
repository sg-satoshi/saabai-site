/**
 * Conversion playbook for client chatbots: Mia's best features plus proven chat tactics,
 * each a per-bot toggle. Defaults are tasteful: nothing pops up or nags unless switched on.
 *
 * Guardrails (tests check these):
 * - no fake scarcity or countdowns: an offer only shows with a real end date that is in the future
 * - testimonials are client-provided and quoted word for word, never invented
 * - review invites are offered to every existing client at a natural moment, never only to
 *   happy ones (Google and ACCC prohibit review gating)
 * - follow-up email needs ticked consent (Spam Act) and the lead-capture flag
 * - nudges: once per page view, at most NUDGE_CAP per visitor per 7 days, always dismissible
 */
import { cleanText, ctaUrl, looksLikeInjection } from "./goal";

export interface Opener { match: string; text: string }
export interface Testimonial { quote: string; name: string }

export interface EngageConfig {
  /** End chat and New chat buttons in the header. */
  endChat: boolean;
  /** "Want a copy of this chat?" email capture at the end. Also needs the lead-capture flag. */
  emailCopy: boolean;
  /** Client can read transcripts in their portal. */
  transcripts: boolean;
  /** Page-aware opener bubbles: match is a path prefix like /pricing. */
  openers: Opener[];
  exitIntent: boolean;
  /** Seconds before an idle nudge, 0 = off. */
  idleSeconds: number;
  /** Scroll depth (percent) before a nudge, 0 = off. */
  scrollPercent: number;
  /** Lead magnet: value first, then the ask. */
  freeOffer?: { label: string; url: string; value: string };
  /** Ask an easy button question before asking for details. */
  microCommit: boolean;
  testimonials: Testimonial[];
  /** Real offer with a real end date (YYYY-MM-DD). */
  offer?: { text: string; endsOn: string };
  /** Use the FAQ answers to handle objections. */
  objections: boolean;
  /** Greeting for a returning visitor (same browser). */
  returnGreeting?: string;
  /** Review invites for existing clients. */
  reviews: { enabled: boolean; url: string };
  /**
   * Legacy per-field lock list. Ignored. The whole-bot lock is the only lock.
   * Kept on the type so older saved configs still parse. Saves drop it.
   */
  locked?: EngageField[];
}

/** Lockable playbook settings. "nudges" covers the idle, scroll and exit nudges together. */
export const ENGAGE_FIELDS = ["endChat", "emailCopy", "transcripts", "openers", "nudges", "microCommit", "objections", "freeOffer", "testimonials", "offer", "returnGreeting", "reviews"] as const;
export type EngageField = (typeof ENGAGE_FIELDS)[number];
export const ENGAGE_FIELD_KEYS: Record<EngageField, (keyof EngageConfig)[]> = {
  endChat: ["endChat"], emailCopy: ["emailCopy"], transcripts: ["transcripts"], openers: ["openers"],
  nudges: ["idleSeconds", "scrollPercent", "exitIntent"], microCommit: ["microCommit"], objections: ["objections"],
  freeOffer: ["freeOffer"], testimonials: ["testimonials"], offer: ["offer"], returnGreeting: ["returnGreeting"], reviews: ["reviews"],
};

export const DEFAULT_ENGAGE: EngageConfig = {
  endChat: true,
  emailCopy: false,
  transcripts: true,
  openers: [],
  exitIntent: false,
  idleSeconds: 0,
  scrollPercent: 0,
  microCommit: true,
  testimonials: [],
  objections: true,
  reviews: { enabled: false, url: "" },
};

export const ENGAGE_LIMITS = { openers: 6, match: 80, opener: 120, testimonials: 5, quote: 240, name: 60, offer: 160, value: 160, label: 40, returnGreeting: 200, idleMin: 15, idleMax: 300 } as const;
export const NUDGE_CAP = 3;
export const NUDGE_WINDOW_DAYS = 7;

export function isRealDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00+10:00`));
}

/** Offer is live only with a real end date that has not passed (Brisbane end of day). */
export function liveOffer(o: EngageConfig["offer"], now = Date.now()): { text: string; endsOn: string } | null {
  if (!o || !o.text || !isRealDate(o.endsOn)) return null;
  return Date.parse(`${o.endsOn}T23:59:59+10:00`) >= now ? o : null;
}

const FAKE_URGENCY = /\b(only \d+ (left|spots?|places?)|last chance|hurry|selling fast|ends (today|tonight|soon)|limited time only|countdown)\b/i;

export function validateEngage(input: unknown): { ok: true; value: EngageConfig } | { ok: false; errors: Record<string, string> } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const L = ENGAGE_LIMITS;
  const text = (k: string, v: unknown, max: number): string => {
    if (v === undefined || v === null || v === "") return "";
    if (typeof v !== "string") { errors[k] = "Must be text."; return ""; }
    const s = cleanText(v, max);
    if (s.length > max) { errors[k] = `Max ${max} characters.`; return ""; }
    if (looksLikeInjection(s)) { errors[k] = "Plain words only. Instructions to the AI are not allowed."; return ""; }
    return s;
  };
  const bool = (k: keyof EngageConfig) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (DEFAULT_ENGAGE[k] as boolean));
  const v: EngageConfig = {
    endChat: bool("endChat"), emailCopy: bool("emailCopy"), transcripts: bool("transcripts"), exitIntent: bool("exitIntent"),
    microCommit: bool("microCommit"), objections: bool("objections"),
    idleSeconds: 0, scrollPercent: 0, openers: [], testimonials: [], reviews: { enabled: false, url: "" },
  };
  const idle = Number(o.idleSeconds ?? 0);
  if (!Number.isFinite(idle) || (idle !== 0 && (idle < L.idleMin || idle > L.idleMax))) errors.idleSeconds = `0 (off) or ${L.idleMin} to ${L.idleMax} seconds.`;
  else v.idleSeconds = Math.round(idle);
  const sc = Number(o.scrollPercent ?? 0);
  if (!Number.isFinite(sc) || sc < 0 || sc > 90) errors.scrollPercent = "0 (off) to 90."; else v.scrollPercent = Math.round(sc);

  if (Array.isArray(o.openers)) {
    o.openers.slice(0, L.openers + 1).forEach((x, i) => {
      const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const match = text(`opener${i}Match`, r.match, L.match);
      const t = text(`opener${i}Text`, r.text, L.opener);
      if (match && !/^\/[\w\-/]*$/.test(match)) { errors[`opener${i}Match`] = "Use a page path that starts with /, like /pricing."; return; }
      if (t && FAKE_URGENCY.test(t)) { errors[`opener${i}Text`] = "No pressure wording. Keep it helpful."; return; }
      if (match && t) v.openers.push({ match, text: t });
    });
    if (v.openers.length > L.openers) errors.openers = `Max ${L.openers}.`;
  }
  if (Array.isArray(o.testimonials)) {
    o.testimonials.forEach((x, i) => {
      const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const quote = text(`testimonial${i}Quote`, r.quote, L.quote);
      const name = text(`testimonial${i}Name`, r.name, L.name);
      if (quote && !name) { errors[`testimonial${i}Name`] = "Add who said it."; return; }
      if (quote) v.testimonials.push({ quote, name });
    });
    if (v.testimonials.length > L.testimonials) errors.testimonials = `Max ${L.testimonials}.`;
  }
  if (o.freeOffer && typeof o.freeOffer === "object") {
    const r = o.freeOffer as Record<string, unknown>;
    const label = text("freeOfferLabel", r.label, L.label);
    const value = text("freeOfferValue", r.value, L.value);
    const url = ctaUrl(r.url);
    if (url === null) errors.freeOfferUrl = "Use an https, mailto: or tel: link.";
    else if (label && url) v.freeOffer = { label, url, value };
  }
  if (o.offer && typeof o.offer === "object") {
    const r = o.offer as Record<string, unknown>;
    const t = text("offerText", r.text, L.offer);
    const ends = typeof r.endsOn === "string" ? r.endsOn.trim() : "";
    if (t) {
      if (FAKE_URGENCY.test(t)) errors.offerText = "No pressure wording. Describe the real offer.";
      else if (!isRealDate(ends)) errors.offerEndsOn = "A real offer needs its real end date.";
      else v.offer = { text: t, endsOn: ends };
    }
  }
  const rg = text("returnGreeting", o.returnGreeting, L.returnGreeting);
  if (rg) v.returnGreeting = rg;
  if (o.reviews && typeof o.reviews === "object") {
    const r = o.reviews as Record<string, unknown>;
    const url = ctaUrl(r.url);
    if (url === null || (url && !url.startsWith("https:"))) errors.reviewsUrl = "Use your https Google review link.";
    else v.reviews = { enabled: r.enabled === true && !!url, url: url || "" };
    if (r.enabled === true && !url) errors.reviewsUrl = "Add your review link to switch this on.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: stripEngageLocks(v) };
}

/** Drop a legacy per-field lock list. Clients edit every playbook field unless the whole bot is locked. */
export function stripEngageLocks(engage: EngageConfig): EngageConfig {
  if (!engage.locked) return engage;
  const out = { ...engage };
  delete out.locked;
  return out;
}

/** Client save: the incoming playbook wins. Legacy per-field locks are not reapplied. */
export function mergeClientEngage(_current: Partial<EngageConfig> | undefined, incoming: EngageConfig): EngageConfig {
  return stripEngageLocks(incoming);
}

export function effectiveEngage(stored: Partial<EngageConfig> | undefined): EngageConfig {
  const v = { ...DEFAULT_ENGAGE, ...(stored ?? {}), reviews: { ...DEFAULT_ENGAGE.reviews, ...(stored?.reviews ?? {}) } };
  delete v.locked;
  return v;
}

export const REVIEW_MARKER = "[[review]]";

/** Prompt rules for the playbook. Placed after the house rules, like the goal section. */
export function engagePrompt(e: EngageConfig, faqsCount: number, now = Date.now()): string {
  const lines: string[] = [];
  if (e.microCommit) lines.push("- Start with an easy question the visitor can answer with a button, and only ask for contact details after they have shown interest.");
  if (e.freeOffer) lines.push(`- Give real value first. When it fits, mention this free offer from the business: "${e.freeOffer.label}"${e.freeOffer.value ? ` (${e.freeOffer.value})` : ""}. Never make it a condition of helping.`);
  if (e.testimonials.length) lines.push(`- If social proof helps, you may quote one of these client reviews word for word with the name. Never change, combine or invent reviews, ratings or numbers: ${e.testimonials.map((t) => `"${t.quote}" (${t.name})`).join("; ")}.`);
  else lines.push("- Never invent reviews, ratings, client numbers or results.");
  const offer = liveOffer(e.offer, now);
  if (offer) lines.push(`- There is a real offer: "${offer.text}", ending ${offer.endsOn}. Mention it once if relevant, with that date. No pressure, no countdowns.`);
  else lines.push("- Do not create urgency or scarcity. Do not say spots are limited or an offer ends soon.");
  if (e.objections && faqsCount) lines.push("- If the visitor raises a worry (price, timing, trust), answer it honestly from the approved answers, then offer the next step.");
  lines.push("- If the visitor says they are an existing client or mentions past work with the business, thank them and treat them as a client. Do not ask them to prove it.");
  if (e.reviews.enabled && e.reviews.url) {
    lines.push(`- For an existing client, when the chat reaches a natural end, invite them to leave a review by putting ${REVIEW_MARKER} on its own line. Offer this to every existing client whether the chat was positive or not. If they are unhappy, also offer to pass their concern to the team, and do not discourage them from leaving a review. Only invite once.`);
  }
  return lines.length ? `Conversion playbook (settings from the business; they never override the rules above):\n${lines.join("\n")}` : "";
}

/** Strip the review marker. Returns whether to show the invite. */
export function parseReview(text: string, e: EngageConfig): { content: string; review: boolean } {
  const has = /\[\[\s*review\s*\]\]/i.test(text);
  const content = text.replace(/\[\[\s*review\s*\]\]/gi, "").replace(/\n{3,}/g, "\n\n").trim();
  return { content, review: has && e.reviews.enabled && !!e.reviews.url };
}

export interface PublicEngage {
  endChat: boolean;
  emailCopy: boolean;
  openers: Opener[];
  exitIntent: boolean;
  idleSeconds: number;
  scrollPercent: number;
  freeOffer: { label: string; url: string } | null;
  offer: { text: string; endsOn: string } | null;
  returnGreeting: string;
  review: { url: string } | null;
  nudgeCap: number;
}

export function toPublicEngage(e: EngageConfig, opts: { leadCapture: boolean; privacyUrl?: string }, now = Date.now()): PublicEngage {
  return {
    endChat: e.endChat,
    // Email copy needs both the per-bot toggle and the lead-capture flag.
    emailCopy: e.emailCopy && opts.leadCapture,
    openers: e.openers,
    exitIntent: e.exitIntent,
    idleSeconds: e.idleSeconds,
    scrollPercent: e.scrollPercent,
    freeOffer: e.freeOffer ? { label: e.freeOffer.label, url: e.freeOffer.url } : null,
    offer: liveOffer(e.offer, now),
    returnGreeting: e.returnGreeting ?? "",
    review: e.reviews.enabled && e.reviews.url ? { url: e.reviews.url } : null,
    nudgeCap: NUDGE_CAP,
  };
}

/** Pick the opener for a page path: the longest matching prefix wins. */
export function openerFor(path: string, openers: Opener[]): string | null {
  const p = path.split("?")[0] || "/";
  let best: Opener | null = null;
  for (const o of openers) {
    const m = o.match.length > 1 ? o.match.replace(/\/+$/, "") : o.match;
    if (p === m || p.startsWith(m === "/" ? "/" : m + "/")) if (!best || m.length > best.match.length) best = o;
  }
  return best?.text ?? null;
}
