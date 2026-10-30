import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");

test("signed-out bare /lex goes to /legal; deep links still go to sign-in", () => {
  const proxy = read("proxy.ts");
  assert.match(proxy, /pathname === "\/lex" && !req\.nextUrl\.search\) return NextResponse\.redirect\(new URL\("\/legal"/);
  // The /legal redirect sits after the session check, so signed-in firm users are untouched,
  // and after the /lex/signup bypass, so signup stays public.
  const i = proxy.indexOf('pathname === "/lex" && !req.nextUrl.search');
  assert.ok(proxy.indexOf("const session = await getSession(req);") < i);
  assert.ok(proxy.indexOf('matches(pathname, ["/lex/signup"])') < i);
});

test("/lex canonical is /legal and stays noindex; /legal links beta invite and sign-in, no self-serve signup CTA", () => {
  const layout = read("app/lex/layout.tsx");
  assert.match(layout, /canonical: pageUrl\("\/legal"\)/);
  assert.match(layout, /index: false/);
  const legal = read("app/legal/page.tsx");
  assert.match(legal, /mailto:hello@saabai\.ai\?subject=Lex%20beta%20invite/);
  assert.doesNotMatch(legal, /href="\/lex\/signup"|Start the Firm plan/);
  assert.match(legal, /href="\/login\?redirect=\/lex"/);
});
