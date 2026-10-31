/** Phone chat sheets follow the visual viewport. Desktop cards stay put. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "path";
import { mobileSheetFrame, type ViewportReading } from "../lib/mobile-chat-sheet";
import { buildChatWidget } from "../lib/chat-widget-template";
import { buildWidgetScript } from "../lib/agent-widget-script";

const sheetJs = readFileSync("public/chat-sheet.js", "utf8");

function jsFrame(v: ViewportReading | null): ReturnType<typeof mobileSheetFrame> {
  const sandbox: Record<string, unknown> = { console, Number };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sheetJs, sandbox);
  const api = sandbox.SaabaiChatSheet as { frame: (reading: ViewportReading | null) => ReturnType<typeof mobileSheetFrame> };
  const raw = api.frame(v);
  if (!raw) return null;
  return { top: raw.top, left: raw.left, width: raw.width, height: raw.height, keyboard: !!raw.keyboard };
}

const readings: Array<{ name: string; v: ViewportReading | null; want: ReturnType<typeof mobileSheetFrame> }> = [
  {
    name: "desktop card is unchanged",
    v: { layoutWidth: 1280, layoutHeight: 800, coarse: false, visual: { width: 1280, height: 800, offsetTop: 0, offsetLeft: 0 } },
    want: null,
  },
  {
    name: "fine-pointer tablet stays a card",
    v: { layoutWidth: 1024, layoutHeight: 768, coarse: false, visual: { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0 } },
    want: null,
  },
  {
    name: "phone with the keyboard covering the bottom",
    v: { layoutWidth: 390, layoutHeight: 844, coarse: true, visual: { width: 390, height: 430, offsetTop: 0, offsetLeft: 0 } },
    want: { top: 0, left: 0, width: 390, height: 430, keyboard: true },
  },
  {
    name: "phone when Safari pans the visual viewport",
    v: { layoutWidth: 390, layoutHeight: 844, coarse: true, visual: { width: 390, height: 390, offsetTop: 454, offsetLeft: 0 } },
    want: { top: 454, left: 0, width: 390, height: 390, keyboard: false },
  },
  {
    name: "landscape phone still uses the sheet",
    v: { layoutWidth: 844, layoutHeight: 390, coarse: true, visual: { width: 844, height: 200, offsetTop: 0, offsetLeft: 0 } },
    want: { top: 0, left: 0, width: 844, height: 200, keyboard: true },
  },
  {
    name: "narrow window without a visual viewport uses the layout height",
    v: { layoutWidth: 400, layoutHeight: 700, coarse: false, visual: null },
    want: { top: 0, left: 0, width: 400, height: 700, keyboard: false },
  },
  {
    name: "negative pan is clamped",
    v: { layoutWidth: 390, layoutHeight: 700, coarse: true, visual: { width: 390, height: 500, offsetTop: -12, offsetLeft: -3 } },
    want: { top: 0, left: 0, width: 390, height: 500, keyboard: true },
  },
  { name: "empty reading", v: null, want: null },
];

test("sheet frame matches the shared browser script for keyboard and desktop cases", () => {
  assert.match(sheetJs, /visualViewport/);
  assert.match(sheetJs, /saabai-mobile-sheet/);
  assert.match(sheetJs, /font-size:16px !important/);
  assert.match(sheetJs, /offsetTop/);
  for (const row of readings) {
    assert.deepEqual(mobileSheetFrame(row.v), row.want, row.name);
    assert.deepEqual(jsFrame(row.v), row.want, "browser " + row.name);
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

test("every client chat widget loads the shared mobile sheet", () => {
  const files = walk(".");
  const vanilla = files.filter((file) =>
    /(?:^|\/)chat-widget\.js$/.test(file) ||
    file.endsWith("public/embed/chat.v1.js") ||
    file.endsWith("lib/chat-widget-template.ts") ||
    file.endsWith("lib/agent-widget-script.ts") ||
    file.endsWith("app/sites/bo-consultancy/layout.tsx") ||
    file.endsWith("scripts/inject-heaven-thai-chatbot.js") ||
    file.endsWith("scripts/patch-heaven-thai-avatar.js")
  );
  const react = files.filter((file) => /ChatWidget\.tsx$/.test(file));
  assert.ok(vanilla.length >= 9, vanilla.join(", "));
  assert.ok(react.length >= 4, react.join(", "));
  for (const file of vanilla) {
    const src = readFileSync(file, "utf8");
    assert.match(src, /saabaiSheet\(/, file);
    assert.match(src, /chat-sheet\.js\?v=1/, file);
    assert.match(src, /SaabaiChatSheet\.attach/, file);
  }
  for (const file of react) {
    assert.match(readFileSync(file, "utf8"), /useMobileChatSheet\(/, file);
  }
  const hook = readFileSync("lib/use-mobile-chat-sheet.ts", "utf8");
  assert.match(hook, /chat-sheet\.js\?v=1/);
  assert.match(hook, /SaabaiChatSheet\.attach/);
});

test("factory and agent scripts still parse and keep the sheet", () => {
  const cfg = { slug: "acme-plumbing", botName: "Annie", greeting: "Hi", primaryColor: "#111111", accentColor: "#c9a227", bgColor: "#ffffff", textColor: "#222222" };
  const inline = buildChatWidget(cfg);
  assert.match(inline, /saabaiSheet\(panel,/);
  assert.match(inline, /https:\/\/www\.saabai\.ai\/chat-sheet\.js\?v=1/);
  new vm.Script(inline.replace(/^<script id="sf-chat-widget">/, "").replace(/<\/script>$/, ""));
  const agent = buildWidgetScript({
    slug: "acme", agentType: null, name: "Ada", greeting: "Hi", avatar: "",
    brandColor: "#111111", accentColor: "#222222", apiEndpoint: "https://www.saabai.ai/api/ai-agent/chat",
  });
  assert.match(agent, /saabaiSheet\(panel,/);
  assert.match(agent, /https:\/\/www\.saabai\.ai\/chat-sheet\.js\?v=1/);
  new vm.Script(agent);
});

test("client script tags bust the cache after the widget change", () => {
  assert.match(readFileSync("public/clients/lmm-site/index.html", "utf8"), /chat-widget\.js\?v=14/);
  assert.match(readFileSync("public/clients/nextinvestment/index.html", "utf8"), /chat-widget\.js\?v=10/);
  for (const file of readdirSync("public/clients/nico-moretti").filter((name) => name.endsWith(".html"))) {
    assert.match(readFileSync(join("public/clients/nico-moretti", file), "utf8"), /embed\/chat\.v1\.js\?v=1\.3\.0/, file);
  }
});

/** Root-relative `/chat-sheet.js` is rewritten to `/sites/{slug}/…` on a client domain. */
function proxyRewrittenSheetUrls(src: string): string[] {
  const hits: string[] = [];
  const re = /(['"])\/chat-sheet\.js\?v=\d+\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const before = src.slice(Math.max(0, match.index - 24), match.index);
    if (/\+\s*$/.test(before)) continue;
    hits.push(match[0]);
  }
  return hits;
}

test("no widget loads the sheet from a root-relative path a custom domain would rewrite", () => {
  assert.deepEqual(proxyRewrittenSheetUrls("s.src = '/chat-sheet.js?v=1'"), ["'/chat-sheet.js?v=1'"]);
  assert.deepEqual(proxyRewrittenSheetUrls('src="/chat-sheet.js?v=1"'), ['"/chat-sheet.js?v=1"']);
  assert.deepEqual(proxyRewrittenSheetUrls('base + "/chat-sheet.js?v=1"'), []);
  assert.deepEqual(proxyRewrittenSheetUrls('src="https://www.saabai.ai/chat-sheet.js?v=1"'), []);
  const files = walk(".").filter((file) => !file.startsWith("tests/") && !file.endsWith("public/chat-sheet.js"));
  const loaders = files.filter((file) => /chat-sheet\.js\?v=/.test(readFileSync(file, "utf8")));
  assert.ok(loaders.some((file) => file.endsWith("app/layout.tsx")));
  assert.ok(loaders.some((file) => file.endsWith("lib/use-mobile-chat-sheet.ts")));
  assert.ok(loaders.some((file) => file.endsWith("public/clients/lmm-site/assets/chat-widget.js")));
  for (const file of loaders) {
    const src = readFileSync(file, "utf8");
    const bad = proxyRewrittenSheetUrls(src);
    assert.deepEqual(bad, [], `${file} loads ${bad.join(", ")}`);
    assert.match(src, /www\.saabai\.ai|base \+ "\/chat-sheet\.js\?v=1"/, file);
  }
});

test("desktop message scroll stays smooth, and Back releases the page lock", () => {
  const helper = readFileSync("lib/use-mobile-chat-sheet.ts", "utf8");
  assert.match(helper, /scrollIntoView\(\{ behavior: "smooth" \}\)/);
  assert.match(helper, /saabai-mobile-sheet/);
  for (const file of walk(".").filter((path) => /ChatWidget\.tsx$/.test(path))) {
    assert.match(readFileSync(file, "utf8"), /scrollChatToEnd\(/, file);
  }
  assert.match(sheetJs, /pagehide/);
  assert.match(sheetJs, /pageshow/);
  assert.match(sheetJs, /e\.persisted/);
  assert.match(readFileSync("next.config.ts", "utf8"), /\/chat-sheet\.js/);
  assert.match(readFileSync("next.config.ts", "utf8"), /Access-Control-Allow-Origin/);
});
