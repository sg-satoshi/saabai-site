/**
 * AustLII pause: no AustLII-run site is searched or read unless LEX_AUSTLII_ENABLED=true.
 *   npx tsx --test tests/lex-austlii-pause.test.ts
 * Mock fetch only, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAustliiEnabled, isAustliiHost, withoutAustliiTools, searchAustLII, searchFamilyLaw, searchStateLegislation, searchART, searchCorporationsLaw, searchInternational, searchATO, AUSTLII_TOOL_NAMES } from "../lib/lex-tools";
import { isAllowedSourceUrl, READ_ALLOWLIST } from "../lib/lex-sources";

const realFetch = globalThis.fetch;

function captureSerper(links: string[]) {
  const qs: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (/\/api\/leads/.test(url)) throw new Error("tests must never post to /api/leads");
    assert.match(url, /serper\.dev/);
    qs.push(JSON.parse(String(init?.body)).q);
    return Response.json({ organic: links.map((l) => ({ title: "t", link: l, snippet: "s" })) });
  }) as typeof fetch;
  return qs;
}

test("paused by default; only 'true' turns it on", () => {
  delete process.env.LEX_AUSTLII_ENABLED;
  assert.equal(isAustliiEnabled(), false);
  process.env.LEX_AUSTLII_ENABLED = "1";
  assert.equal(isAustliiEnabled(), false);
  process.env.LEX_AUSTLII_ENABLED = "true";
  assert.equal(isAustliiEnabled(), true);
  delete process.env.LEX_AUSTLII_ENABLED;
});

test("AustLII search tools make no network call while paused", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; delete process.env.SERPER_API_KEY; });
  process.env.SERPER_API_KEY = "test";
  const qs = captureSerper([]);
  for (const r of [await searchAustLII("x"), await searchFamilyLaw("x"), await searchStateLegislation("x", "QLD"), await searchART("x"), await searchCorporationsLaw("x")]) {
    assert.equal(r.results.length, 0);
    assert.match(r.error ?? "", /paused/);
  }
  assert.equal(qs.length, 0);
});

test("other searches drop AustLII-run results, and international uses BAILII", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; delete process.env.SERPER_API_KEY; });
  process.env.SERPER_API_KEY = "test";
  const qs = captureSerper(["https://www.ato.gov.au/a", "https://www.austlii.edu.au/b", "https://www.worldlii.org/c", "https://www.nzlii.org/d"]);
  const r = await searchATO("x");
  assert.deepEqual(r.results.map((x) => x.url), ["https://www.ato.gov.au/a"]);
  await searchInternational("x", "worldlii");
  assert.match(qs[1], /^site:bailii\.org /);
});

test("tool sets and readSource exclude AustLII", () => {
  const tools = Object.fromEntries([...AUSTLII_TOOL_NAMES, "searchATO", "readSource"].map((k) => [k, {}]));
  assert.deepEqual(Object.keys(withoutAustliiTools(tools)).sort(), ["readSource", "searchATO"]);
  assert.ok(READ_ALLOWLIST.every((h) => !isAustliiHost(h)));
  assert.ok(!isAllowedSourceUrl("https://www.austlii.edu.au/au/cases/cth/HCA/1.html"));
  const src = readFileSync("lib/lex-sources.ts", "utf8");
  assert.ok(!/austliiMirrorUrl\(url\)/.test(src), "no AustLII retry on 403");
  const draft = readFileSync("app/api/lex-draft/route.ts", "utf8");
  assert.equal((draft.match(/tools: withoutAustliiTools\(\{/g) ?? []).length, 2, "both lex-draft tool sets are filtered");
});
