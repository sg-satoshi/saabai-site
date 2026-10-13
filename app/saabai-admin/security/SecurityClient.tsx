"use client";

import { useState } from "react";
import "../auth.css";

type Status = { enabled: boolean; enabledAt?: string; backupLeft?: number; envDisabled: boolean };

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
    <div className="auth-screen" style={{ gridTemplateColumns: "1fr" }}>
      <div className="panel" style={{ minHeight: "100vh" }}>
        <div className="box">
          <a href="/saabai-admin" style={{ color: "#9aa0bd", fontSize: 13, textDecoration: "none" }}>
            Back to Mission Control
          </a>
          <div className="mc2" style={{ marginTop: 28 }}>Security</div>
          <h1>Two-step sign in</h1>
          <p className="lead">2FA is required for every admin. Trust a private device for 30 days after you verify a code.</p>

          {backup ? (
            <>
              <p style={{ marginTop: 16, color: "#86efac", fontSize: 14, lineHeight: 1.55 }}>
                2FA is on. Save these backup codes somewhere safe, like your password manager. Each works once, and they will not be shown again.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                {backup.map((c) => (
                  <li key={c} className="num" style={{ fontSize: 15, padding: "10px 12px", background: "var(--navy-800)", borderRadius: 8, textAlign: "center", border: "1px solid #2b2870" }}>
                    {c}
                  </li>
                ))}
              </ul>
              <button type="button" className="gbtn" onClick={() => navigator.clipboard?.writeText(backup.join("\n"))}>
                Copy codes
              </button>
            </>
          ) : status.enabled ? (
            <p className="lead" style={{ marginTop: 18 }}>
              2FA is on{status.enabledAt ? ` since ${new Date(status.enabledAt).toLocaleDateString("en-AU")}` : ""}. {status.backupLeft ?? 0} backup codes left.
              {status.envDisabled ? " Note: SAABAI_ADMIN_2FA_DISABLE is set, so codes are not being asked for right now." : ""}
            </p>
          ) : setup ? (
            <>
              <p className="lead" style={{ marginTop: 18 }}>1. Scan this QR code with your authenticator app (Proton Pass, 1Password, Google Authenticator).</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="2FA QR code" width={220} height={220} style={{ display: "block", margin: "16px auto", background: "#fff", borderRadius: 12, padding: 8 }} />
              <p className="lead">Cannot scan? Enter this key manually:</p>
              <p className="num" style={{ fontSize: 14, wordBreak: "break-all", background: "var(--navy-800)", padding: "10px 12px", borderRadius: 8, border: "1px solid #2b2870" }}>{setup.secret}</p>
              <p className="lead" style={{ marginTop: 14 }}>2. Enter the 6-digit code the app shows.</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const d = await call({ action: "confirm", code });
                  if (d?.backupCodes) {
                    setBackup(d.backupCodes);
                    setStatus({ ...status, enabled: true, backupLeft: d.backupCodes.length });
                  }
                }}
                className="f"
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  aria-label="6-digit code"
                  className="fi-real"
                  style={{ letterSpacing: 4, textAlign: "center", fontSize: 20 }}
                />
                <button type="submit" disabled={busy} className="gbtn">
                  Turn on 2FA
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="lead" style={{ marginTop: 18 }}>Add a 6-digit code from your phone to admin sign in. It stays off until you finish this setup.</p>
              <button
                type="button"
                className="gbtn"
                disabled={busy}
                onClick={async () => {
                  const d = await call({ action: "start" });
                  if (d?.secret) setSetup(d);
                }}
              >
                Set up 2FA
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="err">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
