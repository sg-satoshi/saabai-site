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

test("SUNDER default copy is in the static HTML so crawlers see it", () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  assert.match(html, /<h1 data-c="headline">Get first hit\.<\/h1>/);
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.match(html, /<p class="sub" data-c="sub">A new pickleball paddle with power, spin and control\. Join for 20% off at launch, early access and a giveaway\.<\/p>/);
  assert.match(html, /<button type="submit" data-c="cta"[^>]*>Get first hit<\/button>/);
  assert.match(html, /<p class="wty" data-c="wty" data-no-test>12-month warranty on core and edge\.<\/p>/);
  assert.match(html, /<title>SUNDER pickleball paddles, Australia 🇦🇺 \| Join the VIP list<\/title>/);
  for (const m of ["og:title", "og:description", "og:url", "og:type", "og:image"]) assert.match(html, new RegExp(`property="${m}" content="[^"]+"`), m);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)![1]);
  assert.equal(ld.email, "hello@sunder.com.au"); assert.ok(ld.logo); assert.equal(ld.areaServed.name, "Australia");
  assert.doesNotMatch(html, /clients\/sunder\/(privacy|giveaway-terms)\.html/);
  assert.match(html, /href="\/privacy"/); assert.match(html, /href="\/giveaway-terms"/);
});

/** Run the page's own copy script against a tiny DOM built from the static markup, with an optional sb_ov cookie. */
function renderCopy(cookie: string) {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  const src = html.slice(html.indexOf("const HEADLINES="), html.indexOf("const q=new URLSearchParams"));
  const els = [...html.matchAll(/<(\w+)[^>]*data-c="(\w+)"([^>]*)>([^<]*)/g)].map((m) => ({ tag: m[1], dataset: { c: m[2], ...(/data-h=/.test(m[0]) ? { h: "1" } : {}) } as Record<string, string>, textContent: m[4], innerHTML: m[4] }));
  const document = { cookie, documentElement: { dataset: {} as Record<string, string> }, querySelectorAll: () => els };
  new Function("document", "location", "URLSearchParams", src)(document, { pathname: "/", search: "" }, URLSearchParams);
  const get = (c: string) => els.find((e) => e.dataset.c === c)!;
  return { h1: get("headline").textContent, cta: get("cta").textContent, sub: get("sub").textContent, wty: get("wty").textContent };
}

test("both headline variants still swap over the pre-rendered default", () => {
  const ovB = `sb_ov=${encodeURIComponent(JSON.stringify({ p: "/", o: [{ i: "sunder-home-hero-headline", a: "b" }] }))}`;
  assert.deepEqual(renderCopy(""), { h1: "Get first hit.", cta: "Get first hit", sub: "A new pickleball paddle with power, spin and control. Join for 20% off at launch, early access and a giveaway.", wty: "12-month warranty on core and edge." });
  const b = renderCopy(ovB);
  assert.equal(b.h1, "Feel the power. Keep the control."); assert.equal(b.cta, "Be first to hit it");
});

test("SUNDER legal pages: clean URLs serve the files, old paths 301", async () => {
  const { sunderLegalRoute } = await import("../lib/sunder-factory-seed");
  assert.deepEqual(sunderLegalRoute("/privacy"), { rewrite: "/clients/sunder/privacy.html" });
  assert.deepEqual(sunderLegalRoute("/giveaway-terms/"), { rewrite: "/clients/sunder/giveaway-terms.html" });
  assert.deepEqual(sunderLegalRoute("/clients/sunder/privacy.html"), { redirect: "/privacy" });
  assert.deepEqual(sunderLegalRoute("/clients/sunder/giveaway-terms.html"), { redirect: "/giveaway-terms" });
  assert.equal(sunderLegalRoute("/"), null);
  assert.equal(sunderLegalRoute("/clients/sunder/index.html"), null);
});
