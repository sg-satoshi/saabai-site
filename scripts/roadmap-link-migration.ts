/**
 * Additive roadmap link migration. Does not run on deploy or on page load.
 *
 * Fills missing prNumber / issueNumber on existing Redis rows in `saabai:roadmap`.
 * It does not change status, title, description or area, and it does not add or delete rows.
 *
 * Chief: run this only after Shane approves. Dry run is the default.
 *
 *   npx tsx scripts/roadmap-link-migration.ts
 *   npx tsx scripts/roadmap-link-migration.ts --apply
 *
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the environment or .env.local.
 *
 * Links:
 *   payments-coupon-picker -> PR 154 (Payments coupon picker)
 *   admin-roadmap -> PR 149 (this page)
 *
 * PR 208 (Christina and Zara on the shared chat platform) is not written onto a row.
 * "Remaining chatbot follow-ups" still lists other unfinished work. PR 208 shows as its
 * own Done row from the merged pull request list.
 */
import { config } from "dotenv";
import { applyLinkPatches, ROADMAP_KEY, type RoadmapItem } from "../lib/roadmap-core";

config({ path: ".env.local" });

function parse(raw: unknown): RoadmapItem[] | null {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? (v as RoadmapItem[]) : null;
  } catch {
    return null;
  }
}

function sameIdentity(before: RoadmapItem, after: RoadmapItem): boolean {
  return before.id === after.id
    && before.title === after.title
    && before.description === after.description
    && before.status === after.status
    && before.area === after.area
    && before.createdAt === after.createdAt;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { getRedis } = await import("../lib/redis");
  const redis = getRedis();
  if (!redis) {
    console.error("Storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    process.exit(1);
  }
  const items = parse(await redis.get(ROADMAP_KEY));
  if (!items) {
    console.error(`No roadmap list at ${ROADMAP_KEY}. Nothing was written.`);
    process.exit(1);
  }
  const { items: next, changes } = applyLinkPatches(items);
  if (next.length !== items.length || next.some((item, i) => !sameIdentity(items[i], item))) {
    console.error("Refusing to write: the patch changed more than a missing link.");
    process.exit(1);
  }
  if (!changes.length) {
    console.log("No missing links. Nothing to change.");
    return;
  }
  for (const c of changes) console.log(`${apply ? "set" : "would set"} ${c.id} ${c.field}=${c.value}`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply after approval to write these links.");
    return;
  }
  await redis.set(ROADMAP_KEY, JSON.stringify(next));
  console.log(`Updated ${changes.length} link${changes.length === 1 ? "" : "s"} on ${ROADMAP_KEY}. Statuses were left as stored.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
