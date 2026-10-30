/**
 * Lex invite-only free trial (Shane, 30 Oct 2026): admin-made invite codes, 60 days free, no card, no Stripe.
 * Trial firms are ordinary LexFirm records (lib/lex-subscription) with status "trial", so seats (3) and the
 * monthly document cap apply unchanged. Subscribing through /lex/signup with the owner's email converts the
 * same firm in place (provisionLexCheckout). A trial that ends without a subscription lapses like a cancelled
 * plan ("trial_ended"), and the clause 10.7 30-day data clock runs from the trial end date.
 *
 * Redis keys
 *   lex:trial:invite:{code}        invite record (JSON)
 *   lex:trial:invite:uses:{code}   redemption counter (INCR, atomic cap)
 *   lex:trial:invites              set of invite codes (admin list)
 *   lex:trial:firms                set of trial firm ids (sweep and admin list)
 */
import { randomBytes } from "crypto";
import { getRedis } from "./redis";
import {
  LEX_TERMS_VERSION, type LexFirm, type Mailer, type SignupInput,
  getFirm, lapseFirm, setAccess, withFirmLock, FOUNDING_CAP_COUNTS, FOUNDING_COUNT_KEY,
} from "./lex-subscription";

export const TRIAL_DAYS = 60;
/** In-app reminders on these trial days (day 1 is the signup day). */
export const TRIAL_REMIND_DAYS = [45, 55] as const;
export const MAX_INVITE_USES = 500;
export const MAX_INVITE_DAYS = 180;
/** S&M beta plan B1: invites are single-use with a 14-day expiry unless admin picks otherwise. */
export const DEFAULT_INVITE_DAYS = 14;
const DAY = 86400_000;

export type TrialInvite = {
  code: string; label: string; maxUses: number; expiresAt: string;
  createdBy: string; createdAt: string; revokedAt?: string;
};
export type InviteView = TrialInvite & { uses: number; state: "open" | "used_up" | "expired" | "revoked" };

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

// ── Invite codes ─────────────────────────────────────────────────────────
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function newInviteCode(): string {
  const b = randomBytes(10);
  return "LEX-" + Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}
/** Normalises what a person typed or pasted: case, spaces, missing prefix. Null if it can't be a code. */
export function normaliseCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let c = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!c.startsWith("LEX-")) c = "LEX-" + c.replace(/^LEX/, "");
  return /^LEX-[A-HJ-NP-Z2-9]{10}$/.test(c) ? c : null;
}

export async function createInvite(opts: { label?: string; maxUses?: number; expiresInDays?: number; createdBy: string }, now = new Date()): Promise<TrialInvite> {
  const maxUses = Math.min(MAX_INVITE_USES, Math.max(1, Math.floor(Number(opts.maxUses) || 1)));
  const days = Math.min(MAX_INVITE_DAYS, Math.max(1, Math.floor(Number(opts.expiresInDays) || DEFAULT_INVITE_DAYS)));
  const inv: TrialInvite = {
    code: newInviteCode(), label: String(opts.label ?? "").trim().slice(0, 80) || "Direct invite",
    maxUses, expiresAt: new Date(now.getTime() + days * DAY).toISOString(),
    createdBy: lc(opts.createdBy).slice(0, 200), createdAt: now.toISOString(),
  };
  const r = redis();
  await r.set(`lex:trial:invite:${inv.code}`, JSON.stringify(inv), { nx: true });
  await r.sadd("lex:trial:invites", inv.code);
  return inv;
}
export async function getInvite(code: string): Promise<TrialInvite | null> {
  const c = normaliseCode(code);
  return c ? parse<TrialInvite>(await redis().get(`lex:trial:invite:${c}`)) : null;
}
async function usesOf(code: string): Promise<number> {
  return Number(await redis().get(`lex:trial:invite:uses:${code}`)) || 0;
}
export function inviteState(inv: TrialInvite, uses: number, now = new Date()): InviteView["state"] {
  if (inv.revokedAt) return "revoked";
  if (new Date(inv.expiresAt) <= now) return "expired";
  if (uses >= inv.maxUses) return "used_up";
  return "open";
}
export async function listInvites(now = new Date()): Promise<InviteView[]> {
  const codes = ((await redis().smembers("lex:trial:invites")) as string[]) ?? [];
  const out: InviteView[] = [];
  for (const c of codes) {
    const inv = await getInvite(c);
    if (!inv) continue;
    const uses = await usesOf(inv.code);
    out.push({ ...inv, uses, state: inviteState(inv, uses, now) });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function revokeInvite(code: string, now = new Date()): Promise<boolean> {
  const inv = await getInvite(code);
  if (!inv) return false;
  if (!inv.revokedAt) { inv.revokedAt = now.toISOString(); await redis().set(`lex:trial:invite:${inv.code}`, JSON.stringify(inv)); }
  return true;
}

/** Same message for unknown, expired, used up and revoked, so codes can't be probed. */
export const INVITE_INVALID = "That invite code isn't valid any more. Ask us for a new one.";
export async function checkInvite(code: unknown, now = new Date()): Promise<{ ok: true; invite: TrialInvite } | { ok: false; error: string }> {
  const c = normaliseCode(code);
  const inv = c ? await getInvite(c) : null;
  if (!inv || inviteState(inv, await usesOf(inv.code), now) !== "open") return { ok: false, error: INVITE_INVALID };
  return { ok: true, invite: inv };
}

// ── Trial firms ──────────────────────────────────────────────────────────
export type TrialStage = "none" | "day45" | "day55" | "ended";
export type TrialInfo = { daysLeft: number; day: number; stage: TrialStage; endsAt: string };

/** Days left counts the rest of today, so a trial started today shows 60. */
export function trialInfo(f: Pick<LexFirm, "trialStartedAt" | "trialEndsAt">, now = new Date()): TrialInfo | null {
  if (!f.trialEndsAt || !f.trialStartedAt) return null;
  const end = new Date(f.trialEndsAt).getTime();
  const daysLeft = Math.max(0, Math.ceil((end - now.getTime()) / DAY));
  const day = Math.min(TRIAL_DAYS, Math.floor((now.getTime() - new Date(f.trialStartedAt).getTime()) / DAY) + 1);
  const stage: TrialStage = daysLeft === 0 ? "ended" : day >= TRIAL_REMIND_DAYS[1] ? "day55" : day >= TRIAL_REMIND_DAYS[0] ? "day45" : "none";
  return { daysLeft, day, stage, endsAt: f.trialEndsAt };
}

export const TRIAL_GENERIC_ERROR = "We couldn't start a trial for that email. If your firm already uses Lex, sign in instead, or contact us.";

/**
 * Starts a 60-day trial: checks and redeems the invite atomically (INCR against maxUses), claims the owner email,
 * creates the firm and grants Lex. Every failure after the redeem gives the use back.
 */
/**
 * Founding offer (admin-configurable). Trial firms that start while it is enabled, before the deadline and
 * under the cap, are flagged foundingMember. Off until an admin turns it on. Key: lex:trial:founding.
 */
export type FoundingConfig = { enabled: boolean; deadline: string | null; cap: number | null; updatedBy?: string; updatedAt?: string };
const FOUNDING_KEY = "lex:trial:founding";

export const MAX_FOUNDING_CAP = 10000;
export async function getFoundingConfig(): Promise<FoundingConfig & { used: number }> {
  const r = redis();
  const c = parse<FoundingConfig>(await r.get(FOUNDING_KEY)) ?? { enabled: false, deadline: null, cap: null };
  return { ...c, used: Number(await r.get(FOUNDING_COUNT_KEY)) || 0 };
}
export async function setFoundingConfig(raw: { enabled?: unknown; deadline?: unknown; cap?: unknown }, by: string, now = new Date()): Promise<FoundingConfig> {
  let deadline: string | null = null;
  if (typeof raw.deadline === "string" && raw.deadline.trim()) {
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw.deadline.trim()) ? `${raw.deadline.trim()}T23:59:59+10:00` : raw.deadline);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid deadline");
    deadline = d.toISOString();
  }
  const capN = raw.cap === null || raw.cap === "" || raw.cap === undefined ? null : Math.floor(Number(raw.cap));
  if (capN !== null && !(capN >= 0 && capN <= MAX_FOUNDING_CAP)) throw new Error("Invalid cap");
  const c: FoundingConfig = { enabled: raw.enabled === true, deadline, cap: capN, updatedBy: lc(by).slice(0, 200), updatedAt: now.toISOString() };
  await redis().set(FOUNDING_KEY, JSON.stringify(c));
  return c;
}
/** Claims a founding place (atomic INCR against the cap). Returns false when the offer is closed. */
/**
 * Flags a new trial as founding. With FOUNDING_CAP_COUNTS "trial_starts" the place is taken now (atomic INCR);
 * with "paid_conversions" (default) the trial is flagged while places remain and the count moves on paid conversion.
 */
async function claimFounding(now: Date): Promise<false | "counted" | "flagged"> {
  const c = await getFoundingConfig();
  if (!c.enabled || (c.deadline && now.getTime() > Date.parse(c.deadline))) return false;
  if (FOUNDING_CAP_COUNTS === "paid_conversions") return c.cap === null || c.used < c.cap ? "flagged" : false;
  const n = Number(await redis().incr(FOUNDING_COUNT_KEY));
  if (c.cap !== null && n > c.cap) { await redis().incrby(FOUNDING_COUNT_KEY, -1); return false; }
  return "counted";
}
/** Whether checkout may still give the founding price (switch on, and places left when the cap counts paid conversions). */
export async function foundingCheckoutOpen(): Promise<boolean> {
  const c = await getFoundingConfig();
  if (!c.enabled) return false;
  return FOUNDING_CAP_COUNTS === "trial_starts" || c.cap === null || c.used < c.cap;
}

/**
 * Checkout price for a /lex/signup. The founding price (STRIPE_PRICE_LEX_FOUNDING) applies only when ALL hold:
 * the admin founding switch is ON, the env var is set, the firm is flagged foundingMember, and it is converting
 * from an ACTIVE trial before trialEndsAt. Otherwise (including trial_ended firms) the normal
 * STRIPE_LEX_FIRM_PRICE_ID ($299) applies.
 */
export function lexCheckoutPrice(
  trialFirm: Pick<LexFirm, "foundingMember" | "status" | "trialEndsAt"> | null,
  foundingSwitchOn: boolean,
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): { price: string | undefined; founding: boolean } {
  const normal = env.STRIPE_LEX_FIRM_PRICE_ID?.trim() || undefined;
  const founding = env.STRIPE_PRICE_LEX_FOUNDING?.trim() || undefined;
  const activeTrial = trialFirm?.status === "trial" && !!trialFirm.trialEndsAt && now.getTime() < Date.parse(trialFirm.trialEndsAt);
  if (foundingSwitchOn && founding && trialFirm?.foundingMember && activeTrial) return { price: founding, founding: true };
  return { price: normal, founding: false };
}

/** Webmail and ISP domains: one trial per full email address; any other domain is treated as one firm. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "outlook.com.au", "hotmail.com", "hotmail.com.au", "live.com", "live.com.au",
  "msn.com", "yahoo.com", "yahoo.com.au", "ymail.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com",
  "pm.me", "gmx.com", "zoho.com", "fastmail.com", "bigpond.com", "bigpond.net.au", "optusnet.com.au", "tpg.com.au", "iinet.net.au", "internode.on.net",
]);
/** One trial per firm, forever: keyed by email domain, or by full email for public domains. */
export function trialClaimKey(email: string): string {
  const e = lc(email);
  const domain = e.split("@")[1] ?? "";
  return `lex:trial:claim:${PUBLIC_EMAIL_DOMAINS.has(domain) ? e : domain}`;
}
export const TRIAL_ALREADY_USED = "A Lex free trial has already been used for this firm. To keep using Lex, subscribe or talk to us at hello@saabai.ai.";
export const SELF_SERVE_SOURCE = "Self-serve";

/**
 * Starts a 60-day trial. The trial is open self-serve: an invite code is optional (kept for tracking; a code that
 * is given must be valid and is redeemed atomically). Claims one-trial-per-firm (permanent), then the owner email,
 * creates the firm and grants Lex. Every failure after a claim gives it back. Never charges or converts to paid.
 * Public callers reach this only through activateTrial (verified email).
 */
export async function startTrial(v: SignupInput, rawCode: unknown, mailer: Mailer, now = new Date()): Promise<{ ok: true; firm: LexFirm } | { ok: false; error: string; field?: string }> {
  let inv: TrialInvite | null = null;
  if (typeof rawCode === "string" && rawCode.trim()) {
    const chk = await checkInvite(rawCode, now);
    if (!chk.ok) return { ok: false, error: chk.error, field: "code" };
    inv = chk.invite;
  }
  const r = redis();
  const email = lc(v.email);
  if (await r.get(`lex:firm:byemail:${email}`)) return { ok: false, error: TRIAL_GENERIC_ERROR, field: "email" };
  if (await r.get(trialClaimKey(email))) return { ok: false, error: TRIAL_ALREADY_USED, field: "email" };
  const usesKey = inv ? `lex:trial:invite:uses:${inv.code}` : null;
  if (inv && usesKey) {
    const n = Number(await r.incr(usesKey));
    if (n > inv.maxUses) { await r.incrby(usesKey, -1); return { ok: false, error: INVITE_INVALID, field: "code" }; }
  }
  const refundUse = async () => { if (usesKey) await r.incrby(usesKey, -1); };
  const firmId = `lf_t${randomBytes(10).toString("hex")}`;
  const claimKey = trialClaimKey(email);
  if ((await r.set(claimKey, firmId, { nx: true })) !== "OK") { await refundUse(); return { ok: false, error: TRIAL_ALREADY_USED, field: "email" }; }
  const claimed = (await r.set(`lex:firm:byemail:${email}`, firmId, { nx: true })) === "OK";
  if (!claimed) { await refundUse(); await r.del(claimKey); return { ok: false, error: TRIAL_GENERIC_ERROR, field: "email" }; }
  let founding: false | "counted" | "flagged" = false;
  try {
    founding = await claimFounding(now);
    const iso = now.toISOString();
    const firm: LexFirm = {
      firmId, firmName: v.firmName, adminEmail: email, adminName: v.name,
      members: [], granted: [], status: "trial",
      trialStartedAt: iso, trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY).toISOString(),
      inviteCode: inv?.code, inviteSource: inv?.label ?? SELF_SERVE_SOURCE, ...(founding ? { foundingMember: true } : {}),
      termsVersion: LEX_TERMS_VERSION, termsAcceptedAt: iso, createdAt: iso, updatedAt: iso,
    };
    await r.set(`lex:firm:${firmId}`, JSON.stringify(firm), { nx: true });
    await r.sadd("lex:trial:firms", firmId);
    const out = await withFirmLock(firmId, async (f) => { await setAccess(f, true, mailer); return f; });
    return { ok: true, firm: out };
  } catch (err) {
    await refundUse();
    if (founding === "counted") await r.incrby(FOUNDING_COUNT_KEY, -1);
    await r.del(`lex:firm:byemail:${email}`);
    await r.del(claimKey);
    throw err;
  }
}

/** Email verification before the trial activates. Pending requests live 24 hours; a token works once. */
export const VERIFY_TTL_SECONDS = 24 * 3600;
export type TrialVerifySender = (o: { email: string; name: string; url: string }) => Promise<void>;
export async function requestTrial(v: SignupInput, rawCode: unknown, send: TrialVerifySender, site: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  if (typeof rawCode === "string" && rawCode.trim()) {
    const chk = await checkInvite(rawCode, now);
    if (!chk.ok) return { ok: false, error: chk.error, field: "code" };
  }
  const r = redis();
  const email = lc(v.email);
  if (await r.get(`lex:firm:byemail:${email}`)) return { ok: false, error: TRIAL_GENERIC_ERROR, field: "email" };
  if (await r.get(trialClaimKey(email))) return { ok: false, error: TRIAL_ALREADY_USED, field: "email" };
  const token = randomBytes(24).toString("hex");
  await r.set(`lex:trial:verify:${token}`, JSON.stringify({ v, code: normaliseCode(rawCode) || null, at: now.toISOString() }), { ex: VERIFY_TTL_SECONDS });
  await send({ email, name: v.name, url: `${site}/lex/signup/trial/verify?token=${token}` });
  return { ok: true };
}
export const VERIFY_INVALID = "That link has expired or was already used. Please start your trial again.";
export async function activateTrial(rawToken: unknown, mailer: Mailer, now = new Date()): Promise<{ ok: true; firm: LexFirm } | { ok: false; error: string; field?: string }> {
  const token = typeof rawToken === "string" && /^[a-f0-9]{48}$/.test(rawToken) ? rawToken : null;
  if (!token) return { ok: false, error: VERIFY_INVALID };
  const r = redis();
  const p = parse<{ v: SignupInput; code: string | null }>(await r.get(`lex:trial:verify:${token}`));
  if (!p || (await r.set(`lex:trial:verify:used:${token}`, "1", { nx: true, ex: VERIFY_TTL_SECONDS })) !== "OK") return { ok: false, error: VERIFY_INVALID };
  await r.del(`lex:trial:verify:${token}`);
  return startTrial(p.v, p.code ?? "", mailer, now);
}

/**
 * Cron (lex-grace, hourly): trials past their end with no subscription lapse to "trial_ended". Lex access is
 * removed and the 30-day data clock starts at trialEndsAt. Deletion itself stays with sweepDataRetention
 * (LEX_DATA_DELETION_MODE, dry_run by default).
 */
export async function sweepTrials(mailer: Mailer, now = new Date()): Promise<{ ended: number; active: number }> {
  const ids = ((await redis().smembers("lex:trial:firms")) as string[]) ?? [];
  const out = { ended: 0, active: 0 };
  for (const id of ids) {
    const f0 = await getFirm(id);
    if (f0?.status !== "trial") continue;
    if (!f0.trialEndsAt || new Date(f0.trialEndsAt) > now) { out.active++; continue; }
    await withFirmLock(id, async (f) => {
      if (f.status !== "trial" || f.subscriptionId) return;
      await lapseFirm(f, "trial_ended", mailer, new Date(f.trialEndsAt!));
      out.ended++;
    });
  }
  return out;
}

export type TrialRow = {
  firmId: string; firmName: string; adminEmail: string; status: LexFirm["status"]; lapseReason: string | null;
  seatsUsed: number; daysLeft: number | null; stage: TrialStage | null; trialEndsAt: string | null;
  inviteCode: string | null; inviteSource: string | null; converted: boolean; founding: boolean; dataDeleteAfter: string | null; createdAt: string;
};
export async function listTrialFirms(now = new Date()): Promise<LexFirm[]> {
  const ids = ((await redis().smembers("lex:trial:firms")) as string[]) ?? [];
  const firms: LexFirm[] = [];
  for (const id of ids) { const f = await getFirm(id); if (f) firms.push(f); }
  void now;
  return firms.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function trialRow(f: LexFirm, now = new Date()): TrialRow {
  const t = f.status === "trial" ? trialInfo(f, now) : null;
  return {
    firmId: f.firmId, firmName: f.firmName, adminEmail: f.adminEmail, status: f.status, lapseReason: f.lapseReason ?? null,
    seatsUsed: 1 + f.members.length, daysLeft: t?.daysLeft ?? null, stage: t?.stage ?? null, trialEndsAt: f.trialEndsAt ?? null,
    inviteCode: f.inviteCode ?? null, inviteSource: f.inviteSource ?? null, converted: !!f.convertedFromTrialAt, founding: !!f.foundingMember,
    dataDeleteAfter: f.dataDeleteAfter ?? null, createdAt: f.createdAt,
  };
}
