"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  fontSize: 14,
  color: "#f0f4ff",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(98,197,209,0.2)",
  borderRadius: 10,
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "rgba(240,244,255,0.45)",
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetLink("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        setSent(true);
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1628 0%, #0e2554 50%, #0a1628 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(98,197,209,0.1)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#f0f4ff", letterSpacing: -0.5 }}>
              Saabai<span style={{ color: "#62c5d1" }}>.ai</span>
            </span>
          </a>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: "rgba(240,244,255,0.5)", marginTop: 8, letterSpacing: 1, textTransform: "uppercase" }}>
            Reset password
          </h1>
        </div>

        {error && (
          <div style={{
            marginBottom: 20,
            padding: "10px 14px",
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {sent ? (
          <div>
            <div style={{
              marginBottom: 24,
              padding: "16px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 10,
              textAlign: "center",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, color: "#86efac", fontWeight: 700 }}>
                Reset link sent
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(134,239,172,0.75)" }}>
                If an account with this email exists, you will receive a reset link.
              </p>
            </div>

            {resetLink && (
              <div style={{
                padding: "12px 14px",
                background: "rgba(98,197,209,0.08)",
                border: "1px solid rgba(98,197,209,0.2)",
                borderRadius: 10,
                marginBottom: 16,
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(98,197,209,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Reset link (dev mode)
                </p>
                <a
                  href={resetLink}
                  style={{ fontSize: 12, color: "#62c5d1", wordBreak: "break-all" }}
                >
                  {resetLink}
                </a>
              </div>
            )}

            <a
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 16,
                fontSize: 12,
                color: "rgba(98,197,209,0.5)",
                textDecoration: "none",
              }}
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                required
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(98,197,209,0.55)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(98,197,209,0.2)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                fontSize: 14, fontWeight: 700,
                background: loading ? "rgba(98,197,209,0.08)" : "rgba(98,197,209,0.15)",
                border: "1px solid rgba(98,197,209,0.35)",
                borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                color: loading ? "rgba(98,197,209,0.4)" : "#62c5d1",
                letterSpacing: 0.3, fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "rgba(131,153,192,0.5)" }}>
              Remember your password?{" "}
              <a
                href="/login"
                style={{ color: "rgba(98,197,209,0.6)", textDecoration: "none" }}
              >
                Sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
