import { test } from "node:test";
import assert from "node:assert/strict";
import { noDashesHtml } from "../lib/no-dashes-html";

test("removes every em dash from text, attributes, titles and JSON-LD", () => {
    const html = `<title>Brand — Tagline</title><meta name="description" content="Plumbers — fast"><p>Walk in — just come.</p><cite><span>— Sarah</span></cite><p>9am—5pm, $100&mdash;$300</p><script type="application/ld+json">{"d":"a \\u2014 b"}</script>`;
    const out = noDashesHtml(html);
    assert.doesNotMatch(out, /\u2014|&mdash;|\\u2014/);
    assert.ok(out.includes("<title>Brand | Tagline</title>"));
    assert.ok(out.includes('content="Plumbers, fast"'));
    assert.ok(out.includes("Walk in, just come."));
    assert.ok(out.includes("<span>Sarah</span>"));
    assert.ok(out.includes("9am to 5pm, $100 to $300"));
  });
test("leaves code in plain scripts alone except spaced copy dashes", () => {
    const html = `<script>var r=/[\\u2014]/;say("Not sure — rephrase?")</script>`;
    const out = noDashesHtml(html);
    assert.ok(out.includes("/[\\u2014]/"));
    assert.ok(out.includes('say("Not sure, rephrase?")'));
  });
test("returns pages without dashes unchanged", () => {
    const html = "<p>Hello, world</p>";
    assert.equal(noDashesHtml(html), html);
  });
