/**
 * Marketing analytics: GA4 + Meta pixel + Conversions API.
 * Never posts to /api/leads or /api/site-factory/lead.
 *   npx tsx --test tests/marketing-analytics.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { hashEmail, hashPhone, normalizeEmail, normalizePhone, sha256 } from "../lib/marketing/hash";
import { purchaseEventFromSession } from "../lib/marketing/purchase";
import { buildCapiBody, sendCapiEvent } from "../lib/marketing/capi";
import { reportCheckoutPurchase } from "../lib/marketing/report-purchase";
import { calendlyClickAction, calendlyPopupUrl } from "../lib/marketing/calendly";
import { GA_ID } from "../lib/ga";
import {
  contactInText,
  fbcValue,
  ga4MeasurementId,
  isCalendlyScheduledMessage,
  marketingHostMode,
  marketingPathAllowed,
  metaPixelId,
  viewContentFor,
} from "../lib/marketing/public";

const ROOT = process.cwd();
const LEAD_ENDPOINT = /\/api\/leads\b|\/api\/site-factory\/lead/;

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test("email and phone are normalised and hashed with SHA-256", () => {
  assert.equal(normalizeEmail("  Test@Example.com "), "test@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(hashEmail("Test@Example.com"), sha256("test@example.com"));
  assert.equal(hashEmail("Test@Example.com"), "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
  assert.equal(createHash("sha256").update("test@example.com").digest("hex"), hashEmail("Test@Example.com"));

  assert.equal(normalizePhone("0412 345 678"), "61412345678");
  assert.equal(normalizePhone("+61 412 345 678"), "61412345678");
  assert.equal(normalizePhone("+61 (0) 412 345 678"), "61412345678");
  assert.equal(normalizePhone("07 3123 4567"), "61731234567");
  assert.equal(hashPhone("0412 345 678"), "222e24d90b23ba2af558a2891bfa399f19a7eb9f33df34a7d6809b97c5a97246");
  assert.equal(normalizePhone("12"), null);
});

test("GA4 events use the existing property; the pixel no-ops until its id is valid", () => {
  const prevGa = process.env.NEXT_PUBLIC_GA4_ID;
  const prevPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.NEXT_PUBLIC_GA4_ID;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  assert.equal(ga4MeasurementId(), GA_ID);
  assert.equal(metaPixelId(), "");
  process.env.NEXT_PUBLIC_GA4_ID = "not-a-ga-id";
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "pixel";
  assert.equal(ga4MeasurementId(), GA_ID);
  assert.equal(metaPixelId(), "");
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1234";
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789012345";
  assert.equal(ga4MeasurementId(), GA_ID);
  assert.equal(metaPixelId(), "123456789012345");
  process.env.NEXT_PUBLIC_GA4_ID = GA_ID;
  assert.equal(ga4MeasurementId(), GA_ID);
  if (prevGa === undefined) delete process.env.NEXT_PUBLIC_GA4_ID;
  else process.env.NEXT_PUBLIC_GA4_ID = prevGa;
  if (prevPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  else process.env.NEXT_PUBLIC_META_PIXEL_ID = prevPixel;
});

test("tracking stays off client sites, the portal and admin", () => {
  assert.equal(marketingHostMode("www.saabai.ai"), "prod");
  assert.equal(marketingHostMode("saabai.ai"), "prod");
  assert.equal(marketingHostMode("saabai-site-git-x-shanegoldbergs-projects.vercel.app"), "preview");
  for (const host of ["stuscyclerepairs.com", "www.boconsulting.com.au", "wholesalehomes.com.au", "localhost", "client.saabai.ai"]) {
    assert.equal(marketingHostMode(host), null, host);
  }
  for (const path of ["/client-portal", "/client-portal/requests", "/saabai-admin", "/saabai-admin/orders", "/admin", "/dashboard", "/lex", "/sites/cycle-repair", "/login"]) {
    assert.equal(marketingPathAllowed(path), false, path);
  }
  for (const path of ["/", "/websites", "/blueprint", "/legal", "/privacy", "/pay/done"]) {
    assert.equal(marketingPathAllowed(path), true, path);
  }
});

test("ViewContent is the pricing, tier and demo pages", () => {
  assert.equal(viewContentFor("/websites")?.contentName, "Website care plans");
  assert.equal(viewContentFor("/services")?.contentCategory, "pricing");
  assert.equal(viewContentFor("/blueprint")?.contentName, "Saabai Blueprint");
  assert.equal(viewContentFor("/blueprint/checkout", "?tier=pro")?.value, 1497);
  assert.deepEqual(viewContentFor("/blueprint/checkout", "?tier=starter")?.contentIds, ["blueprint_starter"]);
  assert.equal(viewContentFor("/legal")?.contentCategory, "demo");
  assert.equal(viewContentFor("/ai-chatbot-law-firms")?.contentName, "Law firm chatbot demo");
  assert.equal(viewContentFor("/"), null);
  assert.equal(viewContentFor("/blueprint/confirmation"), null);
  assert.equal(viewContentFor("/client-portal"), null);
  assert.equal(viewContentFor("/privacy"), null);
});

test("contact details are found in Lex and Lachie text, and Calendly completion is recognised", () => {
  assert.deepEqual(contactInText("Please email me at Sam@Firm.com.au"), { email: "Sam@Firm.com.au" });
  assert.equal(contactInText("call me on 0412 345 678").phone, "0412 345 678");
  assert.deepEqual(contactInText("The Presence plan is $2,000"), {});
  assert.equal(isCalendlyScheduledMessage("https://calendly.com", { event: "calendly.event_scheduled" }), true);
  assert.equal(isCalendlyScheduledMessage("https://evil.example", { event: "calendly.event_scheduled" }), false);
  assert.equal(isCalendlyScheduledMessage("https://calendly.com", { event: "calendly.event_type_viewed" }), false);
  assert.equal(fbcValue(undefined, "?fbclid=abc123", 1700000000000), "fb.1.1700000000000.abc123");
  assert.equal(fbcValue("fb.1.1.existing", "?fbclid=abc"), "fb.1.1.existing");

  assert.equal(calendlyPopupUrl("https://calendly.com/shanegoldberg/30min"), "https://calendly.com/shanegoldberg/30min");
  assert.equal(
    calendlyPopupUrl("https://calendly.com/shanegoldberg/30min?utm_source=mia"),
    "https://calendly.com/shanegoldberg/30min?utm_source=mia",
  );
  assert.equal(calendlyPopupUrl("https://evil.example/shanegoldberg/30min"), null);
  assert.equal(calendlyPopupUrl("http://calendly.com/shanegoldberg/30min"), null);
  const click = { href: "https://calendly.com/shanegoldberg/30min", button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  assert.equal(calendlyClickAction({ ...click, widgetReady: true, widgetFailed: false }), "popup");
  assert.equal(calendlyClickAction({ ...click, widgetReady: false, widgetFailed: false }), "wait");
  assert.equal(calendlyClickAction({ ...click, widgetReady: false, widgetFailed: true }), "native");
  assert.equal(calendlyClickAction({ ...click, metaKey: true, widgetReady: true, widgetFailed: false }), "native");
});

test("Purchase is Blueprint and website payments, in AUD, with a stable event id", () => {
  const blueprint = purchaseEventFromSession({
    id: "cs_test_blueprint1",
    payment_status: "paid",
    amount_total: 49700,
    currency: "aud",
    customer_details: { email: "Sam@Firm.com.au", phone: "0412 345 678" },
    metadata: { product: "blueprint", tier: "starter" },
  });
  assert.equal(blueprint?.value, 497);
  assert.equal(blueprint?.currency, "AUD");
  assert.equal(blueprint?.eventId, "purchase_cs_test_blueprint1");
  assert.equal(blueprint?.contentCategory, "blueprint");
  assert.equal(blueprint?.email, "Sam@Firm.com.au");

  const website = purchaseEventFromSession({
    id: "cs_test_care1",
    payment_status: "paid",
    amount_total: 15000,
    currency: "aud",
    customer_email: "jess@business.com.au",
    metadata: { source: "saabai-billing", kind: "setup", planId: "growth" },
  });
  assert.equal(website?.value, 150);
  assert.equal(website?.contentName, "Website care plan");
  assert.deepEqual(website?.contentIds, ["growth"]);

  assert.equal(purchaseEventFromSession({
    id: "cs_test_lex",
    payment_status: "paid",
    amount_total: 150000,
    currency: "aud",
    metadata: { product: "lex" },
  }), null);
  assert.equal(purchaseEventFromSession({
    id: "cs_test_unpaid",
    payment_status: "unpaid",
    amount_total: 49700,
    currency: "aud",
    metadata: { product: "blueprint", tier: "starter" },
  }), null);
  assert.equal(purchaseEventFromSession({
    id: "cs_test_usd",
    payment_status: "paid",
    amount_total: 49700,
    currency: "usd",
    metadata: { product: "blueprint", tier: "starter" },
  }), null);
});

test("Conversions API no-ops without env, and hashes user data when configured", async () => {
  const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
  const prevPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const prevCode = process.env.META_CAPI_TEST_EVENT_CODE;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.META_CAPI_TEST_EVENT_CODE;

  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error("fetch should not run");
  };
  const skipped = await sendCapiEvent({
    eventName: "Lead",
    eventId: "11111111-1111-1111-1111-111111111111",
    email: "sam@firm.com.au",
  }, { fetch: fetchImpl });
  assert.equal(skipped.sent, false);
  assert.equal(calls, 0);

  const sent = await reportCheckoutPurchase({
    id: "cs_test_blueprint1",
    payment_status: "paid",
    amount_total: 49700,
    currency: "aud",
    metadata: { product: "blueprint", tier: "starter" },
  });
  assert.equal(sent.sent, false);
  assert.equal(calls, 0);

  let url = "";
  let payload = "";
  const ok = await sendCapiEvent({
    eventName: "Purchase",
    eventId: "purchase_cs_test_blueprint1",
    email: "Sam@Firm.com.au",
    phone: "0412 345 678",
    fbp: "fb.1.1700000000000.browser",
    fbc: "fb.1.1700000000000.click",
    clientIp: "203.0.113.8",
    userAgent: "Mozilla/5.0",
    value: 497,
    currency: "AUD",
    contentName: "Saabai Blueprint starter",
    contentIds: ["blueprint_starter"],
  }, {
    fetch: async (input, init) => {
      url = String(input);
      payload = String(init?.body);
      if (LEAD_ENDPOINT.test(url)) throw new Error("tests must never post to lead endpoints");
      return new Response("{}", { status: 200 });
    },
    pixelId: "123456789012345",
    accessToken: "test-token",
    testEventCode: "TEST123",
  });
  assert.equal(ok.sent, true);
  assert.match(url, /^https:\/\/graph\.facebook\.com\/v21\.0\/123456789012345\/events\?access_token=/);
  assert.equal(LEAD_ENDPOINT.test(url), false);
  const body = JSON.parse(payload) as { data: Array<Record<string, unknown>>; test_event_code?: string };
  const event = body.data[0];
  const user = event.user_data as Record<string, unknown>;
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "purchase_cs_test_blueprint1");
  assert.deepEqual(user.em, [hashEmail("Sam@Firm.com.au")]);
  assert.deepEqual(user.ph, [hashPhone("0412 345 678")]);
  assert.equal(user.fbp, "fb.1.1700000000000.browser");
  assert.equal(user.fbc, "fb.1.1700000000000.click");
  assert.equal(user.client_ip_address, "203.0.113.8");
  assert.equal(user.client_user_agent, "Mozilla/5.0");
  assert.equal((event.custom_data as { value: number; currency: string }).value, 497);
  assert.equal((event.custom_data as { currency: string }).currency, "AUD");
  assert.equal(body.test_event_code, "TEST123");
  assert.equal(payload.includes("Sam@Firm.com.au"), false);
  assert.equal(payload.includes("0412"), false);

  const built = buildCapiBody({ eventName: "PageView", eventId: "short" });
  assert.equal(built, null);

  if (prevToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN;
  else process.env.META_CAPI_ACCESS_TOKEN = prevToken;
  if (prevPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  else process.env.NEXT_PUBLIC_META_PIXEL_ID = prevPixel;
  if (prevCode === undefined) delete process.env.META_CAPI_TEST_EVENT_CODE;
  else process.env.META_CAPI_TEST_EVENT_CODE = prevCode;
});

test("the browser relay refuses Purchase and other origins, and does not call Meta when unset", async () => {
  const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
  const prevPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const { POST } = await import("../app/api/marketing/event/route");

  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const href = String(input);
    calls.push(href);
    if (LEAD_ENDPOINT.test(href)) throw new Error("tests must never post to lead endpoints");
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    const denied = await POST(new Request("https://www.saabai.ai/api/marketing/event", {
      method: "POST",
      headers: { origin: "https://stuscyclerepairs.com", "content-type": "application/json" },
      body: JSON.stringify({ eventName: "Lead", eventId: "11111111-1111-1111-1111-111111111111", email: "a@b.co" }),
    }));
    assert.equal(denied.status, 403);

    const purchase = await POST(new Request("https://www.saabai.ai/api/marketing/event", {
      method: "POST",
      headers: { origin: "https://www.saabai.ai", "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ eventName: "Purchase", eventId: "purchase_cs_test_blueprint1", value: 497 }),
    }));
    assert.equal(purchase.status, 400);

    const lead = await POST(new Request("https://www.saabai.ai/api/marketing/event", {
      method: "POST",
      headers: { origin: "https://www.saabai.ai", "content-type": "application/json", "x-forwarded-for": "203.0.113.10", "user-agent": "TestAgent" },
      body: JSON.stringify({
        eventName: "Lead",
        eventId: "22222222-2222-2222-2222-222222222222",
        email: "sam@firm.com.au",
        eventSourceUrl: "https://www.saabai.ai/websites",
      }),
    }));
    assert.equal(lead.status, 200);
    assert.deepEqual(await lead.json(), { ok: true, sent: false });
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = original;
    if (prevToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN;
    else process.env.META_CAPI_ACCESS_TOKEN = prevToken;
    if (prevPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = prevPixel;
  }
});

test("scripts, privacy copy and wiring stay on saabai.ai and off lead endpoints", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /MarketingAnalytics/);
  assert.doesNotMatch(layout, /fbq|connect\.facebook\.net|googletagmanager/);

  const widget = read("app/components/MarketingAnalytics.tsx");
  assert.match(widget, /strategy="afterInteractive"/);
  assert.match(widget, /strategy="lazyOnload"/);
  assert.match(widget, /CALENDLY_WIDGET_SRC/);
  assert.match(read("lib/marketing/calendly.ts"), /https:\/\/assets\.calendly\.com\/assets\/external\/widget\.js/);
  assert.match(widget, /initPopupWidget/);
  assert.match(widget, /window\.open\(url, "_blank"/);
  assert.doesNotMatch(widget, /beforeInteractive/);
  assert.doesNotMatch(widget, /googletagmanager|saabaiMarketingLayer|gtag\/js/);
  assert.match(widget, /marketingHostMode/);
  assert.match(widget, /marketingPathAllowed/);
  assert.doesNotMatch(widget, /META_CAPI_ACCESS_TOKEN/);

  const browser = read("lib/marketing/browser.ts");
  assert.match(browser, /send_to: measurementId/);
  assert.doesNotMatch(browser, /saabaiMarketingLayer|googletagmanager/);
  assert.match(read("app/components/ChatWidget.tsx"), /skipGa: true/);
  assert.match(read("app/pay/done/page.tsx"), /purchase \?/);
  assert.match(read("app/blueprint/confirmation/page.tsx"), /amountAud != null \?/);

  for (const file of ["lib/marketing/browser.ts", "lib/marketing/public.ts", "app/components/MarketingPurchase.tsx"]) {
    assert.doesNotMatch(read(file), /META_CAPI_ACCESS_TOKEN/, file);
    assert.doesNotMatch(read(file), LEAD_ENDPOINT, file);
  }
  for (const file of [
    "lib/marketing/capi.ts",
    "lib/marketing/report-purchase.ts",
    "app/api/marketing/event/route.ts",
    "app/components/legal-demos/LexDemoPanel.tsx",
    "app/components/sb/VoiceDemo.tsx",
  ]) {
    assert.doesNotMatch(read(file), LEAD_ENDPOINT, file);
  }

  assert.match(read("app/components/ChatWidget.tsx"), /source: "enquiry"/);
  assert.match(read("app/components/legal-demos/LexDemoPanel.tsx"), /source: "lex"/);
  assert.match(read("app/components/sb/VoiceDemo.tsx"), /source: "lachie"/);
  assert.match(read("app/components/sb/VoiceDemo.tsx"), /line\.role === "visitor"/);
  assert.match(read("app/api/stripe/webhook/route.ts"), /reportCheckoutPurchase/);
  assert.match(read("app/api/webhooks/billing/route.ts"), /reportCheckoutPurchase/);
  assert.match(read("proxy.ts"), /\/api\/marketing\/event/);

  const privacy = read("app/privacy/page.tsx");
  assert.match(privacy, /Meta pixel and the Meta Conversions API/);
  assert.match(privacy, /Facebook and Instagram/);
  assert.match(privacy, /analytics and advertising/);
  assert.match(privacy, /SHA-256/);
  assert.match(privacy, /Australian dollars/);
  assert.match(privacy, /facebook\.com\/settings\?tab=ads/);
  assert.match(privacy, /client portal/);
  assert.match(privacy, /Australian Privacy Principle 8/);
  assert.doesNotMatch(privacy, /[\u2012-\u2015]/);
  assert.doesNotMatch(privacy, /xAI|Grok/);

  const sites = walk(path.join(ROOT, "app/sites")).filter((file) => /\.(tsx?|jsx?)$/.test(file));
  const hits = sites.filter((file) => /connect\.facebook\.net|META_PIXEL|NEXT_PUBLIC_GA4_ID|saabaiMarketingLayer|widget\.js/.test(readFileSync(file, "utf8")));
  assert.deepEqual(hits, []);
});
