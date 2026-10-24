import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/lex/lex.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/lex/page.tsx", import.meta.url), "utf8");

test("touch-size screens get 44px tap targets, inline cite chips get a 44px hit box", () => {
  const block = css.slice(css.indexOf("Phase E: mobile polish"));
  assert.ok(block.includes("@media (max-width:980px)"));
  assert.ok(/min-height:44px/.test(block));
  assert.ok(block.includes(".lx-cite::after"));
  assert.ok(block.includes("@media (hover:none){.lx-thread .more{opacity:1}}"));
});

test("top bar keeps accessible names when labels collapse on phones", () => {
  assert.ok(page.includes('aria-label="Share"'));
  assert.ok(page.includes('aria-label="Contact Saabai"'));
  assert.ok(!page.includes("\u2014"));
});
