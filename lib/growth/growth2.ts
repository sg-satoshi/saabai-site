/**
 * Phase 2 growth: funnel, attribution, upsell queue, testimonials, health, referrals.
 * Nothing in here sends to a client on its own. Sends happen only from an admin approve action.
 */
import { listEventsSince, listContactEvents, recordEvent, contactKey, type ContactEvent, type ContactRecord } from "./events";
import { getDoc, listDocs, newId, patchDoc, putDoc, type Doc } from "./store";
import { touchLabel, type Touch } from "./attribution";
import { listSiteBilling } from "../billing/store";

const DAY = 864e5;
export const DEFAULTS = {
  upsellDelayDays: 5, creditWindowDays: 30, reminderDays: [21, 28],
  testimonialDelayDays: 7, referralQualifyDays: 14, referrerRewardCents: 10000, refereeDiscountPct: 10,
  amberDays: 30, redDays: 60,
};

// ---------- funnel ----------
export const FUNNEL: { type: ContactEvent["type"]; label: string }[] = [
  { type: "score_taken", label: "Took the score" },
  { type: "blueprint_purchased", label: "Bought a Blueprint" },
  { type: "report_delivered", label: "Report delivered" },
  { type: "upsell_sent", label: "Upsell sent" },
  { type: "care_plan_started", label: "Care plan started" },
];

export type FunnelRow = { label: string; count: number; pctOfFirst: number; pctOfPrev: number; medianDaysFromPrev: number | null };

export function computeFunnel(events: ContactEvent[], filter?: { tier?: string; source?: string }): FunnelRow[] {
  const first = new Map<string, Map<string, number>>(); // contact -> type -> first ts
  const src = new Map<string, string>();
  const tier = new Map<string, string>();
  for (const e of events) {
    const m = first.get(e.contactId) ?? new Map();
    const t = Date.parse(e.occurredAt);
    if (!m.has(e.type) || m.get(e.type)! > t) m.set(e.type, t);
    first.set(e.contactId, m);
    if (e.meta?.source && !src.has(e.contactId)) src.set(e.contactId, touchLabel(e.meta.source as Touch));
    if (typeof e.meta?.tier === "string") tier.set(e.contactId, e.meta.tier.toLowerCase());
  }
  const contacts = [...first.keys()].filter((c) => (!filter?.tier || tier.get(c) === filter.tier) && (!filter?.source || src.get(c) === filter.source));
  const rows: FunnelRow[] = [];
  FUNNEL.forEach((stage, i) => {
    const reached = contacts.filter((c) => first.get(c)!.has(stage.type));
    const prev = i ? FUNNEL[i - 1].type : null;
    const gaps = prev ? reached.map((c) => first.get(c)!.get(prev) != null ? (first.get(c)!.get(stage.type)! - first.get(c)!.get(prev)!) / DAY : null).filter((x): x is number => x != null && x >= 0).sort((a, b) => a - b) : [];
    const count = reached.length;
    rows.push({
      label: stage.label, count,
      pctOfFirst: rows[0]?.count ? Math.round((count / rows[0].count) * 100) : i === 0 ? 100 : 0,
      pctOfPrev: i && rows[i - 1].count ? Math.round((count / rows[i - 1].count) * 100) : 100,
      medianDaysFromPrev: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] * 10) / 10 : null,
    });
  });
  return rows;
}

// ---------- attribution ----------
export type AttributionRow = { source: string; leads: number; sales: number; revenueCents: number };
export function computeAttribution(events: ContactEvent[], model: "last" | "first" = "last"): AttributionRow[] {
  const map = new Map<string, AttributionRow>();
  for (const e of events) {
    if (!["score_taken", "blueprint_purchased", "purchase", "care_plan_started"].includes(e.type)) continue;
    const t = (model === "first" ? e.meta?.firstTouch ?? e.meta?.source : e.meta?.source) as Touch | undefined;
    const k = touchLabel(t);
    const r = map.get(k) ?? { source: k, leads: 0, sales: 0, revenueCents: 0 };
    if (e.type === "score_taken") r.leads++;
    else { r.sales++; r.revenueCents += e.amountCents ?? 0; }
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => b.revenueCents - a.revenueCents || b.leads - a.leads);
}

// ---------- upsells ----------
export type Upsell = Doc & {
  email: string; name?: string; auditId: string; tier: string; plan: "Presence" | "Growth" | "Signature" | "Build";
  creditCents: number; creditExpiresAt: string; dueAt: string; deliveredAt: string;
  status: "scheduled" | "awaiting_approval" | "sent" | "converted" | "cancelled";
  needsApproval: boolean; subject: string; body: string; sentAt?: string;
};
const TIER_PRICE: Record<string, number> = { starter: 49700, pro: 149700, business: 350000 };
const TIER_PLAN: Record<string, Upsell["plan"]> = { starter: "Growth", pro: "Growth", business: "Signature" };

export function upsellCopy(name: string | undefined, plan: Upsell["plan"], creditCents: number, expires: string) {
  const hi = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  const amt = `$${(creditCents / 100).toLocaleString("en-AU")}`;
  const by = new Date(expires).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long" });
  return {
    subject: `Your Blueprint, put to work (${amt} credit inside)`,
    body: `${hi}\n\nHope the Blueprint has been useful. The quickest win in it is something our ${plan === "Build" ? "build team" : `${plan} care plan`} handles for you, so you don't have to find the hours.\n\nBecause you've already invested in the Blueprint, ${amt} comes off if you start before ${by}.\n\nReply to this email or book a time at https://saabai.ai/blueprint and I'll set it up.\n\nShane\nSaabai`,
  };
}

/** Called when a Blueprint report is delivered. Schedules; never sends. */
export async function scheduleUpsell(a: { email: string; name?: string; auditId: string; tier: string; deliveredAt?: string }): Promise<Upsell | null> {
  const existing = (await listDocs<Upsell>("upsells", 500)).find((u) => u.auditId === a.auditId);
  if (existing) return existing;
  const delivered = a.deliveredAt ? Date.parse(a.deliveredAt) : Date.now();
  const tier = a.tier.toLowerCase();
  const plan = TIER_PLAN[tier] ?? "Growth";
  const creditCents = TIER_PRICE[tier] ?? 49700;
  const creditExpiresAt = new Date(delivered + DEFAULTS.creditWindowDays * DAY).toISOString();
  const copy = upsellCopy(a.name, plan, creditCents, creditExpiresAt);
  return putDoc<Upsell>("upsells", {
    id: newId("up"), email: contactKey(a.email), name: a.name, auditId: a.auditId, tier, plan, creditCents, creditExpiresAt,
    dueAt: new Date(delivered + DEFAULTS.upsellDelayDays * DAY).toISOString(), deliveredAt: new Date(delivered).toISOString(),
    status: "scheduled", needsApproval: true, ...copy,
  });
}

// ---------- testimonials ----------
export type Testimonial = Doc & {
  email: string; name?: string; auditId?: string; token: string; dueAt: string;
  status: "scheduled" | "awaiting_approval" | "requested" | "received" | "approved" | "published" | "hidden";
  rating?: number; quote?: string; consent?: "internal" | "anonymous" | "name" | "name_logo"; consentAt?: string; consentWording?: string;
};
export { CONSENT_LABELS } from "./growth2-consent";
export const CONSENT_WORDING_VERSION = "2026-10-14";

export async function scheduleTestimonial(a: { email: string; name?: string; auditId: string; deliveredAt?: string }) {
  const existing = (await listDocs<Testimonial>("testimonials", 500)).find((t) => t.auditId === a.auditId);
  if (existing) return existing;
  const delivered = a.deliveredAt ? Date.parse(a.deliveredAt) : Date.now();
  return putDoc<Testimonial>("testimonials", {
    id: newId("tm"), email: contactKey(a.email), name: a.name, auditId: a.auditId, token: newId("t").slice(2),
    dueAt: new Date(delivered + DEFAULTS.testimonialDelayDays * DAY).toISOString(), status: "scheduled",
  });
}

export async function findTestimonialByToken(token: string): Promise<Testimonial | null> {
  if (!/^[a-f0-9]{8,40}$/.test(token)) return null;
  return (await listDocs<Testimonial>("testimonials", 1000)).find((t) => t.token === token) ?? null;
}

// ---------- health ----------
export type Health = { siteId: string; name: string; email: string; plan: string; monthlyCents: number; level: "green" | "amber" | "red"; reasons: string[]; lastActivity?: string; checkIn: string };

export async function computeHealth(now = Date.now()): Promise<Health[]> {
  const billing = await listSiteBilling().catch(() => []);
  const out: Health[] = [];
  for (const b of billing) {
    if (["cancelled", "pending", "link_expired"].includes(b.status)) continue;
    const email = b.contact?.email ? contactKey(b.contact.email) : "";
    const evs = email ? await listContactEvents(email, 100).catch(() => []) : [];
    const reasons: string[] = [];
    let level: Health["level"] = "green";
    if (["payment_failed", "past_due", "paused"].includes(b.status)) { level = "red"; reasons.push(b.status === "paused" ? "Paused for non-payment" : "Payment failed"); }
    if ((b as unknown as { cancelAtPeriodEnd?: boolean }).cancelAtPeriodEnd) { level = "red"; reasons.push("Cancelling at period end"); }
    const engagement = evs.find((e) => ["portal_login", "email_opened", "email_clicked", "payment", "note"].includes(e.type) && e.type !== "payment");
    const last = engagement ? Date.parse(engagement.occurredAt) : Date.parse(b.createdAt ?? new Date(now).toISOString());
    const quiet = Math.floor((now - last) / DAY);
    if (quiet >= DEFAULTS.redDays) { level = "red"; reasons.push(`Quiet for ${quiet} days`); }
    else if (quiet >= DEFAULTS.amberDays) { if (level === "green") level = "amber"; reasons.push(`Quiet for ${quiet} days`); }
    const first = b.contact?.name?.split(" ")[0];
    out.push({
      siteId: b.siteId, name: b.contact?.name || b.siteName, email, plan: b.planName, monthlyCents: b.monthlyCents, level, reasons,
      lastActivity: engagement?.occurredAt,
      checkIn: `Hi ${first || "there"},\n\nJust checking in on ${b.siteName}. Anything on the site you'd like changed, or anything that's been bugging you? Happy to jump on a quick call.\n\nShane`,
    });
  }
  const rank = { red: 0, amber: 1, green: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level] || b.monthlyCents - a.monthlyCents);
}

// ---------- referrals ----------
export type ReferralCode = Doc & { email: string; name?: string };
export type Referral = Doc & { code: string; referrerEmail: string; referredEmail: string; status: "pending" | "qualified" | "paid" | "void"; rewardCents: number; purchaseId?: string; amountCents?: number; qualifiesAt: string; voidReason?: string };

export async function createReferralCode(email: string, name?: string): Promise<ReferralCode> {
  const key = contactKey(email);
  const existing = (await listDocs<ReferralCode>("referral_codes", 1000)).find((c) => c.email === key);
  if (existing) return existing;
  const base = (name || key.split("@")[0]).replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "SAABAI";
  let code = `${base}${Math.floor(100 + Math.random() * 900)}`;
  while (await getDoc("referral_codes", code)) code = `${base}${Math.floor(100 + Math.random() * 900)}`;
  return putDoc<ReferralCode>("referral_codes", { id: code, email: key, name });
}
export const referralUrl = (code: string) => `https://saabai.ai/r/${code}`;

/** On a paid purchase carrying a referral code in attribution. Self and same-domain referrals are void. */
export async function recordReferralPurchase(p: { code?: string; buyerEmail: string; purchaseId: string; amountCents?: number }): Promise<Referral | null> {
  if (!p.code) return null;
  const rc = await getDoc<ReferralCode>("referral_codes", p.code.toUpperCase());
  if (!rc) return null;
  const buyer = contactKey(p.buyerEmail);
  const dom = (e: string) => e.split("@")[1] ?? "";
  const free = ["gmail.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com", "bigpond.com"];
  const self = buyer === rc.email || (dom(buyer) === dom(rc.email) && !free.includes(dom(buyer)));
  const existing = (await listDocs<Referral>("referrals", 1000)).find((r) => r.purchaseId === p.purchaseId);
  if (existing) return existing;
  const r = await putDoc<Referral>("referrals", {
    id: newId("rf"), code: rc.id, referrerEmail: rc.email, referredEmail: buyer, purchaseId: p.purchaseId, amountCents: p.amountCents,
    status: self ? "void" : "pending", voidReason: self ? "Self or same-domain referral" : undefined,
    rewardCents: DEFAULTS.referrerRewardCents, qualifiesAt: new Date(Date.now() + DEFAULTS.referralQualifyDays * DAY).toISOString(),
  });
  if (!self) await recordEvent({ contactId: rc.email, type: "referral_made", refId: r.id, meta: { referred: buyer } });
  return r;
}

// ---------- daily housekeeping (no sends) ----------
export async function runGrowthDaily(now = Date.now()) {
  const out = { upsellsReady: 0, testimonialsReady: 0, referralsQualified: 0 };
  for (const u of await listDocs<Upsell>("upsells", 1000)) {
    if (u.status === "scheduled" && Date.parse(u.dueAt) <= now) { await patchDoc<Upsell>("upsells", u.id, { status: "awaiting_approval" }); out.upsellsReady++; }
    if (["scheduled", "awaiting_approval", "sent"].includes(u.status) && Date.parse(u.creditExpiresAt) < now) await patchDoc<Upsell>("upsells", u.id, { status: "cancelled" });
  }
  for (const t of await listDocs<Testimonial>("testimonials", 1000)) {
    if (t.status === "scheduled" && Date.parse(t.dueAt) <= now) { await patchDoc<Testimonial>("testimonials", t.id, { status: "awaiting_approval" }); out.testimonialsReady++; }
  }
  for (const r of await listDocs<Referral>("referrals", 1000)) {
    if (r.status === "pending" && Date.parse(r.qualifiesAt) <= now) {
      await patchDoc<Referral>("referrals", r.id, { status: "qualified" });
      await recordEvent({ contactId: r.referrerEmail, type: "referral_qualified", refId: r.id, amountCents: r.rewardCents });
      out.referralsQualified++;
    }
  }
  return out;
}

/** Mark open upsells converted when the contact starts a care plan or buys again. */
export async function markUpsellConverted(email: string) {
  const key = contactKey(email);
  for (const u of await listDocs<Upsell>("upsells", 1000)) {
    if (u.email === key && ["sent", "awaiting_approval", "scheduled"].includes(u.status)) {
      await patchDoc<Upsell>("upsells", u.id, { status: "converted" });
      await recordEvent({ contactId: key, type: "upsell_converted", refId: u.id });
    }
  }
}

export async function recentEvents(days = 90) { return listEventsSince(Date.now() - days * DAY); }
export type { ContactRecord };
