/**
 * DRY RUN, READ ONLY. Counts existing Lex matter items by kind, and research items whose attachment text
 * was never masked. Prints counts only, never titles, names or contents. Writes nothing.
 * NOT run by this PR. Shane decides whether to run it (it needs the production Redis env):
 *   npx tsx scripts/lex-matter-items-dry-run.ts
 */
import { getRedis } from "../lib/redis";
import { ATTACH_MARK } from "../lib/lex-privacy/thread-attachments";

async function main() {
  const redis = getRedis();
  if (!redis) { console.log("No Redis configured."); return; }
  const counts: Record<string, number> = { research: 0, research_unmasked_attachment: 0, draft: 0, review: 0, other: 0 };
  let cursor: string | number = 0;
  do {
    const [next, keys] = (await redis.scan(cursor, { match: "lex:matter:items:*", count: 200 })) as [string | number, string[]];
    cursor = next;
    for (const key of keys) {
      const all = (await redis.hgetall<Record<string, unknown>>(key)) ?? {};
      for (const v of Object.values(all)) {
        const it = (typeof v === "string" ? JSON.parse(v) : v) as { kind?: string; data?: { messages?: Array<{ role?: string; content?: string; attachmentMasked?: boolean }> } };
        const k = it?.kind ?? "other";
        counts[k in counts ? k : "other"]++;
        if (k === "research" && it.data?.messages?.some(m => m.role === "user" && m.content?.includes(ATTACH_MARK) && m.attachmentMasked !== true)) counts.research_unmasked_attachment++;
      }
    }
  } while (String(cursor) !== "0");
  console.log(JSON.stringify(counts));
}
main().catch(() => { console.log("Dry run failed."); process.exit(1); });
