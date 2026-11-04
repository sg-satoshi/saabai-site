import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sunderReferralRoute } from "../lib/sunder-factory-seed";
import { referralLinkKey } from "../lib/email/ops";
import { referralLinkMessage } from "../lib/email/message";
import { formRuleFor } from "../lib/form-guard";

test("/referrals maps to the check page; /r/<code> still maps", () => {
  assert.equal(sunderReferralRoute("/referrals"), "/sunder-ref");
  assert.equal(sunderReferralRoute("/r/abc123xy"), "/sunder-ref/abc123xy");
});

test("referral-link route is neutral and rate limited", () => {
  const r = readFileSync("app/api/sunder-waitlist/referral-link/route.ts", "utf8");
  assert.equal((r.match(/Response\.json\(\{ ok: true, message: NEUTRAL \}/g) || []).length, 1);
  assert.doesNotMatch(r, /status: 4(00|04)/);
  assert.equal(formRuleFor("/api/sunder-waitlist/referral-link")!.limit, 5);
  const a = referralLinkKey("A@x.co", new Date("2026-11-04T01:00:00Z"));
  assert.equal(a, referralLinkKey("a@x.co", new Date("2026-11-04T07:59:00Z")));
  assert.notEqual(a, referralLinkKey("a@x.co", new Date("2026-11-04T08:00:00Z")));
});

test("referral link email carries the status link", () => {
  const m = referralLinkMessage("https://sunder.com.au/r/abc123xy");
  assert.match(m.html, /href="https:\/\/sunder\.com\.au\/r\/abc123xy"/);
});

test("home footer links to Check my referrals", () => {
  assert.match(readFileSync("public/clients/sunder/index.html", "utf8"), /<a href="\/referrals">Check my referrals<\/a>/);
});
