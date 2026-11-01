import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readRepoClientHtml } from "../lib/repo-client-html";

// No Redis and no Blob token in tests: every site is off and Blob is unreachable.
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.KV_REST_API_URL; delete process.env.BLOB_READ_WRITE_TOKEN;

async function serve(slug: string, cookie?: string) {
  const { GET } = await import("../app/sites/[slug]/route");
  const { NextRequest } = await import("next/server");
  return GET(new NextRequest("https://example.test/", cookie ? { headers: { cookie } } : undefined), { params: Promise.resolve({ slug }) });
}

async function pipeline(slug: string, file: string) {
  const { ensurePoweredBy } = await import("../lib/client-site");
  const { ensureSchema } = await import("../lib/site-schema");
  const { ensureFavicon } = await import("../lib/site-favicon");
  return ensurePoweredBy(slug, ensureSchema(slug, await ensureFavicon(slug, readFileSync(file, "utf8"))));
}

test("SUNDER is repo-first: the repo file is served, never a Blob copy", async () => {
  assert.equal(readRepoClientHtml("sunder", "index.html"), readFileSync("public/clients/sunder/index.html", "utf8"));
  const res = await serve("sunder");
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.equal(body, await pipeline("sunder", "public/clients/sunder/index.html"));
  assert.match(body, /window\.dispatchEvent\(new Event\('sb:goal'\)\)/);
  assert.match(body, /const ovB=/);
  assert.match(body, /<input type="checkbox" id="smsok" checked>/);
});

test("SUNDER headers match live: no-store and noindex, nofollow", async () => {
  const res = await serve("sunder");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
});

test("SUNDER off: no overlay script, even with an sb_ov cookie", async () => {
  for (const c of [undefined, "sb_ov=x"]) {
    const body = await (await serve("sunder", c)).text();
    assert.doesNotMatch(body, /data-sb-exp/);
  }
});

test("other Blob-backed sites are unchanged (not repo-first, same fallback and headers)", async () => {
  assert.equal(readRepoClientHtml("nextinvestment", "index.html"), null);
  const res = await serve("nextinvestment");
  assert.equal(await res.text(), await pipeline("nextinvestment", "public/clients/nextinvestment/index.html"));
  assert.equal(res.headers.get("cache-control"), "public, s-maxage=3600");
  assert.equal(res.headers.get("x-robots-tag"), null);
});
