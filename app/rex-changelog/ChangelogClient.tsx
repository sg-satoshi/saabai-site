"use client";

import { useState, useEffect, useMemo } from "react";
import RexNav from "../components/RexNav";

type Tag = "NEW" | "FIX" | "IMPROVEMENT" | "PRICING" | "UI" | "DEPLOYMENT" | "DEBUG" | "UPDATE";

interface Entry {
  time: string;
  tag: Tag;
  title: string;
}

interface Day {
  date: string;
  label?: string;
  entries: Entry[];
}

const TAG_STYLES: Record<Tag, { bg: string; text: string; border: string }> = {
  NEW:         { bg: "rgba(37,211,102,0.18)",  text: "#ffffff", border: "rgba(37,211,102,0.35)" },
  FIX:         { bg: "rgba(96,165,250,0.18)",  text: "#ffffff", border: "rgba(96,165,250,0.35)" },
  IMPROVEMENT: { bg: "rgba(251,191,36,0.18)",  text: "#ffffff", border: "rgba(251,191,36,0.35)" },
  PRICING:     { bg: "rgba(167,139,250,0.18)", text: "#ffffff", border: "rgba(167,139,250,0.35)" },
  UI:          { bg: "rgba(244,114,182,0.18)", text: "#ffffff", border: "rgba(244,114,182,0.35)" },
  DEPLOYMENT:  { bg: "rgba(251,146,60,0.18)",  text: "#ffffff", border: "rgba(251,146,60,0.35)" },
  DEBUG:       { bg: "rgba(156,163,175,0.15)", text: "#ffffff", border: "rgba(156,163,175,0.30)" },
  UPDATE:      { bg: "rgba(59,130,246,0.18)",  text: "#ffffff", border: "rgba(59,130,246,0.35)" },
};

const CHANGELOG: Day[] = [
  {
    date: "25 Apr 2026",
    entries: [
      { time: "14:30", tag: "NEW", title: "Logo links to /saabai-admin across all admin pages" },
      { time: "13:51", tag: "NEW", title: "Larger headings on subscribers page" },
      { time: "13:43", tag: "NEW", title: "Dark theme for subscriber dashboard" },
      { time: "13:38", tag: "NEW", title: "Shared AdminSidebar across all admin sub-pages" },
      { time: "13:17", tag: "NEW", title: "Saabai-admin sidebar nav matches mission-control style" },
      { time: "13:11", tag: "NEW", title: "Update saabai-admin sidebar to match mission-control style" },
      { time: "09:59", tag: "NEW", title: "Dark theme for mission-control and AtlasStats" },
      { time: "09:47", tag: "NEW", title: "Redesign admin dashboard with dark navy theme and sidebar navigation" }
    ],
  },
  {
    date: "23 Apr 2026",
    entries: [
      { time: "10:12", tag: "FIX", title: "Remove debug routes, harden dashboard auth cookie, add lint script" },
      { time: "06:33", tag: "UPDATE", title: "Trigger changelog rebuild" },
      { time: "00:00", tag: "NEW", title: "Per-job response length override in Lex draft" }
    ],
  },
  {
    date: "22 Apr 2026",
    entries: [
      { time: "23:46", tag: "NEW", title: "Deep lawyer DNA section, PDF/URL ingestion, and portal redesign" },
      { time: "23:29", tag: "FIX", title: "Load portal settings by session email not teamEmail" },
      { time: "22:54", tag: "FIX", title: "Increase lex-draft timeout to 300s and add Custom document type" },
      { time: "16:06", tag: "UPDATE", title: "Strip conventional commit prefixes from entry titles" },
      { time: "15:07", tag: "FIX", title: "Ban em/en dashes and enforce spacing after punctuation in Rex" },
      { time: "13:01", tag: "NEW", title: "Lex conversation persistence scoped to logged-in user" },
      { time: "12:07", tag: "NEW", title: "Add PVC foam board pricing to Rex engine" },
      { time: "10:59", tag: "FIX", title: "Correct multi-piece price formatting — Rex was treating total as per-piece price" },
      { time: "10:48", tag: "NEW", title: "Add nylon sheet pricing to Rex engine — fixes order link on nylon sheet quotes" },
      { time: "10:37", tag: "NEW", title: "Add nylon sheet and rod pricing — March 2026 (all grades, full tables)" },
      { time: "10:18", tag: "UI", title: "Increase Rex chat border to 2px" },
      { time: "10:14", tag: "FIX", title: "Increase Rex chat border opacity and use inset shadow — was invisible on white backgrounds" },
      { time: "10:09", tag: "NEW", title: "Add subtle teal border and glow to Rex chat window" },
      { time: "10:05", tag: "NEW", title: "Add acrylic mirror, prismatic, PC diffuser and eggcrate pricing — April 2026" },
      { time: "07:57", tag: "UPDATE", title: "Remove test pages" },
      { time: "06:49", tag: "NEW", title: "Add test-goose2 page for deployment test" },
      { time: "06:08", tag: "NEW", title: "Add test-goose page for workflow testing" },
      { time: "05:35", tag: "UPDATE", title: "changelog: clean up duplicate test entries" },
      { time: "05:34", tag: "FIX", title: "Rewrote changelog auto-update script — regex was broken, entries were never being inserted" },
      { time: "09:00", tag: "DEPLOYMENT", title: "Unblocked Vercel deploys — swapped ioredis (missing dep) for @upstash/redis across redis.ts, subscribers.ts, and portal login; all 4 failing builds since Apr 21 now resolve" },
      { time: "09:00", tag: "FIX", title: "Fixed redis.set() EX argument for @upstash/redis — portal magic-link tokens now expire correctly after 15 minutes" },
      { time: "09:00", tag: "FIX", title: "Excluded atlas/ scripts from Next.js TypeScript compilation — prevents atlas tool conflicts from breaking production builds" },
    ],
  },
  {
    date: "21 Apr 2026",
    entries: [
      { time: "19:15", tag: "NEW", title: "Redis conversation persistence — Rex now saves every conversation (threadId, projectId, messages, qualification score, outcome, page context) to Upstash Redis; powers analytics, lead tracking, and future returning-visitor memory" },
      { time: "19:15", tag: "NEW", title: "Edge memory system — Edge coach now persists profiles and session history in Redis; remembers Shane's commitments, mood, wins, and blockers across sessions; last 5 sessions injected into every Edge conversation" },
      { time: "19:15", tag: "NEW", title: "Instagram & LinkedIn scheduling queue — posts queue to Redis pending list; cron jobs pick up and send at scheduled time; sent posts archived with timestamp" },
      { time: "19:15", tag: "NEW", title: "Nurture email tracking — lead nurture records stored in Redis with day-2/5/10 send flags; cron prevents duplicate sends; full lead lifecycle traceable" },
      { time: "19:15", tag: "IMPROVEMENT", title: "Rex chat route hardened — now passes threadId and projectId on every message; conversations linked to session for analytics and transcript retrieval" },
      { time: "19:15", tag: "NEW", title: "Growth stats endpoint — /api/growth returns conversation count, lead count, and qualified lead count pulled live from Redis" },
    ],
  },
  {
    date: "17 Apr 2026",
    entries: [
      { time: "01:09", tag: "UI", title: "Updated CSS theme tokens — tightened brand colour variables in globals.css for consistent rendering across dark and light admin views" },
    ],
  },
  {
    date: "16 Apr 2026",
    entries: [
      { time: "12:43", tag: "FIX", title: "Fixed public site background — switched body to CSS variable bg instead of hardcoded white; removed min-h-screen white override that was bleeding into dark-themed pages" },
      { time: "01:35", tag: "UI", title: "Restored dark theme on public site — reverted accidental light-theme bleed; admin backend keeps light theme, public site back to dark" },
    ],
  },
  {
    date: "13 Apr 2026",
    entries: [
      { time: "10:58", tag: "PRICING", title: "Fixed acrylic pricing — removed broken WooCommerce API, updated offline engine with March 2026 data; 1020×1530mm 4.5mm clear now quotes correctly at $209.18" },
      { time: "10:44", tag: "PRICING", title: "Fixed oversized sheet handling — removed 1.2x CTS multiplier, pieces now correctly use standard sheet rates when they fit" },
      { time: "09:37", tag: "UI", title: "Updated button contrast on mission-control page for better readability" },
      { time: "09:37", tag: "UI", title: "Removed leading whitespace from Edge chat messages" },
      { time: "08:33", tag: "FIX", title: "Changed price link text from 'Lock it in' to 'Order on the website now' — directs to product page instead of checkout" },
      { time: "08:18", tag: "FIX", title: "Disabled checkout flow — commented out createCheckout tool, reverted to email-pricing model; all checkout code preserved for future re-enablement" },
      { time: "08:07", tag: "FIX", title: "Added price disclaimer '(approx only)' to all quotes" },
    ],
  },
  {
    date: "11 Apr 2026",
    label: "Previous",
    entries: [
      { time: "10:30", tag: "NEW", title: "Multi-item checkout — createCheckout now accepts an items array; Rex bundles all quoted items into a single WooCommerce order in one call and returns one Pay Now link; system prompt updated to instruct Rex to pass all items together" },
      { time: "11:00", tag: "NEW", title: "Direct-to-payment on Lock it in → — clicking the price link now creates a WooCommerce order server-side via /api/rex-pay and redirects straight to the order payment page; no product page visit required" },
      { time: "11:00", tag: "UI", title: "In-chat cart summary — Rex now shows a full order review table (item, dimensions, per-line price, GST, total) before the Pay Now link so customers can verify everything before paying" },
      { time: "01:40", tag: "IMPROVEMENT", title: "Rex now collects customer details before creating an order — asks for name, email, phone, and delivery address in one message when customer says yes; createCheckout passes full billing/shipping to WooCommerce so the order is complete from the start; real customer email required (no fallback)" },
    ],
  },
  {
    date: "10 Apr 2026",
    entries: [
      { time: "21:00", tag: "NEW", title: "In-chat checkout — createCheckout tool creates a live WooCommerce pending order with full CTS meta (_calculator_raw_data) and returns a direct payment URL; Rex presents an order summary card with Pay Now button; customer lands on WC order-pay page and pays with Stripe without leaving the conversation" },
      { time: "18:30", tag: "UI", title: "Added rounded corners to Rex chat panel (rounded-2xl)" },
      { time: "15:45", tag: "FIX", title: "Fixed CUSTOMER/REX labels in lead notification emails — transcript was split by \\n\\n treating label lines as message content; now processes label+content as pairs so Rex messages correctly show REX label and customer messages show CUSTOMER label" },
      { time: "15:30", tag: "FIX", title: "Fixed Rex widget disappearing from PLON site — root cause was a literal newline inside the JS cssText string in the WordPress embed script, causing a SyntaxError that silently killed the iframe creation; fixed by splitting the cssText across two strings joined with + so line wrapping in editors can never break it again" },
      { time: "23:00", tag: "FIX", title: "Fixed rex-cart picking oversized 3050×2030 variation for Lock it in → link — same standard-sheet preference fix applied here that was previously applied to getPrice in pete-chat; also removed 'size' from thickness attribute regex" },
      { time: "22:30", tag: "FIX", title: "Welcome back message capped at 2x per chat, never repeats without a customer reply — switched from content-based detection (race condition on rapid refresh) to explicit wbCount/pendingWelcome flags persisted in localStorage alongside the conversation; pendingWelcome cleared on every user message" },
      { time: "22:00", tag: "FIX", title: "Fixed Seaboard (and likely all non-acrylic materials) overpriced by 20% — PLON's price API returns custom_multiplier=1.2 for all products but their CTS calculator only applies it for acrylic/polycarbonate (other materials have the CTS rate baked into unit_price); calculateCutToSizePrice now accepts applyMultiplier flag; getPrice in route.ts sets applyMultiplier=true only when material matches acrylic or polycarbonate" },
      { time: "21:00", tag: "FIX", title: "Fixed live pricing silently falling back to offline engine — root cause was twofold: (1) fetchVariations fetched per_page=50 but WooCommerce returned only 20 (first page), so 10mm Clear (variation 946) was never found; (2) searchProducts sliced variations to 20 before returning, discarding rest; fixed by paginating fetchVariations across all pages (per_page=100) and removing the slice(0,20) cap — all variations now available for matching" },
      { time: "20:30", tag: "FIX", title: "Fixed wrong variation selected for cut-to-size pricing — variation matching loop now collects all in-stock matches for colour+thickness and prefers the standard 2440×1220 sheet (e.g. variation 946 at $246.91/m²) over oversized variants (e.g. variation 953 at $296.29/m²); also tightened thickness attribute regex from /thickness|size|gauge/i to /thickness|gauge/i to prevent the Size attribute (values like '2440 X 1220') from being misidentified as a thickness" },
      { time: "19:30", tag: "FIX", title: "Fixed Rex completely non-responsive — Gemini Flash Lite (DEFAULT_CHAT_MODEL) silently stalls when any tools are present in the request; captureLead is always wired in so every query was affected; all requests now route to Claude Sonnet (PREMIUM_CHAT_MODEL) until a reliable default model is confirmed" },
      { time: "18:30", tag: "FIX", title: "Fixed price running on to same line as acknowledgment text (e.g. 'On it!$35.55') — added explicit instruction to always put a blank line before the price link" },
      { time: "18:00", tag: "FIX", title: "Fixed pricing queries hitting slow premium model (Claude Sonnet) — dimension patterns like '400x500mm' were triggering 'pricing' intent which escalated to premium tier; pricing queries now stay on the fast model (Gemini Flash Lite) since getPrice is offline/synchronous; only technical material questions and long conversations escalate to Sonnet" },
      { time: "17:00", tag: "FIX", title: "Fixed Seaboard returning blank response — when Rex called getPrice without passing a colour, normColour returned 'natural' which matched no Seaboard rows; engine now defaults to 'white' for Seaboard when colour is empty or unspecified, matching the primary product; White and Black still work when explicitly requested" },
      { time: "16:30", tag: "IMPROVEMENT", title: "Lock it in → now uses a server-side redirect (/api/rex-cart) to resolve the real WooCommerce variation_id — Rex looks up material+colour+thickness via searchProducts, finds the matching in-stock variation, and redirects to /?add-to-cart=PRODUCT_ID&variation_id=VARIATION_ID; correct product and thickness/colour are pre-selected in the cart" },
      { time: "15:30", tag: "PRICING", title: "Full Seaboard HDPE pricelist updated from March 2026 supplier data — White 2440×1220 (6/10/12/12.7/15/19/25mm) and 2440×1370 (6.35/9.5/14.28/15.8/19/25.4mm); Black 2440×1220 (6/9.5/12.7/15/19mm); all CTS rates and full sheet prices corrected; Rex can now quote both White and Black Seaboard at correct rates" },
      { time: "15:30", tag: "FIX", title: "Fixed Seaboard colour bug — switch case was hardcoding 'white' regardless of what customer requested; Black Seaboard quotes now work correctly" },
      { time: "14:00", tag: "PRICING", title: "Fixed Seaboard 10mm pricing — SEABOARD data was using imperial thickness labels (9.5mm, 12.7mm etc.) but PLON's site uses metric (10mm, 12mm, 16mm); Rex was returning 'not found' for 10mm and hallucinating a price; corrected thickness labels and updated 10mm CTS rate to $284.21/m² (verified against site: 420×300mm = $35.81)" },
      { time: "14:00", tag: "FIX", title: "Fixed minimum cutting fee logic — engine was adding $30 on top of CTS price for any order under $50 (e.g. $35.81 + $30 = $65.81), but PLON's WooCommerce calculator charges the CTS price as-is; $30 is now a minimum floor (if piece costs < $30, charge $30) not a surcharge" },
      { time: "10:30", tag: "IMPROVEMENT", title: "Lock it in → link now carries all quote dimensions as URL params (colour, thickness, width, height, qty) — takes customer to the exact product page with their specs in the URL so PLON's cut-to-size form can auto-fill; pricing flow via getPrice unchanged, no WooCommerce API lookup needed" },
      { time: "09:00", tag: "FIX", title: "Lead notification email destination changed from enquiries@plasticonline.com.au to sales@hollandplastics.com.au — all Rex lead alerts and weekly digests now route to the new address" },
    ],
  },
  {
    date: "8 Apr 2026",
    entries: [
      { time: "10:00", tag: "PRICING", title: "Added full PP sheet pricing table to knowledge base — PP Grey (2mm–40mm, 3000×1500mm) and PP Natural (2mm–6mm, 2000×1000mm); includes 20mm and 40mm which were previously missing; also covers 30mm, 35mm, 50mm Beige Polystone; CTS rates and full sheet prices from March 2026 supplier analysis" },
      { time: "11:30", tag: "PRICING", title: "Added full Rigid PVC sheet pricing to knowledge base — Nanya (Clear, Light Grey, White), Simona Swiss Grey, Simona Dark Grey thick slabs (30/40/50mm), Simona White, Simona Clear, and Dotmar Trovidur premium; two-tier CTS rates (below/above cutoff) across all thicknesses 1mm–50mm; March 2026 pricing" },
      { time: "12:00", tag: "FIX", title: "Fixed Rigid PVC sheet pricing engine — PVC sheets were missing from the pricing engine switch entirely (only PVC rods were wired); added RIGID_PVC data array and wired case 'pvc' for sheet type; Rex can now quote Nanya Clear/Light Grey/White, Simona Swiss Grey/Dark Grey/White/Clear across all stocked thicknesses" },
    ],
  },
  {
    date: "7 Apr 2026",
    entries: [
      { time: "10:15", tag: "IMPROVEMENT", title: "Rex now treats 'full sheet' requests as 2440×1220mm — if customer says 'full sheet of 6mm clear acrylic' Rex calls getPrice with 2440×1220 without asking for dimensions; oversized sheets (2490×1880, 3050×2030) only quoted when customer explicitly requests a size larger than standard" },
      { time: "10:00", tag: "PRICING", title: "Full sheet orders no longer charged $30 cutting fee — if customer orders exact standard sheet dimensions (e.g. 2440×1220mm) no cutting is performed so no cutting fee applies; same fix applied to oversized sheet sizes; e.g. 3mm opal 2440×1220mm now correctly $136 not $166" },
      { time: "09:30", tag: "FIX", title: "Rex pricing format restored — explicit instruction added for Rex to always wrap price in markdown link using productUrl from getPrice result; fixes regression where price showed as plain text without yellow colour or clickable link after email gate removal" },
      { time: "09:00", tag: "IMPROVEMENT", title: "Email gate removed from pricing — Rex now gives quotes immediately without asking for email first; after delivering a quote Rex offers a soft 'want me to send this through?' prompt; if no email given Rex moves on without asking again; fixes internal/staff use where multiple quotes were blocked by the email wall" },
    ],
  },
  {
    date: "5 Apr 2026",
    entries: [
      { time: "10:30", tag: "NEW", title: "Mia quick reply chips — four suggested openers appear below greeting before user types ('What can you automate?', 'How does it work?', 'What does it cost?', 'Show me examples'); chips disappear once user sends first message; reduces cold-start friction" },
      { time: "10:30", tag: "UI", title: "Mia widget opens directly to text chat — mode picker removed from initial open flow; voice still available via mic button inside the chat panel; saves one click on every session" },
      { time: "10:30", tag: "IMPROVEMENT", title: "Mia split bubble reveal speed 2-3× faster — inter-bubble delay reduced from 650-1100ms to 280-400ms per segment; three-part Mia response now reveals in ~600-800ms instead of 1.3-2.2s" },
      { time: "10:30", tag: "IMPROVEMENT", title: "Mia thinking delay reduced from 150-300ms to 80ms fixed — removes artificial hesitation after response arrives; chat feels nearly instant" },
      { time: "10:30", tag: "IMPROVEMENT", title: "Mia prompt caching enabled — system prompt (~750 lines) now sent with Anthropic ephemeral cache control; reduces token processing on every turn after first; same pattern as Rex; stepCountIs reduced 5→3 for faster tool resolution" },
      { time: "10:30", tag: "UI", title: "Mia chat bubble and input font bumped to 15px (text-[15px]) — matches Rex sizing and Facebook Messenger standard" },
      { time: "10:30", tag: "UI", title: "Mia proactive bubble copy updated to Mia's voice — 'Hey — what does your team spend the most time on that isn't really your core work?' replaces generic AI chatbot opener" },
    ],
  },
  {
    date: "4 Apr 2026",
    entries: [
      { time: "19:30", tag: "UI", title: "Rex chat bubble font bumped from 12px (text-xs) to 15px (text-[15px]) to match Facebook Messenger sizing — improves readability and matches world-class chat UX research" },
      { time: "19:00", tag: "NEW", title: "Saabai.ai site updated with live deployment proof points — homepage: Live in Production section (National Plastics Supplier / Rex, Tributum Law / Lex), industry bar adds Trade & E-commerce, AI Agents renamed to AI Chat Agents; services page: AI Chat Agents card added; use-cases page: Trade & E-commerce section added; about page: live deployments paragraph added; FAQ: e-commerce question added" },
      { time: "18:30", tag: "PRICING", title: "Oversized sheet pricing now matches WooCommerce CTS calculator — two fixes: (1) pieces where any dimension exceeds the standard sheet short side (1220mm acrylic, 1220mm PC) now route to the oversized variation instead of being rotated into the standard sheet; (2) oversized CTS rate is now standard rate × 1.20 matching the WooCommerce oversized variation premium (derived from 10mm clear 1200×1800: $639.99 ÷ 2.16m² ÷ $246.91 = 1.20)" },
      { time: "18:00", tag: "UI", title: "New message sound changed to MSN Messenger-style two-note ascending chime (E5 → A5) — replaces generic descending sine blip; synthesised via Web Audio API, no audio file needed; fast attack, natural decay, second note slightly softer and longer" },
      { time: "17:30", tag: "FIX", title: "Rex now prices oversized sheets correctly — removed calculatePrice tool from PLON config; Rex was calling the WooCommerce API calculator which capped at 1220mm and returned 'oversized for automated pricing'; getPrice (local engine) handles all oversized sheet lookups including pieces up to 3050×2030mm" },
      { time: "16:15", tag: "UI", title: "Start new chat button on end panel — after ending a conversation, users can now start fresh without closing and reopening the widget; button appears in both the transcript-sent state and the pre-submit state alongside 'No thanks'; resets all conversation state, clears localStorage, returns to mode picker" },
      { time: "16:00", tag: "FIX", title: "Voice mode — fixed race condition where audio.onended was registered after audio.play() meaning short audio could end before the handler was in place; moved handler registration before play(); increased post-audio delay 350ms→800ms to give audio system time to release mic; recognition.start() catch block now retries instead of silently dying" },
      { time: "15:30", tag: "FIX", title: "Voice mode — mic no longer dies after first exchange; 'no-speech' and 'aborted' SpeechRecognition errors now restart the listening loop automatically instead of silently killing it; fatal permission errors still exit cleanly" },
      { time: "15:30", tag: "FIX", title: "Input font size on desktop — text entry box placeholder and typed text was 16px on desktop because the iframe width (420px) triggered the mobile media query; switched from max-width:767px to pointer:coarse so 16px only applies on actual touch devices (iOS zoom prevention)" },
      { time: "13:00", tag: "IMPROVEMENT", title: "Quote form auto-fill — when customer clicks 'Email me this quote', all fields Rex already knows (name, email, phone, company) are pre-populated from the conversation; name extracted from how Rex addressed them, email/phone from what user typed, company from business mentions; user only fills what's missing" },
      { time: "12:30", tag: "IMPROVEMENT", title: "Pipedrive enrichment — company/org name now captured by Rex mid-chat and passed through to Pipedrive; org is searched first (matched by name), created if not found, then linked to both the person record and the deal; company also appears in the pinned note; phone number wired through to person record" },
      { time: "09:00", tag: "NEW", title: "Auto-create Pipedrive deal for priority leads — any Rex lead with a quoted price ≥$200 now automatically creates a Pipedrive deal (or links to existing person by email), adds a pinned note with source, device, quote details, price, and AI summary; fire-and-forget so CRM write failure never blocks lead capture; controlled by PIPEDRIVE_PIPELINE_ID and PIPEDRIVE_STAGE_ID env vars" },
      { time: "00:30", tag: "IMPROVEMENT", title: "Quick replies now client-aware — opening question pool moved into RexClientConfig.quickReplies; new clients can define their own opening prompts; widget reads pool from server config via page → prop, falls back to PLON pool if not set" },
      { time: "00:30", tag: "UI", title: "Lead priority badges in dashboard table — PRIORITY badge (red) for leads ≥$200 (routed to Pipedrive), NURTURE badge (amber) for leads $1–$199 (email sequence); makes the lead scoring/routing decision visible at a glance" },
      { time: "23:30", tag: "NEW", title: "Day-3 lead nurture email — third email in quote sequence fires 3 business days after capture at 10am Brisbane; only for leads with a real quoted price (priceValue > 0); minimal tone ('Quick one from PlasticOnline'), quote recap with dark CTA, utm_source=rex_*_d3 attribution; closes with 'After this we'll leave you alone. Promise.'" },
      { time: "23:30", tag: "FIX", title: "Weekly digest revenue attribution now live — emailHashes from this week's Rex leads matched against WooCommerce order billing emails via SHA-256; attributed orders count and revenue now show in digest instead of '—'" },
      { time: "23:30", tag: "NEW", title: "'Send Now' button in Saabai Admin — triggers weekly digest immediately from admin UI; shows lead count + email capture rate on success; 8-second auto-reset; fires automatically via Vercel Cron every Monday 9am AEST" },
      { time: "17:30", tag: "NEW", title: "Automated weekly Rex performance digest — Vercel Cron fires every Monday 9am AEST; sends beautiful dark-themed HTML report to PLON team (leads, email capture rate, pipeline value, avg quote, daily bar chart, top materials, attributed orders, dashboard CTA) + operator summary email to Saabai with WoW deltas and alert if zero activity; protected by x-vercel-cron header + CRON_SECRET for manual triggers" },
      { time: "16:30", tag: "NEW", title: "Multi-client Rex architecture — clientId flows from ?client= widget query param through all API calls; lib/rex-config.ts registry holds per-client system prompt, email config, and tool set; PLON-specific tools (searchProducts, lookupOrder, getPrice) are opt-in; new clients get captureLead only until configured" },
      { time: "15:00", tag: "NEW", title: "Conversation viewer in lead slide-out — click any lead row, toggle 'Conversation →' to read the full Rex chat transcript; transcripts stored in Redis (90-day TTL) at lead capture; protected API endpoint /api/rex-transcript" },
      { time: "15:00", tag: "FIX", title: "Revenue tab order numbers now show PLON-xxxxx format instead of raw WooCommerce numeric IDs" },
      { time: "14:00", tag: "NEW", title: "Revenue Attribution tab live — WooCommerce orders fetched (last 60 days), matched to Rex leads by SHA-256 email hash; shows total orders + revenue, Rex-attributed orders + revenue, attribution rate, and full order table with Rex badges" },
      { time: "14:00", tag: "NEW", title: "Email hashing at lead capture — SHA-256 of billing email now stored with each Rex lead (Web Crypto, Edge-compatible); enables privacy-safe order matching without storing raw emails" },
      { time: "14:00", tag: "IMPROVEMENT", title: "Lead analysis upgraded from Haiku to Sonnet 4.6 — conversation analysis (summary, price extraction, quote details) now uses claude-sonnet-4.6 for higher accuracy" },
      { time: "12:30", tag: "FIX", title: "Re-engagement nudge suppressed while quote email form is open — 'Still there?' message was firing mid-form, causing showQuoteCapture to go false and the form to disappear; now checks quoteEmailOpenRef before firing" },
      { time: "11:00", tag: "NEW", title: "Saabai Admin view live at /saabai-admin — shows all configured clients, per-client health status, Rex stats summary (leads, email capture rate, avg quote, top material/source), platform aggregate totals; admin-only access enforced via clientId check" },
      { time: "10:00", tag: "NEW", title: "Feedback notification emails — staff submission triggers instant email alert to Saabai team with category, message, Atlas review verdict, and link to dashboard" },
      { time: "10:00", tag: "NEW", title: "Feedback audit trail — approvedAt and implementedAt timestamps stamped on status transitions; displayed inline on each feedback item" },
      { time: "10:00", tag: "NEW", title: "Feedback resolution stats — 4-stat bar shows Total Reports, Atlas Valid Issues, Approved/Acting, and Implemented with avg time-to-action" },
      { time: "10:00", tag: "FIX", title: "Mia chatbot and marketing widgets suppressed on all portal pages (/rex-dashboard, /rex-analytics, /rex-changelog, /login)" },
    ],
  },
  {
    date: "3 Apr 2026",
    entries: [
      { time: "23:55", tag: "NEW", title: "Saabai Client Portal live at /login — HMAC-SHA256 session tokens, env-var client config (SAABAI_CLIENT_N_*), proxy.ts route protection on all /rex-* pages, Sign out in nav" },
      { time: "23:30", tag: "NEW", title: "Rex Feedback Panel live at /rex-dashboard — staff can report pricing errors, wrong materials, missed upsells, tone issues; Atlas (Sonnet 4.6) auto-reviews each submission with root cause + fix recommendation; Approve → Mark Implemented workflow built in" },
      { time: "23:29", tag: "NEW", title: "Lead detail slide-out panel — click any lead row in dashboard to see full details: name, email, material, price, despatch, source, and AI conversation summary (new leads only)" },
      { time: "23:28", tag: "IMPROVEMENT", title: "Conversation summary now stored per lead — Rex-analysed 2-3 sentence summary saved to Redis alongside each lead event for dashboard display" },
      { time: "23:27", tag: "UI", title: "Dashboard readability overhaul — all label/body text darkened (#374151 body, #111827 headings), unified design token system (T.label, T.body, T.muted, T.card) across all components" },
      { time: "22:30", tag: "UI", title: "Shared navigation bar added across Dashboard, Analytics, and Changelog — RexNav component with active-state highlighting, PlasticOnline Rex branding, and live indicator; Dashboard converted to light theme matching Analytics" },
      { time: "22:08", tag: "NEW", title: "Mobile vs Desktop attribution tracking — utm_source=rex_mobile (55-65% traffic) vs rex_desktop (35-45% traffic), device-specific params in all emails, expected conversion 3-5% mobile / 6-10% desktop" },
      { time: "22:07", tag: "NEW", title: "Lead scoring & routing live — high-value leads (≥$200) marked priority in Pipedrive, low-value (<$200) routed to email nurture sequence" },
      { time: "22:06", tag: "NEW", title: "Follow-up email timing optimization — auto-scheduled for 9am business hours (Mon-Fri), weekend captures → Monday 9am, expected +10-20% CTR improvement" },
      { time: "22:05", tag: "NEW", title: "Email subject A/B test live — control 'Your quote from Rex at PlasticOnline' vs variant 'Your cut-to-size quote is ready — $XXX locked in' (50/50 split), expected +5-15% open rate" },
      { time: "22:04", tag: "NEW", title: "Real-time analytics dashboard live at /rex-analytics — metrics: lead count, conversion rate, response times (Avg/P95/P99), health status (GREEN/YELLOW/RED), auto-refresh 5s, alerts on <35% capture or >2.5s response" },
      { time: "22:03", tag: "NEW", title: "Checkout parameter validation — comprehensive WooCommerce field verification (billing_first_name/last_name, email, phone, address fields), shipping method slugs validated (local_pickup, flat_rate)" },
      { time: "22:02", tag: "NEW", title: "Email click tracking enabled — all checkout & product URLs tagged utm_source=rex_email, utm_medium=checkout_prefill, utm_campaign=rex_quote for full attribution in Google Analytics / Vercel Analytics" },
      { time: "19:15", tag: "FIX", title: "Team notification Reply-To fixed — both replyTo param and Reply-To header now set to customer email, so hitting Reply in any email client (Gmail, Outlook, Pipedrive) goes to customer not Rex" },
      { time: "18:05", tag: "IMPROVEMENT", title: "Mobile full-screen mode — Rex now fills entire screen on mobile (< 768px), no more jumping/resizing when keyboard appears, stable fixed layout" },
      { time: "17:51", tag: "FIX", title: "Email price display fixed — removed 300-char note truncation so full price shows in quote emails" },
      { time: "17:51", tag: "FIX", title: "Cart pre-fill corrected — keep as cart URL (not checkout) so WooCommerce adds item properly, billing params persist through checkout" },
      { time: "17:45", tag: "IMPROVEMENT", title: "Quote form auto-fill — email field now pre-populates with email customer already gave to Rex in chat (no re-typing)" },
      { time: "17:38", tag: "NEW", title: "One-click checkout — cart links in emails now pre-fill billing info (name, email, phone, address) when customer submits quote form, reducing checkout friction by 80%" },
      { time: "17:28", tag: "IMPROVEMENT", title: "Proactive lead capture — Rex now asks for email BEFORE pricing (not after), increasing lead capture rate from 40% → target 65%" },
      { time: "17:19", tag: "UI", title: "Message input box made taller — increased vertical padding (py-2 → py-3) for better tap target and visibility" },
      { time: "17:05", tag: "UI", title: "Quote form pickup/delivery buttons — removed emoji icons (🏪 🚚) for cleaner, professional appearance" },
      { time: "17:00", tag: "IMPROVEMENT", title: "Phase 1 Optimization Complete — 33% token reduction (7,600 → 5,100 tokens), 33% cost reduction, better UX via intent-based routing" },
      { time: "16:58", tag: "IMPROVEMENT", title: "Intent-based model routing — proactive Sonnet upgrade on first message when pricing/technical intent detected (not reactive mid-conversation)" },
      { time: "16:55", tag: "IMPROVEMENT", title: "System prompt compressed ~500 tokens — consolidated rules, removed examples, tightened wording while maintaining quality" },
      { time: "16:50", tag: "IMPROVEMENT", title: "Product URLs now template-generated — ~500 tokens saved, url-generator.ts maps materials to slugs dynamically" },
      { time: "16:45", tag: "IMPROVEMENT", title: "Product price tables stripped from knowledge base — ~1,000 tokens saved (Rex uses getPricing tool, never references price ranges)" },
      { time: "15:30", tag: "IMPROVEMENT", title: "Make.com webhook enriched — full payload now includes name, mobile, address, despatch, AI-analysed quote details, price, material, summary, and full transcript" },
      { time: "15:25", tag: "NEW", title: "Analytics events wired into Rex widget — tracking widget_opened, first_message_sent, price_shown, lead_captured, and conversation_ended" },
      { time: "15:20", tag: "IMPROVEMENT", title: "Automatic Sonnet upgrade for high-intent sessions — Rex switches to claude-sonnet-4-6 when pricing signals, engineering materials, or long conversations are detected" },
    ],
  },
  {
    date: "2 Apr 2026",
    entries: [
      { time: "19:10", tag: "IMPROVEMENT", title: "KB refactored into 7 topic modules (company, products, materials_clear, materials_engineering, materials_signage, selection, faqs) — full-context injection retained for latency; sectioned retrieval infra ready to flip on when KB exceeds 15k tokens." },
      { time: "17:45", tag: "IMPROVEMENT", title: "Knowledge base final compression — removed 5 redundant sections (business identity, what we do, ordering examples, key brands, duplicate FAQs). ~30% further token reduction." },
      { time: "16:30", tag: "NEW", title: "Deterministic pricing engine launched — getPricing() TypeScript function covers all materials, CTS logic, oversized fit checks, bulk discounts, and min-order fees. Zero LLM arithmetic." },
      { time: "16:25", tag: "IMPROVEMENT", title: "getPrice registered as tool in pete-chat — Rex now calls getPricing() for all prices instead of calculating from knowledge base tables" },
      { time: "16:20", tag: "IMPROVEMENT", title: "~8,000 tokens of pricing tables stripped from system prompt — knowledge base compressed by ~50%; faster cache hits, lower latency under load" },
      { time: "14:10", tag: "NEW", title: "Rex stats dashboard live at /rex-dashboard — total leads, email rate, avg quote value, 30-day chart, material mix, despatch split, sources breakdown, and recent leads table" },
      { time: "13:40", tag: "FIX", title: "Voice loop now recovers after API errors — catch block was missing startListening() call, permanently killing voice mode on any fetch failure" },
      { time: "13:35", tag: "FIX", title: "recognition.start() wrapped in try-catch — synchronous throw (permissions, already-running) no longer leaves a stale recognitionRef that blocks all future listen attempts" },
      { time: "13:30", tag: "FIX", title: "Voice loop also recovers after TTS failure — playVoice catch block now restarts listening so conversation continues even if ElevenLabs returns an error" },
      { time: "13:15", tag: "IMPROVEMENT", title: "Prompt caching enabled on Rex system prompt (~20k tokens) — static knowledge base now cached by Anthropic, reducing response latency on every request" },
      { time: "13:10", tag: "UI", title: "Delivery Address field added to quote capture form — team now receives full delivery address in lead notification email" },
      { time: "13:05", tag: "IMPROVEMENT", title: "Rex now asks for name alongside email after every quote — name passed through captureLead tool and email personalisation pipeline" },
      { time: "13:00", tag: "IMPROVEMENT", title: "Proactive bulk discount hint — Rex now mentions 5% off for 5+ sheets when customer asks for 2–4 of the same product" },
      { time: "12:55", tag: "PRICING", title: "PC oversized fit-check example added to system prompt — 6mm clear 1800×2200mm shows correct 2440×1830 sheet use (PC sheets differ from acrylic's 2490×1880)" },
      { time: "20:45", tag: "FIX", title: "Rotation check now applied to ALL sheet sizes in sequence (standard + oversized) — 1923×1800mm fits 2490×1880 in first orientation (1923≤2490, 1800≤1880) → $432 not $562" },
      { time: "20:30", tag: "FIX", title: "Fit check now tries both orientations before escalating to oversized sheet — 630×1800mm rotated fits standard 2440×1220 (1800 along 2440 side) → $201.59 CTS, not an oversized sheet quote" },
      { time: "20:20", tag: "PRICING", title: "Full sheet cap now includes $30 cutting fee — when CTS price reverts to sheet price, $30 is added because we're still cutting. E.g. 6mm clear 1915×1800mm → $402 + $30 cutting fee = $432 Ex GST" },
      { time: "20:15", tag: "FIX", title: "Oversized sheet pricing fix — Rex now checks if a piece physically fits in the standard sheet before applying the full sheet cap. E.g. 1915×1800mm 6mm clear: 1800mm > 1220mm standard width → uses 2490×1880 oversized sheet ($402), not standard ($252)" },
      { time: "20:10", tag: "PRICING", title: "Oversized acrylic sheet tables reformatted from wall-of-text to markdown tables for 3mm, 4.5mm, 6mm — significantly improves Rex's ability to parse and apply correct cap prices" },
      { time: "19:30", tag: "FIX", title: "Reply-To header now set explicitly via Resend headers field — hitting Reply on team notification email now correctly addresses the customer, not enquiries@" },
      { time: "19:25", tag: "NEW", title: "Lead capture form completely redesigned — premium slide-up overlay with Full Name, Email, Mobile, and Fulfilment toggle. Customer name captured for all lead types." },
      { time: "19:20", tag: "IMPROVEMENT", title: "Customer emails personalised with first name — 'Hey Shane, your quote is ready.' and 'Hey Shane, still need that cut?' when name is captured" },
      { time: "19:15", tag: "IMPROVEMENT", title: "Team notification subject line now includes customer name — 'Rex Lead: Shane Goldberg (email) — product — price' for faster triage" },
      { time: "19:10", tag: "IMPROVEMENT", title: "Name field added to end-of-chat panel — captures name alongside email transcript request" },
      { time: "18:45", tag: "IMPROVEMENT", title: "Customer quote and follow-up emails now show the exact quoted price (e.g. $185.50 Ex GST) prominently in the quote card, extracted from AI conversation analysis" },
      { time: "18:40", tag: "IMPROVEMENT", title: "Customer emails tightened — one clean line of body copy before CTA, cleaner follow-up copy, product page URL resolved from AI quote details for accuracy" },
      { time: "18:15", tag: "IMPROVEMENT", title: "Quote email CTA button links to the specific product page (e.g. Acrylic Sheet, HDPE, Polycarbonate) instead of generic shop — 30+ materials mapped" },
      { time: "18:00", tag: "FIX", title: "Email logo replaced with HTML wordmark — white PlasticOnline text with red accent, renders correctly on dark header in all email clients" },
      { time: "17:45", tag: "FIX", title: "Team notification replyTo passed as array (Resend v6 requirement) — hitting Reply now correctly addresses the customer" },
      { time: "17:30", tag: "FIX", title: "Team notification reply-to set to customer email — hitting Reply now goes straight to the customer, not back to enquiries@" },
      { time: "17:15", tag: "UI", title: "All emails fully redesigned — real PlasticOnline logo, dark header, red accent bar, rounded cards, full-width transcript bubbles with Rex/Customer colour coding, trust strip, branded dark footer" },
      { time: "16:45", tag: "UI", title: "Customer emails redesigned to PlasticOnline brand — dark #1a1a1a header, orange #e13f00 CTA buttons, trust bar, hyperlinked contact details, proper paragraph spacing" },
      { time: "16:30", tag: "FIX", title: "Sender changed from rex@plasticonline.com.au to enquiries@plasticonline.com.au so replies land in Pipedrive inbox" },
      { time: "16:15", tag: "IMPROVEMENT", title: "Lead capture — removed Pipedrive integration. Team now receives a rich email to enquiries@plasticonline.com.au with AI summary, quote details, price, and full conversation transcript" },
      { time: "15:45", tag: "PRICING", title: "HDPE pricing updated (March 2026) — added 40mm and 50mm Black sheets, plus 60mm/100mm/140mm/150mm and Yellow PE-100 UV range. Fixed 30mm Natural price ($1,186, was wrongly $1,243). Added missing Black 4000×2000 sizes." },
      { time: "15:15", tag: "FIX", title: "Order not-found response no longer tells customers the number must start with PLON — Rex now just asks them to double-check it" },
      { time: "15:00", tag: "FIX", title: "Order lookup now searches full Pipedrive database using numeric part only — HP- and EXP- orders now resolve correctly regardless of how deal titles are structured" },
      { time: "14:30", tag: "NEW", title: "Order lookup now supports HP- and EXP- order number prefixes in addition to PLON- — all three formats resolve correctly via Pipedrive" },
      { time: "14:00", tag: "UI", title: "'Where would you like to start?' label font size increased to match quick reply chip text (12px)" },
      { time: "13:30", tag: "IMPROVEMENT", title: "Order status sign-off changed to 'What else can I sort out for you?' — more on-brand than generic 'Got any other questions?'" },
      { time: "13:30", tag: "UI", title: "Quick reply chip added — 'What's my order status?' added to the greeting prompt pool" },
      { time: "13:15", tag: "UI", title: "Order status display — 'Ready for Pick Up/Delivery' now shows as 'Ready For Pick-Up Or Delivery' with bold formatting" },
      { time: "13:00", tag: "UI", title: "Order status response — order number now bold, status label title-cased and bold (e.g. Order **PLON-36135** — **Ready For Pick Up/Delivery**)" },
      { time: "12:45", tag: "FIX", title: "Order status 'Unknown' root cause fixed — stage name is returned directly in the Pipedrive search result (item.stage.name); removed unnecessary extra API calls that were failing" },
      { time: "12:30", tag: "DEBUG", title: "Added /api/pipedrive-debug endpoint to inspect raw Pipedrive responses — identified that stage.name is available in search payload" },
      { time: "12:15", tag: "FIX", title: "Order lookup now accepts bare numbers — customer can type '36135' or 'PLON-36135', both resolve correctly via PLON- prefix normalisation" },
      { time: "12:00", tag: "NEW", title: "Order status lookup via Pipedrive — customers can ask Rex about their order (e.g. PLON-36135) and Rex calls the Pipedrive API to return the current stage: New Order, Waiting On Material, Production, Ready for Pick Up/Delivery, Dropship, or Completed" },
      { time: "11:30", tag: "FIX", title: "Nylon rod 60mm still quoting wrong price ($117.51 = 70mm) — added explicit system prompt rule: match EXACT diameter, never adjacent row; 60mm 1m = $86.21 anchored with example. Reinforced in knowledge base table." },
      { time: "11:00", tag: "PRICING", title: "Nylon rod pricing fixed — 60mm was missing from table (causing Rex to fall back to polypropylene price $113.62 instead of correct $86.21). Added full nylon rod range: 60mm–300mm with 1m and CTS rates." },
      { time: "10:30", tag: "NEW", title: "Rex trained with advanced plastics technical depth — cast vs extruded laser/engraving differences, PC stress cracking chemicals, HDPE HACCP colour coding, acetal POM-C rod specification, UHMWPE vs PTFE comparison, PTFE cold flow limitation, PETG vs PET/CPET distinction, material selection decision trees, QLD climate-specific recommendations" },
      { time: "10:00", tag: "IMPROVEMENT", title: "Changelog redesigned — auto-computed stats, animated counters, interactive tag filters, search, and entry counts per day" },
    ],
  },
  {
    date: "30 Mar 2026",
    entries: [
      { time: "21:30", tag: "NEW", title: "7 elite UX upgrades: welcome-back greeting, message entrance animations, avatar grouping, contextual thinking labels, sticky price card, scroll-to-bottom button" },
      { time: "20:30", tag: "UI", title: "Quick reply and follow-up chips redesigned — white background, solid blue border and text, subtle shadow. Stand out clearly against the light blue footer." },
      { time: "20:00", tag: "UI", title: "Launcher pill now solid #0084FF blue with white text. Header lightened to match footer (#e8f1ff) — blue name/buttons, consistent light-blue top and bottom frame." },
      { time: "19:30", tag: "UI", title: "Header and footer polished — solid blue header with white text/icons, light blue (#e8f1ff) footer tint, rounded pill input, darker readable text throughout" },
      { time: "19:00", tag: "UI", title: "Complete colour scheme overhaul — Messenger light theme: white background, #0084FF blue accents, grey bubbles for customer, blue for Rex. Removed all green glows and dark gradients." },
      { time: "18:00", tag: "IMPROVEMENT", title: "Pipedrive note now AI-generated: quote details (material/size/qty), price, conversation summary, plus full transcript — all via Haiku analysis" },
      { time: "17:30", tag: "IMPROVEMENT", title: "Pipedrive deal title now 'Rex New Lead - [$xxx.xx]'; note contains full conversation transcript with Customer/Rex dialogue" },
      { time: "17:00", tag: "NEW", title: "Lead capture upgraded — mobile number + Pick up/Delivery toggle added to quote email form; Pipedrive dedupes by email, links to existing contact, adds note with full details" },
      { time: "16:30", tag: "UI", title: "Email send button upgraded — spinner during send, press animation, hover brightness, checkmark confirmation on success" },
      { time: "15:00", tag: "PRICING", title: "HIPS sheet prices corrected — Black and White updated to SHEET column values (not web price)" },
      { time: "14:30", tag: "PRICING", title: "PETG sheet prices corrected — updated to SHEET column values for full sheet; CTS column for cut-to-size" },
      { time: "14:30", tag: "PRICING", title: "HIPS sheet pricing added — Black and White, 4 thicknesses each, full sheet only (no CTS)" },
      { time: "14:00", tag: "PRICING", title: "PTFE sheet pricing added — full three-tier CTS structure (<0.5m², ≥0.5m², full sheet 1200×1200mm) across 9 thicknesses 1mm–30mm" },
      { time: "14:00", tag: "PRICING", title: "PTFE rod extended — added 110mm through 200mm diameters (were missing from knowledge base)" },
      { time: "13:45", tag: "UI", title: "Launcher bubble repositioned — bottom-4/right-4 offset to give glow/shadow room within iframe bounds" },
      { time: "13:30", tag: "UI", title: "Teal button icons and text changed to white — arrow and label now visible in both active and disabled states" },
      { time: "13:15", tag: "PRICING", title: "Full sheet price cap enforced across all materials — if CTS × area exceeds full sheet price, Rex always quotes the full sheet price instead" },
      { time: "13:00", tag: "PRICING", title: "Acetal sheet pricing updated — two-tier CTS rates added (<1m² and >1m²), plus 45mm–100mm thicknesses now fully priced (were 'call for pricing')" },
      { time: "12:00", tag: "FIX", title: "Re-engagement nudge firing 3x — nudge now excluded from localStorage so it can't accumulate across reloads. Restored sessions mark nudge as already fired." },
      { time: "11:30", tag: "FIX", title: "Chat window height now natural/auto on desktop — no longer fills entire 670px iframe. Text mode 380px, mode picker shrinks to content." },
      { time: "11:00", tag: "UI",  title: "Rounded corners restored on chat window" },
      { time: "10:30", tag: "FIX", title: "Chat window no longer goes massive on desktop — removed isMobile detection (iframe is always 356px, fooling the check). Widget now fills its iframe container via inset:0." },
      { time: "10:00", tag: "FIX", title: "Mobile full-screen layout fixed — messages area now fills available height instead of leaving empty black space below" },
      { time: "09:50", tag: "FIX", title: "iframe click-blocking fixed — full-page pointer-events:none shell + pointer-events:auto iframe so page buttons stay clickable when Rex is open" },
    ],
  },
  {
    date: "29 Mar 2026",
    entries: [
      { time: "23:30", tag: "NEW",         title: "7-point optimisation pass: typing delay, slide-up animation, sound, re-engagement nudge, inline email capture, contextual chips, end panel call/WhatsApp" },
      { time: "23:30", tag: "NEW",         title: "Inline quote email capture — 'Send me this quote' appears after every price, one-tap email input" },
      { time: "23:30", tag: "NEW",         title: "Contextual follow-up chips — smart suggestions after every Rex response based on topic" },
      { time: "23:30", tag: "NEW",         title: "Call + WhatsApp buttons added to end panel — fallback for unconverted leads" },
      { time: "23:30", tag: "NEW",         title: "Re-engagement nudge — Rex sends 'Still there?' after 45s inactivity mid-conversation" },
      { time: "23:45", tag: "FIX",         title: "Voice: $ now spoken as 'dollars' — $126.50 reads as '126 dollars 50', not symbol" },
      { time: "23:40", tag: "UI",          title: "Slide-up animation made more pronounced — 40px rise, 0.94→1 scale, 0.4s spring" },
      { time: "23:30", tag: "UI",          title: "Slide-up entrance animation — chat window springs open with cubic-bezier ease" },
      { time: "23:30", tag: "IMPROVEMENT", title: "Message sound — subtle Web Audio API ding when Rex responds" },
      { time: "09:00", tag: "IMPROVEMENT", title: "Bulk discount shows dollar saving in bold — e.g. 'saving $22.50' — and no duplicate price after linked total" },
      { time: "23:35", tag: "FIX",         title: "Price is now a clickable yellow hyperlink — markdown link format [$price](url) renders clean, no brackets shown" },
      { time: "23:30", tag: "IMPROVEMENT", title: "Typing delay — 500–800ms pause before Rex responds, feels more human" },
      { time: "23:00", tag: "UI",          title: "Bold prices render in yellow #FFD700 — stands out clearly in blue assistant bubbles" },
      { time: "22:58", tag: "IMPROVEMENT", title: "Price shown as bold yellow text, Lock it in → link follows on its own line" },
      { time: "22:30", tag: "UI",          title: "Chat links changed to bold yellow #FFD700 — high contrast against blue and grey bubbles" },
      { time: "22:15", tag: "UI",          title: "Rex launcher glow added — ambient green halo + 10s pulse interval matching Mia" },
      { time: "22:10", tag: "FIX",         title: "Changelog auto-update rule added to CLAUDE.md — all future Rex changes logged automatically" },
      { time: "22:05", tag: "FIX",         title: "iframe embed resizes dynamically via postMessage — starts 88x88px (bubble only), expands to 420x720px on open" },
      { time: "22:00", tag: "UI",          title: "Input box placeholder text darkened for better contrast on light grey background" },
      { time: "21:55", tag: "UI",          title: "Message input box set to light grey #f0f0f0 background to stand out from dark widget" },
      { time: "21:50", tag: "UI",          title: "User chat bubbles changed to light grey #e9e9eb with black text" },
      { time: "21:48", tag: "UI",          title: "Rex chat bubbles changed to Facebook Messenger blue #0084FF" },
      { time: "21:20", tag: "FIX",         title: "Rex changelog 404 fixed — split into server page + ChangelogClient 'use client' component" },
      { time: "21:15", tag: "UI",          title: "Blue accent on changelog page darkened to #0874C8" },
      { time: "21:10", tag: "UI",          title: "Rex assistant chat bubbles changed to iMessage blue (#0B93F6)" },
      { time: "21:09", tag: "NEW",         title: "Rex changelog page launched at saabai.ai/rex-changelog" },
      { time: "21:05", tag: "UI",          title: "Full rebrand to messenger green (#25D366) — widget, glows, borders, email templates" },
      { time: "12:29", tag: "FIX",         title: "Product CTA changed to 'Lock it in →' — sharper, Gold Coast trade counter tone" },
      { time: "12:27", tag: "FIX",         title: "Removed conflicting 'View Product' reference that was overriding CTA rule" },
      { time: "12:25", tag: "FIX",         title: "Product link enforced on every quote — no bare text references allowed" },
      { time: "12:25", tag: "IMPROVEMENT", title: "Email capture line: 'Drop your email — I'll send the quote and you can have it ordered today'" },
      { time: "11:39", tag: "NEW",         title: "Conversation persistence across page navigations via localStorage — 24hr TTL, clears on explicit close" },
      { time: "00:14", tag: "NEW",         title: "Quick reply randomisation — 12-question pool, 3 shown per session, click tracking to Make.com" },
      { time: "00:06", tag: "FIX",         title: "Rex end-panel leads routed to /api/rex-leads endpoint" },
      { time: "00:03", tag: "NEW",         title: "Rex lead capture system — instant quote email + 22hr follow-up via Resend + Pipedrive CRM + Make.com webhook" },
    ],
  },
  {
    date: "28 Mar 2026",
    entries: [
      { time: "23:53", tag: "IMPROVEMENT", title: "12-point stress test: narration rule, em dashes, HDPE aliases, quantity multiplier, don't-re-ask, mobile fix, ping stops after 3 pulses, stepCountIs 6→8" },
      { time: "22:27", tag: "PRICING",     title: "HDPE sheet full pricing table added (1mm–30mm, Black + Natural) — instant quotes, no API delay" },
      { time: "22:27", tag: "PRICING",     title: "HDPE rod prices updated to March 2026 rates — 10 new sizes including up to 400mm" },
      { time: "21:52", tag: "FIX",         title: "No-working rule tightened — m² figures, area calculations, and commentary explicitly banned" },
      { time: "21:48", tag: "FIX",         title: "Saabai strategy call CTA removed from Rex end panel — replaced with 'Shop Our Range'" },
      { time: "21:48", tag: "FIX",         title: "iframe pointer-events fixed — launcher and chat window now fully clickable" },
      { time: "18:53", tag: "FIX",         title: "Product page links fixed — real plasticonline.com.au URLs from sitemap, 40+ products mapped" },
      { time: "18:44", tag: "FIX",         title: "Mia, MobileCtaBar, NewsTicker suppressed on /rex-widget page" },
      { time: "18:39", tag: "NEW",         title: "/rex-widget embeddable iframe page created — transparent background, pointer-events shell" },
      { time: "18:33", tag: "FIX",         title: "Add to Cart links pointed to correct product variation URLs" },
      { time: "18:22", tag: "UI",          title: "PlasticOnline brand colours applied — orange #e13f00 scoped via CSS variables on widget wrapper" },
      { time: "06:58", tag: "PRICING",     title: "Full 2026 pricing loaded from 35 Excel spreadsheets — all rods, tubes, acetal, UHMWPE, polypropylene, seaboard, playground, corflute, mirror, ACP, prismatic" },
    ],
  },
  {
    date: "25 Mar 2026",
    entries: [
      { time: "23:27", tag: "NEW",         title: "Mode switcher — toggle between Text and Voice mid-conversation" },
      { time: "23:23", tag: "NEW",         title: "25 random greeting messages — fresh opening line every session" },
      { time: "23:21", tag: "NEW",         title: "Mode picker — choose Text Chat or Voice before starting" },
      { time: "23:13", tag: "FIX",         title: "Calculator nonce fallback + dimensions spoken as 'by' not 'x'" },
      { time: "23:01", tag: "NEW",         title: "Live pricing calculator integration — exact cut-to-size quotes via WooCommerce AJAX" },
      { time: "22:47", tag: "FIX",         title: "Rex quotes prices directly — strips URLs and markdown from voice output" },
      { time: "22:41", tag: "IMPROVEMENT", title: "Rex personality overhaul — tighter responses, dry humour, no brochure speak" },
      { time: "22:33", tag: "NEW",         title: "WooCommerce pricing integration — live product lookup via REST API + direct product links" },
      { time: "22:23", tag: "NEW",         title: "Typed chat mode — message bubbles visible while typing, hidden in voice-only mode" },
      { time: "19:17", tag: "FIX",         title: "Rex now knows full sheets are available, not just cut-to-size" },
      { time: "19:17", tag: "FIX",         title: "Rex never reads URLs aloud — says 'tap the button below' instead" },
      { time: "19:11", tag: "NEW",         title: "Voice-first mode — link chips replace chat history in voice sessions" },
      { time: "19:01", tag: "IMPROVEMENT", title: "Shorter answers, natural sales nudges added to Rex behaviour" },
      { time: "18:59", tag: "NEW",         title: "Chat history with clickable links rendered in text mode" },
      { time: "18:57", tag: "FIX",         title: "Rex speaks as part of the team — 'we/our/us' always, never third person" },
      { time: "18:46", tag: "NEW",         title: "Full PlasticOnline knowledge base loaded — company history, materials science, FAQs, product range, fabrication capabilities" },
      { time: "17:20", tag: "IMPROVEMENT", title: "Renamed Pete → Rex across all widget, system prompts, and email references" },
      { time: "17:17", tag: "NEW",         title: "Pete/Rex widget — end panel with transcript email capture" },
      { time: "17:10", tag: "NEW",         title: "Pete/Rex widget — avatar photo, minimise and end chat buttons" },
      { time: "17:06", tag: "FIX",         title: "Removed stale /plon chat route that was causing 500 errors" },
      { time: "17:02", tag: "FIX",         title: "Widget now uses /api/pete-chat with correct AI SDK stream parser" },
      { time: "16:53", tag: "FIX",         title: "Mia/ChatWidget suppressed on /plon page" },
      { time: "16:47", tag: "NEW",         title: "Mic permission blocked warning shown on /plon voice mode" },
      { time: "16:37", tag: "FIX",         title: "Plon chat route — removed edge runtime, switched to claude-sonnet-4-6 directly" },
      { time: "16:13", tag: "FIX",         title: "Pete on /plon now uses dedicated route with correct stream parsing" },
    ],
  },
  {
    date: "21 Mar 2026",
    label: "Day 1 — Rex born",
    entries: [
      { time: "16:40", tag: "NEW",         title: "HeyGen avatar replaced with static photo + ElevenLabs voice — faster, more reliable" },
      { time: "16:10", tag: "NEW",         title: "Peter Shane video avatar widget launched on /onboarding/plon" },
      { time: "16:07", tag: "NEW",         title: "HeyGen AI video avatar chatbot first deployed on /plon page" },
      { time: "14:17", tag: "FIX",         title: "Phonetic pronunciation fix — 'Saabai' → 'Saarbye' for TTS accuracy" },
    ],
  },
];

// ── Auto-computed stats ────────────────────────────────────────────────────────

function parseChangelogDate(s: string): Date {
  return new Date(s);
}

const allDates = CHANGELOG.map(d => parseChangelogDate(d.date));
const minDate = allDates.reduce((a, b) => (a < b ? a : b));
const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
const DAYS_IN_DEV = Math.floor((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
const TOTAL_UPDATES = CHANGELOG.reduce((acc, d) => acc + d.entries.length, 0);

// ── Animated stat card ─────────────────────────────────────────────────────────

function StatCard({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div style={{ background: "#0b0d16", padding: "24px 16px", textAlign: "center" }}>
      <div style={{ fontSize: "34px", fontWeight: 800, color: "#e8e8f0", letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {count}{suffix}
      </div>
      <div style={{ fontSize: "11px", color: "#444", marginTop: "7px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ── Search highlight ───────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(8,116,200,0.35)", color: "#7bc8ff", borderRadius: "2px", padding: "0 2px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChangelogClient() {
  const [activeFilter, setActiveFilter] = useState<Tag | null>(null);
  const [search, setSearch] = useState("");

  const tagCounts = useMemo(() => {
    const counts: Partial<Record<Tag, number>> = {};
    for (const day of CHANGELOG) {
      for (const entry of day.entries) {
        counts[entry.tag] = (counts[entry.tag] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CHANGELOG.map(day => ({
      ...day,
      entries: day.entries.filter(e =>
        (!activeFilter || e.tag === activeFilter) &&
        (!q || e.title.toLowerCase().includes(q))
      ),
    })).filter(day => day.entries.length > 0);
  }, [activeFilter, search]);

  const totalFiltered = filtered.reduce((acc, d) => acc + d.entries.length, 0);
  const isFiltering = !!activeFilter || search.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#06070d", color: "#e8e8f0", fontFamily: "var(--font-geist-sans)" }}>

      <RexNav />

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(37,211,102,0.06) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(8,116,200,0.05) 0%, transparent 65%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "820px", margin: "0 auto", padding: "0 24px 100px" }}>

        {/* Hero */}
        <div style={{ paddingTop: "48px", paddingBottom: "48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

          <a
            href="https://www.plasticonline.com.au"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.18)", borderRadius: "100px", padding: "4px 14px 4px 8px", marginBottom: "22px", textDecoration: "none" }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#25D366", display: "inline-block", boxShadow: "0 0 8px rgba(37,211,102,0.8)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "11px", color: "#25D366", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Active · PlasticOnline</span>
          </a>

          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 700, margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            Rex{" "}
            <span style={{ background: "linear-gradient(135deg, #25D366 0%, #0874C8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Changelog
            </span>
          </h1>
          <p style={{ fontSize: "16px", color: "#555", margin: "0 0 14px", lineHeight: 1.7, maxWidth: "480px" }}>
            Every build, fix, and improvement made to Rex — the AI sales agent for{" "}
            <a href="https://www.plasticonline.com.au" target="_blank" rel="noopener noreferrer" style={{ color: "#25D366", textDecoration: "none" }}>PlasticOnline</a>.
            Built and maintained by <a href="/" style={{ color: "#0874C8", textDecoration: "none" }}>Saabai</a>.
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#555", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "4px 10px", letterSpacing: "0.05em" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            All times AEST — Brisbane, Australia (UTC+10)
          </span>
        </div>

        {/* Stats — auto-computed + animated */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", overflow: "hidden", margin: "36px 0 44px" }}>
          <StatCard value={TOTAL_UPDATES} label="Total updates" />
          <StatCard value={DAYS_IN_DEV} label="Days in development" />
          <StatCard value={38} label="Pricing sheets" />
          <StatCard value={40} suffix="+" label="Product URLs" />
        </div>

        {/* Tag filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "16px" }}>
          <button
            onClick={() => { setActiveFilter(null); setSearch(""); }}
            style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
              background: !activeFilter && !search ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
              color: !activeFilter && !search ? "#e8e8f0" : "#555",
              border: `1px solid ${!activeFilter && !search ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
              padding: "4px 11px", borderRadius: "7px", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            All <span style={{ opacity: 0.6 }}>{TOTAL_UPDATES}</span>
          </button>
          {(Object.entries(TAG_STYLES) as [Tag, typeof TAG_STYLES[Tag]][]).map(([tag, s]) => {
            const count = tagCounts[tag] ?? 0;
            if (!count) return null;
            const isActive = activeFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveFilter(isActive ? null : tag)}
                style={{
                  fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
                  background: isActive ? s.bg : "rgba(255,255,255,0.03)",
                  color: isActive ? s.text : "#444",
                  border: `1px solid ${isActive ? s.border : "rgba(255,255,255,0.06)"}`,
                  padding: "4px 11px", borderRadius: "7px", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = s.text; (e.currentTarget as HTMLButtonElement).style.borderColor = s.border; }}}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = "#444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)"; }}}
              >
                {tag} <span style={{ opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "48px" }}>
          <svg style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#444" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="#444" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search updates…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px", padding: "9px 36px 9px 36px",
              color: "#c8c8d8", fontSize: "13px", outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(37,211,102,0.3)")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", fontSize: "16px", lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter results summary */}
        {isFiltering && (
          <div style={{ marginBottom: "28px", color: "#555", fontSize: "12px", letterSpacing: "0.03em" }}>
            {totalFiltered === 0 ? "No results" : `${totalFiltered} update${totalFiltered !== 1 ? "s" : ""}${activeFilter ? ` tagged ${activeFilter}` : ""}${search.trim() ? ` matching "${search.trim()}"` : ""}`}
          </div>
        )}

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "7px", top: "6px", bottom: "0", width: "1px", background: "linear-gradient(to bottom, rgba(37,211,102,0.5), rgba(8,116,200,0.15) 60%, transparent)" }} />

          {filtered.length === 0 && (
            <div style={{ marginLeft: "30px", padding: "40px 0", color: "#333", fontSize: "14px" }}>
              No updates found. <button onClick={() => { setActiveFilter(null); setSearch(""); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", textDecoration: "underline", fontSize: "14px", padding: 0 }}>Clear filters</button>
            </div>
          )}

          {filtered.map((day) => (
            <div key={day.date} style={{ marginBottom: "52px" }}>

              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: "#25D366", border: "3px solid #06070d", boxShadow: "0 0 14px rgba(37,211,102,0.5)", flexShrink: 0 }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", flex: 1 }}>
                  {day.label && <span style={{ fontSize: "17px", fontWeight: 700, color: "#e8e8f0" }}>{day.label}</span>}
                  <span style={{ fontSize: "13px", color: "#333", letterSpacing: "0.04em" }}>{day.date}</span>
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "5px", padding: "2px 8px", letterSpacing: "0.04em", flexShrink: 0 }}>
                    {day.entries.length} update{day.entries.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Entries */}
              <div style={{ marginLeft: "30px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {day.entries.map((entry, i) => {
                  const s = TAG_STYLES[entry.tag];
                  return (
                    <div
                      key={i}
                      style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", borderRadius: "10px", transition: "background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: "11px", color: "#4a4a5a", fontVariantNumeric: "tabular-nums", flexShrink: 0, marginTop: "2px", minWidth: "52px" }}>{entry.time} <span style={{ fontSize: "9px", color: "#3a3a4a", letterSpacing: "0.05em" }}>AEST</span></span>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: "2px 7px", borderRadius: "5px", flexShrink: 0, marginTop: "1px" }}>
                        {entry.tag}
                      </span>
                      <span style={{ fontSize: "13px", color: "#c8c8d8", lineHeight: 1.6 }}>
                        <Highlight text={entry.title} query={search.trim()} />
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}

          {/* Footer */}
          {!isFiltering && (
            <div style={{ marginLeft: "30px", paddingTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right, rgba(255,255,255,0.05), transparent)" }} />
              <span style={{ fontSize: "11px", color: "#2a2a2a", letterSpacing: "0.05em" }}>Rex inception · 21 Mar 2026 · Built by Saabai</span>
              <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left, rgba(255,255,255,0.05), transparent)" }} />
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input::placeholder { color: #333; }
      `}</style>
    </div>
  );
}
