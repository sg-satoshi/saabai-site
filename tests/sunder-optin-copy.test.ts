import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmMessage, renderMarketingEmail } from "../lib/email/message";

test("SUNDER opt-in email uses the approved copy and button", () => {
  const m = confirmMessage();
  assert.match(m.html, /Hi \{\{firstName\|there\}\},/);
  assert.ok(m.html.includes("Tap confirm and you&#39;re on the SUNDER list.") || m.html.includes("Tap confirm and you're on the SUNDER list."));
  assert.ok(m.html.includes("member offers and our giveaways."));
  assert.ok(m.html.includes(">Confirm my spot</a>"));
  assert.doesNotMatch(m.html, /Confirm this address|Until you confirm|Confirm your email<\/a>/);
  assert.doesNotMatch(m.html, /\u2014/);
});
