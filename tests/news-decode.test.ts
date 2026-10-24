/** News ticker: feed titles have HTML entities decoded.  npx tsx --test tests/news-decode.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeHtml } from "../lib/news";

test("decimal, hex and named entities", () => {
  assert.equal(decodeHtml("Blackstone&#8217;s AI bet"), "Blackstone\u2019s AI bet");
  assert.equal(decodeHtml("Q&amp;A &#x2019;n &quot;x&quot; &rsquo;"), "Q&A \u2019n \"x\" \u2019");
  assert.equal(decodeHtml("It&#39;s &#039;fine&#039;"), "It's 'fine'");
});

test("double encoded and CDATA", () => {
  assert.equal(decodeHtml("<![CDATA[Blackstone&amp;#8217;s deal]]>"), "Blackstone\u2019s deal");
  assert.equal(decodeHtml("AT&amp;amp;T"), "AT&T");
});

test("no dashes, no leftover tags, unknown entities kept", () => {
  assert.equal(decodeHtml("A &#8212; B &ndash; C \u2014 D"), "A - B - C - D");
  assert.equal(decodeHtml("<b>Bold</b> news"), "Bold news");
  assert.equal(decodeHtml("&bogus; stays"), "&bogus; stays");
});

test("no literal entity survives a typical feed title", () => {
  for (const t of ["Blackstone&#8217;s", "M&amp;A", "&#8220;Quoted&#8221;", "Caf&eacute;"]) {
    assert.doesNotMatch(decodeHtml(t), /&#\d+;|&amp;/);
  }
});
