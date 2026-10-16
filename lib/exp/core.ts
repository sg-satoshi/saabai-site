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

export type Variant = { id: string; text: string; emphasis?: string; active: boolean; weight?: number };
export type Experiment = {
  id: string;
  siteKey: string;
  slot: string;
  path: string;
  status: "draft" | "running" | "paused" | "won";
  defaultVariantId: string;
  variants: Variant[];
  leadValueAUD?: number;
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
    const o = JSON.parse(decodeURIComponent(raw));
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
  if (!Array.isArray(x.variants) || x.variants.length < 1 || x.variants.length > 8) return null;
  for (const v of x.variants) {
    if (!v || typeof v.id !== "string" || !/^[a-z0-9-]{1,24}$/.test(v.id)) return null;
    if (typeof v.text !== "string" || !v.text.trim() || v.text.length > 90) return null;
    if (v.emphasis !== undefined && (typeof v.emphasis !== "string" || v.emphasis.length > 90)) return null;
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
