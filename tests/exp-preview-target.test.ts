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
