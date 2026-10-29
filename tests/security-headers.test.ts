import { test } from "node:test";
import assert from "node:assert/strict";
import config, { GLOBAL_SECURITY_HEADERS, NO_FRAME_PATHS } from "../next.config";

test("global security headers are set on every path, powered-by is off", async () => {
  const rules = await config.headers!();
  const all = rules.find((r) => r.source === "/:path*");
  assert.ok(all);
  const keys = all!.headers.map((h) => h.key);
  for (const k of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) assert.ok(keys.includes(k), k);
  assert.equal(config.poweredByHeader, false);
  assert.ok(!keys.includes("X-Frame-Options"), "framing must stay allowed for public embeds");
  assert.match(GLOBAL_SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy")!.value, /microphone=\(self\)/);
});

test("signed-in surfaces cannot be framed; public embeds can", async () => {
  const rules = await config.headers!();
  for (const p of ["/saabai-admin/:path*", "/login", "/client-portal", "/lex/:path*", "/dashboard/:path*"]) {
    const r = rules.find((x) => x.source === p && x.headers.some((h) => h.key === "X-Frame-Options"));
    assert.ok(r, p);
    assert.ok(r!.headers.some((h) => h.key === "Content-Security-Policy" && h.value === "frame-ancestors 'self'"));
  }
  for (const p of ["/embed/:path*", "/lex-widget", "/sites/:path*"]) assert.ok(!NO_FRAME_PATHS.includes(p), p);
});
