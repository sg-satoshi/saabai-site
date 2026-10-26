"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRIORITIES, RM_AREAS, STATUSES, STATUS_LABEL, filterView, type RoadmapPriority, type RoadmapStatus, type RoadmapView } from "../../../lib/roadmap-core";

const COLORS: Record<RoadmapStatus, { bg: string; fg: string }> = {
  planned: { bg: "#eaf1ff", fg: "#2954b8" },
  in_progress: { bg: "#fff3dc", fg: "#9a5b00" },
  in_review: { bg: "#e7f4fb", fg: "#0b5f8a" },
  blocked: { bg: "#fdecea", fg: "#b3261e" },
  shipped: { bg: "#e6f6ec", fg: "#17703a" },
  deployed: { bg: "#d9f2e3", fg: "#0d5a2c" },
  idea: { bg: "#f1ebfb", fg: "#6c3fb0" },
};
const ORDER: RoadmapStatus[] = ["in_review", "in_progress", "blocked", "planned", "idea", "shipped", "deployed"];
const REPO_WEB = "https://github.com/sg-satoshi/saabai-site";
const input: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", fontSize: 13, background: "#fff" };
const btn: React.CSSProperties = { padding: "7px 12px", borderRadius: 8, border: "1px solid #b9e4ea", background: "#edf8f9", color: "#0e7482", fontWeight: 600, fontSize: 12, cursor: "pointer" };

interface Draft { id?: string; title: string; description: string; status: RoadmapStatus; area: string; target: string; priority: string; prNumber: string; issueNumber: string }
const blank: Draft = { title: "", description: "", status: "planned", area: "Other", target: "", priority: "", prNumber: "", issueNumber: "" };

function ago(iso: string) {
  const d = Math.max(0, Date.now() - Date.parse(iso));
  const days = Math.floor(d / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" });
}

export default function RoadmapClient() {
  const [items, setItems] = useState<RoadmapView[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [gh, setGh] = useState<{ ok: boolean; error?: string; deployedAt?: string | null; fetchedAt?: string | null }>({ ok: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roadmap", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setItems(data.items); setCanWrite(!!data.canWrite); setGh(data.github || { ok: true }); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const areas = useMemo(() => Array.from(new Set<string>([...RM_AREAS, ...items.map((i) => i.area)])), [items]);
  const shown = useMemo(() => filterView(items, { q, status, area }), [items, q, status, area]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])) as Record<RoadmapStatus, number>, [items]);

  async function call(method: string, body: object) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/roadmap", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      await load();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; } finally { setBusy(false); }
  }

  async function save() {
    if (!draft) return;
    const data = { title: draft.title, description: draft.description, status: draft.status, area: draft.area, target: draft.target, priority: draft.priority, prNumber: draft.prNumber, issueNumber: draft.issueNumber };
    const ok = draft.id ? await call("PATCH", { id: draft.id, data }) : await call("POST", { data });
    if (ok) setDraft(null);
  }

  const edit = (i: RoadmapView) => setDraft({ id: i.id, title: i.title, description: i.description, status: i.status, area: i.area, target: i.target ?? "", priority: i.priority ?? "", prNumber: i.prNumber ? String(i.prNumber) : "", issueNumber: i.issueNumber ? String(i.issueNumber) : "" });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Roadmap</h1>
          <p style={{ margin: gh.ok && gh.fetchedAt ? "0 0 6px" : "0 0 16px", fontSize: 13, color: "#5f6580" }}>Open issues and pull requests come from GitHub, grouped by their status labels. Link an item to an issue or PR and the status follows it. A merged PR or a closed issue stays Done.</p>
          {gh.ok && gh.fetchedAt && <p style={{ margin: "0 0 16px", fontSize: 12, color: "#8a8fa6" }}>GitHub checked {ago(gh.fetchedAt)}.</p>}
        </div>
        {canWrite && <button type="button" style={{ ...btn, background: "#0e7482", color: "#fff" }} onClick={() => setDraft({ ...blank })}>Add item</button>}
      </div>

      {!gh.ok && <p role="status" style={{ background: "#fff6e0", border: "1px solid #f0d890", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#7a5600" }}>GitHub is unavailable. Open issues, open pull requests and merged status are not listed. Manual items stay as they were saved.</p>}
      {gh.ok && gh.deployedAt === null && <p style={{ fontSize: 12, color: "#8a8fa6", margin: "0 0 10px" }}>Production deploy state unknown right now, so merged PRs show as Shipped.</p>}
      {error && <p role="alert" style={{ color: "#c2261d", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input aria-label="Search roadmap" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, notes, area, issue or PR number" style={{ ...input, flex: "1 1 240px" }} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} ({counts[s]})</option>)}
        </select>
        <select aria-label="Filter by area" value={area} onChange={(e) => setArea(e.target.value)} style={input}>
          <option value="all">All areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: "#5f6580", fontSize: 13 }}>Loading…</p> : shown.length === 0 ? <p style={{ color: "#5f6580", fontSize: 13 }}>Nothing matches.</p> : (
        ORDER.map((s) => {
          const group = shown.filter((i) => i.status === s);
          if (!group.length) return null;
          const collapsed = (s === "shipped" || s === "deployed") && status === "all" && !q;
          return (
            <details key={s} open={!collapsed} style={{ marginBottom: 16 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, margin: "6px 0 8px" }}>{STATUS_LABEL[s]} <span style={{ color: "#8a8fa6", fontWeight: 500 }}>({group.length})</span></summary>
              <div style={{ display: "grid", gap: 8 }}>
                {group.map((i, idx) => (
                  <div key={i.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ background: COLORS[i.status].bg, color: COLORS[i.status].fg, borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{STATUS_LABEL[i.status]}</span>
                        <strong style={{ fontSize: 14 }}>{i.title}</strong>
                      </div>
                      {i.description && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#454a63" }}>{i.description}</p>}
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#8a8fa6" }}>
                        {i.area}
                        {i.target ? ` · target ${i.target}` : ""}
                        {i.priority ? ` · ${i.priority} priority` : ""}
                        {i.issueNumber ? <> · <a href={i.issueUrl || `${REPO_WEB}/issues/${i.issueNumber}`} target="_blank" rel="noreferrer">Issue #{i.issueNumber}</a></> : ""}
                        {i.prNumber ? <> · <a href={i.prUrl || `${REPO_WEB}/pull/${i.prNumber}`} target="_blank" rel="noreferrer">PR #{i.prNumber}</a></> : ""}
                        {` · ${i.source === "github" ? "merged" : "updated"} ${ago(i.mergedAt || i.updatedAt)}`}
                      </p>
                    </div>
                    {canWrite && i.source === "manual" && (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <button type="button" aria-label="Move up" disabled={busy || idx === 0} style={btn} onClick={() => call("PATCH", { id: i.id, action: "move", dir: "up" })}>↑</button>
                        <button type="button" aria-label="Move down" disabled={busy || idx === group.length - 1} style={btn} onClick={() => call("PATCH", { id: i.id, action: "move", dir: "down" })}>↓</button>
                        <button type="button" style={btn} onClick={() => edit(i)}>Edit</button>
                        <button type="button" style={{ ...btn, borderColor: "#f0c4c0", background: "#fdf0ef", color: "#b3261e" }} onClick={() => { if (confirm(`Delete "${i.title}"?`)) call("DELETE", { id: i.id }); }}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })
      )}

      {draft && (
        <div role="dialog" aria-label={draft.id ? "Edit roadmap item" : "Add roadmap item"} style={{ position: "fixed", inset: 0, background: "rgba(10,15,30,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 50 }} onClick={() => setDraft(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }} style={{ background: "#fff", width: "min(440px, 100%)", padding: 20, display: "grid", gap: 10, alignContent: "start", overflowY: "auto" }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>{draft.id ? "Edit item" : "Add item"}</h2>
            <label style={{ fontSize: 12 }}>Title<input required minLength={2} maxLength={140} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></label>
            <label style={{ fontSize: 12 }}>Description<textarea rows={4} maxLength={1200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></label>
            <label style={{ fontSize: 12 }}>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as RoadmapStatus })} style={{ ...input, width: "100%" }}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
            <label style={{ fontSize: 12 }}>Area<select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={{ ...input, width: "100%" }}>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
            <label style={{ fontSize: 12 }}>Target (for example Nov 2026)<input maxLength={40} value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></label>
            <label style={{ fontSize: 12 }}>Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as RoadmapPriority | "" })} style={{ ...input, width: "100%" }}><option value="">None</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label style={{ fontSize: 12 }}>Issue number (a closed issue marks this Done)<input inputMode="numeric" value={draft.issueNumber} onChange={(e) => setDraft({ ...draft, issueNumber: e.target.value.replace(/\D/g, "") })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></label>
            <label style={{ fontSize: 12 }}>PR number (a merged PR marks this Done)<input inputMode="numeric" value={draft.prNumber} onChange={(e) => setDraft({ ...draft, prNumber: e.target.value.replace(/\D/g, "") })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></label>
            {(draft.issueNumber || draft.prNumber) && <p style={{ margin: 0, fontSize: 12, color: "#5f6580" }}>While GitHub is available, this link sets the status. The saved status is only the fallback.</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={busy} style={{ ...btn, background: "#0e7482", color: "#fff" }}>{busy ? "Saving…" : "Save"}</button>
              <button type="button" style={btn} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
