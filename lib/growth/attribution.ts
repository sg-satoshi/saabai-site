/**
 * First-party attribution cookie (sb_attr): first and last touch, 90 days.
 * Analytics only, no third parties. Read by /score, Blueprint checkout and webhooks.
 */
export const ATTR_COOKIE = "sb_attr";
export const ATTR_MAX_AGE = 90 * 24 * 3600;

export type Touch = { s?: string; m?: string; c?: string; r?: string; p?: string; ref?: string; t: number };
export type Attribution = { f: Touch; l: Touch };

const cap = (v: string | null | undefined, n = 80) => (v ? v.replace(/[^\w .:/@+-]/g, "").slice(0, n) : undefined);

export function parseAttr(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw));
    if (o && typeof o === "object" && o.f && o.l) return o as Attribution;
  } catch { /* ignore bad cookie */ }
  return null;
}

export function serialiseAttr(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Build a touch from a request URL and referrer, or null if this visit carries no new source. */
export function touchFrom(url: URL, referrer: string | null, ownHost: string, refCode?: string): Touch | null {
  const q = url.searchParams;
  let refHost: string | undefined;
  try { refHost = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : undefined; } catch { refHost = undefined; }
  const own = ownHost.replace(/^www\./, "");
  const external = refHost && refHost !== own && !refHost.endsWith(".saabai.ai") && refHost !== "saabai.ai";
  const hasUtm = q.has("utm_source") || q.has("utm_medium") || q.has("utm_campaign") || q.has("gclid") || q.has("fbclid");
  if (!hasUtm && !external && !refCode) return null;
  return {
    s: cap(q.get("utm_source")) || (q.has("gclid") ? "google" : q.has("fbclid") ? "facebook" : refCode ? "referral" : refHost),
    m: cap(q.get("utm_medium")) || (q.has("gclid") ? "cpc" : refCode ? "referral" : external ? "referral" : undefined),
    c: cap(q.get("utm_campaign")),
    r: external ? cap(refHost) : undefined,
    p: cap(url.pathname, 120),
    ref: cap(refCode, 32),
    t: Date.now(),
  };
}

/** Merge a new touch into the cookie value. First touch never changes. */
export function mergeTouch(cur: Attribution | null, touch: Touch | null, landingPath: string): Attribution | null {
  if (touch) return { f: cur?.f ?? touch, l: touch };
  if (!cur) {
    const direct: Touch = { s: "direct", p: landingPath.slice(0, 120), t: Date.now() };
    return { f: direct, l: direct };
  }
  return null; // nothing to update
}

export function touchLabel(t?: Touch): string {
  if (!t) return "unknown";
  return [t.s || "direct", t.m].filter(Boolean).join(" / ") + (t.c ? ` (${t.c})` : "");
}

/** Compact strings for Stripe metadata (500 char limit per value). */
export function attrMetadata(a: Attribution | null): Record<string, string> {
  if (!a) return {};
  return { attr_first: JSON.stringify(a.f).slice(0, 480), attr_last: JSON.stringify(a.l).slice(0, 480) };
}

export function attrFromMetadata(m: Record<string, string> | null | undefined): Attribution | null {
  if (!m?.attr_first || !m?.attr_last) return null;
  try { return { f: JSON.parse(m.attr_first), l: JSON.parse(m.attr_last) }; } catch { return null; }
}
