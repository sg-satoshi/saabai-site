"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const C = {
    gold:   "#C9A84C",
    goldBg: "rgba(201,168,76,0.10)",
    goldBdr: "rgba(201,168,76,0.22)",
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "9px 18px", borderRadius: 10,
        background: C.goldBg, border: `1px solid ${C.goldBdr}`,
        color: C.gold, fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.12s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.goldBg; (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.goldBg; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
    >
      {copied ? "Copied!" : "Copy Embed Code"}
    </button>
  );
}
