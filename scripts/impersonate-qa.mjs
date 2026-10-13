import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");

// Use tsx-compiled helpers via child - instead inline HMAC using same env
import { spawnSync } from "child_process";

const OUT = "/workspace/impersonate-qa";
mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:3010";

function mintCookies() {
  const code = `
    import { signImpersonation, impersonationCookieHeader, IMPERSONATE_COOKIE } from "./lib/impersonation.ts";
    import { signSession } from "./lib/portal-session.ts";
    import { IMPERSONATE_TTL_SECONDS } from "./lib/impersonation.ts";
    const { token, payload } = signImpersonation({
      adminId: "saabai",
      clientEmail: "stuscyclerepairs@gmail.com",
      clientName: "Stu",
      clientId: "cycle-repair",
      returnTo: "/saabai-admin/customers",
    });
    const portal = signSession("stuscyclerepairs@gmail.com", IMPERSONATE_TTL_SECONDS * 1000);
    process.stdout.write(JSON.stringify({
      impersonate: token,
      portal,
      name: payload.clientName,
      cookieHeader: impersonationCookieHeader(token),
    }));
  `;
  const r = spawnSync("npx", ["tsx", "-e", code], { cwd: process.cwd(), encoding: "utf8", env: process.env, maxBuffer: 5_000_000 });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error("mint failed");
  }
  const out = r.stdout.trim();
  const idx = out.lastIndexOf("{");
  return JSON.parse(out.slice(idx));
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("wrote", name);
}

const cookies = mintCookies();
console.log("minted for", cookies.name);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setCookie(
    {
      name: "portal_impersonate",
      value: cookies.impersonate,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "portal_session",
      value: cookies.portal,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  );

  // Desktop 1440
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/client-portal`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".app, .portal-auth", { timeout: 20000 }).catch(() => {});
  // Wait a beat for workspace fetch
  await new Promise((r) => setTimeout(r, 1500));
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log("desktop text sample:", bodyText.replace(/\s+/g, " ").slice(0, 240));
  await shot(page, "stu-view-desktop-1440");

  // Try mutating settings while impersonating
  const mutate = await page.evaluate(async () => {
    const res = await fetch("/api/portal/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "should-fail" }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  });
  console.log("mutate guard", mutate);
  require("fs").writeFileSync(`${OUT}/mutate-guard.json`, JSON.stringify(mutate, null, 2));

  // iPhone 14
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/client-portal`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await shot(page, "stu-view-iphone-14");
} finally {
  await browser.close();
}
console.log("QA done");
