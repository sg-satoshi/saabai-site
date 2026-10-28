/**
 * Admin roadmap storage (one Redis JSON key) and merged-PR lookup from GitHub (fail soft).
 * Pure helpers live in ./roadmap-core.
 */
import { randomUUID } from "crypto";
import { getRedis } from "./redis";
import { GITHUB_UNAVAILABLE, ROADMAP_KEY, MAX_ITEMS, SEED_ITEMS, classifySearchItems, refreshStoredSeeds, type GhSearchItem, type GithubState, type ItemInput, type LinkedWork, type MergedPr, type OpenWork, type RoadmapItem } from "./roadmap-core";

export * from "./roadmap-core";

// ── Redis store ──────────────────────────────────────────────────────
function parse(raw: unknown): RoadmapItem[] | null {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? (v as RoadmapItem[]) : null;
  } catch { return null; }
}

/** Reads items; seeds once (SET NX, safe under concurrent first loads). Returns null if storage is not configured. */
export async function loadItems(): Promise<RoadmapItem[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  const cur = parse(await redis.get(ROADMAP_KEY));
  if (cur) {
    const refreshed = refreshStoredSeeds(cur);
    if (refreshed.changed) await redis.set(ROADMAP_KEY, JSON.stringify(refreshed.items));
    return refreshed.items;
  }
  await redis.set(ROADMAP_KEY, JSON.stringify(SEED_ITEMS), { nx: true });
  return parse(await redis.get(ROADMAP_KEY)) ?? SEED_ITEMS;
}

async function saveItems(items: RoadmapItem[]) {
  const redis = getRedis();
  if (!redis) throw new Error("Storage is not configured");
  await redis.set(ROADMAP_KEY, JSON.stringify(items));
}

export async function createItem(input: ItemInput, actor: string): Promise<RoadmapItem> {
  const items = (await loadItems()) ?? [];
  if (items.length >= MAX_ITEMS) throw new Error("Roadmap is full");
  const now = new Date().toISOString();
  const it: RoadmapItem = {
    id: randomUUID(), title: input.title!, description: input.description ?? "", status: input.status!, area: input.area || "Other",
    target: input.target, priority: input.priority, prNumber: input.prNumber, issueNumber: input.issueNumber, createdAt: now, updatedAt: now, updatedBy: actor,
  };
  // New items go to the top of their status group (front of the list).
  await saveItems([it, ...items]);
  return it;
}

export async function updateItem(id: string, input: ItemInput, actor: string): Promise<RoadmapItem | null> {
  const items = (await loadItems()) ?? [];
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const next: RoadmapItem = { ...items[i], ...input, updatedAt: new Date().toISOString(), updatedBy: actor };
  for (const k of ["target", "priority", "prNumber", "issueNumber"] as const) if (next[k] === undefined) delete next[k];
  items[i] = next;
  await saveItems(items);
  return next;
}

/** Moves an item one step up or down among items of the same status. */
export async function moveItem(id: string, dir: "up" | "down"): Promise<boolean> {
  const items = (await loadItems()) ?? [];
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const step = dir === "up" ? -1 : 1;
  let j = i + step;
  while (j >= 0 && j < items.length && items[j].status !== items[i].status) j += step;
  if (j < 0 || j >= items.length) return true; // already at the edge: no-op
  [items[i], items[j]] = [items[j], items[i]];
  await saveItems(items);
  return true;
}

export async function deleteItem(id: string): Promise<RoadmapItem | null> {
  const items = (await loadItems()) ?? [];
  const cur = items.find((x) => x.id === id);
  if (!cur) return null;
  await saveItems(items.filter((x) => x.id !== id));
  return cur;
}

// ── GitHub (fail soft) ───────────────────────────────────────────────
const REPO = process.env.ROADMAP_GITHUB_REPO || "sg-satoshi/saabai-site";
/** GitHub search returns at most 1000 hits. Page until a short page, not a 40-item cap. */
const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 10;
const TTL = 5 * 60_000;

export interface GithubLinks { prs?: number[]; issues?: number[] }

interface BulkCache {
  at: number;
  prs: MergedPr[];
  openIssues: OpenWork[];
  openPrs: OpenWork[];
  deployedAt: string | null;
  fetchedAt: string;
}
interface GhPull {
  number: number;
  title?: string;
  state?: string;
  merged_at?: string | null;
  html_url?: string;
  body?: string | null;
  labels?: { name?: string }[];
  updated_at?: string;
  pull_request?: { merged_at?: string | null; html_url?: string } | null;
}

let bulkCache: BulkCache | null = null;
let linkCache = new Map<string, { at: number; work: LinkedWork | null }>();

function unavailable(): GithubState {
  return { prs: [], openIssues: [], openPrs: [], linked: [], deployedAt: null, fetchedAt: null, ok: false, error: GITHUB_UNAVAILABLE };
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "saabai-admin-roadmap",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function ghGet(url: string): Promise<{ ok: true; json: unknown } | { ok: false; status: number }> {
  const res = await fetch(url, { headers: ghHeaders(), signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, json: await res.json() };
}

async function searchAll(q: string): Promise<GhSearchItem[]> {
  const all: GhSearchItem[] = [];
  let total = Infinity;
  for (let page = 1; page <= MAX_SEARCH_PAGES && all.length < total; page++) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=${SEARCH_PAGE_SIZE}&page=${page}&sort=updated&order=desc`;
    const res = await ghGet(url);
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = res.json as { total_count?: number; items?: GhSearchItem[] };
    total = typeof data.total_count === "number" ? data.total_count : 0;
    const items = Array.isArray(data.items) ? data.items : [];
    all.push(...items);
    if (items.length < SEARCH_PAGE_SIZE) break;
  }
  return all;
}

async function loadDeployedAt(): Promise<string | null> {
  const deps = await ghGet(`https://api.github.com/repos/${REPO}/deployments?environment=Production&per_page=8`);
  if (!deps.ok || !Array.isArray(deps.json)) return null;
  for (const d of deps.json as { id?: number; created_at?: string }[]) {
    if (!d?.id) continue;
    const sts = await ghGet(`https://api.github.com/repos/${REPO}/deployments/${d.id}/statuses?per_page=1`);
    if (sts.ok && Array.isArray(sts.json) && (sts.json as { state?: string }[])[0]?.state === "success") return d.created_at || null;
  }
  return null;
}

function names(labels?: { name?: string }[]): string[] {
  return (labels ?? []).map((l) => (typeof l?.name === "string" ? l.name : "")).filter(Boolean);
}

function asLinked(kind: "pr" | "issue", p: GhPull, mergedAt: string | null): LinkedWork | null {
  if (!Number.isInteger(p.number)) return null;
  return {
    kind, number: p.number, title: (p.title || `GitHub #${p.number}`).slice(0, 140), url: p.html_url || "",
    state: p.state === "open" ? "open" : "closed", mergedAt, labels: names(p.labels), updatedAt: p.updated_at || new Date(0).toISOString(),
  };
}

async function fetchPull(n: number): Promise<LinkedWork | null> {
  const res = await ghGet(`https://api.github.com/repos/${REPO}/pulls/${n}`);
  if (!res.ok) return null;
  const p = res.json as GhPull;
  return asLinked("pr", p, p.merged_at || null);
}

async function fetchIssue(n: number): Promise<LinkedWork | null> {
  const res = await ghGet(`https://api.github.com/repos/${REPO}/issues/${n}`);
  if (!res.ok) return null;
  const issue = res.json as GhPull;
  if (issue.pull_request) {
    const pr = await fetchPull(n);
    if (pr) return { ...pr, kind: "issue" };
  }
  return asLinked("issue", issue, null);
}

function remember(list: "prs" | "openIssues" | "openPrs", bulk: BulkCache, work: LinkedWork) {
  if (work.mergedAt && !bulk.prs.some((p) => p.number === work.number)) {
    bulk.prs.push({ number: work.number, title: work.title, mergedAt: work.mergedAt, url: work.url });
  }
  if (work.state !== "open") return;
  if (list === "openPrs" || (work.kind === "pr" && work.state === "open")) {
    if (!bulk.openPrs.some((p) => p.number === work.number)) {
      bulk.openPrs.push({ number: work.number, title: work.title, url: work.url, labels: work.labels, updatedAt: work.updatedAt });
    }
  } else if (!bulk.openIssues.some((i) => i.number === work.number)) {
    bulk.openIssues.push({ number: work.number, title: work.title, url: work.url, labels: work.labels, updatedAt: work.updatedAt });
  }
}

async function cachedLink(key: string, force: boolean, load: () => Promise<LinkedWork | null>): Promise<LinkedWork | null> {
  const hit = linkCache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.work;
  const work = await load();
  linkCache.set(key, { at: Date.now(), work });
  return work;
}

export async function fetchGithubState(force = false, links?: GithubLinks): Promise<GithubState> {
  try {
    let bulk = !force && bulkCache && Date.now() - bulkCache.at < TTL ? bulkCache : null;
    if (!bulk) {
      const [mergedItems, openItems, deployedAt] = await Promise.all([
        searchAll(`repo:${REPO} is:pr is:merged`),
        searchAll(`repo:${REPO} is:open`),
        loadDeployedAt().catch(() => null),
      ]);
      const merged = classifySearchItems(mergedItems);
      const open = classifySearchItems(openItems);
      bulk = {
        at: Date.now(),
        prs: merged.prs,
        openIssues: open.openIssues,
        openPrs: open.openPrs,
        deployedAt,
        fetchedAt: new Date().toISOString(),
      };
      bulkCache = bulk;
    }

    const prs = [...bulk.prs];
    const openIssues = [...bulk.openIssues];
    const openPrs = [...bulk.openPrs];
    const folded: BulkCache = { ...bulk, prs, openIssues, openPrs };
    const linked: LinkedWork[] = [];
    const wantPr = [...new Set((links?.prs ?? []).filter((n) => Number.isInteger(n) && n > 0))];
    const wantIssue = [...new Set((links?.issues ?? []).filter((n) => Number.isInteger(n) && n > 0))];

    await Promise.all([
      ...wantPr.filter((n) => !prs.some((p) => p.number === n) && !openPrs.some((p) => p.number === n)).map(async (n) => {
        const work = await cachedLink(`pr:${n}`, force, () => fetchPull(n));
        if (!work) return;
        linked.push(work);
        remember("openPrs", folded, work);
      }),
      ...wantIssue.filter((n) => !openIssues.some((i) => i.number === n) && !prs.some((p) => p.number === n)).map(async (n) => {
        const work = await cachedLink(`issue:${n}`, force, () => fetchIssue(n));
        if (!work) return;
        linked.push(work);
        if (work.state === "open" && work.kind === "issue") remember("openIssues", folded, work);
        else remember("prs", folded, work);
      }),
    ]);

    return { prs: folded.prs, openIssues: folded.openIssues, openPrs: folded.openPrs, linked, deployedAt: bulk.deployedAt, fetchedAt: bulk.fetchedAt, ok: true };
  } catch {
    return unavailable();
  }
}

export function resetGithubCache() { bulkCache = null; linkCache = new Map(); }
