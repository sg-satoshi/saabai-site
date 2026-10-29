/**
 * llms.txt price and refund lines must match the live terms page.
 *   npx tsx --test tests/llms-terms.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARE_PLAN_CANCELLATION } from "../lib/care-faqs";

const terms = readFileSync("app/terms/page.tsx", "utf8");
const llms = readFileSync("public/llms.txt", "utf8");

const PRICE =
  "Prices are in Australian dollars. Saabai is not registered for GST, so GST is not applicable and invoices are not tax invoices.";
const REFUNDS =
  "Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms limits those rights. If something is not right, email us and we will work with you to fix it.";
const LIABILITY =
  "To the extent the law allows, our liability is limited to resupplying the service or refunding the amount paid for it. We do not guarantee particular search rankings, traffic or sales results.";

test("llms.txt copies the terms price, cancellation and refund sentences", () => {
  assert.match(terms, /CARE_PLAN_CANCELLATION/);
  assert.ok(terms.includes(PRICE));
  assert.ok(terms.includes(REFUNDS));
  assert.ok(terms.includes(LIABILITY));
  for (const line of [PRICE, CARE_PLAN_CANCELLATION, REFUNDS, LIABILITY]) {
    assert.ok(llms.includes(line), line);
  }
});

test("llms.txt keeps published prices and does not revive held claims", () => {
  assert.match(llms, /Starter \$497/);
  assert.match(llms, /Pro \$1,497/);
  assert.match(llms, /Business \$3,500/);
  assert.match(llms, /Presence \$100\/month/);
  assert.match(llms, /Growth \$200\/month/);
  assert.match(llms, /Signature \$300\/month/);
  assert.match(llms, /Presence from \$2,000/);
  assert.match(llms, /Growth from \$4,000/);
  assert.match(llms, /Signature from \$6,500/);
  assert.match(llms, /Firm plan is \$299 a month/);
  assert.match(llms, /within 1 business day/);
  assert.match(llms, /Rex Plastics/);
  assert.match(llms, /plasticonline\.com\.au/);
  assert.doesNotMatch(llms, /Tributum|home-based|Holland Plastics|free trial|14-day trial|Blueprint is free/i);
  assert.doesNotMatch(llms, /If work on a service has not begun/);
  assert.doesNotMatch(llms, /change-of-mind refunds/);
});
