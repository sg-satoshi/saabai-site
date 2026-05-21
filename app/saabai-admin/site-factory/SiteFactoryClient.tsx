"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Site {
  id: string;
  slug: string;
  name: string;
  niche: string;
  status: string;
  url: string;
  createdAt: number;
  domains?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
  imageUrl?: string;
  htmlSnapshot?: string;
  suggestions?: string[];
}

type Phase = "list" | "new" | "generating" | "editing";
type Device = "desktop" | "tablet" | "mobile";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const C = {
  bg: "#080d11",
  surface: "#0f1923",
  surface2: "#162130",
  border: "#1a2535",
  border2: "#243040",
  text: "#e2dfd8",
  textDim: "#6b7e94",
  textMuted: "#3d5168",
  gold: "#c9a227",
  goldBg: "rgba(201,162,39,0.1)",
  teal: "#0f9d8e",
  tealBg: "rgba(15,157,142,0.1)",
  tealDk: "#0c8077",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.1)",
};

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const NICHES = [
  { value: "trades", label: "Trades" },
  { value: "allied-health", label: "Allied Health" },
  { value: "professional-services", label: "Professional Services" },
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "other", label: "Other" },
];

const STYLES = ["modern", "classic", "minimal", "bold"];

function storeMsgs(slug: string, msgs: Message[]) {
  try {
    // Store without htmlSnapshot (too large) — restore buttons only work within session
    const slim = msgs.map(({ htmlSnapshot: _snap, ...m }) => m);
    localStorage.setItem(`sf:msgs:${slug}`, JSON.stringify(slim.slice(-60)));
  } catch { /* storage full */ }
}

function loadMsgs(slug: string): Message[] {
  try {
    const raw = localStorage.getItem(`sf:msgs:${slug}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const EDIT_STAGES = [
  "Thinking through your request...",
  "Reading the current design...",
  "Planning the changes...",
  "Applying edits...",
  "Saving the updated site...",
];

export default function SiteFactoryClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [phase, setPhase] = useState<Phase>("list");
  const [isMobile, setIsMobile] = useState(false);

  // Editor state
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instruction, setInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [showDns, setShowDns] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [versionIdx, setVersionIdx] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Upload + drag state
  const [pendingImage, setPendingImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DNS state
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<{ ok: boolean; domain: string; instructions: { type: string; name: string; value: string; note: string }[]; vercelConnected: boolean; vercelError?: string } | null>(null);

  // Generation state
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("trades");
  const [location, setLocation] = useState("Australia");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState("modern");
  const [description, setDescription] = useState("");
  const [genCharCount, setGenCharCount] = useState(0);
  const [streamedHtml, setStreamedHtml] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveHtmlRef = useRef("");
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const versions = useRef<string[]>([]);

  useEffect(() => {
    fetchSites();
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchSites() {
    setLoadingSites(true);
    try {
      const res = await fetch("/api/site-factory/list");
      const data = await res.json();
      if (data.sites) setSites(data.sites);
    } catch { console.error("Failed to fetch sites"); }
    setLoadingSites(false);
  }

  async function fetchDomains(slug: string) {
    try {
      const res = await fetch(`/api/site-factory/domain?slug=${slug}`);
      const data = await res.json();
      setDomains(data.domains || []);
    } catch { /* ignore */ }
  }

  function openEditor(site: Site) {
    setActiveSite(site);
    const saved = loadMsgs(site.slug);
    const initial: Message[] = saved.length > 0
      ? saved
      : [{ role: "assistant", content: `Site loaded. What would you like to change on **${site.name}**?`, ts: Date.now() }];
    setMessages(initial);
    setPreviewHtml("");
    versions.current = [];
    setVersionIdx(-1);
    setPendingImage(null);
    fetchDomains(site.slug);

    fetch(`/sites/${site.slug}`)
      .then(r => r.text())
      .then(html => { setPreviewHtml(html); versions.current = [html]; })
      .catch(() => {});

    setPhase("editing");
    // On mobile: keep sidebar closed so preview is visible first
    if (isMobile) setSidebarOpen(false);
  }

  async function uploadFile(file: File) {
    if (!activeSite) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSite.slug);
      const res = await fetch("/api/site-factory/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setPendingImage({ url: data.url, name: file.name });
      } else {
        alert("Upload failed: " + (data.error || "unknown"));
      }
    } catch (e) { alert("Upload error: " + String(e)); }
    setUploading(false);
  }

  async function sendEdit() {
    const text = instruction.trim();
    if ((!text && !pendingImage) || !activeSite || isEditing) return;

    const imageUrl = pendingImage?.url;
    const displayContent = text || `[Image: ${pendingImage?.name}]`;

    const userMsg: Message = { role: "user", content: displayContent, ts: Date.now(), imageUrl };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInstruction("");
    setPendingImage(null);
    setIsEditing(true);

    const assistantMsg: Message = { role: "assistant", content: EDIT_STAGES[0], ts: Date.now() };
    const withAssistant = [...nextMsgs, assistantMsg];
    setMessages(withAssistant);

    // Cycle through human-readable stage messages while Claude works
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, EDIT_STAGES.length - 1);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.htmlSnapshot) {
          updated[updated.length - 1] = { ...last, content: EDIT_STAGES[stageIdx] };
        }
        return updated;
      });
    }, 4000);

    try {
      const res = await fetch("/api/site-factory/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, instruction: text || "Apply the uploaded image to the site (use as logo or reference design)", imageUrl }),
      });

      clearInterval(stageTimer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const newHtml = await res.text();

      versions.current = [...versions.current.slice(0, versionIdx === -1 ? versions.current.length : versionIdx + 1), newHtml];
      setVersionIdx(-1);
      setPreviewHtml(newHtml);
      setIframeKey(k => k + 1);

      const doneMsg = { ...withAssistant[withAssistant.length - 1], content: `Done — "${displayContent.slice(0, 60)}${displayContent.length > 60 ? "…" : ""}"`, htmlSnapshot: newHtml };
      const finalMsgs = [...withAssistant.slice(0, -1), doneMsg];
      setMessages(finalMsgs);
      storeMsgs(activeSite.slug, finalMsgs);

      if (isMobile) setSidebarOpen(false);

      // Fetch suggestion chips in the background
      fetch("/api/site-factory/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastInstruction: text, siteName: activeSite.name, niche: activeSite.niche, history: finalMsgs }),
      }).then(r => r.json()).then(({ suggestions }) => {
        if (!Array.isArray(suggestions) || suggestions.length === 0) return;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.htmlSnapshot === newHtml) {
            updated[updated.length - 1] = { ...last, suggestions };
            storeMsgs(activeSite.slug, updated);
          }
          return updated;
        });
      }).catch(() => {});
    } catch (e) {
      clearInterval(stageTimer);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `${String(e)}` };
        return updated;
      });
    }
    setIsEditing(false);
  }

  function restoreVersion(html: string, idx: number) {
    setPreviewHtml(html);
    setVersionIdx(idx);
    setIframeKey(k => k + 1);
  }

  function undoLast() {
    const v = versions.current;
    const target = versionIdx === -1 ? v.length - 2 : versionIdx - 1;
    if (target >= 0) restoreVersion(v[target], target);
  }

  const startPreviewUpdater = useCallback(() => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    previewTimerRef.current = setInterval(() => {
      if (liveHtmlRef.current) setStreamedHtml(liveHtmlRef.current);
    }, 700);
  }, []);

  const stopPreviewUpdater = useCallback(() => {
    if (previewTimerRef.current) { clearInterval(previewTimerRef.current); previewTimerRef.current = null; }
  }, []);

  async function generateSite() {
    if (!businessName.trim()) return;
    setPhase("generating");
    setGenCharCount(0);
    setStreamedHtml("");
    liveHtmlRef.current = "";
    startPreviewUpdater();
    const slug = slugify(businessName.trim());

    try {
      const res = await fetch("/api/site-factory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(), niche, location,
          services: services.split(",").map(s => s.trim()).filter(Boolean),
          phone, email, address, style, description: description.trim(),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        liveHtmlRef.current = html;
        setGenCharCount(html.length);
      }

      stopPreviewUpdater();
      setStreamedHtml(html);
      await fetchSites();
      const fakeSite: Site = { id: `site_${Date.now()}`, slug, name: businessName.trim(), niche, status: "live", url: `https://www.saabai.ai/sites/${slug}/`, createdAt: Date.now() };
      setTimeout(() => openEditor(fakeSite), 800);
    } catch (e) {
      stopPreviewUpdater();
      alert("Error: " + String(e));
      setPhase("list");
    }
  }

  async function addDomain() {
    if (!newDomain.trim() || !activeSite) return;
    setDnsLoading(true);
    setDnsResult(null);
    try {
      const res = await fetch("/api/site-factory/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, domain: newDomain.trim() }),
      });
      const data = await res.json();
      setDnsResult(data);
      if (data.ok) { setDomains(prev => prev.includes(data.domain) ? prev : [...prev, data.domain]); setNewDomain(""); }
    } catch (e) { alert(String(e)); }
    setDnsLoading(false);
  }

  async function removeDomain(domain: string) {
    if (!activeSite) return;
    await fetch("/api/site-factory/domain", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: activeSite.slug, domain }) });
    setDomains(prev => prev.filter(d => d !== domain));
  }

  const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: "100%", padding: "9px 13px", borderRadius: 7,
    border: `1px solid ${C.border2}`, background: C.bg, color: C.text,
    fontSize: 13, outline: "none", boxSizing: "border-box", ...extra,
  });

  const lbl = (t: string) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 5, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t}</label>
  );

  // ─── GENERATING ──────────────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1.4s ease-in-out infinite" }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Generating {businessName}...</span>
          <span style={{ fontSize: 12, color: C.textDim, fontVariantNumeric: "tabular-nums" }}>{(genCharCount / 1000).toFixed(1)}k chars</span>
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {streamedHtml ? (
            <iframe srcDoc={streamedHtml} style={{ width: "100%", height: "100%", border: "none" }} title="Preview" sandbox="allow-scripts allow-same-origin" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20, color: C.textDim }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${C.border2}`, borderTopColor: C.gold, animation: "spin 0.9s linear infinite" }} />
              <p style={{ margin: 0, fontSize: 14, color: C.text }}>Building your site — preview loads shortly</p>
            </div>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  // ─── EDITING ─────────────────────────────────────────────────────────
  if (phase === "editing" && activeSite) {
    const canUndo = versions.current.length > 1 && (versionIdx === -1 ? versions.current.length - 1 : versionIdx) > 0;
    const liveUrl = `https://www.saabai.ai/sites/${activeSite.slug}/`;

    const sidebarWidth = isMobile ? "100%" : "320px";

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
        />

        {/* Top bar */}
        <div style={{ padding: isMobile ? "8px 12px" : "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, flexShrink: 0, background: C.surface }}>
          <button onClick={() => { setPhase("list"); fetchSites(); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Back">←</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>{activeSite.name}</span>
            {!isMobile && <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8, fontFamily: "monospace" }}>/sites/{activeSite.slug}/</span>}
          </div>

          {/* Panel toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Hide chat panel" : "Show chat panel"}
            style={{ padding: isMobile ? "8px 14px" : "6px 14px", borderRadius: 6, border: `1.5px solid ${sidebarOpen ? C.teal : C.gold}`, background: sidebarOpen ? C.tealBg : C.goldBg, color: sidebarOpen ? C.teal : C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
          >
            <span style={{ fontSize: 14 }}>{sidebarOpen ? "◀" : "▶"}</span>
            <span>{sidebarOpen ? "Hide" : "Chat"}</span>
          </button>

          {/* Device toggles — hidden on mobile */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 4, border: `1px solid ${C.border2}`, borderRadius: 7, padding: 3 }}>
              {(["desktop", "tablet", "mobile"] as Device[]).map(d => (
                <button key={d} onClick={() => setDevice(d)} title={d} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: device === d ? C.surface2 : "none", color: device === d ? C.text : C.textDim, fontSize: 11, cursor: "pointer", fontWeight: device === d ? 600 : 400 }}>
                  {d === "desktop" ? "⬛ Desktop" : d === "tablet" ? "▪ Tablet" : "▫ Mobile"}
                </button>
              ))}
            </div>
          )}

          {!isMobile && <button onClick={canUndo ? undoLast : undefined} disabled={!canUndo} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: canUndo ? C.textDim : C.textMuted, fontSize: 12, cursor: canUndo ? "pointer" : "default" }}>Undo</button>}
          {!isMobile && <button onClick={() => setShowDns(!showDns)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${showDns ? C.teal : C.border2}`, background: showDns ? C.tealBg : "none", color: showDns ? C.teal : C.textDim, fontSize: 12, cursor: "pointer" }}>DNS</button>}
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: isMobile ? "6px 10px" : "5px 14px", borderRadius: 6, background: C.teal, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>↗</a>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── Sidebar (Chat + DNS) ─────────────────────────────── */}
          {sidebarOpen && (
            <div style={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: isMobile ? "none" : `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              background: C.surface,
              overflow: "hidden",
              ...(isMobile ? { position: "absolute", inset: 0, zIndex: 50 } : {}),
            }}>

              {/* Mobile: DNS + Undo controls inside sidebar */}
              {isMobile && (
                <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <button onClick={canUndo ? undoLast : undefined} disabled={!canUndo} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: canUndo ? C.textDim : C.textMuted, fontSize: 12, cursor: canUndo ? "pointer" : "default" }}>Undo</button>
                  <button onClick={() => setShowDns(!showDns)} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${showDns ? C.teal : C.border2}`, background: showDns ? C.tealBg : "none", color: showDns ? C.teal : C.textDim, fontSize: 12, cursor: "pointer" }}>DNS</button>
                  <div style={{ display: "flex", gap: 3, border: `1px solid ${C.border2}`, borderRadius: 6, padding: 2 }}>
                    {(["desktop", "tablet", "mobile"] as Device[]).map(d => (
                      <button key={d} onClick={() => { setDevice(d); setSidebarOpen(false); }} title={d} style={{ padding: "5px 8px", borderRadius: 4, border: "none", background: device === d ? C.surface2 : "none", color: device === d ? C.text : C.textDim, fontSize: 10, cursor: "pointer" }}>
                        {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DNS panel */}
              {showDns && (
                <div style={{ borderBottom: `1px solid ${C.border}`, padding: 16, background: C.surface2, flexShrink: 0 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>Custom Domain</p>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textDim }}>Current: <span style={{ fontFamily: "monospace", color: C.text }}>{liveUrl}</span></p>
                  {domains.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {domains.map(d => (
                        <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: C.bg, borderRadius: 5, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontFamily: "monospace", color: C.teal }}>{d}</span>
                          <button onClick={() => removeDomain(d)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="clientdomain.com.au" style={inp({ flex: 1, fontSize: 12, padding: "7px 10px" })} onKeyDown={e => e.key === "Enter" && addDomain()} />
                    <button onClick={addDomain} disabled={dnsLoading || !newDomain.trim()} style={{ padding: "7px 12px", borderRadius: 6, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: dnsLoading ? "not-allowed" : "pointer" }}>
                      {dnsLoading ? "..." : "Add"}
                    </button>
                  </div>
                  {dnsResult && (
                    <div style={{ marginTop: 10, padding: 10, background: C.bg, borderRadius: 6, fontSize: 11 }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, color: dnsResult.ok ? C.teal : C.red }}>{dnsResult.ok ? `Domain added${dnsResult.vercelConnected ? " + connected to Vercel" : " (add to Vercel manually)"}` : `Error: ${dnsResult.vercelError}`}</p>
                      {dnsResult.ok && (
                        <>
                          <p style={{ margin: "0 0 4px", color: C.textDim }}>Configure at your registrar:</p>
                          {dnsResult.instructions.map(r => (
                            <div key={r.type + r.name} style={{ fontFamily: "monospace", marginBottom: 3, color: C.text }}>
                              <span style={{ color: C.gold }}>{r.type}</span> {r.name} → {r.value} <span style={{ color: C.textDim }}>({r.note})</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Message history — also a drag-and-drop target */}
              <div
                style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, position: "relative", transition: "background 0.15s", background: isDragOver ? "rgba(15,157,142,0.07)" : "transparent" }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) uploadFile(file);
                }}
              >
                {isDragOver && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                    <div style={{ border: `2px dashed ${C.teal}`, borderRadius: 12, padding: "24px 36px", background: "rgba(15,157,142,0.12)", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 28 }}>📎</p>
                      <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: C.teal }}>Drop image here</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textDim }}>logo, screenshot, reference</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="upload" style={{ maxWidth: 160, maxHeight: 100, borderRadius: 6, marginBottom: 4, objectFit: "cover", border: `1px solid ${C.border2}` }} />
                    )}
                    <div style={{
                      maxWidth: "88%",
                      padding: "8px 12px",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: msg.role === "user" ? C.gold : C.surface2,
                      color: msg.role === "user" ? "#000" : C.text,
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontWeight: msg.role === "user" ? 500 : 400,
                    }}>
                      {msg.content}
                    </div>
                    {msg.htmlSnapshot && versions.current.includes(msg.htmlSnapshot) && (
                      <button
                        onClick={() => restoreVersion(msg.htmlSnapshot!, versions.current.indexOf(msg.htmlSnapshot!))}
                        style={{ marginTop: 4, fontSize: 10, color: C.textDim, background: "none", border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
                      >
                        Restore this version
                      </button>
                    )}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, alignSelf: "stretch" }}>
                        <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Try next</span>
                        {msg.suggestions.map((s, si) => (
                          <button
                            key={si}
                            onClick={() => { setInstruction(s); textareaRef.current?.focus(); }}
                            style={{ textAlign: "left", padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: C.bg, color: C.textDim, fontSize: 12, cursor: "pointer", lineHeight: 1.4, transition: "border-color 0.15s, color 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                      {new Date(msg.ts).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
                {/* Pending image preview */}
                {pendingImage && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border2}` }}>
                    <img src={pendingImage.url} alt="pending" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                    <span style={{ fontSize: 11, color: C.textDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingImage.name}</span>
                    <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEdit(); } }}
                  placeholder={pendingImage ? "Describe how to use this image… (optional)" : "Describe what to change…"}
                  rows={isMobile ? 2 : 3}
                  disabled={isEditing}
                  style={{ ...inp({ resize: "none", fontFamily: "inherit", lineHeight: 1.5, fontSize: 13, padding: "9px 12px", opacity: isEditing ? 0.6 : 1 }) }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7, gap: 6 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isEditing || uploading}
                    title="Upload image (logo, screenshot, reference)"
                    style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: pendingImage ? C.tealBg : "none", color: pendingImage ? C.teal : C.textDim, fontSize: 14, cursor: isEditing || uploading ? "not-allowed" : "pointer", opacity: isEditing || uploading ? 0.5 : 1 }}
                  >
                    {uploading ? "⏳" : "📎"}
                  </button>
                  <span style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>Shift+Enter newline</span>
                  <button
                    onClick={sendEdit}
                    disabled={(!instruction.trim() && !pendingImage) || isEditing}
                    style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: (!instruction.trim() && !pendingImage) || isEditing ? C.border : C.gold, color: (!instruction.trim() && !pendingImage) || isEditing ? C.textMuted : "#000", fontSize: 13, fontWeight: 600, cursor: (!instruction.trim() && !pendingImage) || isEditing ? "not-allowed" : "pointer" }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview pane ─────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", minWidth: 0 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto", padding: device === "desktop" ? 0 : "20px 0" }}>
              <div style={{ width: DEVICE_WIDTHS[device], height: "100%", minHeight: device !== "desktop" ? 600 : "100%", position: "relative", transition: "width 0.25s ease", flexShrink: 0, boxShadow: device !== "desktop" ? "0 8px 48px rgba(0,0,0,.6)" : "none", borderRadius: device !== "desktop" ? 12 : 0, overflow: "hidden" }}>
                {previewHtml ? (
                  <iframe
                    key={iframeKey}
                    srcDoc={previewHtml}
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                    title="Site preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#3d5168" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #1a2535", borderTopColor: "#0f9d8e", animation: "spin 0.9s linear infinite" }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Loading preview...</p>
                  </div>
                )}
                {isEditing && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(8,13,17,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
                    <div style={{ textAlign: "center", color: "#e2dfd8" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(201,162,39,.3)", borderTopColor: "#c9a227", animation: "spin 0.9s linear infinite", margin: "0 auto 12px" }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Applying changes...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: floating chat button when sidebar is closed */}
            {isMobile && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ position: "absolute", bottom: 20, right: 20, zIndex: 40, padding: "12px 20px", borderRadius: 30, background: C.gold, color: "#000", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,162,39,.4)" }}
              >
                💬 Chat
              </button>
            )}
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ padding: "22px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Site Factory</h1>
          <p style={{ margin: "3px 0 0", color: C.textDim, fontSize: 12 }}>Generate and edit AI websites for clients</p>
        </div>
        <button onClick={() => setPhase("new")} style={{ background: C.goldBg, border: `1px solid ${C.gold}`, color: C.gold, padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + New Site
        </button>
      </div>

      <div style={{ padding: "20px 28px" }}>
        {loadingSites ? (
          <p style={{ color: C.textDim, fontSize: 13 }}>Loading...</p>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
            <p style={{ fontSize: 40, margin: "0 0 12px" }}>🏗</p>
            <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: C.text }}>No sites yet</p>
            <p style={{ fontSize: 13, margin: 0 }}>Click &quot;+ New Site&quot; to generate your first client website</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {[...sites].sort((a, b) => b.createdAt - a.createdAt).map(site => (
              <div
                key={site.id}
                onClick={() => openEditor(site)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.background = C.surface2; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = C.surface; }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{site.name}</h3>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: site.status === "live" ? "rgba(34,197,94,0.12)" : C.goldBg, color: site.status === "live" ? "#22c55e" : C.gold, fontWeight: 700, textTransform: "uppercase" }}>
                      {site.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: C.textDim, fontSize: 11, fontFamily: "monospace" }}>/sites/{site.slug}/</p>
                  {site.domains && site.domains.length > 0 && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.teal, fontFamily: "monospace" }}>{site.domains[0]}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <span style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.border2}`, color: C.textDim, fontSize: 12 }}>Edit →</span>
                  <a href={`https://www.saabai.ai/sites/${site.slug}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.gold}`, color: C.gold, textDecoration: "none", fontSize: 12, background: C.goldBg }}>Preview</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Site Modal */}
      {phase === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setPhase("list")}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", padding: "26px 30px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Client Site</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textDim }}>AI generates a full website in ~90 seconds</p>
              </div>
              <button onClick={() => setPhase("list")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>{lbl("Business Name *")}<input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Smith Plumbing" style={inp()} autoFocus /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>{lbl("Industry")}<select value={niche} onChange={e => setNiche(e.target.value)} style={inp()}>{NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}</select></div>
                <div>{lbl("Location")}<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Sydney, NSW" style={inp()} /></div>
              </div>
              <div>{lbl("Services (comma separated)")}<input value={services} onChange={e => setServices(e.target.value)} placeholder="Emergency plumbing, Blocked drains..." style={inp()} /></div>
              <div>
                {lbl("Brief / Notes")}
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Target audience, tone, inspiration sites, anything specific..." rows={3} style={inp({ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>{lbl("Phone")}<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0412 345 678" style={inp()} /></div>
                <div>{lbl("Email")}<input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@..." style={inp()} /></div>
                <div>{lbl("Address")}<input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" style={inp()} /></div>
              </div>
              <div>
                {lbl("Style")}
                <div style={{ display: "flex", gap: 6 }}>
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: `1px solid ${style === s ? C.gold : C.border2}`, background: style === s ? C.goldBg : C.bg, color: style === s ? C.gold : C.textDim, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>{s}</button>
                  ))}
                </div>
              </div>
              <button onClick={generateSite} disabled={!businessName.trim()} style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 7, border: "none", background: !businessName.trim() ? C.border : C.gold, color: !businessName.trim() ? C.textDim : "#000", fontSize: 14, fontWeight: 700, cursor: !businessName.trim() ? "not-allowed" : "pointer" }}>
                Generate Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
