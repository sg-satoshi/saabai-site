import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { isBlockedIp, parseTarget, resolvePublic, ScanUrlError } from "../lib/site-scan/ssrf";
import { safeFetch } from "../lib/site-scan/safe-fetch";
import { runScan, robotsDisallowsUs } from "../lib/site-scan/scan";
import { blockedBots } from "../lib/site-scan/checks";
import { rate, isQuickWin, noWebsiteReport } from "../lib/site-scan/score";
import { PDFDocument } from "pdf-lib";
import { buildScorePdf } from "../lib/score-pdf";
import { scoreAnswers, QUESTIONS } from "../lib/blueprint";
import type { FetchResult } from "../lib/site-scan/safe-fetch";

const res = (o: Partial<FetchResult> & { body?: string }): FetchResult => ({ ok: (o.status ?? 200) < 300 && (o.status ?? 200) >= 200, status: 200, url: "", headers: {}, body: "", bytes: (o.body ?? "").length, ms: 200, ...o });
const GOOD = `<html><head><title>Acme Plumbing Burleigh | Gold Coast plumber</title><meta name="description" content="Acme Plumbing is a Burleigh plumber serving the Gold Coast with fast, fair-priced repairs and installs for homes."><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://acme.com.au/"><meta property="og:title" content="a"><meta property="og:image" content="b">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Plumber","name":"Acme Plumbing","telephone":"0755551234","address":"1 Main St Burleigh QLD 4220"},{"@type":"FAQPage"}]}</script></head>
<body><h1>Acme Plumbing in Burleigh</h1><h2>Plumber services</h2><h2>FAQ</h2><p>Frequently asked questions. Call <a href="tel:0755551234">07 5555 1234</a>, 1 Main St Burleigh QLD 4220. We are a plumber servicing the Gold Coast. Rated 4.9 out of 5 by customers.</p><img src="a.jpg" alt="van"><iframe src="https://www.google.com/maps/embed"></iframe>
<a href="https://g.page/acme">Google</a><a href="https://facebook.com/acme">f</a><a href="https://instagram.com/acme">i</a></body></html>`;
const BAD = `<html><head><meta name="robots" content="noindex"></head><body><h1>a</h1><h1>b</h1><img src="x.jpg"></body></html>`;
const fake = (pages: Record<string, FetchResult>) => async (u: string) => pages[u] ?? res({ status: 404, ok: false });

test("isBlockedIp covers private, loopback, link-local, metadata, v6", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "224.0.0.1"]) assert.equal(isBlockedIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700::1111"]) assert.equal(isBlockedIp(ip), false, ip);
});
test("198.18/15 is blocked unless the dev-only switch is set, and never in production", () => {
  const env = process.env as Record<string, string | undefined>; const old = [env.NODE_ENV, env.SITE_SCAN_ALLOW_BENCHMARK_NET];
  delete env.SITE_SCAN_ALLOW_BENCHMARK_NET; assert.equal(isBlockedIp("198.18.0.1"), true);
  env.SITE_SCAN_ALLOW_BENCHMARK_NET = "1"; env.NODE_ENV = "development"; assert.equal(isBlockedIp("198.18.0.1"), false); assert.equal(isBlockedIp("10.0.0.1"), true);
  env.NODE_ENV = "production"; assert.equal(isBlockedIp("198.18.0.1"), true);
  env.NODE_ENV = old[0]; if (old[1] === undefined) delete env.SITE_SCAN_ALLOW_BENCHMARK_NET; else env.SITE_SCAN_ALLOW_BENCHMARK_NET = old[1];
});
test("parseTarget rejects unsafe input and accepts bare domains", () => {
  for (const bad of ["", "ftp://x.com", "javascript:alert(1)", "http://127.0.0.1", "http://[::1]/", "http://2130706433", "http://0x7f000001", "localhost", "http://intranet", "https://a.com:8080", "https://user:pw@a.com", "http://x.internal", "file:///etc/passwd"]) assert.throws(() => parseTarget(bad), ScanUrlError, bad);
  assert.equal(parseTarget("Example.com.au").hostname, "example.com.au");
  assert.equal(parseTarget("https://a.com/path#x").hash, "");
});
test("resolvePublic blocks hosts that resolve privately (any answer) and reports missing DNS", async () => {
  await assert.rejects(resolvePublic("evil.com", async () => ["8.8.8.8", "10.0.0.5"]), /private network/);
  await assert.rejects(resolvePublic("x.com", async () => { throw new Error("nx"); }), /DNS_NOT_FOUND/);
  assert.deepEqual(await resolvePublic("ok.com", async () => ["93.184.216.34"]), { ip: "93.184.216.34", family: 4 });
});
test("safeFetch never connects to a private address, including after a redirect", async () => {
  let hits = 0;
  const srv = http.createServer((_q, s) => { hits++; s.end("secret"); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  const port = (srv.address() as { port: number }).port;
  const a = await safeFetch(`http://127.0.0.1:${port}/`); assert.equal(a.ok, false); assert.equal(a.error, "blocked_url");
  const b = await safeFetch("http://rebind.test/", { resolver: async () => ["127.0.0.1"] }); assert.equal(b.error, "blocked_url");
  const c = await safeFetch("http://good.test/", { resolver: async (h) => (h === "good.test" ? ["93.184.216.34"] : ["127.0.0.1"]), timeoutMs: 300 }); assert.notEqual(c.body, "secret");
  assert.equal(hits, 0); srv.close();
});
test("blockedBots reads robots groups", () => {
  assert.deepEqual(blockedBots("User-agent: *\nDisallow:\n"), []);
  assert.ok(blockedBots("User-agent: GPTBot\nDisallow: /\n").includes("GPTBot"));
  assert.equal(blockedBots("User-agent: *\nDisallow: /\n").length, 6);
  assert.equal(robotsDisallowsUs("User-agent: *\nDisallow: /\n"), true);
  assert.equal(robotsDisallowsUs("User-agent: *\nDisallow: /admin\n"), false);
});
test("rating rules", () => {
  assert.equal(rate({ id: "x", weight: 6 }, "fail"), "critical");
  assert.equal(rate({ id: "indexable", weight: 5 }, "fail"), "critical");
  assert.equal(rate({ id: "sitemap", weight: 4 }, "fail"), "important");
  assert.equal(rate({ id: "headings", weight: 4 }, "partial"), "important");
  assert.equal(rate({ id: "alt", weight: 3 }, "fail"), "nice");
  assert.equal(rate({ id: "speed", weight: 6 }, "partial"), "important");
  assert.equal(isQuickWin("critical", 5, false), true);
  assert.equal(isQuickWin("nice", 5, false), false);
  assert.equal(isQuickWin("important", 90, true), false);
  assert.equal(isQuickWin("important", 240, false), false);
});
const goodPages = () => ({
  "https://acme.com.au/": res({ body: GOOD, ms: 300 }),
  "https://acme.com.au/robots.txt": res({ body: "User-agent: *\nAllow: /\nSitemap: https://acme.com.au/sitemap.xml" }),
  "https://acme.com.au/sitemap.xml": res({ body: "<urlset></urlset>" }),
  "https://acme.com.au/llms.txt": res({ body: "# Acme Plumbing\nPlumber on the Gold Coast." }),
  "http://acme.com.au/": res({ status: 301, ok: false, headers: { location: "https://acme.com.au/" } }),
});
test("a well built site scores high with no critical fixes", async () => {
  const r = await runScan("acme.com.au", { name: "Acme Plumbing", suburb: "Burleigh", industry: "plumber" }, { fetch: fake(goodPages()) });
  assert.equal(r.mode, "scan"); assert.ok((r.overall ?? 0) >= 90, String(r.overall));
  assert.equal(r.fixes.filter((f) => f.rating === "critical").length, 0);
  assert.equal(r.checksTotal, 19);
});
test("a poor site scores low with critical fixes, quick wins and GBP unable to verify", async () => {
  const pages = { ...goodPages(), "https://acme.com.au/": res({ body: BAD }), "https://acme.com.au/robots.txt": res({ body: "User-agent: GPTBot\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /\nUser-agent: PerplexityBot\nDisallow: /\nUser-agent: Google-Extended\nDisallow: /\nUser-agent: CCBot\nDisallow: /" }), "https://acme.com.au/sitemap.xml": res({ status: 404, ok: false }), "https://acme.com.au/llms.txt": res({ status: 404, ok: false }) };
  const r = await runScan("acme.com.au", {}, { fetch: fake(pages) });
  assert.ok((r.overall ?? 100) < 30, String(r.overall));
  const ids = r.fixes.filter((f) => f.rating === "critical").map((f) => f.id);
  for (const id of ["indexable", "ai_bots", "mobile", "title_meta"]) assert.ok(ids.includes(id), id);
  assert.ok(r.quickWins.some((q) => q.id === "ai_bots" || q.id === "indexable"));
  assert.ok(r.unverified.some((u) => u.id === "gbp"));
  assert.ok(r.fixes[0].rating === "critical" && r.fixes.at(-1)!.rating !== "critical");
  assert.equal(r.checksUsed, r.checksTotal - r.unverified.length);
});
test("unable to verify is left out of the score, not counted as a fail", async () => {
  const pages = { ...goodPages(), "https://acme.com.au/": res({ body: "<html><body><script>app()</script></body></html>" }) };
  const r = await runScan("acme.com.au", {}, { fetch: fake(pages) });
  assert.ok(r.unverified.length >= 8); assert.ok(r.unverified.some((u) => /JavaScript/.test(u.why)));
});
test("manual GBP entry can pass the check", async () => {
  const r = await runScan("acme.com.au", { name: "Acme Plumbing", suburb: "Burleigh", industry: "plumber", gbp: { rating: 4.9, reviews: 80, newestDaysAgo: 5 } }, { fetch: fake(goodPages()) });
  assert.ok(r.passed.some((p) => p.id === "gbp"));
});
test("no website: unreachable domain gives a scored result with a Critical 'Website not present/detected' fix pointing to the website build", async () => {
  const r = await runScan("nosuchbiz.com.au", { name: "X" }, { fetch: async () => res({ ok: false, status: 0, error: "dns" }) });
  assert.equal(r.mode, "no_website"); assert.equal(r.overall, 0);
  assert.equal(r.fixes.length, 1); assert.equal(r.fixes[0].rating, "critical"); assert.match(r.fixes[0].label, /Website not present/);
  assert.equal(r.fixes[0].offer, "build"); assert.equal(r.offer, "build");
  const d = noWebsiteReport({ id: "x", input: {} }); assert.equal(d.overall, 0); assert.equal(d.offer, "build");
});
test("a site that blocks us is not scored", async () => {
  const r = await runScan("acme.com.au", {}, { fetch: async (u) => res({ ok: false, status: u.includes("robots") ? 404 : 403 }) });
  assert.equal(r.mode, "blocked"); assert.equal(r.overall, null); assert.equal(r.fixes.length, 0);
});
test("scan only returns when URL is safe", async () => { await assert.rejects(runScan("http://169.254.169.254/", {}, { fetch: fake({}) }), ScanUrlError); });

test("PDF gets page 3 only when a scan exists, for scan and no-website cases", async () => {
  const quiz = scoreAnswers(Object.fromEntries(QUESTIONS.map((q) => [q.id, 1])));
  const none = await PDFDocument.load(await buildScorePdf({ result: quiz }));
  assert.equal(none.getPageCount(), 2);
  const scan = await runScan("acme.com.au", { name: "Acme" }, { fetch: fake({ ...goodPages(), "https://acme.com.au/": res({ body: BAD }) }) });
  const withScan = await PDFDocument.load(await buildScorePdf({ result: quiz, scan }));
  assert.equal(withScan.getPageCount(), 3);
  const ns = await PDFDocument.load(await buildScorePdf({ result: quiz, scan: noWebsiteReport({ id: "n", input: {} }) }));
  assert.equal(ns.getPageCount(), 3);
  if (process.env.SCAN_SAMPLE_DIR) {
    const fs = await import("node:fs");
    fs.mkdirSync(process.env.SCAN_SAMPLE_DIR, { recursive: true });
    fs.writeFileSync(`${process.env.SCAN_SAMPLE_DIR}/sample-scan.pdf`, await buildScorePdf({ result: quiz, scan }));
    fs.writeFileSync(`${process.env.SCAN_SAMPLE_DIR}/sample-nosite.pdf`, await buildScorePdf({ result: quiz, scan: noWebsiteReport({ id: "n", input: {} }) }));
  }
});
