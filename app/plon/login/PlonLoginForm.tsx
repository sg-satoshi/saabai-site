"use client";

import { useState } from "react";

const orange = "#e13f00";
const orangeLight = "#fff5f2";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  fontSize: 14,
  color: "#1a1a1a",
  background: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#666",
};

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = orange;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${orangeLight}`;
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#e5e5e5";
  e.currentTarget.style.boxShadow = "none";
}

export default function PlonLoginForm({
  redirectTo,
  isInvalid,
}: {
  redirectTo: string;
  isInvalid: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirect: redirectTo }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && data.error) {
        setError(data.error);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, margin: "0 auto 20px",
          borderRadius: "50%", background: orangeLight,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>
          Check your inbox
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666", lineHeight: 1.6 }}>
          We sent a magic link to <strong style={{ color: "#1a1a1a" }}>{email}</strong>.<br />
          Click it to sign in — valid for 15 minutes.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          style={{
            fontSize: 13, fontWeight: 600, color: orange,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {isInvalid && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
            Invalid or expired link. Please request a new one.
          </p>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <input type="hidden" name="redirect" value={redirectTo} />

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Email address</label>
        <input
          name="email"
          type="email"
          required
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          background: orange,
          border: "none",
          borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Sending link..." : "Send magic link →"}
      </button>

      <p style={{
        margin: "16px 0 0",
        fontSize: 12, color: "#999", textAlign: "center", lineHeight: 1.5,
      }}>
        No password needed. We will email you a secure sign-in link.
      </p>
    </form>
  );
}
