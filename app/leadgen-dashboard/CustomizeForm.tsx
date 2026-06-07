"use client";

import { useState } from "react";

export default function CustomizeForm({ 
  initialBusinessName, 
}: { 
  initialBusinessName: string; 
}) {
  const [name, setName] = useState(initialBusinessName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    
    try {
      const res = await fetch("/api/leadgen/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name.trim() }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      
      alert("Business name updated! Widget will use your new name.");
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const C = {
    gold:   "#C9A84C",
    goldBg: "rgba(201,168,76,0.10)",
    goldBdr: "rgba(201,168,76,0.22)",
    border: "rgba(0,0,0,0.08)",
    text:   "#111827",
    muted:  "#9ca3af",
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
        Business Name
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1, padding: "10px 12px", fontSize: 13,
            border: `1px solid ${C.border}`, borderRadius: 10,
            background: "rgba(0,0,0,0.02)", color: C.text,
            outline: "none", fontFamily: "inherit",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          placeholder="Your business name"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 20px", borderRadius: 10,
            background: C.goldBg, border: `1px solid ${C.goldBdr}`,
            color: C.gold, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>
        This updates what Jack says when greeting customers.
      </p>
    </div>
  );
}
