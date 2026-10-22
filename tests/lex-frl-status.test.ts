/**
 * checkLegislationStatus: only Act titles leave Lex, errors and timeouts degrade gracefully.
 *   npx tsx --test tests/lex-frl-status.test.ts
 * Mock fetch only, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLegislationStatus, cleanActName } from "../lib/lex-tools";

const ok = (value: unknown[]) => (async () => new Response(JSON.stringify({ value }), { status: 200 })) as unknown as typeof fetch;

test("refuses anything that is not an Act title, without calling the network", async () => {
  let called = false;
  const f = (async () => { called = true; return new Response("{}"); }) as unknown as typeof fetch;
  for (const bad of ["{{PERSON_1}} Act", "john@example.com Act", "Smith v Jones", "", "https://x Act"]) {
    const r = await checkLegislationStatus(bad, f);
    assert.ok(r.error);
    assert.equal(r.acts.length, 0);
  }
  assert.equal(called, false);
  assert.equal(cleanActName(" Privacy  Act 1988 "), "Privacy Act 1988");
});

test("maps status, renames and pending amendments", async () => {
  const r = await checkLegislationStatus("Trade Practices Act 1974", ok([{ id: "C2004A00109", name: "Competition and Consumer Act 2010", status: "InForce", isInForce: true, isPrincipal: true, hasCommencedUnincorporatedAmendments: true, nameHistory: [{ name: "Trade Practices Act 1974" }], statusHistory: [{ status: "InForce", start: "1974-08-24T00:00:00" }], statusPossibleFuture: [] }]));
  const a = r.acts[0];
  assert.equal(a.formerName, "Trade Practices Act 1974");
  assert.equal(a.url, "https://www.legislation.gov.au/C2004A00109/latest/text");
  assert.match(r.results[0].snippet, /Renamed/);
  assert.match(r.results[0].snippet, /not yet incorporated/);
});

test("escapes quotes in the OData filter", async () => {
  let url = "";
  const f = (async (u: string) => { url = u; return new Response(JSON.stringify({ value: [] })); }) as unknown as typeof fetch;
  await checkLegislationStatus("Workers' Compensation Act 1912", f);
  assert.match(new URL(url).searchParams.get("$filter") ?? "", /contains\(name,'Workers'' Compensation Act 1912'\)/);
});

test("HTTP errors and timeouts return an error, never throw", async () => {
  const r1 = await checkLegislationStatus("Privacy Act 1988", (async () => new Response("x", { status: 503 })) as unknown as typeof fetch);
  assert.match(r1.error ?? "", /503/);
  const r2 = await checkLegislationStatus("Privacy Act 1988", (async () => { const e = new Error("t"); e.name = "TimeoutError"; throw e; }) as unknown as typeof fetch);
  assert.match(r2.error ?? "", /timed out/);
});
