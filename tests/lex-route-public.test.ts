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

test("/lex canonical is /legal and stays noindex; /legal leads with the free trial, demo second, plus sign-in", () => {
  const layout = read("app/lex/layout.tsx");
  assert.match(layout, /canonical: pageUrl\("\/legal"\)/);
  assert.match(layout, /index: false/);
  const legal = read("app/legal/page.tsx");
  assert.match(legal, /className="lx-btn lx-pri" href="\/lex\/signup\/trial">Start your 60-day FREE trial</);
  assert.match(legal, /className="lx-btn lx-ghost" href=\{DEMO_URL\}/);
  assert.doesNotMatch(legal, /href="\/lex\/signup"|Start the Firm plan|beta invite/);
  assert.match(legal, /href="\/login\?redirect=\/lex"/);
});

test("/lex/signup: done page, public trial page, or signed in; else 307 to /legal", () => {
  const proxy = read("proxy.ts");
  const start = proxy.indexOf('if (matches(pathname, ["/lex/signup"])) {');
  assert.ok(start > 0);
  const block = proxy.slice(start, proxy.indexOf("\n  }\n", start));
  assert.match(block, /pathname === "\/lex\/signup\/done" \|\| pathname === "\/lex\/signup\/done\/"\) return NextResponse\.next\(\)/);
  assert.match(block, /pathname === "\/lex\/signup\/trial" \|\| pathname === "\/lex\/signup\/trial\/"\) return NextResponse\.next\(\)/);
  assert.match(block, /if \(await getSession\(req\)\) return NextResponse\.next\(\)/);
  assert.match(block, /NextResponse\.redirect\(new URL\("\/legal", req\.url\), 307\)/);
});

test("/pricing: free trial CTA, demo second, no paid self-serve signup link", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.doesNotMatch(pricing, /href="\/lex\/signup"|beta invite/);
  assert.match(pricing, /href="\/lex\/signup\/trial"[^>]*>start your 60-day free trial</i);
  assert.match(pricing, /book a free Lex demo/);
});

test("header Book a call button keeps dark text over teal on Lex pages", () => {
  const nav = readFileSync("app/components/Nav.tsx", "utf8");
  assert.match(nav, /bg-saabai-teal !text-saabai-bg/);
});
