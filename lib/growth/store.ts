/**
 * Growth data store. Uses Neon Postgres when DATABASE_URL is set (Vercel
 * Marketplace, free tier), otherwise falls back to the existing Upstash Redis
 * so features work before Neon is provisioned. Schema: db/migrations/001_growth.sql.
 *
 * Documents are JSON records in a named collection (pulse_campaigns,
 * marketing_drafts, upsells, testimonials, referrals, ...). contact_events is
 * an append-only table with its own helpers in ./events.ts.
 */
import { getRedis } from "../redis";

export type Doc = { id: string; createdAt: string; updatedAt: string; [k: string]: unknown };

type SqlFn = (q: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
let sqlFn: SqlFn | null | undefined;

export async function getSql(): Promise<SqlFn | null> {
  if (sqlFn !== undefined) return sqlFn;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return (sqlFn = null);
  const { neon } = await import("@neondatabase/serverless");
  const client = neon(url);
  sqlFn = async (q, params = []) => (await client.query(q, params)) as Record<string, unknown>[];
  return sqlFn;
}

export function storeBackend(): "neon" | "redis" | "none" {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return "neon";
  return getRedis() ? "redis" : "none";
}

export function newId(prefix = ""): string {
  const r = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}_${r.replace(/-/g, "").slice(0, 16)}` : r;
}

const COLL = /^[a-z_]{2,40}$/;
const rk = (c: string) => `growth:${c}`;
const rz = (c: string) => `growth:${c}:idx`;

function check(c: string) {
  if (!COLL.test(c)) throw new Error("bad collection");
}

export async function putDoc<T extends Doc>(coll: string, doc: Omit<T, "createdAt" | "updatedAt"> & Partial<Doc>): Promise<T> {
  check(coll);
  const now = new Date().toISOString();
  const full = { ...doc, createdAt: doc.createdAt || now, updatedAt: now } as T;
  const sql = await getSql();
  if (sql) {
    await sql(
      `insert into growth_docs (coll, id, data, created_at, updated_at) values ($1,$2,$3,$4,$5)
       on conflict (coll, id) do update set data = excluded.data, updated_at = excluded.updated_at`,
      [coll, full.id, JSON.stringify(full), full.createdAt, full.updatedAt],
    );
    return full;
  }
  const r = getRedis();
  if (!r) throw new Error("No data store configured");
  await r.hset(rk(coll), { [full.id]: JSON.stringify(full) });
  await r.zadd(rz(coll), { score: Date.parse(full.createdAt), member: full.id });
  return full;
}

function parse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "string") { try { return JSON.parse(v) as T; } catch { return null; } }
  return v as T;
}

export async function getDoc<T extends Doc>(coll: string, id: string): Promise<T | null> {
  check(coll);
  const sql = await getSql();
  if (sql) {
    const rows = await sql(`select data from growth_docs where coll=$1 and id=$2`, [coll, id]);
    return rows[0] ? parse<T>(rows[0].data) : null;
  }
  const r = getRedis();
  if (!r) return null;
  return parse<T>(await r.hget(rk(coll), id));
}

/** Newest first. */
export async function listDocs<T extends Doc>(coll: string, limit = 200): Promise<T[]> {
  check(coll);
  const sql = await getSql();
  if (sql) {
    const rows = await sql(`select data from growth_docs where coll=$1 order by created_at desc limit $2`, [coll, limit]);
    return rows.map((x) => parse<T>(x.data)).filter(Boolean) as T[];
  }
  const r = getRedis();
  if (!r) return [];
  const ids = (await r.zrange(rz(coll), 0, limit - 1, { rev: true })) as string[];
  if (!ids.length) return [];
  const vals = (await r.hmget(rk(coll), ...ids)) as Record<string, unknown> | null;
  return ids.map((id) => parse<T>(vals?.[id])).filter(Boolean) as T[];
}

/** Which of these ids exist in a collection, in one query (or one HMGET per 200 on Redis). */
export async function existingDocIds(coll: string, ids: string[]): Promise<Set<string>> {
  check(coll);
  const out = new Set<string>();
  const uniq = [...new Set(ids)];
  if (!uniq.length) return out;
  const sql = await getSql();
  if (sql) {
    const rows = await sql(`select id from growth_docs where coll=$1 and id = any($2::text[])`, [coll, uniq]);
    for (const r of rows) out.add(String(r.id));
    return out;
  }
  const r = getRedis();
  if (!r) return out;
  for (let i = 0; i < uniq.length; i += 200) {
    const chunk = uniq.slice(i, i + 200);
    const vals = (await r.hmget(rk(coll), ...chunk)) as Record<string, unknown> | null;
    for (const id of chunk) if (vals?.[id] != null) out.add(id);
  }
  return out;
}

export async function patchDoc<T extends Doc>(coll: string, id: string, patch: Partial<T>): Promise<T | null> {
  const cur = await getDoc<T>(coll, id);
  if (!cur) return null;
  return putDoc<T>(coll, { ...cur, ...patch, id, createdAt: cur.createdAt });
}

export async function deleteDoc(coll: string, id: string): Promise<boolean> {
  check(coll);
  const sql = await getSql();
  if (sql) {
    const rows = await sql(`delete from growth_docs where coll=$1 and id=$2 returning id`, [coll, id]);
    return rows.length > 0;
  }
  const r = getRedis();
  if (!r) return false;
  await r.zrem(rz(coll), id);
  return (await r.hdel(rk(coll), id)) > 0;
}
