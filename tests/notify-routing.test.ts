/**
 * Portal alerts stay on the Saabai admin inbox.
 * A site lead uses that site's own Telegram and email, never a neighbour's.
 *
 *   npx tsx --test tests/notify-routing.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ClientRequest } from "../lib/client-requests";
import {
  ADMIN_LEAD_FALLBACK_EMAIL,
  ADMIN_ROUTING_FORBIDDEN_ENV,
  CYCLE_REPAIR_LEAD_EMAIL,
  SAABAI_ADMIN_EMAIL,
  adminTelegramDestination,
  planPortalRequestAlert,
  siteLeadEmail,
  siteTelegramDestination,
} from "../lib/notify-routing";
import { sendCriticalAlerts } from "../lib/request-alerts";
import { notifyEmail, sendNewRequestNotification } from "../lib/client-request-emails";

const TOUCHED = [
  ...ADMIN_ROUTING_FORBIDDEN_ENV,
  "ADMIN_TELEGRAM_BOT_TOKEN",
  "ADMIN_TELEGRAM_CHAT_ID",
  "SAABAI_TELEGRAM_BOT_TOKEN",
  "SAABAI_TELEGRAM_CHAT_ID",
  "REQUESTS_NOTIFY_EMAIL",
  "REQUESTS_CRITICAL_EMAIL",
  "LEAD_NOTIFY_EMAIL",
  "LEAD_NOTIFY_EMAIL_NICO_MORETTI",
  "RESEND_API_KEY",
];

function snapshot(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED) saved[key] = process.env[key];
  return saved;
}

function restore(saved: Record<string, string | undefined>) {
  for (const key of TOUCHED) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function clearRoutingEnv() {
  for (const key of TOUCHED) delete process.env[key];
}

const legalResearch = {
  priority: "normal" as const,
  clientId: "lex-internal",
  siteId: undefined,
  siteName: undefined,
};

function sampleRequest(overrides: Partial<ClientRequest> = {}): ClientRequest {
  return {
    id: "req-lex-1",
    clientId: "lex-internal",
    clientName: "Shane Goldberg",
    clientEmail: "hello@saabai.ai",
    title: "Update the research disclaimer",
    description: "Please change the disclaimer on the Lex workspace homepage.",
    type: "text_change",
    priority: "normal",
    screenshots: [],
    status: "new",
    autoHandle: true,
    discussWithShane: false,
    clarifierRounds: 0,
    timeline: [],
    createdAt: "2026-10-26T01:00:00.000Z",
    updatedAt: "2026-10-26T01:00:00.000Z",
    ...overrides,
  };
}

test("a Legal Research portal request does not use Stu's Telegram, even when that is the only bot configured", () => {
  const saved = snapshot();
  try {
    clearRoutingEnv();
    process.env.TELEGRAM_CYCLE_BOT_TOKEN = "cycle-bot";
    process.env.TELEGRAM_CYCLE_CHAT_ID = "-100stu";
    process.env.TELEGRAM_BOT_TOKEN = "shared-bot";
    process.env.TELEGRAM_CHAT_ID = "-100shared";
    process.env.TELEGRAM_SHANE_CHAT_ID = "-100shane-shared";

    for (const subject of [
      legalResearch,
      { ...legalResearch, priority: "critical" as const },
      { priority: "normal" as const, clientId: "lex-internal", siteId: "cycle-repair", siteName: "Stu's Cycle Repairs" },
      { priority: "critical" as const, siteId: undefined, siteName: "Saabai Legal Research", clientId: "lex-internal" },
    ]) {
      const plan = planPortalRequestAlert(subject);
      assert.equal(plan.telegram, null, JSON.stringify(subject));
      assert.equal(plan.emailTo, SAABAI_ADMIN_EMAIL);
      assert.match(plan.telegramSkip, /Not sending/);
    }
    assert.equal(adminTelegramDestination(), null);
    assert.equal(notifyEmail(), SAABAI_ADMIN_EMAIL);
  } finally {
    restore(saved);
  }
});

test("admin Telegram is used only when both halves are admin-only and not a customer channel", () => {
  const saved = snapshot();
  try {
    clearRoutingEnv();
    process.env.TELEGRAM_CYCLE_BOT_TOKEN = "cycle-bot";
    process.env.TELEGRAM_CYCLE_CHAT_ID = "-100stu";
    process.env.ADMIN_TELEGRAM_BOT_TOKEN = "admin-bot";
    process.env.ADMIN_TELEGRAM_CHAT_ID = "-100admin";

    const plan = planPortalRequestAlert({
      priority: "critical",
      clientId: "lex-internal",
      siteName: "Saabai Legal Research",
    });
    assert.deepEqual(plan.telegram, { token: "admin-bot", chatId: "-100admin" });
    assert.equal(plan.emailTo, SAABAI_ADMIN_EMAIL);

    process.env.ADMIN_TELEGRAM_CHAT_ID = "-100stu";
    assert.equal(adminTelegramDestination(), null, "admin chat copied from Stu is refused");

    delete process.env.ADMIN_TELEGRAM_BOT_TOKEN;
    delete process.env.ADMIN_TELEGRAM_CHAT_ID;
    process.env.SAABAI_TELEGRAM_BOT_TOKEN = "saabai-bot";
    process.env.SAABAI_TELEGRAM_CHAT_ID = "-100saabai";
    assert.deepEqual(adminTelegramDestination(), { token: "saabai-bot", chatId: "-100saabai" });

    process.env.SAABAI_TELEGRAM_BOT_TOKEN = "cycle-bot";
    assert.equal(adminTelegramDestination(), null, "admin bot copied from Stu is refused");
  } finally {
    restore(saved);
  }
});

test("explicit admin email overrides stay on the admin inbox", () => {
  const saved = snapshot();
  try {
    clearRoutingEnv();
    process.env.REQUESTS_NOTIFY_EMAIL = "hello@saabai.ai";
    process.env.REQUESTS_CRITICAL_EMAIL = "shanegoldberg@pm.me";
    assert.equal(planPortalRequestAlert({ priority: "normal" }).emailTo, "hello@saabai.ai");
    assert.equal(planPortalRequestAlert({ priority: "critical" }).emailTo, "shanegoldberg@pm.me");
  } finally {
    restore(saved);
  }
});

test("site leads use only that site's channel", () => {
  const saved = snapshot();
  try {
    clearRoutingEnv();
    process.env.TELEGRAM_CYCLE_BOT_TOKEN = "cycle-bot";
    process.env.TELEGRAM_CYCLE_CHAT_ID = "-100stu";
    process.env.TG_NICO_BOT = "nico-bot";
    process.env.TELEGRAM_CHAT_ID_NICO_MORETTI = "-100nico";
    process.env.TG_WHOLESALE_HOMES_BOT = "wholesale-bot";
    process.env.TELEGRAM_CHAT_ID_WHOLESALE_HOMES = "-100wholesale";
    process.env.LEAD_NOTIFY_EMAIL_NICO_MORETTI = "nico@example.com";

    assert.deepEqual(siteTelegramDestination("cycle-repair"), { token: "cycle-bot", chatId: "-100stu" });
    assert.equal(CYCLE_REPAIR_LEAD_EMAIL, "stuscyclerepairs@gmail.com");

    assert.deepEqual(siteTelegramDestination("nico-moretti"), { token: "nico-bot", chatId: "-100nico" });
    assert.equal(siteLeadEmail("nico-moretti", "other@example.com"), "nico@example.com");
    assert.notEqual(siteTelegramDestination("nico-moretti")?.chatId, "-100stu");

    assert.deepEqual(siteTelegramDestination("wholesale-homes"), { token: "wholesale-bot", chatId: "-100wholesale" });
    assert.equal(siteLeadEmail("wholesale-homes", "stu@gmail.com"), "hello@wholesalehomes.com.au");

    assert.equal(siteTelegramDestination("heaven-thai-massage"), null);
    assert.equal(siteTelegramDestination("lex-internal"), null);
    assert.equal(siteTelegramDestination("saabai-legal-research"), null);
    assert.equal(siteTelegramDestination(""), null);
    assert.equal(siteLeadEmail("unknown-site", undefined), ADMIN_LEAD_FALLBACK_EMAIL);
    assert.notEqual(siteLeadEmail("unknown-site", undefined), CYCLE_REPAIR_LEAD_EMAIL);
    assert.equal(siteLeadEmail("bo-consultancy", "stuscyclerepairs@gmail.com"), "info@boconsulting.com.au");
  } finally {
    restore(saved);
  }
});

test("sending a portal request does not call Telegram when only Stu's bot is configured", async () => {
  const saved = snapshot();
  const originalFetch = globalThis.fetch;
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: typeof init?.body === "string" ? init.body : "" });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    clearRoutingEnv();
    process.env.TELEGRAM_CYCLE_BOT_TOKEN = "cycle-bot";
    process.env.TELEGRAM_CYCLE_CHAT_ID = "-100stu";
    delete process.env.RESEND_API_KEY;

    const normal = await sendNewRequestNotification(sampleRequest());
    const critical = await sendCriticalAlerts(sampleRequest({ priority: "critical", title: "Test text change" }));
    const mislinked = await sendCriticalAlerts(
      sampleRequest({ priority: "critical", siteId: "cycle-repair", siteName: "Stu's Cycle Repairs" }),
    );

    assert.equal(normal, false);
    assert.equal(critical.telegram, false);
    assert.equal(mislinked.telegram, false);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restore(saved);
  }
});

test("a configured admin chat is the only Telegram target for a critical portal alert", async () => {
  const saved = snapshot();
  const originalFetch = globalThis.fetch;
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: typeof init?.body === "string" ? init.body : "" });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    clearRoutingEnv();
    process.env.TELEGRAM_CYCLE_BOT_TOKEN = "cycle-bot";
    process.env.TELEGRAM_CYCLE_CHAT_ID = "-100stu";
    process.env.ADMIN_TELEGRAM_BOT_TOKEN = "admin-bot";
    process.env.ADMIN_TELEGRAM_CHAT_ID = "-100admin";
    delete process.env.RESEND_API_KEY;

    const result = await sendCriticalAlerts(
      sampleRequest({ priority: "critical", clientId: "lex-internal", title: "Booking page is down" }),
    );
    assert.equal(result.telegram, true);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /botadmin-bot\/sendMessage$/);
    const body = JSON.parse(calls[0].body) as { chat_id: string; text: string };
    assert.equal(body.chat_id, "-100admin");
    assert.doesNotMatch(calls[0].url, /cycle-bot/);
    assert.doesNotMatch(body.text, /-100stu/);
    assert.match(body.text, /Booking page is down/);
  } finally {
    globalThis.fetch = originalFetch;
    restore(saved);
  }
});

test("portal alert code does not name a customer or shared Telegram variable", () => {
  const files = [
    "lib/request-alerts.ts",
    "lib/client-request-emails.ts",
    "app/api/portal/requests/route.ts",
    "app/api/dashboard/requests/route.ts",
    "app/api/admin/requests/[id]/route.ts",
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const key of ADMIN_ROUTING_FORBIDDEN_ENV) {
      assert.equal(src.includes(key), false, `${file} must not read ${key}`);
    }
  }
  for (const file of files.filter((name) => name !== "lib/request-alerts.ts")) {
    assert.equal(readFileSync(file, "utf8").includes("api.telegram.org"), false, file);
  }
  assert.match(readFileSync("lib/request-alerts.ts", "utf8"), /planPortalRequestAlert\(req\)/);

  const factory = readFileSync("app/api/site-factory/lead/route.ts", "utf8");
  assert.match(factory, /siteTelegramDestination\(siteSlug\)/);
  assert.match(factory, /siteLeadEmail\(siteSlug/);
  assert.equal(factory.includes("TELEGRAM_CYCLE"), false);
  assert.equal(factory.includes("TELEGRAM_SITES"), false);
  assert.equal(factory.includes("sites[0]"), false);

  const cycle = readFileSync("app/api/cycle-repair/lead/route.ts", "utf8");
  assert.match(cycle, /siteTelegramDestination\("cycle-repair"\)/);
  assert.match(cycle, /CYCLE_REPAIR_LEAD_EMAIL/);
  assert.equal(cycle.includes("TELEGRAM_CHAT_ID_NICO"), false);
  assert.equal(cycle.includes("TELEGRAM_CHAT_ID_WHOLESALE"), false);
  assert.equal(cycle.includes("TG_HTM_BOT"), false);
});
