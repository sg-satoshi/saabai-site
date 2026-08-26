"use client";

import { useState, useCallback, useEffect } from "react";

type Tab = "overview" | "bots" | "train";

interface Agent {
  id: string;
  name: string;
  type: string;
  greeting?: string | null;
  system_prompt: string;
  model_tier?: string | null;
  active: boolean;
}

// Admin light theme palette (matches the /saabai-admin content pages).
const C = {
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  teal: "#0891b2",
  tealBg: "rgba(8,145,178,0.08)",
  text: "#111827",
  textDim: "#6b7280",
  muted: "#9ca3af",
};

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "bots", label: "Bots" },
  { key: "train", label: "Train" },
];

const Card = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  }}>{children}</div>
);

const cardStyle: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
  padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: C.textDim, marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", fontSize: 14, color: C.text, outline: "none",
};

export default function PortalClient() {
  const [slug, setSlug] = useState("test-tenant");
  const [tab, setTab] = useState<Tab>("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const json = async (r: Response) => {
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`);
    return b;
  };

  const load = useCallback(async () => {
    setErr("");
    try {
      const [a, o, s] = await Promise.all([
        fetch(`/api/ai-agent/agents?slug=${slug}`, { credentials: "same-origin" }).then(json),
        fetch(`/api/ai-agent/overview?slug=${slug}`, { credentials: "same-origin" }).then(json),
        fetch(`/api/ai-agent/ingest?slug=${slug}`, { credentials: "same-origin" }).then(json).catch(() => ({ sources: [] })),
      ]);
      setAgents(a.agents ?? []);
      setOverview(o);
      setSources(s.sources ?? []);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const saveAgent = async (agent: Partial<Agent>) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const body: any = { slug, ...agent };
      if (agent.id) body.id = agent.id;
      const r = await fetch("/api/ai-agent/agents", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(json);
      setMsg(`Saved "${r.agent?.name ?? "agent"}".`);
      await load();
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally { setBusy(false); }
  };

  const train = async (url: string) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await fetch("/api/ai-agent/ingest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, url, title: url.split("/").pop() }),
      }).then(json);
      setMsg(`Trained: ${r.chunks} chunks.`);
      await load();
    } catch (e: any) {
      setErr(e.message || "Train failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: "28px 30px", maxWidth: 1080 }}>
      <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>AI Agent Portal</h1>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: C.textDim }}>Configure, train, and monitor a client&apos;s trained AI agent.</p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>Tenant</span>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...inputStyle, width: 220 }} />
        <div style={{ display: "flex", gap: 6, marginLeft: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "7px 15px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `1px solid ${tab === t.key ? "transparent" : C.border}`,
                background: tab === t.key ? C.teal : "#fff", color: tab === t.key ? "#fff" : C.text,
                cursor: "pointer", transition: "all 0.12s ease",
              }}
            >
              {t.label}
            </button>
          ))}
          <button onClick={load} style={{ padding: "7px 15px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${C.border}`, background: "#fff", color: C.text, cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      {msg && <div style={{ padding: "9px 14px", marginBottom: 14, borderRadius: 8, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)", fontSize: 13, color: "#16a34a" }}>{msg}</div>}
      {err && <div style={{ padding: "9px 14px", marginBottom: 14, borderRadius: 8, background: "rgba(220,38,26,0.08)", border: "1px solid rgba(220,38,26,0.25)", fontSize: 13, color: "#dc2626" }}>{err}</div>}

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Card><Stat k="Conversations" v={overview?.conversations ?? 0} /></Card>
          <Card><Stat k="Contained %" v={`${overview?.containedRate ?? 0}%`} /></Card>
          <Card><Stat k="Messages" v={overview?.messages ?? 0} /></Card>
          <Card><Stat k="Leads" v={overview?.leads ?? 0} /></Card>
          <Card><Stat k="Cost" v={`$${(overview?.cost ?? 0).toFixed(4)}`} /></Card>
          <Card><Stat k="Chunks" v={overview?.chunks ?? 0} /></Card>
        </div>
      )}

      {tab === "bots" && <BotEditor agents={agents} onSave={saveAgent} busy={busy} />}

      {tab === "train" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TrainForm onTrain={train} busy={busy} />
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Knowledge sources</div>
            {sources.length === 0 && <div style={{ fontSize: 13, color: C.textDim }}>No sources trained yet.</div>}
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {sources.map((s) => (
                <li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.title || s.url) as string}</span>
                  <span style={{ color: C.textDim, flexShrink: 0 }}>{s.status} · {s.chunk_count ?? 0} chunks</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: any }) => (
  <div>
    <div style={{ fontSize: 24, fontWeight: 800, color: C.teal, letterSpacing: "-0.5px" }}>{v}</div>
    <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{k}</div>
  </div>
);

function BotEditor({ agents, onSave, busy }: { agents: Agent[]; onSave: (a: Partial<Agent>) => void; busy: boolean }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("cs");
  const [greeting, setGreeting] = useState("");
  const [prompt, setPrompt] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const add = () => {
    onSave({ id: editing ?? undefined, name: name || "Agent", type, greeting, system_prompt: prompt });
    setName(""); setGreeting(""); setPrompt(""); setEditing(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>{editing ? "Edit bot" : "Add a bot (persona)"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={labelStyle}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. Sales Agent" /></div>
          <div><label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="cs">Customer Service</option>
              <option value="sales">Sales</option>
              <option value="booking">Booking</option>
              <option value="concierge">Concierge</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Greeting</label><input value={greeting} onChange={(e) => setGreeting(e.target.value)} style={inputStyle} placeholder="Hi! How can I help?" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>System prompt (persona)</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="You are a warm, confident sales assistant..." /></div>
        </div>
        <button onClick={add} disabled={busy || !prompt} style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", disabled: busy ? "opacity:0.5" : undefined } as any}>
          {busy ? "Saving…" : editing ? "Update bot" : "Create bot"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {agents.map((a) => (
          <div key={a.id} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{a.name}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{a.type} · {a.model_tier} · {a.active ? "active" : "inactive"}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 460 }}>{a.system_prompt.slice(0, 90)}…</div>
            </div>
            <button onClick={() => { setEditing(a.id); setName(a.name); setType(a.type); setGreeting(a.greeting || ""); setPrompt(a.system_prompt); }} style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainForm({ onTrain, busy }: { onTrain: (url: string) => void; busy: boolean }) {
  const [url, setUrl] = useState("");
  const submit = () => { if (url) onTrain(url); setUrl(""); };
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Train the agent</div>
      <label style={labelStyle}>Website / page URL</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} placeholder="https://yoursite.com/about" />
        <button onClick={submit} disabled={busy || !url} style={{ padding: "0 18px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: busy || !url ? 0.5 : 1 }}>
          {busy ? "Training…" : "Train"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: C.textDim, margin: "8px 0 0" }}>The page is read, chunked, embedded, and used to answer. The raw file is not stored.</p>
    </div>
  );
}
