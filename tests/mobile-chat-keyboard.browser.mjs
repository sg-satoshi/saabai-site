/**
 * iPhone Safari and Android Chrome emulation.
 * A fake visualViewport stands in for the on-screen keyboard.
 * Does not POST to lead, chat, signup, draft, or subscribe endpoints.
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

const lmmJs = readFileSync(join(ROOT, "public/clients/lmm-site/assets/chat-widget.js"));
const sheetJs = readFileSync(join(ROOT, "public/chat-sheet.js"));
const embedJs = readFileSync(join(ROOT, "public/embed/chat.v1.js"));

function pageHtml(scriptTag) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chat keyboard</title>
<style>
  html,body{margin:0;background:#f4efe4;font-family:Georgia,serif;color:#102225}
  #hero{position:fixed;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
  #hero h1{font-size:32px;margin:0 0 12px}
  #hero a{display:inline-block;background:#0b5d55;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-family:system-ui,sans-serif}
  #spacer{height:180vh}
</style></head><body>
  <div id="hero"><div><h1>Lifestyle Money</h1><a href="#call">Book a strategy call</a></div></div>
  <div id="spacer"></div>
  ${scriptTag}
</body></html>`;
}

const lmmPage = pageHtml('<script src="/clients/lmm-site/assets/chat-widget.js?v=13"></script>');
const embedPage = pageHtml('<script src="/embed/chat.v1.js" data-preview data-site="preview"></script>');

let serveSheet = true;
const server = createServer((req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("blocked");
    return;
  }
  const url = req.url || "/";
  if (url.startsWith("/chat-sheet.js")) {
    if (!serveSheet) { res.writeHead(404); res.end("off"); return; }
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(sheetJs);
    return;
  }
  if (url.startsWith("/clients/lmm-site/assets/chat-widget.js")) {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(lmmJs);
    return;
  }
  if (url.startsWith("/embed/chat.v1.js")) {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(embedJs);
    return;
  }
  if (url.startsWith("/embed")) {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(embedPage);
    return;
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(lmmPage);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

function boot() {
  const history = [
    { role: "bot", text: "Hi, I'm Zara. Ask me about finance, strategy, or property.", time: 1 },
    { role: "user", text: "Can I buy an investment property this year?", time: 2 },
    { role: "bot", text: "Yes. The useful next step is a strategy call so we can look at your numbers.", time: 3 },
  ];
  try { localStorage.setItem("lmm-chat-history", JSON.stringify(history)); } catch (e) {}
  window.fetch = function (url, opts) {
    const method = ((opts && opts.method) || "GET").toUpperCase();
    if (method !== "GET") return Promise.reject(new Error("blocked non-GET " + method));
    const u = String(url);
    if (/lead|signup|draft|subscribe|\/api\/chat/i.test(u)) return Promise.reject(new Error("blocked " + u));
    if (u.indexOf("config") !== -1) {
      return Promise.resolve(new Response(JSON.stringify({ greeting: "Hi, I'm Zara.", active: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    return Promise.resolve(new Response("", { status: 204 }));
  };
  const listeners = { resize: new Set(), scroll: new Set() };
  let height = window.innerHeight;
  let width = window.innerWidth;
  let offsetTop = 0;
  const fake = {
    get height() { return height; },
    get width() { return width; },
    get offsetTop() { return offsetTop; },
    get offsetLeft() { return 0; },
    get pageTop() { return offsetTop; },
    get pageLeft() { return 0; },
    get scale() { return 1; },
    addEventListener(type, fn) { (listeners[type] || (listeners[type] = new Set())).add(fn); },
    removeEventListener(type, fn) { if (listeners[type]) listeners[type].delete(fn); },
  };
  window.__setVisualViewport = function (next) {
    height = next.height;
    width = next.width || window.innerWidth;
    offsetTop = next.offsetTop || 0;
    listeners.resize.forEach((fn) => fn());
    listeners.scroll.forEach((fn) => fn());
  };
  window.__visualState = function () { return { height, width, offsetTop }; };
  Object.defineProperty(window, "visualViewport", { configurable: true, get: () => fake });
}

async function prepare(page, ua, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent(ua);
  await page.evaluateOnNewDocument(boot);
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (req.method() !== "GET" || /\/api\/(chat|lead|signup|draft|subscribe)/.test(url)) { req.abort(); return; }
    if (/chat-sheet\.js/.test(url)) {
      if (!serveSheet) { req.abort(); return; }
      req.respond({ status: 200, contentType: "application/javascript", body: sheetJs.toString() });
      return;
    }
    if (/saabai\.ai/.test(url)) { req.abort(); return; }
    req.continue();
  });
}

function clipOf(state) {
  return { x: 0, y: state.offsetTop, width: state.width, height: state.height };
}

async function openLmm(page) {
  await page.waitForSelector(".lmm-chat-button");
  await page.click(".lmm-chat-button");
  await page.waitForSelector(".lmm-chat-panel.open");
}

async function measure(page, selectors) {
  return page.evaluate((sel) => {
    const panel = document.querySelector(sel.panel);
    const header = document.querySelector(sel.header);
    const input = document.querySelector(sel.input);
    const msgs = document.querySelectorAll(".lmm-chat-message");
    const last = msgs.length ? msgs[msgs.length - 1] : document.querySelector(sel.last);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const view = window.__visualState();
    const font = input ? parseFloat(getComputedStyle(input).fontSize) : 0;
    return {
      panel: box(panel),
      header: box(header),
      input: box(input),
      last: box(last),
      view,
      font,
      sheet: !!(panel && panel.classList.contains("saabai-mobile-sheet")),
      locked: document.body.style.position,
      scrollY: window.scrollY,
      name: header ? header.innerText : "",
    };
  }, selectors);
}

function inside(box, view, pad = 2) {
  if (!box) return false;
  return box.top >= view.offsetTop - pad && box.bottom <= view.offsetTop + view.height + pad && box.left >= -pad && box.right <= view.width + pad;
}

const failures = [];
function check(cond, message) {
  if (!cond) failures.push(message);
}

const lmmSel = {
  panel: ".lmm-chat-panel",
  header: ".lmm-chat-header",
  input: ".lmm-chat-input",
  last: ".lmm-chat-message:last-of-type",
};

async function shot(page, name, clip) {
  const path = join(OUT, name);
  await page.screenshot({ path, clip });
  console.log("screenshot", path);
}

const page = await browser.newPage();
await prepare(page, IPHONE_UA, 390, 844);
serveSheet = false;
await page.goto(origin + "/", { waitUntil: "networkidle0" });
await openLmm(page);
await new Promise((r) => setTimeout(r, 300));
const beforeLayout = await measure(page, lmmSel);
const visible = 390;
const offsetTop = Math.max(0, Math.round((beforeLayout.panel ? beforeLayout.panel.bottom : 844) - visible));
await page.evaluate((next) => window.__setVisualViewport(next), { height: visible, offsetTop, width: 390 });
const before = await measure(page, lmmSel);
check(before.header && before.header.top < before.view.offsetTop, "before: header should sit above the visible area, got " + JSON.stringify(before));
check(before.input && before.input.bottom > before.view.offsetTop && before.input.top < before.view.offsetTop + before.view.height, "before: input should stay in the visible slice, got " + JSON.stringify(before.input));
await shot(page, "lmm-iphone-keyboard-before.png", clipOf(before.view));

serveSheet = true;
await page.addScriptTag({ content: sheetJs.toString() });
await page.evaluate(() => {
  const panel = document.querySelector(".lmm-chat-panel");
  window.SaabaiChatSheet.attach(panel).setOpen(true);
});
await page.waitForFunction(() => document.querySelector(".lmm-chat-panel")?.classList.contains("saabai-mobile-sheet"));
const after = await measure(page, lmmSel);
check(after.sheet, "after: sheet class missing");
check(after.panel && Math.abs(after.panel.top - after.view.offsetTop) <= 2, "after: panel top " + JSON.stringify(after.panel));
check(after.panel && Math.abs(after.panel.height - after.view.height) <= 2, "after: panel height " + JSON.stringify(after.panel));
check(inside(after.header, after.view), "after: header not in the visible viewport " + JSON.stringify(after));
check(inside(after.input, after.view), "after: input not in the visible viewport " + JSON.stringify(after));
check(after.last && after.last.bottom <= after.input.top + 4, "after: latest message should sit above the input " + JSON.stringify(after));
check(after.font >= 16, "after: input font " + after.font);
check(/Zara/.test(after.name) && /Online now/.test(after.name), "after: header copy " + after.name);
check(after.locked === "fixed", "after: page should be locked, position=" + after.locked);
await shot(page, "lmm-iphone-keyboard-after.png", clipOf(after.view));

await page.evaluate(() => window.__setVisualViewport({ height: window.innerHeight, offsetTop: 0, width: window.innerWidth }));
const restored = await measure(page, lmmSel);
check(restored.sheet && restored.panel && Math.abs(restored.panel.height - restored.view.height) <= 2, "restored height " + JSON.stringify(restored.panel));
check(inside(restored.header, restored.view) && inside(restored.input, restored.view), "restored header/input " + JSON.stringify(restored));
await page.screenshot({ path: join(OUT, "lmm-iphone-keyboard-closed.png") });
console.log("screenshot", join(OUT, "lmm-iphone-keyboard-closed.png"));

await page.click(".lmm-chat-close");
await page.waitForFunction(() => !document.querySelector(".lmm-chat-panel")?.classList.contains("saabai-mobile-sheet"));
await page.evaluate(() => window.scrollTo(0, 240));
await page.click(".lmm-chat-button");
await page.waitForSelector(".lmm-chat-panel.saabai-mobile-sheet");
await page.evaluate(() => window.__setVisualViewport({ height: 390, offsetTop: 400, width: 390 }));
const lockedScroll = await page.evaluate(() => ({ y: window.scrollY, position: document.body.style.position }));
check(lockedScroll.position === "fixed", "reopen should lock the page");
await page.click(".lmm-chat-close");
await page.waitForFunction(() => document.body.style.position !== "fixed");
const afterClose = await page.evaluate(() => window.scrollY);
check(Math.abs(afterClose - 240) <= 2, "close should restore scroll, got " + afterClose);

await page.close();

const desktop = await browser.newPage();
await desktop.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await desktop.evaluateOnNewDocument(boot);
await desktop.setRequestInterception(true);
desktop.on("request", (req) => {
  if (req.method() !== "GET") { req.abort(); return; }
  if (/chat-sheet\.js/.test(req.url())) {
    req.respond({ status: 200, contentType: "application/javascript", body: sheetJs.toString() });
    return;
  }
  if (/saabai\.ai/.test(req.url())) req.abort();
  else req.continue();
});
serveSheet = true;
await desktop.goto(origin + "/", { waitUntil: "networkidle0" });
await desktop.click(".lmm-chat-button");
await desktop.waitForSelector(".lmm-chat-panel.open");
await new Promise((r) => setTimeout(r, 200));
const desk = await measure(desktop, lmmSel);
check(!desk.sheet, "desktop should not use the phone sheet");
check(desk.panel && desk.panel.width > 300 && desk.panel.width < 420, "desktop panel width " + JSON.stringify(desk.panel));
check(desk.font < 16, "desktop input stays under 16px, got " + desk.font);
await desktop.screenshot({ path: join(OUT, "lmm-desktop-unchanged.png") });
console.log("screenshot", join(OUT, "lmm-desktop-unchanged.png"));
await desktop.close();

const android = await browser.newPage();
await prepare(android, ANDROID_UA, 412, 915);
serveSheet = true;
await android.goto(origin + "/", { waitUntil: "networkidle0" });
await openLmm(android);
await android.evaluate(() => window.__setVisualViewport({ height: 420, offsetTop: 0, width: 412 }));
await android.waitForFunction(() => {
  const panel = document.querySelector(".lmm-chat-panel");
  return panel && Math.abs(panel.getBoundingClientRect().height - 420) < 3;
});
const droid = await measure(android, lmmSel);
check(droid.sheet && inside(droid.header, droid.view) && inside(droid.input, droid.view), "android sheet " + JSON.stringify(droid));
check(droid.font >= 16, "android font " + droid.font);
await shot(android, "lmm-android-keyboard-after.png", clipOf(droid.view));
await android.close();

const embed = await browser.newPage();
await prepare(embed, IPHONE_UA, 390, 844);
serveSheet = true;
await embed.goto(origin + "/embed", { waitUntil: "networkidle0" });
await embed.waitForFunction(() => window.SaabaiChatSheet);
await embed.evaluate(() => {
  window.postMessage({
    type: "saabai-chat-config",
    open: true,
    config: {
      botName: "Zara",
      greeting: "Hi, I'm Zara. Ask me about finance, strategy, or property.",
      placeholder: "Ask about finance, strategy, or property",
      primary: "#0b5d55",
      accent: "#c49a3a",
      bg: "#f8faf7",
      text: "#102225",
    },
  }, "*");
});
await embed.waitForFunction(() => {
  const host = document.querySelector("[data-saabai-chat]");
  return host && host.shadowRoot && host.shadowRoot.querySelector(".panel.open");
});
await embed.evaluate(() => window.__setVisualViewport({ height: 390, offsetTop: 454, width: 390 }));
await embed.waitForFunction(() => {
  const host = document.querySelector("[data-saabai-chat]");
  const panel = host && host.shadowRoot && host.shadowRoot.querySelector(".panel");
  return panel && panel.classList.contains("saabai-mobile-sheet") && Math.abs(panel.getBoundingClientRect().top - 454) < 3;
});
const embedBox = await embed.evaluate(() => {
  const root = document.querySelector("[data-saabai-chat]").shadowRoot;
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
  const input = root.querySelector(".inp");
  return {
    panel: box(root.querySelector(".panel")),
    header: box(root.querySelector(".head")),
    input: box(input),
    font: parseFloat(getComputedStyle(input).fontSize),
    name: root.querySelector(".nm").textContent,
    view: window.__visualState(),
  };
});
check(Math.abs(embedBox.panel.top - 454) <= 2 && Math.abs(embedBox.panel.height - 390) <= 2, "embed panel " + JSON.stringify(embedBox.panel));
check(inside(embedBox.header, embedBox.view) && inside(embedBox.input, embedBox.view), "embed header/input " + JSON.stringify(embedBox));
check(embedBox.font >= 16 && embedBox.name === "Zara", "embed chrome " + embedBox.font + " " + embedBox.name);
await shot(embed, "embed-iphone-keyboard-after.png", clipOf(embedBox.view));
await embed.close();

await browser.close();
server.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("mobile chat keyboard checks passed");
