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

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "bots", label: "Bots" },
  { key: "train", label: "Train" },
];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-saabai-card border border-saabai-border rounded-2xl p-5 ${className}`}>{children}</div>
);

const label = "block text-xs uppercase tracking-wide text-saabai-text-dim mb-1";
const input =
  "w-full bg-saabai-surface border border-saabai-border rounded-lg px-3 py-2 text-sm text-saabai-text outline-none focus:border-saabai-teal";

export default function PortalClient() {
  const [slug, setSlug] = useState("test-tenant");
  const [tab, setTab] = useState<Tab>("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const json = async (r: Response) => {
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`);
    return b;
  };

  const load = useCallback(async () => {
    setMsg("");
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
      setMsg(e.message || "Failed to load");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const saveAgent = async (agent: Partial<Agent>) => {
    setBusy(true); setMsg("");
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
      setMsg(e.message || "Save failed");
    } finally { setBusy(false); }
  };

  const train = async (url: string) => {
    setBusy(true); setMsg("");
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
      setMsg(e.message || "Train failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">AI Agent Portal</h1>
        <p className="text-saabai-text-dim text-sm">Configure, train, and monitor a client&apos;s trained AI agent.</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="text-sm text-saabai-text-dim">Tenant</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className={input + " max-w-xs"} />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-saabai-gold text-black" : "bg-saabai-card border border-saabai-border text-saabai-text"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={load} className="px-4 py-2 rounded-lg text-sm bg-saabai-card border border-saabai-border">
          Refresh
        </button>
      </div>

      {msg && <div className="mb-4 text-sm text-saabai-teal-bright">{msg}</div>}

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><Stat k="Conversations" v={overview?.conversations ?? 0} /></Card>
          <Card><Stat k="Contained %" v={`${overview?.containedRate ?? 0}%`} /></Card>
          <Card><Stat k="Messages" v={overview?.messages ?? 0} /></Card>
          <Card><Stat k="Leads" v={overview?.leads ?? 0} /></Card>
          <Card><Stat k="Cost" v={`$${(overview?.cost ?? 0).toFixed(4)}`} /></Card>
          <Card><Stat k="Chunks" v={overview?.chunks ?? 0} /></Card>
        </div>
      )}

      {tab === "bots" && (
        <div className="space-y-4">
          <BotEditor agents={agents} slug={slug} onSave={saveAgent} busy={busy} />
        </div>
      )}

      {tab === "train" && (
        <div className="space-y-6">
          <TrainForm onTrain={train} busy={busy} />
          <Card>
            <div className="text-sm font-semibold mb-3">Knowledge sources</div>
            {sources.length === 0 && <div className="text-sm text-saabai-text-dim">No sources trained yet.</div>}
            <ul className="space-y-2">
              {sources.map((s) => (
                <li key={s.id} className="flex justify-between text-sm border-b border-saabai-border pb-2">
                  <span className="truncate pr-4">{s.title || s.url}</span>
                  <span className="text-saabai-text-dim">{s.status} · {s.chunk_count ?? 0} chunks</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: any }) => (
  <div>
    <div className="text-2xl font-bold text-saabai-gold-bright">{v}</div>
    <div className="text-xs text-saabai-text-dim uppercase tracking-wide">{k}</div>
  </div>
);

function BotEditor({ agents, slug, onSave, busy }: { agents: Agent[]; slug: string; onSave: (a: Partial<Agent>) => void; busy: boolean }) {
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
    <div className="space-y-4">
      <Card>
        <div className="text-sm font-semibold mb-3">{editing ? "Edit bot" : "Add a bot (persona)"}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className={label}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Sales Agent" /></div>
          <div><label className={label}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
              <option value="cs">Customer Service</option>
              <option value="sales">Sales</option>
              <option value="booking">Booking</option>
              <option value="concierge">Concierge</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className={label}>Greeting</label><input value={greeting} onChange={(e) => setGreeting(e.target.value)} className={input} placeholder="Hi! How can I help?" /></div>
          <div className="md:col-span-2"><label className={label}>System prompt (persona)</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className={input} placeholder="You are a warm, confident sales assistant for this business. Answer from the provided information..." /></div>
        </div>
        <button onClick={add} disabled={busy || !prompt} className="mt-4 px-4 py-2 rounded-lg bg-saabai-gold text-black text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : editing ? "Update bot" : "Create bot"}</button>
      </Card>

      <div>
        {agents.map((a) => (
          <Card key={a.id} className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{a.name}</div>
              <div className="text-xs text-saabai-text-dim">{a.type} · {a.model_tier} · {a.active ? "active" : "inactive"}</div>
              <div className="text-xs text-saabai-text-dim mt-1 truncate max-w-md">{a.system_prompt.slice(0, 90)}…</div>
            </div>
            <button onClick={() => { setEditing(a.id); setName(a.name); setType(a.type); setGreeting(a.greeting || ""); setPrompt(a.system_prompt); }} className="px-3 py-1.5 text-xs rounded-lg border border-saabai-border">Edit</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrainForm({ onTrain, busy }: { onTrain: (url: string) => void; busy: boolean }) {
  const [url, setUrl] = useState("");
  const submit = () => { if (url) onTrain(url); setUrl(""); };
  return (
    <Card>
      <div className="text-sm font-semibold mb-3">Train the agent</div>
      <label className={label}>Website / page URL</label>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} className={input} placeholder="https://yoursite.com/about" />
        <button onClick={submit} disabled={busy || !url} className="px-4 py-2 rounded-lg bg-saabai-gold text-black text-sm font-semibold whitespace-nowrap disabled:opacity-50">{busy ? "Training…" : "Train"}</button>
      </div>
      <p className="text-xs text-saabai-text-dim mt-2">The page is read, chunked, embedded, and used to answer. The raw file is not stored.</p>
    </Card>
  );
}
