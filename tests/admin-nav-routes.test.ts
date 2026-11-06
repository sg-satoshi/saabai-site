/**
 * Fails when an admin nav item or in-app link points at a path with no page.
 * Query strings and hashes are ignored. A ${...} segment matches a dynamic route.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chatbotHistoryPath } from "../lib/chatbot/paths";

const root = path.join(__dirname, "..");

function pages(dir: string, parts: string[] = []): string[][] {
  const out: string[][] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pages(p, [...parts, e.name]));
    else if (e.name === "page.tsx") out.push(parts.filter((seg) => !/^\(.*\)$/.test(seg) && !seg.startsWith("@")));
  }
  return out;
}

const ROUTES = pages(path.join(root, "app"));

function routeExists(href: string): boolean {
  const clean = href.split("?")[0].split("#")[0].replace(/\$\{[^}]+\}/g, "*");
  const parts = clean.split("/").filter(Boolean);
  return ROUTES.some((route) => route.length === parts.length && route.every((seg, i) => {
    if (seg.startsWith("[") && seg.endsWith("]")) return parts[i] !== "";
    return seg === parts[i] || parts[i] === "*";
  }));
}

function linksIn(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  const found: string[] = [];
  const re = /[`'"](\/(?:saabai-admin|client-portal|ai-agent|saabai-changelog|dashboard)[^`'"]*)[`'"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) found.push(m[1]);
  return found;
}

function files(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(root, "app/saabai-admin"));
  out.push(path.join(root, "lib/chatbot/paths.ts"), path.join(root, "lib/customers.ts"));
  return out;
}

test("admin nav and links point at pages that exist", () => {
  const missing: string[] = [];
  for (const file of files()) {
    for (const href of linksIn(file)) {
      if (href.startsWith("#")) continue;
      if (!routeExists(href)) missing.push(`${path.relative(root, file)} -> ${href}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every bot chat-history link is the shared admin page", () => {
  for (const slug of ["lmm-site", "cycle-repair", "nico-moretti", "tributum-law-v2", "bo-consultancy", "heaven-thai-massage", "wholesale-homes"]) {
    const href = chatbotHistoryPath(slug);
    assert.equal(routeExists(href), true, href);
    assert.match(href, /^\/saabai-admin\/chat-history\?bot=/);
  }
});
