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
  assert.match(page, /parsed \? <ConfirmNow token=\{t\} \/> : <SunderError \/>/);
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

test("one-click: auto POST on mount, once, with neutral Confirming state and retry fallback", () => {
  const src = read("app/email/confirm/ConfirmNow.tsx");
  assert.match(src, /initial = "working"/);
  assert.match(src, /useEffect\(\(\) => \{\s+if \(sent\.current \|\| initial !== "working"\) return;\s+sent\.current = true;/);
  assert.match(src, /method: "POST"/);
  assert.match(src, /state === "working"\) return <SunderConfirming \/>/);
  assert.match(src, /catch \{\s+setState\("retry"\)/);
  const pages = read("app/email/confirm/SunderPages.tsx");
  assert.match(pages, /export function SunderConfirming\(\)/);
  assert.match(pages, /<noscript>/);
  const route = read("app/api/email/confirm/route.ts");
  assert.doesNotMatch(route, /export (async )?function GET/, "GET stays side-effect free");
});
