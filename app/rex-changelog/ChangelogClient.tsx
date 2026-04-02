"use client";

import { useState, useEffect, useMemo } from "react";

type Tag = "NEW" | "FIX" | "IMPROVEMENT" | "PRICING" | "UI" | "DEPLOYMENT" | "DEBUG";

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
  NEW:         { bg: "rgba(37,211,102,0.10)",  text: "#25D366", border: "rgba(37,211,102,0.25)" },
  FIX:         { bg: "rgba(96,165,250,0.10)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  IMPROVEMENT: { bg: "rgba(251,191,36,0.10)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  PRICING:     { bg: "rgba(167,139,250,0.10)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  UI:          { bg: "rgba(244,114,182,0.10)", text: "#f472b6", border: "rgba(244,114,182,0.25)" },
  DEPLOYMENT:  { bg: "rgba(251,146,60,0.10)",  text: "#fb923c", border: "rgba(251,146,60,0.25)" },
  DEBUG:       { bg: "rgba(156,163,175,0.08)", text: "#9ca3af", border: "rgba(156,163,175,0.20)" },
};

const CHANGELOG: Day[] = [
  {
    date: "2 Apr 2026",
    label: "Today",
    entries: [
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

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(37,211,102,0.06) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(8,116,200,0.05) 0%, transparent 65%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "820px", margin: "0 auto", padding: "0 24px 100px" }}>

        {/* Hero */}
        <div style={{ paddingTop: "64px", paddingBottom: "48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#444", fontSize: "13px", textDecoration: "none", marginBottom: "36px" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            saabai.ai
          </a>

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
          <p style={{ fontSize: "16px", color: "#555", margin: 0, lineHeight: 1.7, maxWidth: "480px" }}>
            Every build, fix, and improvement made to Rex — the AI sales agent for{" "}
            <a href="https://www.plasticonline.com.au" target="_blank" rel="noopener noreferrer" style={{ color: "#25D366", textDecoration: "none" }}>PlasticOnline</a>.
            Built and maintained by <a href="/" style={{ color: "#0874C8", textDecoration: "none" }}>Saabai</a>.
          </p>
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
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "#2a2a2a", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "5px", padding: "2px 8px", letterSpacing: "0.04em", flexShrink: 0 }}>
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
                      <span style={{ fontSize: "11px", color: "#2e2e2e", fontVariantNumeric: "tabular-nums", flexShrink: 0, marginTop: "2px", minWidth: "38px" }}>{entry.time}</span>
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
