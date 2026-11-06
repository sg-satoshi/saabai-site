/**
 * Lex free trial signup guard: full business signup (name, firm, work email, AU phone, AU address)
 * plus domain checks (no webmail/ISP, no disposable, competitor blocklist, real MX + website).
 * DNS checks use a short timeout and fail closed.
 */
import { promises as dns } from "dns";
import { LEX_TRIAL_BLOCKED_DOMAINS, DISPOSABLE_EMAIL_DOMAINS } from "@/config/lex-trial-blocklist";
import { PUBLIC_EMAIL_DOMAINS, registrableDomain } from "./lex-trial";

export const WORK_EMAIL_REQUIRED = "Please use your firm email address.";
export const TRIAL_BLOCKED = "We couldn't start a trial for this address. Contact us.";
export const DOMAIN_UNVERIFIED = "We couldn't confirm your firm's email domain. Please check the address, or contact us and we'll set you up.";
export const DNS_TIMEOUT_MS = 2500;

export type AuState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
export type FirmAddress = { street: string; suburb: string; state: AuState; postcode: string };
export type TrialContact = { phone: string; address: FirmAddress };

/** Australia Post postcode ranges by state (incl. PO box / LVR ranges). */
const POSTCODES: Record<AuState, Array<[number, number]>> = {
  NSW: [[1000, 2599], [2619, 2899], [2921, 2999]],
  ACT: [[200, 299], [2600, 2618], [2900, 2920]],
  VIC: [[3000, 3999], [8000, 8999]],
  QLD: [[4000, 4999], [9000, 9999]],
  SA: [[5000, 5999]],
  WA: [[6000, 6999]],
  TAS: [[7000, 7999]],
  NT: [[800, 999]],
};
export function postcodeMatchesState(postcode: string, state: string): boolean {
  if (!/^\d{4}$/.test(postcode) || !(state in POSTCODES)) return false;
  const n = Number(postcode);
  return POSTCODES[state as AuState].some(([a, b]) => n >= a && n <= b);
}

/** AU phone: mobile 04xx, landline 02/03/07/08, 1300/1800, 13xxxx; +61 accepted. Returns E.164-ish normalised or null. */
export function normaliseAuPhone(raw: string): string | null {
  let d = raw.replace(/[\s()\-.]/g, "");
  if (/^\+61/.test(d)) d = "0" + d.slice(3);
  else if (/^61\d{9}$/.test(d)) d = "0" + d.slice(2);
  if (/^0[2378]\d{8}$/.test(d) || /^04\d{8}$/.test(d) || /^1[38]00\d{6}$/.test(d) || /^13\d{4}$/.test(d)) return d;
  return null;
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
export function validateTrialContact(body: Record<string, unknown>): { ok: true; value: TrialContact } | { ok: false; error: string; field: string } {
  const phone = normaliseAuPhone(s(body.phone, 40));
  if (!s(body.phone, 40)) return { ok: false, error: "Please add a phone number", field: "phone" };
  if (!phone) return { ok: false, error: "Please enter an Australian phone number, e.g. 07 3000 0000 or 0400 000 000", field: "phone" };
  const street = s(body.street, 160), suburb = s(body.suburb, 80), state = s(body.state, 10).toUpperCase(), postcode = s(body.postcode, 10).replace(/\s/g, "");
  if (street.length < 3) return { ok: false, error: "Please add your firm's street address", field: "street" };
  if (suburb.length < 2) return { ok: false, error: "Please add the suburb", field: "suburb" };
  if (!(state in POSTCODES)) return { ok: false, error: "Please choose a state or territory", field: "state" };
  if (!/^\d{4}$/.test(postcode)) return { ok: false, error: "A postcode is 4 digits", field: "postcode" };
  if (!postcodeMatchesState(postcode, state)) return { ok: false, error: `That postcode isn't in ${state}. Please check it.`, field: "postcode" };
  return { ok: true, value: { phone, address: { street, suburb, state: state as AuState, postcode } } };
}

const inList = (list: Iterable<string>, domain: string, reg: string) => { for (const d of list) if (domain === d || reg === d || domain.endsWith(`.${d}`)) return true; return false; };
export type DomainVerdict = "ok" | "webmail" | "disposable" | "blocked" | "unverified";
/** Synchronous rules (no network). */
export function domainRule(email: string): Exclude<DomainVerdict, "unverified"> {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  const reg = registrableDomain(domain);
  if (inList(LEX_TRIAL_BLOCKED_DOMAINS, domain, reg)) return "blocked";
  if (inList(DISPOSABLE_EMAIL_DOMAINS, domain, reg)) return "disposable";
  if (inList(PUBLIC_EMAIL_DOMAINS, domain, reg)) return "webmail";
  return "ok";
}

export type DnsDeps = { resolveMx: (d: string) => Promise<unknown[]>; lookup: (host: string) => Promise<unknown> };
const realDns: DnsDeps = { resolveMx: (d) => dns.resolveMx(d), lookup: (h) => dns.lookup(h) };
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
}
/** MX records on the mail domain and a resolvable website (domain or www.). Fails closed on error/timeout. */
export async function domainLooksReal(email: string, deps: DnsDeps = realDns, ms = DNS_TIMEOUT_MS): Promise<boolean> {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  const reg = registrableDomain(domain);
  try {
    const mx = await withTimeout(deps.resolveMx(domain), ms);
    if (!Array.isArray(mx) || mx.length === 0) return false;
    const web = await Promise.any([reg, `www.${reg}`].map((h) => withTimeout(deps.lookup(h), ms))).then(() => true, () => false);
    return web;
  } catch { return false; }
}

export function verdictMessage(v: DomainVerdict): string | null {
  if (v === "ok") return null;
  if (v === "blocked") return TRIAL_BLOCKED;
  if (v === "unverified") return DOMAIN_UNVERIFIED;
  return WORK_EMAIL_REQUIRED;
}
/** Full check used by the public trial API. */
export async function checkTrialDomain(email: string, deps?: DnsDeps): Promise<{ ok: true } | { ok: false; error: string; field: "email" }> {
  let v: DomainVerdict = domainRule(email);
  if (v === "ok" && !(await domainLooksReal(email, deps))) v = "unverified";
  const msg = verdictMessage(v);
  return msg ? { ok: false, error: msg, field: "email" } : { ok: true };
}
