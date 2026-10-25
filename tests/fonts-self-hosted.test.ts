/**
 * Builds never fetch Google Fonts: every font is self-hosted from app/fonts.
 *   npx tsx --test tests/fonts-self-hosted.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(n)) out.push(p);
  }
  return out;
}

test("no next/font/google in app (builds never fetch Google Fonts)", () => {
  for (const f of walk("app")) {
    const s = readFileSync(f, "utf8");
    assert.ok(!s.includes("next/font/google"), `${f} imports next/font/google`);
  }
});

test("every localFont path exists", () => {
  for (const f of walk("app")) {
    const s = readFileSync(f, "utf8");
    if (!s.includes("next/font/local")) continue;
    for (const m of s.matchAll(/(?:src|path): "([^"]+\.woff2)"/g)) assert.ok(existsSync(resolve(dirname(f), m[1])), `${f}: missing ${m[1]}`);
  }
});

test("CSS that names Inter, Geist or Geist Mono directly still gets the self-hosted files", () => {
  const css = readFileSync("app/globals.css", "utf8");
  for (const fam of ["Inter", "Geist", "Geist Mono"]) assert.match(css, new RegExp(`font-family:\\s*"${fam}"`));
});
