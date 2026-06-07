"use client";

import { useState } from "react";

export default function CustomizeForm({ 
  initialBusinessName, 
  updateBusinessName 
}: { 
  initialBusinessName: string; 
  updateBusinessName: (newName: string) => void;
}) {
  const [name, setName] = useState(initialBusinessName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    
    // For now just update locally - real save would hit an API
    updateBusinessName(name.trim());
    setSaving(false);
    alert("Customisation saved. (Full save coming in next step)");
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
