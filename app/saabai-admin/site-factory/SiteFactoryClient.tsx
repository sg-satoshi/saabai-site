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
}

type Phase = "idle" | "generating" | "done";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const C = {
  bg: "#0a0f14",
  surface: "#111820",
  surface2: "#18222e",
  border: "#1e2a35",
  text: "#e8e4dc",
  textDim: "#7a8a9a",
  gold: "#c9a227",
  goldBg: "rgba(201,162,39,0.12)",
  goldDk: "#a07d10",
  teal: "#0d9488",
  tealBg: "rgba(13,148,136,0.12)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.1)",
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

export default function SiteFactoryClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [charCount, setCharCount] = useState(0);
  const [currentSiteUrl, setCurrentSiteUrl] = useState("");
  const [currentSiteSlug, setCurrentSiteSlug] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const liveHtmlRef = useRef("");
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("trades");
  const [location, setLocation] = useState("Australia");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState("modern");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoadingSites(true);
    try {
      const res = await fetch("/api/site-factory/list");
      const data = await res.json();
      if (data.sites) setSites(data.sites);
    } catch {
      console.error("Failed to fetch sites");
    }
    setLoadingSites(false);
  }

  function resetForm() {
    setBusinessName("");
    setNiche("trades");
    setLocation("Australia");
    setServices("");
    setPhone("");
    setEmail("");
    setAddress("");
    setStyle("modern");
    setDescription("");
  }

  const startPreviewUpdater = useCallback(() => {
    if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    previewIntervalRef.current = setInterval(() => {
      if (liveHtmlRef.current) setPreviewHtml(liveHtmlRef.current);
    }, 800);
  }, []);

  const stopPreviewUpdater = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
  }, []);

  async function generateSite() {
    if (!businessName.trim()) return;

    setShowForm(false);
    setPhase("generating");
    setCharCount(0);
    setPreviewHtml("");
    liveHtmlRef.current = "";

    const slug = slugify(businessName.trim());
    setCurrentSiteSlug(slug);
    setCurrentSiteUrl(`https://www.saabai.ai/sites/${slug}/`);

    startPreviewUpdater();

    try {
      const res = await fetch("/api/site-factory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          niche,
          location,
          services: services.split(",").map((s) => s.trim()).filter(Boolean),
          phone,
          email,
          address,
          style,
          description: description.trim(),
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // Read slug from header if server returned one
      const serverSlug = res.headers.get("X-Site-Slug");
      const serverUrl = res.headers.get("X-Site-Url");
      if (serverSlug) setCurrentSiteSlug(serverSlug);
      if (serverUrl) setCurrentSiteUrl(serverUrl);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        liveHtmlRef.current = html;
        setCharCount(html.length);
      }

      // Final preview update
      setPreviewHtml(html);
      stopPreviewUpdater();
      setPhase("done");
      fetchSites();
    } catch (e) {
      stopPreviewUpdater();
      setPhase("idle");
      setShowForm(true);
      alert("Error generating site: " + String(e));
    }
  }

  const inp = (overrides: React.CSSProperties = {}): React.CSSProperties => ({
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    ...overrides,
  });

  const label = (text: string) => (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {text}
    </label>
  );

  // Generation / Done screen
  if (phase === "generating" || phase === "done") {
    const isDone = phase === "done";
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* Top bar */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!isDone && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: `0 0 12px ${C.gold}`, animation: "pulse 1.4s ease-in-out infinite" }} />
              )}
              {isDone && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
              )}
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                {isDone ? `${businessName} — Site ready` : `Generating ${businessName}...`}
              </span>
              {!isDone && (
                <span style={{ fontSize: 12, color: C.textDim, fontVariantNumeric: "tabular-nums" }}>
                  {(charCount / 1000).toFixed(1)}k chars
                </span>
              )}
            </div>
            {isDone && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textDim, fontFamily: "monospace" }}>
                {currentSiteUrl}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isDone && (
              <>
                <a
                  href={currentSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: "8px 16px", borderRadius: 8, background: C.teal, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                >
                  Open Live Site
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(currentSiteUrl); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}
                >
                  Copy URL
                </button>
                <button
                  onClick={() => { setPhase("idle"); setShowForm(true); resetForm(); }}
                  style={{ padding: "8px 16px", borderRadius: 8, background: C.goldBg, border: `1px solid ${C.gold}`, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  + New Site
                </button>
              </>
            )}
            <button
              onClick={() => setPhase("idle")}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}
            >
              {isDone ? "Back to list" : "Cancel"}
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title="Site preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 24, color: C.textDim }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.gold, animation: "spin 0.9s linear infinite" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: C.text }}>Building your site...</p>
                <p style={{ margin: "6px 0 0", fontSize: 13 }}>AI is writing your HTML — preview loads shortly</p>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        `}</style>
      </div>
    );
  }

  // Main list view
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Site Factory</h1>
          <p style={{ margin: "4px 0 0", color: C.textDim, fontSize: 13 }}>AI-generated websites for Australian businesses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: C.goldBg, border: `1px solid ${C.gold}`, color: C.gold, padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          + New Site
        </button>
      </div>

      {/* Site list */}
      <div style={{ padding: "24px 32px" }}>
        {loadingSites ? (
          <p style={{ color: C.textDim }}>Loading...</p>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
            <p style={{ fontSize: 48, margin: "0 0 16px" }}>🏗️</p>
            <p style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px", color: C.text }}>No sites yet</p>
            <p style={{ fontSize: 14, margin: 0 }}>Click &quot;+ New Site&quot; to generate your first website in minutes</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {[...sites].sort((a, b) => b.createdAt - a.createdAt).map((site) => (
              <div key={site.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{site.name}</h3>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: site.status === "live" ? "rgba(34,197,94,0.15)" : C.goldBg, color: site.status === "live" ? "#22c55e" : C.gold, textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
                      {site.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: C.textDim, fontSize: 12 }}>
                    {site.niche} · {new Date(site.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>
                    /sites/{site.slug}/
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 6, background: C.goldBg, border: `1px solid ${C.gold}`, color: C.gold, textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                    Preview
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Site Modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", padding: "28px 32px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Site</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textDim }}>AI generates a full website in 60–90 seconds</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                {label("Business Name *")}
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Smith Plumbing" style={inp()} autoFocus />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  {label("Industry / Niche")}
                  <select value={niche} onChange={(e) => setNiche(e.target.value)} style={inp()}>
                    {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
                <div>
                  {label("Location")}
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Sydney, NSW" style={inp()} />
                </div>
              </div>

              <div>
                {label("Services (comma separated)")}
                <input value={services} onChange={(e) => setServices(e.target.value)} placeholder="e.g. Emergency plumbing, Hot water systems, Blocked drains" style={inp()} />
              </div>

              <div>
                {label("Project Brief")}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the site you want — target audience, tone, inspiration sites, specific requirements, anything that makes this business unique..."
                  rows={4}
                  style={inp({ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 })}
                />
                <p style={{ margin: "5px 0 0", fontSize: 11, color: C.textDim }}>The more detail you give, the better the result.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  {label("Phone")}
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0412 345 678" style={inp()} />
                </div>
                <div>
                  {label("Email")}
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@business.com.au" style={inp()} />
                </div>
                <div>
                  {label("Address")}
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" style={inp()} />
                </div>
              </div>

              <div>
                {label("Style")}
                <div style={{ display: "flex", gap: 8 }}>
                  {STYLES.map((s) => (
                    <button key={s} onClick={() => setStyle(s)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${style === s ? C.gold : C.border}`, background: style === s ? C.goldBg : C.bg, color: style === s ? C.gold : C.textDim, fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "capitalize" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateSite}
                disabled={!businessName.trim()}
                style={{ marginTop: 4, width: "100%", padding: "13px", borderRadius: 8, border: "none", background: !businessName.trim() ? C.border : C.gold, color: !businessName.trim() ? C.textDim : "#000", fontSize: 15, fontWeight: 700, cursor: !businessName.trim() ? "not-allowed" : "pointer", transition: "opacity 0.2s" }}
              >
                Generate Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
