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

export type IgLeadInput = {
  name: string;
  business: string;
  website: string;
  email: string;
  phone?: string;
  problem?: string;
  /** `location.search`, including the leading ? */
  search?: string;
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
