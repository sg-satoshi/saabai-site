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

  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">Business Name</label>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-black/40 border border-white/20 rounded-2xl px-5 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#62C5D1]"
          placeholder="Your business name"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-white text-[#0b092e] font-semibold rounded-2xl hover:bg-[#62C5D1] transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <p className="text-xs text-white/40 mt-2">This updates what Jack says when greeting customers.</p>
    </div>
  );
}
