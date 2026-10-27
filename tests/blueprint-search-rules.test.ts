/**
 * Blueprint search and conversion rules. No network. No invented prices or ratings.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAuditReportDocx } from "../lib/audit-report";
import { buildAssessmentPrompt } from "../lib/audit-assessment";
import { demoEngagement } from "../lib/audit-factfind-demo";
import {
  AI_SEARCH_CRAWLERS,
  AI_TRAINING_CRAWLERS,
  AREA_WEIGHTS,
  FOLD_NOTE,
  QUESTION_BANKS,
  SEARCH_LIMITS,
  agentsBlocked,
  classifyBusiness,
  evaluateSearch,
  firstScreenHtml,
  lastReviewed,
  visibleText,
  leakEstimate,
  pathBlockedByRobots,
  type CrawlSnapshot,
  type HostProbe,
  type HtmlPage,
  type SearchClientInput,
} from "../lib/blueprint/search-rules";
import { crawlForSearch, formatSearchAudit, runBlueprintSearchAudit, searchAuditForPrompt } from "../lib/blueprint/search-audit";
import type { FetchResult } from "../lib/site-scan/safe-fetch";

const EM = /\u2014/;

const probes = (mode: "consolidated" | "split"): HostProbe[] => [
  { url: "https://acme.com.au/", status: 200, location: null },
  { url: "https://www.acme.com.au/", status: mode === "split" ? 200 : 301, location: mode === "split" ? null : "https://acme.com.au/" },
  { url: "http://acme.com.au/", status: 301, location: "https://acme.com.au/" },
  { url: "http://www.acme.com.au/", status: 301, location: "https://acme.com.au/" },
];

const GOOD = `<!doctype html><html><head><title>Acme Plumbing Burleigh | Gold Coast plumber</title>
<link rel="canonical" href="https://acme.com.au/">
<script type="application/ld+json">{"@type":"Plumber","name":"Acme Plumbing","telephone":"0755551234","address":"1 Main St Burleigh"}</script>
</head><body>
<header>
<a href="tel:0755551234">Call</a>
<a href="/hot-water">Hot water</a>
<a href="/drains">Blocked drains</a>
<a href="/about">About</a>
<p>Rated 4.8 out of 5 on Google. Hot water from $120.</p>
<a href="https://maps.google.com/maps?q=acme">Google profile</a>
</header>
<h1>Acme Plumbing Burleigh</h1>
<h2>Service area</h2>
<p>We cover the Gold Coast and Brisbane, based in Burleigh, within 40 km.</p>
<p>Acme Plumbing repairs hot water systems and blocked drains for homes across the Gold Coast. Call 07 5555 1234 to book. Our prices start at a fixed call-out. We are fully licensed and insured with public liability cover. Emergency same-day call-outs are available today after hours. Most visits take about two hours and we explain the work before we start.</p>
</body></html>`;

const page = (url: string, html: string): HtmlPage => ({ url, status: 200, html });

function snap(over: Partial<CrawlSnapshot> = {}): CrawlSnapshot {
  return {
    requestedUrl: "https://acme.com.au/",
    finalUrl: "https://acme.com.au/",
    pages: [page("https://acme.com.au/", GOOD)],
    robots: { status: 200, body: "User-agent: *\nAllow: /\n" },
    sitemapStatus: 200,
    sitemapUrls: ["https://acme.com.au/", "https://acme.com.au/about"],
    llms: { status: 200, body: "# Acme Plumbing\nGold Coast plumber for hot water and blocked drains." },
    hostProbes: probes("consolidated"),
    capped: false,
    ...over,
  };
}

const client: SearchClientInput = { name: "Acme Plumbing", firmType: "other", industry: "plumber", location: "Burleigh" };
const id = (audit: ReturnType<typeof evaluateSearch>, check: string) => audit.checks.find((c) => c.id === check);

test("rules carry a review date and a single fold limitation", () => {
  assert.match(lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(SEARCH_LIMITS.lastReviewed, lastReviewed);
  assert.match(FOLD_NOTE, /headless browser/i);
  assert.ok(!EM.test(FOLD_NOTE));
  const src = readFileSync(new URL("../lib/blueprint/search-rules.ts", import.meta.url), "utf8");
  assert.equal(src.split("export const lastReviewed").length, 2);
});

test("question banks are industry lists of 15 to 20, and weighting follows the business", () => {
  for (const [bank, list] of Object.entries(QUESTION_BANKS)) {
    assert.ok(list.length >= 15 && list.length <= 20, bank);
    const ids = new Set(list.map((q) => q.id));
    assert.equal(ids.size, list.length, bank);
    for (const q of list) {
      assert.ok(q.phrases.length && q.topics.length && q.signals.length, q.id);
      assert.ok(!EM.test(q.text));
    }
  }
  assert.equal(classifyBusiness({ firmType: "law" }).kind, "professional");
  assert.equal(classifyBusiness({ firmType: "law" }).bank, "professional");
  assert.equal(classifyBusiness({ industry: "plumber", overview: "emergency plumber" }).bank, "local");
  assert.equal(classifyBusiness({ firmType: "real-estate" }).kind, "local-trade");
  assert.equal(classifyBusiness({ firmType: "real-estate" }).bank, "property");
  assert.equal(classifyBusiness({ firmType: "other", overview: "we sell shoes" }).kind, "general");
  const local = AREA_WEIGHTS["local-trade"];
  const pro = AREA_WEIGHTS.professional;
  assert.ok(local.conversion > local.questions && local.gbp > local.questions);
  assert.equal(pro.questions, pro["ai-search"]);
  assert.ok(pro.questions > pro.conversion);
});

test("robots helpers: search crawlers, training crawlers, and path allow rules", () => {
  const all = "User-agent: *\nDisallow: /\n";
  assert.equal(agentsBlocked(all, AI_SEARCH_CRAWLERS).length, AI_SEARCH_CRAWLERS.length);
  assert.equal(agentsBlocked("User-agent: *\nAllow: /\n", AI_SEARCH_CRAWLERS).length, 0);
  const one = "User-agent: GPTBot\nDisallow: /\nUser-agent: *\nAllow: /\n";
  assert.deepEqual(agentsBlocked(one, AI_TRAINING_CRAWLERS), ["GPTBot"]);
  assert.equal(agentsBlocked(one, AI_SEARCH_CRAWLERS).length, 0);
  assert.equal(pathBlockedByRobots("User-agent: *\nDisallow: /\n", "/about"), true);
  assert.equal(pathBlockedByRobots("User-agent: *\nDisallow: /\nAllow: /public\n", "/public"), false);
  assert.equal(pathBlockedByRobots("User-agent: *\nDisallow: /privacy\n", "/privacy-policy"), false);
  assert.equal(pathBlockedByRobots("User-agent: *\nDisallow: /privacy\n", "/privacy"), true);
});

test("a solid trade site: canonical, host, price, rating, and call are observed, not invented", () => {
  const audit = evaluateSearch(snap(), client);
  assert.equal(audit.mode, "scored");
  assert.equal(audit.businessKind, "local-trade");
  assert.equal(id(audit, "canonical")?.status, "pass");
  assert.equal(id(audit, "host")?.status, "pass");
  assert.equal(id(audit, "orphans")?.status, "pass");
  assert.equal(id(audit, "from_price")?.status, "pass");
  assert.match(id(audit, "from_price")?.what ?? "", /from \$120/i);
  assert.equal(id(audit, "rating_fold")?.status, "pass");
  assert.match(id(audit, "rating_fold")?.what ?? "", /4\.8/);
  assert.equal(id(audit, "cta_fold")?.status, "pass");
  assert.equal(id(audit, "gbp_link")?.status, "pass");
  assert.equal(id(audit, "llms_accurate")?.status, "pass");
  assert.equal(id(audit, "schema_match")?.status, "pass");
  assert.equal(id(audit, "service_pages")?.status, "pass");
  const areas = id(audit, "question_gap");
  assert.equal(areas?.bucket, "owner-decision");
  const clear = audit.questions.find((q) => q.id === "local-areas");
  assert.equal(clear?.result, "clear");
  assert.equal(clear?.page, "https://acme.com.au/");
  assert.ok(audit.questions.length >= 15);
  assert.ok(audit.overall !== null && audit.overall > 0 && audit.overall <= 100);
  for (const f of [...audit.quickWins, ...audit.ownerDecisions]) {
    assert.ok(f.what && f.why && f.effort);
    assert.ok(f.confidence === "high" || f.confidence === "medium" || f.confidence === "low");
    assert.ok(!EM.test(`${f.what} ${f.why} ${f.effort}`));
  }
});

test("http may redirect to https on the spare host, as long as that host then joins the main one", () => {
  const audit = evaluateSearch(snap({
    hostProbes: [
      { url: "https://acme.com.au/", status: 308, location: "https://www.acme.com.au/" },
      { url: "https://www.acme.com.au/", status: 200, location: null },
      { url: "http://acme.com.au/", status: 308, location: "https://acme.com.au/" },
      { url: "http://www.acme.com.au/", status: 308, location: "https://www.acme.com.au/" },
    ],
  }), client);
  assert.equal(id(audit, "host")?.status, "pass");
});

test("indexing failures: orphan, utility, thin placeholder, missing canonical, split host", () => {
  const privacy = `<!doctype html><html><head><title>Privacy</title></head><body><p>Privacy policy.</p></body></html>`;
  const soon = `<!doctype html><html><head><title>Offer</title></head><body><p>Coming soon.</p></body></html>`;
  const home = GOOD.replace(/<link rel="canonical"[^>]*>/, "");
  const audit = evaluateSearch(snap({
    pages: [
      page("https://acme.com.au/", home),
      page("https://acme.com.au/privacy", privacy),
      page("https://acme.com.au/specials", soon),
    ],
    sitemapUrls: ["https://acme.com.au/", "https://acme.com.au/about", "https://acme.com.au/orphan"],
    hostProbes: probes("split"),
    capped: true,
  }), client);
  assert.equal(id(audit, "canonical")?.status, "fail");
  assert.equal(id(audit, "canonical")?.bucket, "quick-win");
  assert.equal(id(audit, "host")?.status, "fail");
  assert.match(id(audit, "orphans")?.what ?? "", /\/orphan/);
  assert.equal(id(audit, "orphans")?.confidence, "medium");
  assert.equal(id(audit, "utility_indexable")?.status, "fail");
  assert.equal(id(audit, "utility_indexable")?.bucket, "quick-win");
  assert.match(id(audit, "thin_indexable")?.what ?? "", /specials/);
  assert.equal(id(audit, "thin_indexable")?.bucket, "quick-win");
});

test("AI crawlers, llms.txt, and JSON-LD that disagrees with the page", () => {
  const html = GOOD.replace(
    "</head>",
    `<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Do you travel to Perth?"}]}</script></head>`
  ).replace(
    `"telephone":"0755551234"`,
    `"telephone":"0755551234","offers":{"@type":"Offer","price":"999"}`
  );
  const robots = [
    "User-agent: OAI-SearchBot", "Disallow: /",
    "User-agent: ChatGPT-User", "Disallow: /",
    "User-agent: ClaudeBot", "Disallow: /",
    "User-agent: Claude-SearchBot", "Disallow: /",
    "User-agent: PerplexityBot", "Disallow: /",
    "User-agent: Perplexity-User", "Disallow: /",
    "User-agent: GPTBot", "Disallow: /",
    "User-agent: *", "Allow: /",
  ].join("\n");
  const audit = evaluateSearch(snap({
    pages: [page("https://acme.com.au/", html)],
    robots: { status: 200, body: robots },
    llms: { status: 404, body: "" },
  }), { ...client, services: ["solar"] });
  assert.equal(id(audit, "ai_search_crawlers")?.status, "fail");
  assert.equal(id(audit, "ai_search_crawlers")?.bucket, "owner-decision");
  assert.equal(id(audit, "ai_training_crawlers")?.status, "partial");
  assert.equal(id(audit, "llms_present")?.status, "fail");
  assert.equal(id(audit, "llms_present")?.bucket, "quick-win");
  assert.match(id(audit, "schema_match")?.what ?? "", /999/);
  assert.match(id(audit, "schema_match")?.what ?? "", /Perth/);
  assert.doesNotMatch(id(audit, "schema_match")?.what ?? "", /\$999/);
});

test("no price and no rating means no invented number, unless the client supplied one", () => {
  const bare = `<!doctype html><html><head><title>Acme Law</title><link rel="canonical" href="https://acme.com.au/"></head><body><h1>Acme Law</h1><p>${"Advice for local businesses. ".repeat(20)}</p></body></html>`;
  const audit = evaluateSearch(snap({
    pages: [page("https://acme.com.au/", bare)],
    llms: { status: 404, body: "" },
  }), { name: "Acme Law", firmType: "law" });
  assert.equal(audit.businessKind, "professional");
  assert.equal(audit.questionBank, "professional");
  const blob = JSON.stringify(audit.checks.filter((c) => c.id !== "schema_match"));
  assert.equal(id(audit, "from_price")?.status, "fail");
  assert.equal(id(audit, "rating_fold")?.status, "fail");
  assert.doesNotMatch(id(audit, "from_price")?.what ?? "", /\$\d/);
  assert.doesNotMatch(id(audit, "rating_fold")?.what ?? "", /\d\.\d/);
  assert.match(audit.leak.headline, /Needs client data/);
  assert.equal(audit.leak.monthlyAud, undefined);
  assert.doesNotMatch(blob, /\$\d/);
  const told = evaluateSearch(snap({ pages: [page("https://acme.com.au/", bare)] }), {
    name: "Acme Law", firmType: "law", statedGoogleRating: 4.9, statedGoogleReviews: 12,
  });
  assert.match(id(told, "rating_fold")?.what ?? "", /You told us your Google rating is 4\.9/);
  assert.match(id(told, "rating_fold")?.what ?? "", /have not guessed|not visible/i);
  assert.match(id(told, "gbp_link")?.what ?? "", /did not look it up/i);
});

test("leak dollars use only client figures", () => {
  const none = leakEstimate(undefined, true);
  assert.equal(none.headline, "Needs client data");
  assert.equal(none.monthlyAud, undefined);
  const bad = leakEstimate({ missedEnquiriesPerMonth: 10, closeRate: 150, averageJobAud: 200 }, true);
  assert.equal(bad.monthlyAud, undefined);
  const ok = leakEstimate({ missedEnquiriesPerMonth: 10, closeRate: 50, averageJobAud: 200 }, true);
  assert.equal(ok.monthlyAud, 1000);
  assert.match(ok.detail, /10 enquiries/);
  assert.match(ok.detail, /\$200/);
  assert.match(ok.detail, /not a forecast/);
  const fraction = leakEstimate({ missedEnquiriesPerMonth: 10, closeRate: 0.5, averageJobAud: 200 }, true);
  assert.equal(fraction.monthlyAud, 1000);
});

test("first screen is the header plus the first slice of text, not a phone render", () => {
  const late = `<!doctype html><html><body>${"word ".repeat(800)}<a href="tel:0755551234">Call</a><p>from $90</p></body></html>`;
  const early = `<!doctype html><html><body><header><a href="tel:0755551234">Call now</a></header><p>${"word ".repeat(800)}</p></body></html>`;
  const lateAudit = evaluateSearch(snap({ pages: [page("https://acme.com.au/", late)] }), client);
  const earlyAudit = evaluateSearch(snap({ pages: [page("https://acme.com.au/", early)] }), client);
  assert.equal(id(lateAudit, "cta_fold")?.status, "fail");
  assert.equal(id(earlyAudit, "cta_fold")?.status, "pass");
  assert.equal(id(lateAudit, "from_price")?.status, "partial");
  assert.match(id(lateAudit, "from_price")?.what ?? "", /\$90/);
  assert.match(id(lateAudit, "from_price")?.what ?? "", /not in the first screen/);
  assert.match(firstScreenHtml(early), /tel:/);
  assert.equal(id(lateAudit, "cta_fold")?.confidence, "medium");
  const cut = `<!doctype html><html><body>${"word ".repeat(138)}from $2,000 for the job</body></html>`;
  const screen = visibleText(firstScreenHtml(cut));
  assert.doesNotMatch(screen, /\$2,0(?!00)/);
  assert.ok(screen.includes("from $2,000") || !screen.includes("$"));
});

test("a javascript shell is not scored as if every question were missing", () => {
  const shell = `<!doctype html><html><head><script>start()</script></head><body><div id="root"></div></body></html>`;
  const audit = evaluateSearch(snap({ pages: [page("https://acme.com.au/", shell)] }), client);
  assert.equal(audit.questionScore, null);
  assert.equal(audit.questions.length, 0);
  assert.equal(id(audit, "questions_shell")?.status, "unknown");
  assert.equal(audit.areas.questions, null);
  assert.ok(!audit.ownerDecisions.some((c) => c.id === "question_gap"));
});

test("promise text is not invented when the client did not supply one", () => {
  const html = `<!doctype html><html><head><title>Different offer entirely here</title><link rel="canonical" href="https://acme.com.au/"></head><body><h1>Acme Plumbing Burleigh</h1><p>${"Real work for homes. ".repeat(20)}</p></body></html>`;
  const audit = evaluateSearch(snap({ pages: [page("https://acme.com.au/", html)] }), client);
  assert.equal(id(audit, "promise")?.bucket, "owner-decision");
  assert.match(id(audit, "promise")?.what ?? "", /No promise was supplied/);
  assert.match(id(audit, "promise")?.what ?? "", /Acme Plumbing Burleigh/);
  const withPromise = evaluateSearch(snap(), { ...client, promise: "same day solar installation" });
  assert.match(id(withPromise, "promise")?.what ?? "", /does not appear|part of the promise/i);
});

test("service list from the client, and a missing page is an owner decision", () => {
  const audit = evaluateSearch(snap(), { ...client, services: ["Hot water", "Roof repairs"] });
  assert.equal(id(audit, "service_pages")?.status, "fail");
  assert.match(id(audit, "service_pages")?.what ?? "", /Roof repairs/);
  assert.doesNotMatch(id(audit, "service_pages")?.what ?? "", /Hot water/);
  assert.equal(id(audit, "service_pages")?.bucket, "owner-decision");
});

test("report text and the docx list what, why, page, effort, and confidence", async () => {
  const audit = evaluateSearch(snap({
    sitemapUrls: ["https://acme.com.au/", "https://acme.com.au/orphan"],
  }), { ...client, figures: { missedEnquiriesPerMonth: 4, closeRate: 25, averageJobAud: 500 } });
  assert.equal(audit.leak.monthlyAud, 500);
  const text = formatSearchAudit(audit);
  assert.match(text, /SEARCH AND CONVERSION/);
  assert.match(text, /Quick wins/);
  assert.match(text, /Decisions only you can make/);
  assert.match(text, /What:/);
  assert.match(text, /Why it affects results:/);
  assert.match(text, /Effort:/);
  assert.match(text, /Confidence:/);
  assert.match(text, /Clear\.|Partial\.|Missing\./);
  assert.match(text, /\$500/);
  assert.match(text, /headless browser/i);
  assert.ok(!EM.test(text));
  const prompt = searchAuditForPrompt(audit);
  assert.match(prompt, /Do not invent/);
  assert.ok(prompt.length <= 4000);
  const eng = demoEngagement();
  eng.firmName = "Acme Plumbing";
  eng.website = "https://acme.com.au/";
  eng.assessment = { generatedAt: new Date().toISOString(), summary: "A short summary.", opportunities: [] };
  const buf = await buildAuditReportDocx(eng, audit);
  const { default: JSZip } = await import("jszip");
  const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
  assert.match(xml, /Search and conversion/);
  assert.match(xml, /What:/);
  assert.match(xml, /Why it affects results/);
  assert.ok(!EM.test(xml));
  const skipped = await buildAuditReportDocx(demoEngagement());
  const skippedXml = await (await JSZip.loadAsync(skipped)).file("word/document.xml")!.async("string");
  assert.match(skippedXml, /No website was recorded/);
  assert.ok(!EM.test(skippedXml));
});

test("assessment prompt keeps the search block factual", () => {
  const eng = demoEngagement();
  eng.responses = {
    firm_overview: { questionId: "firm_overview", value: "A plumbing firm", answeredAt: new Date().toISOString(), mode: "client" },
  };
  const block = "Overall 40 out of 100. Leak: Needs client data. No price was on the page.";
  const p = buildAssessmentPrompt(eng, block)!;
  assert.match(p, /SEARCH AND CONVERSION/);
  assert.match(p, /Needs client data/);
  assert.match(p, /Do not invent Google ratings/);
  assert.ok(!EM.test(p.slice(p.indexOf("\nTASK"))));
  const plain = buildAssessmentPrompt(eng)!;
  assert.ok(!/SEARCH AND CONVERSION/.test(plain));
});

test("crawl is GET-only and reports an orphan it actually saw", async () => {
  const calls: { url: string; follow?: boolean }[] = [];
  const fetchImpl = async (url: string, o?: { follow?: boolean }): Promise<FetchResult> => {
    calls.push({ url, follow: o?.follow });
    const u = new URL(url);
    if (u.pathname === "/robots.txt") return res("User-agent: *\nAllow: /\n");
    if (u.pathname === "/sitemap.xml") return res(`<urlset><loc>https://acme.com.au/</loc><loc>https://acme.com.au/orphan</loc></urlset>`);
    if (u.pathname === "/llms.txt") return res("", 404);
    if (u.protocol === "http:" || u.hostname.startsWith("www.")) return res("", 301, { location: "https://acme.com.au/" });
    if (u.pathname === "/orphan") return res(`<!doctype html><html><head><title>Orphan</title></head><body><p>${"Hidden page text. ".repeat(20)}</p></body></html>`);
    return res(GOOD);
  };
  const audit = await runBlueprintSearchAudit({ url: "https://acme.com.au/", client, fetch: fetchImpl });
  assert.ok(calls.length > 3);
  assert.ok(calls.some((c) => c.follow === false));
  assert.match(id(audit, "orphans")?.what ?? "", /orphan/);
  const src = readFileSync(new URL("../lib/blueprint/search-audit.ts", import.meta.url), "utf8");
  const fetchSrc = readFileSync(new URL("../lib/site-scan/safe-fetch.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /method:\s*["']POST["']/);
  assert.match(fetchSrc, /method:\s*"GET"/);
  const snapOnly = await crawlForSearch("https://acme.com.au/", fetchImpl);
  assert.ok(snapOnly.pages.length >= 1);
  assert.equal(snapOnly.error, undefined);
});

function res(body: string, status = 200, headers: Record<string, string> = {}): FetchResult {
  return { ok: status >= 200 && status < 300, status, url: "", headers, body, bytes: body.length, ms: 20 };
}
