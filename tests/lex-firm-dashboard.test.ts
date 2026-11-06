import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("sidebar Firm dashboard opens inside the Lex shell, not /client-portal", () => {
  const side = read("app/lex/_components/Sidebar.tsx");
  assert.ok(side.includes('nav("dashboard", "dashboard", "Firm dashboard")'));
  assert.ok(!side.includes('href="/client-portal"'));
});

test("dashboard is firm-safe: no admin links, Contact Saabai goes to Requests, no em dashes", () => {
  const dash = read("app/lex/_components/Dashboard.tsx");
  assert.ok(!/saabai-admin/.test(dash));
  assert.ok(dash.includes("PORTAL_REQUESTS_HREF"));
  assert.ok(!dash.includes("\u2014"));
  assert.ok(!read("app/lex/_components/dashboard.css").includes("\u2014"));
});

test("/api/lex-me returns usage for firms and never for admins", () => {
  const route = read("app/api/lex-me/route.ts");
  assert.ok(route.includes("firmUsageToday(actor.firm)"));
  assert.ok(/actor\.kind === "admin"\) return Response\.json\(\{ admin: true, signedIn: true, email: null, usage: null, docs: null \}\)/.test(route));
});
