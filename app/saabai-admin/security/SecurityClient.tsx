"use client";

import { useState } from "react";

type Status = { enabled: boolean; enabledAt?: string; backupLeft?: number; envDisabled: boolean };

const card: React.CSSProperties = { width: "100%", maxWidth: 520, boxSizing: "border-box", background: "#0e1128", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 22px", color: "#e2e4f0" };
const btn: React.CSSProperties = { minHeight: 48, padding: "0 22px", border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#111", background: "linear-gradient(135deg,#C9A84C,#E0BC6A)", cursor: "pointer" };
const muted: React.CSSProperties = { color: "#9aa0bd", fontSize: 14, lineHeight: 1.55 };

export default function SecurityClient({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(body: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 16px", background: "#07091a", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <a href="/saabai-admin" style={{ color: "#9aa0bd", fontSize: 14, display: "inline-block", padding: "12px 0" }}>&larr; Back to admin</a>
      </div>
      <div style={card}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Two-step sign in</h1>

        {backup ? (
          <>
            <p style={{ ...muted, color: "#86efac" }}>2FA is on. Save these backup codes somewhere safe, like your password manager. Each works once, and they won&apos;t be shown again.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
              {backup.map((c) => <li key={c} style={{ fontFamily: "monospace", fontSize: 16, padding: "10px 12px", background: "#151935", borderRadius: 8, textAlign: "center" }}>{c}</li>)}
            </ul>
            <button style={btn} onClick={() => navigator.clipboard?.writeText(backup.join("\n"))}>Copy codes</button>
          </>
        ) : status.enabled ? (
          <p style={muted}>
            2FA is on{status.enabledAt ? ` since ${new Date(status.enabledAt).toLocaleDateString("en-AU")}` : ""}. {status.backupLeft ?? 0} backup codes left.
            {status.envDisabled && " Note: SAABAI_ADMIN_2FA_DISABLE is set, so codes are not being asked for right now."}
          </p>
        ) : setup ? (
          <>
            <p style={muted}>1. Scan this QR code with your authenticator app (Proton Pass, 1Password, Google Authenticator).</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="2FA QR code" width={220} height={220} style={{ display: "block", margin: "16px auto", background: "#fff", borderRadius: 12, padding: 8 }} />
            <p style={muted}>Can&apos;t scan? Enter this key manually:</p>
            <p style={{ fontFamily: "monospace", fontSize: 15, wordBreak: "break-all", background: "#151935", padding: "10px 12px", borderRadius: 8 }}>{setup.secret}</p>
            <p style={muted}>2. Enter the 6-digit code the app shows.</p>
            <form onSubmit={async (e) => { e.preventDefault(); const d = await call({ action: "confirm", code }); if (d?.backupCodes) { setBackup(d.backupCodes); setStatus({ ...status, enabled: true, backupLeft: d.backupCodes.length }); } }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" aria-label="6-digit code"
                style={{ width: "100%", boxSizing: "border-box", minHeight: 48, fontSize: 20, letterSpacing: 4, textAlign: "center", background: "#151935", color: "#e2e4f0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, margin: "8px 0 16px" }} />
              <button type="submit" disabled={busy} style={{ ...btn, width: "100%" }}>Turn on 2FA</button>
            </form>
          </>
        ) : (
          <>
            <p style={muted}>Add a 6-digit code from your phone to the admin sign in. It stays off until you finish this setup.</p>
            <button style={{ ...btn, marginTop: 12 }} disabled={busy} onClick={async () => { const d = await call({ action: "start" }); if (d?.secret) setSetup(d); }}>Set up 2FA</button>
          </>
        )}
        {error && <p role="alert" style={{ marginTop: 16, fontSize: 14, color: "#fca5a5" }}>{error}</p>}
      </div>
    </div>
  );
}
