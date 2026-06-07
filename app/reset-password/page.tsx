"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <PageContainer>
        <Card>
          <div style={{
            marginBottom: 24,
            padding: "16px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 10,
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#86efac", fontWeight: 700 }}>
              Password reset successful
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(134,239,172,0.75)" }}>
              You can now sign in with your new password.
            </p>
          </div>
          <a
            href="/login"
            style={{
              display: "inline-block", padding: "12px 24px",
              fontSize: 14, fontWeight: 700,
              background: "rgba(98,197,209,0.15)",
              border: "1px solid rgba(98,197,209,0.35)",
              borderRadius: 10, cursor: "pointer",
              color: "#62c5d1", textDecoration: "none",
            }}
          >
            Sign in
          </a>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#f0f4ff", letterSpacing: -0.5 }}>
              Saabai<span style={{ color: "#62c5d1" }}>.ai</span>
            </span>
          </a>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: "rgba(240,244,255,0.5)", marginTop: 8, letterSpacing: 1, textTransform: "uppercase" }}>
            Set new password
          </h1>
        </div>

        {error && (
          <div style={{
            marginBottom: 20, padding: "10px 14px",
            background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {!token ? (
          <div>
            <p style={{ fontSize: 13, color: "rgba(240,244,255,0.5)", textAlign: "center", marginBottom: 16 }}>
              Invalid or missing reset token. Please request a new password reset.
            </p>
            <a
              href="/forgot-password"
              style={{
                display: "block", textAlign: "center", padding: "12px",
                fontSize: 13, fontWeight: 600,
                background: "rgba(98,197,209,0.15)",
                border: "1px solid rgba(98,197,209,0.35)",
                borderRadius: 10, textDecoration: "none",
                color: "#62c5d1",
              }}
            >
              Request new reset link
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New password</label>
              <input
                type="password"
                required
                minLength={8}
                autoFocus
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(98,197,209,0.55)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(98,197,209,0.2)"; }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Re-enter your new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              }}
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}
      </Card>
    </PageContainer>
  );
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628 0%, #0e2554 50%, #0a1628 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", maxWidth: 400,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(98,197,209,0.1)",
      borderRadius: 20, padding: "40px 36px", backdropFilter: "blur(20px)",
      textAlign: "center",
    }}>
      {children}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <Card>
          <p style={{ fontSize: 13, color: "rgba(240,244,255,0.5)" }}>Loading...</p>
        </Card>
      </PageContainer>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
