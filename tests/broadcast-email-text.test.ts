import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { broadcastEmail, broadcastHtmlToText, stripLegacyFooter, tipsFooterText } from "../lib/broadcast";
import { buildBroadcastTestEmail } from "../lib/broadcast-test";
import { SAMPLE_VALUES } from "../lib/personalise";

const UNSUB = (e: string) => `https://saabai.ai/unsubscribe?e=${encodeURIComponent(e)}&t=tok`;
const deps = {
  unsubUrl: UNSUB,
  unsubHeaders: (e: string) => ({ "List-Unsubscribe": `<${UNSUB(e)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }),
};

const P = (t: string) => `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.75;">${t}</p>`;
const BODY = [P("{{firstName|there}},"), P("&nbsp;"), P("Tips for {{industry|your industry}} in {{city}} &amp; more."), P("Cheers"), P("Shane")].join("");
const CARD = (rows: string) => `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;">
<table width="100%"><tr><td align="center"><table width="600">
  <tr><td style="background:#0e0c2e;padding:28px 40px;"><p style="margin:0;font-size:20px;">Saabai<span style="color:#00bfa5;">.</span>ai</p></td></tr>
  <tr><td style="padding:36px 40px 28px;">${BODY}</td></tr>${rows}
</table></td></tr></table></body></html>`;
// What the admin editor built before #343 (the received #342 test email).
const LEGACY_ROW = `
  <tr><td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this as a Saabai subscriber · <a href="https://saabai.ai" style="color:#00bfa5;text-decoration:none;">saabai.ai</a></p>
  </td></tr>`;
const OLD_LINE = /receiving this as a Saabai subscriber/i;
const NEW_FOOTER = "You're getting this because you asked for occasional Saabai tips by email on saabai.ai. Sent by Saabai Pty Ltd, trading as Saabai, Merrimac QLD 4226, Australia (saabai.ai, hello@saabai.ai).";

test("the admin editor template no longer adds the old footer line", () => {
  const dash = readFileSync("app/saabai-admin/subscribers/SubscriberDashboard.tsx", "utf8");
  assert.doesNotMatch(dash, OLD_LINE);
});

test("old footer line is gone even from HTML built by an older admin tab; compliance footer stays", () => {
  for (const html of [CARD(LEGACY_ROW), CARD("")]) {
    const m = broadcastEmail({ email: "a@x.com", firstName: "Ann", industry: "Law", city: "Brisbane" }, { subject: "Hi", html, fromName: "Shane at Saabai" }, deps);
    assert.doesNotMatch(m.html, OLD_LINE);
    assert.doesNotMatch(m.text, OLD_LINE);
    assert.equal(m.html.split("You're getting this because").length, 2, "one compliance footer");
    assert.ok(m.html.includes(NEW_FOOTER));
    assert.ok(m.html.includes('href="https://saabai.ai/unsubscribe?e=a%40x.com&amp;t=tok"'));
    assert.ok(m.html.includes("<p style=\"margin:0;font-size:20px;\">Saabai"), "rest of the layout untouched");
  }
  assert.equal(stripLegacyFooter("<p>keep</p>"), "<p>keep</p>");
});

test("text part: personalised body, compliance footer and full unsubscribe URL, no tokens or tags", () => {
  const m = broadcastEmail({ email: "a@x.com", firstName: "Ann", industry: "", city: "Brisbane" }, { subject: "{{firstName}}", html: CARD(LEGACY_ROW), fromName: "Shane" }, deps);
  assert.equal(typeof m.text, "string");
  assert.ok(m.text.startsWith("Saabai.ai\n\nAnn,\n"), m.text);
  assert.ok(m.text.includes("Tips for your industry in Brisbane & more."));
  assert.ok(m.text.includes("Cheers\nShane"));
  assert.ok(m.text.includes(NEW_FOOTER));
  assert.ok(m.text.includes(UNSUB("a@x.com")), "full unsubscribe URL, not escaped");
  assert.ok(m.text.endsWith(`${tipsFooterText(UNSUB("a@x.com"))}\n`));
  assert.doesNotMatch(m.text, /\{\{|\}\}|<[a-z/!]|&amp;|&nbsp;/i);
  assert.doesNotMatch(m.text, /\n{3,}/);
  assert.ok(!/[\u2013\u2014]/.test(m.text), "no dashes");
  // Headers unchanged.
  assert.deepEqual(m.headers, deps.unsubHeaders("a@x.com"));
});

test("text part uses each recipient's own values and fallbacks; unknown tokens vanish", () => {
  const msg = { subject: "s", html: "<p>Hi {{firstName|there}} {{ip}}</p><p>{{ city | your area }}</p>", fromName: "S" };
  const a = broadcastEmail({ email: "a@x.com", firstName: "Jo & Al", city: "Cairns" }, msg, deps);
  const b = broadcastEmail({ email: "b@x.com", firstName: "", city: "" }, msg, deps);
  assert.ok(a.text.startsWith("Hi Jo & Al\nCairns\n"), a.text);
  assert.ok(b.text.startsWith("Hi there\nyour area\n"), b.text);
  assert.ok(b.text.includes(UNSUB("b@x.com")) && !b.text.includes(UNSUB("a@x.com")));
  assert.doesNotMatch(a.text + b.text, /\{\{|\}\}/);
});

test("test send to hello@ carries the same text part with sample values", () => {
  const m = buildBroadcastTestEmail({ subject: "Hi {{firstName}}", html: CARD("") }, deps);
  assert.ok(m.text.includes(`${SAMPLE_VALUES.firstName},`));
  assert.ok(m.text.includes(`in ${SAMPLE_VALUES.city}`));
  assert.ok(m.text.includes(UNSUB("hello@saabai.ai")) && m.html.includes("hello%40saabai.ai&amp;t=tok"));
  assert.doesNotMatch(m.text + m.html, /\{\{|\}\}/);
  assert.doesNotMatch(m.text + m.html, OLD_LINE);
});

test("html to text keeps links readable", () => {
  assert.equal(broadcastHtmlToText('<p>See <a href="https://saabai.ai/score?a=1&amp;b=2">the score</a></p><p><a href="https://saabai.ai">https://saabai.ai</a></p>'), "See the score (https://saabai.ai/score?a=1&b=2)\nhttps://saabai.ai");
  assert.equal(broadcastHtmlToText("<head><style>p{}</style><title>x</title></head><p>a<br>b</p>"), "a\nb");
});
