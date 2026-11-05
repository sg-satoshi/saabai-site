/**
 * Campaigns lists every SUNDER marketing automation and edits the copy the sender uses.
 * Built-in confirm and referral HTML stay byte-for-byte the same until an edit is saved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SAMPLE_CONFIRM_URL,
  SAMPLE_REFERRAL_LINE,
  SAMPLE_REFERRAL_URL,
  automationKeyFromRequest,
  isBroadcastInventory,
  listAutomatedEmails,
  parseAutomatedKey,
  previewAutomated,
  replaceSeriesStep,
  seriesOutgoingHtml,
  seriesQueuedHtml,
  systemButtonLabel,
} from "../lib/email/automated";
import { SUNDER_IDENTITY, SUNDER_FROM_NAME } from "../lib/email/constants";
import { CONFIRM_COPY, REFERRAL_COPY, confirmMessage, referralLinkMessage, renderMarketingEmail } from "../lib/email/message";

const read = (p: string) => readFileSync(p, "utf8");

test("built-in confirm and referral copy is unchanged when nothing is saved", () => {
  assert.deepEqual(confirmMessage(), confirmMessage(CONFIRM_COPY));
  assert.deepEqual(confirmMessage(null), confirmMessage());
  const url = "https://sunder.com.au/r/abc123xy";
  assert.deepEqual(referralLinkMessage(url), referralLinkMessage(url, REFERRAL_COPY));
  assert.deepEqual(referralLinkMessage(url, null), referralLinkMessage(url));
  assert.match(confirmMessage().html, /href="\{\{confirmUrl\}\}"/);
  assert.doesNotMatch(confirmMessage().html, /SPLIT THE GAME OPEN/);
});

test("a saved confirm edit changes the wording and keeps the confirm token", () => {
  const edited = confirmMessage({
    subject: "See you on the list",
    body: "Hi {{firstName|there}},\n\nCustom welcome line.",
    buttonLabel: "Count me in",
  });
  assert.equal(edited.subject, "See you on the list");
  assert.match(edited.html, /Custom welcome line/);
  assert.match(edited.html, /href="\{\{confirmUrl\}\}"/);
  assert.match(edited.html, />Count me in</);
  const evil = confirmMessage({ subject: "S", body: "Hi", buttonLabel: 'Go" href="https://evil.test' });
  assert.match(evil.html, /href="\{\{confirmUrl\}\}"/);
  assert.doesNotMatch(evil.html, /href="https:\/\/evil\.test"/);
  assert.match(evil.html, /Go&quot; href=&quot;https:\/\/evil\.test/);
  const rendered = renderMarketingEmail({
    subject: edited.subject,
    html: edited.html,
    fromName: SUNDER_FROM_NAME,
    identity: SUNDER_IDENTITY,
    unsubUrl: "https://saabai.ai/email/u",
    confirmUrl: "https://sunder.com.au/email/confirm?t=token",
    values: { firstName: "Matt" },
  });
  assert.match(rendered.html, /Hi Matt/);
  assert.match(rendered.html, /Custom welcome line/);
  assert.match(rendered.html, /https:\/\/sunder\.com\.au\/email\/confirm\?t=token/);
  assert.match(rendered.html, /Unsubscribe/);
  assert.doesNotMatch(rendered.html, /\{\{confirmUrl\}\}/);
  assert.doesNotMatch(rendered.html, /\{\{firstName/);
});

test("a saved referral edit cannot replace the status link", () => {
  const url = "https://sunder.com.au/r/abc123xy";
  const edited = referralLinkMessage(url, {
    subject: "Your link",
    body: "Hi {{firstName|there}},\n\nLook here https://evil.test/phish",
    buttonLabel: "Open mine",
  });
  assert.match(edited.html, /href="https:\/\/sunder\.com\.au\/r\/abc123xy"/);
  assert.match(edited.html, />Open mine</);
  assert.match(edited.html, /Keep this link to yourself/);
  assert.doesNotMatch(edited.html, /href="https:\/\/evil\.test/);
  const junk = referralLinkMessage("https://evil.test/r/abc?x=1", null);
  assert.match(junk.html, /href="https:\/\/evil\.test\/r\/abcx1"/);
  assert.doesNotMatch(junk.html, /href="[^"]*\?/);
});

test("welcome send HTML uses the saved text, and an empty text keeps the stored HTML", () => {
  const body = "Hi {{firstName|there}},\n\nYou're on the SUNDER VIP list. Good call.";
  const queued = seriesQueuedHtml(body, "<p>ignored</p>", "Your link: https://sunder.com.au/?r=abc234de · 1 friend joined · 1 bonus entry", "https://sunder.com.au/r/abc234de");
  assert.match(queued, /SPLIT THE GAME OPEN/);
  assert.match(queued, /Good call/);
  assert.match(queued, /1 friend joined/);
  assert.doesNotMatch(queued, /ignored/);
  const stored = "<p>LIVE HTML</p>";
  assert.equal(seriesOutgoingHtml("", stored), stored);
  assert.equal(seriesOutgoingHtml(null, stored), stored);
  const fallback = seriesQueuedHtml("", stored, SAMPLE_REFERRAL_LINE, SAMPLE_REFERRAL_URL);
  assert.match(fallback, /LIVE HTML/);
  assert.match(fallback, /2 friends joined/);
  assert.doesNotMatch(fallback, /SPLIT THE GAME OPEN/);
  const sent = renderMarketingEmail({
    subject: "You're on the list",
    html: queued,
    fromName: SUNDER_FROM_NAME,
    identity: SUNDER_IDENTITY,
    unsubUrl: "https://saabai.ai/email/u",
    values: { firstName: "Matt" },
  });
  assert.match(sent.html, /Hi Matt/);
  assert.match(sent.html, /Good call/);
  assert.match(sent.html, /Unsubscribe/);
  assert.match(sent.subject, /You&#39;re on the list|You're on the list/);
});

test("the editor preview matches the HTML the sender queues", () => {
  const message = "Hi {{firstName|there}},\n\nBlades: Dagger, Katana, Claymore.";
  const preview = previewAutomated({ mode: "series", subject: "Welcome", message });
  const queued = seriesQueuedHtml(message, "", SAMPLE_REFERRAL_LINE, SAMPLE_REFERRAL_URL);
  const sent = renderMarketingEmail({
    subject: "Welcome",
    html: queued,
    fromName: SUNDER_FROM_NAME,
    identity: SUNDER_IDENTITY,
    unsubUrl: "https://saabai.ai/email/u",
    viewUrl: "https://saabai.ai/email/view",
    values: { firstName: "Sam" },
  });
  assert.equal(preview.html, sent.html);
  assert.match(preview.html, /Dagger, Katana, Claymore/);
  assert.match(preview.html, /Hi Sam/);
  const confirm = previewAutomated({ mode: "confirm", subject: CONFIRM_COPY.subject, message: CONFIRM_COPY.body, buttonLabel: CONFIRM_COPY.buttonLabel });
  assert.match(confirm.html, new RegExp(SAMPLE_CONFIRM_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(confirm.html, /Join the SUNDER VIP list/);
  const referral = previewAutomated({ mode: "referral", subject: REFERRAL_COPY.subject, message: REFERRAL_COPY.body, buttonLabel: REFERRAL_COPY.buttonLabel });
  assert.match(referral.html, /href="https:\/\/sunder\.com\.au\/r\/sample"/);
});

test("Campaigns inventory always includes welcome, confirm and referral", () => {
  const rows = listAutomatedEmails({
    seriesStatus: "active",
    steps: [
      { position: 0, delayDays: 0, subject: "You're on the SUNDER VIP list", body: "Good call." },
      { position: 1, delayDays: 3, subject: "The blades", body: "Dagger" },
      { position: 2, delayDays: 7, subject: "Last note", body: "Thanks" },
    ],
    confirmSaved: false,
    confirmSubject: "",
    referralSaved: false,
    referralSubject: "",
  });
  assert.deepEqual(rows.map((r) => r.key), ["series-0", "series-1", "series-2", "system-confirm", "system-referral-link"]);
  assert.equal(rows[0].channel, "automation");
  assert.match(rows[0].trigger, /confirms/);
  assert.match(rows[0].timing, /Right after they confirm/);
  assert.match(rows[1].timing, /day 3/);
  assert.equal(rows[0].subject, "You're on the SUNDER VIP list");
  assert.equal(rows[3].source, "built-in");
  assert.equal(rows[3].subject, CONFIRM_COPY.subject);
  const empty = listAutomatedEmails({ seriesStatus: "missing", steps: [], confirmSaved: false, confirmSubject: "", referralSaved: false, referralSubject: "" });
  assert.equal(empty.filter((r) => r.key.startsWith("series-")).length, 3);
  assert.equal(empty[0].source, "missing");
  assert.equal(parseAutomatedKey("system-confirm")?.kind, "system");
  assert.equal(parseAutomatedKey("series-0") && "position" in parseAutomatedKey("series-0")! && (parseAutomatedKey("series-0") as { position: number }).position, 0);
  assert.equal(parseAutomatedKey("portal-welcome"), null);
  assert.equal(automationKeyFromRequest("series:sunder:welcome:0"), "series-0");
  assert.equal(isBroadcastInventory({ kind: "broadcast", requestKey: null }), true);
  assert.equal(isBroadcastInventory({ kind: "broadcast", requestKey: "series:sunder:welcome:0" }), false);
  assert.equal(isBroadcastInventory({ kind: "series_step", requestKey: null }), false);
  assert.equal(systemButtonLabel("<html>nope</html>", "Join"), "Join");
  assert.equal(systemButtonLabel("Count me in", "Join"), "Count me in");
});

test("editing one welcome step does not rewrite the others", () => {
  const steps = [
    { position: 0, delayDays: 0, subject: "A", body: "one" },
    { position: 1, delayDays: 3, subject: "B", body: "two" },
  ];
  const next = replaceSeriesStep(steps, 0, "A2", "one plus");
  assert.ok(!("error" in next));
  if ("error" in next) return;
  assert.equal(next[0].body, "one plus");
  assert.equal(next[1].body, "two");
  assert.equal(next[1].subject, "B");
  const missing = replaceSeriesStep(steps, 4, "X", "Y");
  assert.ok("error" in missing);
  if ("error" in missing) assert.match(missing.error, /not in the series/);
});

test("the sender and the save path share the template, and saving does not enqueue", () => {
  const ops = read("lib/email/ops.ts");
  const save = ops.slice(ops.indexOf("export async function saveAutomated"), ops.indexOf("export async function automatedEditor"));
  assert.match(save, /email_templates/);
  assert.match(save, /\.eq\("tenant_id", tenant\.id\)/);
  assert.doesNotMatch(save, /email_sends|enqueueDueSeries|queueBroadcast|sendSes/);
  assert.match(ops, /seriesQueuedHtml\(raw\.body_text, raw\.html/);
  assert.match(ops, /confirmMessage\(await savedSystemCopy/);
  assert.match(ops, /referralLinkMessage\(referralStatusUrl\(sub\.referral_code\), await savedSystemCopy/);
  assert.match(ops, /isBroadcastInventory/);
  const ui = read("app/saabai-admin/email/Campaigns.tsx");
  assert.match(ui, /Automated/);
  assert.match(ui, /\/saabai-admin\/email\/auto\//);
  assert.match(ui, /a\.trigger/);
  assert.match(ui, /a\.timing/);
  const editor = read("app/saabai-admin/email/auto/AutoEditor.tsx");
  assert.match(editor, /action: "automated"/);
  assert.doesNotMatch(editor, /action: "test"|action: "send"|Send test|Send now/);
  const sql = read("db/migrations/019_email_campaigns_broadcast_only.sql");
  assert.match(sql, /c\.kind = 'broadcast'/);
  assert.match(sql, /request_key not like 'series:%'/);
  assert.doesNotMatch(sql, /update email_templates|insert into email_sends/i);
  assert.doesNotMatch(`${ui}\n${editor}\n${read("lib/email/automated.ts")}`, /\u2014|\u2013/);
});
