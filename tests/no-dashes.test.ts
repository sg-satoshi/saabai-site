import test from "node:test";
import assert from "node:assert/strict";
import { noDashes, createDashFilter, noDashesTransform, NO_DASH_RULE } from "../lib/no-dashes";

test("clause dashes become commas", () => {
  assert.equal(noDashes("Yeah — that's a messy one"), "Yeah, that's a messy one");
  assert.equal(noDashes("Yeah—that's a messy one"), "Yeah, that's a messy one");
  assert.equal(noDashes("Quick one – what do you do?"), "Quick one, what do you do?");
});

test("ranges and compounds become hyphens", () => {
  assert.equal(noDashes("2–4 weeks"), "2-4 weeks");
  assert.equal(noDashes("9 — 5"), "9-5");
  assert.equal(noDashes("Gold Coast–Brisbane"), "Gold Coast-Brisbane");
});

test("end of sentence and bullets", () => {
  assert.equal(noDashes("That's the one —"), "That's the one.");
  assert.equal(noDashes("Done —\nNext"), "Done.\nNext");
  assert.equal(noDashes("— first\n— second"), "- first\n- second");
  assert.equal(noDashes("Fair —."), "Fair.");
  assert.equal(noDashes("CITATIONS -- NON-NEGOTIABLE"), "CITATIONS, NON-NEGOTIABLE");
  assert.equal(noDashes("DRAFT -- Please review"), "DRAFT, Please review");
  assert.equal(noDashes("9 -- 5"), "9-5");
  assert.ok(!/[\u2012-\u2015]| -- /.test(noDashes("a -- b — c")));
});

test("text without dashes and plain hyphens is untouched", () => {
  for (const s of ["No dashes here.", "A well-known, low-cost plan", "$2,000 + $100/mo", ""]) assert.equal(noDashes(s), s);
});

test("no em or en dash survives anything", () => {
  const samples = ["a—b", "a — b — c", "—", "– –", "x –", "1—", "end—", "a\u2015b", "a \u2012 b"];
  for (const s of samples) assert.ok(!/[\u2012-\u2015]/.test(noDashes(s)), `${s} -> ${noDashes(s)}`);
});

test("streaming: dash split across chunks", () => {
  const run = (chunks: string[]) => { const f = createDashFilter(); return chunks.map((c) => f.push(c)).join("") + f.flush(); };
  assert.equal(run(["Yeah ", "— that's ", "fair"]), "Yeah, that's fair");
  assert.equal(run(["Yeah —", " that's fair"]), "Yeah, that's fair");
  assert.equal(run(["2", "–", "4 weeks"]), "2-4 weeks");
  assert.equal(run(["Done ", "—"]), "Done.");
  assert.equal(run(["Hello ", "there ", "friend"]), "Hello there friend");
});

test("AI SDK transform rewrites text deltas and flushes at text-end", async () => {
  const parts = [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", text: "Short answer " },
    { type: "text-delta", id: "t1", text: "— yes. It takes 2–4 " },
    { type: "text-delta", id: "t1", text: "weeks —" },
    { type: "text-end", id: "t1" },
    { type: "tool-call", toolCallId: "x" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = (noDashesTransform() as any)({ tools: {}, stopStream: () => {} }) as TransformStream;
  const out: { type: string; text?: string }[] = [];
  const w = ts.writable.getWriter();
  const reader = ts.readable.getReader();
  const done = (async () => { for (;;) { const r = await reader.read(); if (r.done) break; out.push(r.value); } })();
  for (const p of parts) await w.write(p);
  await w.close();
  await done;
  const text = out.filter((p) => p.type === "text-delta").map((p) => p.text).join("");
  assert.equal(text, "Short answer, yes. It takes 2-4 weeks.");
  assert.deepEqual(out.map((p) => p.type).filter((t) => t !== "text-delta"), ["text-start", "text-end", "tool-call"]);
});

test("prompt rule exists", () => { assert.match(NO_DASH_RULE, /Never use em dashes/); });

test("Mia: prompt rule, stream transform wired, no dashes in static copy", async () => {
  const { readFileSync } = await import("node:fs");
  const { SYSTEM_PROMPT } = await import("../lib/chat-prompt");
  assert.ok(SYSTEM_PROMPT.includes(NO_DASH_RULE));
  assert.ok(!/[\u2013\u2014]/.test(SYSTEM_PROMPT));
  assert.match(readFileSync("app/api/chat/route.ts", "utf8"), /experimental_transform: noDashesTransform\((\{ prices: true \})?\)/);
  const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  for (const f of ["app/components/ChatWidget.tsx", "app/api/chat/route.ts", "lib/mia-offers.ts", "lib/mia-cta.ts", "lib/mia-nudge.ts"]) {
    assert.ok(!/[\u2013\u2014]/.test(strip(readFileSync(f, "utf8"))), f);
  }
});
