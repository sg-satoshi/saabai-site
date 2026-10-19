/** Env users can't be deleted from Saabai Admin; the UI never selects them.  npx tsx --test tests/env-user-delete.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
test("DELETE refuses env users with a clear message and 404s unknown users", () => {
  const src = read("app/api/user-directory/route.ts");
  assert.match(src, /This user is set in the site settings and can't be deleted here/);
  assert.match(src, /User not found/);
});
test("UI: env rows not selectable, bulk toast reports the real error", () => {
  const src = read("app/saabai-admin/users/UsersClient.tsx");
  assert.match(src, /selectable = users\.filter\(u => u\.source !== "env"\)/);
  assert.match(src, /failed: \$\{firstErr\}/);
  assert.ok(!/\u2014/.test(src.match(/can't be deleted here[^\n]*/)![0]));
});
test("admin sidebar footer never shows a placeholder name", () => {
  const src = read("app/saabai-admin/AdminSidebar.tsx");
  assert.ok(!/Your Name/.test(src));
  assert.match(read("lib/auth.ts"), /Owner identity comes from the env client/);
});
