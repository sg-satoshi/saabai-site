/**
 * Roadmap pure core (types, validation, merge, filter, seed). No I/O, safe to import from client components.
 */

export const ROADMAP_KEY = "saabai:roadmap";
export const STATUSES = ["planned", "in_progress", "shipped", "deployed", "idea"] as const;
export type RoadmapStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<RoadmapStatus, string> = { planned: "Planned", in_progress: "In progress", shipped: "Shipped", deployed: "Deployed", idea: "Idea" };
export const PRIORITIES = ["high", "medium", "low"] as const;
export type RoadmapPriority = (typeof PRIORITIES)[number];
export const RM_AREAS = ["Admin", "Access", "Chatbots", "Coupons", "Payments", "Billing", "Site factory", "Marketing", "Clients", "Other"] as const;
export const MAX_ITEMS = 300;

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  area: string;
  target?: string;
  priority?: RoadmapPriority;
  prNumber?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** What the page shows: manual items (status possibly promoted) plus auto items from merged PRs. */
export interface RoadmapView extends RoadmapItem {
  source: "manual" | "github";
  prUrl?: string;
  mergedAt?: string;
}

export interface MergedPr { number: number; title: string; mergedAt: string; url: string }
export interface GithubState { prs: MergedPr[]; deployedAt: string | null; ok: boolean; error?: string }

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export type ItemInput = Partial<Pick<RoadmapItem, "title" | "description" | "status" | "area" | "target" | "priority" | "prNumber">>;

/** Validates untrusted input. partial=true allows omitted fields (PATCH). */
export function validateInput(raw: unknown, partial = false): { ok: true; value: ItemInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Bad request" };
  const r = raw as Record<string, unknown>;
  const v: ItemInput = {};
  if (r.title !== undefined || !partial) {
    const t = clip(r.title, 140);
    if (t.length < 2) return { ok: false, error: "Title is required (2 to 140 characters)." };
    v.title = t;
  }
  if (r.description !== undefined) v.description = clip(r.description, 1200);
  else if (!partial) v.description = "";
  if (r.status !== undefined || !partial) {
    if (!STATUSES.includes(r.status as RoadmapStatus)) return { ok: false, error: "Unknown status." };
    v.status = r.status as RoadmapStatus;
  }
  if (r.area !== undefined) v.area = clip(r.area, 40) || "Other";
  else if (!partial) v.area = "Other";
  if (r.target !== undefined) v.target = clip(r.target, 40) || undefined;
  if (r.priority !== undefined) {
    if (r.priority === "" || r.priority === null) v.priority = undefined;
    else if (PRIORITIES.includes(r.priority as RoadmapPriority)) v.priority = r.priority as RoadmapPriority;
    else return { ok: false, error: "Unknown priority." };
  }
  if (r.prNumber !== undefined) {
    if (r.prNumber === "" || r.prNumber === null) v.prNumber = undefined;
    else {
      const n = Number(r.prNumber);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) return { ok: false, error: "PR number must be a positive whole number." };
      v.prNumber = n;
    }
  }
  return { ok: true, value: v };
}

export function areaForTitle(title: string): string {
  const t = title.toLowerCase();
  if (/coupon|offer/.test(t)) return "Coupons";
  if (/chat|widget|bot/.test(t)) return "Chatbots";
  if (/role|access|2fa|login|security/.test(t)) return "Access";
  if (/stripe|payment|invoice|checkout/.test(t)) return "Payments";
  if (/billing|plan/.test(t)) return "Billing";
  if (/announce|marketing|seo|blog/.test(t)) return "Marketing";
  if (/admin/.test(t)) return "Admin";
  if (/site|factory/.test(t)) return "Site factory";
  return "Other";
}

/** Merged PR => deployed if it merged at or before the latest successful production deployment, else shipped. */
export function prStatus(mergedAt: string, deployedAt: string | null): RoadmapStatus {
  if (!deployedAt) return "shipped";
  const m = Date.parse(mergedAt), d = Date.parse(deployedAt);
  return Number.isFinite(m) && Number.isFinite(d) && m <= d ? "deployed" : "shipped";
}

/** Combine manual items with GitHub state. Manual items with a merged prNumber are promoted; unmatched merged PRs are added. */
export function buildView(items: RoadmapItem[], gh: GithubState | null): RoadmapView[] {
  const byPr = new Map((gh?.prs ?? []).map((p) => [p.number, p]));
  const manualPrs = new Set<number>();
  const out: RoadmapView[] = items.map((it) => {
    const pr = it.prNumber ? byPr.get(it.prNumber) : undefined;
    if (it.prNumber) manualPrs.add(it.prNumber);
    if (pr && gh) return { ...it, source: "manual", status: prStatus(pr.mergedAt, gh.deployedAt), prUrl: pr.url, mergedAt: pr.mergedAt };
    return { ...it, source: "manual" };
  });
  for (const p of gh?.prs ?? []) {
    if (manualPrs.has(p.number)) continue;
    out.push({
      id: `gh-${p.number}`, title: p.title.slice(0, 140), description: "", status: prStatus(p.mergedAt, gh!.deployedAt),
      area: areaForTitle(p.title), prNumber: p.number, createdAt: p.mergedAt, updatedAt: p.mergedAt, updatedBy: "GitHub",
      source: "github", prUrl: p.url, mergedAt: p.mergedAt,
    });
  }
  return out;
}

export function filterView(items: RoadmapView[], f: { q?: string; status?: string; area?: string }): RoadmapView[] {
  const q = (f.q || "").trim().toLowerCase();
  return items.filter((i) => {
    if (f.status && f.status !== "all" && i.status !== f.status) return false;
    if (f.area && f.area !== "all" && i.area !== f.area) return false;
    if (!q) return true;
    const hay = `${i.title} ${i.description} ${i.area} ${i.target ?? ""} ${i.prNumber ? "#" + i.prNumber + " pr" + i.prNumber : ""}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

// ── Seed ─────────────────────────────────────────────────────────────
const S = (id: string, title: string, description: string, status: RoadmapStatus, area: string, extra: Partial<RoadmapItem> = {}): RoadmapItem =>
  ({ id, title, description, status, area, createdAt: "2026-10-19T00:00:00.000Z", updatedAt: "2026-10-19T00:00:00.000Z", updatedBy: "seed", ...extra });

export const SEED_ITEMS: RoadmapItem[] = [
  S("chat-integrations-addon", "Chatbot integrations add-on (stage 4)", "Email alerts included. Telegram, WhatsApp and SMS with a one-off setup fee and no monthly fee. SMS on prepaid credit packs with a 75% low-credit email and a buy-more link. Prices need Shane's approval.", "planned", "Chatbots", { priority: "high" }),
  S("stripe-payments-module", "Stripe payments module for client sites", "Let client sites take payments through Stripe. To be discussed before any build.", "planned", "Payments"),
  S("client-logins", "Client logins (own bot only)", "Clients sign in and see only their own chatbot.", "planned", "Clients"),
  S("knowledge-builder", "Client knowledge base builder", "Includes an unanswered-questions queue so clients can fill the gaps.", "planned", "Chatbots"),
  S("chat-lead-capture", "Lead capture for chatbots", "Capture contact details from chats and route them to the client.", "planned", "Chatbots"),
  S("chat-followups", "Remaining chatbot follow-ups", "CHAT_WIDGET_V2, real plans per site, origin enforce, LMM, Tributum and BO migration.", "planned", "Chatbots"),
  S("coupon-reporting", "Coupons: per-coupon reporting", "Redemptions and revenue per code.", "planned", "Coupons"),
  S("coupon-subscription-duration", "Coupons: subscription duration", "Choose how long a discount lasts on subscriptions.", "planned", "Coupons"),
  S("coupon-auto-apply", "Coupons: campaign auto-apply", "Apply a campaign code automatically from a link.", "planned", "Coupons"),
  S("payments-coupon-picker", "Payments coupon picker", "Dropdown of usable coupons on Payments and Sell. Scheduled codes show greyed out with their start date. Show-inactive toggle noted for later.", "planned", "Payments"),
  S("coupon-multi-product", "Coupons: multi-product Works on", "Pick several products for one coupon.", "in_progress", "Coupons", { prNumber: 144 }),
  S("coupon-copy-link", "Coupons: copy-link button", "One-click checkout link for each coupon.", "in_progress", "Coupons", { prNumber: 145 }),
  S("coupon-start-date", "Coupons: start date", "Schedule a coupon to begin at Brisbane midnight.", "in_progress", "Coupons", { prNumber: 146 }),
  S("coupon-once-per-customer", "Coupons: one use per customer", "Hashed-email check, no addresses stored.", "in_progress", "Coupons", { prNumber: 147 }),
  S("admin-roadmap", "Admin roadmap page", "This page: planned, in progress, shipped and deployed, searchable.", "in_progress", "Admin"),
  S("role-based-access", "Role-based admin access", "Viewer and custom roles with per-area read or write, mandatory 2FA, audit log.", "deployed", "Access", { prNumber: 148 }),
  S("idea-bulk-codes-partners", "Single-use bulk codes and partner attribution", "Unique one-time codes for campaigns, plus tracking results per partner or referrer. Possible future referral program.", "idea", "Coupons"),
];

