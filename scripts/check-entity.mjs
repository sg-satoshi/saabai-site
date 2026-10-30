#!/usr/bin/env node
/**
 * Entity guard: fails while any entity placeholder is still in the code.
 *   - lib/entity.ts ENTITY_ADDRESS still "ADDRESS_PENDING"
 *   - any "XXX_PENDING" string literal in app/, lib/ or public/ (outside lib/entity.ts's own detector)
 * Runs via `npm run check:entity`, and in prebuild on production deploys only (VERCEL_ENV=production),
 * so previews still build while the draft waits for the numbers.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

if (process.argv.includes("--prod-only") && process.env.VERCEL_ENV !== "production") process.exit(0);

const problems = [];
const entity = readFileSync("lib/entity.ts", "utf8");
const addr = entity.match(/export const ENTITY_ADDRESS(?::\s*string)?\s*=\s*"([^"]*)"/)?.[1];
if (addr === undefined) problems.push("lib/entity.ts: ENTITY_ADDRESS constant not found");
else if (/_PENDING$/.test(addr) || !addr.trim()) problems.push(`lib/entity.ts: ENTITY_ADDRESS is "${addr}" (set the company's registered address)`);

const walk = (p, out) => {
  const st = statSync(p);
  if (st.isDirectory()) { if (!/node_modules|\.next/.test(p)) for (const f of readdirSync(p)) walk(join(p, f), out); }
  else if (/\.(tsx?|mjs|js|txt|html|json)$/.test(p)) out.push(p);
  return out;
};
for (const f of [...walk("app", []), ...walk("lib", []), ...walk("public", [])]) {
  if (f === join("lib", "entity.ts")) continue;
  const s = readFileSync(f, "utf8");
  const m = s.match(/["'`][A-Z]+_PENDING["'`]|\b(?:ADDRESS|ACN|ABN)_PENDING\b/);
  if (m) problems.push(`${f}: placeholder ${m[0]}`);
}

if (problems.length) {
  console.error("check-entity failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("check-entity: ok");
