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
    "/apple-touch-icon.png": "apple-touch-icon-lmm.png",
    "/apple-touch-icon-precomposed.png": "apple-touch-icon-lmm.png",
    "/apple-touch-icon-180x180.png": "apple-touch-icon-lmm.png",
    "/icon.svg": "lmm-icon-full-colour-light.svg",
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
