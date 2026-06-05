#!/usr/bin/env node
/**
 * Seed script — creates a demo LeadGen client for testing.
 *
 * Usage: node scripts/seed-leadgen-client.js
 * Or via Vercel: curl -X POST https://saabai.ai/api/leadgen/setup
 *
 * This creates a config for a local plumber so we can test end-to-end.
 */

const http = require("http");
const https = require("https");

const BASE = process.env.BASE_URL || "http://localhost:3000";

const DEMO_CLIENT = {
  slug: "bne-emergency-plumbing",
  businessName: "Brisbane Emergency Plumbing",
  niche: "plumbing",
  description: "Emergency plumbing repairs, blocked drains, hot water systems, burst pipes, gas fitting",
  phone: "0400 000 000",  // placeholder — update for real client
  email: "shane@saabai.ai",  // notifications go here initially
  serviceArea: "Brisbane and surrounding suburbs (CBD to 20km radius)",
  businessHours: "24/7 — emergency callouts available",
  branding: {
    primaryColor: "#1e3a5f",
    accentColor: "#2563eb",
    widgetTitle: "Book a Plumber",
    greeting: "Hi! Need a plumber? Tell us what's happened and we'll get someone out ASAP."
  },
  status: "active",
};

async function main() {
  const url = `${BASE}/api/leadgen/config`;
  console.log(`Creating demo client at ${url}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DEMO_CLIENT),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log("✅ Demo client created!");
  console.log(JSON.stringify(data, null, 2));
  console.log("\nEmbed widget with:");
  console.log(`<script src="${BASE}/api/leadgen/widget?slug=bne-emergency-plumbing"></script>`);
}

main().catch(console.error);
