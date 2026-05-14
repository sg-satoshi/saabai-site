#!/usr/bin/env node
// Renders public/social/ai-audit-launch-source.html to public/social/ai-audit-launch.png
// at exactly 1200×627 px using Puppeteer's bundled Chromium.

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const SRC = path.resolve(__dirname, "../public/social/ai-audit-launch-source.html");
const OUT = path.resolve(__dirname, "../public/social/ai-audit-launch.png");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 627, deviceScaleFactor: 1 });

  const fileUrl = `file://${SRC}`;
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  // Wait for fonts and images to settle
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: OUT,
    clip: { x: 0, y: 0, width: 1200, height: 627 },
    type: "png",
  });

  await browser.close();

  const stat = fs.statSync(OUT);
  console.log(`✓  Saved ${OUT} (${(stat.size / 1024).toFixed(0)} KB)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
