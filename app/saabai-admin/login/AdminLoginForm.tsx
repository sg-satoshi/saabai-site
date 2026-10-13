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
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password, redirect: redirectTo, admin: "1" }),
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) setError(data.error || "Invalid email or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="f" style={{ marginTop: 22 }}>
      {(isInvalid || error) && (
        <p className="err" role="alert">
          {error || "Invalid email or password."}
        </p>
      )}
      <div style={{ marginTop: 16 }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoFocus autoComplete="username" placeholder="hello@saabai.ai" className="fi-real" />
      </div>
      <div style={{ marginTop: 14 }}>
        <label htmlFor="password">
          Password
          <a href="mailto:hello@saabai.ai">Need a reset?</a>
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="fi-real" />
      </div>
      <button type="submit" className="gbtn" disabled={loading}>
        {loading ? "Signing in..." : "Continue"}
      </button>
      <p className="fine">
        <svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>
        2FA is required for every admin. After your password you will enter a code from your authenticator app.
      </p>
    </form>
  );
}
