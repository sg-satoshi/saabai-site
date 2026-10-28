import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TIERS } from "../lib/blueprint";
import { LINKS } from "../lib/mia-offers";
import {
  BLUEPRINT_CREDIT_FINE_PRINT,
  BOOK_IMPLEMENTATION_CTA,
  creditEndsAt,
  creditModelForEngagement,
  creditModelForEngagements,
  creditPreviewEnabled,
  describeCredit,
  IMPLEMENTATION_CALL_URL,
  mapRecommendation,
  planCreditApplication,
  PREVIEW_DELIVERED_AT,
  previewCreditModel,
  previewNow,
  resolveDeliveredAt,
  SERVICE_LABEL,
  TIER_CREDIT_CENTS,
  type CreditPreviewState,
} from "../lib/blueprint-credit";

const DELIVERED = PREVIEW_DELIVERED_AT;

test("credit ends 11:59:59 pm Brisbane on day 30", () => {
  const ends = creditEndsAt(new Date("2026-10-26T09:14:00+10:00"));
  assert.equal(ends.toISOString(), "2026-11-25T13:59:59.000Z");
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ends);
  assert.match(parts, /25/);
  assert.match(parts, /Nov/);
  assert.match(parts, /23:59/);
});

test("tier credit matches the live Blueprint prices", () => {
  assert.equal(TIER_CREDIT_CENTS.starter, TIERS.starter.price * 100);
  assert.equal(TIER_CREDIT_CENTS.pro, TIERS.pro.price * 100);
  assert.equal(TIER_CREDIT_CENTS.business, TIERS.business.price * 100);
  assert.equal(IMPLEMENTATION_CALL_URL, LINKS.booking);
});

test("fine print is the live Blueprint FAQ sentence", () => {
  const page = readFileSync("app/blueprint/page.tsx", "utf8");
  assert.ok(page.includes(BLUEPRINT_CREDIT_FINE_PRINT));
});

test("concept C states for the Pro sample clock", () => {
  const fresh = describeCredit(previewCreditModel("fresh")!, previewNow("fresh"))!;
  assert.equal(fresh.phase, "fresh");
  assert.equal(fresh.tone, "calm");
  assert.equal(fresh.statusLabel, "30 days left");
  assert.equal(fresh.headline, "Your $1,497 Pro Blueprint credit");
  assert.equal(fresh.days, 30);
  assert.equal(fresh.hours, 14);
  assert.equal(fresh.minutes, 45);
  assert.equal(fresh.fraction, 1);
  assert.equal(fresh.body, "Your Blueprint is delivered. Book any Saabai build in the next 30 days and the full $1,497 comes off it.");
  assert.equal(fresh.endsLine, "Ends 11:59 pm Wed 25 Nov, Brisbane time");
  assert.equal(fresh.primaryLabel, BOOK_IMPLEMENTATION_CTA);
  assert.equal(fresh.planSource, "From your Blueprint");
  assert.deepEqual(fresh.items.map((item) => item.serviceLabel), ["Lex chat", "Lachie", "Growth website"]);
  assert.ok(!fresh.items.some((item) => /legend/i.test(item.serviceLabel + item.title)));

  const mid = describeCredit(previewCreditModel("mid")!, previewNow("mid"))!;
  assert.equal(mid.phase, "mid");
  assert.equal(mid.tone, "calm");
  assert.equal(mid.statusLabel, "14 days left");
  assert.equal(mid.days, 14);
  assert.equal(mid.hours, 9);
  assert.equal(mid.minutes, 32);
  assert.ok(Math.abs(mid.fraction - 0.47) < 0.01);
  assert.match(mid.body, /halfway through your credit window/);

  const urgent = describeCredit(previewCreditModel("urgent")!, previewNow("urgent"))!;
  assert.equal(urgent.phase, "urgent");
  assert.equal(urgent.tone, "warm");
  assert.equal(urgent.statusLabel, "6 days left");
  assert.equal(urgent.hours, 3);
  assert.equal(urgent.minutes, 20);
  assert.equal(urgent.body, "Your $1,497 credit is available for 6 more days. If a build is on your list, a short call is the quickest way to plan it.");

  const last = describeCredit(previewCreditModel("last")!, previewNow("last"))!;
  assert.equal(last.phase, "last_day");
  assert.equal(last.tone, "warm");
  assert.equal(last.statusLabel, "Last day");
  assert.equal(last.days, 0);
  assert.equal(last.hours, 7);
  assert.equal(last.minutes, 12);
  assert.equal(last.showCountdown, true);
  assert.equal(last.endsLine, "Ends 11:59 pm tonight, Brisbane time");
  assert.match(last.body, /11:59 pm tonight/);

  for (const state of ["fresh", "mid", "urgent", "last"] as CreditPreviewState[]) {
    const view = describeCredit(previewCreditModel(state)!, previewNow(state as Exclude<CreditPreviewState, "hidden">))!;
    assert.equal(view.finePrint, BLUEPRINT_CREDIT_FINE_PRINT);
    assert.ok(!/[\u2012-\u2015]/.test(JSON.stringify(view)), state);
  }
});

test("one day left stays urgent until the last 24 hours", () => {
  const ends = creditEndsAt(DELIVERED);
  const now = new Date(ends.getTime() - (24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000));
  const model = creditModelForEngagement(
    { id: "one", tier: "pro", deliveredAt: DELIVERED.toISOString() },
    now,
  )!;
  const view = describeCredit(model, now)!;
  assert.equal(view.phase, "urgent");
  assert.equal(view.statusLabel, "1 day left");
  assert.match(view.body, /1 more day/);
});

test("the rail hides as soon as the window closes", () => {
  const ends = creditEndsAt(DELIVERED);
  const model = previewCreditModel("last")!;
  const lastMinute = describeCredit(model, new Date(ends.getTime() - 60_000));
  assert.equal(lastMinute!.phase, "last_day");
  assert.equal(lastMinute!.hours, 0);
  assert.equal(lastMinute!.minutes, 1);
  assert.equal(describeCredit(model, new Date(ends.getTime() - 30_000)), null);
  assert.equal(describeCredit(model, ends), null);
  assert.equal(describeCredit(model, new Date(ends.getTime() + 36 * 60 * 60 * 1000)), null);
  assert.equal(
    creditModelForEngagements(
      [{ id: "closed", tier: "pro", deliveredAt: DELIVERED.toISOString() }],
      ends,
    ),
    null,
  );
});

test("non-Blueprint, undelivered, and fully used credit stay hidden", () => {
  assert.equal(previewCreditModel("hidden"), null);
  assert.equal(creditModelForEngagements([], previewNow("fresh")), null);
  assert.equal(
    creditModelForEngagements(
      [{ id: "buy", tier: "pro", status: "purchased", createdAt: DELIVERED.toISOString() }],
      previewNow("fresh"),
    ),
    null,
  );
  assert.equal(
    creditModelForEngagements(
      [{ id: "used", tier: "pro", deliveredAt: DELIVERED.toISOString(), creditUsedCents: TIER_CREDIT_CENTS.pro }],
      previewNow("fresh"),
    ),
    null,
  );
});

test("partial use shows the remaining credit", () => {
  const model = creditModelForEngagement(
    { id: "part", tier: "pro", deliveredAt: DELIVERED.toISOString(), creditUsedCents: 50_000 },
    previewNow("fresh"),
  )!;
  const view = describeCredit(model, previewNow("fresh"))!;
  assert.equal(view.headline, "Your $997 Pro Blueprint credit");
  assert.equal(view.usedNote, "$500 of this credit is already on a build.");
  assert.match(view.body, /the remaining \$997 comes off it/);
});

test("business and starter headlines use their own fees", () => {
  const now = previewNow("fresh");
  const business = describeCredit(
    creditModelForEngagement({ id: "b", tier: "business", deliveredAt: DELIVERED.toISOString() }, now)!,
    now,
  )!;
  const starter = describeCredit(
    creditModelForEngagement({ id: "s", tier: "starter", deliveredAt: DELIVERED.toISOString() }, now)!,
    now,
  )!;
  assert.equal(business.headline, "Your $3,500 Business Blueprint credit");
  assert.equal(starter.headline, "Your $497 Starter Blueprint credit");
});

test("recommendation count follows the tier, and a missing plan falls back", () => {
  const opps = [1, 2, 3, 4, 5].map((rank) => ({ title: `Workflow ${rank} automation`, rank }));
  const now = previewNow("fresh");
  const starter = creditModelForEngagement(
    { id: "s", tier: "starter", deliveredAt: DELIVERED.toISOString(), assessment: { opportunities: opps } },
    now,
  )!;
  const business = creditModelForEngagement(
    { id: "b", tier: "business", deliveredAt: DELIVERED.toISOString(), assessment: { opportunities: [{ title: "Cut this", status: "cut" }, ...opps] } },
    now,
  )!;
  assert.equal(starter.recommendations!.length, 2);
  assert.equal(business.recommendations!.length, 4);
  assert.equal(starter.recommendations![0].service, "automation");

  const plain = describeCredit(
    creditModelForEngagement({ id: "p", tier: "pro", deliveredAt: DELIVERED.toISOString() }, now)!,
    now,
  )!;
  assert.equal(plain.planSource, "Saabai services");
  assert.deepEqual(plain.items.map((item) => item.title), ["Websites", "Lex chat", "Lachie", "Automation"]);
  assert.ok(plain.items.every((item) => !/legend/i.test(item.serviceLabel)));
});

test("service mapping pairs recommendations with Saabai services", () => {
  assert.equal(mapRecommendation("Answer website enquiries after hours"), "lex");
  assert.equal(mapRecommendation("Handle calls while you're with a client"), "lachie");
  assert.equal(mapRecommendation("Rebuild the site around online bookings"), "website_growth");
  assert.equal(mapRecommendation("A simple Presence brochure site"), "website_presence");
  assert.equal(SERVICE_LABEL.lachie, "Lachie");
});

test("a live credit is preferred over one that has already closed", () => {
  const picked = creditModelForEngagements(
    [
      { id: "exp", tier: "pro", deliveredAt: "2026-09-01T00:00:00.000Z" },
      { id: "new", tier: "pro", deliveredAt: DELIVERED.toISOString() },
    ],
    previewNow("fresh"),
  );
  assert.equal(picked!.engagementId, "new");
});

test("delivery time is derived for older engagements without deliveredAt", () => {
  assert.equal(
    resolveDeliveredAt({
      id: "a",
      updatedAt: "2026-10-01T00:00:00.000Z",
      reports: [{ deliveredAt: "2026-10-20T01:00:00.000Z" }, { deliveredAt: "2026-10-18T01:00:00.000Z" }],
      timeline: [{ type: "report_delivered", at: "2026-10-19T01:00:00.000Z" }],
    }),
    "2026-10-18T01:00:00.000Z",
  );
  assert.equal(
    resolveDeliveredAt({
      id: "b",
      status: "delivered",
      updatedAt: "2026-10-22T02:00:00.000Z",
    }),
    "2026-10-22T02:00:00.000Z",
  );
  assert.equal(resolveDeliveredAt({ id: "c", status: "assessment", updatedAt: "2026-10-22T02:00:00.000Z" }), null);
  assert.equal(
    resolveDeliveredAt({ id: "d", deliveredAt: "2026-10-26T09:14:00+10:00", updatedAt: "2026-11-01T00:00:00.000Z" }),
    DELIVERED.toISOString(),
  );
});

test("only a signed quote or deposit uses credit", () => {
  const engagement = { id: "a", tier: "pro", deliveredAt: DELIVERED.toISOString() };
  const now = previewNow("mid");
  const call = planCreditApplication(engagement, { cents: 10_000, kind: "call" }, now, "crd_call");
  assert.equal(call.ok, false);

  const deposit = planCreditApplication(engagement, { cents: 50_000, kind: "deposit", reference: "DEP-9" }, now, "crd_1");
  assert.equal(deposit.ok, true);
  if (!deposit.ok) return;
  assert.equal(deposit.creditUsedCents, 50_000);
  assert.match(deposit.detail, /Deposit/);
  assert.match(deposit.detail, /\$500/);

  const tooMuch = planCreditApplication(
    { ...engagement, creditApplications: deposit.applications, creditUsedCents: deposit.creditUsedCents },
    { cents: 200_000, kind: "signed_quote" },
    now,
    "crd_2",
  );
  assert.equal(tooMuch.ok, false);

  const rest = planCreditApplication(
    { ...engagement, creditApplications: deposit.applications, creditUsedCents: deposit.creditUsedCents },
    { cents: 99_700, kind: "signed_quote" },
    now,
    "crd_3",
  );
  assert.equal(rest.ok, true);
  if (rest.ok) assert.equal(rest.creditUsedCents, 149_700);

  const beforeDelivery = planCreditApplication(
    { id: "early", tier: "pro", status: "report" },
    { cents: 100, kind: "signed_quote" },
    now,
    "crd_4",
  );
  assert.equal(beforeDelivery.ok, false);
});

test("preview route is off in production and does not post to lead endpoints", () => {
  assert.equal(creditPreviewEnabled("production"), false);
  assert.equal(creditPreviewEnabled("preview"), true);
  assert.equal(creditPreviewEnabled(undefined), true);
  const files = [
    "app/client-portal/credit-preview/page.tsx",
    "app/client-portal/credit-preview/CreditPreview.tsx",
    "app/client-portal/credit/CreditPlanRail.tsx",
    "lib/blueprint-credit.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("/api/leads"), false, file);
    assert.equal(source.includes("/api/site-factory/lead"), false, file);
  }
  const page = readFileSync("app/client-portal/credit-preview/page.tsx", "utf8");
  assert.match(page, /creditPreviewEnabled/);
  assert.match(page, /notFound/);
  assert.match(page, /state === "expired"/);
  assert.match(page, /state=hidden/);
  const rail = readFileSync("app/client-portal/credit/CreditPlanRail.tsx", "utf8");
  assert.equal(rail.includes("Let's put your Blueprint to work"), false);
  assert.equal(rail.includes("Talk to us"), false);
});
