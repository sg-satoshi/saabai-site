import { test } from "node:test";
import assert from "node:assert/strict";
import { lineTotal, numFieldText, numFromText, textFromNum } from "../lib/invoice-number-input";

/** Types into a field the way NumTxt does and returns what it shows and the stored number. */
function typeInto(stored: number | undefined, keys: string[]): { shown: string; stored: number } {
  let typed: string | undefined;
  let n = stored ?? 0;
  for (const v of keys) { typed = v; n = numFromText(v); }
  return { shown: numFieldText(typed, n), stored: n };
}

test("a field can be cleared and stays empty while typing", () => {
  assert.deepEqual(typeInto(8, ["", ""]), { shown: "", stored: 0 });
});

test("partial values like '1.', '.5' and '0.0' are kept while typing", () => {
  assert.deepEqual(typeInto(0, ["1", "1."]), { shown: "1.", stored: 1 });
  assert.deepEqual(typeInto(0, [".", ".5"]), { shown: ".5", stored: 0.5 });
  assert.deepEqual(typeInto(0, ["0", "0.", "0.0"]), { shown: "0.0", stored: 0 });
  assert.deepEqual(typeInto(0, ["0.0", "0.05"]), { shown: "0.05", stored: 0.05 });
});

test("blur tidies to the stored number; 0 shows empty", () => {
  assert.equal(textFromNum(numFromText("1.")), "1");
  assert.equal(textFromNum(numFromText("")), "");
  assert.equal(textFromNum(numFromText(".5")), "0.5");
});

test("a number changed elsewhere replaces stale typed text", () => {
  assert.equal(numFieldText("7.", 40), "40");
  assert.equal(numFieldText(undefined, 45), "45");
});

test("totals: hourly is hours x rate to the cent; fixed keeps its own total", () => {
  assert.equal(lineTotal({ hours: 7.5, rate: 45 }), 337.5);
  assert.equal(lineTotal({ hours: 0.333, rate: 40 }), 13.32);
  assert.equal(lineTotal({ hours: 0, rate: 40 }), 0);
  assert.equal(lineTotal({ type: "fixed", total: 1250.5 }), 1250.5);
  assert.equal(lineTotal({ type: "fixed" }), 0);
});
