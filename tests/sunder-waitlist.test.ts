/**
 * SUNDER waitlist: validation, honeypot, dedupe, referral cap, CSV. No network: the store is mocked.
 * Run: npx tsx --test tests/sunder-waitlist.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  creditReferral, needsReferralReview, hashToken, signup, toCsv, updatePatch, validateSignup, validateUpdate,
  type SignupRow, type WaitlistStore,
} from "../lib/sunder-waitlist";

/** In-memory mirror of the sunder_signup SQL function. */
function memStore() {
  const rows = new Map<string, SignupRow & { entries: number }>();
  const store: WaitlistStore = {
    async signup(r) {
      const ex = rows.get(r.p_email);
      if (ex) return { referral_code: ex.p_referral_code, created: false };
      rows.set(r.p_email, { ...r, entries: 0 });
      if (r.p_referred_by) for (const x of rows.values()) if (x.p_referral_code === r.p_referred_by) x.entries = creditReferral(x.entries, r.p_referred_by, r.p_referral_code);
      return { referral_code: r.p_referral_code, created: true };
    },
    async update(h) { return [...rows.values()].some((x) => x.p_update_token_hash === h); },
  };
  return { rows, store };
}
const meta = { ipHash: "abc", userAgent: "ua" };
const ok = (b: unknown) => { const v = validateSignup(b); assert.ok(v.ok); return v.input; };

test("signup validation", () => {
  assert.equal(validateSignup({ firstName: "", email: "a@b.co" }).ok, false);
  assert.equal(validateSignup({ firstName: "Sam", email: "nope" }).ok, false);
  assert.equal(validateSignup({ firstName: "x".repeat(61), email: "a@b.co" }).ok, false);
  assert.equal(validateSignup(null).ok, false);
  const i = ok({ firstName: " Sam<b> ", email: " Sam@Example.COM ", h: 2, ref: "AB23CDEF", utm: { source: "ig" } });
  assert.equal(i.firstName, "Samb");
  assert.equal(i.email, "sam@example.com");
  assert.equal(i.headline, 2);
  assert.equal(i.referredBy, "ab23cdef");
  assert.equal(i.utm.source, "ig");
  assert.equal(ok({ firstName: "A", email: "a@b.co", h: 9, ref: "x;drop" }).headline, null);
  assert.equal(ok({ firstName: "A", email: "a@b.co", ref: "x;drop" }).referredBy, null);
});

test("honeypot is flagged as a bot", () => {
  const v = validateSignup({ firstName: "Sam", email: "a@b.co", website: "spam.com" });
  assert.equal(v.ok, false);
  assert.equal(!v.ok && v.bot, true);
});

test("dedupe returns the existing code and no token", async () => {
  const { rows, store } = memStore();
  const a = await signup(store, ok({ firstName: "Sam", email: "sam@x.co" }), meta);
  assert.ok(a.token);
  const b = await signup(store, ok({ firstName: "Other", email: "SAM@x.co" }), meta);
  assert.equal(b.ref, a.ref);
  assert.equal(b.token, null);
  assert.equal(rows.size, 1);
  assert.equal(rows.get("sam@x.co")!.p_first_name, "Sam");
  assert.equal(rows.get("sam@x.co")!.p_update_token_hash, hashToken(a.token!));
});

test("referral entries are uncapped and never self-credit", async () => {
  const { rows, store } = memStore();
  const ref = (await signup(store, ok({ firstName: "R", email: "r@x.co" }), meta)).ref;
  for (let n = 0; n < 15; n++) await signup(store, ok({ firstName: "F", email: `f${n}@x.co`, ref }), meta);
  await signup(store, ok({ firstName: "F", email: "f0@x.co", ref }), meta); // repeat: no credit
  assert.equal(rows.get("r@x.co")!.entries, 15);
  assert.equal(creditReferral(3, "abc", "abc"), 3);
  assert.equal(creditReferral(10, "abc", "def"), 11);
  assert.equal(needsReferralReview(25), false);
  assert.equal(needsReferralReview(26), true);
  assert.equal(creditReferral(0, null, "def"), 0);
});

test("thank-you update needs a token, and a mobile needs SMS consent", () => {
  const t = "a".repeat(43);
  assert.equal(validateUpdate({ token: "short", launchPref: "unsure" }).ok, false);
  assert.equal(validateUpdate({ token: t }).ok, false);
  assert.equal(validateUpdate({ token: t, launchPref: "free" }).ok, false);
  assert.equal(validateUpdate({ token: t, mobile: "0412 345 678" }).ok, false);
  assert.equal(validateUpdate({ token: t, mobile: "abc", smsConsent: true }).ok, false);
  const v = validateUpdate({ token: t, mobile: "0412 345 678", smsConsent: true, launchPref: "subscription" });
  assert.ok(v.ok);
  const p = updatePatch(v.input, new Date("2026-11-01T00:00:00Z"));
  assert.equal(p.mobile, "0412345678");
  assert.equal(p.sms_consent, true);
  assert.equal(p.launch_pref, "subscription");
});

test("CSV escapes quotes and formula injection", () => {
  const csv = toCsv([{ first_name: '=HYPERLINK("x")', email: "a@b.co", referral_entries: 3 }]);
  assert.match(csv, /^created_at,first_name,email/);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
});

test("migration: RLS on, unique email + code, cap 10, service role only", () => {
  const sql = readFileSync("db/migrations/008_sunder_waitlist.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /unique index if not exists sunder_subscribers_email_key/);
  assert.match(sql, /unique index if not exists sunder_subscribers_ref_key/);
  assert.match(sql, /referral_entries between 0 and 10/);
  assert.match(sql, /least\(s\.referral_entries \+ 1, 10\)/);
  assert.match(sql, /grant execute on function sunder_signup to service_role/);
});

test("page posts only to the waitlist API and keeps noindex", () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  const apis = [...html.matchAll(/'\/api\/[^']*'/g)].map((m) => m[0]);
  assert.deepEqual([...new Set(apis)].sort(), ["'/api/sunder-waitlist'", "'/api/sunder-waitlist/update'"]);
  assert.match(html, /content="noindex, nofollow"/);
  assert.match(html, /name="website"/);
  assert.equal(/Waitlist opens shortly/.test(html), false);
});

test("sunder ships its own favicons and the host serves them", async () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  for (const f of ["icon-192-maskable.png", "icon-512-maskable.png"]) {
    assert.ok(readFileSync(`public/clients/sunder/${f}`).length > 0, f);
  }
  assert.equal(/favicon\.svg/.test(html), false);
  for (const f of ["favicon.ico", "favicon-16.png", "favicon-48.png", "apple-touch-icon-180.png", "site.webmanifest"]) {
    assert.ok(readFileSync(`public/clients/sunder/${f}`).length > 0, f);
    assert.match(html, new RegExp(`href="/clients/sunder/${f.replace(".", "\\.")}(\\?v=[\\w-]+)?"`));
  }
  process.env.UPSTASH_REDIS_REST_URL ||= "http://127.0.0.1:9";
  process.env.UPSTASH_REDIS_REST_TOKEN ||= "test";
  process.env.SAABAI_SESSION_SECRET ||= "test-secret-test-secret-test-secret-1234";
  process.env.PORTAL_SESSION_SECRET ||= "portal-test-secret-portal-test-secret";
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../proxy");
  assert.equal(/favicon\.svg/.test(html), false);
  const res = await proxy(new NextRequest("https://sunder.com.au/favicon.ico", { headers: { host: "sunder.com.au" } }));
  assert.match(res.headers.get("x-middleware-rewrite") ?? "", /\/clients\/sunder\/favicon\.ico$/);
});

test("signup mobile is optional, validated, entering it is the SMS opt-in, new rows only", async () => {
  assert.equal(ok({ firstName: "Sam", email: "a@b.co" }).mobile, null);
  assert.equal(ok({ firstName: "Sam", email: "a@b.co", mobile: "  " }).mobile, null);
  assert.equal(ok({ firstName: "Sam", email: "a@b.co", mobile: "0412 345 678" }).mobile, "0412345678");
  assert.equal(validateSignup({ firstName: "Sam", email: "a@b.co", mobile: "12ab" }).ok, false);
  const patches: Record<string, unknown>[] = [];
  const { store } = memStore();
  const s: WaitlistStore = { signup: store.signup, async update(h, p) { patches.push(p); return store.update(h, p); } };
  await signup(s, ok({ firstName: "M", email: "m@x.co", mobile: "+61412345678" }), meta);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].mobile, "+61412345678");
  assert.equal(patches[0].sms_consent, true);
  assert.equal(typeof patches[0].sms_consent_at, "string");
  assert.match(String(patches[0].sms_consent_text), /^Signup form: .*Reply STOP to opt out\.$/);
  await signup(s, ok({ firstName: "M", email: "m@x.co", mobile: "0499999999" }), meta); // repeat email
  await signup(s, ok({ firstName: "N", email: "n@x.co" }), meta); // no mobile
  assert.equal(patches.length, 1);
});

test("page asks for optional mobile on signup and labels it as the SMS opt-in, no thank-you SMS step", () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  assert.match(html, /id="mob0"/);
  assert.match(html, /Mobile <span class="opt">\(optional\): for a launch-day text and SMS-only offers<\/span>/);
  assert.match(html, /<input type="tel" id="mob0" autocomplete="tel" inputmode="tel">/);
  assert.equal(/\[(Privacy Policy|Giveaway terms)\]/.test(html), false);
  assert.match(html, /ABN&nbsp;44&nbsp;703&nbsp;735&nbsp;264/);
  const form = html.slice(html.indexOf('<form class="form"'), html.indexOf("</form>"));
  assert.equal(/smsok|type="checkbox"/.test(form), false);
  assert.equal(/smsok|addb|Want a text|smsb/.test(html), false);
  assert.equal(/href="#privacy"|href="#giveaway-terms"/.test(html), false);
  const thanks = html.slice(html.indexOf('<div class="done thanks">'), html.indexOf("</section>"));
  assert.equal(/privacy|giveaway-terms/i.test(form + thanks), false);
  assert.equal(/By joining|Unsubscribe|ABN/.test(form), false);
  const footer = html.slice(html.indexOf("footer:'"));
  assert.match(footer, /By joining, you agree to receive emails or SMS from Saabai Pty Ltd \(ABN&nbsp;44&nbsp;703&nbsp;735&nbsp;264\)/);
  assert.equal(/ABN 44/.test(html), false);
  assert.match(html, /href="\/privacy">Privacy</);
  assert.match(html, /href="\/giveaway-terms">Giveaway terms</);
  for (const f of ["privacy", "giveaway-terms"]) {
    const page = readFileSync(`public/clients/sunder/${f}.html`, "utf8");
    assert.match(page, /<meta name="robots" content="noindex">/);
    assert.match(page, /hello@sunder\.com\.au/);
    assert.equal(/\[[A-Z][A-Z ]+\]/.test(page), false);
  }
});
