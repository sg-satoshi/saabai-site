/**
 * Site-factory lead notifications: reply-to, subject, HTML plus text,
 * Resend's returned error, and the full Telegram alert without the early ping.
 * Resend and Telegram are mocked. Nothing is posted to production.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
const LONG_DASH = /[\u2012-\u2015]/;
const API_KEY = "re_test_secret_value";

type EmailBody = {
  from?: string;
  to?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
};

const emails: EmailBody[] = [];
const telegrams: { text: string; chatId: string; url: string }[] = [];
let resendStatus = 200;
let resendPayload: unknown = { id: "email_test" };

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.resend.com")) {
    emails.push(JSON.parse(String(init?.body ?? "{}")) as EmailBody);
    return new Response(JSON.stringify(resendPayload), {
      status: resendStatus,
      headers: { "content-type": "application/json" },
    });
  }
  if (url.includes("api.telegram.org")) {
    const parsed = new URL(url);
    telegrams.push({
      url,
      text: parsed.searchParams.get("text") ?? "",
      chatId: parsed.searchParams.get("chat_id") ?? "",
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
});

after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

beforeEach(() => {
  mock.reset();
  emails.length = 0;
  telegrams.length = 0;
  resendStatus = 200;
  resendPayload = { id: "email_test" };
  process.env.RESEND_API_KEY = API_KEY;
  process.env.TG_WHOLESALE_HOMES_BOT = "wholesale-bot-token";
  process.env.TELEGRAM_CHAT_ID_WHOLESALE_HOMES = "555";
  delete process.env.TG_NICO_BOT;
  delete process.env.TELEGRAM_CHAT_ID_NICO_MORETTI;
  delete process.env.TG_HTM_BOT;
  delete process.env.TELEGRAM_CHAT_ID_HEAVEN_THAI_MASSAGE;
  delete process.env.LEAD_NOTIFY_EMAIL;
  delete process.env.LEAD_NOTIFY_EMAIL_WHOLESALE_HOMES;
  delete process.env.LEAD_NOTIFY_EMAIL_POP_UP_STUDIO;
  delete process.env.LEAD_NOTIFY_EMAIL_KIOSK_NORTH;
});

function postLead(body: Record<string, unknown>) {
  return import("../app/api/site-factory/lead/route").then(({ POST }) =>
    POST(new Request("https://www.saabai.ai/api/site-factory/lead", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://wholesalehomes.com.au" },
      body: JSON.stringify(body),
    })),
  );
}

test("route source has no early Telegram ping and no long dashes", () => {
  const src = readFileSync("app/api/site-factory/lead/route.ts", "utf8");
  assert.equal(src.includes("EARLY"), false);
  assert.equal(LONG_DASH.test(src), false);
});

test("notification replies to a valid submitter and keeps the full Telegram alert", async () => {
  process.env.LEAD_NOTIFY_EMAIL_WHOLESALE_HOMES = "should-not-win@example.com";
  const name = "Ada \u2014 Lee";
  const message = "Line one\nLine two. Need 2\u20134 hours";
  const res = await postLead({
    name,
    email: "  Ada@Example.com  ",
    phone: "0400",
    message,
    siteSlug: "wholesale-homes",
    duration: "90 minutes",
    eventType: "Wedding",
    state: "QLD",
    budget: "700000",
    buyer_type: "Investor \u2014 cash",
    timeline: "3 months",
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, message: "Lead captured" });

  assert.equal(emails.length, 1);
  const email = emails[0];
  assert.equal(email.from, "noreply@saabai.ai");
  assert.equal(email.to, "hello@wholesalehomes.com.au");
  assert.deepEqual(email.reply_to, ["Ada@Example.com"]);
  assert.equal(email.subject, "New booking enquiry: Ada - Lee (Wholesale Homes Australia)");
  assert.equal(typeof email.html, "string");
  assert.equal(typeof email.text, "string");
  const html = email.html ?? "";
  const text = email.text ?? "";
  for (const part of [email.subject ?? "", html, text]) assert.equal(LONG_DASH.test(part), false);
  for (const detail of ["Ada - Lee", "Ada@Example.com", "0400", "90 minutes", "Wedding", "Line one", "Line two", "2-4 hours", "New Inquiry", "wholesale-homes", "noreply@saabai.ai"]) {
    assert.ok(html.includes(detail), `html missing ${detail}`);
    assert.ok(text.includes(detail), `text missing ${detail}`);
  }
  assert.ok(html.includes("Line one<br>Line two"));
  assert.ok(text.includes("Line one\nLine two"));
  assert.equal(html.includes("Budget:"), false);
  assert.equal(text.includes("Budget:"), false);
  const received = text.split("\n").find((line) => line.startsWith("Received: "));
  assert.ok(received);
  assert.ok(html.includes(received.slice("Received: ".length)));

  assert.equal(telegrams.length, 1);
  const tg = telegrams[0];
  assert.equal(tg.chatId, "555");
  assert.ok(tg.url.startsWith("https://api.telegram.org/botwholesale-bot-token/sendMessage"));
  assert.ok(tg.url.includes("parse_mode=Markdown"));
  assert.equal(tg.text.includes("EARLY"), false);
  assert.equal(LONG_DASH.test(tg.text), false);
  assert.ok(tg.text.startsWith("\uD83D\uDD14 *New inquiry - wholesale-homes*"));
  for (const line of [
    "*Name:* Ada - Lee",
    "*Email:*   Ada@Example.com  ",
    "*Phone:* 0400",
    "*Type:* Investor - cash",
    "*Timeline:* 3 months",
    "*State:* QLD",
    "*Budget:* 700000",
    "*Duration:* 90 minutes",
    "*Event:* Wedding",
    "*Notes:* Line one\nLine two. Need 2-4 hours",
  ]) assert.ok(tg.text.includes(line), line);
  assert.match(tg.text, /_Received .+_/);

  const stored = mock.exec(["LRANGE", "saabai:leads:wholesale-homes", "0", "0"]) as string[];
  const lead = JSON.parse(stored[0]) as { name: string; email: string; buyer_type: string; message: string };
  assert.equal(lead.name, name);
  assert.equal(lead.email, "  Ada@Example.com  ");
  assert.equal(lead.buyer_type, "Investor \u2014 cash");
  assert.equal(lead.message, message);
});

test("invalid or missing email omits reply-to and an unknown site uses its slug", async () => {
  const missing = await postLead({ name: "Pat", siteSlug: "kiosk-north", message: "Hello" });
  assert.equal(missing.status, 200);
  assert.equal(emails.length, 1);
  assert.equal("reply_to" in emails[0], false);
  assert.equal(emails[0].subject, "New booking enquiry: Pat (kiosk-north)");
  assert.equal(emails[0].to, "shanegoldberg@pm.me");
  assert.equal(telegrams.length, 0);

  emails.length = 0;
  const invalid = await postLead({ name: "", email: "not-an-email", phone: "", siteSlug: "bo-consultancy" });
  assert.equal(invalid.status, 200);
  assert.equal(emails.length, 1);
  assert.equal("reply_to" in emails[0], false);
  assert.equal(emails[0].subject, "New booking enquiry: Anonymous (BO Consulting)");
  assert.equal(emails[0].to, "info@boconsulting.com.au");
  assert.equal(telegrams.length, 0);
  const text = emails[0].text ?? "";
  assert.equal(text.includes("Name:"), false);
  assert.ok(text.includes("Email: not-an-email"));
  assert.ok((emails[0].html ?? "").includes("not-an-email"));
  assert.ok(text.includes("New Inquiry via bo-consultancy"));
  assert.ok((emails[0].html ?? "").includes("New Inquiry"));
});

test("site config display name is used, then cleaned", async () => {
  mock.seed({
    hashes: {
      "saabai:sites": {
        popup: JSON.stringify({
          id: "popup",
          slug: "pop-up-studio",
          name: "Pop Up \u2014 Studio",
          status: "live",
          url: "https://example.com",
          source: "factory",
          business: { name: "Pop Up Studio Pty Ltd", email: "owner@popup.test" },
          chatbot: { enabled: false, name: "P", greeting: "Hi", systemPrompt: "x" },
          createdAt: 1,
          updatedAt: 1,
        }),
      },
    },
  });
  const res = await postLead({ name: "Sam", email: "sam@popup.test", siteSlug: "pop-up-studio", message: "Book me" });
  assert.equal(res.status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "owner@popup.test");
  assert.equal(emails[0].subject, "New booking enquiry: Sam (Pop Up - Studio)");
  assert.equal(LONG_DASH.test(emails[0].subject ?? ""), false);
  assert.equal(LONG_DASH.test(emails[0].html ?? ""), false);
  assert.equal(LONG_DASH.test(emails[0].text ?? ""), false);
  assert.deepEqual(emails[0].reply_to, ["sam@popup.test"]);
  assert.equal(telegrams.length, 0);
});

test("a Resend error is logged and does not block the lead or Telegram", async () => {
  resendStatus = 422;
  resendPayload = {
    name: "validation_error",
    statusCode: 422,
    message: `Domain not verified for key ${API_KEY}`,
  };
  const logged: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args.map((part) => String(part)).join(" "));
  };
  try {
    const res = await postLead({
      name: "Nia",
      email: "nia@example.com",
      phone: "0411",
      message: "Tonight",
      siteSlug: "wholesale-homes",
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, message: "Lead captured" });
  } finally {
    console.error = orig;
  }

  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].reply_to, ["nia@example.com"]);
  assert.equal(telegrams.length, 1);
  assert.ok(telegrams[0].text.includes("*Name:* Nia"));
  assert.equal(telegrams[0].text.includes("EARLY"), false);
  const failure = logged.find((line) => line.includes("Lead notification email failed"));
  assert.ok(failure, logged.join("\n"));
  assert.ok(failure.includes("wholesale-homes"));
  assert.ok(failure.includes("Domain not verified"));
  assert.equal(failure.includes(API_KEY), false);
  assert.ok(failure.includes("[redacted]"));
  const stored = mock.exec(["LRANGE", "saabai:leads:wholesale-homes", "0", "0"]) as string[];
  assert.equal(JSON.parse(stored[0]).name, "Nia");
});

test("a thrown email failure still sends the Telegram alert", async () => {
  delete process.env.RESEND_API_KEY;
  const logged: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args.map((part) => String(part)).join(" "));
  };
  try {
    const res = await postLead({ name: "Jo", email: "jo@example.com", siteSlug: "wholesale-homes", message: "Hi" });
    assert.equal(res.status, 200);
  } finally {
    console.error = orig;
    process.env.RESEND_API_KEY = API_KEY;
  }
  assert.equal(emails.length, 0);
  assert.equal(telegrams.length, 1);
  assert.ok(telegrams[0].text.includes("*Name:* Jo"));
  const failure = logged.find((line) => line.includes("Lead notification email failed for wholesale-homes"));
  assert.ok(failure);
  assert.equal(failure.includes(API_KEY), false);
});
