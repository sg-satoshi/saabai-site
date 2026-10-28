/**
 * Roadmap pure core (types, validation, merge, filter, seed). No I/O, safe to import from client components.
 */

export const ROADMAP_KEY = "saabai:roadmap";
export const STATUSES = ["planned", "in_progress", "in_review", "blocked", "shipped", "deployed", "idea"] as const;
export type RoadmapStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  shipped: "Shipped",
  deployed: "Deployed",
  idea: "Idea",
};
export const PRIORITIES = ["high", "medium", "low"] as const;
export type RoadmapPriority = (typeof PRIORITIES)[number];
export const RM_AREAS = ["Saabai site", "SEO toolkit", "Instagram", "LocalCommand", "Lex", "Blueprint", "client sites", "admin", "Other"] as const;
/** Open issues with this label are tracking workstreams, not one-off tasks. */
export const WORKSTREAM_LABEL = "type:workstream";
export const MAX_ITEMS = 300;
/** Shown when GitHub cannot be read. Never treat that as an empty roadmap. */
export const GITHUB_UNAVAILABLE = "unavailable";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  area: string;
  target?: string;
  priority?: RoadmapPriority;
  prNumber?: number;
  issueNumber?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** What the page shows: manual items (status possibly derived) plus auto items from GitHub. */
export interface RoadmapView extends RoadmapItem {
  source: "manual" | "github";
  prUrl?: string;
  issueUrl?: string;
  mergedAt?: string;
  /** Open issue carrying the type:workstream label. */
  workstream?: boolean;
}

export interface MergedPr { number: number; title: string; mergedAt: string; url: string }
export interface OpenWork {
  number: number;
  title: string;
  url: string;
  labels: string[];
  updatedAt: string;
  /** Issue numbers named with a closing keyword in the pull request body. */
  closes?: number[];
  /** True when the issue is labelled type:workstream. */
  workstream?: boolean;
}
/** A manual link fetched by number, including closed issues that must not appear as open work. */
export interface LinkedWork {
  kind: "pr" | "issue";
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
  mergedAt: string | null;
  labels: string[];
  updatedAt: string;
}
export interface GithubState {
  prs: MergedPr[];
  openIssues?: OpenWork[];
  openPrs?: OpenWork[];
  linked?: LinkedWork[];
  deployedAt: string | null;
  fetchedAt?: string | null;
  ok: boolean;
  error?: string;
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export type ItemInput = Partial<Pick<RoadmapItem, "title" | "description" | "status" | "area" | "target" | "priority" | "prNumber" | "issueNumber">>;

function readNumber(raw: unknown, label: string): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (raw === "" || raw === null) return { ok: true, value: undefined };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1_000_000) return { ok: false, error: `${label} must be a positive whole number.` };
  return { ok: true, value: n };
}

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
    const n = readNumber(r.prNumber, "PR number");
    if (!n.ok) return n;
    v.prNumber = n.value;
  }
  if (r.issueNumber !== undefined) {
    const n = readNumber(r.issueNumber, "Issue number");
    if (!n.ok) return n;
    v.issueNumber = n.value;
  }
  return { ok: true, value: v };
}

export function areaForTitle(title: string): string {
  const t = title.toLowerCase();
  if (/blueprint/.test(t)) return "Blueprint";
  if (/\blex\b|austlii|citation/.test(t)) return "Lex";
  if (/instagram|\big\b/.test(t)) return "Instagram";
  if (/localcommand|local command/.test(t)) return "LocalCommand";
  if (/\bseo\b|search audit|ai search/.test(t)) return "SEO toolkit";
  if (/coupon|payment|billing|invoice|stripe|admin|roadmap|access|2fa/.test(t)) return "admin";
  if (/chat|widget|bot|client site|site factory|wholesale/.test(t)) return "client sites";
  if (/website|about page|marketing|homepage/.test(t)) return "Saabai site";
  return "Other";
}

/** Merged PR => deployed if it merged at or before the latest successful production deployment, else shipped. */
export function prStatus(mergedAt: string, deployedAt: string | null): RoadmapStatus {
  if (!deployedAt) return "shipped";
  const m = Date.parse(mergedAt), d = Date.parse(deployedAt);
  return Number.isFinite(m) && Number.isFinite(d) && m <= d ? "deployed" : "shipped";
}

/** Status from GitHub labels. Closed issues must not be passed here. */
export function statusFromLabels(labels: string[]): RoadmapStatus | null {
  if (labels.includes("status:blocked")) return "blocked";
  if (labels.includes("status:in-review")) return "in_review";
  if (labels.includes("status:in-progress")) return "in_progress";
  if (labels.some((l) => l.startsWith("agent:"))) return "in_progress";
  return null;
}

/** Issue numbers a pull request body closes. Official GitHub keywords only. */
export function closesFromBody(body: string | null | undefined): number[] {
  if (!body) return [];
  const out = new Set<number>();
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.add(Number(m[1]));
  return [...out];
}

export interface GhSearchItem {
  number: number;
  title?: string;
  state?: string;
  html_url?: string;
  body?: string | null;
  labels?: { name?: string }[];
  updated_at?: string;
  pull_request?: { merged_at?: string | null; html_url?: string } | null;
}

function labelNames(labels?: { name?: string }[]): string[] {
  return (labels ?? []).map((l) => (typeof l?.name === "string" ? l.name : "")).filter(Boolean);
}

/**
 * Split a GitHub issue-search page into merged PRs, open issues and open PRs.
 * Closed issues are dropped even when they still carry status:in-progress or status:in-review.
 */
export function classifySearchItems(items: GhSearchItem[]): { prs: MergedPr[]; openIssues: OpenWork[]; openPrs: OpenWork[] } {
  const prs: MergedPr[] = [];
  const openIssues: OpenWork[] = [];
  const openPrs: OpenWork[] = [];
  for (const item of items) {
    if (!item || !Number.isInteger(item.number)) continue;
    const title = (item.title || `GitHub #${item.number}`).slice(0, 140);
    const url = item.html_url || "";
    const updatedAt = item.updated_at || new Date(0).toISOString();
    const labels = labelNames(item.labels);
    const isPr = !!item.pull_request;
    if (isPr && item.pull_request?.merged_at) {
      prs.push({ number: item.number, title, mergedAt: item.pull_request.merged_at, url });
      continue;
    }
    if (item.state !== "open") continue;
    if (isPr) {
      openPrs.push({ number: item.number, title, url, labels, updatedAt, closes: closesFromBody(item.body) });
    } else {
      openIssues.push({ number: item.number, title, url, labels, updatedAt, workstream: labels.includes(WORKSTREAM_LABEL) });
    }
  }
  return { prs, openIssues, openPrs };
}

interface ResolvedPr { merged?: MergedPr; open?: OpenWork; linked?: LinkedWork }

function findLinked(gh: GithubState, kind: "pr" | "issue", n?: number): LinkedWork | undefined {
  if (!n) return undefined;
  return (gh.linked ?? []).find((l) => l.kind === kind && l.number === n);
}

function resolvePr(it: RoadmapItem, gh: GithubState, openPrs: Map<number, OpenWork>): ResolvedPr {
  if (!it.prNumber) return {};
  return {
    merged: gh.prs.find((p) => p.number === it.prNumber),
    open: openPrs.get(it.prNumber),
    linked: findLinked(gh, "pr", it.prNumber),
  };
}

function mergedAtOf(pr: ResolvedPr): string | null {
  if (pr.merged?.mergedAt) return pr.merged.mergedAt;
  if (pr.linked?.mergedAt) return pr.linked.mergedAt;
  return null;
}

function derivedStatus(it: RoadmapItem, pr: ResolvedPr, issueOpen: OpenWork | undefined, issueLinked: LinkedWork | undefined, closing: OpenWork[], deployedAt: string | null): RoadmapStatus {
  const mergedAt = mergedAtOf(pr);
  if (it.prNumber && mergedAt) return prStatus(mergedAt, deployedAt);

  if (issueLinked?.state === "closed") {
    if (issueLinked.mergedAt) return prStatus(issueLinked.mergedAt, deployedAt);
    if (issueLinked.kind === "issue") return "shipped";
  }

  const prLabels = pr.open?.labels || (pr.linked?.state === "open" ? pr.linked.labels : []);
  const prIsOpen = !!pr.open || pr.linked?.kind === "pr" && pr.linked.state === "open";
  if (it.prNumber && prIsOpen) {
    if (prLabels.includes("status:blocked")) return "blocked";
    if (prLabels.includes("status:in-progress") && !prLabels.includes("status:in-review")) return "in_progress";
    return "in_review";
  }

  const issueLabels = issueOpen?.labels || (issueLinked?.state === "open" ? issueLinked.labels : []);
  if (closing.length) {
    if (issueLabels.includes("status:blocked")) return "blocked";
    return "in_review";
  }
  if (issueOpen || issueLinked?.state === "open") return statusFromLabels(issueLabels) ?? "planned";
  return it.status;
}

/** Combine manual items with GitHub state. Linked merged PRs and closed issues become Done. Closed issues are never listed as open work. */
export function buildView(items: RoadmapItem[], gh: GithubState | null): RoadmapView[] {
  if (!gh?.ok) return items.map((it) => ({ ...it, source: "manual" as const }));

  const openIssues = new Map((gh.openIssues ?? []).map((i) => [i.number, i]));
  const openPrs = new Map((gh.openPrs ?? []).map((p) => [p.number, p]));
  const usedPr = new Set<number>();
  const usedIssue = new Set<number>();

  const out: RoadmapView[] = items.map((it) => {
    const pr = resolvePr(it, gh, openPrs);
    const issueOpen = it.issueNumber ? openIssues.get(it.issueNumber) : undefined;
    let issueLinked = findLinked(gh, "issue", it.issueNumber);
    if (!issueLinked && it.issueNumber) {
      const mergedIssue = gh.prs.find((p) => p.number === it.issueNumber);
      if (mergedIssue) issueLinked = { kind: "issue", number: mergedIssue.number, title: mergedIssue.title, url: mergedIssue.url, state: "closed", mergedAt: mergedIssue.mergedAt, labels: [], updatedAt: mergedIssue.mergedAt };
    }
    const closing = it.issueNumber ? [...openPrs.values()].filter((p) => (p.closes ?? []).includes(it.issueNumber!)) : [];
    if (it.prNumber) usedPr.add(it.prNumber);
    if (it.issueNumber) usedIssue.add(it.issueNumber);
    if (issueLinked?.mergedAt) usedPr.add(issueLinked.number);
    for (const p of closing) usedPr.add(p.number);

    const status = derivedStatus(it, pr, issueOpen, issueLinked, closing, gh.deployedAt);
    const prNumber = it.prNumber || closing[0]?.number;
    if (prNumber) usedPr.add(prNumber);
    const prUrl = pr.merged?.url || pr.open?.url || pr.linked?.url || closing[0]?.url;
    const issueUrl = issueOpen?.url || issueLinked?.url;
    const mergedAt = mergedAtOf(pr) || issueLinked?.mergedAt || undefined;
    const workstream = !!(issueOpen?.workstream || (issueLinked?.state === "open" && issueLinked.labels.includes(WORKSTREAM_LABEL)));
    return { ...it, prNumber, status, source: "manual", prUrl, issueUrl, mergedAt: mergedAt || undefined, ...(workstream ? { workstream: true } : {}) };
  });

  for (const issue of gh.openIssues ?? []) {
    if (usedIssue.has(issue.number)) continue;
    const closing = [...openPrs.values()].filter((p) => (p.closes ?? []).includes(issue.number));
    for (const p of closing) usedPr.add(p.number);
    let status = statusFromLabels(issue.labels) ?? "planned";
    if (closing.length && status !== "blocked") status = "in_review";
    out.push({
      id: `gh-issue-${issue.number}`, title: issue.title.slice(0, 140), description: "", status,
      area: areaForTitle(issue.title), issueNumber: issue.number, prNumber: closing[0]?.number,
      createdAt: issue.updatedAt, updatedAt: issue.updatedAt, updatedBy: "GitHub",
      source: "github", issueUrl: issue.url, prUrl: closing[0]?.url,
      ...(issue.workstream ? { workstream: true } : {}),
    });
  }

  for (const pr of gh.openPrs ?? []) {
    if (usedPr.has(pr.number)) continue;
    const status = pr.labels.includes("status:blocked") ? "blocked" : pr.labels.includes("status:in-progress") && !pr.labels.includes("status:in-review") ? "in_progress" : "in_review";
    out.push({
      id: `gh-pr-${pr.number}`, title: pr.title.slice(0, 140), description: "", status,
      area: areaForTitle(pr.title), prNumber: pr.number, createdAt: pr.updatedAt, updatedAt: pr.updatedAt, updatedBy: "GitHub",
      source: "github", prUrl: pr.url,
    });
  }

  for (const p of gh.prs) {
    if (usedPr.has(p.number)) continue;
    out.push({
      id: `gh-${p.number}`, title: p.title.slice(0, 140), description: "", status: prStatus(p.mergedAt, gh.deployedAt),
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
    const hay = `${i.title} ${i.description} ${i.area} ${i.target ?? ""} ${i.prNumber ? "#" + i.prNumber + " pr" + i.prNumber : ""} ${i.issueNumber ? "#" + i.issueNumber + " issue" + i.issueNumber : ""}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

/**
 * Links to add onto existing Redis rows. Applied only when that number is missing.
 * Does not change status, title or description, and does not add or delete rows.
 * #208 is intentionally absent: that PR is the shared-platform ship, and the
 * "Remaining chatbot follow-ups" row still lists other unfinished work. The merged
 * PR shows as its own Done row once GitHub is read past the old 40-PR window.
 */
export const ROADMAP_LINK_PATCHES: ReadonlyArray<{ id: string; prNumber?: number; issueNumber?: number }> = [
  { id: "payments-coupon-picker", prNumber: 154 },
  { id: "admin-roadmap", prNumber: 149 },
];

export function applyLinkPatches(items: RoadmapItem[], patches: ReadonlyArray<{ id: string; prNumber?: number; issueNumber?: number }> = ROADMAP_LINK_PATCHES): { items: RoadmapItem[]; changes: { id: string; field: "prNumber" | "issueNumber"; value: number }[] } {
  const changes: { id: string; field: "prNumber" | "issueNumber"; value: number }[] = [];
  const next = items.map((it) => {
    const patch = patches.find((p) => p.id === it.id);
    if (!patch) return it;
    let copy = it;
    if (patch.prNumber && copy.prNumber == null) {
      copy = { ...copy, prNumber: patch.prNumber };
      changes.push({ id: it.id, field: "prNumber", value: patch.prNumber });
    }
    if (patch.issueNumber && copy.issueNumber == null) {
      copy = { ...copy, issueNumber: patch.issueNumber };
      changes.push({ id: it.id, field: "issueNumber", value: patch.issueNumber });
    }
    return copy;
  });
  return { items: next, changes };
}

/** Original seed stamp. Untouched Redis rows still carry this and can be refreshed in place. */
export const SEED_STAMP = "2026-10-19T00:00:00.000Z";
export const SEED_REFRESH_STAMP = "2026-10-28T00:00:00.000Z";

/**
 * Rewrite seed rows that nobody has edited. Same ids, same Redis key.
 * A deleted seed stays deleted. A row Shane edited stays as he saved it.
 */
export function refreshStoredSeeds(items: RoadmapItem[]): { items: RoadmapItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((it) => {
    const seed = SEED_ITEMS.find((s) => s.id === it.id);
    if (!seed) return it;
    const untouched = it.updatedBy === "seed" && (it.updatedAt === SEED_STAMP || it.updatedAt === SEED_REFRESH_STAMP);
    if (!untouched) return it;
    const same = it.title === seed.title && it.description === seed.description && it.status === seed.status && it.area === seed.area && it.priority === seed.priority && it.prNumber === seed.prNumber && it.issueNumber === seed.issueNumber;
    if (same) return it;
    changed = true;
    return { ...seed };
  });
  return { items: next, changed };
}

// ── Seed ─────────────────────────────────────────────────────────────
const S = (id: string, title: string, description: string, status: RoadmapStatus, area: string, extra: Partial<RoadmapItem> = {}): RoadmapItem =>
  ({ id, title, description, status, area, createdAt: SEED_REFRESH_STAMP, updatedAt: SEED_REFRESH_STAMP, updatedBy: "seed", ...extra });

export const SEED_ITEMS: RoadmapItem[] = [
  S("chat-integrations-addon", "Chatbot integrations add-on (stage 4)", "Email alerts included. Telegram, WhatsApp and SMS with a one-off setup fee and no monthly fee. SMS on prepaid credit packs with a 75% low-credit email and a buy-more link. Prices need Shane's approval.", "planned", "client sites", { priority: "high" }),
  S("stripe-payments-module", "Stripe payments module for client sites", "Let client sites take payments through Stripe. Needs a decision before any build.", "planned", "client sites"),
  S("client-logins", "Client logins (own bot only)", "Clients sign in and see only their own chatbot.", "planned", "client sites"),
  S("knowledge-builder", "Client knowledge base builder", "Includes an unanswered-questions queue so clients can fill the gaps.", "planned", "client sites"),
  S("chat-lead-capture", "Lead capture for chatbots", "Capture contact details from chats and route them to the client.", "planned", "client sites"),
  S("chat-followups", "Remaining chatbot follow-ups", "Widget v2, real plans per site, origin checks, and moving the remaining client chats onto the shared platform.", "planned", "client sites"),
  S("coupon-reporting", "Coupons: per-coupon reporting", "Redemptions and revenue per code.", "planned", "admin"),
  S("coupon-subscription-duration", "Coupons: subscription duration", "Choose how long a discount lasts on subscriptions.", "planned", "admin"),
  S("coupon-auto-apply", "Coupons: campaign auto-apply", "Apply a campaign code automatically from a link.", "planned", "admin"),
  S("payments-coupon-picker", "Payments coupon picker", "Dropdown of usable coupons on Payments and Sell. Scheduled codes show greyed out with their start date. Show-inactive toggle noted for later.", "planned", "admin", { prNumber: 154 }),
  S("coupon-multi-product", "Coupons: multi-product Works on", "Pick several products for one coupon.", "in_progress", "admin", { prNumber: 144 }),
  S("coupon-copy-link", "Coupons: copy-link button", "One-click checkout link for each coupon.", "in_progress", "admin", { prNumber: 145 }),
  S("coupon-start-date", "Coupons: start date", "Schedule a coupon to begin at Brisbane midnight.", "in_progress", "admin", { prNumber: 146 }),
  S("coupon-once-per-customer", "Coupons: one use per customer", "Hashed-email check, no addresses stored.", "in_progress", "admin", { prNumber: 147 }),
  S("admin-roadmap", "Admin roadmap page", "This page lists open issues, open pull requests, workstreams, and every merged pull request.", "in_progress", "admin", { prNumber: 149 }),
  S("role-based-access", "Role-based admin access", "Viewer and custom roles with per-area read or write, mandatory 2FA, audit log.", "deployed", "admin", { prNumber: 148 }),
  S("idea-bulk-codes-partners", "Single-use bulk codes and partner attribution", "Unique one-time codes for campaigns, plus tracking results per partner or referrer. Possible future referral program.", "idea", "admin"),
  S("saabai-site-pages", "Saabai marketing site", "Public pages, pricing, and the about page. Reply time is within 1 business day. Blueprint stays $497.", "planned", "Saabai site"),
  S("seo-toolkit", "SEO toolkit", "Search checks, titles, and the pages that help Google and AI search find a site.", "planned", "SEO toolkit"),
  S("instagram-landing", "Instagram", "The bio landing page and later Instagram posting work.", "planned", "Instagram"),
  S("localcommand", "LocalCommand", "Tracking area for LocalCommand. Issues labelled type:workstream show under Workstreams.", "planned", "LocalCommand"),
  S("lex-track", "Lex", "Legal research product. Firm is $299 a month. Billing is confirmed before a firm starts.", "planned", "Lex"),
  S("blueprint-track", "Blueprint", "Paid AI audit. Starter is $497, never free. The free piece is the AI Readiness Score.", "planned", "Blueprint"),
];
