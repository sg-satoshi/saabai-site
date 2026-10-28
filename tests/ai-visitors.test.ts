/**
 * Host mapping and snapshot summing for the AI visitors report.
 * Run: npx tsx --test tests/ai-visitors.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STATIC_DOMAIN_MAP } from "../lib/client-site-surface";
import {
  buildAnalyticsSites,
  companyForBot,
  isBingCrawler,
  isGoogleCrawler,
  referralBucket,
  siteKeyForRequest,
} from "../lib/ai-visitors/sites";
import { buildView, deltaPct, foldDay, sumSnapshots } from "../lib/ai-visitors/snapshot";
import type { AnalyticsSite, DaySnapshot, MetricRow } from "../lib/ai-visitors/types";

const sites: AnalyticsSite[] = buildAnalyticsSites({
  sites: [
    { slug: "tributum-law-v2", name: "Tributum Law", url: "https://www.saabai.ai/sites/tributum-law-v2" },
    { slug: "wholesale-homes", name: "Wholesale Homes Australia", url: "https://wholesalehomes.com.au", domains: ["wholesalehomes.com.au", "www.wholesalehomes.com.au"] },
    { slug: "cycle-repair", name: "Stu's Cycle Repairs", url: "https://stuscyclerepairs.com", domains: ["stuscyclerepairs.com"] },
    { slug: "custom-host", name: "Override Co", url: "https://old.example", domains: ["old.example"], analyticsHosts: ["override.example"] },
  ],
  domainMap: { "nicomoretti.au": "nico-moretti", "wholesalehomes.com.au": "wholesale-homes" },
  staticDomainMap: STATIC_DOMAIN_MAP,
});

function key(host: string, path = "/"): string | null {
  return siteKeyForRequest(host, path, sites);
}

test("custom domains, www and path-prefix sites map to the right client", () => {
  assert.equal(key("saabai.ai"), "saabai");
  assert.equal(key("www.saabai.ai", "/blueprint"), "saabai");
  assert.equal(key("WWW.WholesaleHomes.com.au", "/packages"), "wholesale-homes");
  assert.equal(key("stuscyclerepairs.com"), "cycle-repair");
  assert.equal(key("www.stuscyclerepairs.com", "/faq"), "cycle-repair");
  assert.equal(key("saabai.ai", "/sites/tributum-law-v2"), "tributum-law-v2");
  assert.equal(key("www.saabai.ai", "/sites/tributum-law-v2/about"), "tributum-law-v2");
  assert.equal(key("saabai.ai", "/sites/wholesale-homes"), "saabai");
  assert.equal(key("lifestylemoneymanagement.com.au"), "lmm-site");
  assert.equal(key("www.lifestylemoneymanagement.com.au", "/contact"), "lmm-site");
  assert.equal(key("nicomoretti.au"), "nico-moretti");
  assert.equal(key("www.nicomoretti.au"), "nico-moretti");
  assert.equal(key("override.example"), "custom-host");
  assert.equal(key("old.example"), null);
  assert.equal(key("saabai-site.vercel.app", "/"), null);
});

test("the first site keeps a shared host", () => {
  const mapped = buildAnalyticsSites({
    sites: [
      { slug: "one", name: "One", domains: ["shared.example"] },
      { slug: "two", name: "Two", domains: ["shared.example"] },
    ],
  });
  assert.equal(siteKeyForRequest("shared.example", "/", mapped), "one");
  assert.equal(mapped.find((site) => site.key === "two")?.hosts.includes("shared.example"), false);
});

test("ads.openai.com is not an AI referral, and Google mail is not search", () => {
  assert.equal(referralBucket("ads.openai.com"), null);
  assert.equal(referralBucket("www.ads.openai.com"), null);
  assert.equal(referralBucket("chatgpt.com"), "ai");
  assert.equal(referralBucket("www.chatgpt.com"), "ai");
  assert.equal(referralBucket("gemini.google.com"), "ai");
  assert.equal(referralBucket("www.google.com"), "google");
  assert.equal(referralBucket("com.google.android.googlequicksearchbox"), "google");
  assert.equal(referralBucket("mail.google.com"), null);
  assert.equal(referralBucket("biztools.corp.google.com"), null);
  assert.equal(referralBucket("bing.com"), "bing");
  assert.equal(referralBucket("www.bing.com"), "bing");
  assert.equal(isGoogleCrawler("Googlebot"), true);
  assert.equal(isGoogleCrawler("googleother"), true);
  assert.equal(isGoogleCrawler("ahrefsbot"), false);
  assert.equal(isBingCrawler("bingbot"), true);
  assert.equal(companyForBot("claudebot"), "Anthropic");
  assert.equal(companyForBot(""), "Other");
});

function row(partial: Omit<MetricRow, "value"> & { value?: number }): MetricRow {
  return { ...partial, value: partial.value ?? 1 };
}

test("path-prefix traffic is moved off saabai.ai and summed once", () => {
  const folded = foldDay("2026-10-20", sites, [
    {
      kind: "bots",
      rows: [
        row({ request_hostname: "saabai.ai", bot_name: "claudebot", bot_category: "ai_crawler", value: 100 }),
        row({ request_hostname: "wholesalehomes.com.au", bot_name: "gptbot", bot_category: "ai_crawler", value: 5 }),
        row({ request_hostname: "www.saabai.ai", bot_name: "googlebot", bot_category: "search_engine_crawler", value: 50 }),
        row({ request_hostname: "saabai.ai", bot_name: "googleother", bot_category: "search_engine_crawler", value: 12 }),
        row({ request_hostname: "saabai.ai", bot_name: "bingbot", bot_category: "search_engine_crawler", value: 4 }),
        row({ request_hostname: "saabai.ai", bot_name: "ahrefsbot", bot_category: "search_engine_optimization", value: 9 }),
      ],
    },
    {
      kind: "prefixBots",
      rows: [
        row({ request_path: "/sites/tributum-law-v2/robots.txt", bot_name: "claudebot", bot_category: "ai_crawler", value: 8 }),
      ],
    },
    {
      kind: "paths",
      rows: [
        row({ request_hostname: "saabai.ai", request_path: "/robots.txt", value: 40 }),
        row({ request_hostname: "saabai.ai", request_path: "/sites/tributum-law-v2/", value: 8 }),
        row({ request_hostname: "wholesalehomes.com.au", request_path: "/about", value: 3 }),
        row({ request_hostname: "saabai.ai", request_path: "/app.js", value: 9 }),
      ],
    },
    {
      kind: "referrals",
      rows: [
        row({ request_hostname: "saabai.ai", referrer_hostname: "chatgpt.com", value: 2 }),
        row({ request_hostname: "saabai.ai", referrer_hostname: "ads.openai.com", value: 5 }),
        row({ request_hostname: "saabai.ai", referrer_hostname: "www.google.com", value: 7 }),
        row({ request_hostname: "saabai.ai", referrer_hostname: "mail.google.com", value: 3 }),
        row({ request_hostname: "wholesalehomes.com.au", referrer_hostname: "bing.com", value: 1 }),
      ],
    },
    {
      kind: "prefixReferrals",
      rows: [row({ request_path: "/sites/tributum-law-v2", referrer_hostname: "www.google.com", value: 2 })],
    },
    {
      kind: "status",
      rows: [
        row({ request_hostname: "saabai.ai", http_status: "200", value: 90 }),
        row({ request_hostname: "saabai.ai", http_status: "404", value: 4 }),
      ],
    },
    {
      kind: "prefixStatus",
      rows: [
        row({ request_path: "/sites/tributum-law-v2/page", http_status: "200", value: 7 }),
        row({ request_path: "/sites/tributum-law-v2/missing", http_status: "404", value: 1 }),
      ],
    },
    {
      kind: "failing",
      rows: [
        row({ request_hostname: "saabai.ai", request_path: "/old", http_status: "404", value: 3 }),
        row({ request_hostname: "saabai.ai", request_path: "/sites/tributum-law-v2/missing", http_status: "404", value: 1 }),
      ],
    },
    {
      kind: "live",
      rows: [row({ request_hostname: "saabai.ai", request_path: "/", bot_name: "chatgpt-user", value: 2 })],
    },
  ]);

  assert.equal(folded.saabai.categories.ai_crawler, 92);
  assert.equal(folded["tributum-law-v2"].categories.ai_crawler, 8);
  assert.equal(folded["wholesale-homes"].categories.ai_crawler, 5);
  assert.equal(folded.saabai.googleCrawlers, 62);
  assert.equal(folded.saabai.bingCrawlers, 4);
  assert.equal(folded.saabai.referrals.ai, 2);
  assert.equal(folded.saabai.referrals.google, 5);
  assert.equal(folded["tributum-law-v2"].referrals.google, 2);
  assert.equal(folded["wholesale-homes"].referrals.bing, 1);
  assert.equal(folded.saabai.errors.ok, 83);
  assert.equal(folded.saabai.errors.s4xx, 3);
  assert.equal(folded["tributum-law-v2"].errors.ok, 7);
  assert.equal(folded["tributum-law-v2"].errors.s4xx, 1);
  assert.deepEqual(folded.saabai.paths.map((path) => path.path), ["/robots.txt"]);
  assert.equal(folded["tributum-law-v2"].paths[0]?.path, "/sites/tributum-law-v2/");
  assert.equal(folded["wholesale-homes"].paths[0]?.path, "/about");
  assert.equal(folded.saabai.errors.failing[0]?.path, "/old");
  assert.equal(folded["tributum-law-v2"].errors.failing[0]?.path, "/sites/tributum-law-v2/missing");
  assert.equal(folded.saabai.live[0]?.bot, "chatgpt-user");
  assert.equal(folded.saabai.live[0]?.count, 2);
});

test("summing snapshots adds requests and rolls bots into companies", () => {
  const day = (date: string, crawlers: number): DaySnapshot => ({
    date,
    categories: { ai_crawler: crawlers, ai_assistant: 1 },
    bots: [
      { name: "claudebot", count: 842, category: "ai_crawler" },
      { name: "claude-user", count: 2, category: "ai_assistant" },
      { name: "gptbot", count: 177, category: "ai_crawler" },
      { name: "oai-searchbot", count: 315, category: "ai_assistant" },
      { name: "gpt-actions", count: 19, category: "ai_assistant" },
      { name: "chatgpt-user", count: 11, category: "ai_assistant" },
      { name: "amazonbot", count: 188, category: "ai_crawler" },
      { name: "meta-webindexer", count: 65, category: "ai_crawler" },
      { name: "meta-externalagent", count: 26, category: "ai_crawler" },
      { name: "shapbot", count: 59, category: "ai_crawler" },
      { name: "", count: 10, category: "ai_crawler" },
      { name: "applebot", count: 36, category: "ai_crawler" },
      { name: "perplexitybot", count: 21, category: "ai_assistant" },
      { name: "duckassistbot", count: 2, category: "ai_assistant" },
    ],
    googleCrawlers: 10,
    bingCrawlers: 1,
    paths: [{ path: "/robots.txt", count: 4 }, { path: "/", count: 1 }],
    referrals: { ai: 0, google: 3, bing: 1 },
    errors: { ok: 9, redirected: 0, s4xx: 1, s5xx: 0, failing: [{ path: "/missing", status: 404, count: 1 }] },
    live: [{ bot: "chatgpt-user", path: "/", count: 1 }],
  });
  const totals = sumSnapshots([day("2026-10-01", 10), day("2026-10-02", 15)]);
  assert.equal(totals.crawlers, 25);
  assert.equal(totals.assistants, 2);
  assert.equal(totals.googleCrawlers, 20);
  assert.equal(totals.bingCrawlers, 2);
  assert.equal(totals.referrals.google, 6);
  assert.equal(totals.bots.get("claudebot")?.count, 1684);
  assert.equal(totals.paths.get("/robots.txt"), 8);
  assert.equal(deltaPct(840, 553), 52);
  assert.equal(deltaPct(221, 149), 48);
  assert.equal(deltaPct(0, 0), 0);
  assert.equal(deltaPct(4, 0), null);

  const view = buildView({
    sites: [{ key: "saabai", label: "saabai.ai", hosts: ["saabai.ai"], pathPrefix: null }],
    snapshots: { saabai: [day("2026-10-01", 10)] },
    days: 1,
    today: "2026-10-01",
  });
  const report = view.reports.find((item) => item.key === "saabai");
  assert.ok(report);
  assert.equal(report.companies.find((company) => company.company === "Anthropic")?.total, 844);
  assert.equal(report.companies.find((company) => company.company === "OpenAI")?.total, 522);
  assert.equal(report.companies.find((company) => company.company === "Amazon")?.total, 188);
  assert.equal(report.companies.find((company) => company.company === "Meta")?.total, 91);
  assert.equal(report.companies.find((company) => company.company === "Other")?.total, 69);
  assert.match(report.headline, /AI read saabai\.ai/);
  assert.match(report.headline, /None of it has sent a visitor back yet/);
});

test("without an earlier snapshot, change compares the two halves", () => {
  const snap = (date: string, crawlers: number): DaySnapshot => ({
    date,
    categories: { ai_crawler: crawlers, ai_assistant: 0 },
    bots: [],
    googleCrawlers: 0,
    bingCrawlers: 0,
    paths: [],
    referrals: { ai: 0, google: 0, bing: 0 },
    errors: { ok: crawlers, redirected: 0, s4xx: 0, s5xx: 0, failing: [] },
    live: [],
  });
  const view = buildView({
    sites: [{ key: "saabai", label: "saabai.ai", hosts: ["saabai.ai"], pathPrefix: null }],
    snapshots: {
      saabai: [
        snap("2026-10-22", 10),
        snap("2026-10-23", 10),
        snap("2026-10-24", 20),
        snap("2026-10-25", 20),
      ],
    },
    days: 4,
    today: "2026-10-25",
  });
  const report = view.reports.find((item) => item.key === "saabai");
  assert.equal(view.compare, "halves");
  assert.equal(report?.crawlers, 60);
  assert.equal(report?.crawlerDelta, 100);
  assert.match(report?.headline ?? "", /rising/);
});
