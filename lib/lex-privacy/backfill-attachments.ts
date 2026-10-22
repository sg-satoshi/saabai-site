/**
 * One-off backfill: masks chat attachment text in Lex threads saved before attachments were
 * masked at rest. Reuses maskThreadAttachments, so it is idempotent (masked turns are flagged and
 * skipped) and fails closed (text that cannot be masked is dropped). Reports counts only, never
 * emails, thread titles or any stored text.
 */
import { createHash } from "node:crypto";
import { maskThreadAttachments, ATTACH_MARK } from "./thread-attachments";
import { partiesFromMatter } from "./matter-parties";
import type { MatterParty } from "./parties";

export type BackfillStore = {
  /** Every key matching lex:threads:* */
  keys(): AsyncIterable<string>;
  get(key: string): Promise<unknown>;
  ttl(key: string): Promise<number>;
  set(key: string, value: string, ttlSeconds: number | null): Promise<void>;
};

export type BackfillReport = {
  dryRun: boolean;
  keys: number;
  keysWithRawAttachments: number;
  keysWritten: number;
  threads: number;
  attachmentsMasked: number;
  attachmentsDropped: number;
  attachmentsAlreadyMasked: number;
  errors: number;
};

const PREFIX = "lex:threads:";

function parse(raw: unknown): unknown[] | null {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function countAttachments(threads: unknown[]): { raw: number; masked: number } {
  let raw = 0, masked = 0;
  for (const t of threads) {
    const msgs = (t as { messages?: unknown })?.messages;
    if (!Array.isArray(msgs)) continue;
    for (const m of msgs as Array<Record<string, unknown>>) {
      if (m?.role !== "user" || typeof m.content !== "string" || !m.content.includes(ATTACH_MARK)) continue;
      if (m.attachmentMasked === true) masked++; else raw++;
    }
  }
  return { raw, masked };
}

/** Short, non-reversible tag for a key in progress output. Never the email. */
export function keyTag(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

export async function backfillAttachments(
  store: BackfillStore,
  opts: {
    dryRun: boolean;
    firmFor: (email: string) => string;
    loadMatter?: (firm: string, matterId: string) => Promise<{ client?: string; parties?: string } | null>;
    onProgress?: (line: string) => void;
  },
): Promise<BackfillReport> {
  const r: BackfillReport = { dryRun: opts.dryRun, keys: 0, keysWithRawAttachments: 0, keysWritten: 0, threads: 0, attachmentsMasked: 0, attachmentsDropped: 0, attachmentsAlreadyMasked: 0, errors: 0 };
  for await (const key of store.keys()) {
    if (!key.startsWith(PREFIX)) continue;
    r.keys++;
    try {
      const threads = parse(await store.get(key));
      if (!threads) continue;
      r.threads += threads.length;
      const c = countAttachments(threads);
      r.attachmentsAlreadyMasked += c.masked;
      if (!c.raw) continue;
      r.keysWithRawAttachments++;
      if (opts.dryRun) { r.attachmentsMasked += c.raw; continue; }
      const firm = opts.firmFor(key.slice(PREFIX.length));
      const partiesFor = async (matterId: unknown): Promise<MatterParty[]> =>
        typeof matterId === "string" && opts.loadMatter ? partiesFromMatter(await opts.loadMatter(firm, matterId).catch(() => null)) : [];
      const { threads: out, stats } = await maskThreadAttachments(threads, firm, partiesFor);
      r.attachmentsMasked += stats.masked;
      r.attachmentsDropped += stats.dropped;
      const ttl = await store.ttl(key);
      await store.set(key, JSON.stringify(out), ttl > 0 ? ttl : null);
      r.keysWritten++;
      opts.onProgress?.(`key ${keyTag(key)}: ${stats.masked} masked, ${stats.dropped} dropped`);
    } catch {
      r.errors++;
      opts.onProgress?.(`key ${keyTag(key)}: error, left unchanged`);
    }
  }
  return r;
}
