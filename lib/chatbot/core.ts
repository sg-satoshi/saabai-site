import { toPublicGoal, type GoalConfig, type PublicGoal } from "./goal";
import { effectiveEngage, toPublicEngage, type EngageConfig, type PublicEngage } from "./engage";
import { leadCaptureEnabled } from "./lead-capture";
import { handoffTarget, type HandoffLink } from "./disclosure";
import { getPersona, greetingForSlug } from "./personas";
/** Pure rules for the central chatbot platform. No I/O, easy to test. */

export const PLANS = ["presence", "growth", "signature"] as const;
export type Plan = (typeof PLANS)[number];
export const PLAN_LABEL: Record<Plan, string> = { presence: "Presence", growth: "Growth", signature: "Signature" };

/** Conversations per month. Log-only in this release (nothing is blocked). */
export const CAPS: Record<Plan, number> = { presence: 200, growth: 600, signature: 2000 };

/** Sites that must start OFF until an admin turns them on. */
export const SEED_OFF = ["cycle-repair"];

/** Sites that still use their own chat route. The platform switch does not control them yet. */
export const BESPOKE_SLUGS = ["tributum-law-v2", "nextinvestment", "nico-moretti"];

export const POSITIONS = ["right", "left"] as const;
export type Position = (typeof POSITIONS)[number];

export interface Skin {
  botName: string;
  greeting: string;
  avatarUrl: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  position: Position;
  /** Preference. Only honoured on Growth and Signature (see poweredByVisible). */
  showPoweredBy: boolean;
}

export const TONES = ["friendly", "professional", "concise", "playful"] as const;
export type Tone = (typeof TONES)[number];
export const TONE_LABEL: Record<Tone, string> = { friendly: "Friendly", professional: "Professional", concise: "Short and to the point", playful: "Playful" };
const TONE_PROMPT: Record<Tone, string> = {
  friendly: "Tone: warm, friendly and approachable.",
  professional: "Tone: professional, polished and respectful. No slang.",
  concise: "Tone: brief and direct. Keep answers to one or two short sentences where possible.",
  playful: "Tone: upbeat and lightly playful, but never silly about money, health or legal matters.",
};

export interface Faq { q: string; a: string }
export interface Knowledge { facts: string; faqs: Faq[] }
export const LIMITS = { facts: 4000, faqs: 20, q: 200, a: 600 } as const;

export interface ChatbotConfig {
  schema: 1;
  slug: string;
  plan: Plan;
  skin: Partial<Skin>;
  tone?: Tone;
  knowledge?: Knowledge;
  /** Goal-first settings. Missing means the persona default, or no goal. */
  goal?: GoalConfig;
  /** Conversion playbook toggles. Missing means the tasteful defaults. */
  engage?: Partial<EngageConfig>;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SKIN: Skin = {
  botName: "",
  greeting: "",
  avatarUrl: "",
  primary: "#0f2a4a",
  accent: "#c9a227",
  bg: "#f6f7f9",
  text: "#1c2430",
  position: "right",
  showPoweredBy: true,
};

export const OFF_MESSAGE =
  "Our chat assistant is taking a break. Please call or email the team directly and they'll be happy to help.";

export function offMessage(business?: { phone?: string; email?: string }): string {
  const bits = [business?.phone ? `call ${business.phone}` : "", business?.email ? `email ${business.email}` : ""].filter(Boolean);
  if (!bits.length) return OFF_MESSAGE;
  return `Our chat assistant is taking a break. Please ${bits.join(" or ")} and the team will be happy to help.`;
}

/** The "Powered by Saabai" line can only be hidden on Growth and Signature. */
export const canRemovePoweredBy = (plan: Plan) => plan === "growth" || plan === "signature";
export const poweredByVisible = (plan: Plan, showPoweredBy: boolean | undefined) =>
  canRemovePoweredBy(plan) ? showPoweredBy !== false : true;

export const isPlan = (v: unknown): v is Plan => typeof v === "string" && (PLANS as readonly string[]).includes(v);

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** Only https URLs (or a root path) for an avatar. Blocks javascript: and data: URLs. */
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return "";
  if (s.length > 500) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type SkinResult = { ok: true; value: Partial<Skin> } | { ok: false; errors: Record<string, string> };

/** Validate a partial skin patch. Unknown keys are ignored. */
export function validateSkin(input: unknown): SkinResult {
  const errors: Record<string, string> = {};
  const out: Partial<Skin> = {};
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (k: "botName" | "greeting", max: number) => {
    if (o[k] === undefined) return;
    if (typeof o[k] !== "string") { errors[k] = "Must be text."; return; }
    const s = (o[k] as string).replace(/[\u0000-\u001f<>]/g, "").trim();
    if (s.length > max) errors[k] = `Max ${max} characters.`;
    else out[k] = s;
  };
  text("botName", 40);
  text("greeting", 300);
  for (const k of ["primary", "accent", "bg", "text"] as const) {
    if (o[k] === undefined) continue;
    if (isHex(o[k])) out[k] = (o[k] as string).toLowerCase();
    else errors[k] = "Use a hex colour like #0f2a4a.";
  }
  if (o.avatarUrl !== undefined) {
    const u = safeUrl(o.avatarUrl);
    if (u === null) errors.avatarUrl = "Use an https link (or a /path on this site).";
    else out.avatarUrl = u;
  }
  if (o.position !== undefined) {
    if ((POSITIONS as readonly unknown[]).includes(o.position)) out.position = o.position as Position;
    else errors.position = "Pick left or right.";
  }
  if (o.showPoweredBy !== undefined) {
    if (typeof o.showPoweredBy === "boolean") out.showPoweredBy = o.showPoweredBy;
    else errors.showPoweredBy = "Must be on or off.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

/** Skin as the widget should see it: defaults, then site values, then saved skin, with plan rules applied. */
export function resolveSkin(config: Pick<ChatbotConfig, "plan" | "skin">, site?: { botName?: string; greeting?: string; avatarUrl?: string }): Skin & { poweredBy: boolean } {
  const merged: Skin = {
    ...DEFAULT_SKIN,
    ...(site?.botName ? { botName: site.botName } : {}),
    ...(site?.greeting ? { greeting: site.greeting } : {}),
    ...(site?.avatarUrl ? { avatarUrl: site.avatarUrl } : {}),
    ...config.skin,
  };
  return { ...merged, poweredBy: poweredByVisible(config.plan, merged.showPoweredBy) };
}

/** Effective on/off. An explicit admin flag wins. With no flag, seeded sites are off and others follow the site's chatbot setting (default on). */
export function effectiveEnabled(opts: { flag: boolean | null; slug: string; siteChatbotEnabled?: boolean; kill?: boolean }): boolean {
  if (opts.kill) return false;
  if (opts.flag !== null) return opts.flag;
  if (SEED_OFF.includes(opts.slug)) return false;
  return opts.siteChatbotEnabled ?? true;
}

/** Brisbane month key like 2026-10 (Brisbane is UTC+10 with no daylight saving). */
export const monthKey = (d: Date = new Date()) => new Date(d.getTime() + 10 * 3600_000).toISOString().slice(0, 7);

export type CapState = "ok" | "near" | "over";
export function capState(conversations: number, plan: Plan): { state: CapState; cap: number; pct: number } {
  const cap = CAPS[plan];
  const pct = cap ? Math.round((conversations / cap) * 100) : 0;
  return { state: conversations > cap ? "over" : conversations >= cap * 0.8 ? "near" : "ok", cap, pct };
}

export function auditSummary(on: boolean, reason?: string): string {
  const r = (reason ?? "").trim().slice(0, 200);
  return `Chatbot turned ${on ? "ON" : "OFF"}${r ? `. Reason: ${r}` : ""}`;
}

export type ContentResult = { ok: true; value: { tone?: Tone; knowledge?: Knowledge } } | { ok: false; errors: Record<string, string> };

/** Validate the tone and knowledge (facts and FAQs) an admin saves. Plain text only. */
export function validateContent(input: unknown): ContentResult {
  const errors: Record<string, string> = {};
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: { tone?: Tone; knowledge?: Knowledge } = {};
  const clean = (v: string) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (o.tone !== undefined) {
    if ((TONES as readonly unknown[]).includes(o.tone)) out.tone = o.tone as Tone;
    else errors.tone = "Pick one of the tones.";
  }
  if (o.facts !== undefined || o.faqs !== undefined) {
    const facts = typeof o.facts === "string" ? clean(o.facts) : "";
    if (o.facts !== undefined && typeof o.facts !== "string") errors.facts = "Must be text.";
    if (facts.length > LIMITS.facts) errors.facts = `Max ${LIMITS.facts} characters.`;
    const faqs: Faq[] = [];
    if (o.faqs !== undefined && !Array.isArray(o.faqs)) errors.faqs = "Must be a list.";
    else if (Array.isArray(o.faqs)) {
      if (o.faqs.length > LIMITS.faqs) errors.faqs = `Max ${LIMITS.faqs} questions.`;
      o.faqs.forEach((f, i) => {
        const r = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
        const q = typeof r.q === "string" ? clean(r.q) : "";
        const a = typeof r.a === "string" ? clean(r.a) : "";
        if (!q && !a) return;
        if (!q || !a) errors[`faq${i}`] = "Add both a question and an answer, or remove it.";
        else if (q.length > LIMITS.q) errors[`faq${i}`] = `Question max ${LIMITS.q} characters.`;
        else if (a.length > LIMITS.a) errors[`faq${i}`] = `Answer max ${LIMITS.a} characters.`;
        else faqs.push({ q, a });
      });
    }
    out.knowledge = { facts, faqs };
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

/** The extra instructions added to the bot's base prompt: tone, business facts and FAQs. Empty if nothing is set. */
export function promptAdditions(config: Pick<ChatbotConfig, "tone" | "knowledge">): string {
  const parts: string[] = [];
  if (config.tone && TONE_PROMPT[config.tone]) parts.push(TONE_PROMPT[config.tone]);
  const k = config.knowledge;
  if (k?.facts) parts.push(`Business facts (use these, and do not invent others):\n${k.facts}`);
  if (k?.faqs?.length) parts.push("Frequently asked questions and the approved answers:\n" + k.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n"));
  if (parts.length) parts.push("If something is not covered above or in your instructions, say you are not sure and offer to connect the visitor with the team.");
  return parts.join("\n\n");
}

/** The public config the widget reads. Never includes the prompt, knowledge, audit data or usage. */
export interface PublicWidgetConfig {
  v: 1;
  active: boolean;
  botName: string;
  greeting: string;
  avatarUrl: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  position: Position;
  poweredBy: boolean;
  placeholder: string;
  offMessage: string;
  /** Call or email link. Null when the site has neither. Clicking it is a handoff event, not a lead post. */
  handoff: HandoffLink | null;
  /** Quick replies and buttons. Null when the bot has no goal. */
  goal: PublicGoal | null;
  /** Widget features and nudges. */
  engage: PublicEngage;
}

export function toPublicConfig(opts: { slug?: string; active: boolean; config: Pick<ChatbotConfig, "plan" | "skin" | "goal" | "engage">; site: { name: string; business?: { name?: string; phone?: string; email?: string }; chatbot?: { name?: string; greeting?: string; avatarUrl?: string } } }): PublicWidgetConfig {
  const sk = resolveSkin(opts.config, { botName: opts.site.chatbot?.name, greeting: opts.site.chatbot?.greeting, avatarUrl: opts.site.chatbot?.avatarUrl });
  const businessName = opts.site.business?.name || opts.site.name;
  const bot = sk.botName || businessName;
  return {
    v: 1,
    active: opts.active,
    botName: bot,
    greeting: greetingForSlug(opts.slug, bot, businessName, sk.greeting),
    avatarUrl: sk.avatarUrl,
    primary: sk.primary,
    accent: sk.accent,
    bg: sk.bg,
    text: sk.text,
    position: sk.position,
    poweredBy: sk.poweredBy,
    placeholder: `Ask about ${businessName}...`,
    offMessage: offMessage(opts.site.business),
    handoff: handoffTarget(opts.site.business),
    goal: toPublicGoal(effectiveGoal(opts.slug, opts.config.goal)),
    engage: toPublicEngage(effectiveEngage(opts.config.engage), { leadCapture: leadCaptureEnabled() }),
  };
}

/** Stored goal wins, then the persona default, else none. */
export function effectiveGoal(slug: string | undefined, stored: GoalConfig | undefined): GoalConfig | undefined {
  return stored ?? (slug ? getPersona(slug)?.goal : undefined);
}
