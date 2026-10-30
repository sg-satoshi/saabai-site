import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");

test("signed-out bare /lex goes to /legal; deep links still go to sign-in", () => {
  const proxy = read("proxy.ts");
  assert.match(proxy, /pathname === "\/lex" && !req\.nextUrl\.search\) return NextResponse\.redirect\(new URL\("\/legal"/);
  // The /legal redirect sits after the session check, so signed-in firm users are untouched,
  const i = proxy.indexOf('pathname === "/lex" && !req.nextUrl.search');
  assert.ok(proxy.indexOf("const session = await getSession(req);") < i);
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

test("/lex/signup is invite and demo only: done page, trial with a code, or signed in; else 307 to /legal", () => {
  const proxy = read("proxy.ts");
  const start = proxy.indexOf('if (matches(pathname, ["/lex/signup"])) {');
  assert.ok(start > 0);
  const block = proxy.slice(start, proxy.indexOf("\n  }\n", start));
  assert.match(block, /pathname === "\/lex\/signup\/done" \|\| pathname === "\/lex\/signup\/done\/"\) return NextResponse\.next\(\)/);
  assert.match(block, /pathname === "\/lex\/signup\/trial\/"\) && LEX_INVITE_CODE_RE\.test/);
  assert.match(block, /if \(await getSession\(req\)\) return NextResponse\.next\(\)/);
  assert.match(block, /NextResponse\.redirect\(new URL\("\/legal", req\.url\), 307\)/);
  const m = proxy.match(/const LEX_INVITE_CODE_RE = (\/.+\/i);/);
  assert.ok(m);
  const re = new Function("return " + m![1])() as RegExp;
  for (const ok of ["LEX-ABCDEFGHJK", "lex-abcdefghjk", "ABCDEFGHJK", "LEXABCDEFGHJK"]) assert.ok(re.test(ok), ok);
  for (const bad of ["", "LEX-", "LEX-ABC", "LEX-ABCDEFGHJ0", "<script>"]) assert.ok(!re.test(bad), bad);
});

test("/pricing has no self-serve Lex signup link", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.doesNotMatch(pricing, /href="\/lex\/signup"/);
  assert.match(pricing, /mailto:hello@saabai\.ai\?subject=Lex%20beta%20invite/);
});
