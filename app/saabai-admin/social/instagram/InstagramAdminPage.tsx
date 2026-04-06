"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  caption: string;
  imageUrl: string;
  imageType?: string;
  scheduledFor: string;
  scheduledTime?: string;
  sentAt?: string;
  postId?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://www.saabai.ai";

const FORMATS = [
  { value: "Insight",      label: "Insight",       hint: "Sharp observation" },
  { value: "Result",       label: "Result",        hint: "Client outcome" },
  { value: "Myth-Bust",    label: "Myth-Bust",     hint: "Common misconception" },
  { value: "Behind Scenes",label: "Behind Scenes", hint: "How we work" },
  { value: "Advisory",     label: "Advisory",      hint: "Strategic take" },
  { value: "News-Reactive",label: "News-Reactive", hint: "Trend reaction" },
];

const ALL_TOPICS: Record<string, string[]> = {
  "Insight": [
    "30–45% of enquiries arrive after hours — most firms have no idea",
    "The hidden cost of copy-pasting between systems every day",
    "What 10 recovered hours per week actually means for revenue",
    "Why boring automations always beat glamorous ones",
    "The one thing that separates firms that scale from those that stay stuck",
    "Fee earners doing admin is the most expensive problem in professional services",
    "Why the first AI project should solve pain, not impress a board",
    "What AI agents do that software never could",
  ],
  "Result": [
    "Law firm intake: 9% → 28% conversion after AI agent",
    "Quote time: 22 minutes → 90 seconds",
    "Document chasing: 12 hrs/month → fully automated",
    "After-hours response: next morning → 90 seconds",
    "Referral follow-up: fully automated pipeline built in 3 weeks",
    "Client onboarding: manual → zero-touch for accounting firm",
  ],
  "Myth-Bust": [
    "\"We're not ready for AI yet\"",
    "\"AI will replace our staff\"",
    "\"We tried AI and it didn't work\"",
    "\"We need to hire an AI person first\"",
    "\"It's too expensive for a firm our size\"",
    "\"Our clients won't want to talk to a bot\"",
  ],
  "Behind Scenes": [
    "What week one of a Saabai engagement actually looks like",
    "How we map a firm's biggest bottleneck in a 90-minute session",
    "What an intake audit reveals that surprises every firm",
    "The 3-week timeline from discovery to live system",
    "What happens when a client sees their AI agent for the first time",
    "How we test an AI system before going live with real clients",
  ],
  "Advisory": [
    "What boards are getting wrong about AI investment in 2026",
    "The difference between an AI strategy and an experiment budget",
    "How to measure ROI on automation before you buy",
    "Why the AI capability gap between large and small firms is closing fast",
    "The question every managing partner should be asking right now",
  ],
  "News-Reactive": [
    "AI agents are now mainstream — here's what that means for your firm",
    "Why 2026 is the year professional services can't afford to wait",
    "The Australian productivity gap and how AI closes it",
    "What the latest model releases actually mean for SMEs",
    "Why big tech AI tools won't solve your specific firm problem",
  ],
};

const IMAGE_TYPES = [
  { value: "insight",     label: "Insight Card",   hint: "headline + subtext" },
  { value: "stat",        label: "Stat Card",      hint: "big number" },
  { value: "beforeafter", label: "Before / After", hint: "comparison" },
  { value: "quote",       label: "Quote Card",     hint: "pull quote" },
  { value: "custom",      label: "Custom URL",     hint: "paste any image URL" },
];

const HASHTAG_SETS: Record<string, string[]> = {
  "Insight":       ["#AIautomation", "#ProfessionalServices", "#LawFirm", "#AccountingFirm", "#Productivity", "#BusinessGrowth", "#AI"],
  "Result":        ["#CaseStudy", "#AIautomation", "#LawFirmGrowth", "#ClientResults", "#Automation", "#BusinessTransformation"],
  "Myth-Bust":     ["#AIMyths", "#AIautomation", "#BusinessStrategy", "#ProfessionalServices", "#DebunkingMyths", "#SmallBusiness"],
  "Behind Scenes": ["#BehindTheScenes", "#AIautomation", "#HowWeWork", "#Saabai", "#AIagent", "#BusinessSystems"],
  "Advisory":      ["#AIstrategy", "#BusinessLeadership", "#ManagingPartner", "#AIinBusiness", "#ProfessionalServices", "#FutureOfWork"],
  "News-Reactive": ["#AINews", "#AIautomation", "#FutureOfWork", "#Australia", "#ProfessionalServices", "#TechTrends"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayAEST() {
  return new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00+10:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtScheduleLabel(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time}:00+10:00`);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
      + " at " + d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  } catch { return date; }
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title, sub, count, collapsed, onToggle, onRefresh,
}: {
  title: string; sub: string; count?: number;
  collapsed: boolean; onToggle: () => void; onRefresh?: () => void;
}) {
  const igGradient = "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: igGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff" }}>Ig</div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>
            {title}{count !== undefined && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>({count})</span>}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onRefresh && (
          <button onClick={onRefresh} style={{ fontSize: 13, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>↻</button>
        )}
        <button onClick={onToggle} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>
    </div>
  );
}

// ── Caption Generator ─────────────────────────────────────────────────────────

function CaptionGenerator({ onQueued }: { onQueued: () => void }) {
  const [format, setFormat]         = useState("Insight");
  const [topic, setTopic]           = useState("");
  const [notes, setNotes]           = useState("");
  const [caption, setCaption]       = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState("");
  const [topicPage, setTopicPage]   = useState(0);

  // Image state
  const [imageType, setImageType]   = useState("insight");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [imgHeadline, setImgHeadline] = useState("");
  const [imgSub, setImgSub]         = useState("");
  const [imgStat, setImgStat]       = useState("");
  const [imgBefore, setImgBefore]   = useState("");
  const [imgAfter, setImgAfter]     = useState("");
  const [imgLabel, setImgLabel]     = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Publish state
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("schedule");
  const [scheduleDate, setScheduleDate] = useState(todayAEST());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [publishing, setPublishing] = useState(false);
  const [pubStatus, setPubStatus]   = useState<"idle" | "done" | "error">("idle");
  const [pubMsg, setPubMsg]         = useState("");

  const charCount = caption.length;
  const over = charCount > 2200;
  const allTopics = ALL_TOPICS[format] ?? [];
  const pageSize = 5;
  const totalPages = Math.ceil(allTopics.length / pageSize);
  const visibleTopics = allTopics.slice(topicPage * pageSize, topicPage * pageSize + pageSize);
  const suggestedHashtags = HASHTAG_SETS[format] ?? [];

  function buildImageUrl(): string | null {
    if (imageType === "custom") return customImageUrl.trim() || null;
    const params = new URLSearchParams({ type: imageType });
    if (imgHeadline) params.set("headline", imgHeadline);
    if (imgSub)      params.set("sub", imgSub);
    if (imgStat)     params.set("stat", imgStat);
    if (imgBefore)   params.set("before", imgBefore);
    if (imgAfter)    params.set("after", imgAfter);
    if (imgLabel)    params.set("label", imgLabel);
    return `${BASE_URL}/api/og/linkedin-card?${params.toString()}`;
  }

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setGenError("");
    setCaption("");
    try {
      const res = await fetch("/api/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, topic, notes }),
      });
      const data = await res.json();
      if (data.content) setCaption(data.content);
      else setGenError("Generation failed — try again.");
    } catch {
      setGenError("Network error — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    const imageUrl = buildImageUrl();
    if (!caption.trim() || !imageUrl || over) return;
    setPublishing(true);
    setPubMsg("");
    try {
      if (scheduleMode === "now") {
        const res = await fetch("/api/instagram/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption, imageUrl }),
        });
        const data = await res.json();
        if (res.ok) {
          setPubStatus("done");
          setPubMsg(`Posted to Instagram (ID: ${data.postId})`);
          setCaption(""); setTopic(""); setNotes("");
          onQueued();
        } else {
          setPubStatus("error");
          setPubMsg(data.error ?? "Post failed");
        }
      } else {
        const res = await fetch("/api/instagram/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption, imageUrl, imageType, scheduledFor: scheduleDate, scheduledTime: scheduleTime }),
        });
        if (res.ok) {
          setPubStatus("done");
          setPubMsg("Scheduled successfully");
          setCaption(""); setTopic(""); setNotes("");
          onQueued();
        } else {
          const d = await res.json();
          setPubStatus("error");
          setPubMsg(d.error ?? "Schedule failed");
        }
      }
    } finally {
      setPublishing(false);
      setTimeout(() => { setPubStatus("idle"); setPubMsg(""); }, 5000);
    }
  }

  const igGradient = "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)";
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 13px", border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const };
  const chipBase: React.CSSProperties = { padding: "4px 11px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.12s" };

  const imageUrl = buildImageUrl();
  const canPublish = caption.trim().length > 0 && !!imageUrl && !over;

  return (
    <div style={{ ...card, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: igGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>Ig</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: -0.4 }}>Instagram Caption Generator</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>AI-powered · @saabai.ai · Branded image + caption</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

        {/* Left — inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Format */}
          <div>
            <p style={labelStyle}>Post Format</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFormat(f.value); setTopic(""); setTopicPage(0); }}
                  style={{
                    padding: "10px 8px", borderRadius: 9, border: "1.5px solid",
                    borderColor: format === f.value ? "#dc2743" : "#e5e7eb",
                    background: format === f.value ? "#fff0f3" : "#fff",
                    cursor: "pointer", textAlign: "left" as const, transition: "all 0.12s",
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: format === f.value ? "#dc2743" : "#111827" }}>{f.label}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "#9ca3af", lineHeight: 1.4 }}>{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested topics + refresh */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ ...labelStyle, margin: 0 }}>Suggested Topics</p>
              <button
                onClick={() => { setTopic(""); setTopicPage(p => (p + 1) % totalPages); }}
                style={{ fontSize: 11, fontWeight: 600, color: "#dc2743", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
              >
                ↻ Refresh
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {visibleTopics.map(t => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  style={{
                    padding: "8px 12px", borderRadius: 8, border: "1px solid",
                    borderColor: topic === t ? "#dc2743" : "#e5e7eb",
                    background: topic === t ? "#fff0f3" : "#f9fafb",
                    color: topic === t ? "#dc2743" : "#374151",
                    fontSize: 12, fontWeight: topic === t ? 600 : 400,
                    cursor: "pointer", textAlign: "left" as const, transition: "all 0.1s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 10, color: "#d1d5db", textAlign: "right" as const }}>
              Set {topicPage + 1} of {totalPages} · {allTopics.length} topics
            </p>
          </div>

          {/* Topic field */}
          <div>
            <p style={labelStyle}>Topic / Hook</p>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Select above or type your own hook…"
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div>
            <p style={labelStyle}>Notes / Context <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Stats, specific details, tone adjustments…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }}
            />
          </div>

          {/* Hashtag chips */}
          <div>
            <p style={labelStyle}>Suggested Hashtags</p>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {suggestedHashtags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setCaption(prev => prev.trim() ? `${prev.trim()}\n${tag}` : tag)}
                  style={{ ...chipBase }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#fff0f3"; el.style.borderColor = "#dc2743"; el.style.color = "#dc2743"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#f9fafb"; el.style.borderColor = "#e5e7eb"; el.style.color = "#374151"; }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={!topic.trim() || generating}
            style={{
              padding: "13px 24px", borderRadius: 10, border: "none",
              background: !topic.trim() || generating ? "#e5e7eb" : igGradient,
              color: !topic.trim() || generating ? "#9ca3af" : "#fff",
              fontSize: 14, fontWeight: 800, cursor: !topic.trim() || generating ? "not-allowed" : "pointer",
              letterSpacing: 0.3, transition: "opacity 0.2s",
            }}
          >
            {generating ? "Generating…" : "Generate Caption"}
          </button>
          {genError && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{genError}</p>}
        </div>

        {/* Right — image + caption + publish */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Image section */}
          <div>
            <p style={labelStyle}>Image Card</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
              {IMAGE_TYPES.map(({ value, label, hint }) => (
                <button
                  key={value}
                  onClick={() => { setImageType(value); setPreviewUrl(null); }}
                  style={{
                    padding: "6px 12px", borderRadius: 20, border: "1px solid",
                    borderColor: imageType === value ? "#dc2743" : "#e5e7eb",
                    background: imageType === value ? "#fff0f3" : "#fff",
                    color: imageType === value ? "#dc2743" : "#6b7280",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {label}
                  {imageType === value && hint && <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>· {hint}</span>}
                </button>
              ))}
            </div>

            {imageType === "custom" ? (
              <input
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg (must be publicly accessible)"
                style={inputStyle}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {imageType === "stat" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Big stat (e.g. 90 sec)" value={imgStat} onChange={e => setImgStat(e.target.value)} style={{ ...inputStyle }} />
                    <input placeholder="Context" value={imgSub} onChange={e => setImgSub(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                )}
                {imageType === "insight" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Headline" value={imgHeadline} onChange={e => setImgHeadline(e.target.value)} style={{ ...inputStyle }} />
                    <input placeholder="Subtext (optional)" value={imgSub} onChange={e => setImgSub(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                )}
                {imageType === "quote" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Quote text" value={imgHeadline} onChange={e => setImgHeadline(e.target.value)} style={{ ...inputStyle }} />
                    <input placeholder="Attribution" value={imgSub} onChange={e => setImgSub(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                )}
                {imageType === "beforeafter" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Before" value={imgBefore} onChange={e => setImgBefore(e.target.value)} style={{ ...inputStyle }} />
                    <input placeholder="After" value={imgAfter} onChange={e => setImgAfter(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input placeholder="Label (e.g. Law Firm Result)" value={imgLabel} onChange={e => setImgLabel(e.target.value)} style={{ ...inputStyle }} />
                  <button
                    onClick={() => setPreviewUrl(buildImageUrl())}
                    style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #dc2743", background: "#fff", color: "#dc2743", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}
                  >
                    Preview
                  </button>
                </div>
              </div>
            )}
            {previewUrl && (
              <img src={previewUrl} alt="Image preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", marginTop: 8 }} />
            )}
          </div>

          {/* Caption textarea */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <p style={{ ...labelStyle, margin: 0 }}>{caption ? "Generated Caption — Edit freely" : "Caption"}</p>
              {caption && (
                <span style={{ fontSize: 11, color: over ? "#ef4444" : "#9ca3af", fontWeight: over ? 700 : 400 }}>
                  {charCount.toLocaleString()} / 2,200
                </span>
              )}
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={generating ? "Generating…" : "Generate a caption above, or write your own.\n\nFirst line = the hook (shown before 'more' is clicked).\n\n#hashtags at the end."}
              rows={14}
              style={{
                ...inputStyle,
                resize: "vertical" as const,
                lineHeight: 1.7,
                background: caption ? "#fff" : "#f9fafb",
                borderColor: over ? "#fca5a5" : "#e5e7eb",
              }}
            />
          </div>

          {/* Publish */}
          {caption && !over && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", background: "#f9fafb" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const }}>Publish</p>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {(["now", "schedule"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setScheduleMode(m)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid",
                      borderColor: scheduleMode === m ? "#dc2743" : "#e5e7eb",
                      background: scheduleMode === m ? "#fff0f3" : "#fff",
                      color: scheduleMode === m ? "#dc2743" : "#6b7280",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    {m === "now" ? "Post now" : "Schedule"}
                  </button>
                ))}
              </div>

              {scheduleMode === "schedule" && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#9ca3af", textTransform: "uppercase" as const }}>Date &amp; Time (AEST)</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={scheduleDate} min={todayAEST()} onChange={e => setScheduleDate(e.target.value)} style={{ ...inputStyle, flex: 2, width: "auto" }} />
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ ...inputStyle, flex: 1, width: "auto" }} />
                  </div>
                  <p style={{ margin: "5px 0 0", fontSize: 10, color: "#d1d5db" }}>
                    Scheduled: {fmtScheduleLabel(scheduleDate, scheduleTime)} AEST
                  </p>
                </div>
              )}

              {!imageUrl && (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
                  Add image details above — Instagram requires an image for every post.
                </p>
              )}

              <button
                onClick={publish}
                disabled={!canPublish || publishing}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: !canPublish || publishing ? "#e5e7eb" : scheduleMode === "now" ? igGradient : "#dc2743",
                  color: !canPublish || publishing ? "#9ca3af" : "#fff",
                  fontSize: 13, fontWeight: 800, cursor: !canPublish || publishing ? "not-allowed" : "pointer",
                  letterSpacing: 0.3,
                }}
              >
                {publishing
                  ? "Publishing…"
                  : scheduleMode === "now"
                  ? "Post to Instagram"
                  : `Schedule for ${fmtScheduleLabel(scheduleDate, scheduleTime)}`}
              </button>

              {pubMsg && (
                <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, textAlign: "center", color: pubStatus === "done" ? "#059669" : "#ef4444" }}>
                  {pubStatus === "done" ? "✓ " : ""}{pubMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Queue Panel ───────────────────────────────────────────────────────────────

function QueuePanel({ refresh }: { refresh: number }) {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [collapsed, setCollapsed]   = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const today = todayAEST();

  async function load() {
    const res = await fetch("/api/instagram/queue");
    const data = await res.json();
    setPosts(data.posts ?? []);
  }

  useEffect(() => { load(); }, [refresh]);

  async function cancelPost(id: string) {
    if (!confirm("Remove this post from the queue?")) return;
    await fetch("/api/instagram/queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function postNow(post: Post) {
    if (!confirm("Post this to Instagram right now?")) return;
    await fetch("/api/instagram/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: post.caption, imageUrl: post.imageUrl }),
    });
    await fetch("/api/instagram/queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id }),
    });
    setViewingPost(null);
    load();
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "20px 24px" };
  const btnBase: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" };

  return (
    <>
      {viewingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setViewingPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2743", background: "#fff0f3", padding: "3px 10px", borderRadius: 20 }}>
                {viewingPost.scheduledFor <= today ? "DUE TODAY" : fmtDate(viewingPost.scheduledFor)}
                {viewingPost.scheduledTime ? ` · ${viewingPost.scheduledTime}` : ""}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => postNow(viewingPost)} style={{ ...btnBase, color: "#dc2743", borderColor: "#fca5a5", background: "#fff0f3" }}>Post now</button>
                <button onClick={() => { cancelPost(viewingPost.id); setViewingPost(null); }} style={{ ...btnBase, color: "#ef4444", borderColor: "#fecaca" }}>Remove</button>
                <button onClick={() => setViewingPost(null)} style={{ ...btnBase, color: "#9ca3af" }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {viewingPost.imageUrl && (
                <img src={viewingPost.imageUrl} alt="Post image" style={{ width: "100%", display: "block" }} />
              )}
              <div style={{ padding: "16px 20px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  {viewingPost.caption}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <SectionHeader
          title="Scheduled Queue" sub={`${posts.length} posts · fires at scheduled time AEST`}
          count={posts.length} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onRefresh={load}
        />
        {!collapsed && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 1 }}>
            {posts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No posts scheduled.</p>
            ) : posts.map((post, i) => {
              const isDue = post.scheduledFor <= today;
              const hook = post.caption.split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: i % 2 === 0 ? "#f9fafb" : "#fff", border: isDue ? "1px solid #fbbf24" : "1px solid transparent" }}>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: isDue ? "#d97706" : "#dc2743", background: isDue ? "#fef3c7" : "#fff0f3", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {isDue ? "TODAY" : fmtDate(post.scheduledFor)}
                    {post.scheduledTime ? ` · ${post.scheduledTime}` : ""}
                  </span>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{hook}</span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setViewingPost(post)} style={{ ...btnBase, color: "#dc2743", borderColor: "#fca5a5", background: "#fff0f3" }}>View</button>
                    <button onClick={() => postNow(post)} style={{ ...btnBase, color: "#059669", borderColor: "#a7f3d0", background: "#f0fdf4" }}>Post now</button>
                    <button onClick={() => cancelPost(post.id)} style={{ ...btnBase, color: "#ef4444", borderColor: "#fecaca" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ refresh }: { refresh: number }) {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [collapsed, setCollapsed]   = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  async function load() {
    const res = await fetch("/api/instagram/queue?sent=true");
    const data = await res.json();
    setPosts(data.posts ?? []);
  }

  useEffect(() => { load(); }, [refresh]);

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "20px 24px" };
  const btnBase: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" };

  return (
    <>
      {viewingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setViewingPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "3px 10px", borderRadius: 20 }}>
                Posted {viewingPost.sentAt ? fmtDateTime(viewingPost.sentAt) : ""}
                {viewingPost.postId && <span style={{ marginLeft: 6, color: "#9ca3af", fontFamily: "monospace" }}>#{viewingPost.postId}</span>}
              </span>
              <button onClick={() => setViewingPost(null)} style={{ ...btnBase, color: "#9ca3af" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {viewingPost.imageUrl && (
                <img src={viewingPost.imageUrl} alt="Post image" style={{ width: "100%", display: "block" }} />
              )}
              <div style={{ padding: "16px 20px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{viewingPost.caption}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <SectionHeader
          title="Posted History" sub="All published posts · most recent first"
          count={posts.length} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onRefresh={load}
        />
        {!collapsed && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 1 }}>
            {posts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No posts published yet.</p>
            ) : posts.map((post, i) => {
              const hook = post.caption.split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {post.sentAt ? fmtDateTime(post.sentAt) : fmtDate(post.scheduledFor)}
                  </span>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{hook}</span>
                  <button onClick={() => setViewingPost(post)} style={{ ...btnBase, fontSize: 11, flexShrink: 0 }}>View</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InstagramAdminPage() {
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick(t => t + 1);

  const igGradient = "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)";

  const PLATFORMS = [
    { label: "LinkedIn",  href: "/saabai-admin/social/linkedin",  active: false },
    { label: "Instagram", href: "/saabai-admin/social/instagram", active: true  },
    { label: "Facebook",  href: "#", active: false, soon: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0e0c2e", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/saabai-admin" style={{ fontSize: 13, color: "#8b8fa8", textDecoration: "none" }}>← Admin</a>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Social Media</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a
                href="https://www.instagram.com/saabai.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa8", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 4, background: igGradient, color: "#fff" }}>Ig</span>
                @saabai.ai
              </a>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <a
                href="https://www.facebook.com/saabai.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa8", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, padding: "1px 6px", borderRadius: 3, background: "#1877f2", color: "#fff", fontFamily: "Georgia, serif" }}>f</span>
                saabai.ai
              </a>
            </div>
          </div>

          {/* Platform tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {PLATFORMS.map(p => (
              <a
                key={p.label}
                href={p.href}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none",
                  color: p.active ? "#fff" : "#8b8fa8",
                  borderBottom: p.active ? "2px solid #dc2743" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: p.soon ? 0.5 : 1,
                  cursor: p.soon ? "default" : "pointer",
                  transition: "color 0.15s",
                }}
              >
                {p.label === "LinkedIn" && <span style={{ fontSize: 11, fontWeight: 900, background: "#0077b5", color: "#fff", padding: "1px 5px", borderRadius: 3 }}>in</span>}
                {p.label === "Instagram" && <span style={{ fontSize: 10, fontWeight: 900, background: igGradient, color: "#fff", padding: "1px 5px", borderRadius: 3 }}>Ig</span>}
                {p.label === "Facebook" && <span style={{ fontSize: 13, fontWeight: 900, background: "#1877f2", color: "#fff", padding: "1px 6px", borderRadius: 3, fontFamily: "Georgia, serif" }}>f</span>}
                {p.label}
                {p.soon && <span style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, letterSpacing: 0.5 }}>SOON</span>}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {["Caption Generator", "Scheduled Queue", "Posted History"].map((label, i) => (
            <a key={label} href={`#${["generator", "queue", "history"][i]}`}
              style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", padding: "6px 14px", borderRadius: 20, background: "#fff", border: "1px solid #e5e7eb", textDecoration: "none", transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#dc2743"; e.currentTarget.style.color = "#dc2743"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Env var warning */}
        {typeof window !== "undefined" && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>Instagram credentials required</p>
              <p style={{ margin: 0, fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
                Add <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>INSTAGRAM_BUSINESS_ACCOUNT_ID</code> and <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>INSTAGRAM_ACCESS_TOKEN</code> to Vercel environment variables to enable posting. The generator and queue work immediately.
              </p>
            </div>
          </div>
        )}

        <div id="generator" style={{ scrollMarginTop: 20 }}>
          <CaptionGenerator onQueued={refresh} />
        </div>

        <div id="queue" style={{ scrollMarginTop: 20 }}>
          <QueuePanel refresh={refreshTick} />
        </div>

        <div id="history" style={{ scrollMarginTop: 20 }}>
          <HistoryPanel refresh={refreshTick} />
        </div>

      </div>
    </div>
  );
}
