import { createHash } from "node:crypto";
import { redis } from "@/lib/exp/config";
import type { ScanReport } from "./types";

const P = "saabai:sitescan";
export const SCAN_IP_LIMIT = 3; // per IP per 10 minutes
export const DAILY_CAP = 200;
const RESULT_TTL = 60 * 60 * 24 * 30;
const CACHE_TTL = 60 * 60 * 24;

/** Public visitors only see the scanner when this flag is on. Default off. SITE_SCAN_KILL=1 forces off. Admins can always use it. */
export async function scannerPublic(): Promise<boolean> {
  try {
    if (process.env.SITE_SCAN_KILL === "1") return false;
    const r = redis(); if (!r) return false;
    const v = await r.get<unknown>(`${P}:flag`);
    return v === true || v === "1" || v === 1 || v === "true";
  } catch { return false; }
}
export async function setScannerPublic(on: boolean): Promise<boolean> {
  const r = redis(); if (!r) return false;
  await r.set(`${P}:flag`, on ? "1" : "0"); return true;
}

const ipHash = (req: Request) => createHash("sha256").update(((req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown") + (process.env.SAABAI_SESSION_SECRET ?? "")).digest("hex").slice(0, 16);

/** Returns a reason string if the visitor must wait, else null. Fails open on Redis errors except the daily cap check. */
export async function limitReason(req: Request): Promise<string | null> {
  try {
    const r = redis(); if (!r) return null;
    const k = `${P}:rl:${ipHash(req)}:${Math.floor(Date.now() / 600000)}`;
    const n = await r.incr(k); if (n === 1) await r.expire(k, 660);
    if (n > SCAN_IP_LIMIT) return "You have run a few scans already. Please try again in about 10 minutes.";
    const d = `${P}:day:${new Date().toISOString().slice(0, 10)}`;
    const c = await r.incr(d); if (c === 1) await r.expire(d, 90000);
    if (c > DAILY_CAP) return "We have hit today's scan limit. Please try again tomorrow.";
  } catch { /* fail open */ }
  return null;
}

export async function saveReport(rep: ScanReport, opts: { history?: boolean; cache?: boolean } = {}): Promise<void> {
  try {
    const r = redis(); if (!r) return;
    await r.set(`${P}:r:${rep.id}`, JSON.stringify(rep), { ex: RESULT_TTL });
    if (opts.cache) await r.set(`${P}:cache:${rep.domain}`, rep.id, { ex: CACHE_TTL });
    if (opts.history && rep.domain) {
      const s = { id: rep.id, at: rep.scannedAt, overall: rep.overall, areas: rep.areas, critical: rep.fixes.filter((f) => f.rating === "critical").length, quick: rep.quickWins.length, mode: rep.mode };
      await r.lpush(`${P}:hist:${rep.domain}`, JSON.stringify(s)); await r.ltrim(`${P}:hist:${rep.domain}`, 0, 49);
      await r.sadd(`${P}:domains`, rep.domain);
    }
  } catch { /* storing must never break a scan */ }
}
/** One-off hygiene for saved history: merge non-canonical keys into the canonical one, drop invalid keys. Dry run by default. */
export async function cleanupHistory(apply = false, knownSubSites?: Set<string>): Promise<{ apply: boolean; total: number; keep: number; merge: { from: string; to: string; points: number }[]; drop: { domain: string; points: number }[] }> {
  const { planDomainCleanup } = await import("./targets");
  const r = redis();
  if (!r) return { apply, total: 0, keep: 0, merge: [], drop: [] };
  const domains = ((await r.smembers(`${P}:domains`)) as string[]) ?? [];
  const plan = planDomainCleanup(domains, knownSubSites);
  const len = async (d: string) => Number(await r.llen(`${P}:hist:${d}`)) || 0;
  const merge = await Promise.all(plan.merge.map(async (m) => ({ ...m, points: await len(m.from) })));
  const drop = await Promise.all(plan.drop.map(async (d) => ({ domain: d, points: await len(d) })));
  if (apply) {
    for (const m of merge) {
      const pts = (await r.lrange<unknown>(`${P}:hist:${m.from}`, 0, 49)).map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
      const into = (await r.lrange<unknown>(`${P}:hist:${m.to}`, 0, 49)).map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
      const all = [...into, ...pts].map((x) => JSON.parse(x) as { id?: string; at?: string })
        .filter((p, i, a) => a.findIndex((q) => q.id === p.id) === i)
        .sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50);
      await r.del(`${P}:hist:${m.to}`);
      if (all.length) await r.rpush(`${P}:hist:${m.to}`, ...all.map((p) => JSON.stringify(p)));
      await r.sadd(`${P}:domains`, m.to);
      await r.del(`${P}:hist:${m.from}`); await r.srem(`${P}:domains`, m.from);
    }
    for (const d of drop) { await r.del(`${P}:hist:${d.domain}`); await r.srem(`${P}:domains`, d.domain); }
  }
  return { apply, total: domains.length, keep: plan.keep.length, merge, drop };
}

export async function getReport(id: string): Promise<ScanReport | null> {
  try {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const r = redis(); if (!r) return null;
    const v = await r.get<unknown>(`${P}:r:${id}`); if (!v) return null;
    return (typeof v === "string" ? JSON.parse(v) : v) as ScanReport;
  } catch { return null; }
}
export async function cachedReport(domain: string): Promise<ScanReport | null> {
  try { const r = redis(); const id = r ? await r.get<string>(`${P}:cache:${domain}`) : null; return id ? await getReport(id) : null; } catch { return null; }
}
export type HistoryPoint = { id: string; at: string; overall: number | null; areas: ScanReport["areas"]; critical: number; quick: number; mode: string };
export async function history(domain: string): Promise<HistoryPoint[]> {
  try {
    const r = redis(); if (!r) return [];
    return (await r.lrange<unknown>(`${P}:hist:${domain}`, 0, 49)).map((x) => (typeof x === "string" ? JSON.parse(x) : x) as HistoryPoint);
  } catch { return []; }
}
export async function allDomains(): Promise<string[]> {
  try { const r = redis(); return r ? ((await r.smembers(`${P}:domains`)) as string[]).sort() : []; } catch { return []; }
}
