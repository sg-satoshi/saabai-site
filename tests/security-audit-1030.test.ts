import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { formGuard, formRuleFor } from "../lib/form-guard";
import { mayActOnLeadGenClient } from "../lib/leadgen-owner-rule";
import { isValidVoiceId } from "../lib/tts-voice";
import { checkUrl } from "../lib/site-scan/ssrf";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

function adminApi(): string[] {
  const m = read("proxy.ts").match(/const ADMIN_API = \[([\s\S]*?)\];/);
  return [...(m?.[1] ?? "").matchAll(/"(\/api[^"]*)"/g)].map((x) => x[1]);
}

test("CRM and LeadGen top-up are admin-only at the proxy", () => {
  const admin = adminApi();
  assert.ok(admin.includes("/api/saabai-crm"));
  assert.ok(admin.includes("/api/leadgen/topup"));
});

test("form guard covers the email and cost endpoints, not the chat or lead routes", () => {
  for (const p of ["/api/tts", "/api/bo-contact", "/api/blueprint/score", "/api/auth/register", "/api/portal/request-access"]) assert.ok(formRuleFor(p), p);
  for (const p of ["/api/chat", "/api/leads", "/api/subscribe", "/api/auth/login", "/api/tts-other"]) assert.equal(formRuleFor(p), null, p);
});

function fakeRedis() {
  const m = new Map<string, number>();
  return { incr: async (k: string) => { const n = (m.get(k) ?? 0) + 1; m.set(k, n); return n; }, expire: async () => 1 };
}
const req = (p: string, method = "POST", ip = "203.0.113.9") =>
  new NextRequest(`https://www.saabai.ai${p}`, { method, headers: { "x-forwarded-for": ip } });

test("form guard returns 429 past the limit, per IP, and ignores reads", async () => {
  const r = fakeRedis();
  const now = Date.UTC(2026, 9, 30, 0, 5);
  for (let i = 0; i < 10; i++) assert.equal(await formGuard(req("/api/bo-contact"), r, now), null);
  const blocked = await formGuard(req("/api/bo-contact"), r, now);
  assert.equal(blocked?.status, 429);
  assert.equal(await formGuard(req("/api/bo-contact", "POST", "198.51.100.1"), r, now), null);
  assert.equal(await formGuard(req("/api/bo-contact", "GET"), r, now), null);
});

test("form guard fails open when Redis errors", async () => {
  const broken = { incr: async () => { throw new Error("down"); }, expire: async () => 1 };
  assert.equal(await formGuard(req("/api/tts"), broken), null);
});

test("LeadGen settings: owner or admin only", () => {
  assert.equal(mayActOnLeadGenClient({ kind: "owner", clientId: "a" }, "a"), true);
  assert.equal(mayActOnLeadGenClient({ kind: "owner", clientId: "a" }, "b"), false);
  assert.equal(mayActOnLeadGenClient({ kind: "admin" }, "b"), true);
  assert.equal(mayActOnLeadGenClient(null, "a"), false);
  assert.equal(mayActOnLeadGenClient({ kind: "owner", clientId: "" }, ""), false);
  assert.match(read("app/api/leadgen/notifications/route.ts"), /mayActOnLeadGenClient\(await leadGenAccessFromCookies\(\)/);
});

test("TTS voice id cannot rewrite the upstream path", () => {
  assert.equal(isValidVoiceId("WotOlpik2Jh26pUiTVLy"), true);
  for (const v of ["../../v1/voices", "abc", "a/b/cdefghijk", "x".repeat(50), 12345678901]) assert.equal(isValidVoiceId(v), false, String(v));
});

test("portal URL ingest uses the SSRF-safe fetcher", () => {
  const src = read("app/api/portal/ingest-url/route.ts");
  assert.match(src, /safeFetch\(/);
  assert.doesNotMatch(src, /[^.]fetch\(parsedUrl/);
  for (const u of ["http://169.254.169.254/latest/meta-data", "http://127.0.0.1/", "http://localhost/", "http://10.0.0.1/"]) {
    assert.throws(() => checkUrl(new URL(u)), u);
  }
});

test("top-up checkout does not echo internal error text", () => {
  assert.doesNotMatch(read("app/api/leadgen/topup/route.ts"), /e\.message/);
});
