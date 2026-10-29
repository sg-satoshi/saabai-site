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

export const LEX_TERMS_VERSION = "lex-terms-2026-10-30-draft";
export const LEX_SEAT_CAP = 3; // /legal: "Firm plan is $299 a month ... for 3 lawyer seats"
export const GRACE_DAYS = 7;
export const PENDING_TTL_SECONDS = 24 * 3600;
const SEEN_TTL_SECONDS = 30 * 24 * 3600;

export type PendingSignup = {
  id: string; name: string; email: string; firmName: string; phone?: string; abn?: string;
  termsVersion: string; termsAcceptedAt: string; createdAt: string;
};

export type FirmStatus = "active" | "grace" | "lapsed";
export type LexFirm = {
  firmId: string; firmName: string; adminEmail: string; adminName: string;
  members: string[];            // invited staff emails (not including admin)
  granted: string[];            // emails whose 'lex' product this module added
  customerId?: string; subscriptionId?: string;
  status: FirmStatus; graceUntil?: string; cancelAtPeriodEnd?: boolean; periodEnd?: string;
  lapseReason?: "unpaid" | "cancelled";
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

export type SignupInput = { name: string; email: string; firmName: string; phone?: string; abn?: string };
export function validateSignup(body: Record<string, unknown>): { ok: true; value: SignupInput } | { ok: false; error: string; bot?: boolean } {
  // Honeypot: a hidden "website" field real people never fill in.
  if (clean(body.website, 200)) return { ok: false, error: "Invalid request", bot: true };
  const name = clean(body.name, 120);
  const email = lc(clean(body.email, 200));
  const firmName = clean(body.firmName, 160);
  const phone = clean(body.phone, 40);
  const abnRaw = clean(body.abn, 20).replace(/\s+/g, "");
  if (name.length < 2) return { ok: false, error: "Please add your full name" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please use a valid work email" };
  if (firmName.length < 2) return { ok: false, error: "Please add your firm name" };
  if (phone && !/^[+()\d\s-]{6,40}$/.test(phone)) return { ok: false, error: "Please check the phone number" };
  if (abnRaw && !/^\d{11}$/.test(abnRaw)) return { ok: false, error: "An ABN is 11 digits" };
  if (body.acceptTerms !== true) return { ok: false, error: "Please agree to the Lex Terms and Privacy Policy" };
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

/** First time an id is seen returns true; repeats return false. */
export async function markSeen(id: string): Promise<boolean> {
  const r = await redis().set(`lex:stripe:seen:${id}`, "1", { nx: true, ex: SEEN_TTL_SECONDS });
  return r === "OK";
}
export async function unmarkSeen(id: string): Promise<void> { await redis().del(`lex:stripe:seen:${id}`); }

// ── Product grants ───────────────────────────────────────────────────────
/** welcome() is only called for people who already had a login; new logins get the set-password email from ensureClientAccount. */
export type Mailer = { welcome(opts: { name: string; email: string; firmName: string; invitedBy?: string }): Promise<void> };

export function lexAccountCopy(firmName: string, invitedBy?: string): { subject: string; intro: string } {
  return invitedBy
    ? { subject: "You've been added to Lex", intro: `${invitedBy} has added you to ${firmName}'s Lex Firm plan. Lex helps you research and draft; you check and sign off.` }
    : { subject: "Welcome to Lex", intro: `Your Lex Firm plan for ${firmName} is active. You can sign in now and invite up to ${LEX_SEAT_CAP - 1} colleagues from Firm Settings.` };
}

/** Ensure a login exists and has 'lex'. Returns true if this call added 'lex'. */
export async function grantLex(email: string, name: string, firmName: string, mailer: Mailer, invitedBy?: string): Promise<boolean> {
  const e = lc(email);
  const { created } = await ensureClientAccount({ name, email: e, productName: "Lex", ...lexAccountCopy(firmName, invitedBy) });
  const u = await getDirectoryUser(e);
  if (!u) throw new Error("account not created");
  if (!created) await mailer.welcome({ name, email: e, firmName, invitedBy });
  if (u.products?.includes("lex")) return false;
  u.products = [...(u.products ?? []), "lex"];
  if (!u.dashboardUrl || u.dashboardUrl === "/dashboard") u.dashboardUrl = "/lex";
  await saveDirectoryUser(u);
  return true;
}
export async function revokeLex(email: string): Promise<void> {
  const u = await getDirectoryUser(lc(email));
  if (!u?.products?.includes("lex")) return;
  u.products = u.products.filter((p) => p !== "lex");
  await saveDirectoryUser(u);
}

function seatEmails(f: LexFirm): string[] { return [f.adminEmail, ...f.members]; }

async function setAccess(f: LexFirm, on: boolean, mailer: Mailer): Promise<void> {
  for (const e of seatEmails(f)) {
    if (on) { if (await grantLex(e, e === f.adminEmail ? f.adminName : e, f.firmName, mailer, e === f.adminEmail ? undefined : f.adminEmail)) f.granted = [...new Set([...f.granted, e])]; }
    else if (f.granted.includes(e)) await revokeLex(e);
  }
}

// ── Provisioning from a paid checkout ────────────────────────────────────
export type CheckoutLike = {
  id: string; payment_status?: string | null; customer?: unknown; subscription?: unknown;
  customer_email?: string | null; customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
};
const idOf = (v: unknown): string | undefined => (typeof v === "string" ? v : (v as { id?: string } | null)?.id);

export async function provisionLexCheckout(eventId: string, s: CheckoutLike, mailer: Mailer, alert: (msg: string) => Promise<void>): Promise<string> {
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
    const existing = (subId && (await firmBySubscription(subId))) || null;
    const now = new Date().toISOString();
    const firm: LexFirm = existing ?? {
      firmId: `lf_${randomBytes(10).toString("hex")}`,
      firmName: pending?.firmName || s.metadata?.firmName || email.split("@")[1] || email,
      adminEmail: email, adminName: pending?.name || s.customer_details?.name || email,
      members: [], granted: [], status: "active",
      termsVersion: pending?.termsVersion || s.metadata?.termsVersion || LEX_TERMS_VERSION,
      termsAcceptedAt: pending?.termsAcceptedAt || now, createdAt: now, updatedAt: now,
    };
    firm.customerId = idOf(s.customer) ?? firm.customerId;
    firm.subscriptionId = subId ?? firm.subscriptionId;
    firm.status = "active";
    await setAccess(firm, true, mailer);
    await saveFirm(firm);
    const r = redis();
    if (firm.subscriptionId) await r.set(`lex:firm:bysub:${firm.subscriptionId}`, firm.firmId);
    await r.set(`lex:firm:byemail:${firm.adminEmail}`, firm.firmId);
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

export async function lapseFirm(f: LexFirm, reason: "unpaid" | "cancelled", mailer: Mailer): Promise<void> {
  await setAccess(f, false, mailer);
  f.status = "lapsed"; f.lapseReason = reason; f.graceUntil = undefined;
  await saveFirm(f);
}
export async function restoreFirm(f: LexFirm, mailer: Mailer): Promise<void> {
  f.status = "active"; f.lapseReason = undefined; f.graceUntil = undefined;
  void mailer; // restoring access is silent: no repeat welcome emails
  await setAccess(f, true, { welcome: async () => {} });
  await saveFirm(f);
}

/** Handles Lex subscription lifecycle events. Returns a short result, or "ignored" for non-Lex objects. */
export async function handleLexLifecycle(event: { id: string; type: string; data: { object: unknown } }, mailer: Mailer, now = new Date()): Promise<string> {
  const o = event.data.object as SubLike & InvoiceLike;
  const subId = event.type.startsWith("invoice.") ? invoiceSubId(o) : o.id;
  if (!subId) return "ignored";
  const firm = await firmBySubscription(subId);
  if (!firm) return "ignored";
  if (!(await markSeen(`event:${event.id}`))) return "duplicate";
  try {
    switch (event.type) {
      case "invoice.payment_failed":
        if (firm.status === "active") {
          firm.status = "grace";
          firm.graceUntil = new Date(now.getTime() + GRACE_DAYS * 86400_000).toISOString();
          await saveFirm(firm);
          return "grace-started";
        }
        return "noop";
      case "invoice.paid":
        if (firm.status === "grace" || (firm.status === "lapsed" && firm.lapseReason === "unpaid")) { await restoreFirm(firm, mailer); return "restored"; }
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
        if (o.status === "active" && firm.status !== "active" && firm.lapseReason !== "cancelled") { await restoreFirm(firm, mailer); return "restored"; }
        await saveFirm(firm);
        return "updated";
      }
      default:
        return "ignored";
    }
  } catch (err) {
    await unmarkSeen(`event:${event.id}`);
    throw err;
  }
}

/** Cron: lapse firms whose 7-day grace has run out. */
export async function sweepGrace(mailer: Mailer, now = new Date()): Promise<number> {
  const r = redis();
  let cursor = "0"; let n = 0; let pages = 0;
  do {
    const [next, keys] = (await r.scan(cursor, { match: "lex:firm:lf_*", count: 200 })) as [string, string[]];
    cursor = String(next);
    for (const k of keys) {
      const f = parse<LexFirm>(await r.get(k));
      if (f?.status === "grace" && f.graceUntil && new Date(f.graceUntil) <= now) { await lapseFirm(f, "unpaid", mailer); n++; }
    }
  } while (cursor !== "0" && ++pages < 100);
  return n;
}

// ── Staff seats ──────────────────────────────────────────────────────────
export function seatsUsed(f: LexFirm): number { return 1 + f.members.length; }

export async function inviteMember(f: LexFirm, rawEmail: string, mailer: Mailer): Promise<{ ok: true } | { ok: false; error: string; cap?: boolean }> {
  const email = lc(rawEmail);
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please use a valid email" };
  if (email === f.adminEmail || f.members.includes(email)) return { ok: false, error: "That person already has a seat" };
  if (f.status !== "active") return { ok: false, error: "Invites are paused until billing is sorted" };
  if (seatsUsed(f) >= LEX_SEAT_CAP) return { ok: false, error: `Your plan includes ${LEX_SEAT_CAP} seats`, cap: true };
  const other = await firmByEmail(email);
  if (other && other.firmId !== f.firmId) return { ok: false, error: "That person is already on another firm's plan" };
  f.members.push(email);
  if (await grantLex(email, email, f.firmName, mailer, f.adminEmail)) f.granted = [...new Set([...f.granted, email])];
  await saveFirm(f);
  await redis().set(`lex:firm:byemail:${email}`, f.firmId);
  return { ok: true };
}

export async function revokeMember(f: LexFirm, rawEmail: string): Promise<{ ok: boolean; error?: string }> {
  const email = lc(rawEmail);
  if (email === f.adminEmail) return { ok: false, error: "The account owner can't be removed" };
  if (!f.members.includes(email)) return { ok: false, error: "Not a member" };
  f.members = f.members.filter((m) => m !== email);
  if (f.granted.includes(email)) { await revokeLex(email); f.granted = f.granted.filter((g) => g !== email); }
  await saveFirm(f);
  await redis().del(`lex:firm:byemail:${email}`);
  return { ok: true };
}
