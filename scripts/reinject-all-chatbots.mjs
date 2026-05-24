/**
 * Re-injects the chatbot widget for every site that has chatbot.enabled = true.
 * Run once to sync all live site HTMLs with the stored chatbot config (avatarUrl, name, greeting, etc.)
 *
 * Usage:
 *   node scripts/reinject-all-chatbots.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = val;
  }
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const BASE_URL = "https://www.saabai.ai";

async function redisHgetall(key) {
  const res = await fetch(`${UPSTASH_URL}/hgetall/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const json = await res.json();
  if (!json.result) return {};
  // Result is flat [k, v, k, v, ...] array
  const out = {};
  for (let i = 0; i < json.result.length; i += 2) {
    out[json.result[i]] = json.result[i + 1];
  }
  return out;
}

async function main() {
  console.log("Fetching all sites from Redis…");
  const raw = await redisHgetall("saabai:sites");
  const sites = Object.values(raw).map(v => (typeof v === "string" ? JSON.parse(v) : v));
  console.log(`Found ${sites.length} total sites`);

  const botSites = sites.filter(s => s.chatbot?.enabled);
  console.log(`${botSites.length} sites have chatbot enabled\n`);

  let ok = 0;
  let fail = 0;

  for (const site of botSites) {
    process.stdout.write(`  ${site.slug} (${site.name}) — `);
    try {
      const res = await fetch(`${BASE_URL}/api/site-factory/inject-chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: site.slug,
          botName: site.chatbot.name || undefined,
          greeting: site.chatbot.greeting || undefined,
          avatarUrl: site.chatbot.avatarUrl || undefined,
          systemPrompt: site.chatbot.systemPrompt || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`OK (${data.botName}${site.chatbot.avatarUrl ? ", avatar" : ", no avatar"})`);
        ok++;
      } else {
        console.log(`FAILED: ${data.error}`);
        fail++;
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
}

main().catch(e => { console.error(e); process.exit(1); });
