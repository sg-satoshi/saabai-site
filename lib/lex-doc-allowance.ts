/**
 * Lex Firm plan document allowance: Draft Documents generations per firm per allowance period.
 *
 * Period (resolveDocPeriod):
 *   1. Trial firm (trialStartedAt, still before trialEndsAt or with no paid period yet): 30-day windows from trial start.
 *   2. Paying firm: the Stripe billing cycle, periodStart..periodEnd on the firm record (kept from subscription webhooks).
 *      A firm with only periodEnd (recorded before periodStart was stored) uses periodEnd minus one calendar month
 *      (clamped to month end) as the start. The period is stored at provisioning and on every renewal (invoice.paid,
 *      subscription.created/updated), so a new firm counts on its billing cycle from its first draft.
 *      If the stored period has ended but the subscription is still live (renewal webhook late), the window rolls
 *      forward from the stored period end (the next cycle's start), so the scope matches the one the webhook will store.
 *      Stored periods only move forward to a new cycle, so a near-identical or stale Stripe period never resets the counter.
 *      A firm that is not live keeps its last billing scope (no fresh counter).
 *   3. No firm record or no usable period: Brisbane calendar month for the email domain (logged).
 *
 *   lex:docs:used:{scope}           counter, scope = firm:{firmId}:{periodStart} | dom:{domain}:{YYYY-MM}
 *   lex:docs:req:{scope}:{sha256}   idempotency marker (SET NX, 10 min): a retried request is not counted twice
 *   lex:docs:scopes:{YYYY-MM}       set of scopes whose period started that Brisbane month (admin value reports)
 *   lex:docs:caps                   hash firmId or domain -> cap override (Enterprise). Absent = plan default.
 *
 * Only new drafts count. QA passes, research and editing an existing draft do not.
 * Fail open, with a log line, only when the store is missing or unreachable.
 */
import { createHash } from "node:crypto";
import { getRedis } from "./redis";
import { FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, resetDateLabel, type DocUsage } from "./lex-doc-allowance-shared";
export { FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, resetDateLabel, type DocUsage };

export const DOC_CAPS_KEY = "lex:docs:caps";
export const TRIAL_WINDOW_DAYS = 30;
const DAY = 86400 * 1000;
const REQ_TTL_SECONDS = 600;
const USED_TTL_SECONDS = 400 * 86400; // ~13 months for value reports

type Store = NonNullable<ReturnType<typeof getRedis>>;
type Log = (m: string) => void;
const warn: Log = (m) => console.warn(m);

/** The parts of a Lex firm record the allowance reads. trialStartedAt/trialEndsAt come from the trial work (PR #423). */
export type FirmForDocs = { firmId: string; periodStart?: string; periodEnd?: string; trialStartedAt?: string; trialEndsAt?: string; status?: string; subscriptionId?: string };

/** Adds whole calendar months in UTC, clamping to the last day of the target month (31 Mar - 1 month = 28/29 Feb). */
export function addMonthsClamped(ms: number, months: number): number {
  const d = new Date(ms);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const y = Math.floor(total / 12), m = total - y * 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

/** ms plus `months` calendar months, on day `day` of the target month (clamped to its last day), same UTC time. */
export function atDayClamped(ms: number, months: number, day: number): number {
  const d = new Date(ms);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const y = Math.floor(total / 12), m = total - y * 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

/** Whole months from a to b (at least 1). A Stripe monthly cycle anchored on the 31st still counts as 1. */
function intervalMonths(a: number, b: number): number {
  const da = new Date(a), db = new Date(b);
  let n = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + db.getUTCMonth() - da.getUTCMonth();
  if (n > 1 && addMonthsClamped(a, n) > b + DAY) n -= 1;
  return Math.max(1, n);
}

export type DocPeriod = { scope: string; capKeys: string[]; start: string; end: string; basis: DocUsage["basis"] };

/** YYYY-MM in Brisbane (UTC+10, no daylight saving). */
export function brisbaneMonth(now = new Date()): string {
  return new Date(now.getTime() + 10 * 3600 * 1000).toISOString().slice(0, 7);
}

function calendarMonth(domain: string, now: Date): DocPeriod {
  const month = brisbaneMonth(now);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(`${month}-01T00:00:00+10:00`).toISOString();
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+10:00`;
  return { scope: `dom:${domain}:${month}`, capKeys: [domain], start, end: new Date(next).toISOString(), basis: "month" };
}

const valid = (iso?: string) => (iso && Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : null);

/** Which allowance period applies now. `domain` is the email-domain firm key, used only for the fallback. */
export function resolveDocPeriod(firm: FirmForDocs | null, domain: string, now = new Date(), log: Log = warn): DocPeriod {
  const t = now.getTime();
  if (firm) {
    const ts = valid(firm.trialStartedAt), te = valid(firm.trialEndsAt);
    const pe = valid(firm.periodEnd);
    const paidNow = pe !== null && pe > t && (te === null || t >= te);
    if (ts !== null && t >= ts && !paidNow && (te === null || t < te)) {
      const k = Math.floor((t - ts) / (TRIAL_WINDOW_DAYS * DAY));
      const s = ts + k * TRIAL_WINDOW_DAYS * DAY;
      const e = te !== null ? Math.min(s + TRIAL_WINDOW_DAYS * DAY, te) : s + TRIAL_WINDOW_DAYS * DAY;
      const start = new Date(s).toISOString();
      return { scope: `firm:${firm.firmId}:${start}`, capKeys: [firm.firmId, domain], start, end: new Date(e).toISOString(), basis: "trial" };
    }
    if (pe !== null) {
      let ps = valid(firm.periodStart);
      if (ps === null || ps >= pe || (pe > t && ps > t)) ps = addMonthsClamped(pe, -1);
      const out = (s: number, e: number): DocPeriod => {
        const start = new Date(s).toISOString();
        return { scope: `firm:${firm.firmId}:${start}`, capKeys: [firm.firmId, domain], start, end: new Date(e).toISOString(), basis: "billing" };
      };
      if (pe > t) return out(ps, pe);
      const live = !!firm.subscriptionId && (firm.status === undefined || firm.status === "active" || firm.status === "grace");
      if (live) {
        // Renewal webhook not in yet: the next cycle starts exactly at the stored end (Stripe's next periodStart),
        // so the scope matches what the webhook will store. Later boundaries use the anchor day (29th to 31st survive clamped months).
        const n = intervalMonths(ps, pe);
        const day = Math.max(new Date(ps).getUTCDate(), new Date(pe).getUTCDate());
        const boundary = (j: number) => atDayClamped(pe, j * n, day);
        let k = 0;
        while (boundary(k + 1) <= t && k < 1200) k++;
        log(`[lex-docs] billing period ended, rolled forward ${k + 1} interval(s): firm ${firm.firmId}`);
        return out(k === 0 ? pe : boundary(k), boundary(k + 1));
      }
      // Not live (lapsed or no subscription): keep the last billing scope so no fresh counter is handed out.
      log(`[lex-docs] billing period ended and firm ${firm.firmId} is not live: keeping its last billing scope`);
      return out(ps, pe);
    }
    log(`[lex-docs] fallback to calendar month: firm ${firm.firmId} has no current billing period`);
  } else {
    log("[lex-docs] fallback to calendar month: no firm record for this user");
  }
  return calendarMonth(domain, now);
}

export const usedKey = (scope: string) => `lex:docs:used:${scope}`;
const reqKey = (scope: string, fp: string) => `lex:docs:req:${scope}:${fp}`;
const scopesKey = (month: string) => `lex:docs:scopes:${month}`;

/** Same request content (and optional client request id) gives the same fingerprint, so a retry is not counted again. */
export function requestFingerprint(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

export async function docCap(capKeys: string[], store: Store | null = getRedis()): Promise<number> {
  if (store) {
    for (const k of capKeys) {
      const v = await store.hget<number | string>(DOC_CAPS_KEY, k);
      const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return FIRM_PLAN_MONTHLY_DOCS;
}

export function docLimitMessage(cap: number, resetsOn: string): string {
  return `Your firm has used all ${cap} documents for this period. New drafts pause until ${resetDateLabel(resetsOn)}. Research is still unlimited, and your existing drafts stay open to view and edit. Talk to us about more documents, or book a call.`;
}

const usageOf = (p: DocPeriod, used: number, cap: number): DocUsage =>
  ({ used, cap, periodStart: p.start, resetsOn: p.end, warnAt: Math.min(DOC_WARN_AT, cap), basis: p.basis });

export async function docUsage(p: DocPeriod, store: Store | null = getRedis()): Promise<DocUsage | null> {
  if (!store) return null;
  const [raw, cap] = await Promise.all([store.get<number | string>(usedKey(p.scope)), docCap(p.capKeys, store)]);
  return usageOf(p, Number(raw ?? 0) || 0, cap);
}

export type DocTake =
  | { ok: true; counted: boolean; failOpen?: boolean; usage?: DocUsage; refund: () => Promise<void> }
  | { ok: false; usage: DocUsage; message: string };

const noop = async () => {};

/** Takes one document from the period's allowance. Call refund() if the draft could not start. */
export async function takeDocument(p: DocPeriod, fingerprint: string, store: Store | null = getRedis(), log: Log = warn): Promise<DocTake> {
  if (!store) { log("[lex-docs] fail-open: store not configured"); return { ok: true, counted: false, failOpen: true, refund: noop }; }
  const uk = usedKey(p.scope);
  const rk = reqKey(p.scope, fingerprint);
  try {
    const first = await store.set(rk, "1", { nx: true, ex: REQ_TTL_SECONDS });
    if (first !== "OK") return { ok: true, counted: false, refund: noop }; // retry of a request already counted
    const cap = await docCap(p.capKeys, store);
    const n = await store.incr(uk);
    if (n === 1) await store.expire(uk, USED_TTL_SECONDS);
    if (n > cap) {
      await store.incrby(uk, -1);
      await store.del(rk);
      const usage = usageOf(p, n - 1, cap);
      return { ok: false, usage, message: docLimitMessage(cap, usage.resetsOn) };
    }
    try { await store.sadd(scopesKey(brisbaneMonth(new Date(p.start))), p.scope); } catch { /* report index is best effort */ }
    return {
      ok: true, counted: true, usage: usageOf(p, n, cap),
      refund: async () => { try { await store.incrby(uk, -1); await store.del(rk); } catch { /* best effort */ } },
    };
  } catch (err) {
    log(`[lex-docs] fail-open: store unreachable (${err instanceof Error ? err.name : "error"})`);
    return { ok: true, counted: false, failOpen: true, refund: noop };
  }
}

/** Admin read: every firm period that started in a Brisbane month, with its count (for value reports). */
export async function monthlyDocCounts(month: string, store: Store | null = getRedis()): Promise<Array<{ scope: string; firm: string; periodStart: string; used: number; cap: number }>> {
  if (!store) return [];
  const scopes = ((await store.smembers(scopesKey(month))) ?? []).map(String).sort();
  return Promise.all(scopes.map(async (scope) => {
    const [, firm, ...rest] = scope.split(":");
    return { scope, firm, periodStart: rest.join(":"), used: Number((await store.get<number | string>(usedKey(scope))) ?? 0) || 0, cap: await docCap([firm], store) };
  }));
}

/** Resolve the period for a signed-in firm user: firm record by email when there is one, else the domain fallback. */
export async function docPeriodForUser(email: string, domain: string, now = new Date(), log: Log = warn): Promise<DocPeriod> {
  let firm: FirmForDocs | null = null;
  try {
    const { firmByEmail } = await import("./lex-subscription");
    firm = await firmByEmail(email);
  } catch (err) {
    log(`[lex-docs] firm lookup failed (${err instanceof Error ? err.name : "error"})`);
  }
  return resolveDocPeriod(firm, domain, now, log);
}
