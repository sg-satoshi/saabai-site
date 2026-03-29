import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rex Changelog — PlasticOnline AI Updates",
  description: "Live development log for Rex, the AI agent built for PlasticOnline by Saabai.",
};

type Tag = "NEW" | "FIX" | "IMPROVEMENT" | "PRICING" | "UI" | "DEPLOYMENT";

interface Entry {
  tag: Tag;
  title: string;
  detail: string;
}

interface Day {
  date: string;
  label: string;
  entries: Entry[];
}

const TAG_STYLES: Record<Tag, { bg: string; text: string; dot: string }> = {
  NEW:         { bg: "rgba(37,211,102,0.12)",  text: "#25D366", dot: "#25D366" },
  FIX:         { bg: "rgba(96,165,250,0.12)",  text: "#60a5fa", dot: "#60a5fa" },
  IMPROVEMENT: { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", dot: "#fbbf24" },
  PRICING:     { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", dot: "#a78bfa" },
  UI:          { bg: "rgba(244,114,182,0.12)", text: "#f472b6", dot: "#f472b6" },
  DEPLOYMENT:  { bg: "rgba(251,146,60,0.12)",  text: "#fb923c", dot: "#fb923c" },
};

const CHANGELOG: Day[] = [
  {
    date: "2026-03-29",
    label: "Today",
    entries: [
      {
        tag: "UI",
        title: "Messenger green rebrand",
        detail: "Rex widget colour changed from PlasticOnline orange to #25D366 — the macOS Messages green. Applied across widget, glows, borders, buttons, and email templates.",
      },
      {
        tag: "FIX",
        title: "\"Lock it in →\" order CTA",
        detail: "Replaced generic 'View Product' and 'Click here to Order Now' with 'Lock it in →' — sharper, more conversational, Gold Coast trade counter energy.",
      },
      {
        tag: "NEW",
        title: "Conversation persistence across page navigations",
        detail: "Rex now saves the full conversation to localStorage. Users can browse the site, come back, and the chat is exactly where they left it. 24hr TTL. Clears on explicit close.",
      },
      {
        tag: "NEW",
        title: "Quick reply randomisation + click tracking",
        detail: "12-question pool covering price intent, material comparison, use-cases, and logistics. 3 shown randomly each session. Every click tracked to Make.com for conversion analysis.",
      },
      {
        tag: "NEW",
        title: "Lead capture — instant quote email + 22hr follow-up",
        detail: "When a customer shares their email, Rex fires an immediate branded quote email and schedules a follow-up 22 hours later via Resend. Team notification also sent.",
      },
      {
        tag: "NEW",
        title: "Pipedrive CRM integration",
        detail: "Every captured email automatically creates a person + deal in Pipedrive. Activates once PIPEDRIVE_API_TOKEN is set in Vercel env vars.",
      },
      {
        tag: "IMPROVEMENT",
        title: "12-point stress test applied",
        detail: "Narration rule extended to internal calcs. Em dash contradiction fixed in system prompt. HDPE colour aliases added. Quantity multiplier rule. Don't-re-ask rule. Quick replies updated. Mobile iframe fix. Ping stops after 3 pulses. End CTA improved. stepCountIs bumped 6→8. Greeting fix.",
      },
      {
        tag: "PRICING",
        title: "HDPE sheet full pricing table loaded",
        detail: "Standard HDPE (Black PE-100 + Natural PE-HWST) pricing added across all thicknesses from 1mm–30mm. Rex now quotes HDPE instantly from the knowledge base — no WooCommerce API call needed.",
      },
      {
        tag: "PRICING",
        title: "HDPE rod prices updated to March 2026",
        detail: "All rod prices refreshed from the March 2026 supplier spreadsheet. 10 new sizes added including 75mm, 115mm, 125mm, 230mm, 280mm, 300mm, 320mm, 350mm, 400mm.",
      },
      {
        tag: "DEPLOYMENT",
        title: "Rex live on plasticonline.com.au",
        detail: "Widget deployed via iframe embed using functions.php in the child theme. WP Rocket exclusion rule added to prevent lazy-load interference. Cloudflare cache purged.",
      },
    ],
  },
  {
    date: "2026-03-28",
    label: "Yesterday",
    entries: [
      {
        tag: "PRICING",
        title: "All 35 pricing spreadsheets loaded into knowledge base",
        detail: "Full 2026 pricing extracted from Excel files via Python/openpyxl: acetal, UHMWPE, polypropylene, seaboard HDPE, playground HDPE, corflute, mirror acrylic, ACP, prismatic, all rods and tubes. Rex quotes every material instantly.",
      },
      {
        tag: "UI",
        title: "PlasticOnline brand colours applied",
        detail: "All Saabai teal replaced with PlasticOnline orange (#e13f00) scoped via CSS variables on the widget wrapper. Saabai site colours unaffected.",
      },
      {
        tag: "NEW",
        title: "/rex-widget embeddable page created",
        detail: "Transparent iframe page at saabai.ai/rex-widget. Body background transparent, overflow hidden. Designed to be dropped into any website via a single script tag.",
      },
      {
        tag: "FIX",
        title: "Mia and Saabai widgets suppressed on /rex-widget",
        detail: "Added /rex-widget to ConditionalWidgets suppress list. Mia, MobileCtaBar, and NewsTicker no longer load on the embed page.",
      },
      {
        tag: "FIX",
        title: "Product page links fixed",
        detail: "Replaced broken ?add-to-cart={variationId} WooCommerce URLs with real product page URLs sourced from the plasticonline.com.au sitemap. 40+ product URLs added to knowledge base.",
      },
      {
        tag: "FIX",
        title: "Saabai strategy call CTA removed from Rex end panel",
        detail: "Shane's Calendly link was appearing after Rex conversations. Replaced with 'Shop Our Range →' linking to plasticonline.com.au/shop/.",
      },
      {
        tag: "NEW",
        title: "Mode picker — Text Chat or Voice",
        detail: "Rex opens with a choice screen. Text mode: live streaming bubbles. Voice mode: ElevenLabs TTS with speech recognition. Users can switch modes mid-conversation.",
      },
      {
        tag: "NEW",
        title: "25 random greeting messages",
        detail: "Rex picks a different opening line every session — from 'G\'day! Rex here' to 'I\'m basically a plastics encyclopaedia with a better personality'. Keeps it fresh.",
      },
      {
        tag: "FIX",
        title: "Quote working removed from responses",
        detail: "Rex no longer shows per-m² rates, area calculations, or 'Price = X × Y' steps. Final price in bold only. m² commentary explicitly blocked.",
      },
    ],
  },
  {
    date: "2026-03-25",
    label: "Earlier this week",
    entries: [
      {
        tag: "NEW",
        title: "WooCommerce live pricing integration",
        detail: "Rex connects to plasticonline.com.au WooCommerce REST API. searchProducts finds product and variation IDs. calculateCutToSizePrice returns exact cut-to-size price from the live calculator.",
      },
      {
        tag: "NEW",
        title: "Voice mode with ElevenLabs TTS",
        detail: "Rex speaks responses aloud using ElevenLabs voice synthesis. Speech recognition via Web Speech API (Chrome/Android). Dimensions spoken as '600 by 1200 millimetres' not '600x1200'.",
      },
      {
        tag: "NEW",
        title: "Full PlasticOnline knowledge base",
        detail: "Comprehensive training data loaded: company history, locations, fabrication capabilities, material science for 15+ plastics, comparison tables, FAQs, product range, accessories.",
      },
      {
        tag: "IMPROVEMENT",
        title: "Rex speaks as part of the team",
        detail: "Rewritten to use 'we/our/us' always. Never refers to PlasticOnline in third person. Tone: knowledgeable trade counter mate, not a brochure. Em dashes banned.",
      },
      {
        tag: "NEW",
        title: "Lead capture endpoint",
        detail: "captureLead tool silently fires when a customer shares their email. Sends to Make.com webhook for CRM and follow-up automation.",
      },
    ],
  },
];

const STATS = [
  { value: "29", label: "Updates shipped" },
  { value: "7",  label: "Days in dev" },
  { value: "35", label: "Pricing sheets loaded" },
  { value: "40+", label: "Product URLs mapped" },
];

export default function RexChangelog() {
  return (
    <div style={{ minHeight: "100vh", background: "#06070d", color: "#e8e8f0", fontFamily: "var(--font-geist-sans)" }}>

      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "800px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(37,211,102,0.07) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "-10%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(96,165,250,0.05) 0%, transparent 70%)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div style={{ paddingTop: "72px", paddingBottom: "56px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Back link */}
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "13px", textDecoration: "none", marginBottom: "40px" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            saabai.ai
          </a>

          {/* Client badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: "100px", padding: "5px 14px 5px 8px", marginBottom: "24px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#25D366", display: "inline-block", boxShadow: "0 0 8px #25D366" }} />
            <span style={{ fontSize: "12px", color: "#25D366", fontWeight: 600, letterSpacing: "0.05em" }}>LIVE · PlasticOnline</span>
          </div>

          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Rex{" "}
            <span style={{ background: "linear-gradient(135deg, #25D366 0%, #60a5fa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Changelog
            </span>
          </h1>
          <p style={{ fontSize: "17px", color: "#7a7a9a", margin: 0, lineHeight: 1.6, maxWidth: "520px" }}>
            Development log for Rex — the AI sales agent built for PlasticOnline by{" "}
            <a href="/" style={{ color: "#25D366", textDecoration: "none" }}>Saabai</a>.
            Every update, fix, and improvement tracked in real time.
          </p>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden", margin: "40px 0 64px" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: "#0d0f1a", padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#25D366", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "12px", color: "#555", marginTop: "6px", letterSpacing: "0.03em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Timeline ───────────────────────────────────────────────────────── */}
        <div style={{ position: "relative" }}>

          {/* Vertical line */}
          <div style={{ position: "absolute", left: "7px", top: "8px", bottom: 0, width: "1px", background: "linear-gradient(to bottom, rgba(37,211,102,0.4), rgba(37,211,102,0.05) 80%, transparent)" }} />

          {CHANGELOG.map((day) => (
            <div key={day.date} style={{ marginBottom: "56px" }}>

              {/* Date header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: "#25D366", border: "3px solid #06070d", boxShadow: "0 0 12px rgba(37,211,102,0.6)", flexShrink: 0 }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#e8e8f0" }}>{day.label}</span>
                  <span style={{ fontSize: "13px", color: "#444", letterSpacing: "0.04em" }}>{day.date}</span>
                </div>
              </div>

              {/* Entries */}
              <div style={{ marginLeft: "31px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {day.entries.map((entry, i) => {
                  const style = TAG_STYLES[entry.tag];
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#0d0f1a",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "14px",
                        padding: "18px 22px",
                        transition: "border-color 0.2s, transform 0.2s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                          background: style.bg, color: style.text,
                          padding: "3px 8px", borderRadius: "6px",
                        }}>
                          {entry.tag}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0" }}>{entry.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#666", lineHeight: 1.65 }}>{entry.detail}</p>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}

          {/* End of timeline */}
          <div style={{ marginLeft: "31px", display: "flex", alignItems: "center", gap: "12px", paddingTop: "8px" }}>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right, rgba(255,255,255,0.06), transparent)" }} />
            <span style={{ fontSize: "12px", color: "#333", letterSpacing: "0.05em" }}>Rex v1 · Built by Saabai</span>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left, rgba(255,255,255,0.06), transparent)" }} />
          </div>

        </div>
      </div>
    </div>
  );
}
