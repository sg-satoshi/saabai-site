import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { widgetButtonLabel, escapeHtml, isAllHours } from "../lib/leadgen-widget-label";

test("24/7 clients keep the old label, missing or failed lookups get the neutral one", () => {
  assert.equal(widgetButtonLabel({ businessHours: "24/7" }), "24/7 Emergency Help");
  assert.equal(widgetButtonLabel(null), "Chat with us");
  assert.equal(widgetButtonLabel(undefined), "Chat with us");
});
test("businessHours starting with 24/7 counts as 24/7", () => {
  assert.equal(widgetButtonLabel({ businessHours: "24/7 \u2014 emergency callouts available" }), "24/7 Emergency Help");
  assert.equal(widgetButtonLabel({ businessHours: "  24/7 emergency" }), "24/7 Emergency Help");
  assert.equal(isAllHours("24/7"), true);
  assert.equal(isAllHours("Mon-Fri, 24/7 on call"), false);
  assert.equal(isAllHours("24 / 7"), false);
  assert.equal(isAllHours(undefined), false);
});
test("custom label wins, other hours get a neutral label", () => {
  assert.equal(widgetButtonLabel({ businessHours: "24/7", widgetButtonLabel: " Book a plumber " }), "Book a plumber");
  assert.equal(widgetButtonLabel({ businessHours: "Mon-Fri 7am-5pm" }), "Chat with us");
});
test("40 char cap does not split emoji", () => {
  const label = widgetButtonLabel({ widgetButtonLabel: "a".repeat(39) + "\u{1F527}\u{1F527}" });
  assert.equal(Array.from(label).length, 40);
  assert.ok(label.endsWith("\u{1F527}"));
  assert.doesNotMatch(label, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});
test("failed lookups are not cached for long", () => {
  const src = readFileSync("app/api/leadgen/widget/route.ts", "utf8");
  assert.match(src, /max-age=60, s-maxage=60/);
});
test("label is escaped and no longer hardcoded", () => {
  assert.equal(escapeHtml(`<b>"x"</b>`), "&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  assert.doesNotMatch(readFileSync("app/api/leadgen/widget/route.ts", "utf8"), /24\/7 Emergency Help/);
});
