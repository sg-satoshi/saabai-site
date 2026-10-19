import test from "node:test";
import assert from "node:assert/strict";
import { pickPortalRequestFiles, PORTAL_REQUEST_MAX_FILES } from "../lib/portal-request-files";

function fakeFile(name: string, type: string, size: number): File {
  const buf = new Uint8Array(Math.min(size, 16));
  const f = new File([buf], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

test("pickPortalRequestFiles accepts images and rejects bad types", () => {
  const ok = pickPortalRequestFiles([], [fakeFile("a.png", "image/png", 100)]);
  assert.equal(ok.ok, true);
  assert.equal(ok.files.length, 1);

  const bad = pickPortalRequestFiles([], [fakeFile("a.exe", "application/octet-stream", 100)]);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /PNG, JPG/);
  assert.equal(bad.files.length, 0);
});

test("pickPortalRequestFiles enforces count and size", () => {
  const current = Array.from({ length: PORTAL_REQUEST_MAX_FILES }, (_, i) =>
    fakeFile(`f${i}.png`, "image/png", 10),
  );
  const full = pickPortalRequestFiles(current, [fakeFile("more.png", "image/png", 10)]);
  assert.equal(full.ok, false);
  assert.match(full.error, /up to/);

  const huge = pickPortalRequestFiles([], [fakeFile("big.png", "image/png", 11 * 1024 * 1024)]);
  assert.equal(huge.ok, false);
  assert.match(huge.error, /10 MB/);
});
