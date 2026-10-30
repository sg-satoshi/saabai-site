import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  lexDemoAllowed, lexDemoEnabled, isLexDemoIdentity, LEX_DEMO_ACTOR_EMAIL, LEX_DEMO_FIRM_KEY, LEX_DEMO_LABEL,
} from "../lib/lex-demo-config";
import { authenticateLexDemo, lexDemoSeed } from "../lib/lex-demo";
import { isDemoFirm } from "../lib/lex-subscription";
import { firmKeyForEmail } from "../lib/lex-review-access";

test("demo is off unless both env vars are set, and checks the env password", async () => {
  assert.equal(lexDemoEnabled({}), false);
  assert.equal(lexDemoEnabled({ LEX_DEMO_EMAIL: "d@x.test" }), false);
  const env = { LEX_DEMO_EMAIL: "Demo@X.test", LEX_DEMO_PASSWORD: "correct horse" };
  assert.equal(await authenticateLexDemo("demo@x.test", "correct horse", env), "lex-demo");
  assert.equal(await authenticateLexDemo("demo@x.test", "wrong", env), null);
  assert.equal(await authenticateLexDemo("other@x.test", "correct horse", env), null);
  assert.equal(await authenticateLexDemo("demo@x.test", "correct horse", {}), null);
});

test("demo identity uses a reserved, undeliverable domain and its own firm key", () => {
  assert.match(LEX_DEMO_ACTOR_EMAIL, /\.example$/);
  assert.equal(firmKeyForEmail(LEX_DEMO_ACTOR_EMAIL), LEX_DEMO_FIRM_KEY);
  assert.equal(LEX_DEMO_LABEL, "Demo, fictional data");
});

test("read-mostly allowlist: Lex reads and research allowed; billing, sends, team, deletes, admin refused", () => {
  for (const [m, p] of [["GET", "/lex"], ["GET", "/api/lex-matters"], ["GET", "/api/lex-threads"], ["PUT", "/api/lex-threads"], ["POST", "/api/lex-research"], ["POST", "/api/lex-draft"], ["GET", "/api/lex-me"]]) {
    assert.equal(lexDemoAllowed(m, p), true, `${m} ${p}`);
  }
  for (const [m, p] of [["POST", "/api/lex/billing-portal"], ["GET", "/lex/billing"], ["POST", "/api/lex/team"], ["POST", "/api/lex-send"], ["POST", "/api/lex-review-submit"], ["POST", "/api/lex-flag"], ["POST", "/api/lex-settings"], ["POST", "/api/lex-upload-token"], ["POST", "/api/lex/signup"], ["DELETE", "/api/lex-matters/HV-2026-0001"], ["DELETE", "/api/lex-matters/HV-2026-0001/items"], ["GET", "/saabai-admin"], ["GET", "/api/admin/lex-demo-reset"], ["POST", "/api/stripe/webhook"], ["POST", "/api/auth/change-password"], ["GET", "/client-portal"], ["GET", "/dashboard"]]) {
    assert.equal(lexDemoAllowed(m, p), false, `${m} ${p}`);
  }
});

test("the lex-grace sweeps skip the demo firm", () => {
  assert.equal(isDemoFirm({ firmId: "lf_real1", adminEmail: LEX_DEMO_ACTOR_EMAIL }), true);
  assert.equal(isDemoFirm({ firmId: "lf_demo", adminEmail: "a@b.com" }), true);
  assert.equal(isDemoFirm({ firmId: "lf_abc", adminEmail: "a@realfirm.com.au" }), false);
  assert.equal(isLexDemoIdentity("harbourvale.example"), true);
  const src = readFileSync("lib/lex-subscription.ts", "utf8");
  assert.equal((src.match(/if \(isDemoFirm\(f0\)\) continue;/g) || []).length, 2, "both sweepGrace and sweepDataRetention skip it");
});

test("seed is fictional and complete: matters, trust deed draft, research history", () => {
  const s = lexDemoSeed(new Date("2026-10-30T00:00:00Z"));
  assert.equal(s.matters.length, 3);
  const all = JSON.stringify(s);
  assert.match(all, /DISCRETIONARY TRUST DEED/);
  assert.match(all, /discretionary-trust-deed/);
  assert.ok(s.threads.length >= 2);
  assert.ok(s.matters.every((m) => /fictional/i.test(m.description)));
  assert.doesNotMatch(all, /@(?!harbourvale\.example)[a-z0-9.-]+\.[a-z]{2,}/i, "no real email addresses");
  for (const m of s.matters) assert.equal(m.itemCount, (s.items[m.id] ?? []).length);
});

test("demo is not a firm record, directory user or Stripe customer, and is labelled in the UI", () => {
  const demo = readFileSync("lib/lex-demo.ts", "utf8");
  assert.doesNotMatch(demo, /lex:firm:|saveFirm|saveDirectoryUser|stripe|sendEmail|resend/i);
  assert.match(readFileSync("app/lex/page.tsx", "utf8"), /lex-demo-banner/);
  assert.match(readFileSync("vercel.json", "utf8"), /\/api\/cron\/lex-demo-reset/);
});
