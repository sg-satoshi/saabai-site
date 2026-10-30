/**
 * Exit pop-up redesign: paths, caps, holdout split, suppression, sheet fit, score-link send rules.
 *   npx tsx --test tests/exit-popup.test.ts
 * No network: the score-link handler runs with mocks only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAP_KEY,
  CONVERTED_KEY,
  GROUP_KEY,
  HOLDOUT_SHARE,
  MEMBER_KEY,
  SCORE_DONE_KEY,
  SESSION_SEEN_KEY,
  assignGroup,
  bumpPageViews,
  cleanEntry,
  exitPopupAllowedPath,
  exitPopupEligible,
  isConverted,
  isMemberPath,
  migrateLegacyCookie,
  mobileReady,
  readCap,
  readGroup,
  sheetFits,
  validEmail,
  writeCap,
  type KV,
} from "../lib/exit-popup";
import { handleScoreLink, scoreLinkEmailHtml, scoreLinkEmailText, SCORE_LINK_URL, type ScoreLinkDeps } from "../lib/score-link";
import { canReceiveMarketing, type Subscriber } from "../lib/subscribers";
import { broadcastEmail, broadcastRecipients, tipsFooterHtml } from "../lib/broadcast";

const read = (f: string) => readFileSync(f, "utf8");
const DAY = 86_400_000;

function mem(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

test("never on conversion, legal, privacy, case study, app or client pages", () => {
  for (const p of ["/", "/services", "/custom-ai-agents", "/ai-chatbot-developer-queensland", "/about", "/blog/some-post"]) {
    assert.equal(exitPopupAllowedPath(p), true, p);
  }
  for (const p of [
    "/score", "/score/", "/score/anything", "/contact", "/blueprint", "/blueprint/checkout", "/blueprint/pay",
    "/blueprint/confirmation", "/pricing", "/checkout", "/pay", "/pay/done", "/legal", "/legal/demo", "/ai-chatbot-law-firms",
    "/privacy", "/terms", "/unsubscribe", "/case-studies", "/case-studies/rex-plastics-online", "/saabai-admin", "/login",
    "/lex", "/client-portal", "/sites/cycle-repair", "/api/subscribe", "/ig", "/score?from=x",
  ]) {
    assert.equal(exitPopupAllowedPath(p), false, p);
  }
  assert.equal(isMemberPath("/saabai-admin/subscribers"), true);
  assert.equal(isMemberPath("/client-portal"), true);
  assert.equal(isMemberPath("/services"), false);
});

test("cap windows: dismiss 14 days, CTA 30 days, emailed 180 days", () => {
  const s = mem();
  const t0 = 1_700_000_000_000;
  assert.equal(readCap(s, t0).capped, false);
  writeCap(s, "dismissed", t0);
  assert.equal(readCap(s, t0 + 13 * DAY).capped, true);
  assert.equal(readCap(s, t0 + 14 * DAY + 1).capped, false);

  writeCap(s, "clicked", t0);
  assert.equal(readCap(s, t0 + 29 * DAY).capped, true);
  assert.equal(readCap(s, t0 + 30 * DAY + 1).capped, false);

  writeCap(s, "emailed", t0);
  assert.equal(readCap(s, t0 + 179 * DAY).capped, true);
  assert.equal(readCap(s, t0 + 180 * DAY + 1).capped, false);

  // A later dismiss never shortens a longer cap that is still running.
  writeCap(s, "emailed", t0);
  writeCap(s, "dismissed", t0 + DAY);
  assert.equal(JSON.parse(s.getItem(CAP_KEY)!).state, "emailed");

  // Garbage is ignored.
  s.setItem(CAP_KEY, "{not json");
  assert.equal(readCap(s, t0).capped, false);
});

test("old saabai_subscribed cookie migrates to a 180 day cap", () => {
  const s = mem();
  const t0 = 1_700_000_000_000;
  assert.equal(migrateLegacyCookie("a=1; b=2", s, t0), false);
  assert.equal(migrateLegacyCookie("a=1; saabai_subscribed=1", s, t0), true);
  assert.equal(readCap(s, t0 + 170 * DAY).state, "emailed");
  assert.equal(readCap(s, t0 + 170 * DAY).capped, true);
});

test("holdout split: 10% of new browsers, assigned once, permanent", () => {
  assert.equal(HOLDOUT_SHARE, 0.1);
  const h = mem();
  assert.deepEqual(assignGroup(h, () => 0.05), { group: "holdout", isNew: true });
  assert.deepEqual(assignGroup(h, () => 0.99), { group: "holdout", isNew: false });
  assert.equal(readGroup(h), "holdout");
  assert.equal(readCap(h, Date.now() + 10_000 * DAY).capped, true);
  // An outcome can never overwrite the holdout.
  writeCap(h, "dismissed");
  assert.equal(JSON.parse(h.getItem(CAP_KEY)!).state, "holdout");

  const t = mem();
  assert.deepEqual(assignGroup(t, () => 0.1), { group: "test", isNew: true });
  assert.equal(t.getItem(GROUP_KEY), "test");
  assert.equal(t.getItem(CAP_KEY), null);

  // Edge of the split and the overall share.
  assert.equal(assignGroup(mem(), () => 0.0999).group, "holdout");
  let n = 0;
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 20_000; i++) if (assignGroup(mem(), rand).group === "holdout") n++;
  assert.ok(n / 20_000 > 0.09 && n / 20_000 < 0.11, `holdout share ${n / 20_000}`);
});

test("suppression: score taken, converted, signed in, holdout, capped or already seen this visit", () => {
  const base = () => ({ local: mem(), session: mem() });
  const ok = (e: ReturnType<typeof base>, path = "/services", chrome = true) =>
    exitPopupEligible({ path, chrome, local: e.local, session: e.session });

  const e0 = base();
  assert.equal(ok(e0), true);
  assert.equal(ok(e0, "/score"), false);
  assert.equal(ok(e0, "/services", false), false, "client sites never");

  for (const key of [SCORE_DONE_KEY, CONVERTED_KEY, MEMBER_KEY]) {
    const e = base();
    e.local.setItem(key, "1");
    assert.equal(isConverted(e.local), true, key);
    assert.equal(ok(e), false, key);
  }

  const e1 = base();
  assignGroup(e1.local, () => 0.01);
  assert.equal(ok(e1), false, "holdout never sees it");

  const e2 = base();
  writeCap(e2.local, "dismissed");
  assert.equal(ok(e2), false, "dismissed cap");

  const e3 = base();
  e3.session.setItem(SESSION_SEEN_KEY, "1");
  assert.equal(ok(e3), false, "once per session");
});

test("mobile sheet: 25% rule, never first page view, 50% scroll and 20 seconds", () => {
  assert.equal(sheetFits(204, 844), true);
  assert.equal(sheetFits(211, 844), true);
  assert.equal(sheetFits(212, 844), false);
  assert.equal(sheetFits(204, 667), false);
  assert.equal(sheetFits(0, 844), false);

  assert.equal(mobileReady({ pageViews: 1, scrollDepth: 1, dwellMs: 60_000 }), false);
  assert.equal(mobileReady({ pageViews: 2, scrollDepth: 0.49, dwellMs: 60_000 }), false);
  assert.equal(mobileReady({ pageViews: 2, scrollDepth: 0.5, dwellMs: 19_999 }), false);
  assert.equal(mobileReady({ pageViews: 2, scrollDepth: 0.5, dwellMs: 20_000 }), true);

  const s = mem();
  assert.equal(bumpPageViews(s), 1);
  assert.equal(bumpPageViews(s), 2);
});

test("entry and email validation", () => {
  assert.equal(cleanEntry("exit-popup"), "exit-popup");
  assert.equal(cleanEntry("Exit-Email"), "exit-email");
  assert.equal(cleanEntry("<script>"), null);
  assert.equal(cleanEntry(""), null);
  assert.equal(validEmail("sam@business.com.au"), true);
  assert.equal(validEmail("sam@business"), false);
  assert.equal(validEmail(""), false);
});

function deps(over: Partial<ScoreLinkDeps> = {}) {
  const calls = { sent: [] as unknown[], saved: [] as unknown[], notified: [] as unknown[], released: 0 };
  const d: ScoreLinkDeps = {
    isSuppressed: async () => false,
    claimRateSlot: async () => true,
    releaseRateSlot: async () => { calls.released++; },
    save: async (r) => { calls.saved.push(r); return true; },
    send: async (m) => { calls.sent.push(m); return true; },
    unsubUrl: (e) => `https://saabai.ai/unsubscribe?e=${e}&t=x`,
    unsubHeaders: () => ({ "List-Unsubscribe": "<u>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }),
    notify: async (i) => { calls.notified.push(i); },
    ...over,
  };
  return { d, calls };
}

test("score link: sends one email with unsubscribe, stores consent only when ticked", async () => {
  const { d, calls } = deps();
  const r = await handleScoreLink({ email: " Sam@Business.com.au ", marketingConsent: true, source: "/services" }, d);
  assert.deepEqual(r, { status: 200, body: { ok: true, sent: true } });
  assert.equal(calls.sent.length, 1);
  const m = calls.sent[0] as { to: string; subject: string; html: string; headers: Record<string, string> };
  assert.equal(m.to, "sam@business.com.au");
  assert.equal(m.subject, "Your free AI score link");
  assert.match(m.html, /Unsubscribe/);
  assert.ok(m.headers["List-Unsubscribe"]);
  assert.deepEqual(calls.saved[0], { email: "sam@business.com.au", source: "/services", marketingConsent: true, ip: undefined });

  const b = deps();
  await handleScoreLink({ email: "a@b.co", marketingConsent: "yes" }, b.d);
  assert.equal((b.calls.saved[0] as { marketingConsent: boolean }).marketingConsent, false, "only boolean true counts");
});

test("score link: suppressed, rate limited, invalid, storage down, send failed", async () => {
  const sup = deps({ isSuppressed: async () => true });
  assert.deepEqual((await handleScoreLink({ email: "a@b.co" }, sup.d)).body, { ok: true, sent: false, reason: "suppressed" });
  assert.equal(sup.calls.sent.length, 0);

  const rl = deps({ claimRateSlot: async () => false });
  assert.deepEqual((await handleScoreLink({ email: "a@b.co" }, rl.d)).body, { ok: true, sent: false, reason: "rate_limited" });
  assert.equal(rl.calls.sent.length, 0);

  const bad = deps();
  assert.equal((await handleScoreLink({ email: "nope" }, bad.d)).status, 400);
  assert.equal(bad.calls.sent.length, 0);

  // Storage down: still send the link they asked for, but store nothing and record no consent.
  const down = deps({ claimRateSlot: async () => null });
  const r = await handleScoreLink({ email: "a@b.co", marketingConsent: true }, down.d);
  assert.deepEqual(r.body, { ok: true, sent: true });
  assert.equal(down.calls.saved.length, 0);
  assert.equal((down.calls.notified[0] as { marketingConsent: boolean }).marketingConsent, false);

  // Send failed: never claims success, and frees the rate slot for a retry.
  const fail = deps({ send: async () => false });
  const f = await handleScoreLink({ email: "a@b.co" }, fail.d);
  assert.equal(f.status, 502);
  assert.equal((f.body as { sent: boolean }).sent, false);
  assert.equal(fail.calls.released, 1);
  assert.equal(fail.calls.notified.length, 0);
});

test("score link email copy follows the house rules", () => {
  const html = scoreLinkEmailHtml("https://saabai.ai/unsubscribe?e=a&t=b");
  const text = scoreLinkEmailText("https://saabai.ai/unsubscribe?e=a&t=b");
  for (const s of [html, text]) {
    assert.ok(s.includes(SCORE_LINK_URL));
    assert.ok(s.includes("ABN 44 703 735 264"));
    assert.ok(!/[\u2013\u2014]/.test(s), "no dashes");
    assert.ok(!/free Blueprint|20OFFBP|% off|24\/7|15 minutes/i.test(s));
  }
  assert.ok(SCORE_LINK_URL.endsWith("/score?from=exit-email"));
});

test("marketing broadcasts only reach subscribers who opted in", () => {
  assert.equal(canReceiveMarketing({ status: "active", marketingConsent: "yes" }), true);
  assert.equal(canReceiveMarketing({ status: "active", marketingConsent: "no" }), false);
  assert.equal(canReceiveMarketing({ status: "active" }), false, "older sign-ups stay out until they opt in");
  assert.equal(canReceiveMarketing({ status: "unsubscribed", marketingConsent: "yes" }), false);
  assert.match(read("lib/broadcast.ts"), /canReceiveMarketing\(/);
});

const sub = (email: string, extra: Partial<Subscriber> = {}) =>
  ({ email, firstName: "", source: "exit-popup", subscribedAt: "", status: "active", marketingConsent: "yes", ...extra }) as Subscriber;

test("broadcast drops suppressed (unsubscribed) people even if they opted in", async () => {
  const subs = [
    sub("keep@example.com"),
    sub("unsubbed@example.com"),
    sub("noconsent@example.com", { marketingConsent: "no" }),
    sub("old@example.com", { marketingConsent: undefined }),
  ];
  const checked: string[] = [];
  const isSuppressed = async (e: string) => { checked.push(e); return e === "unsubbed@example.com"; };
  const { recipients, suppressed } = await broadcastRecipients(
    ["KEEP@example.com", "unsubbed@example.com", "noconsent@example.com", "old@example.com", "stranger@example.com", "keep@example.com"],
    subs,
    isSuppressed,
  );
  assert.deepEqual(recipients.map((s) => s.email), ["keep@example.com"]);
  assert.equal(suppressed, 1);
  assert.deepEqual(checked.sort(), ["keep@example.com", "unsubbed@example.com"]);

  // If the suppression list cannot be read, nobody is sent to.
  const down = await broadcastRecipients(["keep@example.com"], subs, async () => { throw new Error("store down"); });
  assert.equal(down.recipients.length, 0);
  assert.equal(down.suppressed, 1);

  const route = read("app/api/subscribers/broadcast/route.ts");
  assert.match(route, /broadcastRecipients\(emails, allSubs, isSuppressed\)/);
  assert.match(route, /from "..\/..\/..\/..\/lib\/growth\/consent"/);
});

test("broadcast emails carry sender ID, unsubscribe footer and one-click headers", () => {
  const deps = {
    unsubUrl: (e: string) => `https://saabai.ai/unsubscribe?e=${encodeURIComponent(e)}&t=tok`,
    unsubHeaders: (e: string) => ({ "List-Unsubscribe": `<https://saabai.ai/unsubscribe?e=${encodeURIComponent(e)}&t=tok>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }),
  };
  const m = broadcastEmail(sub("a@example.com", { firstName: "<b>Al</b>" }), { subject: "Tips", html: "<html><body><p>Hi {{firstName}}</p></body></html>", fromName: "Shane at Saabai" }, deps);
  assert.equal(m.from, "Shane at Saabai <hello@saabai.ai>");
  assert.deepEqual(m.to, ["a@example.com"]);
  assert.ok(m.html.includes("Hi &lt;b&gt;Al&lt;/b&gt;"), "name escaped");
  assert.ok(m.html.includes("ABN 44 703 735 264") && m.html.includes("Merrimac QLD 4226"), "sender ID");
  assert.ok(m.html.includes('href="https://saabai.ai/unsubscribe?e=a%40example.com&amp;t=tok"'), "unsubscribe link");
  assert.ok(m.html.indexOf("Unsubscribe") < m.html.indexOf("</body>"), "footer inside body");
  assert.equal(m.headers["List-Unsubscribe"], "<https://saabai.ai/unsubscribe?e=a%40example.com&t=tok>");
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  // Fragment without a body tag still gets the footer; header injection in the name is stripped.
  const f = broadcastEmail(sub("b@example.com"), { subject: "T", html: "<p>Hi {{firstName}}</p>", fromName: "Evil <x@y.z>\r\nBcc: z" }, deps);
  assert.ok(f.html.startsWith("<p>Hi there</p>") && f.html.includes("ABN 44 703 735 264"));
  assert.ok(!/[<>\r\n]/.test(f.from.replace(" <hello@saabai.ai>", "")));
  assert.ok(!/[\u2013\u2014]/.test(tipsFooterHtml("u")), "no dashes");
});

test("the AI Readiness checklist email is retired", () => {
  const route = read("app/api/subscribe/route.ts");
  assert.ok(!route.includes("AI Readiness checklist from Saabai"));
  assert.ok(!route.includes("WELCOME_EMAIL_HTML"));
  assert.match(route, /offer !== "score_link"/);
  assert.match(route, /status: 410/);
});

test("pop-up and /score copy match the approved wording", () => {
  const popup = read("app/components/EmailCapturePopup.tsx");
  const css = read("app/components/exit-popup.css");
  const score = read("app/score/ScoreClient.tsx");
  assert.ok(!/35000|setTimeout\([^)]*35/.test(popup), "no 35 second timer");
  assert.ok(popup.includes("Your answers stay private. We use them to work out your score, and to email your report if you ask."));
  assert.ok(popup.includes("One email with your link. No spam."));
  assert.ok(popup.includes('href="/privacy"'));
  assert.ok(popup.includes('aria-modal="true"') && popup.includes('aria-modal="false"'));
  assert.ok(!/[\u2013\u2014]/.test(popup), "no dashes in pop-up");
  assert.ok(!/20OFFBP|countdown|% off|free Blueprint/i.test(popup));
  for (const bad of ["#00bfa5", "#00e5cc", "#0e0c2e", "#8b8fa8", "#4b5563", "#d4af37", "#fbbf24", "#f59e0b", "#c9a227"]) {
    assert.ok(!popup.toLowerCase().includes(bad) && !css.toLowerCase().includes(bad), bad);
  }
  assert.ok(score.includes("Your answers stay private. We use them to work out your score, and to email your report if you ask."));
  assert.ok(!score.includes("We only use them to calculate your score"));
  assert.match(score, /href="\/privacy"/);
  assert.match(score, /SCORE_DONE_KEY/);
});

test("already sent or opted out shows a calm notice, not the server error", () => {
  const popup = read("app/components/EmailCapturePopup.tsx");
  assert.match(popup, /j\.sent === false && \(j\.reason === "rate_limited" \|\| j\.reason === "suppressed"\)/);
  assert.match(popup, /setView\("notice"\)/);
  assert.match(popup, /className="xp-note" id=\{errId\} role="status"/);
  assert.ok(popup.includes("Check your inbox for an earlier one, or take the score now."));
  // One message for both cases, so the pop-up never reveals that an address unsubscribed.
  assert.ok(!/unsubscribed|opted out/i.test(popup.match(/const NOTICE_MSG = "([^"]+)"/)?.[1] ?? "x unsubscribed"));
});
