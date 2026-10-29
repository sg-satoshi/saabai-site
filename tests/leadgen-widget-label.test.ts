import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { widgetButtonLabel, escapeHtml } from "../lib/leadgen-widget-label";

test("current 24/7 clients and missing clients keep the old label", () => {
  assert.equal(widgetButtonLabel({ businessHours: "24/7" }), "24/7 Emergency Help");
  assert.equal(widgetButtonLabel(null), "24/7 Emergency Help");
});
test("custom label wins, other hours get a neutral label", () => {
  assert.equal(widgetButtonLabel({ businessHours: "24/7", widgetButtonLabel: " Book a plumber " }), "Book a plumber");
  assert.equal(widgetButtonLabel({ businessHours: "Mon-Fri 7am-5pm" }), "Chat with us");
});
test("label is escaped and no longer hardcoded", () => {
  assert.equal(escapeHtml(`<b>"x"</b>`), "&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  assert.doesNotMatch(readFileSync("app/api/leadgen/widget/route.ts", "utf8"), /24\/7 Emergency Help/);
});
