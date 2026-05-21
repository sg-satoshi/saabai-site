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

  // Chatbot config state (for new site form)
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotName, setChatbotName] = useState("");
  const [chatbotGreeting, setChatbotGreeting] = useState("");
  const [chatbotPersonality, setChatbotPersonality] = useState("");

  // Inject chatbot into existing site
  const [injectingBot, setInjectingBot] = useState(false);
  const [showBotSetup, setShowBotSetup] = useState(false);
  const [botSetupName, setBotSetupName] = useState("");
  const [botSetupAvatarUrl, setBotSetupAvatarUrl] = useState("");
  const [botAvatarGenerating, setBotAvatarGenerating] = useState(false);

  // Image generation panel
  const [showImgGen, setShowImgGen] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgSize, setImgSize] = useState<"landscape" | "portrait" | "square">("landscape");
  const [imgStyle, setImgStyle] = useState<"photo" | "illustration" | "abstract">("photo");
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatedImgs, setGeneratedImgs] = useState<Array<{ url: string; prompt: string }>>([]);
  const [botSetupGreeting, setBotSetupGreeting] = useState("");
  const [botSetupPersonality, setBotSetupPersonality] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  async function sendEdit(overrideText?: string, overrideImageUrl?: string) {
    const text = overrideText !== undefined ? overrideText : instruction.trim();
    const imageUrl = overrideImageUrl !== undefined ? overrideImageUrl : pendingImage?.url;
    if ((!text && !imageUrl) || !activeSite || isEditing) return;

    const displayContent = text || `[Image]`;

    const userMsg: Message = { role: "user", content: displayContent, ts: Date.now(), imageUrl };
    const historyForApi = [...messages];
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    if (overrideText === undefined) setInstruction("");
    if (overrideImageUrl === undefined) setPendingImage(null);
    setIsEditing(true);

    // Start with empty streaming message
    const assistantMsg: Message = { role: "assistant", content: "", ts: Date.now() };
    const withAssistant = [...nextMsgs, assistantMsg];
    setMessages(withAssistant);

    try {
      const res = await fetch("/api/site-factory/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSite.slug,
          instruction: text || "Apply the uploaded image to the site",
          imageUrl,
          history: historyForApi.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Stream chunks — update message in real-time (strip internal markers from display)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const displayText = fullText
          .replace(/<CHANGES>[\s\S]*?<\/CHANGES>/g, "")
          .replace(/<RESULT>[\s\S]*?<\/RESULT>/g, "")
          .trim();

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: displayText };
          return updated;
        });
      }

      // Parse result marker
      const resultMatch = fullText.match(/<RESULT>(.*?)<\/RESULT>/);
      const opsApplied = resultMatch ? (JSON.parse(resultMatch[1]).opsApplied as number) : 0;

      let newHtml: string | null = null;
      if (opsApplied > 0) {
        // Reload the updated HTML from blob
        const htmlRes = await fetch(`/sites/${activeSite.slug}?t=${Date.now()}`);
        newHtml = await htmlRes.text();
        versions.current = [...versions.current.slice(0, versionIdx === -1 ? versions.current.length : versionIdx + 1), newHtml];
        setVersionIdx(-1);
        setPreviewHtml(newHtml);
        setIframeKey(k => k + 1);
      }

      // Finalise the assistant message
      const displayText = fullText
        .replace(/<CHANGES>[\s\S]*?<\/CHANGES>/g, "")
        .replace(/<RESULT>[\s\S]*?<\/RESULT>/g, "")
        .trim();

      const finalMsgs = withAssistant.map((m, i) =>
        i === withAssistant.length - 1
          ? { ...m, content: displayText, ...(newHtml ? { htmlSnapshot: newHtml } : {}) }
          : m
      );
      setMessages(finalMsgs);
      storeMsgs(activeSite.slug, finalMsgs);

      if (isMobile && newHtml) setSidebarOpen(false);

      // Fetch suggestion chips in the background (only if changes were made)
      if (newHtml) {
        const capturedHtml = newHtml;
        fetch("/api/site-factory/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastInstruction: text, siteName: activeSite.name, niche: activeSite.niche, history: finalMsgs }),
        }).then(r => r.json()).then(({ suggestions }) => {
          if (!Array.isArray(suggestions) || suggestions.length === 0) return;
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.htmlSnapshot === capturedHtml) {
              updated[updated.length - 1] = { ...last, suggestions };
              storeMsgs(activeSite.slug, updated);
            }
            return updated;
          });
        }).catch(() => {});
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: String(e) };
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

  async function injectChatbot() {
    if (!activeSite) return;
    setInjectingBot(true);
    try {
      const res = await fetch("/api/site-factory/inject-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSite.slug,
          botName: botSetupName || undefined,
          greeting: botSetupGreeting || undefined,
          personality: botSetupPersonality || undefined,
          avatarUrl: botSetupAvatarUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowBotSetup(false);
        setBotSetupName(""); setBotSetupGreeting(""); setBotSetupPersonality(""); setBotSetupAvatarUrl("");
        // Reload preview
        const htmlRes = await fetch(`/sites/${activeSite.slug}?t=${Date.now()}`);
        const html = await htmlRes.text();
        setPreviewHtml(html);
        setIframeKey(k => k + 1);
        setMessages(prev => [...prev, { role: "assistant", content: `AI chatbot added to ${activeSite.name}. Visitors can now chat with ${data.botName}.`, ts: Date.now() }]);
      } else {
        alert("Failed: " + (data.error || "unknown error"));
      }
    } catch (e) { alert(String(e)); }
    setInjectingBot(false);
  }

  async function generateSiteImage() {
    if (!imgPrompt.trim() || !activeSite || generatingImg) return;
    setGeneratingImg(true);
    try {
      const res = await fetch("/api/site-factory/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imgPrompt.trim(),
          slug: activeSite.slug,
          niche: activeSite.niche,
          size: imgSize,
          style: imgStyle,
        }),
      });
      const data = await res.json().catch(() => ({ error: res.status === 504 ? "Generation timed out — try a simpler prompt or try again" : `Server error ${res.status}` }));
      if (data.ok && data.url) {
        setGeneratedImgs(prev => [{ url: data.url, prompt: imgPrompt.trim() }, ...prev.slice(0, 5)]);
        setImgPrompt("");
      } else {
        alert(data.error || "Image generation failed");
      }
    } catch (e) { alert(String(e)); }
    setGeneratingImg(false);
  }

  async function generateBotAvatar() {
    if (!activeSite || botAvatarGenerating) return;
    setBotAvatarGenerating(true);
    const name = botSetupName.trim() || activeSite.name;
    try {
      const res = await fetch("/api/site-factory/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `professional portrait photo of a friendly AI assistant named ${name}, warm smile, clean neutral background, looking directly at camera`,
          slug: activeSite.slug,
          niche: activeSite.niche,
          size: "square",
          style: "photo",
        }),
      });
      const data = await res.json().catch(() => ({ error: res.status === 504 ? "Generation timed out — try again" : `Server error ${res.status}` }));
      if (data.ok && data.url) {
        setBotSetupAvatarUrl(data.url);
      } else {
        alert(data.error || "Image generation failed");
      }
    } catch (e) { alert(String(e)); }
    setBotAvatarGenerating(false);
  }

  async function uploadBotAvatar(file: File) {
    if (!activeSite) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSite.slug);
      const res = await fetch("/api/site-factory/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setBotSetupAvatarUrl(data.url);
      } else {
        alert("Upload failed: " + (data.error || "unknown"));
      }
    } catch (e) { alert("Upload error: " + String(e)); }
  }

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
          chatbot: chatbotEnabled ? {
            name: chatbotName || undefined,
            greeting: chatbotGreeting || undefined,
            personality: chatbotPersonality || undefined,
          } : { enabled: false },
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

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadBotAvatar(f); e.target.value = ""; }}
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
          {!isMobile && <button onClick={() => { setShowImgGen(!showImgGen); setShowBotSetup(false); setShowDns(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${showImgGen ? "#a855f7" : C.border2}`, background: showImgGen ? "rgba(168,85,247,0.1)" : "none", color: showImgGen ? "#a855f7" : C.textDim, fontSize: 12, cursor: "pointer" }}>🎨 Image</button>}
          {!isMobile && <button onClick={() => { setShowBotSetup(!showBotSetup); setShowImgGen(false); setShowDns(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${showBotSetup ? C.gold : C.border2}`, background: showBotSetup ? C.goldBg : "none", color: showBotSetup ? C.gold : C.textDim, fontSize: 12, cursor: "pointer" }}>💬 Bot</button>}
          {!isMobile && <button onClick={() => { setShowDns(!showDns); setShowImgGen(false); setShowBotSetup(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${showDns ? C.teal : C.border2}`, background: showDns ? C.tealBg : "none", color: showDns ? C.teal : C.textDim, fontSize: 12, cursor: "pointer" }}>DNS</button>}
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

              {/* Mobile: DNS + Undo + Bot controls inside sidebar */}
              {isMobile && (
                <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <button onClick={canUndo ? undoLast : undefined} disabled={!canUndo} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: canUndo ? C.textDim : C.textMuted, fontSize: 12, cursor: canUndo ? "pointer" : "default" }}>Undo</button>
                  <button onClick={() => { setShowImgGen(!showImgGen); setShowBotSetup(false); setShowDns(false); }} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${showImgGen ? "#a855f7" : C.border2}`, background: showImgGen ? "rgba(168,85,247,0.1)" : "none", color: showImgGen ? "#a855f7" : C.textDim, fontSize: 12, cursor: "pointer" }}>🎨 Img</button>
                  <button onClick={() => { setShowBotSetup(!showBotSetup); setShowImgGen(false); setShowDns(false); }} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${showBotSetup ? C.gold : C.border2}`, background: showBotSetup ? C.goldBg : "none", color: showBotSetup ? C.gold : C.textDim, fontSize: 12, cursor: "pointer" }}>💬 Bot</button>
                  <button onClick={() => { setShowDns(!showDns); setShowImgGen(false); setShowBotSetup(false); }} style={{ flex: 1, padding: "7px", borderRadius: 6, border: `1px solid ${showDns ? C.teal : C.border2}`, background: showDns ? C.tealBg : "none", color: showDns ? C.teal : C.textDim, fontSize: 12, cursor: "pointer" }}>DNS</button>
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

              {/* Image generation panel */}
              {showImgGen && (
                <div style={{ borderBottom: `1px solid ${C.border}`, padding: 16, background: C.surface2, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#a855f7" }}>🎨 Generate Image</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textDim }}>DALL-E 3 · HD quality</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      value={imgPrompt}
                      onChange={e => setImgPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateSiteImage(); } }}
                      placeholder={`e.g. "${activeSite.name} therapist treating a client in a peaceful green spa room"`}
                      rows={3}
                      style={inp({ fontSize: 12, padding: "8px 10px", resize: "none", fontFamily: "inherit", lineHeight: 1.5 })}
                    />
                    {/* Size + Style toggles */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Size</p>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(["landscape", "portrait", "square"] as const).map(s => (
                            <button key={s} onClick={() => setImgSize(s)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${imgSize === s ? "#a855f7" : C.border2}`, background: imgSize === s ? "rgba(168,85,247,0.12)" : C.bg, color: imgSize === s ? "#a855f7" : C.textDim, fontSize: 10, cursor: "pointer", fontWeight: imgSize === s ? 600 : 400 }}>
                              {s === "landscape" ? "⬛ Wide" : s === "portrait" ? "▬ Tall" : "◼ Square"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</p>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["photo", "illustration", "abstract"] as const).map(s => (
                          <button key={s} onClick={() => setImgStyle(s)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${imgStyle === s ? "#a855f7" : C.border2}`, background: imgStyle === s ? "rgba(168,85,247,0.12)" : C.bg, color: imgStyle === s ? "#a855f7" : C.textDim, fontSize: 10, cursor: "pointer", fontWeight: imgStyle === s ? 600 : 400, textTransform: "capitalize" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={generateSiteImage}
                      disabled={!imgPrompt.trim() || generatingImg}
                      style={{ width: "100%", padding: "9px", borderRadius: 6, border: "none", background: !imgPrompt.trim() || generatingImg ? C.border : "#a855f7", color: !imgPrompt.trim() || generatingImg ? C.textMuted : "#fff", fontSize: 13, fontWeight: 600, cursor: !imgPrompt.trim() || generatingImg ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      {generatingImg ? (
                        <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} /> Generating (~15s)…</>
                      ) : "Generate with DALL-E 3"}
                    </button>
                    {/* Generated image gallery */}
                    {generatedImgs.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Generated — insert into site</p>
                        {generatedImgs.map((img, i) => (
                          <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border2}` }}>
                            <img src={img.url} alt={img.prompt} style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }} />
                            <div style={{ padding: "7px 8px", background: C.bg, display: "flex", flexDirection: "column", gap: 5 }}>
                              <p style={{ margin: 0, fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.prompt}</p>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {[
                                  { label: "Hero bg", instruction: `Replace the hero section background image with this image: ${img.url}` },
                                  { label: "About section", instruction: `Add this image to the about section: ${img.url}` },
                                  { label: "Gallery", instruction: `Add this image to a gallery or images section: ${img.url}` },
                                ].map(opt => (
                                  <button key={opt.label}
                                    onClick={() => { sendEdit(opt.instruction); setShowImgGen(false); }}
                                    style={{ padding: "4px 9px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 10, cursor: "pointer", fontWeight: 500 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#a855f7"; (e.currentTarget as HTMLElement).style.color = "#a855f7"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                                  >{opt.label}</button>
                                ))}
                                <button
                                  onClick={() => { setPendingImage({ url: img.url, name: img.prompt.slice(0, 40) }); setShowImgGen(false); }}
                                  style={{ padding: "4px 9px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 10, cursor: "pointer", fontWeight: 500 }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                                >Custom →</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bot setup panel */}
              {showBotSetup && (
                <div style={{ borderBottom: `1px solid ${C.border}`, padding: 16, background: C.surface2, flexShrink: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: C.gold }}>AI Chatbot Setup</p>
                  <p style={{ margin: "0 0 12px", fontSize: 11, color: C.textDim }}>Adds a trained AI assistant to this site for visitors to chat with.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Avatar section */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 0 10px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, border: `2px solid ${botSetupAvatarUrl ? C.gold : C.border2}`, overflow: "hidden", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {botSetupAvatarUrl ? (
                          <img src={botSetupAvatarUrl} alt="Bot avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 26, lineHeight: 1 }}>🤖</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bot Avatar</p>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            onClick={generateBotAvatar}
                            disabled={botAvatarGenerating}
                            style={{ flex: 1, padding: "6px 6px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: botAvatarGenerating ? C.textMuted : C.textDim, fontSize: 11, cursor: botAvatarGenerating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                          >
                            {botAvatarGenerating ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.2)", borderTopColor: C.textDim, animation: "spin 0.8s linear infinite" }} />Gen…</> : "🎨 Generate"}
                          </button>
                          <button
                            onClick={() => avatarInputRef.current?.click()}
                            style={{ flex: 1, padding: "6px 6px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}
                          >
                            📎 Upload
                          </button>
                        </div>
                        {botSetupAvatarUrl && (
                          <button onClick={() => setBotSetupAvatarUrl("")} style={{ fontSize: 10, color: C.textMuted, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>Remove</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Bot name</label>
                      <input value={botSetupName} onChange={e => setBotSetupName(e.target.value)} placeholder={`${activeSite.name} Assistant`} style={inp({ fontSize: 12, padding: "7px 10px" })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Greeting message</label>
                      <input value={botSetupGreeting} onChange={e => setBotSetupGreeting(e.target.value)} placeholder={`Hi! I'm here to help with ${activeSite.name}…`} style={inp({ fontSize: 12, padding: "7px 10px" })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Personality & specialty notes</label>
                      <textarea value={botSetupPersonality} onChange={e => setBotSetupPersonality(e.target.value)} placeholder="e.g. Warm and calming tone, expert in Thai massage and relaxation techniques, knows all our services and pricing, encourages online bookings..." rows={3} style={inp({ fontSize: 12, padding: "7px 10px", resize: "none", fontFamily: "inherit", lineHeight: 1.5 })} />
                    </div>
                    <button
                      onClick={injectChatbot}
                      disabled={injectingBot}
                      style={{ width: "100%", padding: "9px", borderRadius: 6, border: "none", background: injectingBot ? C.border : C.gold, color: injectingBot ? C.textMuted : "#000", fontSize: 13, fontWeight: 600, cursor: injectingBot ? "not-allowed" : "pointer" }}
                    >
                      {injectingBot ? "Adding chatbot…" : "Add AI Chatbot to Site"}
                    </button>
                  </div>
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
              {/* Chatbot config */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: chatbotEnabled ? 12 : 0 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>AI Chatbot</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textDim }}>Add a trained assistant for site visitors</p>
                  </div>
                  <button
                    onClick={() => setChatbotEnabled(e => !e)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${chatbotEnabled ? C.gold : C.border2}`, background: chatbotEnabled ? C.goldBg : "none", color: chatbotEnabled ? C.gold : C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {chatbotEnabled ? "On" : "Off"}
                  </button>
                </div>
                {chatbotEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>{lbl("Bot name")}<input value={chatbotName} onChange={e => setChatbotName(e.target.value)} placeholder={businessName ? `${businessName} Assistant` : "e.g. Lily"} style={inp()} /></div>
                      <div>{lbl("Greeting")}<input value={chatbotGreeting} onChange={e => setChatbotGreeting(e.target.value)} placeholder="Hi! How can I help?" style={inp()} /></div>
                    </div>
                    <div>
                      {lbl("Personality & training notes")}
                      <textarea value={chatbotPersonality} onChange={e => setChatbotPersonality(e.target.value)} placeholder="e.g. Warm and calming tone, specialist in Thai massage. Knows services, pricing, and booking process. Encourages visitors to book online or call..." rows={2} style={inp({ resize: "none", fontFamily: "inherit", lineHeight: 1.5 })} />
                    </div>
                  </div>
                )}
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
