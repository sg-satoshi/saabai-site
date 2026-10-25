"use client";

import { useEffect, useState } from "react";

/** Shown on every page while an admin is in a Login as session. Exit restores the admin session. */
export default function LoginAsBanner() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)saabai_viewing_as=([^;]+)/);
    if (m) { try { setName(decodeURIComponent(m[1])); } catch { setName("another user"); } }
  }, []);
  if (!name) return null;
  return (
    <div role="status" data-no-feedback style={{ position: "sticky", top: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 14px", background: "#62c5d1", color: "#0b092e", fontSize: 13.5, fontWeight: 600, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <span>Viewing as {name}</span>
      <span aria-hidden="true">-</span>
      <form method="post" action="/api/auth/login-as/exit" style={{ margin: 0 }}>
        <button type="submit" style={{ background: "#0b092e", color: "#fff", border: 0, borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 32 }}>Exit</button>
      </form>
    </div>
  );
}
