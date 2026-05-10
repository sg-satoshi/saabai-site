"use client";

import { useState, useEffect } from "react";

interface Site {
  id: string;
  slug: string;
  name: string;
  niche: string;
  status: string;
  url: string;
  createdAt: number;
}

export default function SiteFactoryPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("trades");
  const [location, setLocation] = useState("Australia");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState("modern");

  useEffect(() => {
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoading(true);
    try {
      const res = await fetch("/api/site-factory/list");
      const data = await res.json();
      if (data.sites) setSites(data.sites);
    } catch (e) {
      console.error("Failed to fetch sites", e);
    }
    setLoading(false);
  }

  async function generateSite() {
    if (!businessName.trim()) return;
    setGenerating(true);
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        fetchSites();
        window.open(data.site.previewUrl, "_blank");
      } else {
        alert(data.error || "Failed to generate site");
      }
    } catch (e) {
      alert("Error generating site: " + String(e));
    }
    setGenerating(false);
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
  }

  const C = {
    bg: "#0a0f14",
    surface: "#111820",
    border: "#1e2a35",
    text: "#e8e4dc",
    textDim: "#7a8a9a",
    gold: "#c9a227",
    goldBg: "rgba(201,162,39,0.12)",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Site Factory</h1>
          <p style={{ margin: "4px 0 0", color: C.textDim, fontSize: 13 }}>Generate AI-powered websites in seconds</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: C.goldBg,
            border: `1px solid ${C.gold}`,
            color: C.gold,
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Site
        </button>
      </div>

      {/* Site List */}
      <div style={{ padding: "24px 32px" }}>
        {loading ? (
          <p style={{ color: C.textDim }}>Loading sites...</p>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No sites yet</p>
            <p style={{ fontSize: 14 }}>Click "+ New Site" to generate your first website</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {sites.map((site) => (
              <div
                key={site.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{site.name}</h3>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: site.status === "live" ? "rgba(34,197,94,0.15)" : C.goldBg,
                        color: site.status === "live" ? "#22c55e" : C.gold,
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {site.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: C.textDim, fontSize: 13 }}>
                    {site.niche} • {new Date(site.createdAt).toLocaleDateString()}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim, fontFamily: "monospace" }}>
                    /sites/{site.slug}/
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      background: C.goldBg,
                      border: `1px solid ${C.gold}`,
                      color: C.gold,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 520,
              maxHeight: "85vh",
              overflow: "auto",
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Generate New Site</h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Business Name *
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Smith Plumbing"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                    Niche
                  </label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      color: C.text,
                      fontSize: 14,
                    }}
                  >
                    <option value="trades">Trades</option>
                    <option value="allied-health">Allied Health</option>
                    <option value="professional-services">Professional Services</option>
                    <option value="retail">Retail</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                    Location
                  </label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Sydney"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      color: C.text,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Services (comma separated)
                </label>
                <input
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="e.g. Emergency plumbing, Blocked drains, Hot water systems"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                    Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 345 678"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      color: C.text,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@business.com.au"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      color: C.text,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Style
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["modern", "classic", "minimal", "bold"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid ${style === s ? C.gold : C.border}`,
                        background: style === s ? C.goldBg : C.bg,
                        color: style === s ? C.gold : C.textDim,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateSite}
                disabled={generating || !businessName.trim()}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: generating || !businessName.trim() ? C.border : C.gold,
                  color: generating || !businessName.trim() ? C.textDim : "#000",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: generating || !businessName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "Generating..." : "Generate Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
