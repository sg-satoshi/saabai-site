import test from "node:test";
import assert from "node:assert/strict";
import { resolvePreviewTarget } from "../lib/exp/overlay-dom";

// Minimal fakes: only what resolvePreviewTarget touches.
const mkDoc = (tagged: Record<string, unknown> = {}) => {
  const doc = { querySelector: (q: string) => { const m = q.match(/^\[data-exp-id="(.+)"\]$/); return m ? (tagged[m[1]] ?? null) : null; } } as unknown as Document;
  return doc;
};
const mkEl = (doc: Document, connected = true) => ({ ownerDocument: doc, isConnected: connected }) as unknown as HTMLElement;

test("preview uses the live selection in the shown frame", () => {
  const doc = mkDoc(); const el = mkEl(doc);
  assert.equal(resolvePreviewTarget(doc, el, "sunder-home-hero-headline"), el);
});

test("preview falls back to the tagged test element when the selection is gone or from an old frame (SUNDER)", () => {
  const doc = mkDoc(); const h1 = mkEl(doc);
  (doc as unknown as { querySelector: (q: string) => unknown }).querySelector = (q) => (q === '[data-exp-id="sunder-home-hero-headline"]' ? h1 : null);
  assert.equal(resolvePreviewTarget(doc, null, "sunder-home-hero-headline"), h1);
  const oldDoc = mkDoc();
  assert.equal(resolvePreviewTarget(doc, mkEl(oldDoc), "sunder-home-hero-headline"), h1);
  assert.equal(resolvePreviewTarget(doc, mkEl(doc, false), "sunder-home-hero-headline"), h1);
});

test("preview finds nothing without a frame, or with a bad id", () => {
  assert.equal(resolvePreviewTarget(null, null, "x"), null);
  assert.equal(resolvePreviewTarget(mkDoc(), null, 'x"],body,["'), null);
  assert.equal(resolvePreviewTarget(mkDoc(), null), null);
});

test("missing overlay targets give a clear warning, none when all found", async () => {
  const { missingTargetWarning, MISSING_TARGET_MSG } = await import("../lib/exp/overlay-dom");
  assert.equal(missingTargetWarning([]), null);
  const w = missingTargetWarning(["Get first hit text"])!;
  assert.ok(w.startsWith(MISSING_TARGET_MSG));
  assert.match(w, /Get first hit text/);
  assert.match(missingTargetWarning(["a", "b", "c", "d", "e"])!, /\+2 more/);
});

test("saved copy survives deselect; showing control clears it", async () => {
  const { rememberSaved, copyOnDeselect } = await import("../lib/exp/editor-dom");
  const kept = new WeakMap(); const tagline = {}; const headline = {};
  assert.equal(copyOnDeselect(kept, tagline), null);
  rememberSaved(kept, tagline, "text", { text: "New tagline" });
  assert.deepEqual(copyOnDeselect(kept, tagline), { kind: "text", v: { text: "New tagline", emphasis: undefined } });
  assert.equal(copyOnDeselect(kept, headline), null);
  rememberSaved(kept, tagline, "text", null);
  assert.equal(copyOnDeselect(kept, tagline), null);
});
