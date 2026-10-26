/**
 * Analytics page load failures stay in an error state.
 * Run: npx tsx --test tests/admin-analytics-load.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { aiVisitorPanelMode } from "../lib/ai-visitors/report-state";
import { AiVisitorsStatus } from "../app/saabai-admin/analytics/AiVisitorsStatus";
import { interpretBlueprintResponse, interpretOrdersResponse, SalesStats } from "../app/saabai-admin/analytics/SalesStats";
import { gaHostMode } from "../lib/ga";
import { buildAnalyticsSites, siteKeyForRequest } from "../lib/ai-visitors/sites";

const read = (path: string) => readFileSync(path, "utf8");

test("a failed AI visitor load is unknown, not a zero report", () => {
  assert.equal(aiVisitorPanelMode({
    error: "[{ origin: 'number', code: 'too_big', path: ['limit'] }]",
    lastError: "",
    partialDays: 0,
    hasReport: true,
    collecting: false,
  }), "unknown");
  assert.equal(aiVisitorPanelMode({
    error: "",
    lastError: "snapshot failed",
    partialDays: 0,
    hasReport: true,
    collecting: false,
  }), "unknown");
  assert.equal(aiVisitorPanelMode({
    error: "",
    lastError: "",
    partialDays: 7,
    hasReport: true,
    collecting: false,
  }), "report");
  assert.equal(aiVisitorPanelMode({
    error: "refresh failed",
    lastError: "",
    partialDays: 30,
    hasReport: true,
    collecting: false,
  }), "report");

  const html = renderToStaticMarkup(createElement(AiVisitorsStatus, {
    mode: "unknown",
    message: "[{ code: 'too_big', path: ['limit'] }]",
  }));
  assert.match(html, /data-state="unknown"/);
  assert.match(html, /AI visitor counts are unknown/);
  assert.match(html, /too_big/);
  assert.doesNotMatch(html, /AI read/);
  assert.doesNotMatch(html, /0 times/);
});

test("failed sales fetches do not render zero totals", () => {
  const orders = interpretOrdersResponse(false, { error: "Stripe not configured" });
  const blueprint = interpretBlueprintResponse(false, { error: "Unauthorized" });
  assert.equal(orders.state, "error");
  assert.equal(blueprint.state, "error");
  assert.equal(interpretOrdersResponse(true, { orders: [] }).state, "ready");
  const failed = renderToStaticMarkup(createElement(SalesStats, { orders, blueprint }));
  assert.match(failed, /Sales stats are unavailable/);
  assert.match(failed, /Stripe not configured/);
  assert.match(failed, /Blueprint stats are unavailable/);
  assert.doesNotMatch(failed, /\$0/);
  assert.doesNotMatch(failed, /Collected revenue/);

  const ready = renderToStaticMarkup(createElement(SalesStats, {
    orders: { state: "ready", data: [{ kind: "lex_subscription", amountTotal: 4900, monthlyAmount: 4900, createdAt: 1, statusLabel: "active" }] },
    blueprint: { state: "ready", data: { todayCount: 1, todayRevenue: 100, weekCount: 1, weekRevenue: 100, allCount: 2, allRevenue: 200 } },
  }));
  assert.match(ready, /Collected revenue/);
  assert.match(ready, /\$49/);
});

test("tracking posts are relative, and apex and www are one analytics host", () => {
  for (const file of [
    "lib/analytics.ts",
    "lib/marketing/browser.ts",
    "app/components/exp/ExpBeacon.tsx",
    "app/components/AnnouncementBar.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /["'`]\/api\/(analytics|marketing\/event|exp\/event)["'`]/);
    assert.doesNotMatch(source, /https:\/\/saabai\.ai\/api/);
  }
  assert.equal(gaHostMode("saabai.ai"), "prod");
  assert.equal(gaHostMode("www.saabai.ai"), "prod");
  const sites = buildAnalyticsSites({ sites: [] });
  assert.equal(siteKeyForRequest("saabai.ai", "/", sites), "saabai");
  assert.equal(siteKeyForRequest("www.saabai.ai", "/blueprint", sites), "saabai");
});
