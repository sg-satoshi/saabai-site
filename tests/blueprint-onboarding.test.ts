/**
 * Blueprint search onboarding. No network, no lead posts, no invented answers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoEngagement } from "../lib/audit-factfind-demo";
import { isFocusedFormPath } from "../lib/focused-paths";
import { handleOnboarding } from "../lib/blueprint/onboarding-handle";
import { notifyAdminFaqQueue } from "../lib/blueprint/onboarding-notify";
import {
  ANALYTICS_INVITE_HELP,
  ONBOARDING_FIELDS,
  PREVIEW_SAMPLE_URL,
  applyDraftAction,
  buildFaqDrafts,
  dataCompleteness,
  onboardingCheckIds,
  planIntake,
  prefillFromSnapshot,
  previewCrawlSnapshot,
  rejectSecrets,
  searchBriefFromAnswers,
} from "../lib/blueprint/onboarding";
import { SEARCH_CHECK_IDS, evaluateSearch, visibleText } from "../lib/blueprint/search-rules";
import { formatSearchAudit } from "../lib/blueprint/search-audit";

const EM = /\u2014|\u2013/;

test("every onboarding question maps to a named search check", () => {
  const ids = new Set<string>(SEARCH_CHECK_IDS);
  assert.equal(ids.size, SEARCH_CHECK_IDS.length);
  for (const field of ONBOARDING_FIELDS) {
    assert.ok(ids.has(field.checkId), field.id);
    assert.ok(!EM.test(`${field.label} ${field.help ?? ""}`));
    assert.equal(field.type === "choice" && field.id === "analytics_access", field.id === "analytics_access");
  }
  assert.match(ANALYTICS_INVITE_HELP, /read-only user/i);
  assert.match(ANALYTICS_INVITE_HELP, /password/i);
  const audit = evaluateSearch(previewCrawlSnapshot(), { name: "Acme Plumbing", firmType: "other", industry: "plumber", businessKind: "local-trade" });
  for (const check of audit.checks) assert.ok(ids.has(check.id), check.id);
  assert.ok(onboardingCheckIds().every((id) => ids.has(id)));
});

test("prefill reads the site and does not invent a rating", () => {
  const prefill = prefillFromSnapshot(previewCrawlSnapshot());
  assert.deepEqual(prefill.services, ["Hot water", "Blocked drains"]);
  assert.match(prefill.phone ?? "", /0755551234/);
  assert.match(prefill.serviceAreas ?? "", /^Our service area covers the Gold Coast and Brisbane/);
  assert.doesNotMatch(prefill.serviceAreas ?? "", /Call 07/);
  assert.equal(prefill.promise, "Same-day hot water repairs");
  assert.match(prefill.gbpUrl ?? "", /maps\.google/);
  assert.equal(prefill.ratingSeen, null);
  assert.ok(prefill.faqs.some((f) => /call-out fee/i.test(f.question) && /waived/i.test(f.answer)));
  assert.equal(prefill.llms, "present");
  assert.equal(prefill.robots, "present");
  assert.ok(prefill.sitemapPages && prefill.sitemapPages > 0);
  assert.ok(prefill.schemaTypes.some((t) => /Plumber|FAQPage/i.test(t)));
  assert.ok(prefill.settledCheckIds.includes("robots_index"));
  assert.ok(prefill.settledCheckIds.includes("gbp_link"));
});

test("a known firm type is not asked again, and found facts are confirms", () => {
  const prefill = prefillFromSnapshot(previewCrawlSnapshot());
  const law = planIntake({ firmType: "law", prefill, answers: {} });
  assert.equal(law.knownBusiness, "Professional firm, from your Blueprint order.");
  assert.ok(!law.asks.some((f) => f.id === "business_type"));
  assert.ok(!law.confirms.some((f) => f.id === "business_type"));
  const other = planIntake({ firmType: "other", prefill, answers: {} });
  assert.ok(other.asks.some((f) => f.id === "business_type" && !f.optional));
  assert.ok(other.confirms.some((f) => f.id === "services" && String(f.suggestion).includes("Hot water")));
  assert.ok(other.confirms.some((f) => f.id === "promise"));
  assert.ok(other.asks.some((f) => f.id === "stated_rating" && f.suggestion === null));
  assert.ok(other.asks.some((f) => f.id === "ideal_customers"));
  assert.ok(other.asks.some((f) => f.id === "missed_enquiries" && f.optional));
});

test("completeness moves when the client confirms a fact, and a seen rating is not stored as theirs", () => {
  const prefill = prefillFromSnapshot(previewCrawlSnapshot());
  const empty = dataCompleteness({ firmType: "other", firmName: "Acme Plumbing", prefill, answers: {} });
  const filled = dataCompleteness({
    firmType: "other",
    firmName: "Acme Plumbing",
    prefill,
    answers: {
      business_type: "local-trade",
      industry: "plumber",
      services: "Hot water\nBlocked drains",
      service_areas: "Gold Coast",
      ideal_customers: "Home owners",
      buyer_questions: "[]",
      promise: "Same-day hot water repairs",
      missed_enquiries: 4,
      close_rate: 25,
      average_job: 500,
    },
  });
  assert.ok(filled.percent > empty.percent);
  assert.ok(filled.percent <= 100);
  assert.equal(filled.rows.find((r) => r.checkId === "leak_inputs")?.state, "confirmed");
  assert.equal(filled.rows.find((r) => r.checkId === "promise")?.state, "confirmed");
  const brief = searchBriefFromAnswers({
    answers: { services: "Hot water", promise: "Same-day hot water repairs", business_type: "local-trade" },
    firmType: "other",
  });
  assert.equal(brief.statedGoogleRating, undefined);
  assert.deepEqual(brief.services, ["Hot water"]);
  assert.equal(brief.businessKind, "local-trade");
  const told = searchBriefFromAnswers({ answers: { stated_rating: 4.8, stated_reviews: 12 }, firmType: "law" });
  assert.equal(told.statedGoogleRating, 4.8);
  assert.equal(told.businessKind, "professional");
});

test("passwords and analytics logins are refused", () => {
  assert.match(rejectSecrets({ password: "hunter2" }) ?? "", /password/i);
  assert.match(rejectSecrets({ analytics_access: "my login is secret" }) ?? "", /read-only|password/i);
  assert.equal(rejectSecrets({ analytics_access: "invite", promise: "Same-day repairs" }), null);
});

test("the report flags checks that still rely on an assumption", () => {
  const snap = previewCrawlSnapshot();
  const assumed = evaluateSearch(snap, { name: "Acme Plumbing", firmType: "other", industry: "plumber" });
  assert.match(assumed.checks.find((c) => c.id === "promise")?.assumption ?? "", /No promise was supplied/);
  assert.match(assumed.checks.find((c) => c.id === "service_pages")?.assumption ?? "", /No service list/);
  assert.match(assumed.checks.find((c) => c.id === "leak_inputs")?.assumption ?? "", /not estimated/);
  const told = evaluateSearch(snap, {
    name: "Acme Plumbing",
    firmType: "other",
    industry: "plumber",
    businessKind: "local-trade",
    promise: "Same-day hot water repairs",
    services: ["Hot water", "Blocked drains"],
    figures: { missedEnquiriesPerMonth: 4, closeRate: 25, averageJobAud: 500 },
  });
  assert.equal(told.checks.find((c) => c.id === "promise")?.assumption, undefined);
  assert.equal(told.checks.find((c) => c.id === "service_pages")?.assumption, undefined);
  assert.equal(told.checks.find((c) => c.id === "leak_inputs")?.assumption, undefined);
  assert.equal(told.checks.find((c) => c.id === "service_pages")?.status, "pass");
  const text = formatSearchAudit(assumed);
  assert.match(text, /Assumption:/);
  assert.match(text, /Still relying on an assumption/);
  assert.ok(!EM.test(text));
});

test("FAQ drafts copy a real answer, list the rest, and do not publish", () => {
  const snap = previewCrawlSnapshot();
  const pageText = visibleText(snap.pages[0].html);
  const record = buildFaqDrafts({
    snapshot: snap,
    client: { name: "Acme Plumbing", firmType: "other", industry: "plumber", businessKind: "local-trade" },
    clientQas: [{ question: "Do you offer same-day or emergency call-outs?", answer: "Yes, same-day call-outs are available today." }],
    now: "2026-10-26T00:00:00.000Z",
  });
  assert.equal(record.published, false);
  const client = record.drafts.find((d) => d.buyerQuestionId === "local-emergency");
  assert.equal(client?.answer, "Yes, same-day call-outs are available today.");
  assert.equal(client?.source, "client");
  assert.equal(client?.status, "admin_review");
  const site = record.drafts.find((d) => d.buyerQuestionId === "local-callout");
  assert.equal(site?.source, "site");
  assert.match(site?.answer ?? "", /waived/);
  assert.ok(pageText.includes(site?.answer ?? "missing"));
  const areas = record.drafts.find((d) => d.buyerQuestionId === "local-areas");
  assert.equal(areas?.source, "site");
  assert.match(areas?.answer ?? "", /^Our service area covers the Gold Coast and Brisbane/);
  assert.doesNotMatch(areas?.answer ?? "", /Call 07/);
  assert.ok(pageText.includes(areas?.answer ?? "missing"));
  assert.ok((areas?.answer.length ?? 999) <= 240);
  const unanswered = record.drafts.filter((d) => d.status === "unanswered");
  assert.ok(unanswered.length > 0);
  for (const draft of unanswered) assert.equal(draft.answer, "");
  const names = (record.faqPage?.mainEntity ?? []).map((item) => item.name);
  for (const draft of unanswered) assert.ok(!names.includes(draft.question));
  for (const item of record.faqPage?.mainEntity ?? []) {
    assert.equal(item["@type"], "Question");
    assert.equal(item.acceptedAnswer["@type"], "Answer");
    assert.ok(!/\$\d/.test(item.acceptedAnswer.text));
  }
  const blocked = applyDraftAction(record, "to_client", unanswered[0].id);
  assert.ok(blocked.error);
  assert.equal(blocked.record.published, false);
  const sent = applyDraftAction(record, "to_client", client!.id);
  assert.equal(sent.record.drafts.find((d) => d.id === client!.id)?.status, "client_review");
  const approved = applyDraftAction(sent.record, "approve", client!.id);
  assert.equal(approved.record.drafts.find((d) => d.id === client!.id)?.status, "approved");
  assert.equal(approved.record.published, false);
  const filled = applyDraftAction(record, "answer", unanswered[0].id, "We reply the same day.");
  assert.equal(filled.record.drafts.find((d) => d.id === unanswered[0].id)?.answer, "We reply the same day.");
  assert.equal(filled.record.drafts.find((d) => d.id === unanswered[0].id)?.source, "client");
  assert.equal(filled.record.drafts.find((d) => d.id === unanswered[0].id)?.status, "admin_review");
});

test("demo onboarding saves nothing and still returns drafts from the sample site", async () => {
  const eng = demoEngagement();
  const read = await handleOnboarding({ engagement: eng, body: { action: "prefill", url: PREVIEW_SAMPLE_URL }, persist: false });
  assert.equal(read.status, 200);
  assert.equal(read.notify, false);
  assert.equal(read.patch, undefined);
  const resume = read.body.resume as { prefill?: { services?: string[] }; crawlUrl?: string };
  assert.ok(resume.prefill?.services?.includes("Hot water"));
  const saved = await handleOnboarding({
    engagement: {
      ...eng,
      searchOnboarding: { updatedAt: "", answers: {}, prefill: resume.prefill as never, crawlUrl: resume.crawlUrl },
    },
    body: {
      action: "save",
      complete: true,
      answers: {
        business_type: "local-trade",
        industry: "plumber",
        services: "Hot water\nBlocked drains",
        service_areas: "Gold Coast",
        ideal_customers: "Home owners",
        buyer_questions: JSON.stringify([{ question: "Do you offer same-day or emergency call-outs?", answer: "Yes, same-day call-outs are available today." }]),
        promise: "Same-day hot water repairs",
      },
    },
    persist: false,
  });
  assert.equal(saved.notify, false);
  assert.equal(saved.patch, undefined);
  const faqs = saved.body.faqs as { published: boolean; drafts: { source: string; answer: string }[] };
  assert.equal(faqs.published, false);
  assert.ok(faqs.drafts.some((d) => d.source === "client" && d.answer.includes("same-day")));
  assert.ok(faqs.drafts.some((d) => d.source === "unanswered" && d.answer === ""));
});

test("admin FAQ notice goes to the admin inbox only, or nowhere", async () => {
  const calls: { items: string[] } = { items: [] };
  const blocked = await notifyAdminFaqQueue({
    firmName: "Acme",
    engagementId: "aud_1",
    draftCount: 2,
    unanswered: 1,
    clientEmail: "client@example.com",
    env: { REQUESTS_NOTIFY_EMAIL: "stuscyclerepairs@gmail.com", ADMIN_TELEGRAM_BOT_TOKEN: "admin-bot", ADMIN_TELEGRAM_CHAT_ID: "-100admin" },
    sendEmail: async (to) => { calls.items.push(to); return true; },
    sendTelegram: async () => { calls.items.push("telegram"); return true; },
  });
  assert.equal(blocked.sent, false);
  assert.deepEqual(calls.items, []);

  const sent = await notifyAdminFaqQueue({
    firmName: "Acme",
    engagementId: "aud_1",
    draftCount: 2,
    unanswered: 1,
    clientEmail: "client@example.com",
    env: {
      REQUESTS_NOTIFY_EMAIL: "hello@saabai.ai",
      ADMIN_TELEGRAM_BOT_TOKEN: "cycle-bot",
      ADMIN_TELEGRAM_CHAT_ID: "-100cycle",
      TELEGRAM_CYCLE_BOT_TOKEN: "cycle-bot",
      TELEGRAM_CYCLE_CHAT_ID: "-100cycle",
    },
    sendEmail: async (to: string) => { calls.items.push(`email:${to}`); return true; },
    sendTelegram: async () => { calls.items.push("telegram"); return true; },
  });
  assert.equal(sent.sent, true);
  assert.deepEqual(calls.items, ["email:hello@saabai.ai"]);
});

test("onboarding code does not post a lead, collect a password, or email the client", () => {
  const files = [
    "lib/blueprint/onboarding.ts",
    "lib/blueprint/onboarding-handle.ts",
    "lib/blueprint/onboarding-notify.ts",
    "app/api/audit/onboarding/[token]/route.ts",
    "app/api/admin/blueprint-faqs/route.ts",
    "app/audit/onboarding/[token]/OnboardingClient.tsx",
    "tests/blueprint-onboarding.test.ts",
  ];
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /\/api\/leads|\/api\/site-factory\/lead|\/api\/cycle-repair\/lead/);
    assert.doesNotMatch(src, /type=["']password["']/);
    assert.ok(!EM.test(src), file);
  }
  assert.equal(isFocusedFormPath("/audit/onboarding/preview-demo"), true);
  const notify = readFileSync(new URL("../lib/blueprint/onboarding-notify.ts", import.meta.url), "utf8");
  assert.doesNotMatch(notify, /TELEGRAM_CHAT_ID[^_]/);
  assert.doesNotMatch(notify, /contactEmail/);
  const route = readFileSync(new URL("../app/api/audit/onboarding/[token]/route.ts", import.meta.url), "utf8");
  assert.match(route, /persist: !demo/);
  assert.doesNotMatch(route, /emails\.send/);
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  const pub = proxy.slice(proxy.indexOf("const PUBLIC_API"), proxy.indexOf("const ADMIN_API"));
  assert.match(pub, /\/api\/audit\/onboarding/);
  assert.doesNotMatch(pub, /blueprint-faqs/);
});
