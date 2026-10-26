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
import { buildInstagramLeadPayload, instagramLeadError, submitInstagramLead, utmFromSearch } from "../lib/ig-lead";
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
  assert.match(page, /Stop missing leads/);
  assert.match(page, /href="\/ai-receptionist-gold-coast"/);
  assert.match(page, /href="\/websites"/);
  assert.match(page, /href="\/blueprint"/);
  assert.match(page, /PLACEHOLDER for Shane to confirm: within 2 business days/);
  assert.match(page, /Within 2 business days/);
  assert.ok(!page.includes("testimonial"));
  assert.ok(!page.includes("/api/leads"));
  assert.ok(!form.includes("/api/site-factory/lead"));
  assert.ok(!form.includes("/api/cycle-repair/lead"));
  assert.match(form, /submitInstagramLead/);
  assert.ok(!form.includes("fetch("));
  assert.match(guard, /"instagram"/);
  assert.equal(route.split("new Resend(").length - 1, 1);
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
