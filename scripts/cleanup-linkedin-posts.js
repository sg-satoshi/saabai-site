#!/usr/bin/env node
/**
 * scripts/cleanup-linkedin-posts.js
 *
 * Scans the LinkedIn post queue and history in Upstash Redis for malformed
 * records (those with missing, null, or empty `content` inside the stored
 * payload). These records crash AdminClient.tsx and LinkedInAdminPage.tsx
 * because both render preview text via post.content.split("\n").
 *
 * Run dry (default — lists bad records, deletes nothing):
 *   node --env-file=.env.local scripts/cleanup-linkedin-posts.js
 *
 * Apply deletions:
 *   node --env-file=.env.local scripts/cleanup-linkedin-posts.js --apply
 */

import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error(
    "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars."
  );
  console.error("Run with: node --env-file=.env.local scripts/cleanup-linkedin-posts.js");
  process.exit(1);
}

const redis = new Redis({ url, token });
const apply = process.argv.includes("--apply");

function tryParse(s) {
  if (typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function badContentReason(content) {
  if (content === undefined) return "missing";
  if (content === null) return "null";
  if (typeof content !== "string") return `non-string (${typeof content})`;
  if (content.trim() === "") return "empty string";
  return null;
}

async function scanList(listKey) {
  const ids = await redis.lrange(listKey, 0, -1);
  console.log(`\n=== ${listKey} (${ids.length} ids) ===`);
  const bad = [];
  for (const id of ids) {
    const raw = await redis.hgetall(`linkedin:${id}`);
    if (!raw || Object.keys(raw).length === 0) {
      console.log(`  ${id} — ORPHAN (id in list but no hash record)`);
      bad.push({ id, reason: "orphan", listKey, raw: null });
      continue;
    }
    const payload = tryParse(raw.payload);
    const content = payload?.content;
    const reason = badContentReason(content);
    if (reason) {
      console.log(`  ${id} — BAD content (${reason})`);
      console.log(
        `    createdAt: ${raw.createdAt ?? "?"} | scheduledFor: ${raw.scheduledFor ?? "?"} | status: ${raw.status ?? "?"}`
      );
      if (payload && Object.keys(payload).length > 0) {
        const keys = Object.keys(payload).filter((k) => k !== "content");
        if (keys.length > 0) {
          console.log(`    other payload keys: ${keys.join(", ")}`);
        }
      }
      bad.push({ id, reason, listKey, raw });
    }
  }
  return bad;
}

console.log("LinkedIn post records cleanup");
console.log("=============================");
console.log(`Mode: ${apply ? "APPLY (will delete)" : "dry run (no changes)"}`);

const pendingBad = await scanList("linkedin:pending");
const sentBad = await scanList("linkedin:sent");

// Dedupe by id+listKey
const seen = new Set();
const allBad = [];
for (const r of [...pendingBad, ...sentBad]) {
  const key = `${r.listKey}::${r.id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  allBad.push(r);
}

console.log(`\n=== Summary ===`);
console.log(`Bad records found: ${allBad.length}`);
console.log(`  in linkedin:pending: ${pendingBad.length}`);
console.log(`  in linkedin:sent: ${sentBad.length}`);

if (allBad.length === 0) {
  console.log("\nNothing to clean. The Redis store is healthy.");
  process.exit(0);
}

if (!apply) {
  console.log("\nDry run finished. To delete the records above, re-run with:");
  console.log("  node --env-file=.env.local scripts/cleanup-linkedin-posts.js --apply");
  process.exit(0);
}

console.log("\nDeleting bad records...");
let deleted = 0;
for (const { id, listKey } of allBad) {
  await redis.lrem(listKey, 0, id);
  await redis.del(`linkedin:${id}`);
  console.log(`  ✓ Deleted ${id} from ${listKey} and removed linkedin:${id}`);
  deleted++;
}
console.log(`\nDone. ${deleted} record(s) deleted.`);
