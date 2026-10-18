import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OnOff from "../app/saabai-admin/ui/OnOff";
import { matchesSite } from "../lib/chatbot/search";

const ROOT = new URL("..", import.meta.url).pathname;
const html = (p: Partial<Parameters<typeof OnOff>[0]> = {}) => renderToStaticMarkup(createElement(OnOff, { on: true, label: "Acme Plumbing chatbot", onToggle: () => {}, testId: "t", ...p }));

test("pill is a switch with ON or OFF text, aria-checked, and no aria-pressed", () => {
  const on = html();
  assert.match(on, /role="switch"/); assert.match(on, /aria-checked="true"/); assert.match(on, /aria-label="Acme Plumbing chatbot"/);
  assert.match(on, /class="onoff on"/); assert.match(on, />ON<\/button>/); assert.doesNotMatch(on, /aria-pressed/);
  const off = html({ on: false });
  assert.match(off, /aria-checked="false"/); assert.match(off, /class="onoff off"/); assert.match(off, />OFF<\/button>/);
});

test("disabled and saving states keep a clear label and are not clickable", () => {
  const d = html({ disabled: true, disabledReason: "Uses its own chat route" });
  assert.match(d, /disabled=""/); assert.match(d, /aria-disabled="true"/); assert.match(d, /title="Uses its own chat route"/); assert.match(d, />ON</);
  const b = html({ busy: true });
  assert.match(b, /aria-busy="true"/); assert.match(b, /onoff on busy/); assert.match(b, />Saving</); assert.match(b, /disabled=""/);
});

test("popover is closed until the pill is clicked; confirm props set the dialog popup hint", () => {
  const m = html({ confirmOff: { title: "Turn off Acme?", body: "x" } });
  assert.doesNotMatch(m, /role="dialog"/); assert.match(m, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html({ on: false, confirmOff: { title: "t", body: "b" } }), /aria-haspopup/, "turning ON is instant");
});

test("css: 24px pill, 8px dot, 12px/600 type, colours from the spec, 44px touch area, reduced motion", () => {
  const css = readFileSync(ROOT + "app/saabai-admin/admin.css", "utf8");
  const pill = css.slice(css.indexOf(".onoff{"));
  assert.match(pill, /\.onoff\{[^}]*height:24px[^}]*font:600 12px/);
  assert.match(pill, /\.onoff i\{width:8px;height:8px/);
  assert.match(pill, /\.onoff\.on\{background:#e3f5ec;color:#137a52/); assert.match(pill, /\.onoff\.off\{background:#fde8e6;color:#b42318/);
  assert.match(pill, /\.onoff:after\{[^}]*height:44px/); assert.match(pill, /prefers-reduced-motion/);
  assert.match(pill, /\.onoff-pop button\.danger\{background:#c42f21/);
});

test("both admin pages use the shared pill, with OFF confirm; chatbots offers an optional reason", () => {
  const ann = readFileSync(ROOT + "app/saabai-admin/announcements/AnnouncementsClient.tsx", "utf8");
  assert.match(ann, /import OnOff from "\.\.\/ui\/OnOff"/); assert.equal((ann.match(/<OnOff /g) ?? []).length, 2); assert.match(ann, /confirmOff=/);
  const cb = readFileSync(ROOT + "app/saabai-admin/chatbots/ChatbotsClient.tsx", "utf8");
  assert.match(cb, /reasonField: true/); assert.match(cb, /chatbots-search/);
});

test("search matches name, slug or domain, all words, case-insensitive", () => {
  const stu = { name: "Stu's Cycle Repairs", slug: "cycle-repair", domains: ["stuscyclerepairs.com", "www.stuscyclerepairs.com"] };
  assert.ok(matchesSite("", stu)); assert.ok(matchesSite("STU", stu)); assert.ok(matchesSite("cycle-repair", stu)); assert.ok(matchesSite("stuscyclerepairs.com", stu));
  assert.ok(matchesSite("cycle repairs", stu)); assert.equal(matchesSite("tributum", stu), false); assert.equal(matchesSite("cycle tributum", stu), false);
  assert.ok(matchesSite("acme", { name: "Acme Plumbing", slug: "acme-plumbing" }));
});
