"use client";

export default function LoginForm({
  redirectTo,
  isInvalid,
}: {
  redirectTo: string;
  isInvalid: boolean;
}) {
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

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "rgba(98,197,209,0.55)";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "rgba(98,197,209,0.2)";
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
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@company.com"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "12px",
          fontSize: 14,
          fontWeight: 700,
          background: "rgba(98,197,209,0.15)",
          border: "1px solid rgba(98,197,209,0.35)",
          borderRadius: 10,
          cursor: "pointer",
          color: "#62c5d1",
          letterSpacing: 0.3,
          fontFamily: "inherit",
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
    </form>
  );
}
