"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";

interface Subscriber {
  email: string;
  firstName: string;
  industry: string;
  source: string;
  subscribedAt: string;
  status: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
}

const INDUSTRY_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  "Law / Legal":          { color: "#6366f1", bg: "#eef2ff", dot: "#6366f1" },
  "Accounting / Finance": { color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  "Real Estate":          { color: "#059669", bg: "#ecfdf5", dot: "#10b981" },
  "Other":                { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
};

function getIC(industry: string) {
  return INDUSTRY_CONFIG[industry] ?? INDUSTRY_CONFIG["Other"];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Build daily growth data for the past N days
function buildGrowthData(subs: Subscriber[], days = 30) {
  const counts: Record<string, number> = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    counts[d] = 0;
  }
  subs.forEach(s => {
    const d = s.subscribedAt.slice(0, 10);
    if (counts[d] !== undefined) counts[d]++;
  });
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

function buildIndustryBreakdown(subs: Subscriber[]) {
  const totals: Record<string, number> = {};
  subs.forEach(s => {
    const k = s.industry || "Other";
    totals[k] = (totals[k] ?? 0) + 1;
  });
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: Math.round((count / subs.length) * 100) }));
}

function buildSourceBreakdown(subs: Subscriber[]) {
  const totals: Record<string, number> = {};
  subs.forEach(s => {
    const k = s.source || "/";
    totals[k] = (totals[k] ?? 0) + 1;
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

// Mini bar chart
function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const showEvery = Math.ceil(data.length / 6);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
        {data.map((d, i) => (
          <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div
                title={`${d.date}: ${d.count} subscriber${d.count !== 1 ? "s" : ""}`}
                style={{
                  width: "100%",
                  height: d.count === 0 ? 2 : `${Math.max(4, Math.round((d.count / max) * 80))}px`,
                  background: d.count > 0 ? "linear-gradient(180deg, #00e5cc 0%, #00bfa5 100%)" : "#e5e7eb",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                  cursor: "default",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
            {i % showEvery === 0 && (
              <span style={{ fontSize: 9, color: "#9ca3af", whiteSpace: "nowrap" }}>
                {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "#6b7280" }}>
        {total} new subscriber{total !== 1 ? "s" : ""} in the last {data.length} days
      </p>
    </div>
  );
}

// ── Segment definitions ───────────────────────────────────────────────────────

const SEGMENTS = [
  { label: "All Active",         filter: (s: Subscriber) => s.status !== "unsubscribed" },
  { label: "Law / Legal",        filter: (s: Subscriber) => s.industry === "Law / Legal" },
  { label: "Accounting",         filter: (s: Subscriber) => s.industry === "Accounting / Finance" },
  { label: "Real Estate",        filter: (s: Subscriber) => s.industry === "Real Estate" },
  { label: "This Month",         filter: (s: Subscriber) => Date.now() - new Date(s.subscribedAt).getTime() < 30 * 86400000 },
  { label: "This Week",          filter: (s: Subscriber) => Date.now() - new Date(s.subscribedAt).getTime() < 7 * 86400000 },
  { label: "Australia",          filter: (s: Subscriber) => s.country === "Australia" },
  { label: "Outside Australia",  filter: (s: Subscriber) => !!s.country && s.country !== "Australia" },
];

// ── Broadcast Panel ───────────────────────────────────────────────────────────

function BroadcastPanel({
  recipients,
  allSubs,
  onClose,
  onSelectSegment,
}: {
  recipients: Subscriber[];
  allSubs: Subscriber[];
  onClose: () => void;
  onSelectSegment: (emails: Set<string>) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", fontSize: 13,
    border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
    background: "#fff", color: "#111827", fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  // Personalise preview with first recipient
  const previewSub = recipients[0];
  const previewHtml = body
    .replace(/\{\{firstName\}\}/g, previewSub?.firstName || "there")
    .split("\n").map(l => `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">${l || "&nbsp;"}</p>`).join("");

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/subscribers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: recipients.map(s => s.email),
          subject: subject.trim(),
          html: buildHtml(body),
        }),
      });
      const data = await res.json();
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setConfirmOpen(false);
    } catch {
      setResult({ sent: 0, failed: recipients.length });
    } finally {
      setSending(false);
    }
  }

  function buildHtml(rawBody: string) {
    const paragraphs = rawBody
      .split("\n")
      .map(l => `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.75;">${l || "&nbsp;"}</p>`)
      .join("");
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#0e0c2e;padding:28px 40px;">
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Saabai<span style="color:#00bfa5;">.</span>ai</p>
  </td></tr>
  <tr><td style="padding:36px 40px 28px;">${paragraphs}</td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this as a Saabai subscriber · <a href="https://saabai.ai" style="color:#00bfa5;text-decoration:none;">saabai.ai</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
  }

  const ready = subject.trim().length > 0 && body.trim().length > 0 && recipients.length > 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>

      {/* Panel header */}
      <div style={{ background: "#0e0c2e", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,191,165,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#00bfa5" }}>BC</div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>Broadcast Email</p>
            <p style={{ margin: 0, fontSize: 11, color: "#8b8fa8" }}>
              {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b8fa8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px 6px" }}>×</button>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column" as const, gap: 20 }}>

        {/* Smart segment quick-selectors */}
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const }}>
            Smart Segments — quick select
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {SEGMENTS.map(seg => {
              const matches = allSubs.filter(seg.filter);
              return (
                <button
                  key={seg.label}
                  onClick={() => onSelectSegment(new Set(matches.map(s => s.email)))}
                  style={{
                    padding: "5px 13px", borderRadius: 20,
                    border: "1px solid #e5e7eb", background: "#f9fafb",
                    fontSize: 12, fontWeight: 600, color: "#374151",
                    cursor: matches.length === 0 ? "default" : "pointer",
                    opacity: matches.length === 0 ? 0.4 : 1,
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { if (matches.length) { e.currentTarget.style.background = "#ecfdf5"; e.currentTarget.style.borderColor = "#6ee7b7"; e.currentTarget.style.color = "#059669"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
                >
                  {seg.label} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({matches.length})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipient pills preview */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const }}>
            Recipients ({recipients.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, maxHeight: 72, overflowY: "auto" as const }}>
            {recipients.map(s => (
              <span key={s.email} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0", fontWeight: 500 }}>
                {s.firstName || s.email}
              </span>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const }}>Subject Line</p>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. The AI audit results are in — here's what we found"
            style={inputStyle}
          />
        </div>

        {/* Body */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "#9ca3af", textTransform: "uppercase" as const }}>
              Message Body
            </p>
            <div style={{ display: "flex", gap: 2 }}>
              {["Write", "Preview"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setPreview(tab === "Preview")}
                  style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: "1px solid",
                    borderColor: (tab === "Preview") === preview ? "#0e0c2e" : "#e5e7eb",
                    background: (tab === "Preview") === preview ? "#0e0c2e" : "#fff",
                    color: (tab === "Preview") === preview ? "#fff" : "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {!preview ? (
            <>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={`Hi {{firstName}},\n\nWrite your message here. Each new line becomes a paragraph.\n\nUse {{firstName}} to personalise — it's replaced with each subscriber's first name.\n\nTalk soon,\nShane`}
                rows={10}
                style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.7 }}
              />
              <p style={{ margin: "5px 0 0", fontSize: 10, color: "#d1d5db" }}>
                Use {"{{firstName}}"} for personalisation · Each line becomes a paragraph
              </p>
            </>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", minHeight: 200 }}>
              <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af" }}>Email preview · To: {previewSub?.email ?? "subscriber@example.com"}</span>
              </div>
              <div style={{ padding: "20px 24px", background: "#fff" }}>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{subject || <em style={{ color: "#9ca3af" }}>No subject yet</em>}</p>
                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p style={{ color: "#9ca3af", fontSize: 13 }}>Start typing your message to see a preview.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Result banner */}
        {result && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: result.failed === 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.failed === 0 ? "#bbf7d0" : "#fecaca"}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: result.failed === 0 ? "#059669" : "#dc2626" }}>
              {result.failed === 0
                ? `Sent successfully to ${result.sent} subscriber${result.sent !== 1 ? "s" : ""}`
                : `${result.sent} sent · ${result.failed} failed — check Resend dashboard`}
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
            Sent from <strong style={{ color: "#374151" }}>hello@saabai.ai</strong>
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!ready || sending}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none",
                background: ready && !sending ? "#0e0c2e" : "#e5e7eb",
                color: ready && !sending ? "#fff" : "#9ca3af",
                fontSize: 12, fontWeight: 700, cursor: ready && !sending ? "pointer" : "not-allowed",
                letterSpacing: 0.2,
              }}
            >
              {sending ? "Sending…" : `Send to ${recipients.length}`}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#111827" }}>Confirm broadcast</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              You're about to send <strong style={{ color: "#111827" }}>"{subject}"</strong> to{" "}
              <strong style={{ color: "#111827" }}>{recipients.length} subscriber{recipients.length !== 1 ? "s" : ""}</strong>.
              This cannot be undone.
            </p>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              {SEGMENTS.filter(seg => recipients.every(seg.filter) || recipients.some(seg.filter)).slice(0, 3).map(seg => {
                const n = recipients.filter(seg.filter).length;
                if (!n || n === recipients.length) return null;
                return <p key={seg.label} style={{ margin: "0 0 4px", fontSize: 12, color: "#374151" }}>{n} × {seg.label}</p>;
              })}
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827" }}>{recipients.length} total recipients</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Go back
              </button>
              <button
                onClick={send}
                disabled={sending}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: sending ? "#e5e7eb" : "#059669", color: sending ? "#9ca3af" : "#fff", fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}
              >
                {sending ? "Sending…" : "Confirm send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriberDashboard() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "industry">("date");
  const [exportMsg, setExportMsg] = useState("");
  const [chartDays, setChartDays] = useState(30);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/subscribers")
      .then(r => r.json())
      .then(d => {
        setSubs(d.subscribers ?? []);
        setCount(d.count ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // Derived stats
  const thisWeek = subs.filter(s => {
    const d = new Date(s.subscribedAt);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;

  const thisMonth = subs.filter(s => {
    const d = new Date(s.subscribedAt);
    return Date.now() - d.getTime() < 30 * 86400000;
  }).length;

  const industryBreakdown = buildIndustryBreakdown(subs);
  const sourceBreakdown = buildSourceBreakdown(subs);
  const growthData = buildGrowthData(subs, chartDays);

  // Filtered + sorted list
  const filtered = subs
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.email.toLowerCase().includes(q) || s.firstName.toLowerCase().includes(q);
      const matchIndustry = filterIndustry === "All" || s.industry === filterIndustry;
      return matchSearch && matchIndustry;
    })
    .sort((a, b) => {
      if (sortBy === "date") return b.subscribedAt.localeCompare(a.subscribedAt);
      if (sortBy === "name") return a.firstName.localeCompare(b.firstName);
      return (a.industry || "").localeCompare(b.industry || "");
    });

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.email));
  const someSelected = selected.size > 0;
  const exportTarget = someSelected ? filtered.filter(s => selected.has(s.email)) : filtered;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach(s => next.delete(s.email));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(s => next.add(s.email));
      setSelected(next);
    }
  }

  function toggleRow(email: string) {
    const next = new Set(selected);
    next.has(email) ? next.delete(email) : next.add(email);
    setSelected(next);
  }

  function exportCSV() {
    const rows = [
      ["First Name", "Email", "Industry", "Source", "Country", "City", "IP", "Subscribed At", "Status"],
      ...exportTarget.map(s => [s.firstName, s.email, s.industry, s.source, s.country ?? "", s.city ?? "", s.ip ?? "", fmtDateTime(s.subscribedAt), s.status ?? "active"]),
    ];
    const csv = rows.map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saabai-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`${exportTarget.length} records exported`);
    setTimeout(() => setExportMsg(""), 3000);
  }

  async function deleteSelected() {
    const emails = Array.from(selected);
    if (!emails.length) return;
    const confirmed = confirm(`Permanently delete ${emails.length} subscriber${emails.length !== 1 ? "s" : ""}? This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubs(prev => prev.filter(s => !selected.has(s.email)));
        setCount(prev => prev - (data.deleted ?? 0));
        setSelected(new Set());
      }
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 13px", fontSize: 13, border: "1px solid #e5e7eb",
    borderRadius: 8, outline: "none", background: "#fff", color: "#111827",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  };

  if (loading) {
    return (
      <AdminShell activePath="/saabai-admin/subscribers">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <p style={{ fontSize: 14, color: "#9aa0b8" }}>Loading…</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell activePath="/saabai-admin/subscribers">

      {/* Page header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00bfa5" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#eef0ff" }}>Subscriber Intelligence</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {someSelected && (
              <span style={{ fontSize: 12, color: "#00bfa5", fontWeight: 600 }}>
                {selected.size} selected
              </span>
            )}
            {exportMsg && <span style={{ fontSize: 12, color: "#00bfa5" }}>{exportMsg}</span>}
            {someSelected && (
              <button
                onClick={() => setBroadcastOpen(true)}
                style={{
                  padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: "#00bfa5", border: "none",
                  color: "#0e0c2e", cursor: "pointer", letterSpacing: 0.2,
                }}
              >
                Send Email →
              </button>
            )}
            {someSelected && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                style={{
                  padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", letterSpacing: 0.2,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting…" : `Delete ${selected.size}`}
              </button>
            )}
            <button
              onClick={exportCSV}
              style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: "rgba(0,191,165,0.15)", border: "1px solid rgba(0,191,165,0.3)",
                color: "#00bfa5", cursor: "pointer", letterSpacing: 0.3,
              }}
            >
              ↓ {someSelected ? `Export ${selected.size}` : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 40px" }}>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Subscribers", value: count, sub: "All time", accent: "#00bfa5" },
            { label: "This Month", value: thisMonth, sub: "Last 30 days", accent: "#6366f1" },
            { label: "This Week", value: thisWeek, sub: "Last 7 days", accent: "#f59e0b" },
            { label: "Industries", value: industryBreakdown.length, sub: "Segments tracked", accent: "#10b981" },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{ ...cardStyle, padding: "20px 24px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#9ca3af", textTransform: "uppercase" }}>{label}</p>
              <p style={{ margin: "0 0 4px", fontSize: 36, fontWeight: 900, color: "#111827", letterSpacing: -1.5, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: accent, fontWeight: 600 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Growth chart */}
          <div style={{ ...cardStyle, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Subscriber Growth</p>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>New sign-ups per day</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setChartDays(d)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: chartDays === d ? "#0e0c2e" : "#f3f4f6",
                      color: chartDays === d ? "#fff" : "#6b7280",
                      border: "none", cursor: "pointer",
                    }}
                  >{d}d</button>
                ))}
              </div>
            </div>
            <BarChart data={buildGrowthData(subs, chartDays)} />
          </div>

          {/* Industry breakdown */}
          <div style={{ ...cardStyle, padding: "24px 28px" }}>
            <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Industry Mix</p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9ca3af" }}>Subscriber segments</p>
            {industryBreakdown.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No data yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {industryBreakdown.map(({ name, count: c, pct }) => {
                  const ic = getIC(name);
                  return (
                    <div key={name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ic.dot, display: "inline-block" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{c} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: ic.dot, borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Source breakdown */}
            {sourceBreakdown.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8 }}>Top Sources</p>
                {sourceBreakdown.slice(0, 5).map(([src, n]) => (
                  <div key={src} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{src || "/"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscriber table */}
        <div style={{ ...cardStyle, overflow: "hidden" }}>

          {/* Table header */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#111827" }}>All Subscribers</p>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                {filtered.length} of {subs.length} shown{someSelected ? ` · ${selected.size} selected` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              <input
                placeholder="Search name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, width: 220 }}
              />
              <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="All">All industries</option>
                {Object.keys(INDUSTRY_CONFIG).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as "date" | "name" | "industry")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="date">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="industry">Industry</option>
              </select>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr 200px 130px 160px 160px 100px", padding: "10px 24px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
            {/* Select all checkbox */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                onChange={toggleSelectAll}
                style={{ width: 15, height: 15, accentColor: "#00bfa5", cursor: "pointer" }}
                title={allFilteredSelected ? "Deselect all" : "Select all"}
              />
            </div>
            {["", "Subscriber", "Email", "Industry", "Location", "Joined", "Status"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                {subs.length === 0 ? "No subscribers yet" : "No matches found"}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                {subs.length === 0 ? "The popup is live — subscribers will appear here as they sign up." : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : filtered.map((s, i) => {
            const ic = getIC(s.industry);
            const initials = (s.firstName?.[0] ?? "?").toUpperCase();
            const colours = ["#6366f1", "#00bfa5", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6"];
            const avatarBg = colours[s.email.charCodeAt(0) % colours.length];
            const locationParts = [s.city, s.country].filter(Boolean);
            const locationStr = locationParts.length ? locationParts.join(", ") : null;
            const flagEmoji = s.countryCode
              ? String.fromCodePoint(...[...s.countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
              : null;

            return (
              <div
                key={s.email}
                onClick={() => toggleRow(s.email)}
                style={{
                  display: "grid", gridTemplateColumns: "48px 40px 1fr 200px 130px 160px 160px 100px",
                  padding: "13px 24px", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none",
                  background: selected.has(s.email) ? "#f0fdf9" : i % 2 === 0 ? "#fff" : "#fafafa",
                  transition: "background 0.1s",
                  cursor: "pointer",
                }}
              >
                {/* Checkbox */}
                <div style={{ display: "flex", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.email)}
                    onChange={() => toggleRow(s.email)}
                    style={{ width: 15, height: 15, accentColor: "#00bfa5", cursor: "pointer" }}
                  />
                </div>

                {/* Avatar */}
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
                  {initials}
                </div>

                {/* Name */}
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.firstName || "—"}</p>

                {/* Email */}
                <a href={`mailto:${s.email}`} style={{ margin: 0, fontSize: 12, color: "#6366f1", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {s.email}
                </a>

                {/* Industry */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: ic.bg, color: ic.color, fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: ic.dot }} />
                  {s.industry || "Other"}
                </span>

                {/* Location */}
                <div>
                  {locationStr ? (
                    <p style={{ margin: 0, fontSize: 12, color: "#374151", fontWeight: 500 }}>
                      {flagEmoji && <span style={{ marginRight: 4 }}>{flagEmoji}</span>}
                      {locationStr}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: "#d1d5db" }}>—</p>
                  )}
                  {s.ip && (
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }} title={`IP: ${s.ip}`}>
                      {s.ip}
                    </p>
                  )}
                </div>

                {/* Date */}
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{fmtDate(s.subscribedAt)}</p>

                {/* Status */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "#f0fdf4", color: "#059669", fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                  Active
                </span>
              </div>
            );
          })}
        </div>

        {/* Broadcast Panel */}
        {broadcastOpen && (
          <div style={{ marginTop: 24 }}>
            <BroadcastPanel
              recipients={subs.filter(s => selected.has(s.email))}
              allSubs={subs}
              onClose={() => setBroadcastOpen(false)}
              onSelectSegment={(emails) => { setSelected(emails); }}
            />
          </div>
        )}

      </div>
    </AdminShell>
  );
}
