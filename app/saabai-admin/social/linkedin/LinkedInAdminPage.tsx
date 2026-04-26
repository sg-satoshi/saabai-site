"use client";

import { useState, useEffect } from "react";
import AdminShell from "../../AdminSidebar";

// ── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  content: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMATS = [
  { value: "Insight",       label: "Insight",       hint: "Observation from client work" },
  { value: "Myth-Bust",     label: "Myth-Bust",     hint: "Challenge a common belief" },
  { value: "Before/After",  label: "Before / After",hint: "Client result story" },
  { value: "Process",       label: "Process",       hint: "Step-by-step breakdown" },
  { value: "Advisory",      label: "Advisory",      hint: "Board/executive positioning" },
  { value: "News-Reactive", label: "News-Reactive", hint: "Respond to AI news/trend" },
];

// Extended topic pools — 10 per format, displayed 5 at a time
const ALL_TOPICS: Record<string, string[]> = {
  "Insight": [
    "The real cost of after-hours enquiries going unanswered",
    "Why small firms automate faster than large ones",
    "What 10 hours a week recovered actually means financially",
    "The one question to ask before any AI project",
    "Why the first automation should be boring, not glamorous",
    "Why most AI demos fail — and what good looks like",
    "The hidden cost of copy-pasting between systems",
    "What a fully automated intake actually feels like for the client",
    "Why professional services firms are the best AI use case",
    "The difference between AI tools and AI systems",
  ],
  "Myth-Bust": [
    "\"We tried AI before and it didn't work\"",
    "\"We need to hire an AI person first\"",
    "\"We're not ready for AI yet\"",
    "\"AI will replace our staff\"",
    "\"We'll start next quarter when things are quieter\"",
    "\"We need to clean up our data first\"",
    "\"AI is too expensive for a firm our size\"",
    "\"Our clients won't want to talk to a bot\"",
    "\"We already have software for that\"",
    "\"We need board approval before we can move\"",
  ],
  "Before/After": [
    "Law firm intake: 9% → 28% conversion after AI agent",
    "Quotes dropping from 22 minutes to 90 seconds",
    "Document chasing: 12 hours/month → fully automated",
    "Property maintenance turnaround: 4 days → 18 hours",
    "Accounting firm client onboarding overhaul",
    "After-hours response time: next morning → 90 seconds",
    "Referral follow-up: manual → fully automated pipeline",
    "Fee earner admin load: 40% of week → under 10%",
    "Client satisfaction score before and after AI intake",
    "Monthly leads lost after hours: 30+ → zero",
  ],
  "Process": [
    "What an intake audit actually looks like step by step",
    "The 3-week timeline from discovery to live system",
    "How to fix the CRM/email/spreadsheet triangle",
    "The copy-paste problem and how to solve it",
    "How to qualify leads without turning people away",
    "How we map a firm's biggest bottleneck in one session",
    "The 5 systems that every professional services firm needs",
    "How to document a process before you automate it",
    "What happens in week one of an AI engagement",
    "How to test an AI agent before going live with clients",
  ],
  "Advisory": [
    "What boards are getting wrong about AI investment",
    "The difference between an AI strategy and an experiment budget",
    "How to spot an AI vendor selling snake oil",
    "What a non-executive AI director actually does",
    "The question every board should be asking about AI",
    "Why CFOs should own the AI automation budget",
    "How to measure ROI on AI before you buy",
    "The three tiers of AI maturity for professional services",
    "What separates firms that lead from firms that follow on AI",
    "Why your AI strategy needs an owner, not a committee",
  ],
  "News-Reactive": [
    "AI agents are now mainstream — what that means for SMEs",
    "The Australian productivity gap and AI",
    "Why 2026 is the year professional services firms can't wait",
    "What the latest AI model releases mean for your business",
    "How AI is reshaping the professional services landscape in Australia",
    "The real implication of the OpenAI announcement this week",
    "Why the ChatGPT hype missed the point — and what actually matters",
    "Australia's new AI framework and what it means for your firm",
    "Why big tech AI tools won't solve your specific firm problem",
    "The AI capability gap between large and small firms is closing fast",
  ],
};

// Angle chips per topic — how to frame the post
const TOPIC_ANGLES: Record<string, string[]> = {
  "The real cost of after-hours enquiries going unanswered": ["Lead with a dollar figure", "Open with the 30–45% stat", "Frame as competitive advantage", "Tell it from a client's POV"],
  "Why small firms automate faster than large ones": ["Contrarian take — challenge the assumption", "Frame as a speed advantage for SMEs", "Advisory angle for firm owners", "Use a real client example"],
  "What 10 hours a week recovered actually means financially": ["Lead with the annual revenue number", "Open with what 10hrs actually costs at billing rate", "Frame as a hiring alternative", "Show compounding effect over a year"],
  "The one question to ask before any AI project": ["Reveal the question early", "Build tension — withhold and deliver", "Frame as a filter for bad AI projects", "Open with a failure story"],
  "Why the first automation should be boring, not glamorous": ["Counter-intuitive opener", "Practical guide framing", "Challenge the AI hype narrative", "Use the intake example"],
  "\"We tried AI before and it didn't work\"": ["Validate then redirect", "Name the real reason it failed", "Tell the story of a failed vs successful AI project", "Frame as a systems problem not a technology problem"],
  "\"We need to hire an AI person first\"": ["Challenge the assumption directly", "Show what actually comes first", "Cost comparison angle", "Frame as a sequencing mistake"],
  "\"We're not ready for AI yet\"": ["Flip the question — ready compared to what?", "Use the 30–45% stat as a ready check", "Frame readiness as a decision not a milestone", "Show what not-ready is costing"],
  "\"AI will replace our staff\"": ["Separate AI tools from AI systems", "Show what automation actually replaces (tasks not people)", "Use the capacity argument", "Address the fear directly then reframe"],
  "Law firm intake: 9% → 28% conversion after AI agent": ["Lead with the result, reveal the method", "Start with the before state", "Frame as a case study", "Open with what changed"],
  "Quotes dropping from 22 minutes to 90 seconds": ["Lead with the time number", "Frame as a client experience story", "Show the compounding effect across 20 quotes/week", "Competitive angle"],
  "Document chasing: 12 hours/month → fully automated": ["Open with what 12 hours actually costs", "Frame as a dignity issue for staff", "Show the client experience improvement", "Lead with the automation mechanics"],
  "What an intake audit actually looks like step by step": ["Step-by-step listicle format", "Open with what most firms discover in hour one", "Frame as a diagnostic tool", "Show the output, not just the process"],
  "The 3-week timeline from discovery to live system": ["Week-by-week breakdown", "Frame as a speed story vs traditional IT", "Open with what happens in week 3", "Show what's decided in week 1"],
  "What boards are getting wrong about AI investment": ["Open with the most common mistake", "Advisory tone — peer to peer", "Frame as a fiduciary issue", "Challenge with a direct question"],
  "AI agents are now mainstream — what that means for SMEs": ["Translate the news into practical terms", "Frame as a levelling opportunity", "Show the gap that's closing", "Open with the announcement then pivot to implications"],
};

// Notes/context chips per format — quick-add context fragments
const FORMAT_NOTES_CHIPS: Record<string, string[]> = {
  "Insight": [
    "30–45% of enquiries arrive after hours",
    "Most firms have zero visibility on this",
    "Equivalent to 1–2 missed leads per day",
    "Fee earners spend 20–40% of time on admin",
    "Reference: Saabai client audit data",
    "Keep it to one core idea",
  ],
  "Myth-Bust": [
    "Name the myth in the first line",
    "Acknowledge why the belief exists",
    "The real reason AI projects fail: wrong scope, not wrong technology",
    "Most 'AI failures' are workflow failures",
    "Reference a specific objection from a real conversation",
    "End with a reframe, not a pitch",
  ],
  "Before/After": [
    "Lead with the specific numbers",
    "Name the industry (law / accounting / real estate)",
    "Include the timeframe of the change",
    "Mention what didn't change (team size, hours worked)",
    "Client approved the use of this example",
    "Source: Saabai client implementation",
  ],
  "Process": [
    "Be specific — vague process posts don't land",
    "Include a timeline (e.g. 3 weeks, 2 sessions)",
    "Name the bottleneck being solved",
    "Show the output the firm actually gets",
    "Mention what firms don't need to do (IT team, big budget)",
    "End with a call to reflect, not a CTA",
  ],
  "Advisory": [
    "Write peer-to-peer, not vendor-to-client",
    "Reference a board conversation or C-suite pattern",
    "Avoid jargon — CEOs don't read tech posts",
    "Frame the stakes clearly: what's the cost of inaction?",
    "This is for managing partners / principals",
    "End with a provocation, not a conclusion",
  ],
  "News-Reactive": [
    "Name the news item or trend in the opening",
    "Translate: what does this mean for a law firm / accountant / agent?",
    "Take a clear position — neutral reactions don't get engagement",
    "Tie back to a specific Saabai use case",
    "Acknowledge the hype before cutting through it",
    "Post within 24–48 hours of the news breaking",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00+10:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  }) + " · 9:00am";
}

// ── Bulk Generation Helpers ───────────────────────────────────────────────────

interface BulkPost {
  id: string;
  format: string;
  topic: string;
  content: string;
  imageUrl: string | null;
  scheduledFor: string;
  status: "pending" | "text" | "image" | "done" | "error";
  error?: string;
}

function pickTopics(count: number, fmt: string): Array<{ format: string; topic: string }> {
  if (fmt !== "auto") {
    const pool = [...(ALL_TOPICS[fmt] ?? [])].sort(() => Math.random() - 0.5);
    return pool.slice(0, count).map(t => ({ format: fmt, topic: t }));
  }
  const fmts = FORMATS.map(f => f.value);
  const used: Record<string, Set<string>> = {};
  const result: Array<{ format: string; topic: string }> = [];
  for (let i = 0; i < count; i++) {
    const f = fmts[i % fmts.length];
    if (!used[f]) used[f] = new Set();
    const pool = (ALL_TOPICS[f] ?? []).filter(t => !used[f].has(t));
    if (!pool.length) continue;
    const t = pool[Math.floor(Math.random() * pool.length)];
    used[f].add(t);
    result.push({ format: f, topic: t });
  }
  return result;
}

function buildScheduleDates(count: number, startDate: string, time: string, spacing: string): string[] {
  const dates: string[] = [];
  let d = new Date(`${startDate}T${time}:00+10:00`);
  if (spacing === "mwf") {
    while (dates.length < count) {
      const day = d.getDay();
      if (day === 1 || day === 3 || day === 5) dates.push(d.toISOString());
      d = new Date(d.getTime() + 86400000);
    }
  } else {
    const step = spacing === "every2" ? 172800000 : 86400000;
    for (let i = 0; i < count; i++) {
      dates.push(new Date(d.getTime() + i * step).toISOString());
    }
  }
  return dates;
}

// ── Bulk Generator ────────────────────────────────────────────────────────────

function BulkGenerator({ onQueued }: { onQueued: () => void }) {
  const [count, setCount] = useState(5);
  const [fmt, setFmt] = useState("auto");
  const [startDate, setStartDate] = useState(todayAEST());
  const [time, setTime] = useState("09:00");
  const [spacing, setSpacing] = useState("mwf");
  const [posts, setPosts] = useState<BulkPost[]>([]);
  const [running, setRunning] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [queuedOk, setQueuedOk] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const donePosts = posts.filter(p => p.status === "done");
  const hasResults = posts.length > 0;

  async function generateAll() {
    setRunning(true);
    setQueuedOk(false);
    const selections = pickTopics(count, fmt);
    const dates = buildScheduleDates(selections.length, startDate, time, spacing);
    const initial: BulkPost[] = selections.map((s, i) => ({
      id: `b-${Date.now()}-${i}`,
      format: s.format,
      topic: s.topic,
      content: "",
      imageUrl: null,
      scheduledFor: dates[i] ?? dates[dates.length - 1],
      status: "pending",
    }));
    setPosts(initial);

    for (let i = 0; i < initial.length; i++) {
      // Step 1 — generate text
      setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, status: "text" } : p));
      let content = "";
      try {
        const r = await fetch("/api/linkedin/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: initial[i].format, topic: initial[i].topic }),
        });
        const d = await r.json();
        content = d.content ?? "";
      } catch {
        setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, status: "error", error: "Text generation failed" } : p));
        continue;
      }

      // Step 2 — generate image
      setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, content, status: "image" } : p));
      let imageUrl: string | null = null;
      try {
        const r = await fetch("/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: initial[i].topic, platform: "linkedin", postContent: content }),
        });
        const d = await r.json();
        if (d.url) imageUrl = d.url;
      } catch { /* image failed — post still usable */ }

      setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, content, imageUrl, status: "done" } : p));
    }
    setRunning(false);
  }

  async function queueAll() {
    setQueuing(true);
    let ok = 0;
    for (const post of donePosts) {
      try {
        const r = await fetch("/api/linkedin/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: post.content, scheduledFor: post.scheduledFor, imageUrl: post.imageUrl ?? undefined }),
        });
        if (r.ok) ok++;
      } catch { /* continue */ }
    }
    setQueuing(false);
    if (ok > 0) { setQueuedOk(true); setPosts([]); onQueued(); }
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "24px 28px" };
  const chipBtn = (active: boolean, accent = "#0077b5"): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${active ? accent : "#e5e7eb"}`,
    background: active ? "#eff8ff" : "#f9fafb", color: active ? accent : "#374151",
    fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.1s",
  });
  const label: React.CSSProperties = { margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" };
  const inputStyle: React.CSSProperties = { padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit" };

  const statusLabel: Record<BulkPost["status"], string> = {
    pending: "Waiting…",
    text: "Writing post…",
    image: "Generating image…",
    done: "Ready",
    error: "Failed",
  };
  const statusColor: Record<BulkPost["status"], string> = {
    pending: "#9ca3af", text: "#0077b5", image: "#7c3aed", done: "#059669", error: "#ef4444",
  };
  const statusBg: Record<BulkPost["status"], string> = {
    pending: "#f3f4f6", text: "#eff8ff", image: "#f5f3ff", done: "#f0fdf4", error: "#fef2f2",
  };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsed ? 0 : 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg, #1d4ed8 0%, #0077b5 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827", letterSpacing: -0.3 }}>Bulk Post Generator</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Generate + image + schedule — up to 10 posts at once</p>
          </div>
        </div>
        <button onClick={() => setCollapsed(v => !v)} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Config row */}
          <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr 1fr auto", gap: 20, alignItems: "start", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
            {/* Count */}
            <div>
              <p style={label}>Posts</p>
              <div style={{ display: "flex", gap: 5 }}>
                {[3, 5, 7, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={chipBtn(count === n)}>{n}</button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div>
              <p style={label}>Spacing</p>
              <div style={{ display: "flex", gap: 5 }}>
                {[["mwf", "Mon/Wed/Fri"], ["daily", "Daily"], ["every2", "Every 2d"]].map(([v, l]) => (
                  <button key={v} onClick={() => setSpacing(v)} style={chipBtn(spacing === v)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <p style={label}>Format</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[["auto", "Auto-vary"], ...FORMATS.map(f => [f.value, f.label])].map(([v, l]) => (
                  <button key={v} onClick={() => setFmt(v)} style={chipBtn(fmt === v)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Start date + time */}
            <div>
              <p style={label}>Start Date &amp; Time (AEST)</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={startDate} min={todayAEST()} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle }} />
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, width: 90 }} />
              </div>
            </div>

            {/* Generate button */}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={generateAll}
                disabled={running}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: running ? "#e5e7eb" : "linear-gradient(135deg, #1d4ed8 0%, #0077b5 100%)",
                  color: running ? "#9ca3af" : "#fff",
                  fontSize: 13, fontWeight: 800, cursor: running ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {running ? "Generating…" : `Generate ${count} posts`}
              </button>
            </div>
          </div>

          {/* Post cards */}
          {hasResults && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {posts.map((post, i) => (
                <div key={post.id} style={{ border: `1px solid ${post.status === "error" ? "#fecaca" : post.status === "done" ? "#a7f3d0" : "#e5e7eb"}`, borderRadius: 12, padding: "14px 16px", background: post.status === "done" ? "#f9fffe" : "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: post.content ? 10 : 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: statusColor[post.status], background: statusBg[post.status], padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>
                      {post.status === "done" ? "✓" : post.status === "error" ? "✗" : "◌"} {statusLabel[post.status]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0077b5", background: "#eff8ff", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{post.format}</span>
                    <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.topic}</span>
                    {post.status === "done" && (
                      <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>
                        {new Date(post.scheduledFor).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })} · {time}
                      </span>
                    )}
                    {post.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid #e5e7eb" }} />
                    )}
                  </div>
                  {post.content && (
                    <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {post.content}
                    </p>
                  )}
                  {post.error && <p style={{ margin: 0, fontSize: 11, color: "#ef4444" }}>{post.error}</p>}
                </div>
              ))}

              {/* Queue all */}
              {!running && donePosts.length > 0 && !queuedOk && (
                <button
                  onClick={queueAll}
                  disabled={queuing}
                  style={{
                    marginTop: 4, padding: "12px", borderRadius: 10, border: "none",
                    background: queuing ? "#e5e7eb" : "#059669",
                    color: queuing ? "#9ca3af" : "#fff",
                    fontSize: 13, fontWeight: 800, cursor: queuing ? "not-allowed" : "pointer",
                  }}
                >
                  {queuing ? "Scheduling…" : `Queue all ${donePosts.length} posts`}
                </button>
              )}
              {queuedOk && (
                <p style={{ margin: 0, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#059669" }}>
                  ✓ All posts added to the queue
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function todayAEST() {
  return new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub, count, collapsed, onToggle, onRefresh }: {
  icon: string; title: string; sub: string; count?: number;
  collapsed: boolean; onToggle: () => void; onRefresh?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}{count !== undefined ? <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>({count})</span> : null}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onRefresh && <button onClick={onRefresh} style={{ fontSize: 13, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>↻</button>}
        <button onClick={onToggle} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>
    </div>
  );
}

// ── Post Generator ────────────────────────────────────────────────────────────

function PostGenerator({ onQueued }: { onQueued: () => void }) {
  const [format, setFormat] = useState("Insight");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState("");
  const [generating, setGenerating] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("schedule");
  const [scheduleDate, setScheduleDate] = useState(todayAEST());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [publishing, setPublishing] = useState(false);
  const [pubStatus, setPubStatus] = useState<"idle" | "done" | "error">("idle");
  const [genError, setGenError] = useState("");
  const [topicPage, setTopicPage] = useState(0); // which set of 5 topics to show

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const charCount = generated.length;
  const over = charCount > 3000;

  async function generateImage() {
    if (!topic.trim()) return;
    setGeneratingImage(true);
    setImageError("");
    setImageUrl(null);
    try {
      const res = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: "linkedin", postContent: generated }),
      });
      let data: { url?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response (e.g. gateway timeout) */ }
      if (data.url) setImageUrl(data.url);
      else setImageError(data.error ?? (res.ok ? "Image generation failed — try again." : `Server error (${res.status}) — try again.`));
    } catch {
      setImageError("Request failed — check your connection and try again.");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setGenError("");
    setGenerated("");
    try {
      const res = await fetch("/api/linkedin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, topic, notes }),
      });
      const data = await res.json();
      if (data.content) {
        setGenerated(data.content);
      } else {
        setGenError("Generation failed — try again.");
      }
    } catch {
      setGenError("Network error — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    if (!generated.trim() || over) return;
    setPublishing(true);
    try {
      if (scheduleMode === "now") {
        // Post immediately via Make webhook
        const res = await fetch("/api/linkedin/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: generated, imageUrl: imageUrl ?? undefined }),
        });
        if (res.ok) {
          setPubStatus("done");
          setGenerated("");
          setTopic("");
          setNotes("");
          setImageUrl(null);
          onQueued();
        } else {
          setPubStatus("error");
        }
      } else {
        // Queue to Redis
        const res = await fetch("/api/linkedin/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: generated, scheduledFor: `${scheduleDate}T${scheduleTime}:00+10:00`, imageUrl: imageUrl ?? undefined }),
        });
        if (res.ok) {
          setPubStatus("done");
          setGenerated("");
          setTopic("");
          setNotes("");
          onQueued();
        } else {
          setPubStatus("error");
        }
      }
    } finally {
      setPublishing(false);
      setTimeout(() => setPubStatus("idle"), 3000);
    }
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { margin: "0 0 9px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const };
  const chipBase: React.CSSProperties = { padding: "5px 11px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.12s" };

  // Derived
  const allTopics = ALL_TOPICS[format] ?? [];
  const pageSize = 5;
  const totalPages = Math.ceil(allTopics.length / pageSize);
  const visibleTopics = allTopics.slice(topicPage * pageSize, topicPage * pageSize + pageSize);
  const angleChips = TOPIC_ANGLES[topic] ?? [];
  const notesChips = FORMAT_NOTES_CHIPS[format] ?? [];

  function fmtScheduleLabel() {
    try {
      const d = new Date(`${scheduleDate}T${scheduleTime}:00+10:00`);
      return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) + " at " + d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    } catch { return scheduleDate; }
  }

  function appendNote(chip: string) {
    setNotes(prev => prev ? `${prev.trim()}\n${chip}` : chip);
  }

  return (
    <div style={{ ...card, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: -0.3 }}>AI</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: -0.4 }}>LinkedIn Post Generator</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>AI-powered · Shane's voice · Instant or scheduled</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

        {/* Left — inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Format selector */}
          <div>
            <p style={labelStyle}>Post Format</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFormat(f.value); setTopic(""); setTopicPage(0); }}
                  style={{
                    padding: "10px 8px", borderRadius: 9, border: "1.5px solid",
                    borderColor: format === f.value ? "#0077b5" : "#e5e7eb",
                    background: format === f.value ? "#eff8ff" : "#fff",
                    cursor: "pointer", textAlign: "left" as const, transition: "all 0.12s",
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: format === f.value ? "#0077b5" : "#111827" }}>{f.label}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "#9ca3af", lineHeight: 1.4 }}>{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested topics + Refresh */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <p style={{ ...labelStyle, margin: 0 }}>Suggested Topics</p>
              <button
                onClick={() => { setTopic(""); setTopicPage(p => (p + 1) % totalPages); }}
                style={{ fontSize: 11, fontWeight: 600, color: "#0077b5", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 4 }}
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
                    borderColor: topic === t ? "#0077b5" : "#e5e7eb",
                    background: topic === t ? "#eff8ff" : "#f9fafb",
                    color: topic === t ? "#0077b5" : "#374151",
                    fontSize: 12, fontWeight: topic === t ? 600 : 400,
                    cursor: "pointer", textAlign: "left" as const, transition: "all 0.1s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#d1d5db", textAlign: "right" as const }}>
              Set {topicPage + 1} of {totalPages} · {allTopics.length} topics
            </p>
          </div>

          {/* Topic / Angle field + angle chips */}
          <div>
            <p style={labelStyle}>Topic / Angle</p>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Select above or type your own topic or headline…"
              style={{ ...inputStyle }}
            />
            {angleChips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 8 }}>
                {angleChips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setNotes(prev => prev ? `${prev.trim()}\nAngle: ${chip}` : `Angle: ${chip}`)}
                    style={{ ...chipBase }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#eff8ff"; el.style.borderColor = "#0077b5"; el.style.color = "#0077b5"; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#f9fafb"; el.style.borderColor = "#e5e7eb"; el.style.color = "#374151"; }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Context field + notes chips */}
          <div>
            <p style={labelStyle}>Notes / Context <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Specific stats, client details, or angles to include…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" as const }}
            />
            {notesChips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 8 }}>
                {notesChips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => appendNote(chip)}
                    style={{ ...chipBase }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#f0fdf4"; el.style.borderColor = "#6ee7b7"; el.style.color = "#059669"; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#f9fafb"; el.style.borderColor = "#e5e7eb"; el.style.color = "#374151"; }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!topic.trim() || generating}
            style={{
              padding: "13px 24px", borderRadius: 10, border: "none",
              background: !topic.trim() || generating ? "#e5e7eb" : "linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)",
              color: !topic.trim() || generating ? "#9ca3af" : "#fff",
              fontSize: 14, fontWeight: 800, cursor: !topic.trim() || generating ? "not-allowed" : "pointer",
              letterSpacing: 0.3, transition: "all 0.2s",
            }}
          >
            {generating ? "Generating…" : "Generate Post"}
          </button>

          {genError && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{genError}</p>}
        </div>

        {/* Right — preview + publish */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>
                {generated ? "Generated Post — Edit freely" : "Preview"}
              </p>
              {generated && (
                <span style={{ fontSize: 11, color: over ? "#ef4444" : "#9ca3af", fontWeight: over ? 700 : 400 }}>
                  {charCount} / 3000
                </span>
              )}
            </div>
            <textarea
              value={generated}
              onChange={e => setGenerated(e.target.value)}
              placeholder={generating ? "Generating your post…" : "Your generated post will appear here. Edit it freely before publishing."}
              rows={16}
              style={{
                ...inputStyle,
                resize: "vertical" as const,
                lineHeight: 1.7,
                background: generated ? "#fff" : "#f9fafb",
                borderColor: over ? "#fca5a5" : "#e5e7eb",
                color: "#111827",
              }}
            />
          </div>

          {/* Regenerate */}
          {generated && (
            <button
              onClick={generate}
              disabled={generating}
              style={{
                padding: "9px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#f9fafb", color: "#374151", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ↻ Regenerate
            </button>
          )}

          {/* Image generation */}
          {generated && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", background: "#f9fafb" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: imageUrl ? 12 : 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" as const }}>
                  Post Image <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: 0, color: "#9ca3af" }}>(optional)</span>
                </p>
                <button
                  onClick={generatingImage ? undefined : (imageUrl ? () => { setImageUrl(null); setImageError(""); } : generateImage)}
                  disabled={generatingImage}
                  style={{
                    padding: "6px 14px", borderRadius: 7, border: "1px solid",
                    borderColor: imageUrl ? "#fca5a5" : "#0077b5",
                    background: imageUrl ? "#fff5f5" : "#eff8ff",
                    color: imageUrl ? "#ef4444" : "#0077b5",
                    fontSize: 11, fontWeight: 700, cursor: generatingImage ? "not-allowed" : "pointer",
                    opacity: generatingImage ? 0.6 : 1,
                  }}
                >
                  {generatingImage ? "Generating…" : imageUrl ? "✕ Remove image" : "Generate image"}
                </button>
              </div>
              {imageError && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444" }}>{imageError}</p>}
              {imageUrl && (
                <div style={{ marginTop: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Generated post image"
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", display: "block" }}
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 10, color: "#9ca3af" }}>
                    AI-generated · will be attached to this post
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Publish controls */}
          {generated && !over && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", background: "#f9fafb" }}>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>Publish</p>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {(["now", "schedule"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setScheduleMode(m)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid",
                      borderColor: scheduleMode === m ? "#0077b5" : "#e5e7eb",
                      background: scheduleMode === m ? "#eff8ff" : "#fff",
                      color: scheduleMode === m ? "#0077b5" : "#6b7280",
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
                    <input
                      type="date"
                      value={scheduleDate}
                      min={todayAEST()}
                      onChange={e => setScheduleDate(e.target.value)}
                      style={{ ...inputStyle, flex: 2, width: "auto" }}
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      style={{ ...inputStyle, flex: 1, width: "auto" }}
                    />
                  </div>
                  <p style={{ margin: "5px 0 0", fontSize: 10, color: "#d1d5db" }}>
                    Scheduled: {fmtScheduleLabel()} AEST
                  </p>
                </div>
              )}

              <button
                onClick={publish}
                disabled={publishing}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: publishing ? "#e5e7eb" : scheduleMode === "now" ? "#059669" : "#0077b5",
                  color: publishing ? "#9ca3af" : "#fff",
                  fontSize: 13, fontWeight: 800, cursor: publishing ? "not-allowed" : "pointer",
                  letterSpacing: 0.3, transition: "background 0.15s",
                }}
              >
                {publishing ? "Publishing…" : scheduleMode === "now" ? "Post to LinkedIn" : `Schedule for ${fmtScheduleLabel()}`}
              </button>

              {pubStatus === "done" && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#059669", fontWeight: 600, textAlign: "center" }}>
                  {scheduleMode === "now" ? "✓ Posted to LinkedIn!" : "✓ Scheduled successfully!"}
                </p>
              )}
              {pubStatus === "error" && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#ef4444", textAlign: "center" }}>
                  Something went wrong — try again.
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const today = todayAEST();

  async function load() {
    const res = await fetch("/api/linkedin/queue");
    const data = await res.json();
    const sorted = (data.posts ?? []).sort((a: Post, b: Post) => a.scheduledFor.localeCompare(b.scheduledFor));
    setPosts(sorted);
  }

  useEffect(() => { load(); }, [refresh]);

  async function postNow(post: Post) {
    if (!confirm("Post to LinkedIn right now?")) return;
    try {
      const postRes = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content }),
      });
      if (!postRes.ok) {
        const error = await postRes.json().catch(() => ({ error: postRes.statusText }));
        throw new Error(error.error || postRes.statusText);
      }

      const queueRes = await fetch("/api/linkedin/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      if (!queueRes.ok) {
        throw new Error("Failed to remove from queue");
      }

      setViewingPost(null);
      load();
      alert("✓ Posted to LinkedIn successfully!");
    } catch (err) {
      alert(`✗ Error posting to LinkedIn: ${String(err)}`);
      console.error("postNow error:", err);
    }
  }

  async function cancelPost(id: string) {
    if (!confirm("Remove this post from the queue?")) return;
    try {
      const res = await fetch("/api/linkedin/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error("Failed to remove post");
      }
      load();
      alert("✓ Post removed from queue");
    } catch (err) {
      alert(`✗ Error: ${String(err)}`);
      console.error("cancelPost error:", err);
    }
  }

  const btnBase: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "20px 24px" };

  return (
    <>
      {viewingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewingPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: viewingPost.sentAt ? "#059669" : "#0077b5", background: viewingPost.sentAt ? "#f0fdf4" : "#eff8ff", padding: "3px 10px", borderRadius: 20 }}>
                {viewingPost.sentAt ? `✓ Posted ${fmtDateTime(viewingPost.sentAt)}` : fmtDate(viewingPost.scheduledFor)}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {!viewingPost.sentAt && <>
                  <button onClick={() => postNow(viewingPost)} style={{ ...btnBase, color: "#059669", borderColor: "#a7f3d0" }}>Post now</button>
                  <button onClick={() => { cancelPost(viewingPost.id); setViewingPost(null); }} style={{ ...btnBase, color: "#ef4444", borderColor: "#fecaca" }}>Remove</button>
                </>}
                <button onClick={() => setViewingPost(null)} style={{ ...btnBase, color: "#9ca3af" }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{viewingPost.content}</p>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <SectionHeader icon="🗓" title="Scheduled Queue" sub={`${posts.length} posts · fires 9:00am AEST`} count={posts.length} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onRefresh={load} />
        {!collapsed && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 1 }}>
            {posts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No posts scheduled.</p>
            ) : posts.map((post, i) => {
              const isDue = post.scheduledFor <= today;
              const preview = post.content.split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: i % 2 === 0 ? "#f9fafb" : "#fff", border: isDue ? "1px solid #fbbf24" : "1px solid transparent" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isDue ? "#d97706" : "#0077b5", background: isDue ? "#fef3c7" : "#eff8ff", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {isDue ? "TODAY" : fmtDate(post.scheduledFor)}
                  </span>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{preview}</span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setViewingPost(post)} style={{ ...btnBase, color: "#0077b5", borderColor: "#bfdbfe", background: "#f0f9ff" }}>View</button>
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  async function load() {
    const res = await fetch("/api/linkedin/queue?sent=true");
    const data = await res.json();
    setPosts(data.posts ?? []);
  }

  useEffect(() => { load(); }, [refresh]);

  const btnBase: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "20px 24px" };

  return (
    <>
      {viewingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewingPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "3px 10px", borderRadius: 20 }}>
                ✓ {viewingPost.sentAt ? fmtDateTime(viewingPost.sentAt) : fmtDate(viewingPost.scheduledFor)}
              </span>
              <button onClick={() => setViewingPost(null)} style={{ ...btnBase, color: "#9ca3af" }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{viewingPost.content}</p>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <SectionHeader icon="✓" title="Posted History" sub="All published posts · most recent first" count={posts.length} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onRefresh={load} />
        {!collapsed && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 1 }}>
            {posts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No posts published yet.</p>
            ) : posts.map((post, i) => {
              const preview = post.content.split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    ✓ {post.sentAt ? fmtDateTime(post.sentAt) : fmtDate(post.scheduledFor)}
                  </span>
                  <span style={{ fontSize: 12, color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{preview}</span>
                  <button onClick={() => setViewingPost(post)} style={{ ...btnBase, color: "#0077b5", borderColor: "#bfdbfe", background: "#f0f9ff", flexShrink: 0 }}>View</button>
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

export default function LinkedInAdminPage() {
  const [refreshTick, setRefreshTick] = useState(0);

  function refresh() { setRefreshTick(t => t + 1); }

  const PLATFORMS = [
    { label: "LinkedIn",  href: "/saabai-admin/social/linkedin",  active: true  },
    { label: "Instagram", href: "/saabai-admin/social/instagram", active: false },
    { label: "Facebook",  href: "#", active: false, soon: true },
  ];

  return (
    <AdminShell activePath="/saabai-admin/social/linkedin">

      {/* Page header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px" }}>
        {/* Platform tabs */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", height: 52 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#eef0ff", marginRight: 16 }}>Social Media</span>
          {PLATFORMS.map(p => {
            const activeColour = p.label === "Instagram" ? "#dc2743" : p.label === "Facebook" ? "#1877f2" : "#0077b5";
            return (
              <a
                key={p.label}
                href={p.href}
                style={{
                  padding: "6px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none",
                  color: p.active ? "#fff" : "#9aa0b8",
                  borderBottom: p.active ? `2px solid ${activeColour}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: p.soon ? 0.5 : 1,
                  cursor: p.soon ? "default" : "pointer",
                }}
              >
                {p.label === "LinkedIn"  && <span style={{ fontSize: 11, fontWeight: 900, background: "#0077b5", color: "#fff", padding: "1px 5px", borderRadius: 3 }}>in</span>}
                {p.label === "Instagram" && <span style={{ fontSize: 10, fontWeight: 900, background: "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)", color: "#fff", padding: "1px 5px", borderRadius: 3 }}>Ig</span>}
                {p.label === "Facebook"  && <span style={{ fontSize: 13, fontWeight: 900, background: "#1877f2", color: "#fff", padding: "1px 6px", borderRadius: 3, fontFamily: "Georgia, serif" }}>f</span>}
                {p.label}
                {p.soon && <span style={{ fontSize: 9, fontWeight: 700, color: "#9aa0b8", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, letterSpacing: 0.5 }}>SOON</span>}
              </a>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section jump nav */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Post Generator", href: "#generator" },
            { label: "Bulk Generator", href: "#bulk" },
            { label: "Scheduled Queue", href: "#queue" },
            { label: "Posted History", href: "#history" },
          ].map(({ label, href }) => (
            <a key={href} href={href} style={{ fontSize: 12, fontWeight: 600, color: "#9aa0b8", padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>

        <div id="generator" style={{ scrollMarginTop: 20 }}>
          <PostGenerator onQueued={refresh} />
        </div>

        <div id="bulk" style={{ scrollMarginTop: 20 }}>
          <BulkGenerator onQueued={refresh} />
        </div>

        <div id="queue" style={{ scrollMarginTop: 20 }}>
          <QueuePanel refresh={refreshTick} />
        </div>

        <div id="history" style={{ scrollMarginTop: 20 }}>
          <HistoryPanel refresh={refreshTick} />
        </div>

      </div>
    </AdminShell>
  );
}
