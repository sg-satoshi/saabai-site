import { describe, it, expect } from "vitest";
import { noDashesHtml } from "../lib/no-dashes-html";

describe("noDashesHtml", () => {
  it("removes every em dash from text, attributes, titles and JSON-LD", () => {
    const html = `<title>Brand — Tagline</title><meta name="description" content="Plumbers — fast"><p>Walk in — just come.</p><cite><span>— Sarah</span></cite><p>9am—5pm, $100&mdash;$300</p><script type="application/ld+json">{"d":"a \\u2014 b"}</script>`;
    const out = noDashesHtml(html);
    expect(out).not.toMatch(/\u2014|&mdash;|\\u2014/);
    expect(out).toContain("<title>Brand | Tagline</title>");
    expect(out).toContain('content="Plumbers, fast"');
    expect(out).toContain("Walk in, just come.");
    expect(out).toContain("<span>Sarah</span>");
    expect(out).toContain("9am to 5pm, $100 to $300");
  });
  it("leaves code in plain scripts alone except spaced copy dashes", () => {
    const html = `<script>var r=/[\\u2014]/;say("Not sure — rephrase?")</script>`;
    const out = noDashesHtml(html);
    expect(out).toContain("/[\\u2014]/");
    expect(out).toContain('say("Not sure, rephrase?")');
  });
  it("returns pages without dashes unchanged", () => {
    const html = "<p>Hello, world</p>";
    expect(noDashesHtml(html)).toBe(html);
  });
});
