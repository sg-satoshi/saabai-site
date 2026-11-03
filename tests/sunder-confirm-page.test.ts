import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMAIL_PUBLIC_ORIGIN, SUNDER_PUBLIC_ORIGIN, confirmOrigin } from "../lib/email/constants";
import { sunderAppRoute } from "../lib/sunder-factory-seed";
import { skipsFeedback } from "../app/components/ui/ButtonFeedback";

const read = (p: string) => readFileSync(p, "utf8");

test("SUNDER confirm links use sunder.com.au, others keep the default", () => {
  assert.equal(SUNDER_PUBLIC_ORIGIN, "https://sunder.com.au");
  assert.equal(confirmOrigin("sunder", EMAIL_PUBLIC_ORIGIN), "https://sunder.com.au");
  assert.equal(confirmOrigin("other", EMAIL_PUBLIC_ORIGIN), EMAIL_PUBLIC_ORIGIN);
  const w = read("lib/email/worker.ts");
  assert.match(w, /confirmUrl = `\$\{confirmOrigin\(row\.identity\.slug, origin\)\}\/email\/confirm\?t=/);
});

test("sunder host serves /email/confirm as the app route with noindex", () => {
  assert.ok(sunderAppRoute("/email/confirm"));
  assert.ok(!sunderAppRoute("/"));
  assert.ok(!sunderAppRoute("/email/confirmx"));
  const p = read("proxy.ts");
  assert.match(p, /if \(sunderAppRoute\(pathname\)\) \{\s+const res = NextResponse\.next\(\);\s+res\.headers\.set\("X-Robots-Tag", "noindex"\);/);
  assert.ok(p.includes('"/api/email/confirm"'));
});

test("confirm page copy follows COPY.md and has no banned cues", () => {
  const src = read("app/email/confirm/SunderPages.tsx") + read("app/email/confirm/ConfirmNow.tsx");
  for (const s of ["You&apos;re an <span className=\"hl\">insider</span> now.", "Let&apos;s go again.", "Get a new link", "Confirm my email", "One tap and you&apos;re", "SUNDER_SITE = \"https://sunder.com.au\"", "${SUNDER_SITE}/#f", "/giveaway-terms"]) assert.ok(src.includes(s), s);
  assert.doesNotMatch(src, /you're entered|you&apos;re entered|made in australia|australian made|\$\d|tier \d/i);
  assert.doesNotMatch(src, /[?&](ref|utm_[a-z]+)=/, "no referral params");
  const page = read("app/email/confirm/page.tsx");
  assert.match(page, /index: false/);
  assert.match(page, /parsed \? \(s === "retry" \? <ConfirmNow token=\{t\} initial="retry" \/> : <ConfirmNow token=\{t\} \/>\) : <SunderError \/>/);
});

test("confirm view maps POST status to the right state", async () => {
  const src = read("app/email/confirm/ConfirmNow.tsx");
  assert.match(src, /state === "confirmed" \|\| state === "already"\) return <SunderConfirmed \/>/);
  assert.match(src, /state === "bad"\) return <SunderError \/>/);
  assert.match(src, /state === "unsubscribed"\) return <SunderUnsubscribed \/>/);
});

test("r2: pending button styled, no Saabai toasts on /email, a11y and referrer", () => {
  const css = read("app/email/confirm/sunder-confirm.css");
  assert.ok(css.includes(".sc.pre .btn{"));
  assert.ok(!css.includes(".sc .pre "));
  assert.ok(!css.includes(".sc .note"));
  assert.ok(css.includes(".sc :focus-visible,.se :focus-visible{outline:2px solid #d4ff3a"));
  assert.ok(skipsFeedback("/email/confirm"));
  assert.ok(skipsFeedback("/email"));
  assert.ok(!skipsFeedback("/emails"));
  assert.ok(!skipsFeedback("/"));
  assert.match(read("app/components/ui/ButtonFeedback.tsx"), /skipsFeedback\(location\.pathname\)\) return orig/);
  assert.match(read("app/email/confirm/page.tsx"), /referrer: "no-referrer"/);
  assert.ok(read("app/email/confirm/SunderPages.tsx").includes("You&apos;re off the list."));
  assert.match(read("app/email/confirm/ShareSunder.tsx"), /role="status" aria-live="polite">\{copied \? "Copied" : ""\}/);
});

test("r2 gated auto-confirm: visible + interaction or dwell, once, honest comment", () => {
  const src = read("app/email/confirm/ConfirmNow.tsx");
  assert.match(src, /MIN_VISIBLE_MS = 1500/);
  assert.doesNotMatch(src, /DWELL_MS/);
  assert.match(src, /SIGNALS = \["pointerdown", "touchstart", "keydown"\] as const/);
  assert.match(src, /if \(!interacted\) return; \/\/ no timer until a real interaction/);
  assert.match(src, /if \(shown >= MIN_VISIBLE_MS\) \{ void go\(\); return; \}/);
  assert.match(src, /document\.visibilityState === "visible"/);
  assert.match(src, /if \(e\.isTrusted\)/);
  assert.match(src, /if \(sent\.current && !manual\) return;\s+sent\.current = true;/);
  assert.doesNotMatch(src, /don't run JS|do not run JS/i);
  assert.match(src, /DO render pages and run JS/);
  assert.match(src, /state === "working"|return <SunderConfirming action=\{button\} \/>/);
  assert.match(src, /<div className="sc-sr" role="status" aria-live="polite">\{SAY\[state\]\}<\/div>/);
  assert.match(src, /<form method="post" action="\/api\/email\/confirm"/);
  const pages = read("app/email/confirm/SunderPages.tsx");
  assert.ok(pages.includes("That first try didn&apos;t go through."));
  assert.match(pages, /export function SunderConfirming\(\{ action \}/);
  const route = read("app/api/email/confirm/route.ts");
  assert.doesNotMatch(route, /export (async )?function GET/, "GET stays side-effect free");
  assert.match(route, /status: 303/);
  assert.match(route, /backToPage\(req, "retry", token\)/);
  assert.match(route, /if \(isForm\) return backToPage\(req, result\.status\)/);
  assert.match(read("app/email/confirm/page.tsx"), /if \(!t && \(s === "confirmed" \|\| s === "already" \|\| s === "unsubscribed"\)\)/);
});
