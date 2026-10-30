#!/usr/bin/env node
// Fails if the company ACN/ABN placeholders in lib/entity.ts would ship.
// Runs in CI (entity-guard workflow) and in prebuild for production builds.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const force = process.argv.includes("--force");
const isProd = process.env.VERCEL_ENV === "production" || process.env.ENTITY_GUARD === "1";
if (!force && !isProd) {
  console.log("entity guard: skipped (not a production build; run with --force to check)");
  process.exit(0);
}
const PLACEHOLDERS = ["ACN_PENDING", "ABN_PENDING"];
const ROOTS = ["lib", "app", "public"];
const SKIP = new Set(["node_modules", ".next"]);
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs|txt|md|json)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      const lines = text.split("\n");
      lines.forEach((l, i) => {
        // lib/entity.ts lists the placeholder strings in ENTITY_PLACEHOLDERS; only the assigned values count there.
        if (p.endsWith("lib/entity.ts") && l.includes("ENTITY_PLACEHOLDERS")) return;
        if (PLACEHOLDERS.some((ph) => l.includes(ph))) hits.push(`${p}:${i + 1}`);
      });
    }
  }
}
ROOTS.forEach(walk);
if (hits.length) {
  console.error("entity guard: FAIL. ACN/ABN placeholders would ship. Fill lib/entity.ts and public/llms*.txt:");
  hits.forEach((h) => console.error("  " + h));
  process.exit(1);
}
console.log("entity guard: OK");
