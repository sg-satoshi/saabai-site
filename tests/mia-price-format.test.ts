import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatAud, formatPrices } from "../lib/money";
import { createDashFilter } from "../lib/no-dashes";
import { renderOffersForPrompt } from "../lib/mia-offers";
import { CTA_META } from "../lib/mia-cta";

test("formatAud uses the $2,000 house style", () => {
  assert.equal(formatAud(2000), "$2,000");
  assert.equal(formatAud(1497), "$1,497");
  assert.equal(formatAud(497), "$497");
  assert.equal(formatAud(124800), "$124,800");
  assert.equal(formatAud(12.5), "$12.50");
});

test("formatPrices adds commas to bare dollar amounts only", () => {
  assert.equal(formatPrices("It's $2000 to build, then $100/month."), "It's $2,000 to build, then $100/month.");
  assert.equal(formatPrices("$12480.50 a year"), "$12,480.50 a year");
  assert.equal(formatPrices("Already $2,000 and $1,497."), "Already $2,000 and $1,497.");
  assert.equal(formatPrices("Founded in 2024 with 1500 clients"), "Founded in 2024 with 1500 clients");
});

test("streamed filter formats an amount split across chunks", () => {
  const f = createDashFilter({ prices: true });
  const out = ["Presence is $2", "0", "00 one", "-off, then $1", "00/month \u2014 GST not applicable."].map((c) => f.push(c)).join("") + f.flush();
  assert.equal(out, "Presence is $2,000 one-off, then $100/month, GST not applicable.");
});

test("filter without prices option leaves amounts alone", () => {
  const f = createDashFilter();
  assert.equal(f.push("$2000 ok") + f.flush(), "$2000 ok");
});

test("prompt and CTA show prices as $2,000", () => {
  const p = renderOffersForPrompt();
  for (const s of ["$2,000", "$4,000", "$6,500", "$1,497", "$3,500"]) assert.ok(p.includes(s), s);
  assert.ok(!/\$\d{4}/.test(p));
  assert.ok(CTA_META.websites.sub.includes("$2,000"));
});

test("chat UI no longer says it usually replies within a minute", () => {
  const src = readFileSync(new URL("../app/components/ChatWidget.tsx", import.meta.url), "utf8");
  assert.ok(!/replies within a minute/i.test(src));
});
