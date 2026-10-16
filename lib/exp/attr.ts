import { parseAttr } from "../growth/attribution";

/**
 * Source labels for experiment events, derived from the existing first-party sb_attr cookie (no new cookie,
 * no IP, no PII). Values are lower-cased, stripped of anything that looks like an email, and capped.
 */
export type EventSource = { source: string | null; campaign: string | null; channel: string };

const clean = (v: string | undefined | null): string | null => {
  if (!v) return null;
  const s = v.toLowerCase().replace(/[^a-z0-9 ._:/+-]/g, "").trim().slice(0, 60);
  // Drop anything that looks like a phone number; "@" never survives the cookie sanitiser or this one.
  return s && !s.includes("@") && !/^[+\d ._-]{8,}$/.test(s) ? s : null;
};

const SOCIAL = /^(facebook|fb|instagram|ig|linkedin|twitter|x|t\.co|tiktok|youtube|reddit|pinterest|l\.facebook\.com|lnkd\.in|m\.facebook\.com)\b/;
const SEARCH = /^(google|bing|duckduckgo|yahoo|ecosia|brave|baidu)\b/;

export function channelOf(source: string | null, medium: string | null | undefined): string {
  const m = (medium ?? "").toLowerCase();
  if (/^(cpc|ppc|paid|paidsearch|paid-social|paidsocial|display|cpm)$/.test(m)) return "paid";
  if (m === "email" || m === "newsletter") return "email";
  if (!source || source === "direct") return "direct";
  if (SOCIAL.test(source)) return "social";
  if (SEARCH.test(source)) return "organic search";
  return "referral";
}

export function eventSource(attrCookie: string | undefined | null): EventSource {
  const a = parseAttr(attrCookie ?? null);
  const t = a?.l;
  if (!t) return { source: null, campaign: null, channel: "direct" };
  const source = clean(t.s);
  return { source, campaign: clean(t.c), channel: channelOf(source, t.m) };
}
