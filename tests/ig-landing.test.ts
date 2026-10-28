/**
 * Instagram bio landing (/ig).
 * The form is exercised with a mock post. The handler dry-run deletes Resend and
 * the lead webhook first, and refuses any fetch to /api/leads, /api/site-factory/lead
 * or /api/cycle-repair/lead. Nothing here sends a real lead.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INSTAGRAM_OFFER, leadAlertCheck, leadFingerprint, sanitizeLead, type CleanLead } from "../lib/leads-guard";
import { buildInstagramLeadPayload, instagramLeadError, parseIgSiteCheck, submitInstagramLead, submitInstagramSiteCheck, utmFromSearch } from "../lib/ig-lead";
import { IG_SCORE_LINE, igCheckLimited, instagramRobotsBlock, runInstagramSiteCheck } from "../lib/ig-check";
import { signIgScore } from "../lib/ig-score-token";
import { runBlueprintSearchAudit, type Fetcher } from "../lib/blueprint/search-audit";
import { AREA_LABEL, SEARCH_LIMITS, type SearchArea } from "../lib/blueprint/search-rules";
import { ScanUrlError } from "../lib/site-scan/ssrf";
import type { FetchResult } from "../lib/site-scan/safe-fetch";
import { hidesAnnouncement, isFocusedFormPath } from "../lib/focused-paths";

const read = (path: string) => readFileSync(path, "utf8");

function clean(raw: unknown): CleanLead {
  const r = sanitizeLead(raw, false);
  assert.equal(r.ok, true);
  return (r as { ok: true; lead: CleanLead }).lead;
}

const sample = {
  name: "Sam",
  business: "Sam's Plumbing",
  website: "samsplumbing.com.au",
  email: "sam@example.com",
  phone: "0400 000 000",
  problem: "Missed calls",
  search: "?utm_source=instagram&utm_medium=bio&utm_campaign=site-check&utm_content=link&utm_term=site",
};

test("payload tags source and offer and keeps UTM from the landing URL", () => {
  const body = buildInstagramLeadPayload(sample);
  assert.equal(body.source, "instagram");
  assert.equal(body.offer, INSTAGRAM_OFFER);
  assert.equal(body.page, "/ig");
  assert.deepEqual(body.utm, {
    source: "instagram",
    medium: "bio",
    campaign: "site-check",
    content: "link",
    term: "site",
  });
  assert.equal(utmFromSearch("?utm_campaign=a@b.com").campaign, undefined);
  assert.deepEqual(utmFromSearch(""), {});
});

test("client validation blocks a send when the website or email is missing", async () => {
  let called = false;
  const post = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  const missing = await submitInstagramLead({ ...sample, website: "not a site" }, post);
  assert.equal(missing.ok, false);
  assert.equal(called, false);
  assert.match(instagramLeadError({ ...sample, email: "nope" }) ?? "", /email/i);
});

test("submit uses a mock post to /api/leads and does not touch other lead routes", async () => {
  let url = "";
  let method = "";
  let body: Record<string, unknown> = {};
  const result = await submitInstagramLead(sample, async (u, init) => {
    url = u;
    method = init?.method ?? "";
    body = JSON.parse(String(init?.body));
    assert.ok(!/site-factory\/lead|cycle-repair\/lead/.test(u));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  assert.equal(result.ok, true);
  assert.equal(method, "POST");
  assert.equal(url, "/api/leads");
  assert.equal(body.source, "instagram");
  assert.equal(body.offer, "free-site-check");
  assert.equal(body.website, "samsplumbing.com.au");
});

test("sanitizeLead accepts instagram, forces the offer, and escapes visitor text", () => {
  const lead = clean({
    source: "instagram",
    offer: "something-else",
    name: "<b>Sam</b>",
    business: "Acme & Co",
    website: "acme.com.au",
    email: "Sam@Example.com",
    phone: "07 5555 0100",
    problem: "<script>alert(1)</script>",
    utm: { source: "instagram", medium: "bio", campaign: "drop@me.com", extra: "nope", content: "link" },
  });
  assert.equal(lead.source, "instagram");
  assert.equal(lead.offer, "free-site-check");
  assert.equal(lead.email, "sam@example.com");
  assert.equal(lead.website, "https://acme.com.au/");
  assert.equal(lead.name, "&lt;b&gt;Sam&lt;/b&gt;");
  assert.equal(lead.problem, "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(lead.business, "Acme &amp; Co");
  const utm = lead.utm as Record<string, string>;
  assert.equal(utm.source, "instagram");
  assert.equal(utm.medium, "bio");
  assert.equal(utm.content, "link");
  assert.equal(utm.campaign, undefined);
  assert.equal("extra" in utm, false);

  const other = clean({ source: "calculator_page", email: "a@b.co", website: "https://x.com", offer: "free-site-check", utm: { source: "ig" } });
  assert.equal(other.offer, undefined);
  assert.equal(other.website, undefined);
  assert.equal(other.utm, undefined);
});

test("instagram leads need name, business, website and email", () => {
  assert.deepEqual(leadAlertCheck(clean({ source: "instagram", email: "a@b.co" })), { ok: false, error: "Name required" });
  assert.equal(leadAlertCheck(clean({ source: "instagram", email: "a@b.co", name: "Sam" })).ok, false);
  assert.equal(leadAlertCheck(clean({ source: "instagram", email: "a@b.co", name: "Sam", business: "Acme", website: "not a host" })).ok, false);
  const ok = clean({ source: "instagram", email: "a@b.co", name: "Sam", business: "Acme", website: "https://acme.com.au/work" });
  assert.equal(leadAlertCheck(ok).ok, true);
  assert.equal(ok.website, "https://acme.com.au/work");
  const again = clean({ source: "instagram", email: "a@b.co", name: "Sam", business: "Acme", website: "acme.com.au", problem: "other" });
  assert.equal(leadFingerprint(ok), leadFingerprint(again));
});

test("page is noindex, uses Shane's photo, and does not invent a second sender", () => {
  const page = read("app/ig/page.tsx");
  const form = read("app/ig/IgForm.tsx");
  const guard = read("lib/leads-guard.ts");
  const route = read("app/api/leads/route.ts");
  const headers = read("next.config.ts");
  const sitemap = read("app/sitemap.ts");
  const robots = read("app/robots.ts");

  assert.match(page, /index:\s*false/);
  assert.match(page, /follow:\s*false/);
  assert.match(page, /canonical:\s*PATH/);
  assert.match(headers, /"\/ig"/);
  assert.ok(!sitemap.includes("/ig"));
  assert.ok(!robots.includes("/ig"));
  assert.match(page, /\/shane-goldberg\.png/);
  assert.match(page, /Ink FX Printing/);
  assert.match(page, /Free instant site check: see what&apos;s costing you leads/);
  assert.match(page, /href="\/ai-receptionist-gold-coast"/);
  assert.match(page, /href="\/websites"/);
  assert.match(page, /href="\/blueprint"/);
  assert.doesNotMatch(page, /video|5-minute|2 business days|PLACEHOLDER/i);
  assert.doesNotMatch(form, /video|5-minute|2 business days/i);
  assert.ok(form.indexOf('id="ig-website"') < form.indexOf('id="ig-name"'));
  assert.match(form, /Check my site/);
  assert.match(form, /See the Blueprint audit/);
  assert.ok(!form.includes("foldNote"));
  assert.doesNotMatch(form, /headless|medium confidence/i);
  assert.ok(!page.includes("testimonial"));
  assert.ok(!page.includes("/api/leads"));
  assert.ok(!form.includes("/api/site-factory/lead"));
  assert.ok(!form.includes("/api/cycle-repair/lead"));
  assert.ok(!form.includes("/api/leads"));
  assert.match(form, /submitInstagramSiteCheck/);
  assert.ok(!form.includes("fetch("));
  assert.match(guard, /"instagram"/);
  assert.equal(route.split("new Resend(").length - 1, 1);
  const emailFn = route.slice(route.indexOf("function buildInstagramOperatorEmail"), route.indexOf("export async function POST"));
  assert.match(emailFn, /Instant site check/);
  assert.match(emailFn, /siteScore/);
  assert.match(emailFn, /checkSummary/);
  assert.doesNotMatch(emailFn, /5-minute|video|2 business/i);
  const checkRoute = read("app/api/ig/check/route.ts");
  const checkLib = read("lib/ig-check.ts");
  assert.match(read("proxy.ts"), /\/api\/ig\/check/);
  assert.match(checkRoute, /igCheckLimited/);
  assert.match(checkRoute, /runInstagramSiteCheck/);
  assert.match(checkRoute, /signIgScore/);
  assert.doesNotMatch(checkRoute, /Resend|\/api\/leads/);
  assert.doesNotMatch(checkLib, /method:\s*["']POST["']/);
  assert.match(read("lib/site-scan/safe-fetch.ts"), /method:\s*"GET"/);
  const ig = route.indexOf("} else if (isInstagram)");
  const nurture = route.indexOf("saveNurtureRecord({");
  assert.ok(ig > 0 && ig < nurture);
  const igBlock = route.slice(ig, route.indexOf("} else {", ig));
  assert.ok(!igBlock.includes("saveNurtureRecord"));
  assert.ok(!igBlock.includes("buildVisitorFollowUpEmail"));
  assert.match(igBlock, /buildInstagramOperatorEmail/);
});

test("sales chrome stays off /ig and on for unrelated paths", () => {
  assert.equal(isFocusedFormPath("/ig"), true);
  assert.equal(isFocusedFormPath("/ig/"), true);
  assert.equal(hidesAnnouncement("/ig"), true);
  assert.equal(hidesAnnouncement("/ig?utm_source=instagram"), true);
  assert.equal(isFocusedFormPath("/ignore"), false);
  assert.equal(hidesAnnouncement("/"), false);
});

test("dry-run: handler accepts one instagram lead and does not call a lead URL", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.LEAD_WEBHOOK_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const calls: string[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (/\/api\/(leads|site-factory\/lead|cycle-repair\/lead)/.test(url)) {
      throw new Error(`refusing ${url}`);
    }
    return orig(input, init);
  }) as typeof fetch;

  try {
    const { POST } = await import("../app/api/leads/route");
    const body = {
      source: "instagram",
      offer: "free-site-check",
      name: "Dry Run",
      business: "Example Co",
      website: "example.com.au",
      email: "ig-dry-run-290@example.com",
      problem: "Enquiries sit overnight",
      utm: { source: "instagram", medium: "bio", campaign: "site-check" },
    };
    const post = () => POST(new Request("http://x/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.29" },
      body: JSON.stringify(body),
    }));
    const first = await post();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { ok: true });
    const second = await post();
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { ok: true, deduped: true });
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = orig;
  }
});

test("operator email keeps a site score only when the HMAC matches", () => {
  const prev = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = "ig-score-test-secret";
  const base = { source: "instagram", name: "Sam", business: "Acme", website: "acme.com.au", email: "a@b.co" };
  try {
    const token = signIgScore("https://acme.com.au/", 72);
    assert.ok(token);
    const lead = clean({ ...base, siteScore: 100, scoreToken: token, checkSummary: "<b>Checked indexing</b>" });
    assert.equal(lead.siteScore, 72);
    assert.equal(lead.scoreToken, undefined);
    assert.equal(lead.checkSummary, "&lt;b&gt;Checked indexing&lt;/b&gt;");
    assert.equal(leadAlertCheck(lead).ok, true);

    const forged = clean({ ...base, siteScore: 100, checkSummary: "plain" });
    assert.equal(forged.siteScore, undefined);
    assert.equal(leadAlertCheck(forged).ok, true);

    const other = signIgScore("https://other.com.au/", 90);
    const mismatch = clean({ ...base, siteScore: 90, scoreToken: other });
    assert.equal(mismatch.siteScore, undefined);

    const stale = signIgScore("https://acme.com.au/", 50, Date.now() - 31 * 60 * 1000);
    assert.equal(clean({ ...base, siteScore: 50, scoreToken: stale }).siteScore, undefined);

    const zero = signIgScore("https://acme.com.au/", 0);
    assert.equal(clean({ ...base, siteScore: 40, scoreToken: zero }).siteScore, 0);

    const unread = signIgScore("https://acme.com.au/", null);
    assert.equal(clean({ ...base, siteScore: 99, scoreToken: unread }).siteScore, undefined);

    const calc = clean({ source: "calculator_page", email: "a@b.co", siteScore: 80, scoreToken: token, checkSummary: "nope" });
    assert.equal(calc.siteScore, undefined);
    assert.equal(calc.checkSummary, undefined);
  } finally {
    if (prev === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = prev;
  }
});

test("an unread score is dropped and a bad address does not post a lead", async () => {
  assert.equal(parseIgSiteCheck({ read: false, score: 90, summary: "blocked" })?.score, null);
  const calls: string[] = [];
  const blocked = await submitInstagramSiteCheck(sample, async (url, init) => {
    calls.push(`${init?.method} ${url}`);
    if (url !== "/api/ig/check") throw new Error(`unexpected ${url}`);
    return new Response(JSON.stringify({ error: "Only http and https addresses can be scanned." }), { status: 400 });
  });
  assert.equal(blocked.ok, false);
  assert.deepEqual(calls, ["POST /api/ig/check"]);

  calls.length = 0;
  const limited = await submitInstagramSiteCheck(sample, async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ error: "Too many checks" }), { status: 429 });
  });
  assert.equal(limited.ok, false);
  assert.deepEqual(calls, ["/api/ig/check"]);
});

test("a scored check posts one mocked lead and an unread check still does", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const post = async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url, body });
    assert.ok(!/\/api\/(leads$|site-factory\/lead|cycle-repair\/lead)/.test(`https://x${url}`) || url === "/api/leads");
    assert.ok(url === "/api/ig/check" || url === "/api/leads");
    if (url === "/api/ig/check") {
      return new Response(JSON.stringify({
        read: true,
        score: 64,
        fixes: [{ what: "Add a canonical link.", why: "Google may keep two copies." }],
        checked: ["Indexing", "Conversion"],
        pages: 1,
        summary: "Based on how Google, AI search and buyers see your site.",
        foldNote: null,
        token: "abcdefgh.ijklmnop",
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const scored = await submitInstagramSiteCheck(sample, post);
  assert.equal(scored.ok, true);
  if (!scored.ok) return;
  assert.equal(scored.saved, true);
  assert.equal(scored.check.score, 64);
  assert.equal(calls[1].url, "/api/leads");
  assert.equal(calls[1].body.siteScore, 64);
  assert.equal(calls[1].body.scoreToken, "abcdefgh.ijklmnop");
  assert.equal(calls[1].body.source, "instagram");
  assert.equal(calls[1].body.offer, "free-site-check");
  assert.match(String(calls[1].body.checkSummary), /Based on how Google, AI search and buyers see your site/);
  assert.match(String(calls[1].body.checkSummary), /Add a canonical link/);

  calls.length = 0;
  const unread = await submitInstagramSiteCheck(sample, async (url) => {
    calls.push({ url, body: {} });
    if (url === "/api/ig/check") {
      return new Response(JSON.stringify({
        read: false,
        score: null,
        fixes: [],
        checked: [],
        pages: 0,
        summary: "We couldn't read your site. Its robots.txt asks scanners to stay out, so no pages were opened and there is no score.",
        foldNote: null,
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  assert.equal(unread.ok, true);
  if (!unread.ok) return;
  assert.equal(unread.check.score, null);
  assert.equal(calls[1].url, "/api/leads");

  let lied = "";
  await submitInstagramSiteCheck(sample, async (url, init) => {
    if (url === "/api/leads") lied = String(init?.body);
    if (url === "/api/ig/check") {
      return new Response(JSON.stringify({ read: false, score: 99, summary: "We couldn't read your site." }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });
  const leadBody = JSON.parse(lied) as { siteScore?: number; checkSummary: string };
  assert.equal(leadBody.siteScore, undefined);
  assert.match(leadBody.checkSummary, /couldn't read your site/i);
});

const FIXTURE = `<!doctype html><html><head><title>Acme Plumbing Burleigh</title>
<link rel="canonical" href="https://acme.example/">
</head><body>
<header><a href="tel:0755551234">Call</a><a href="/hot-water">Hot water</a></header>
<h1>Acme Plumbing Burleigh</h1>
<p>We cover the Gold Coast, based in Burleigh. Call 07 5555 1234. Fully licensed and insured. Emergency same-day call-outs are available today. Prices start at a fixed call-out.</p>
</body></html>`;

function fixtureRes(body: string, status = 200, headers: Record<string, string> = {}): FetchResult {
  return { ok: status >= 200 && status < 300, status, url: "", headers, body, bytes: body.length, ms: 5 };
}

function fixtureFetch(pages: Record<string, FetchResult>): Fetcher {
  return async (url, o) => {
    const path = new URL(url).pathname;
    if (pages[path]) return pages[path];
    if (o?.follow === false) return fixtureRes("", 301, { location: "https://acme.example/" });
    return fixtureRes(FIXTURE);
  };
}

test("fixture crawl score matches the Blueprint audit and stays within the page cap", async () => {
  const calls: string[] = [];
  const fetchImpl: Fetcher = async (url, o) => {
    calls.push(url);
    return fixtureFetch({
      "/robots.txt": fixtureRes("User-agent: *\nAllow: /\n"),
      "/sitemap.xml": fixtureRes("<urlset><loc>https://acme.example/</loc></urlset>"),
      "/llms.txt": fixtureRes("", 404),
    })(url, o);
  };
  const check = await runInstagramSiteCheck({ url: "https://acme.example/", business: "Acme Plumbing", fetch: fetchImpl });
  const audit = await runBlueprintSearchAudit({
    url: "https://acme.example/",
    client: { name: "Acme Plumbing", overview: "Acme Plumbing" },
    fetch: fetchImpl,
  });
  assert.equal(audit.mode, "scored");
  assert.equal(typeof audit.overall, "number");
  assert.equal(check.score, audit.overall);
  assert.equal(check.read, true);
  assert.equal(check.summary, IG_SCORE_LINE);
  assert.equal(check.foldNote, null);
  assert.doesNotMatch(check.summary, /headless|medium confidence|\$\d/i);
  assert.ok(check.fixes.length <= 3);
  assert.ok(check.pages >= 1 && check.pages <= SEARCH_LIMITS.maxHtmlPages);
  for (const label of check.checked) {
    assert.ok(Object.values(AREA_LABEL).includes(label as (typeof AREA_LABEL)[SearchArea]));
  }
  assert.ok(calls.length > 1);
});

test("a robots disallow opens no HTML page", async () => {
  const calls: string[] = [];
  const fetchImpl: Fetcher = async (url) => {
    calls.push(url);
    if (!url.endsWith("/robots.txt")) throw new Error(`HTML fetch ${url}`);
    return fixtureRes("User-agent: *\nDisallow: /\n");
  };
  const check = await runInstagramSiteCheck({ url: "https://blocked.example/secret", fetch: fetchImpl });
  assert.equal(check.read, false);
  assert.equal(check.score, null);
  assert.equal(check.pages, 0);
  assert.match(check.summary, /couldn't read your site/i);
  assert.deepEqual(calls, ["https://blocked.example/robots.txt"]);
  assert.equal(instagramRobotsBlock("User-agent: SaabaiScanner\nDisallow: /secret\n", "/secret"), true);
  assert.equal(instagramRobotsBlock("User-agent: SaabaiScanner\nDisallow: /secret\n", "/"), false);
});

test("private and non-http addresses never call fetch", async () => {
  const bad = [
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://192.168.0.4/",
    "http://169.254.169.254/",
    "http://localhost/admin",
    "https://printer.internal/",
    "https://user:pass@acme.example/",
    "file:///etc/passwd",
    "http://0.0.0.0/",
  ];
  for (const url of bad) {
    let called = false;
    const fetchImpl: Fetcher = async () => {
      called = true;
      throw new Error("fetch");
    };
    await assert.rejects(() => runInstagramSiteCheck({ url, fetch: fetchImpl }), ScanUrlError);
    assert.equal(called, false, url);
  }
});

test("check route rejects a private address and rate limits before any crawl", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const { POST } = await import("../app/api/ig/check/route");
  const ip = "203.0.113.77";
  const send = () => POST(new Request("http://x/api/ig/check", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ url: "http://127.0.0.1/" }),
  }));
  for (let i = 0; i < 4; i++) assert.equal((await send()).status, 400);
  assert.equal((await send()).status, 429);
  assert.equal(await igCheckLimited(ip), true);
  assert.equal(await igCheckLimited("203.0.113.78"), false);
});

test("real public site is read with GET only", { timeout: 60_000 }, async () => {
  const check = await runInstagramSiteCheck({ url: "https://example.com", business: "Example" });
  assert.ok(check.summary.length > 20);
  assert.ok(check.fixes.length <= 3);
  assert.ok(check.pages <= SEARCH_LIMITS.maxHtmlPages);
  if (check.read) {
    assert.equal(typeof check.score, "number");
    assert.ok((check.score ?? -1) >= 0 && (check.score ?? 101) <= 100);
    assert.ok(check.pages >= 1);
    assert.equal(check.summary, IG_SCORE_LINE);
    assert.equal(check.foldNote, null);
    assert.doesNotMatch(check.summary, /headless|medium confidence/i);
  } else {
    assert.equal(check.score, null);
    assert.match(check.summary, /couldn't read your site/i);
  }
});
