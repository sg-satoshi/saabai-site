/**
 * Pure list rules for the admin chatbots table: filter, sort, group and page.
 * The API still returns every row. This module decides what the page shows.
 */
import { matchesSite } from "./search";

export type CapState = "ok" | "near" | "over";
export type ListStatus = "all" | "on" | "off" | "attention" | "locked";
export type ListSort = "last" | "name" | "chats" | "leads" | "plan";
export type SortDir = "asc" | "desc";

export type BotListRow = {
  slug: string;
  name: string;
  domains: string[];
  aliases?: string[];
  engine: "platform" | "bespoke";
  enabled: boolean | null;
  plan: string;
  goal: string;
  chats: number;
  cap: number;
  capState: CapState;
  /** Null for own-route bots. A number, including 0, for platform bots. */
  leads: number | null;
  lastChatAt: string | null;
  locked: boolean;
  clientKey: string;
  clientName: string;
};

export type ListQuery = {
  q: string;
  status: ListStatus;
  plan: string;
  client: string;
  goal: string;
  sort: ListSort;
  dir: SortDir;
  page: number;
  per: number;
};

export const DEFAULT_LIST_QUERY: ListQuery = {
  q: "", status: "all", plan: "", client: "", goal: "", sort: "last", dir: "desc", page: 1, per: 25,
};

const STATUSES = new Set<ListStatus>(["all", "on", "off", "attention", "locked"]);
const SORTS = new Set<ListSort>(["last", "name", "chats", "leads", "plan"]);
const PERS = new Set([25, 50, 100]);
const PLAN_ORDER = ["presence", "growth", "signature"];

export function parseListQuery(sp: URLSearchParams): ListQuery {
  const status = sp.get("status") ?? "";
  const sort = sp.get("sort") ?? "";
  const per = Number(sp.get("per") ?? 25);
  const page = Number(sp.get("page") ?? 1);
  const dir = sp.get("dir") === "asc" ? "asc" : sp.get("dir") === "desc" ? "desc" : "";
  return {
    q: (sp.get("q") ?? "").slice(0, 120),
    status: STATUSES.has(status as ListStatus) ? (status as ListStatus) : "all",
    plan: (sp.get("plan") ?? "").slice(0, 40),
    client: (sp.get("client") ?? "").slice(0, 160),
    goal: (sp.get("goal") ?? "").slice(0, 40),
    sort: SORTS.has(sort as ListSort) ? (sort as ListSort) : "last",
    dir: (dir || (sort === "name" ? "asc" : "desc")) as SortDir,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    per: PERS.has(per) ? per : 25,
  };
}

export function serialiseListQuery(q: ListQuery): string {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.status !== "all") sp.set("status", q.status);
  if (q.plan) sp.set("plan", q.plan);
  if (q.client) sp.set("client", q.client);
  if (q.goal) sp.set("goal", q.goal);
  if (q.sort !== "last") sp.set("sort", q.sort);
  if ((q.sort === "name" && q.dir !== "asc") || (q.sort !== "name" && q.dir !== "desc")) sp.set("dir", q.dir);
  if (q.page > 1) sp.set("page", String(q.page));
  if (q.per !== 25) sp.set("per", String(q.per));
  return sp.toString();
}

export function needsAttention(row: Pick<BotListRow, "engine" | "capState">, kill: boolean): boolean {
  if (row.engine === "bespoke") return false;
  if (kill) return true;
  return row.capState === "near" || row.capState === "over";
}

export function statusCounts(rows: BotListRow[], kill: boolean) {
  return {
    all: rows.length,
    on: rows.filter((r) => r.enabled === true).length,
    off: rows.filter((r) => r.enabled === false).length,
    attention: rows.filter((r) => needsAttention(r, kill)).length,
    locked: rows.filter((r) => r.locked).length,
    own: rows.filter((r) => r.engine === "bespoke").length,
  };
}

/** Clients with more than one site. The Client filter only lists these. */
export function multiSiteClients(rows: BotListRow[]): { key: string; name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    const cur = map.get(r.clientKey);
    if (cur) cur.count += 1;
    else map.set(r.clientKey, { name: r.clientName, count: 1 });
  }
  return [...map.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function clientIdentity(site: { id: string; name: string; business?: { name?: string; email?: string } | null }): { key: string; name: string } {
  const email = (site.business?.email ?? "").trim().toLowerCase();
  const biz = (site.business?.name ?? "").trim();
  const nameKey = (s: string) => s.toLowerCase().replace(/%20/g, " ").replace(/\bv\d+\b/g, "").replace(/[^a-z0-9]/g, "");
  if (email.includes("@")) return { key: `email:${email}`, name: biz || site.name };
  const bizKey = biz ? nameKey(biz) : "";
  if (bizKey && bizKey !== nameKey(site.name)) return { key: `biz:${bizKey}`, name: biz };
  return { key: `site:${site.id}`, name: site.name };
}

export function filterRows(rows: BotListRow[], q: ListQuery, kill: boolean): BotListRow[] {
  const multi = new Set(multiSiteClients(rows).map((c) => c.key));
  return rows.filter((r) => {
    if (!matchesSite(q.q, { name: r.name, slug: r.slug, domains: r.domains, aliases: r.aliases })) return false;
    if (q.status === "on" && r.enabled !== true) return false;
    if (q.status === "off" && r.enabled !== false) return false;
    if (q.status === "attention" && !needsAttention(r, kill)) return false;
    if (q.status === "locked" && !r.locked) return false;
    if (q.plan && r.plan !== q.plan) return false;
    if (q.client && (r.clientKey !== q.client || !multi.has(r.clientKey))) return false;
    if (q.goal && r.goal !== q.goal) return false;
    return true;
  });
}

function planRank(plan: string): number {
  const i = PLAN_ORDER.indexOf(plan);
  return i === -1 ? PLAN_ORDER.length : i;
}

export function sortRows(rows: BotListRow[], sort: ListSort, dir: SortDir): BotListRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const time = (r: BotListRow) => {
    const t = r.lastChatAt ? Date.parse(r.lastChatAt) : NaN;
    return Number.isFinite(t) ? t : 0;
  };
  return [...rows].sort((a, b) => {
    let n = 0;
    if (sort === "name") n = a.name.localeCompare(b.name);
    else if (sort === "chats") n = a.chats - b.chats;
    else if (sort === "leads") n = (a.leads ?? -1) - (b.leads ?? -1);
    else if (sort === "plan") n = planRank(a.plan) - planRank(b.plan) || a.name.localeCompare(b.name);
    else n = time(a) - time(b) || a.name.localeCompare(b.name);
    return n * sign || a.slug.localeCompare(b.slug);
  });
}

export type ArrangedGroup = {
  key: string;
  name: string;
  multi: boolean;
  rows: BotListRow[];
  sites: number;
  chats: number;
  leads: number;
};

/** Multi-site rows stay together. Groups are ordered by their first site. Sort already applied inside the list. */
export function arrangeGroups(sorted: BotListRow[]): ArrangedGroup[] {
  const counts = new Map<string, number>();
  for (const r of sorted) counts.set(r.clientKey, (counts.get(r.clientKey) ?? 0) + 1);
  const seen = new Set<string>();
  const out: ArrangedGroup[] = [];
  for (const r of sorted) {
    const multi = (counts.get(r.clientKey) ?? 0) > 1;
    if (multi) {
      if (seen.has(r.clientKey)) continue;
      seen.add(r.clientKey);
      const rows = sorted.filter((x) => x.clientKey === r.clientKey);
      out.push({
        key: r.clientKey,
        name: r.clientName,
        multi: true,
        rows,
        sites: rows.length,
        chats: rows.reduce((n, x) => n + x.chats, 0),
        leads: rows.reduce((n, x) => n + (x.leads ?? 0), 0),
      });
    } else {
      out.push({ key: r.slug, name: r.name, multi: false, rows: [r], sites: 1, chats: r.chats, leads: r.leads ?? 0 });
    }
  }
  return out;
}

export type PagedBots = {
  groups: ArrangedGroup[];
  total: number;
  page: number;
  pages: number;
  from: number;
  to: number;
};

/** Page by chatbot, not by group. A group header is repeated when its sites fall on this page. */
export function pageBots(groups: ArrangedGroup[], page: number, per: number): PagedBots {
  const flat = groups.flatMap((g) => g.rows);
  const total = flat.length;
  const pages = Math.max(1, Math.ceil(total / per) || 1);
  const safe = Math.min(Math.max(1, page), pages);
  const start = (safe - 1) * per;
  const slice = new Set(flat.slice(start, start + per).map((r) => r.slug));
  const shown: ArrangedGroup[] = [];
  for (const g of groups) {
    const rows = g.rows.filter((r) => slice.has(r.slug));
    if (!rows.length) continue;
    shown.push({ ...g, rows });
  }
  return {
    groups: shown,
    total,
    page: safe,
    pages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + per, total),
  };
}

export function csvFor(rows: BotListRow[]): string {
  const cell = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["Client", "Slug", "Domain", "Status", "Plan", "Goal", "Chats this month", "Cap", "Leads", "Last chat"];
  const lines = [head.join(",")];
  for (const r of rows) {
    const status = r.engine === "bespoke" ? "Own route" : r.enabled ? "On" : "Off";
    lines.push([
      r.name, r.slug, r.domains.join(" "), status, r.plan, r.goal, r.chats, r.cap, r.leads === null ? "n/a" : r.leads, r.lastChatAt ?? "",
    ].map(cell).join(","));
  }
  return lines.join("\n");
}
