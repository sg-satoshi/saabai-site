"use client";

import { useState } from "react";

export default function AdminLoginForm({
  redirectTo,
  isInvalid,
}: {
  redirectTo: string;
  isInvalid: boolean;
}) {
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
        body: new URLSearchParams({ email, password, redirect: redirectTo }),
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
    <form onSubmit={handleSubmit}>
      {isInvalid && (
        <div style={{
          marginBottom: 16,
          padding: "10px 14px",
          background: "rgba(220,38,38,0.08)",
          border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: 10,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>
            Invalid email or password.
          </p>
        </div>
      )}

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
          textTransform: "uppercase", color: "#525873",
        }}>Email</label>
        <input
          name="email" type="email" required autoFocus
          placeholder="hello@saabai.ai"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "11px 14px", fontSize: 14, color: "#e2e4f0",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, outline: "none", fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: "block", marginBottom: 6,
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
          textTransform: "uppercase", color: "#525873",
        }}>Password</label>
        <input
          name="password" type="password" required
          placeholder="••••••••"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "11px 14px", fontSize: 14, color: "#e2e4f0",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
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
          background: "linear-gradient(135deg, #C9A84C 0%, #E0BC6A 100%)",
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
  );
}
