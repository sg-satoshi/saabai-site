"use client";

import { useState } from "react";

const C = {
  bg: "#07091a",
  card: "#0e1128",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e4f0",
  muted: "#525873",
  gold: "#C9A84C",
};

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const email = (form.email as HTMLInputElement).value;
    const password = (form.password as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password, redirect: "/saabai-admin" }),
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: C.bg,
      fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 65%)",
        }} />
      </div>

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "44px 40px 40px",
        boxShadow: "0 0 0 1px rgba(201,168,76,0.03), 0 24px 64px rgba(0,0,0,0.5)",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{
            margin: 0,
            fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px",
          }}>
            Saabai
          </p>
          <p style={{
            margin: "10px 0 0",
            fontSize: 10, fontWeight: 700, letterSpacing: 3,
            textTransform: "uppercase", color: C.gold,
          }}>
            Mission Control
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 10,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: "block", marginBottom: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: C.muted,
            }}>Email</label>
            <input
              name="email" type="email" required autoFocus
              placeholder="hello@saabai.ai"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px", fontSize: 14, color: C.text,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 10, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block", marginBottom: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: C.muted,
            }}>Password</label>
            <input
              name="password" type="password" required
              placeholder="••••••••"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px", fontSize: 14, color: C.text,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 10, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px",
              fontSize: 14, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.gold} 0%, #E0BC6A 100%)`,
              border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              color: "#0a1628", fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}
