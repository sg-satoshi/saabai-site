"use client";

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

const TAG_STYLES: Record<Tag, { bg: string; text: string }> = {
  NEW:         { bg: "rgba(37,211,102,0.12)",  text: "#25D366" },
  FIX:         { bg: "rgba(96,165,250,0.12)",  text: "#60a5fa" },
  IMPROVEMENT: { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
  PRICING:     { bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
  UI:          { bg: "rgba(244,114,182,0.12)", text: "#f472b6" },
  DEPLOYMENT:  { bg: "rgba(251,146,60,0.12)",  text: "#fb923c" },
  DEBUG:       { bg: "rgba(156,163,175,0.10)", text: "#9ca3af" },
};

const CHANGELOG: Day[] = [
  {
    date: "30 Mar 2026",
    label: "Today",
    entries: [
      { time: "10:45", tag: "FIX", title: "Empty black space below mode picker / end panel on all screen sizes — content sections now flex-1 and vertically centred to fill iframe height" },
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

const STATS = [
  { value: "80",  label: "Total updates" },
  { value: "9",   label: "Days in development" },
  { value: "35",  label: "Pricing sheets loaded" },
  { value: "40+", label: "Product URLs mapped" },
];

export default function ChangelogClient() {
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

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.18)", borderRadius: "100px", padding: "4px 14px 4px 8px", marginBottom: "22px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#25D366", display: "inline-block", boxShadow: "0 0 8px rgba(37,211,102,0.8)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "11px", color: "#25D366", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Active · PlasticOnline</span>
          </div>

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

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", overflow: "hidden", margin: "36px 0 60px" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: "#0b0d16", padding: "22px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#e8e8f0", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "#444", marginTop: "5px", letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "48px" }}>
          {(Object.entries(TAG_STYLES) as [Tag, typeof TAG_STYLES[Tag]][]).filter(([t]) => t !== "DEBUG").map(([tag, s]) => (
            <span key={tag} style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", background: s.bg, color: s.text, padding: "3px 10px", borderRadius: "6px" }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "7px", top: "6px", bottom: "0", width: "1px", background: "linear-gradient(to bottom, rgba(37,211,102,0.5), rgba(8,116,200,0.15) 60%, transparent)" }} />

          {CHANGELOG.map((day) => (
            <div key={day.date} style={{ marginBottom: "52px" }}>

              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: "#25D366", border: "3px solid #06070d", boxShadow: "0 0 14px rgba(37,211,102,0.5)", flexShrink: 0 }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  {day.label && <span style={{ fontSize: "17px", fontWeight: 700, color: "#e8e8f0" }}>{day.label}</span>}
                  <span style={{ fontSize: "13px", color: "#333", letterSpacing: "0.04em" }}>{day.date}</span>
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
                      <span style={{ fontSize: "11px", color: "#333", fontVariantNumeric: "tabular-nums", flexShrink: 0, marginTop: "2px", minWidth: "38px" }}>{entry.time}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", background: s.bg, color: s.text, padding: "2px 7px", borderRadius: "5px", flexShrink: 0, marginTop: "1px" }}>
                        {entry.tag}
                      </span>
                      <span style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.55 }}>{entry.title}</span>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}

          {/* Footer */}
          <div style={{ marginLeft: "30px", paddingTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right, rgba(255,255,255,0.05), transparent)" }} />
            <span style={{ fontSize: "11px", color: "#2a2a2a", letterSpacing: "0.05em" }}>Rex inception · 21 Mar 2026 · Built by Saabai</span>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left, rgba(255,255,255,0.05), transparent)" }} />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
