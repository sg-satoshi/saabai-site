/**
 * Experiments (split testing), pure logic. Edge-safe: no Node-only imports.
 * Rules: bots and privacy signals always get the default variant with no cookie
 * and no tracking; the live copy is the control; anything odd fails open.
 */
export const EXP_COOKIE = "sb_exp";
export const EXP_OFF_COOKIE = "sb_exp_off";
export const EXP_MAX_AGE = 90 * 24 * 3600;
export const EXP_HEADER = "x-sb-exp";
export const EXP_TRACK_HEADER = "x-sb-track";

/**
 * Slot types. Only "text" renders today. "image" and "style" are reserved in the data model: a variant of
 * those types carries its settings in `value` (for example { src, alt } or { font, colour }) and the slot
 * component that consumes it validates the keys. Adding a type means a renderer plus a validator here.
 */
export const SLOT_TYPES = ["text", "image", "style"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];
export const RENDERABLE_SLOT_TYPES: SlotType[] = ["text"];

export type Variant = {
  id: string;
  text: string;
  emphasis?: string;
  active: boolean;
  weight?: number;
  /** Non-text slot settings (image, style tokens). Unused for text slots. */
  value?: Record<string, string>;
  /** "human" or "ai" (AI variants arrive in Phase 3 and need approval before serving). */
  source?: "human" | "ai";
};
/** Copy kinds. "headline" has an optional highlighted second part; "button" is one short label. */
export const SLOT_KINDS = ["headline", "button"] as const;
export type SlotKind = (typeof SLOT_KINDS)[number];
export const KIND_RULES: Record<SlotKind, { noun: string; maxText: number; maxEmphasis: number; maxCombined: number; emphasis: boolean }> = {
  headline: { noun: "headline", maxText: 90, maxEmphasis: 90, maxCombined: 100, emphasis: true },
  button: { noun: "button label", maxText: 40, maxEmphasis: 0, maxCombined: 40, emphasis: false },
};
export const kindOf = (e: { kind?: SlotKind }): SlotKind => (e.kind && SLOT_KINDS.includes(e.kind) ? e.kind : "headline");

export type Experiment = {
  id: string;
  siteKey: string;
  slot: string;
  /** Copy kind, defaults to "headline" when absent (older stored experiments). */
  kind?: SlotKind;
  /** Defaults to "text" when absent. */
  slotType?: SlotType;
  path: string;
  status: "draft" | "running" | "paused" | "won";
  defaultVariantId: string;
  variants: Variant[];
  leadValueAUD?: number;
  /** Optimistic-concurrency counter, bumped by every dashboard write. */
  rev?: number;
  updatedAt?: string;
  /** Plain label shown in the dashboard. */
  name?: string;
};
export type ExpCookie = { v: string; a: Record<string, string> };

export const EVENT_TYPES = ["impression", "cta_click", "form_submit", "call_click", "lead_alert"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** Event types the browser beacon may send. form_submit and lead_alert are server-side only. */
export const CLIENT_EVENT_TYPES: EventType[] = ["impression", "cta_click", "call_click"];

const BOT_RE = /bot|crawl|spider|slurp|scrape|fetch|preview|headless|phantom|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|java\/|go-http|okhttp|axios|libwww|httpclient|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|siteCheck|chrome-lighthouse/i;
const AI_UA = ["GPTBot", "OAI-SearchBot", "ChatGPT", "ClaudeBot", "Claude-", "anthropic", "Perplexity", "Google-Extended", "Applebot", "CCBot", "Bingbot", "meta-externalagent", "xAI", "GrokBot"];

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 12) return true;
  if (BOT_RE.test(ua)) return true;
  const l = ua.toLowerCase();
  return AI_UA.some((b) => l.includes(b.toLowerCase()));
}

/** Global Privacy Control or Do Not Track: serve default, no cookie, no events. */
export function privacySignal(h: { get(n: string): string | null }): boolean {
  return h.get("sec-gpc") === "1" || h.get("dnt") === "1";
}

export function siteKeyForHost(hostname: string): string | null {
  const h = hostname.toLowerCase().split(":")[0];
  if (h === "saabai.ai" || h === "www.saabai.ai") return "saabai";
  // Vercel preview deployments of this app are saabai.ai previews.
  if (h.endsWith(".vercel.app")) return "saabai";
  return null;
}

/** Sites with experiments switched on. Env EXPERIMENTS_ENABLED_SITES overrides ("none" kills it). */
export function enabledSites(env: string | undefined = process.env.EXPERIMENTS_ENABLED_SITES): string[] {
  if (env === undefined) return ["saabai"];
  return env.split(",").map((s) => s.trim()).filter((s) => s && s !== "none");
}

export function parseExpCookie(raw: string | undefined | null): ExpCookie | null {
  if (!raw) return null;
  try {
    // Next percent-encodes cookie values on set, and the cookie jar may or may not decode once on read.
    let txt = raw;
    for (let i = 0; i < 3 && !txt.trim().startsWith("{"); i++) txt = decodeURIComponent(txt);
    const o = JSON.parse(txt);
    if (o && typeof o.v === "string" && /^[0-9a-f-]{36}$/i.test(o.v) && o.a && typeof o.a === "object") {
      const a: Record<string, string> = {};
      for (const [k, val] of Object.entries(o.a)) if (typeof val === "string" && k.length < 64 && val.length < 64) a[k] = val;
      return { v: o.v, a };
    }
  } catch { /* bad cookie */ }
  return null;
}
export const serialiseExpCookie = (c: ExpCookie) => encodeURIComponent(JSON.stringify(c));

export function validateExperiment(e: unknown): Experiment | null {
  const x = e as Experiment;
  if (!x || typeof x.id !== "string" || !/^[a-z0-9-]{3,48}$/.test(x.id)) return null;
  if (typeof x.siteKey !== "string" || typeof x.slot !== "string" || typeof x.path !== "string") return null;
  if (!["draft", "running", "paused", "won"].includes(x.status)) return null;
  if (x.slotType !== undefined && !SLOT_TYPES.includes(x.slotType)) return null;
  if (x.kind !== undefined && !SLOT_KINDS.includes(x.kind)) return null;
  const rules = KIND_RULES[kindOf(x)];
  if (!Array.isArray(x.variants) || x.variants.length < 1 || x.variants.length > 8) return null;
  const ids = new Set<string>();
  for (const v of x.variants) {
    if (!v || typeof v.id !== "string" || !/^[a-z0-9-]{1,24}$/.test(v.id) || ids.has(v.id)) return null;
    ids.add(v.id);
    if (typeof v.active !== "boolean") return null;
    if (v.value !== undefined && (typeof v.value !== "object" || v.value === null || Object.values(v.value).some((z) => typeof z !== "string" || z.length > 300))) return null;
    if (typeof v.text !== "string" || !v.text.trim() || v.text.length > rules.maxText) return null;
    if (v.emphasis !== undefined && (typeof v.emphasis !== "string" || v.emphasis.length > rules.maxEmphasis)) return null;
    if (/—|–/.test(v.text + (v.emphasis ?? ""))) return null;
  }
  if (!x.variants.some((v) => v.id === x.defaultVariantId)) return null;
  return x;
}

export const activeVariants = (e: Experiment) => e.variants.filter((v) => v.active);
export const defaultVariant = (e: Experiment) => e.variants.find((v) => v.id === e.defaultVariantId) ?? e.variants[0];

/** Weighted random pick over active variants. rng injectable for tests. Phase 1 is an even split. */
export function pickVariant(e: Experiment, rng: () => number = Math.random): Variant {
  const act = activeVariants(e);
  if (!act.length) return defaultVariant(e);
  const total = act.reduce((s, v) => s + (v.weight ?? 1), 0);
  let r = rng() * total;
  for (const v of act) { r -= v.weight ?? 1; if (r < 0) return v; }
  return act[act.length - 1];
}

export type Assignment = {
  exp: Experiment;
  variant: Variant;
  /** true when this visitor is a counted human participant */
  track: boolean;
  /** new cookie value to set, if the assignment changed */
  cookie?: string;
};

/**
 * Decide which variant a request sees for one experiment.
 * Bots, privacy signals, admins and opted-out visitors get the default, untracked.
 */
export function assign(
  exp: Experiment,
  ctx: { ua: string | null; privacy: boolean; admin: boolean; optedOut: boolean; cookie: ExpCookie | null; newVisitorId: () => string; rng?: () => number },
): Assignment {
  const def = defaultVariant(exp);
  if (exp.status !== "running" && exp.status !== "won") return { exp, variant: def, track: false };
  if (exp.status === "won") return { exp, variant: def, track: false };
  if (isBot(ctx.ua) || ctx.privacy || ctx.admin || ctx.optedOut) return { exp, variant: def, track: false };
  const current = ctx.cookie?.a[exp.id];
  const existing = current ? activeVariants(exp).find((v) => v.id === current) : undefined;
  if (existing) return { exp, variant: existing, track: true };
  const variant = pickVariant(exp, ctx.rng);
  const next: ExpCookie = { v: ctx.cookie?.v ?? ctx.newVisitorId(), a: { ...(ctx.cookie?.a ?? {}), [exp.id]: variant.id } };
  return { exp, variant, track: true, cookie: serialiseExpCookie(next) };
}

/**
 * Assign every running experiment on a page in one pass, carrying one visitor id and one cookie.
 * `header` is "expId:variantId,expId:variantId" for the page to read; `cookie` is set only when something changed.
 */
export function assignAll(exps: Experiment[], ctx: Parameters<typeof assign>[1]): { header: string; track: boolean; cookie?: string } {
  let cur = ctx.cookie;
  let cookie: string | undefined;
  let track = false;
  const pairs: string[] = [];
  for (const e of exps) {
    const a = assign(e, { ...ctx, cookie: cur });
    pairs.push(`${e.id}:${a.variant.id}`);
    if (a.track) track = true;
    if (a.cookie) { cookie = a.cookie; cur = parseExpCookie(a.cookie); }
  }
  return { header: pairs.join(","), track, cookie };
}

/** Pulls one experiment's variant id out of the multi-experiment header. */
export function variantFromHeader(header: string | null | undefined, expId: string): string | undefined {
  for (const pair of (header ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i > 0 && pair.slice(0, i).trim() === expId) return pair.slice(i + 1).trim();
  }
  return undefined;
}
