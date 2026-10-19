/**
 * Admin roadmap storage (one Redis JSON key) and merged-PR lookup from GitHub (fail soft).
 * Pure helpers live in ./roadmap-core.
 */
import { randomUUID } from "crypto";
import { getRedis } from "./redis";
import { ROADMAP_KEY, MAX_ITEMS, SEED_ITEMS, type GithubState, type ItemInput, type RoadmapItem } from "./roadmap-core";

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
  if (cur) return cur;
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
    target: input.target, priority: input.priority, prNumber: input.prNumber, createdAt: now, updatedAt: now, updatedBy: actor,
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
  for (const k of ["target", "priority", "prNumber"] as const) if (next[k] === undefined) delete next[k];
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
let cache: { at: number; state: GithubState } | null = null;
const TTL = 5 * 60_000;

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "saabai-admin-roadmap" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchGithubState(force = false): Promise<GithubState> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.state;
  try {
    const pulls = await gh<Array<{ number: number; title: string; merged_at: string | null; html_url: string; base: { ref: string } }>>(
      "/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=40");
    const prs = pulls.filter((p) => p.merged_at).map((p) => ({ number: p.number, title: p.title, mergedAt: p.merged_at!, url: p.html_url }));
    let deployedAt: string | null = null;
    try {
      const deps = await gh<Array<{ id: number; created_at: string }>>("/deployments?environment=Production&per_page=8");
      for (const d of deps) {
        const sts = await gh<Array<{ state: string }>>(`/deployments/${d.id}/statuses?per_page=1`);
        if (sts[0]?.state === "success") { deployedAt = d.created_at; break; }
      }
    } catch { /* deployed state unknown: merged PRs stay "Shipped" */ }
    const state = { prs, deployedAt, ok: true };
    cache = { at: Date.now(), state };
    return state;
  } catch (e) {
    return { prs: [], deployedAt: null, ok: false, error: e instanceof Error ? e.message : "GitHub unavailable" };
  }
}

export function resetGithubCache() { cache = null; }
