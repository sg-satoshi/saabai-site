import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
process.env.SAABAI_SESSION_SECRET ||= "unit-test-secret-0123456789abcdef";
import { escapeHtml, sanitizeName } from "../lib/html-escape";
import { brisbaneTodayLabel, brisbaneGreeting } from "../lib/brisbane-time";
import { isAdminSession } from "../lib/auth";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("escapeHtml neutralises markup", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">&'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
  assert.equal(escapeHtml(undefined), "");
});

test("sanitizeName strips markup, control chars and caps length", () => {
  assert.equal(sanitizeName(`  <script>Jo</script>\n `), "scriptJo/script");
  assert.equal(sanitizeName("Zoë  O Brien"), "Zoë O Brien");
  assert.equal(sanitizeName("x".repeat(200)).length, 60);
  assert.equal(sanitizeName("{{firstName}}"), "firstName");
});

test("Brisbane labels are fixed to UTC+10 regardless of host TZ", () => {
  // 15:30 UTC on 13 Oct is 01:30 on 14 Oct in Brisbane.
  const d = new Date(Date.UTC(2026, 9, 13, 15, 30));
  assert.match(brisbaneTodayLabel(d), /14 October 2026/);
  assert.equal(brisbaneGreeting(d), "Good morning");
  assert.equal(brisbaneGreeting(new Date(Date.UTC(2026, 9, 14, 4, 0))), "Good afternoon");
  assert.equal(brisbaneGreeting(new Date(Date.UTC(2026, 9, 14, 9, 0))), "Good evening");
});

test("namespaced and legacy sessions are never admin", async () => {
  assert.equal(await isAdminSession("portal:someone@example.com"), false);
  assert.equal(await isAdminSession("rex-dashboard"), false);
  assert.equal(await isAdminSession(""), false);
  assert.equal(await isAdminSession(process.env.SAABAI_ADMIN_ID ?? "saabai"), true);
});

function pages(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? pages(p) : e.name === "page.tsx" ? [p] : [];
  });
}

test("every admin page uses the shared requireAdmin gate", () => {
  const all = [...pages("app/saabai-admin"), ...pages("app/ai-agent")].filter((p) => !p.includes(`${path.sep}login`));
  assert.ok(all.length >= 20);
  for (const p of all) assert.match(read(p), /await requireAdmin\(/, `${p} must call requireAdmin`);
});

test("admin API routes no longer compare against SAABAI_ADMIN_ID directly", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "route.ts" && /clientId (!==|===) ADMIN_ID/.test(read(p))) offenders.push(p);
    }
  };
  walk("app/api");
  assert.deepEqual(offenders, []);
  assert.doesNotMatch(read("proxy.ts"), /clientId !== ADMIN_ID/);
});

test("/api/lex-send is not public and requires a session + rate limit", () => {
  assert.doesNotMatch(read("proxy.ts"), /"\/api\/lex-send"/);
  const src = read("app/api/lex-send/route.ts");
  assert.match(src, /status: 401/);
  assert.match(src, /status: 429/);
  assert.match(src, /escapeHtml/);
});

test("subscriber names are escaped in preview and broadcast; subscribe alert escapes input", () => {
  assert.match(read("app/saabai-admin/subscribers/SubscriberDashboard.tsx"), /escapeHtml\(previewSub\?\.firstName/);
  assert.match(read("lib/broadcast.ts"), /escapeHtml\(s\.firstName/);
  // The checklist welcome email is retired (#337). The score-link email carries no visitor text,
  // and the internal alert escapes everything the visitor sent.
  const sub = read("app/api/subscribe/route.ts");
  assert.doesNotMatch(sub, /WELCOME_EMAIL_HTML/);
  assert.match(sub, /escapeHtml\(i\.email\)/);
  assert.match(sub, /escapeHtml\(i\.source\)/);
});
