import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");
const OUT = "/workspace/sitefactory-filter-qa";
mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:3011";

function mintAdminCookie() {
  const code = `
    import { createSessionToken } from "./lib/auth.ts";
    (async () => {
      const id = process.env.SAABAI_ADMIN_ID || "saabai";
      const token = await createSessionToken(id);
      process.stdout.write(token);
    })();
  `;
  const r = spawnSync("npx", ["tsx", "-e", code], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error("mint failed");
  }
  return r.stdout.trim().split("\n").pop();
}

const token = mintAdminCookie();
console.log("minted session len", token.length);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function withAuth(page) {
  await page.setCookie({
    name: "saabai_session",
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
}

try {
  const page = await browser.newPage();
  await withAuth(page);

  // --- Site Factory desktop ---
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/saabai-admin/site-factory`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  let text = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log("sf desktop:", text.replace(/\s+/g, " ").slice(0, 220));
  await page.screenshot({ path: `${OUT}/sitefactory-desktop-1440.png`, fullPage: true });

  // Apply filters via URL
  await page.goto(`${BASE}/saabai-admin/site-factory?status=live&sort=az`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUT}/sitefactory-filtered-desktop-1440.png`, fullPage: true });
  const url = page.url();
  console.log("filtered url", url);

  // Open more filters
  const more = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find(b => /More filters|Filters/.test(b.textContent || "")));
  if (more && more.asElement()) {
    await more.asElement().click();
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `${OUT}/sitefactory-more-filters-desktop-1440.png`, fullPage: true });
  }

  // iPhone 14
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/saabai-admin/site-factory`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUT}/sitefactory-iphone-14.png`, fullPage: true });
  const filters = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find(b => /Filters/.test(b.textContent || "")));
  if (filters && filters.asElement()) {
    await filters.asElement().click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/sitefactory-filters-drawer-iphone-14.png`, fullPage: true });
  }

  // --- AI Agent portal CSS check ---
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await page.goto(`${BASE}/ai-agent/portal`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const cssCheck = await page.evaluate(() => {
    const root = document.querySelector(".admin-root");
    const stylesheets = [...document.styleSheets].map((s) => s.href || "inline").slice(0, 12);
    const side = document.querySelector(".admin-shell, aside, .side, nav");
    const logo = document.querySelector("img");
    const logoW = logo ? logo.getBoundingClientRect().width : null;
    // SVG icons in sidebar should be constrained
    const svgs = [...document.querySelectorAll("svg")].slice(0, 5).map((s) => ({
      w: Math.round(s.getBoundingClientRect().width),
      h: Math.round(s.getBoundingClientRect().height),
    }));
    return {
      url: location.href,
      hasAdminRoot: !!root,
      stylesheets,
      logoW,
      svgs,
      bodySample: document.body.innerText.replace(/\s+/g, " ").slice(0, 200),
    };
  });
  writeFileSync(`${OUT}/ai-agent-portal-css-check.json`, JSON.stringify(cssCheck, null, 2));
  console.log("ai-agent css", cssCheck);
  await page.screenshot({ path: `${OUT}/ai-agent-portal-desktop-1440.png`, fullPage: true });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/ai-agent/portal`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: `${OUT}/ai-agent-portal-iphone-14.png`, fullPage: true });
} finally {
  await browser.close();
}
console.log("QA done");
