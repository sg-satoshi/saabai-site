import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRich, visibleText, richColors, richLinks, richTree, isSafeHref } from "../lib/announce/rich";
import { safeUrl, validateAnnouncement, toPublic, announcementValue, buildTestSafe } from "./announce-rich.helpers";

const NOW = new Date("2026-10-20T00:00:00Z");
const base = { id: "rich-one", name: "Rich", message: "Hello", linkText: "Go", linkUrl: "/book" };

test("allowed formatting survives in canonical form", () => {
  assert.equal(sanitizeRich("<strong>Bold</strong> and <em>it</em> <u>u</u> <del>s</del>"), "<b>Bold</b> and <i>it</i> <u>u</u> <s>s</s>");
  assert.equal(sanitizeRich('<span style="color: rgb(220, 38, 38)">red</span>'), '<span style="color:#dc2626">red</span>');
  assert.equal(sanitizeRich('<font color="#FFF">w</font>'), '<span style="color:#ffffff">w</span>');
  assert.equal(sanitizeRich('<a href="/book" target="_blank" onclick="x()">Book</a>'), '<a href="/book">Book</a>');
  assert.equal(sanitizeRich("Plain text, 20% off & more"), "Plain text, 20% off &amp; more");
});
test("browser CSS-style formatting is converted to the whitelist, other CSS dropped", () => {
  assert.equal(sanitizeRich('<span style="font-weight: bold;">B</span>'), "<b>B</b>");
  assert.equal(sanitizeRich('<span style="text-decoration-line: line-through; color: rgb(253, 224, 71);">w</span>'), '<s><span style="color:#fde047">w</span></s>');
  assert.equal(sanitizeRich('<span style="font-style:italic;position:fixed;background:url(x)">i</span>'), "<i>i</i>");
  assert.equal(sanitizeRich('<span style="font-size:99px">x</span>'), "x");
  assert.equal(sanitizeRich('<span style="font-weight:700;text-decoration:underline">a</span>b'), "<b><u>a</u></b>b");
});
test("script, handlers and dangerous tags are removed", () => {
  const bad = [
    "<script>alert(1)</script>Hi", "<img src=x onerror=alert(1)>Hi", "<svg onload=alert(1)><circle/></svg>Hi", "<iframe src=//evil></iframe>Hi",
    "<style>body{display:none}</style>Hi", "<b onmouseover=alert(1)>Hi</b>", "<SCRIPT SRC=//x></SCRIPT>Hi", "<object data=x></object>Hi", "<math><mi xlink:href=javascript:1>x</mi></math>Hi",
    "<!--<script>-->Hi<!-- x -->", "<?php echo 1 ?>Hi", "<![CDATA[<script>alert(1)</script>]]>Hi", "<form action=//x><input></form>Hi", "<meta http-equiv=refresh content=0>Hi", "<base href=//evil>Hi",
  ];
  for (const b of bad) {
    const out = sanitizeRich(b);
    assert.ok(!/<(script|img|svg|iframe|style|object|math|form|input|meta|base)/i.test(out), b + " => " + out);
    assert.ok(!/<[^>]*on\w+\s*=|javascript:/i.test(out), b + " => " + out);
    assert.match(visibleText(b), /^Hi$|^$|Hi/);
  }
  assert.equal(sanitizeRich("<script>alert(1)</script>Hi"), "Hi");
  assert.equal(sanitizeRich("<style>x{}</style>Hi"), "Hi");
});
test("javascript, data and protocol-relative URLs never become links (including entity and whitespace tricks)", () => {
  const hrefs = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)", "java\nscript:alert(1)", "&#106;avascript:alert(1)", "&#x6A;avascript:alert(1)", "jav&#x09;ascript:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "//evil.com", "\\\\evil.com", "http://insecure.example", "/\\evil.com", "file:///etc/passwd", "mailto:a@b.c?subject=x&body=<script>", "tel:abc"];
  for (const h of hrefs) {
    const out = sanitizeRich(`<a href="${h}">x</a>`);
    assert.ok(!/<a\b/.test(out), h + " => " + out);
    assert.equal(visibleText(`<a href="${h}">x</a>`), "x");
  }
  for (const h of ["/book", "/ai-score?x=1#a", "https://saabai.ai/x", "tel:+61400000000", "mailto:hi@saabai.ai"]) assert.match(sanitizeRich(`<a href='${h}'>x</a>`), /<a href="/, h);
  // unquoted and single-quoted attribute forms
  assert.ok(!/<a\b/.test(sanitizeRich("<a href=javascript:alert(1)>x</a>")));
  assert.equal(sanitizeRich('<a href="https://a.com" onclick="x">x</a>'), '<a href="https://a.com">x</a>');
  assert.equal(sanitizeRich("<a href=/book>x</a>"), '<a href="/book">x</a>');
});
test("same URL rule as the link field", () => {
  for (const u of ["/book", "//x", "javascript:1", "https://x.com/a b", "https://saabai.ai/a", "tel:+61400000000", "mailto:a@b.co", "data:x", "http://x.com", "", "/a<b"]) assert.equal(isSafeHref(u), safeUrl(u), u);
});
test("colours: only valid hex or rgb() survive; CSS injection is dropped", () => {
  for (const c of ["red", "#12", "url(javascript:alert(1))", "expression(alert(1))", "#fff} body{display:none", "var(--x)", "rgb(300,0,0)", "rgba(0,0,0,.5)", "inherit", "#ggg"]) {
    const out = sanitizeRich(`<span style="color:${c}">x</span>`);
    assert.equal(out, "x", c + " => " + out);
  }
  assert.equal(sanitizeRich('<span style="background:url(//x);color:#abc;position:fixed">x</span>'), '<span style="color:#aabbcc">x</span>');
  assert.equal(sanitizeRich('<span style="position:fixed">x</span>'), "x");
  assert.deepEqual(richColors('<span style="color:#fff">a</span><span style="color:#FFF">b</span><b><span style="color:#000">c</span></b>'), ["#ffffff", "#000000"]);
});
test("escaped markup stays text, entities are not double decoded into tags", () => {
  assert.equal(sanitizeRich("&lt;script&gt;alert(1)&lt;/script&gt;"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(visibleText("&lt;b&gt;x&lt;/b&gt;"), "<b>x</b>");
  assert.equal(sanitizeRich("5 < 6 and 7 > 3"), "5 &lt; 6 and 7 &gt; 3");
  assert.equal(sanitizeRich('He said "hi" & left'), "He said &quot;hi&quot; &amp; left");
  assert.equal(sanitizeRich("a&nbsp;&nbsp;b"), "a b");
  assert.equal(sanitizeRich("<b>x</b>\u0000<script"), "<b>x</b>");
});
test("structure: nested links, unbalanced tags, depth, unknown tags and huge input", () => {
  assert.equal(sanitizeRich('<a href="/a">one <a href="/b">two</a></a>'), '<a href="/a">one two</a>');
  assert.equal(sanitizeRich("<b>open <i>never closed"), "<b>open <i>never closed</i></b>");
  assert.equal(sanitizeRich("</b></i>stray"), "stray");
  assert.equal(sanitizeRich("<div><p>kept <marquee>text</marquee></p></div>"), "kept text");
  assert.equal(sanitizeRich("<b></b><i> </i>x"), "x");
  assert.equal(sanitizeRich("a<br>b<br/>c"), "a b c");
  const deep = "<b>".repeat(50) + "x" + "</b>".repeat(50);
  assert.ok((sanitizeRich(deep).match(/<b>/g) ?? []).length <= 6);
  const huge = "<b>x</b>".repeat(5000);
  assert.ok(sanitizeRich(huge).length < 4000 * 3);
  const t0 = Date.now(); sanitizeRich('<a href="' + "x".repeat(100000)); sanitizeRich("<".repeat(50000)); sanitizeRich('<span style="' .repeat(2000)); assert.ok(Date.now() - t0 < 2000, "no catastrophic backtracking");
  assert.equal(sanitizeRich(null), ""); assert.equal(sanitizeRich(42 as never), ""); assert.equal(sanitizeRich(undefined), "");
});
test("idempotent: sanitising twice changes nothing", () => {
  for (const s of ["<b>x</b> & <i>y</i>", '<a href="/a">a</a>', '<span style="color:#fff">c</span>', "<script>x</script><u>u</u>", "a < b", "&amp;lt;"]) { const o = sanitizeRich(s); assert.equal(sanitizeRich(o), o, s); }
});
test("visible text excludes markup and counts what people see", () => {
  assert.equal(visibleText('<b>Big</b> <span style="color:#fff">sale</span> <a href="/x">now</a>'), "Big sale now");
  assert.deepEqual(richLinks('<a href="/x">a</a> <a href="javascript:1">b</a>'), ["/x"]);
});
test("render tree has no raw HTML: only whitelisted node types", () => {
  const walk = (n: ReturnType<typeof richTree>): string[] => n.flatMap((x) => (x.t === "text" ? ["text"] : [x.t, ...walk(x.c)]));
  const kinds = new Set(walk(richTree('<script>1</script><b>a</b><i>b</i><u>c</u><s>d</s><span style="color:#fff">e</span><a href="/x">f</a><img src=x>')));
  assert.deepEqual([...kinds].sort(), ["a", "b", "i", "s", "span", "text", "u"]);
});

// ---- integration with announcements ----
test("message limit counts visible text only; stored value is sanitised", () => {
  const long = "<b>" + "x".repeat(120) + "</b>";
  assert.ok(validateAnnouncement({ ...base, message: long } as never, null, NOW).ok);
  assert.equal(validateAnnouncement({ ...base, message: "<b>" + "x".repeat(121) + "</b>" } as never, null, NOW).ok, false);
  const c = validateAnnouncement({ ...base, message: '<img src=x onerror=alert(1)><b>Hi</b><script>x</script>' } as never, null, NOW);
  assert.ok(c.ok && c.value.message === "<b>Hi</b>");
  assert.equal(validateAnnouncement({ ...base, message: "<script>x</script>" } as never, null, NOW).ok, false, "nothing visible");
  assert.equal(validateAnnouncement({ ...base, message: "a \u2014 b <b>c</b>" } as never, null, NOW).ok, false, "dash rule on visible text");
});
test("formatting heavy enough to break the 300 char variant limit is rejected", () => {
  const heavy = Array.from({ length: 12 }, (_, i) => `<span style="color:#${i}${i}${i}${i}${i}${i}">a</span>`).join("");
  const c = validateAnnouncement({ ...base, message: heavy } as never, null, NOW);
  assert.ok(!c.ok && c.field === "message");
  const ok = validateAnnouncement({ ...base, message: '<b>Big</b> <span style="color:#fde047">sale</span> <a href="/x">now</a>' } as never, null, NOW);
  assert.ok(ok.ok && Object.values(announcementValue(ok.value)).every((v) => v.length <= 300));
});
test("coloured text must be readable on the chosen background", () => {
  const c = validateAnnouncement({ ...base, theme: "alert_red", message: 'Sale <span style="color:#b91c1c">hidden</span>' } as never, null, NOW);
  assert.ok(!c.ok && c.field === "message" && /contrast/.test(c.error));
  assert.ok(validateAnnouncement({ ...base, theme: "alert_red", message: 'Sale <span style="color:#fde047">visible</span>' } as never, null, NOW).ok);
  const e = validateAnnouncement({ ...base, theme: "alert_red", timer: { style: "text", endAt: "2026-10-25T00:00:00Z", endMode: "message", endMessage: 'Over <span style="color:#b91c1c">x</span>' } } as never, null, NOW);
  assert.ok(!e.ok && e.field === "tMsg");
});
test("public payload re-sanitises and carries the end message rich text", () => {
  const c = validateAnnouncement({ ...base, message: "<b>Hi</b>", timer: { style: "text", endAt: "2026-10-25T00:00:00Z", endMode: "message", endMessage: "<i>Over</i>" } } as never, null, NOW);
  assert.ok(c.ok); if (!c.ok) return;
  assert.equal(toPublic(c.value).message, "<b>Hi</b>");
  assert.equal(toPublic(c.value, undefined, Date.parse("2026-10-26T00:00:00Z")).message, "<i>Over</i>");
  const tampered = { ...c.value, message: "<img src=x onerror=1><b>Hi</b>" };
  assert.equal(toPublic(tampered).message, "<b>Hi</b>");
});
test("rich messages work in split test variants", () => {
  const c = validateAnnouncement({ ...base, message: '<b>Big</b> sale' } as never, null, NOW);
  assert.ok(c.ok); if (!c.ok) return;
  const e = buildTestSafe(c.value);
  assert.ok(e && !("error" in e));
  if (e && !("error" in e)) { assert.equal(e.variants[1].value?.message, "<b>Big</b> sale"); assert.match(e.variants[1].text, /Big sale/); assert.ok(!/<b>/.test(e.variants[1].text)); }
});
