/**
 * One-off: mask chat attachment text in Lex threads already stored in Redis.
 *
 * Dry run (default, read only, counts only):
 *   npx tsx scripts/lex-backfill-attachments.ts
 * Write (only after Shane approves):
 *   npx tsx scripts/lex-backfill-attachments.ts --apply
 *
 * Needs UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (and the same LEX_PRIVACY_TOKEN_SECRET or
 * PORTAL_SESSION_SECRET as production, so placeholders match what new saves produce). Run
 * `node scripts/fetch-ner-model.mjs` first so the name model is used. Prints counts only.
 */
import { getRedis } from "../lib/redis";
import { getMatter } from "../lib/lex-matters";
import { firmKeyForEmail } from "../lib/lex-review-access";
import { backfillAttachments } from "../lib/lex-privacy/backfill-attachments";

async function main() {
  const apply = process.argv.includes("--apply");
  const redis = getRedis();
  if (!redis) { console.error("Redis env vars are not set."); process.exit(1); }
  if (!process.env.LEX_PRIVACY_TOKEN_SECRET && !process.env.PORTAL_SESSION_SECRET && !process.env.SAABAI_SESSION_SECRET) {
    console.error("No placeholder secret set. Placeholders would not match production saves. Stopping.");
    process.exit(1);
  }
  const report = await backfillAttachments(
    {
      async *keys() {
        let cursor: string | number = 0;
        do {
          const [next, keys]: [string, string[]] = await redis.scan(cursor, { match: "lex:threads:*", count: 200 });
          for (const k of keys) yield k;
          cursor = next;
        } while (String(cursor) !== "0");
      },
      get: (k) => redis.get(k),
      ttl: (k) => redis.ttl(k),
      set: async (k, v, ttl) => { if (ttl) await redis.set(k, v, { ex: ttl }); else await redis.set(k, v); },
    },
    { dryRun: !apply, firmFor: firmKeyForEmail, loadMatter: getMatter, onProgress: (l) => console.log(l) },
  );
  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log("Dry run only. Nothing was written. Re-run with --apply to mask.");
}

main().catch((e) => { console.error("Backfill failed:", e instanceof Error ? e.name : "error"); process.exit(1); });
