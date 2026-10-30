/**
 * Lex Firm plan subscriptions: pending signups, firm records, provisioning, lifecycle and staff seats.
 *
 * Redis keys
 *   lex:signup:pending:{id}     pending signup (24h TTL), created by POST /api/lex/signup
 *   lex:firm:{firmId}           firm record (admin, members, Stripe ids, status)
 *   lex:firm:bysub:{subId}      subscription id -> firmId
 *   lex:firm:byemail:{email}    member or admin email -> firmId
 *   lex:stripe:seen:{id}        idempotency marker for a Stripe event or checkout session (30 days)
 *
 * The 'lex' product on a directory user is only removed when this module added it
 * (firm.granted), so a user who had Lex before a subscription never loses it here.
 */
import { randomBytes } from "crypto";
import { getRedis } from "./redis";
import { getDirectoryUser, saveDirectoryUser } from "./user-directory";
import { ensureClientAccount } from "./client-account";
import { deleteFirmFeedback } from "./lex-feedback";

export const LEX_TERMS_VERSION = "lex-terms-2026-10-30b";
export const LEX_SEAT_CAP = 3; // Firm plan: 3 lawyer seats
export const GRACE_DAYS = 7;
/** Clause 10.7: a cancelled firm's Lex data is kept this long, then deleted (a resubscribe within it keeps the data). */
export const DATA_RETENTION_DAYS = 30;
/** Live Stripe billing portal configuration for Lex (cancel at period end, card update, invoices, Lex terms URL). Not a secret. */
export const LEX_PORTAL_CONFIG_ID = process.env.STRIPE_LEX_PORTAL_CONFIG_ID || "bpc_1UW3vNRz0VJX9iSqluU41MrZ"; // optional env override
export const PENDING_TTL_SECONDS = 24 * 3600;
const SEEN_TTL_SECONDS = 30 * 24 * 3600;

export type PendingSignup = {
  id: string; name: string; email: string; firmName: string; phone?: string; abn?: string;
  termsVersion: string; termsAcceptedAt: string; createdAt: string;
};

/** "trial": invite-only 60-day free trial (lib/lex-trial.ts), no card or Stripe. */
export type FirmStatus = "active" | "grace" | "lapsed" | "trial";
export type LapseReason = "unpaid" | "cancelled" | "trial_ended";
/** Lapses that end the plan and start the clause 10.7 30-day data clock. */
export const isEndedLapse = (r?: LapseReason) => r === "cancelled" || r === "trial_ended";
export type LexFirm = {
  firmId: string; firmName: string; adminEmail: string; adminName: string;
  members: string[];            // invited staff emails (not including admin)
  granted: string[];            // emails whose 'lex' product this module added
  customerId?: string; subscriptionId?: string;
  status: FirmStatus; graceUntil?: string; cancelAtPeriodEnd?: boolean; periodEnd?: string;
  lapseReason?: LapseReason;
  /** Invite-only free trial (lib/lex-trial.ts). */
  trialStartedAt?: string; trialEndsAt?: string; inviteCode?: string; inviteSource?: string;
  /** Set when a trial firm subscribed through /lex/signup (same firm record, linked by owner email). */
  convertedFromTrialAt?: string;
  /** Firm contact details collected at trial signup (privacy policy section 6). */
  phone?: string; address?: FirmAddress;
  /** Set when Saabai ended a trial early from the admin trial list. */
  trialRevokedAt?: string; trialRevokedBy?: string;
  /** Set when the retention sweep cleared personal contact details (scrubFirmPii). */
  piiScrubbedAt?: string;
  /** founding_member: joined a trial while the founding offer was open; may convert at STRIPE_PRICE_LEX_FOUNDING. */
  foundingMember?: boolean;
  foundingLostAt?: string;
  foundingCountedAt?: string;
  /** Stripe event.created (seconds) of the latest successful payment; older payment_failed events are ignored. */
  lastPaidAt?: number;
  /** Staff released when the plan was cancelled (kept for the record only). */
  formerMembers?: string[];
  /** Cancelled plans: Lex data (matters, reviews, research chats) is deleted after this time unless the firm resubscribes. */
  dataDeleteAfter?: string;
  dataDeletedAt?: string;
  resubscribedAs?: string;
  /** Set once when deletion is held because a firm key is shared (so ops are alerted once, not hourly). */
  dataDeletionHeldAt?: string;
  termsVersion: string; termsAcceptedAt: string; createdAt: string; updatedAt: string;
};

function redis() {
  const r = getRedis();
  if (!r) throw new Error("Redis not configured");
  return r;
}
function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  return raw as T;
}
const lc = (s: string) => s.trim().toLowerCase();

// ── Validation ───────────────────────────────────────────────────────────
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FirmAddress = { street: string; suburb: string; state: string; postcode: string };
export type SignupInput = { name: string; email: string; firmName: string; phone?: string; abn?: string; address?: FirmAddress };
export function validateSignup(body: Record<string, unknown>): { ok: true; value: SignupInput } | { ok: false; error: string; bot?: boolean; field?: string } {
  // Honeypot: a hidden "website" field real people never fill in.
  if (clean(body.website, 200)) return { ok: false, error: "Invalid request", bot: true };
  const name = clean(body.name, 120);
  const email = lc(clean(body.email, 200));
  const firmName = clean(body.firmName, 160);
  const phone = clean(body.phone, 40);
  const abnRaw = clean(body.abn, 20).replace(/\s+/g, "");
  if (name.length < 2) return { ok: false, error: "Please add your full name", field: "name" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please use a valid work email", field: "email" };
  if (firmName.length < 2) return { ok: false, error: "Please add your firm name", field: "firmName" };
  if (phone && !/^[+()\d\s-]{6,40}$/.test(phone)) return { ok: false, error: "Please check the phone number", field: "phone" };
  if (abnRaw && !/^\d{11}$/.test(abnRaw)) return { ok: false, error: "An ABN is 11 digits", field: "abn" };
  if (body.acceptTerms !== true) return { ok: false, error: "Please agree to the Lex Terms and Privacy Policy", field: "acceptTerms" };
  return { ok: true, value: { name, email, firmName, ...(phone ? { phone } : {}), ...(abnRaw ? { abn: abnRaw } : {}) } };
}

// ── Pending signups ──────────────────────────────────────────────────────
export async function savePendingSignup(v: SignupInput, now = new Date()): Promise<PendingSignup> {
  const p: PendingSignup = {
    id: `ls_${randomBytes(12).toString("hex")}`, ...v,
    termsVersion: LEX_TERMS_VERSION, termsAcceptedAt: now.toISOString(), createdAt: now.toISOString(),
  };
  await redis().set(`lex:signup:pending:${p.id}`, JSON.stringify(p), { ex: PENDING_TTL_SECONDS });
  return p;
}
export async function getPendingSignup(id: string): Promise<PendingSignup | null> {
  if (!/^ls_[a-f0-9]{24}$/.test(id)) return null;
  return parse<PendingSignup>(await redis().get(`lex:signup:pending:${id}`));
}

// ── Firm records ─────────────────────────────────────────────────────────
const LOCK_TTL_MS = 15_000;
const RELEASE_IF_OWNER = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs fn under a per-firm Redis lock (SET NX PX) with a fresh read of the firm record, then saves it.
 * Every write to a firm record goes through here, so seat checks and webhook writes can't interleave.
 */
export async function withFirmLock<T>(firmId: string, fn: (f: LexFirm) => Promise<T>): Promise<T> {
  const r = redis();
  const key = `lex:firm:lock:${firmId}`;
  const token = randomBytes(8).toString("hex");
  let got = false;
  for (let i = 0; i < 100 && !got; i++) {
    got = (await r.set(key, token, { nx: true, px: LOCK_TTL_MS })) === "OK";
    if (!got) await sleep(50 + Math.floor(Math.random() * 50));
  }
  if (!got) throw new Error("firm busy");
  try {
    const f = await getFirm(firmId);
    if (!f) throw new Error("firm not found");
    const out = await fn(f);
    await saveFirm(f);
    return out;
  } finally {
    // Atomic compare-and-delete: never release a lock another caller took after ours expired.
    await r.eval(RELEASE_IF_OWNER, [key], [token]);
  }
}

export async function getFirm(firmId: string): Promise<LexFirm | null> {
  return parse<LexFirm>(await redis().get(`lex:firm:${firmId}`));
}
export async function saveFirm(f: LexFirm): Promise<void> {
  f.updatedAt = new Date().toISOString();
  await redis().set(`lex:firm:${f.firmId}`, JSON.stringify(f));
}
export async function firmBySubscription(subId: string): Promise<LexFirm | null> {
  const id = await redis().get<string>(`lex:firm:bysub:${subId}`);
  return id ? getFirm(String(id)) : null;
}
export async function firmByEmail(email: string): Promise<LexFirm | null> {
  const id = await redis().get<string>(`lex:firm:byemail:${lc(email)}`);
  return id ? getFirm(String(id)) : null;
}

/** The trial firm this owner email can convert by subscribing: on trial, or trial ended with data not yet deleted. */
export async function convertibleTrialFirm(email: string): Promise<LexFirm | null> {
  const f = await firmByEmail(email);
  if (!f || f.adminEmail !== lc(email) || f.subscriptionId) return null;
  if (f.status === "trial" || (f.status === "lapsed" && f.lapseReason === "trial_ended" && !f.dataDeletedAt)) return f;
  return null;
}

/** First time an id is seen returns true; repeats return false. */
export async function markSeen(id: string): Promise<boolean> {
  const r = await redis().set(`lex:stripe:seen:${id}`, "1", { nx: true, ex: SEEN_TTL_SECONDS });
  return r === "OK";
}
export async function unmarkSeen(id: string): Promise<void> { await redis().del(`lex:stripe:seen:${id}`); }

// ── Product grants ───────────────────────────────────────────────────────
/** welcome() is only called for people who already had a login; new logins get the set-password email from ensureClientAccount. */
export type Mailer = { welcome(opts: { name: string; email: string; firmName: string; invitedBy?: string }): Promise<void> };
const SILENT: Mailer = { welcome: async () => {} };

export function lexAccountCopy(firmName: string, invitedBy?: string): { subject: string; intro: string } {
  return invitedBy
    ? { subject: "You've been added to Lex", intro: `${invitedBy} has added you to ${firmName}'s Lex Firm plan. Lex helps you research and draft; you check and sign off.` }
    : { subject: "Welcome to Lex", intro: `Your Lex Firm plan for ${firmName} is active. You can sign in now and invite up to ${LEX_SEAT_CAP - 1} colleagues from Firm Settings.` };
}

async function hasLexProduct(email: string): Promise<boolean> {
  return !!(await getDirectoryUser(lc(email)))?.products?.includes("lex");
}

/** Ensure a login exists and has 'lex'. Welcome emails go once per firm and person (safe on webhook retries). */
export async function grantLex(firmId: string, email: string, name: string, firmName: string, mailer: Mailer, invitedBy?: string): Promise<void> {
  const e = lc(email);
  const r = redis();
  const first = (await r.set(`lex:welcome:${firmId}:${e}`, "1", { nx: true, ex: SEEN_TTL_SECONDS * 12 })) === "OK";
  const { created } = await ensureClientAccount({ name, email: e, productName: "Lex", ...lexAccountCopy(firmName, invitedBy) });
  const u = await getDirectoryUser(e);
  if (!u) throw new Error("account not created");
  if (!created && first) await mailer.welcome({ name, email: e, firmName, invitedBy });
  if (u.products?.includes("lex")) return;
  u.products = [...(u.products ?? []), "lex"];
  if (!u.dashboardUrl || u.dashboardUrl === "/dashboard") u.dashboardUrl = "/lex";
  await saveDirectoryUser(u);
}
export async function revokeLex(email: string): Promise<void> {
  const u = await getDirectoryUser(lc(email));
  if (!u?.products?.includes("lex")) return;
  u.products = u.products.filter((p) => p !== "lex");
  await saveDirectoryUser(u);
}

function seatEmails(f: LexFirm): string[] { return [f.adminEmail, ...f.members]; }

/**
 * Grants or removes Lex for every seat. A grant is recorded in f.granted (and saved) BEFORE the product is
 * added, so a crash mid-way can never leave Lex on someone this firm won't later remove.
 */
export async function setAccess(f: LexFirm, on: boolean, mailer: Mailer): Promise<void> {
  for (const e of seatEmails(f)) {
    if (on) {
      if (!f.granted.includes(e) && !(await hasLexProduct(e))) { f.granted = [...f.granted, e]; await saveFirm(f); }
      await grantLex(f.firmId, e, e === f.adminEmail ? f.adminName : e, f.firmName, mailer, e === f.adminEmail ? undefined : f.adminEmail);
    } else if (f.granted.includes(e)) await revokeLex(e);
  }
}

// ── Provisioning from a paid checkout ────────────────────────────────────
export type CheckoutLike = {
  id: string; created?: number; payment_status?: string | null; customer?: unknown; subscription?: unknown;
  customer_email?: string | null; customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
};
const idOf = (v: unknown): string | undefined => (typeof v === "string" ? v : (v as { id?: string } | null)?.id);

export async function provisionLexCheckout(eventId: string, s: CheckoutLike, mailer: Mailer, alert: (msg: string) => Promise<void>, eventCreated?: number): Promise<string> {
  if (s.metadata?.product !== "lex") return "not-lex";
  if (s.metadata?.plan !== "firm") {
    // Legacy /api/checkout (Starter/Growth with a setup fee) also tags product "lex". Never auto-provision it.
    await alert(`Legacy Lex checkout ${s.id} (plan "${s.metadata?.plan ?? "none"}") completed. Nothing was provisioned and no welcome email was sent.`);
    return "legacy-plan";
  }
  if (s.payment_status !== "paid") return "unpaid";
  if (!(await markSeen(`session:${s.id}`))) return "duplicate";
  try {
    const pending = s.metadata?.pendingId ? await getPendingSignup(s.metadata.pendingId) : null;
    const email = lc(pending?.email || s.customer_details?.email || s.customer_email || "");
    if (!EMAIL_RE.test(email)) { await alert(`Lex checkout ${s.id} paid but has no usable email. Provision by hand.`); return "no-email"; }
    const subId = idOf(s.subscription);
    const r = redis();
    // Stable firm id per subscription (or session), so a retry after a crash reuses the same firm.
    // A trial firm (live or ended, data not yet deleted) owned by this email converts in place, keeping its seats and data.
    const trialFirm = await convertibleTrialFirm(email);
    const firmId = trialFirm?.firmId ?? `lf_${(subId ?? s.id).replace(/[^A-Za-z0-9]/g, "").slice(-40)}`;
    if (!(await getFirm(firmId))) {
      const now = new Date().toISOString();
      const fresh: LexFirm = {
        firmId, firmName: pending?.firmName || s.metadata?.firmName || email.split("@")[1] || email,
        adminEmail: email, adminName: pending?.name || s.customer_details?.name || email,
        members: [], granted: [], status: "active",
        termsVersion: pending?.termsVersion || s.metadata?.termsVersion || LEX_TERMS_VERSION,
        termsAcceptedAt: pending?.termsAcceptedAt || now, createdAt: now, updatedAt: now,
      };
      await r.set(`lex:firm:${firmId}`, JSON.stringify(fresh), { nx: true });
    }
    if (subId) await r.set(`lex:firm:bysub:${subId}`, firmId);
    // Never silently move an owner off another firm: claim with NX, alert if it already points elsewhere.
    const claimed = (await r.set(`lex:firm:byemail:${email}`, firmId, { nx: true })) === "OK";
    if (!claimed) {
      const cur = String(await r.get(`lex:firm:byemail:${email}`));
      const curFirm = cur !== firmId ? await getFirm(cur) : null;
      if (curFirm && curFirm.status === "lapsed" && isEndedLapse(curFirm.lapseReason)) {
        await r.set(`lex:firm:byemail:${email}`, firmId);
        // Resubscribed within the 30 days: keep the old firm's data (matters are keyed by firm domain, so they come straight back).
        if (!curFirm.dataDeletedAt) await withFirmLock(curFirm.firmId, async (old) => { old.dataDeleteAfter = undefined; old.resubscribedAs = firmId; });
      }
      else if (cur !== firmId) await alert(`Lex checkout ${s.id}: ${email} is already linked to firm ${cur}. The new firm ${firmId} was provisioned but the login stays linked to the old firm. Check by hand.`);
    }
    await withFirmLock(firmId, async (f) => {
      f.customerId = idOf(s.customer) ?? f.customerId;
      f.subscriptionId = subId ?? f.subscriptionId;
      if (f.status === "trial" || f.lapseReason === "trial_ended") {
        f.convertedFromTrialAt = new Date().toISOString(); f.dataDeleteAfter = undefined; f.dataDeletionHeldAt = undefined;
        // Founding place taken on a paid conversion at the founding price (cap mode "paid_conversions").
        if (FOUNDING_CAP_COUNTS === "paid_conversions" && f.foundingMember && s.metadata?.founding === "1" && !f.foundingCountedAt) {
          await consumeFoundingPlace(f.firmId); f.foundingCountedAt = f.convertedFromTrialAt;
        }
      }
      f.status = "active"; f.lapseReason = undefined; f.graceUntil = undefined;
      f.lastPaidAt = Math.max(f.lastPaidAt ?? 0, eventCreated ?? s.created ?? 0);
      await setAccess(f, true, mailer);
    });
    if (pending) await r.del(`lex:signup:pending:${pending.id}`);
    void eventId;
    return "provisioned";
  } catch (err) {
    await unmarkSeen(`session:${s.id}`); // let Stripe's retry try again
    throw err;
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────
type SubLike = { id: string; status?: string; cancel_at_period_end?: boolean; current_period_end?: number; items?: { data?: { current_period_end?: number }[] }; metadata?: Record<string, string> | null };
type InvoiceLike = { id: string; subscription?: unknown; parent?: { subscription_details?: { subscription?: unknown } | null } | null };
export const invoiceSubId = (inv: InvoiceLike) => idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription);

/**
 * Founding status is lost on ANY lapse of a paid founding subscription (unpaid under 10.6, or cancelled).
 * Single switch in case Shane rules otherwise.
 */
export const FOUNDING_LOST_ON_LAPSE = true;
/** What the founding cap counts: "paid_conversions" (default) or "trial_starts". Shane to confirm. */
export const FOUNDING_CAP_COUNTS: "paid_conversions" | "trial_starts" = "paid_conversions";
export const FOUNDING_COUNT_KEY = "lex:trial:founding:count";
/**
 * Founding places in paid_conversions mode are RESERVED atomically when a founding checkout session is
 * created (INCR against the cap, rolled back over the cap), held in a sorted set scored by expiry, and either
 * consumed on payment or released on checkout.session.expired, a checkout error, or the hourly sweep.
 * FOUNDING_COUNT_KEY = paid places + live reservations.
 */
export const FOUNDING_RES_KEY = "lex:trial:founding:res";
export const FOUNDING_RES_TTL_MS = 25 * 3600_000; // Stripe Checkout sessions expire after 24h
export async function reserveFoundingPlace(firmId: string, cap: number | null, now = Date.now()): Promise<boolean> {
  const r = redis();
  const added = Number(await r.zadd(FOUNDING_RES_KEY, { score: now + FOUNDING_RES_TTL_MS, member: firmId }));
  if (!added) return true; // this firm already holds a place (score refreshed)
  const n = Number(await r.incr(FOUNDING_COUNT_KEY));
  if (cap !== null && n > cap) {
    await r.incrby(FOUNDING_COUNT_KEY, -1);
    await r.zrem(FOUNDING_RES_KEY, firmId);
    return false;
  }
  return true;
}
export async function releaseFoundingPlace(firmId: string): Promise<boolean> {
  const r = redis();
  if (Number(await r.zrem(FOUNDING_RES_KEY, firmId)) !== 1) return false;
  await r.incrby(FOUNDING_COUNT_KEY, -1);
  return true;
}
/** On payment: the reservation becomes the paid place (counted once). A lapsed reservation is re-counted. */
export async function consumeFoundingPlace(firmId: string): Promise<void> {
  const r = redis();
  if (Number(await r.zrem(FOUNDING_RES_KEY, firmId)) !== 1) await r.incr(FOUNDING_COUNT_KEY);
}
export async function sweepFoundingReservations(now = Date.now()): Promise<number> {
  const due = (await redis().zrange(FOUNDING_RES_KEY, "-inf", now, { byScore: true })) as string[];
  let n = 0;
  for (const id of due) if (await releaseFoundingPlace(String(id))) n++;
  return n;
}

/** Mutates f (caller holds the firm lock). */
export async function lapseFirm(f: LexFirm, reason: LapseReason, mailer: Mailer, dataClockFrom = new Date()): Promise<void> {
  await setAccess(f, false, mailer);
  const wasPaid = f.status !== "trial" && !!f.subscriptionId;
  f.status = "lapsed"; f.lapseReason = reason; f.graceUntil = undefined;
  if (FOUNDING_LOST_ON_LAPSE && wasPaid && f.foundingMember) { f.foundingMember = false; f.foundingLostAt = new Date().toISOString(); }
  if (isEndedLapse(reason)) {
    // A cancelled plan never comes back (a new signup makes a new firm), so free former staff to join another firm.
    // The owner keeps their link so they can still see the plan and reach billing.
    const r = redis();
    for (const m of f.members) await r.eval(RELEASE_IF_OWNER, [`lex:firm:byemail:${m}`], [f.firmId]);
    f.formerMembers = [...new Set([...(f.formerMembers ?? []), ...f.members])];
    f.members = [];
    f.granted = f.granted.filter((g) => g === f.adminEmail);
    // Clause 10.7: 30 days from the end (for a trial, from the trial end date, not the sweep time).
    if (!f.dataDeleteAfter) f.dataDeleteAfter = new Date(dataClockFrom.getTime() + DATA_RETENTION_DAYS * 86400_000).toISOString();
  }
}
/** Mutates f (caller holds the firm lock). Restoring is silent: no repeat welcome emails. */
export async function restoreFirm(f: LexFirm): Promise<void> {
  f.status = "active"; f.lapseReason = undefined; f.graceUntil = undefined;
  await setAccess(f, true, SILENT);
}

type LexEvent = { id: string; type: string; created?: number; data: { object: unknown } };

/** Handles Lex subscription lifecycle events. Returns a short result, or "ignored" for non-Lex objects. */
export async function handleLexLifecycle(event: LexEvent, mailer: Mailer, now = new Date()): Promise<string> {
  const o = event.data.object as SubLike & InvoiceLike;
  const subId = event.type.startsWith("invoice.") ? invoiceSubId(o) : o.id;
  if (!subId) return "ignored";
  const found = await firmBySubscription(subId);
  if (!found) return "ignored";
  if (!(await markSeen(`event:${event.id}`))) return "duplicate";
  const created = event.created ?? Math.floor(now.getTime() / 1000);
  try {
    return await withFirmLock(found.firmId, async (firm) => {
      switch (event.type) {
        case "invoice.payment_failed":
          // A late or retried failure from before the last successful payment must not start a grace.
          if ((firm.lastPaidAt ?? 0) >= created) return "stale";
          if (firm.status === "active") {
            firm.status = "grace";
            firm.graceUntil = new Date(now.getTime() + GRACE_DAYS * 86400_000).toISOString();
            return "grace-started";
          }
          return "noop";
        case "invoice.paid":
          firm.lastPaidAt = Math.max(firm.lastPaidAt ?? 0, created);
          if (firm.status === "grace" || (firm.status === "lapsed" && firm.lapseReason === "unpaid")) { await restoreFirm(firm); return "restored"; }
          return "noop";
        case "customer.subscription.deleted":
          await lapseFirm(firm, "cancelled", mailer);
          return "lapsed";
        case "customer.subscription.updated":
        case "customer.subscription.created": {
          firm.cancelAtPeriodEnd = !!o.cancel_at_period_end;
          const pe = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
          if (pe) firm.periodEnd = new Date(pe * 1000).toISOString();
          if (o.status === "canceled") { await lapseFirm(firm, "cancelled", mailer); return "lapsed"; }
          if (o.status === "active" && firm.status !== "active" && !isEndedLapse(firm.lapseReason)) { await restoreFirm(firm); return "restored"; }
          return "updated";
        }
        default:
          return "ignored";
      }
    });
  } catch (err) {
    await unmarkSeen(`event:${event.id}`);
    throw err;
  }
}

/** Live Stripe subscription status, or null if it can't be read right now. */
export type StatusLookup = (subscriptionId: string) => Promise<string | null>;
const UNPAID_STATUSES = new Set(["past_due", "unpaid", "incomplete_expired", "canceled", "paused"]);

/**
 * Cron: for firms whose 7-day grace has run out, re-check the live Stripe subscription first.
 * Still unpaid: lapse. Active again: restore. Unknown (Stripe unreachable): leave for the next run.
 */
export async function sweepGrace(mailer: Mailer, liveStatus: StatusLookup, now = new Date()): Promise<{ lapsed: number; restored: number; skipped: number }> {
  const r = redis();
  const out = { lapsed: 0, restored: 0, skipped: 0 };
  let cursor = "0"; let pages = 0;
  do {
    const [next, keys] = (await r.scan(cursor, { match: "lex:firm:lf_*", count: 200 })) as [string, string[]];
    cursor = String(next);
    for (const k of keys) {
      const f0 = parse<LexFirm>(await r.get(k));
      if (!(f0?.status === "grace" && f0.graceUntil && new Date(f0.graceUntil) <= now)) continue;
      const status = f0.subscriptionId ? await liveStatus(f0.subscriptionId).catch(() => null) : null;
      if (!status) { out.skipped++; continue; }
      await withFirmLock(f0.firmId, async (f) => {
        if (f.status !== "grace") return;
        if (status === "active" || status === "trialing") { await restoreFirm(f); out.restored++; }
        else if (UNPAID_STATUSES.has(status)) { await lapseFirm(f, "unpaid", mailer); out.lapsed++; }
        else out.skipped++;
      });
    }
  } while (cursor !== "0" && ++pages < 100);
  return out;
}

// ── Staff seats ──────────────────────────────────────────────────────────
export function seatsUsed(f: LexFirm): number { return 1 + f.members.length; }
export const INVITE_GENERIC_ERROR = "We couldn't add that person. Check the email, or contact us if it keeps happening.";

/** Atomic: the seat check and the add happen under the firm lock. Returns the updated firm. */
export async function inviteMember(firmId: string, rawEmail: string, mailer: Mailer): Promise<{ ok: true; firm: LexFirm } | { ok: false; error: string; cap?: boolean; firm?: LexFirm }> {
  const email = lc(rawEmail);
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please use a valid email" };
  const other = await firmByEmail(email);
  if (other && other.firmId !== firmId) return { ok: false, error: INVITE_GENERIC_ERROR };
  let res: { ok: boolean; error?: string; cap?: boolean } = { ok: true };
  const firm = await withFirmLock(firmId, async (f) => {
    if (email === f.adminEmail || f.members.includes(email)) { res = { ok: false, error: "That person already has a seat" }; return f; }
    if (f.status !== "active" && f.status !== "trial") { res = { ok: false, error: "Invites are paused until billing is sorted" }; return f; }
    if (seatsUsed(f) >= LEX_SEAT_CAP) { res = { ok: false, error: `Your plan includes ${LEX_SEAT_CAP} seats`, cap: true }; return f; }
    // Claim the email for this firm atomically; another firm may have claimed it since the check above.
    const claimed = (await redis().set(`lex:firm:byemail:${email}`, f.firmId, { nx: true })) === "OK"
      || String(await redis().get(`lex:firm:byemail:${email}`)) === f.firmId;
    if (!claimed) { res = { ok: false, error: INVITE_GENERIC_ERROR }; return f; }
    f.members.push(email);
    if (!f.granted.includes(email) && !(await hasLexProduct(email))) f.granted.push(email);
    await saveFirm(f);
    await grantLex(f.firmId, email, email, f.firmName, mailer, f.adminEmail);
    return f;
  });
  return res.ok ? { ok: true, firm } : { ok: false, error: res.error!, cap: res.cap, firm };
}

export async function revokeMember(firmId: string, rawEmail: string): Promise<{ ok: boolean; error?: string; firm?: LexFirm }> {
  const email = lc(rawEmail);
  let res: { ok: boolean; error?: string } = { ok: true };
  const firm = await withFirmLock(firmId, async (f) => {
    if (email === f.adminEmail) { res = { ok: false, error: "The account owner can't be removed" }; return f; }
    if (!f.members.includes(email)) { res = { ok: false, error: "Not a member" }; return f; }
    f.members = f.members.filter((m) => m !== email);
    if (f.granted.includes(email)) { await revokeLex(email); f.granted = f.granted.filter((g) => g !== email); }
    await redis().del(`lex:firm:byemail:${email}`);
    return f;
  });
  return { ...res, firm };
}

// ── Clause 10.7: delete a cancelled firm's Lex data after 30 days ─────────
export type DataDeleter = { matters(firmKey: string): Promise<number>; threads(email: string): Promise<void> };
export type DeletionMode = "off" | "dry_run" | "live";
/** LEX_DATA_DELETION_MODE: off | dry_run | live. Unset or anything else means dry_run (log only, delete nothing). */
export function deletionMode(raw = process.env.LEX_DATA_DELETION_MODE): DeletionMode {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "off" || v === "live" ? v : "dry_run";
}
export type RetentionOpts = {
  mode?: DeletionMode;
  log?: (line: string) => void;          // one line per firm: firmId, counts, outcome. Never names or emails.
  alert?: (msg: string) => Promise<void>; // ops alert when a firm's data is held because its key is shared
};

/**
 * Cron: for cancelled firms past dataDeleteAfter, delete their matters (incl. reviews and drafts saved to them) and
 * research chats. If ANY of the firm's keys is still used by someone with Lex, nothing is deleted, dataDeletedAt stays
 * unset and ops are alerted once. dry_run (the default) only logs what would happen.
 */
export async function sweepDataRetention(del: DataDeleter, firmKeyOf: (email: string) => string, lexUsers: () => Promise<string[]>, now = new Date(), opts: RetentionOpts = {}): Promise<{ deleted: number; held: number; dryRun: number; mode: DeletionMode }> {
  const mode = opts.mode ?? deletionMode();
  const log = opts.log ?? ((l: string) => console.log(l));
  const out = { deleted: 0, held: 0, dryRun: 0, mode };
  if (mode === "off") return out;
  const r = redis();
  let cursor = "0"; let pages = 0; let live: Set<string> | null = null;
  do {
    const [next, keys] = (await r.scan(cursor, { match: "lex:firm:lf_*", count: 200 })) as [string, string[]];
    cursor = String(next);
    for (const k of keys) {
      const f0 = parse<LexFirm>(await r.get(k));
      if (!(f0?.status === "lapsed" && isEndedLapse(f0.lapseReason) && f0.dataDeleteAfter && !f0.dataDeletedAt && new Date(f0.dataDeleteAfter) <= now)) continue;
      live ??= new Set((await lexUsers()).map(firmKeyOf));
      const liveKeys = live;
      await withFirmLock(f0.firmId, async (f) => {
        if (f.status !== "lapsed" || !f.dataDeleteAfter || f.dataDeletedAt) return;
        const people = [f.adminEmail, ...(f.formerMembers ?? [])];
        const firmKeys = [...new Set(people.map(firmKeyOf))];
        const shared = firmKeys.filter((key) => liveKeys.has(key)).length;
        if (shared > 0) {
          out.held++;
          log(`[lex retention] firm=${f.firmId} mode=${mode} keys=${firmKeys.length} shared=${shared} outcome=held`);
          if (!f.dataDeletionHeldAt) {
            f.dataDeletionHeldAt = now.toISOString();
            await opts.alert?.(`Lex data deletion held for firm ${f.firmId}: ${shared} of ${firmKeys.length} firm keys are still used by a current Lex login. Nothing was deleted. Check by hand.`);
          }
          return;
        }
        const chatPeople: string[] = [];
        for (const e of people) if (!(await hasLexProduct(e))) chatPeople.push(e);
        if (mode === "dry_run") {
          out.dryRun++;
          const fb = await deleteFirmFeedback(firmKeys, people, true);
          log(`[lex retention] firm=${f.firmId} mode=dry_run keys=${firmKeys.length} chats=${chatPeople.length} feedback=${fb} outcome=would_delete`);
          return;
        }
        let matters = 0;
        for (const key of firmKeys) matters += await del.matters(key);
        for (const e of chatPeople) await del.threads(e);
        const feedback = await deleteFirmFeedback(firmKeys, people, false);
        f.dataDeletedAt = now.toISOString();
        // An ended trial's owner email link is released once its data is gone. A new trial is still refused by the
        // hashed one-trial-per-firm claim marker. Paid firms keep the owner link for resubscribe.
        if (f.lapseReason === "trial_ended") await r.eval(RELEASE_IF_OWNER, [`lex:firm:byemail:${f.adminEmail}`], [f.firmId]);
        scrubFirmPii(f);
        out.deleted++;
        log(`[lex retention] firm=${f.firmId} mode=live keys=${firmKeys.length} matters=${matters} chats=${chatPeople.length} feedback=${feedback} outcome=deleted`);
      });
    }
  } while (cursor !== "0" && ++pages < 100);
  return out;
}

/**
 * After data deletion: clear personal contact details from the firm record, keeping only non-PII markers
 * (ids, status, dates, plan flags). Owner name, phone and address always go, and so do former staff emails.
 * The owner email is replaced for ended trials; paid firms keep it so the owner can resubscribe
 * (their record is a billing record linked to Stripe).
 */
export const SCRUBBED = "[deleted]";
export function scrubFirmPii(f: LexFirm): void {
  f.adminName = SCRUBBED;
  delete f.phone; delete f.address;
  f.formerMembers = [];
  f.members = [];
  if (f.lapseReason === "trial_ended") {
    f.granted = [];
    f.adminEmail = `deleted@${f.firmId}.invalid`;
    f.firmName = "Deleted firm"; // the firm's domain survives only as the HMAC claim marker
  }
  f.piiScrubbedAt = new Date().toISOString();
}

/**
 * True if a Stripe checkout, subscription or invoice belongs to Lex. Lex is handled (and its purchase reported once)
 * by /api/stripe/webhook, so other webhooks on the account use this to skip Lex events.
 */
export async function isLexStripeObject(o: unknown, eventType: string): Promise<boolean> {
  const x = (o ?? {}) as {
    id?: string; metadata?: Record<string, string> | null;
    subscription_details?: { metadata?: Record<string, string> | null } | null;
    parent?: { subscription_details?: { metadata?: Record<string, string> | null; subscription?: unknown } | null } | null;
    subscription?: unknown;
  };
  const metas = [x.metadata, x.subscription_details?.metadata, x.parent?.subscription_details?.metadata];
  if (metas.some((m) => m?.product === "lex")) return true;
  const subId = eventType.startsWith("customer.subscription.") ? x.id : idOf(x.subscription) ?? idOf(x.parent?.subscription_details?.subscription);
  return !!(subId && (await firmBySubscription(subId)));
}
