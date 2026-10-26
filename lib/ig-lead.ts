/**
 * Instagram bio landing (/ig) lead payload.
 * Posts only to the existing /api/leads pipeline. Tests must pass a mock `post`
 * and must not call the real endpoint.
 */

export const IG_PATH = "/ig";
export const IG_SOURCE = "instagram";
export const IG_OFFER = "free-site-check";

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
export type IgUtmKey = (typeof UTM_KEYS)[number];
export type IgUtm = Partial<Record<IgUtmKey, string>>;

export type IgFix = { what: string; why: string };

/** Public site-check result. Score is null when the site was not scored. */
export type IgSiteCheck = {
  read: boolean;
  score: number | null;
  fixes: IgFix[];
  checked: string[];
  pages: number;
  summary: string;
  foldNote: string | null;
};

export type IgLeadInput = {
  name: string;
  business: string;
  website: string;
  email: string;
  phone?: string;
  problem?: string;
  /** `location.search`, including the leading ? */
  search?: string;
  /** Whole number from the site check. Omitted when the site was not scored. */
  siteScore?: number | null;
  checkSummary?: string;
};

const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$/;

/** http(s) only. A bare domain gets https. */
export function normaliseWebsite(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > 300) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

export function utmFromSearch(search: string | undefined): IgUtm {
  const q = new URLSearchParams(search ?? "");
  const utm: IgUtm = {};
  for (const key of UTM_KEYS) {
    const v = q.get(`utm_${key}`)?.trim().slice(0, 80);
    if (v && !v.includes("@")) utm[key] = v;
  }
  return utm;
}

export function instagramLeadError(input: IgLeadInput): string | null {
  if (!input.name.trim()) return "Add your name.";
  if (input.name.trim().length > 120) return "Name is too long.";
  if (!input.business.trim()) return "Add your business name.";
  if (input.business.trim().length > 200) return "Business name is too long.";
  if (!normaliseWebsite(input.website)) return "Add a website address, like example.com.au.";
  const email = input.email.trim();
  if (!email || email.length > 254 || !EMAIL_RE.test(email) || email.includes("..")) return "Add a valid email.";
  const phone = (input.phone ?? "").trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (phone.length > 40 || digits.length < 8 || digits.length > 15) return "Check the phone number, or leave it blank.";
  }
  if ((input.problem ?? "").trim().length > 500) return "Keep the note under 500 characters.";
  return null;
}

export function buildInstagramLeadPayload(input: IgLeadInput): Record<string, unknown> {
  const utm = utmFromSearch(input.search);
  const phone = input.phone?.trim();
  const problem = input.problem?.trim();
  const score = input.siteScore;
  const summary = input.checkSummary?.trim().slice(0, 800);
  return {
    source: IG_SOURCE,
    offer: IG_OFFER,
    name: input.name.trim(),
    business: input.business.trim(),
    website: input.website.trim(),
    email: input.email.trim(),
    page: IG_PATH,
    ...(phone ? { phone } : {}),
    ...(problem ? { problem } : {}),
    ...(typeof score === "number" && Number.isFinite(score) ? { siteScore: Math.min(100, Math.max(0, Math.round(score))) } : {}),
    ...(summary ? { checkSummary: summary } : {}),
    ...(Object.keys(utm).length ? { utm } : {}),
  };
}

type PostFn = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Dry-run safe: pass a mock `post` in tests. The default uses fetch("/api/leads")
 * in the browser only.
 */
export async function submitInstagramLead(
  input: IgLeadInput,
  post: PostFn = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = instagramLeadError(input);
  if (error) return { ok: false, error };
  let res: Response;
  try {
    res = await post("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildInstagramLeadPayload(input)),
    });
  } catch {
    return { ok: false, error: "Could not send. Check your connection and try again." };
  }
  if (!res.ok) {
    let message = "Could not send that. Email hello@saabai.ai and we will take it from there.";
    try {
      const data = await res.json() as { error?: string };
      if (data?.error === "Too many requests") message = "Too many attempts. Wait a few minutes and try again.";
    } catch { /* keep the generic message */ }
    return { ok: false, error: message };
  }
  return { ok: true };
}

const CHECK_PATH = "/api/ig/check";
/** Same cap as SEARCH_LIMITS.maxHtmlPages. Kept local so the browser bundle does not import the rules file. */
const MAX_CHECK_PAGES = 8;

const UNREAD_CHECK: IgSiteCheck = {
  read: false,
  score: null,
  fixes: [],
  checked: [],
  pages: 0,
  summary: "We couldn't read your site. Nothing was guessed, and there is no score.",
  foldNote: null,
};

/** Accept only a score the check marked as read. A number on an unread result is dropped. */
export function parseIgSiteCheck(data: unknown): IgSiteCheck | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  const read = o.read === true;
  let score: number | null = null;
  if (read && typeof o.score === "number" && Number.isFinite(o.score)) {
    const n = Math.round(o.score);
    if (n >= 0 && n <= 100) score = n;
  }
  const fixes: IgFix[] = [];
  if (Array.isArray(o.fixes)) {
    for (const item of o.fixes) {
      if (fixes.length >= 3) break;
      if (!item || typeof item !== "object") continue;
      const f = item as Record<string, unknown>;
      if (typeof f.what !== "string" || typeof f.why !== "string") continue;
      const what = f.what.trim().slice(0, 400);
      const why = f.why.trim().slice(0, 400);
      if (what && why) fixes.push({ what, why });
    }
  }
  const checked = Array.isArray(o.checked)
    ? o.checked.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 8).map((s) => s.trim().slice(0, 80))
    : [];
  const pages = typeof o.pages === "number" && Number.isFinite(o.pages) && o.pages >= 0 && o.pages <= MAX_CHECK_PAGES
    ? Math.round(o.pages)
    : 0;
  const summary = typeof o.summary === "string" && o.summary.trim()
    ? o.summary.trim().slice(0, 800)
    : UNREAD_CHECK.summary;
  const foldNote = read && typeof o.foldNote === "string" && o.foldNote.trim()
    ? o.foldNote.trim().slice(0, 600)
    : null;
  return { read, score, fixes, checked, pages, summary, foldNote };
}

export type IgCheckOutcome =
  | { ok: true; saved: boolean; check: IgSiteCheck; error?: string }
  | { ok: false; error: string };

/**
 * Runs the site check, then posts the lead. Pass a mock `post` in tests.
 * A bad address or a rate limit does not post a lead. An unread site still does.
 */
export async function submitInstagramSiteCheck(
  input: IgLeadInput,
  post: PostFn = fetch,
): Promise<IgCheckOutcome> {
  const error = instagramLeadError(input);
  if (error) return { ok: false, error };
  const website = normaliseWebsite(input.website);
  if (!website) return { ok: false, error: "Add a website address, like example.com.au." };

  let check: IgSiteCheck | null = null;
  try {
    const res = await post(CHECK_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: website, business: input.business.trim() }),
    });
    if (res.status === 429) {
      return { ok: false, error: "Too many checks from this connection. Wait a few minutes and try again." };
    }
    if (res.status === 400 || res.status === 413) {
      let message = "Add a website address, like example.com.au.";
      try {
        const data = await res.json() as { error?: string };
        if (typeof data?.error === "string" && data.error.trim()) message = data.error;
      } catch { /* keep the generic message */ }
      return { ok: false, error: message };
    }
    if (res.ok) check = parseIgSiteCheck(await res.json());
  } catch {
    check = null;
  }

  const result = check ?? UNREAD_CHECK;
  const checkSummary = [result.summary, ...result.fixes.map((f) => `${f.what} ${f.why}`)].join(" ").slice(0, 800);
  const saved = await submitInstagramLead({
    ...input,
    website,
    siteScore: result.score,
    checkSummary,
  }, post);
  if (!saved.ok) return { ok: true, saved: false, check: result, error: saved.error };
  return { ok: true, saved: true, check: result };
}
