import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmMessage, renderMarketingEmail } from "../lib/email/message";

test("SUNDER opt-in email uses the approved copy and button", () => {
  const m = confirmMessage();
  assert.match(m.html, /Hi \{\{firstName\|there\}\},/);
  assert.ok(m.html.includes("Tap the button below and you&#39;re on the SUNDER VIP list.") || m.html.includes("Tap the button below and you're on the SUNDER VIP list."));
  assert.ok(m.html.includes("the launch, offers and our giveaways."));
  assert.ok(m.html.includes(">Join the SUNDER VIP list</a>"));
  assert.doesNotMatch(m.html, /Confirm this address|Until you confirm|Confirm your email<\/a>/);
  assert.doesNotMatch(m.html, /\u2014/);
});
