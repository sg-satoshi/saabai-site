/**
 * Lex matters (phase G): firm-scoped matter records shared by everyone at the firm.
 * A firm is the email domain (see firmKeyForEmail); free-mail users are a firm of one.
 * Redis, no expiry:
 *   lex:matters:{firm}               hash  matterId -> Matter JSON
 *   lex:matters:seq:{firm}:{year}    counter for matter numbers
 *   lex:matter:items:{firm}:{id}     hash  ref -> MatterItem JSON (research, draft or review snapshot)
 */
import { getRedis } from "./redis";
import { noDashes } from "./no-dashes";
import { LEX_INTAKE_MATTER_TYPES, isLexIntakeMatterType } from "./lex-intake-matter-types";

export const MATTER_STATUSES = ["open", "on_hold", "closed"] as const;
export type MatterStatus = (typeof MATTER_STATUSES)[number];
export const MATTER_STATUS_LABEL: Record<MatterStatus, string> = { open: "Open", on_hold: "On hold", closed: "Closed" };
export const MATTER_AREAS = LEX_INTAKE_MATTER_TYPES;
export const ITEM_KINDS = ["research", "draft", "review"] as const;
export type MatterItemKind = (typeof ITEM_KINDS)[number];

export type Matter = {
  id: string; name: string; client: string; area: string; status: MatterStatus;
  urgency: "low" | "medium" | "high"; description: string;
  /** Known parties and aliases, one per line (always masked before any AI call). Optional on old matters. */
  parties?: string;
  deadline: string | null; deadlineLabel: string;
  createdBy: string; createdAt: number; updatedAt: number; updatedBy: string;
  itemCount: number;
};
export type MatterItem = {
  ref: string; kind: MatterItemKind; title: string; by: string; at: number;
  /** Research: { messages }. Draft: { text, docType }. Review: { report, docText, fileName }. */
  data: unknown;
};

export const MAX_ITEM_BYTES = 200_000;
const mattersKey = (firm: string) => `lex:matters:${firm}`;
const itemsKey = (firm: string, id: string) => `lex:matter:items:${firm}:${id}`;

const clean = (v: unknown, max: number) => noDashes(String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim()).slice(0, max);
const parse = <T>(v: unknown): T | null => {
  if (v == null) return null;
  if (typeof v === "object") return v as T;
  try { return JSON.parse(String(v)) as T; } catch { return null; }
};
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type MatterInput = Partial<Pick<Matter, "name" | "client" | "area" | "status" | "urgency" | "description" | "deadline" | "deadlineLabel" | "parties">>;

/** Validates user input. Returns an error message or the cleaned fields. */
export function cleanMatterInput(body: MatterInput, creating: boolean): { error: string } | { fields: MatterInput } {
  const f: MatterInput = {};
  if (body.name !== undefined || creating) { f.name = clean(body.name, 140); if (!f.name) return { error: "Give the matter a name." }; }
  if (body.client !== undefined) f.client = clean(body.client, 140);
  if (body.area !== undefined || creating) { const a = String(body.area ?? "Tax"); if (!isLexIntakeMatterType(a)) return { error: "Unknown practice area." }; f.area = a; }
  if (body.status !== undefined) { if (!(MATTER_STATUSES as readonly string[]).includes(String(body.status))) return { error: "Unknown status." }; f.status = body.status; }
  if (body.urgency !== undefined) { if (!["low", "medium", "high"].includes(String(body.urgency))) return { error: "Unknown urgency." }; f.urgency = body.urgency; }
  if (body.description !== undefined) f.description = clean(body.description, 2000);
  if (body.deadline !== undefined) { if (body.deadline !== null && body.deadline !== "" && !isDate(body.deadline)) return { error: "Deadline must be a date." }; f.deadline = body.deadline || null; }
  if (body.deadlineLabel !== undefined) f.deadlineLabel = clean(body.deadlineLabel, 120);
  if (body.parties !== undefined) f.parties = String(body.parties ?? "").split(/\r?\n/).map((l) => clean(l, 200)).filter(Boolean).slice(0, 50).join("\n");
  return { fields: f };
}

/** Matter number prefix from the firm: tributumlaw.com gives TL style initials when the label splits, else first two letters. */
export function matterPrefix(firm: string): string {
  const label = (firm.includes("@") ? firm.split("@")[0] : firm.split(".")[0]).toLowerCase();
  const m = label.match(/^([a-z])[a-z]*?(law|legal|tax|partners|group)$/);
  const p = m ? m[1] + m[2][0] : label.replace(/[^a-z]/g, "").slice(0, 2);
  return (p || "lx").toUpperCase();
}

export async function listMatters(firm: string): Promise<Matter[]> {
  const redis = getRedis();
  if (!redis) return [];
  const all = (await redis.hgetall<Record<string, unknown>>(mattersKey(firm))) ?? {};
  return Object.values(all).map((v) => parse<Matter>(v)).filter((m): m is Matter => !!m).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMatter(firm: string, id: string): Promise<Matter | null> {
  const redis = getRedis();
  if (!redis) return null;
  return parse<Matter>(await redis.hget(mattersKey(firm), id));
}

export async function createMatter(firm: string, by: string, f: MatterInput, now = new Date()): Promise<Matter> {
  const redis = getRedis();
  if (!redis) throw new Error("redis_unavailable");
  const year = now.getUTCFullYear();
  const n = await redis.incr(`lex:matters:seq:${firm}:${year}`);
  const id = `${matterPrefix(firm)}-${year}-${String(n).padStart(4, "0")}`;
  const t = now.getTime();
  const m: Matter = {
    id, name: f.name ?? "Untitled matter", client: f.client ?? "", area: f.area ?? "Tax", status: f.status ?? "open",
    urgency: f.urgency ?? "medium", description: f.description ?? "", parties: f.parties ?? "", deadline: f.deadline ?? null, deadlineLabel: f.deadlineLabel ?? "",
    createdBy: by, createdAt: t, updatedAt: t, updatedBy: by, itemCount: 0,
  };
  await redis.hset(mattersKey(firm), { [id]: JSON.stringify(m) });
  return m;
}

export async function updateMatter(firm: string, id: string, by: string, f: MatterInput): Promise<Matter | null> {
  const redis = getRedis();
  const m = await getMatter(firm, id);
  if (!redis || !m) return null;
  const next: Matter = { ...m, ...f, id: m.id, updatedAt: Date.now(), updatedBy: by } as Matter;
  await redis.hset(mattersKey(firm), { [id]: JSON.stringify(next) });
  return next;
}

export async function listItems(firm: string, id: string): Promise<MatterItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  const all = (await redis.hgetall<Record<string, unknown>>(itemsKey(firm, id))) ?? {};
  return Object.values(all).map((v) => parse<MatterItem>(v)).filter((i): i is MatterItem => !!i).sort((a, b) => b.at - a.at);
}

/** Adds or replaces one item (by ref) and bumps the matter. */
export async function putItem(firm: string, id: string, by: string, raw: { ref?: unknown; kind?: unknown; title?: unknown; data?: unknown }): Promise<{ error: string } | { item: MatterItem; matter: Matter }> {
  const redis = getRedis();
  const m = await getMatter(firm, id);
  if (!redis || !m) return { error: "not_found" };
  const kind = String(raw.kind);
  if (!(ITEM_KINDS as readonly string[]).includes(kind)) return { error: "Unknown item type." };
  const ref = String(raw.ref ?? "").replace(/[^\w:.-]/g, "").slice(0, 80);
  if (!ref) return { error: "Missing reference." };
  const item: MatterItem = { ref, kind: kind as MatterItemKind, title: clean(raw.title, 200) || "Untitled", by, at: Date.now(), data: raw.data ?? null };
  const json = JSON.stringify(item);
  if (json.length > MAX_ITEM_BYTES) return { error: "This item is too large to attach." };
  await redis.hset(itemsKey(firm, id), { [ref]: json });
  const count = await redis.hlen(itemsKey(firm, id));
  const matter = (await updateMatter(firm, id, by, {})) ?? m;
  matter.itemCount = count;
  await redis.hset(mattersKey(firm), { [id]: JSON.stringify(matter) });
  return { item, matter };
}

export async function removeItem(firm: string, id: string, ref: string): Promise<boolean> {
  const redis = getRedis();
  const m = await getMatter(firm, id);
  if (!redis || !m) return false;
  await redis.hdel(itemsKey(firm, id), ref);
  m.itemCount = await redis.hlen(itemsKey(firm, id));
  m.updatedAt = Date.now();
  await redis.hset(mattersKey(firm), { [id]: JSON.stringify(m) });
  return true;
}

/**
 * Deletes every matter, its items and the matter number counters for a firm key. Used by the Firm plan 30-day deletion.
 * Only exact keys built from the firm's own matters are touched (no SCAN patterns), so a firm key containing glob
 * characters can never match another firm's keys.
 */
export async function deleteFirmMatters(firm: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const all = (await redis.hgetall<Record<string, unknown>>(mattersKey(firm))) ?? {};
  const years = new Set<number>();
  for (const [id, v] of Object.entries(all)) {
    const y = id.match(/-(\d{4})-\d+$/)?.[1];
    if (y) years.add(Number(y));
    const m = parse<Matter>(v);
    if (m?.createdAt) years.add(new Date(m.createdAt).getUTCFullYear());
    await redis.del(itemsKey(firm, id));
  }
  await redis.del(mattersKey(firm));
  for (const y of years) await redis.del(`lex:matters:seq:${firm}:${y}`);
  return Object.keys(all).length;
}
