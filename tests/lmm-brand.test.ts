import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { lmmBrandAsset } from "../lib/lmm-brand";

const ASSETS = path.join(__dirname, "..", "public", "clients", "lmm-site", "assets");

test("LMM host brand paths map to existing LMM assets", () => {
  const cases: Record<string, string> = {
    "/favicon.ico": "favicon.ico",
    "/favicon-32x32.png": "icon-192.png",
    "/apple-touch-icon.png": "apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png": "apple-touch-icon.png",
    "/apple-touch-icon-180x180.png": "apple-touch-icon.png",
    "/icon.svg": "favicon.svg",
    "/favicon.svg": "favicon.svg",
    "/icon-192.png": "icon-192.png",
    "/icon-512.png": "icon-512.png",
    "/android-chrome-512x512.png": "icon-512.png",
    "/site.webmanifest": "site.webmanifest",
    "/manifest.json": "site.webmanifest",
    "/manifest": "site.webmanifest",
    "/og-image.jpg": "og-image.jpg",
    "/opengraph-image": "og-image.jpg",
    "/twitter-image.png": "og-image.jpg",
  };
  for (const [p, f] of Object.entries(cases)) {
    assert.equal(lmmBrandAsset(p), f, p);
    assert.ok(existsSync(path.join(ASSETS, f)), `${f} exists`);
  }
  assert.equal(lmmBrandAsset("/"), null);
  assert.equal(lmmBrandAsset("/api/lmm-contact"), null);
});

test("LMM favicon set is square LMM artwork, not Saabai's", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (f: string) => readFileSync(path.join(ASSETS, f));
  const saabai = readFileSync(path.join(__dirname, "..", "public", "favicon.ico"));
  const ico = read("favicon.ico");
  assert.notDeepEqual(ico, saabai);
  // ICO header: reserved 0, type 1, then one 16-byte entry per image (width, height bytes).
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16]).sort((a, b) => a - b);
  assert.deepEqual(sizes, [16, 32, 48]);
  const pngSize = (f: string) => { const b = read(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  assert.deepEqual(pngSize("apple-touch-icon.png"), [180, 180]);
  assert.deepEqual(pngSize("icon-192.png"), [192, 192]);
  assert.deepEqual(pngSize("icon-512.png"), [512, 512]);
  assert.match(read("favicon.svg").toString(), /viewBox="0 0 64 64"/);
  const manifest = JSON.parse(read("site.webmanifest").toString());
  assert.equal(manifest.short_name, "LMM");
  assert.ok(!manifest.icons.some((i: { type?: string }) => i.type === "image/svg+xml"), "no SVG icon in manifest");
  // Legacy URL from before #329 still resolves for cached references.
  assert.deepEqual(pngSize("apple-touch-icon-lmm.png"), [180, 180]);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(path.join(__dirname, "..", "public", icon.src)), icon.src);
  }
});

test("LMM home and legal pages link the LMM icon set", async () => {
  const { readFileSync } = await import("node:fs");
  const { LMM_ICON_LINKS } = await import("../lib/lmm-legal");
  const home = readFileSync(path.join(__dirname, "..", "public", "clients", "lmm-site", "index.html"), "utf8");
  for (const html of [home, LMM_ICON_LINKS]) {
    assert.match(html, /rel="icon" href="\/clients\/lmm-site\/assets\/favicon\.ico\?v=\d+" sizes="any"/);
    // No SVG icon link: SVG-capable browsers would skip the pixel-tuned 16px bitmap in the ICO.
    assert.doesNotMatch(html, /<link[^>]*rel="icon"[^>]*image\/svg\+xml/);
    assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/clients\/lmm-site\/assets\/apple-touch-icon\.png\?v=/);
    assert.match(html, /rel="manifest" href="\/clients\/lmm-site\/assets\/site\.webmanifest\?v=/);
  }
});
