"use client";

import { useState, useEffect } from "react";

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
  { value: "Insight",       label: "💡 Insight",        hint: "Observation from client work" },
  { value: "Myth-Bust",     label: "🚫 Myth-Bust",      hint: "Challenge a common belief" },
  { value: "Before/After",  label: "📊 Before/After",   hint: "Client result story" },
  { value: "Process",       label: "🔧 Process",        hint: "Step-by-step breakdown" },
  { value: "Advisory",      label: "🏛 Advisory",       hint: "Board/executive positioning" },
  { value: "News-Reactive", label: "📰 News-Reactive",  hint: "Respond to AI news/trend" },
];

const SUGGESTED_TOPICS: Record<string, string[]> = {
  "Insight": [
    "The real cost of after-hours enquiries going unanswered",
    "Why small firms automate faster than large ones",
    "What 10 hours a week recovered actually means financially",
    "The one question to ask before any AI project",
    "Why the first automation should be boring, not glamorous",
  ],
  "Myth-Bust": [
    "\"We tried AI before and it didn't work\"",
    "\"We need to hire an AI person first\"",
    "\"We're not ready for AI yet\"",
    "\"AI will replace our staff\"",
    "\"We'll start next quarter when things are quieter\"",
  ],
  "Before/After": [
    "Law firm intake: 9% → 28% conversion after AI agent",
    "Quotes dropping from 22 minutes to 90 seconds",
    "Document chasing: 12 hours/month → fully automated",
    "Property maintenance turnaround: 4 days → 18 hours",
    "Accounting firm client onboarding overhaul",
  ],
  "Process": [
    "What an intake audit actually looks like step by step",
    "The 3-week timeline from discovery to live system",
    "How to fix the CRM/email/spreadsheet triangle",
    "The copy-paste problem and how to solve it",
    "How to qualify leads without turning people away",
  ],
  "Advisory": [
    "What boards are getting wrong about AI investment",
    "The difference between an AI strategy and an experiment budget",
    "How to spot an AI vendor selling snake oil",
    "What a non-executive AI director actually does",
    "The question every board should be asking about AI",
  ],
  "News-Reactive": [
    "AI agents are now mainstream — what that means for SMEs",
    "The Australian productivity gap and AI",
    "Why 2026 is the year professional services firms can't wait",
    "What the latest AI model releases mean for your business",
    "How AI is reshaping the professional services landscape in Australia",
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
  const [publishing, setPublishing] = useState(false);
  const [pubStatus, setPubStatus] = useState<"idle" | "done" | "error">("idle");
  const [genError, setGenError] = useState("");

  const charCount = generated.length;
  const over = charCount > 3000;

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
          body: JSON.stringify({ content: generated }),
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
      } else {
        // Queue to Redis
        const res = await fetch("/api/linkedin/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: generated, scheduledFor: scheduleDate }),
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

  return (
    <div style={{ ...card, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✍️</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: -0.4 }}>LinkedIn Post Generator</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>AI-powered · Shane's voice · Instant or scheduled</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Left — inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Format selector */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>Post Format</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFormat(f.value); setTopic(""); }}
                  style={{
                    padding: "10px 8px", borderRadius: 10, border: "1.5px solid",
                    borderColor: format === f.value ? "#0077b5" : "#e5e7eb",
                    background: format === f.value ? "#eff8ff" : "#fff",
                    cursor: "pointer", textAlign: "left" as const,
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: format === f.value ? "#0077b5" : "#111827" }}>{f.label}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", lineHeight: 1.3 }}>{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested topics */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>Suggested Topics</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(SUGGESTED_TOPICS[format] ?? []).map(t => (
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
          </div>

          {/* Custom topic */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>Topic / Angle</p>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Type your own topic or paste a news headline…"
              style={{ ...inputStyle }}
            />
          </div>

          {/* Additional notes */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" }}>Notes / Context <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add specific stats, client details, or angles you want included…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" as const }}
            />
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
            {generating ? "Generating…" : "✨ Generate Post"}
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
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {m === "now" ? "⚡ Post now" : "🗓 Schedule"}
                  </button>
                ))}
              </div>

              {scheduleMode === "schedule" && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "#6b7280" }}>Date (posts at 9:00am AEST)</p>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={todayAEST()}
                    onChange={e => setScheduleDate(e.target.value)}
                    style={{ ...inputStyle, width: "auto" }}
                  />
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
                  letterSpacing: 0.3,
                }}
              >
                {publishing ? "Publishing…" : scheduleMode === "now" ? "⚡ Post to LinkedIn now" : `🗓 Schedule for ${scheduleDate}`}
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
    await fetch("/api/linkedin/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: post.content }) });
    await fetch("/api/linkedin/queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id }) });
    setViewingPost(null);
    load();
  }

  async function cancelPost(id: string) {
    if (!confirm("Remove this post from the queue?")) return;
    await fetch("/api/linkedin/queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
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
    { label: "LinkedIn", href: "/saabai-admin/social/linkedin", active: true },
    { label: "Instagram", href: "#", active: false, soon: true },
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
                  borderBottom: p.active ? "2px solid #0077b5" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: p.soon ? 0.5 : 1,
                  cursor: p.soon ? "default" : "pointer",
                }}
              >
                {p.label === "LinkedIn" && <span style={{ fontSize: 12, fontWeight: 900, background: "#0077b5", color: "#fff", padding: "1px 5px", borderRadius: 4 }}>in</span>}
                {p.label}
                {p.soon && <span style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, letterSpacing: 0.5 }}>SOON</span>}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section jump nav */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Post Generator", href: "#generator" },
            { label: "Scheduled Queue", href: "#queue" },
            { label: "Posted History", href: "#history" },
          ].map(({ label, href }) => (
            <a key={href} href={href} style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", padding: "6px 14px", borderRadius: 20, background: "#fff", border: "1px solid #e5e7eb", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>

        <div id="generator" style={{ scrollMarginTop: 20 }}>
          <PostGenerator onQueued={refresh} />
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
