import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskEmail, referralLineText } from "../lib/sunder-waitlist";
import { confirmMessage, withReferralLine } from "../lib/email/message";

const read = (p: string) => readFileSync(p, "utf8");

test("referral line shows counts only and caps entries", () => {
  assert.equal(referralLineText({ code: "abc234de", friends: 3, entries: 3 }), "Your link: https://sunder.com.au/?r=abc234de · 3 friends joined · 3/10 bonus entries");
  assert.equal(referralLineText({ code: "abc234de", friends: 12, entries: 10 }), "Your link: https://sunder.com.au/?r=abc234de · 12 friends joined · 10/10 bonus entries");
  assert.match(referralLineText({ code: "abc234de", friends: 1, entries: 1 }), /1 friend joined/);
});

test("referral line sits above the footer in the confirm email", () => {
  const html = withReferralLine(confirmMessage().html, referralLineText({ code: "abc234de", friends: 0, entries: 0 }));
  const at = html.indexOf("Your link: https://sunder.com.au/?r=abc234de");
  assert.ok(at > 0 && at < html.indexOf("<!--EMAIL_FOOTER-->"));
  assert.equal(withReferralLine("<p>x</p>", null), "<p>x</p>");
});

test("referred-by email is masked", () => {
  assert.equal(maskEmail("sam@example.com"), "s**@example.com");
  assert.equal(maskEmail("alexandra@x.io"), "a******@x.io");
  assert.equal(maskEmail(null), "");
});

test("front page keeps ?r= for 30 days and sends it at signup", () => {
  const h = read("public/clients/sunder/index.html");
  assert.match(h, /localStorage\.setItem\(REFK/);
  assert.match(h, /REFTTL=2592e6/);
  assert.match(h, /ref:REF0/);
});

test("migration 011 credits on confirm and blocks self-referral", () => {
  const m = read("db/migrations/011_sunder_referral_on_confirm.sql");
  const signup = m.slice(m.indexOf("create or replace function sunder_signup"), m.indexOf("create or replace function sunder_credit_referral"));
  assert.doesNotMatch(signup, /referral_entries/, "signup must not credit");
  assert.match(signup, /r\.ip_hash <> p_ip_hash/);
  assert.match(signup, /sunder_email_key\(r\.email\) <> sunder_email_key\(p_email\)/);
  assert.match(m, /perform sunder_credit_referral\(p_email\);/);
  assert.match(m, /least\(r\.referral_entries \+ 1, 10\)/);
  assert.match(m, /referral_credited_at is null/);
});
