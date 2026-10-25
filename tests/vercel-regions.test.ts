import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Functions must run in Sydney (syd1). vercel.json "regions" overrides the
// project's Function Region setting, which was left on iad1 (Washington DC).
test("vercel.json pins functions to syd1", () => {
  const cfg = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.deepEqual(cfg.regions, ["syd1"]);
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test("no route overrides the region with a non-Sydney preferredRegion", () => {
  const offenders = walk("app").filter((f) => {
    const src = readFileSync(f, "utf8");
    const m = src.match(/export\s+const\s+preferredRegion\s*=\s*([^;\n]+)/);
    return m && !/syd1/.test(m[1]);
  });
  assert.deepEqual(offenders, []);
});
