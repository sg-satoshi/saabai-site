import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanFormId, cleanPageUrl, confirmEvidencePatch, requestEvidence, EVIDENCE_COLUMNS } from "../lib/consent-evidence";
import { signup, validateSignup, type WaitlistStore } from "../lib/sunder-waitlist";

const req = (h: Record<string, string>) => new Request("https://www.saabai.ai/api/sunder-waitlist", { method: "POST", headers: h });

test("requestEvidence reads IP, UA and coarse Vercel geo only", () => {
  const ev = requestEvidence(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Mozilla/5.0", "x-vercel-ip-country": "AU", "x-vercel-ip-country-region": "QLD", "x-vercel-ip-city": "Gold%20Coast", "x-vercel-ip-latitude": "-28.0" }));
  assert.deepEqual(ev, { ip: "203.0.113.7", userAgent: "Mozilla/5.0", country: "AU", region: "QLD", city: "Gold Coast" });
  assert.equal(requestEvidence(req({ "x-forwarded-for": "<script>" })).ip, null);
});

test("page URL: body first, Referer fallback, http(s) only", () => {
  assert.equal(cleanPageUrl("https://sunder.com.au/?utm_source=ig", null), "https://sunder.com.au/?utm_source=ig");
  assert.equal(cleanPageUrl("javascript:alert(1)", "https://sunder.com.au/"), "https://sunder.com.au/");
  assert.equal(cleanPageUrl(null, null), null);
  assert.equal(cleanFormId("sunder-home-waitlist"), "sunder-home-waitlist");
  assert.equal(cleanFormId("Bad Form!"), null);
});

test("signup stores evidence on new rows only; failure never fails signup", async () => {
  const patches: Record<string, unknown>[] = [];
  let created = true;
  const store: WaitlistStore = {
    async signup() { return { referral_code: "abc234", created }; },
    async update(_t, p) { patches.push(p); if ("signup_ip" in p) throw new Error("column does not exist"); return true; },
  };
  const v = validateSignup({ firstName: "Sam", email: "s@x.co", page: "https://sunder.com.au/", form: "sunder-home-waitlist" });
  assert.ok(v.ok);
  const ev = { ip: "203.0.113.7", userAgent: "ua", country: "AU", region: "QLD", city: "Brisbane" };
  const r = await signup(store, v.input, { ipHash: "h", userAgent: "ua", evidence: ev });
  assert.ok(r.token);
  assert.deepEqual(patches[0], { signup_ip: "203.0.113.7", signup_country: "AU", signup_region: "QLD", signup_city: "Brisbane", page_url: "https://sunder.com.au/", form_id: "sunder-home-waitlist" });
  created = false; patches.length = 0;
  await signup(store, v.input, { ipHash: "h", userAgent: "ua", evidence: ev });
  assert.equal(patches.length, 0);
});

test("confirm patch and migration 015 columns line up", () => {
  const sql = readFileSync("db/migrations/015_sunder_consent_evidence.sql", "utf8");
  for (const c of Object.keys(confirmEvidencePatch({ ip: null, userAgent: null, country: null, region: null, city: null }))) assert.match(sql, new RegExp(`add column if not exists ${c} `));
  for (const c of EVIDENCE_COLUMNS.filter((c) => c.startsWith("signup_") || c === "page_url" || c === "form_id")) assert.match(sql, new RegExp(`add column if not exists ${c} `));
  assert.match(sql, /MUST RUN BEFORE MERGING/);
});

test("SUNDER form posts page and form id", () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  assert.match(html, /page:location\.href\.slice\(0,400\),form:'sunder-home-waitlist'/);
});
