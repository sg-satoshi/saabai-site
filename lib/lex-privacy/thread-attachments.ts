/**
 * Masks chat attachment text before Lex threads are saved, so no readable client details from an
 * uploaded document are stored at rest. Uses the same pipeline as the Lex routes (AU ID patterns,
 * the matter's parties and the open-source name model) with thread-stable placeholders, so the same
 * value in a thread always gets the same {{TYPE_N}} token. Only the attachment part of a user turn
 * is masked; the question the user typed is kept as written.
 * Fail closed: if masking fails, the attachment text is dropped and only its file name is kept.
 */
import { createHash } from "node:crypto";
import { LexMasker, lexThreadKey } from "./mask";
import { detectNames } from "./ner";
import type { MatterParty } from "./parties";

export const ATTACH_MARK = "\n\n--- Attached document: ";
export const ATTACH_DROPPED = "[Attachment text not stored]";
const MASKED_FLAG = "attachmentMasked";
const THREAD_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

type Msg = { role?: unknown; content?: unknown; [k: string]: unknown };
type Thread = { id?: unknown; messages?: unknown; matterId?: unknown; [k: string]: unknown };

// Saves repeat often with the same raw text still in the browser. Cache results so the model runs once per attachment.
const CACHE_MAX = 200;
const cache = new Map<string, string>();
function cacheGet(k: string): string | undefined {
  const v = cache.get(k);
  if (v !== undefined) { cache.delete(k); cache.set(k, v); }
  return v;
}
function cacheSet(k: string, v: string): void {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}
export function __clearAttachmentCacheForTests(): void { cache.clear(); }
let failForTests = false;
export function __failMaskingForTests(on: boolean): void { failForTests = on; }

export type AttachmentStats = { masked: number; dropped: number; cached: number };

/** Masks the attachment part of one user message. Returns the new content. */
async function maskAttachment(firm: string, threadId: string, content: string, parties: MatterParty[]): Promise<string> {
  if (failForTests) throw new Error("masking failed (test)");
  const i = content.indexOf(ATTACH_MARK);
  const head = content.slice(0, i);
  const tail = content.slice(i + ATTACH_MARK.length);
  const masker = new LexMasker(lexThreadKey(firm, `id:${threadId}`));
  if (parties.length) masker.addParties(parties);
  const r = await detectNames([tail]).catch(() => null);
  if (r?.parties.length) masker.addParties(r.parties, "ner");
  return `${head}${ATTACH_MARK}${masker.mask(tail)}`;
}

/**
 * Returns a copy of the threads with every attachment masked. Messages already masked (flagged) are
 * left alone. Never throws. `partiesFor` loads a matter's parties for the signed-in firm.
 */
export async function maskThreadAttachments(
  threads: unknown[],
  firm: string,
  partiesFor: (matterId: unknown) => Promise<MatterParty[]> = async () => [],
): Promise<{ threads: unknown[]; stats: AttachmentStats }> {
  const stats: AttachmentStats = { masked: 0, dropped: 0, cached: 0 };
  const out: unknown[] = [];
  for (const t of threads) {
    if (!t || typeof t !== "object" || !Array.isArray((t as Thread).messages)) { out.push(t); continue; }
    const thread = t as Thread;
    const id = typeof thread.id === "string" && THREAD_ID_RE.test(thread.id) ? thread.id : "no-id";
    let parties: MatterParty[] | null = null;
    const messages: unknown[] = [];
    for (const m of thread.messages as unknown[]) {
      const msg = m as Msg;
      if (!msg || msg.role !== "user" || typeof msg.content !== "string" || !msg.content.includes(ATTACH_MARK) || msg[MASKED_FLAG] === true) {
        messages.push(m);
        continue;
      }
      const key = createHash("sha256").update(`${firm}\u0000${id}\u0000${String(thread.matterId ?? "")}\u0000${msg.content}`).digest("hex");
      let content = cacheGet(key);
      if (content !== undefined) {
        stats.cached++;
      } else {
        try {
          parties ??= await partiesFor(thread.matterId).catch(() => []);
          content = await maskAttachment(firm, id, msg.content, parties);
          cacheSet(key, content);
        } catch {
          const name = msg.content.slice(msg.content.indexOf(ATTACH_MARK) + ATTACH_MARK.length).split("\n")[0] ?? "";
          content = `${msg.content.slice(0, msg.content.indexOf(ATTACH_MARK))}${ATTACH_MARK}${name}\n\n${ATTACH_DROPPED}`;
          stats.dropped++;
          messages.push({ ...msg, content, [MASKED_FLAG]: true });
          continue;
        }
      }
      stats.masked++;
      messages.push({ ...msg, content, [MASKED_FLAG]: true });
    }
    out.push({ ...thread, messages });
  }
  return { threads: out, stats };
}

/**
 * Masks the attachment text in a research item before it is saved to a matter, with the same pipeline
 * (and the same firm key) as saved threads. Typed questions keep real names, as with threads. Draft and
 * review items are returned unchanged. Never throws: an attachment that cannot be masked is dropped.
 */
export async function maskResearchMatterItem<T extends { kind?: unknown; ref?: unknown; data?: unknown }>(
  item: T,
  firm: string,
  matterId: string,
  partiesFor: (matterId: unknown) => Promise<MatterParty[]> = async () => [],
): Promise<{ item: T; stats: AttachmentStats }> {
  const empty: AttachmentStats = { masked: 0, dropped: 0, cached: 0 };
  const data = item?.data as { messages?: unknown } | null | undefined;
  if (item?.kind !== "research" || !data || typeof data !== "object" || !Array.isArray(data.messages)) return { item, stats: empty };
  const threadId = `m_${String(item.ref ?? "").replace(/^research:/, "")}`;
  const { threads, stats } = await maskThreadAttachments([{ id: threadId, matterId, messages: data.messages }], firm, partiesFor);
  const messages = (threads[0] as { messages: unknown[] }).messages;
  return { item: { ...item, data: { ...data, messages } }, stats };
}
