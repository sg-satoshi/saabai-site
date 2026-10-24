import test from "node:test";
import assert from "node:assert/strict";
import { normalizeScope, filterToolsByScope, scopePrompt, scopeLabel, ALL_SCOPES } from "../lib/lex-scope";
import { applyStepPart, stepSummary, searchThreads, matchSnippet, mailtoHref, type LexStep } from "../lib/lex-steps";
import { normalizeFlag } from "../lib/lex-flag";

const TOOLS = Object.fromEntries(["searchAustLII", "searchATO", "searchLegislation", "searchStateLegislation", "verifySection", "searchART", "searchFairWork", "searchASIC", "searchInternational", "searchCorporationsLaw", "searchFamilyLaw", "captureMatter", "readSource"].map((k) => [k, {}]));

test("scope: invalid or empty means all sources", () => {
  assert.deepEqual(normalizeScope(undefined), ALL_SCOPES);
  assert.deepEqual(normalizeScope([]), ALL_SCOPES);
  assert.deepEqual(normalizeScope(["nope"]), ALL_SCOPES);
  assert.deepEqual(normalizeScope(["ato", "cases", "x"]), ["cases", "ato"]);
  assert.equal(scopePrompt(ALL_SCOPES), "");
  assert.equal(scopeLabel(ALL_SCOPES), "Sources: All");
});

test("scope: drops search tools outside the scope, keeps non-search tools", () => {
  const t = filterToolsByScope(TOOLS, ["ato"]);
  assert.deepEqual(Object.keys(t).sort(), ["captureMatter", "readSource", "searchATO"]);
  assert.equal(Object.keys(filterToolsByScope(TOOLS, ALL_SCOPES)).length, Object.keys(TOOLS).length);
  assert.match(scopePrompt(["cases", "ato"]), /Cases, ATO/);
  assert.equal(scopeLabel(["cases", "legislation"]), "Sources: Cases, Legislation");
});

test("steps: running, done with count, empty, failed; captureMatter hidden", () => {
  let s: LexStep[] = [];
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "a", toolName: "searchAustLII" });
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "b", toolName: "searchATO" });
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "c", toolName: "readSource" });
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "m", toolName: "captureMatter" });
  assert.equal(s.length, 3);
  assert.equal(s[0].status, "running");
  s = applyStepPart(s, { type: "tool-output-available", toolCallId: "a", output: { results: [1, 2, 3] } });
  s = applyStepPart(s, { type: "tool-output-available", toolCallId: "b", output: { results: [] } });
  s = applyStepPart(s, { type: "tool-output-available", toolCallId: "c", output: { ok: false, error: "x" } });
  assert.deepEqual(s.map((x) => x.status), ["done", "empty", "failed"]);
  assert.equal(s[0].count, 3);
  const same = applyStepPart(s, { type: "text-delta" });
  assert.equal(same, s);
  const sum = stepSummary(s);
  assert.equal(sum.failed, 1);
  assert.equal(sum.found, 3);
  assert.equal(sum.noResults, false);
});

test("steps: noResults when every search is empty or errored", () => {
  let s: LexStep[] = [];
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "a", toolName: "searchAustLII" });
  s = applyStepPart(s, { type: "tool-input-start", toolCallId: "b", toolName: "searchATO" });
  s = applyStepPart(s, { type: "tool-output-available", toolCallId: "a", output: { results: [] } });
  s = applyStepPart(s, { type: "tool-output-error", toolCallId: "b", errorText: "timeout" });
  assert.equal(stepSummary(s).noResults, true);
  assert.equal(stepSummary([]).noResults, false);
});

test("palette search: title matches first, then content; snippet and mailto", () => {
  const threads = [
    { id: "1", title: "Penalty remission", messages: [{ role: "user", content: "grounds for remission" }] },
    { id: "2", title: "Division 7A loans", messages: [{ role: "assistant", content: "A shortfall penalty may apply [[cite:S1|para 4]]" }] },
    { id: "3", title: "ART time limits", messages: [] },
  ];
  assert.deepEqual(searchThreads(threads, "penalty").map((t) => t.id), ["1", "2"]);
  assert.deepEqual(searchThreads(threads, "").map((t) => t.id), ["1", "2", "3"]);
  assert.deepEqual(searchThreads(threads, "zzz"), []);
  assert.ok(!matchSnippet(threads[1], "penalty").includes("[[cite"));
  const href = mailtoHref("Research", "x".repeat(5000));
  assert.ok(href.startsWith("mailto:?subject=Research&body="));
  assert.ok(decodeURIComponent(href).includes("Shortened"));
});

test("flag: requires a known reason and an answer, clips fields", () => {
  assert.equal(normalizeFlag(null), null);
  assert.equal(normalizeFlag({ reason: "bogus", answer: "a" }), null);
  assert.equal(normalizeFlag({ reason: "outdated", answer: "  " }), null);
  const f = normalizeFlag({ reason: "outdated", answer: "ans", note: "n".repeat(5000), question: 5 }, 1);
  assert.ok(f);
  assert.equal(f!.note.length, 1000);
  assert.equal(f!.question, "");
  assert.equal(f!.at, 1);
});
