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
  transition: "border-color 0.15s",
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

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(98,197,209,0.55)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(98,197,209,0.2)";
}

export default function LoginForm({
  redirectTo,
  isInvalid,
  registered,
  regError,
}: {
  redirectTo: string;
  isInvalid: boolean;
  registered: boolean;
  regError: string;
}) {
  const [view, setView] = useState<"login" | "request">("login");
  const [showSuccess, setShowSuccess] = useState(registered);

  if (showSuccess) {
    return (
      <div>
        <div style={{
          marginBottom: 24,
          padding: "14px 16px",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 10,
          textAlign: "center",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#86efac", fontWeight: 700 }}>Request sent</p>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(134,239,172,0.75)" }}>
            You will receive an email once your access is approved.
          </p>
        </div>
        <button
          onClick={() => setShowSuccess(false)}
          style={{
            width: "100%", padding: "11px",
            fontSize: 13, fontWeight: 600,
            background: "transparent",
            border: "1px solid rgba(98,197,209,0.2)",
            borderRadius: 10, cursor: "pointer",
            color: "rgba(98,197,209,0.7)", fontFamily: "inherit",
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (view === "request") {
    return (
      <form method="POST" action="/api/auth/register">
        <input type="hidden" name="redirect" value={redirectTo} />

        {regError === "exists" && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>
              An account with that email already exists.
            </p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Full name</label>
          <input name="name" type="text" required autoFocus placeholder="Jane Smith" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Work email</label>
          <input name="email" type="email" required placeholder="you@company.com" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Company (optional)</label>
          <input name="company" type="text" placeholder="Acme Ltd" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>

        <button
          type="submit"
          style={{
            width: "100%", padding: "12px",
            fontSize: 14, fontWeight: 700,
            background: "rgba(98,197,209,0.15)",
            border: "1px solid rgba(98,197,209,0.35)",
            borderRadius: 10, cursor: "pointer",
            color: "#62c5d1", letterSpacing: 0.3, fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(98,197,209,0.25)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(98,197,209,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(98,197,209,0.15)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(98,197,209,0.35)";
          }}
        >
          Request access
        </button>

        <p style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "rgba(131,153,192,0.5)" }}>
          Already have access?{" "}
          <button
            type="button"
            onClick={() => setView("login")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(98,197,209,0.6)", fontSize: 12, padding: 0, fontFamily: "inherit" }}
          >
            Sign in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form method="POST" action="/api/auth/login">
      <input type="hidden" name="redirect" value={redirectTo} />

      {isInvalid && (
        <div style={{
          marginBottom: 20,
          padding: "10px 14px",
          background: "rgba(220,38,38,0.1)",
          border: "1px solid rgba(220,38,38,0.25)",
          borderRadius: 10,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 500 }}>
            Incorrect email or password.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email" name="email" type="email"
          autoComplete="email" autoFocus required
          placeholder="you@company.com"
          style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password" name="password" type="password"
          autoComplete="current-password" required
          placeholder="••••••••"
          style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      <button
        type="submit"
        style={{
          width: "100%", padding: "12px",
          fontSize: 14, fontWeight: 700,
          background: "rgba(98,197,209,0.15)",
          border: "1px solid rgba(98,197,209,0.35)",
          borderRadius: 10, cursor: "pointer",
          color: "#62c5d1", letterSpacing: 0.3, fontFamily: "inherit",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(98,197,209,0.25)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(98,197,209,0.5)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(98,197,209,0.15)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(98,197,209,0.35)";
        }}
      >
        Sign in →
      </button>

      <p style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "rgba(131,153,192,0.5)" }}>
        Need access?{" "}
        <button
          type="button"
          onClick={() => setView("request")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(98,197,209,0.6)", fontSize: 12, padding: 0, fontFamily: "inherit" }}
        >
          Request it here
        </button>
      </p>
    </form>
  );
}
