"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { Lock, Mail, Check } from "lucide-react";
import { UI, FONT_DISPLAY, FONT_UI } from "../client/_ui/primitives";

/**
 * Wholesale Homes: choose a password from an emailed link (welcome or reset),
 * or request a reset link when there's no token.
 */
function SetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const isWelcome = params.get("welcome") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) setDone(true);
      else setError((await res.json().catch(() => ({}))).error || "This link is invalid or has expired.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) setDone(true);
      else setError("Please enter a valid email address.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-xl bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#0891b2]";
  const inputStyle = { border: `1px solid ${UI.hair}`, color: UI.ink };
  const title = token ? (isWelcome ? "Choose your password" : "Set a new password") : "Reset your password";

  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: FONT_UI }}>
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 30, letterSpacing: "-0.02em", color: UI.ink, margin: 0 }}>{title}</h1>

          {done ? (
            <div className="mt-6 rounded-xl px-4 py-4 text-sm" style={{ background: "#ecf8f1", color: "#1d6b46" }}>
              <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" /> {token ? "Password saved" : "Check your inbox"}</p>
              <p className="mt-1.5">
                {token
                  ? "You can now sign in with your email and new password."
                  : "If that email belongs to a Wholesale Homes client account, a reset link is on its way. It works once and expires in 1 hour."}
              </p>
              {token && (
                <a href="/client-login" className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: UI.teal }}>
                  Sign in
                </a>
              )}
            </div>
          ) : token ? (
            <form onSubmit={submitPassword} className="mt-6 space-y-4">
              <p className="text-sm" style={{ color: UI.muted }}>At least 8 characters.</p>
              {[["New password", password, setPassword], ["Confirm password", confirm, setConfirm]].map(([label, value, set]) => (
                <div key={label as string}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: UI.muted }}>{label as string}</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.faint }} />
                    <input type="password" required minLength={8} autoComplete="new-password" value={value as string}
                      onChange={(e) => (set as (v: string) => void)(e.target.value)} className={input} style={inputStyle} />
                  </div>
                </div>
              ))}
              {error && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "#fdecec", color: UI.red }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: UI.teal }}>
                {loading ? "Saving..." : "Save password"}
              </button>
            </form>
          ) : (
            <form onSubmit={requestLink} className="mt-6 space-y-4">
              <p className="text-sm" style={{ color: UI.muted }}>Enter the email you use to sign in and we&apos;ll email you a link to choose a new password.</p>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: UI.muted }}>Email</label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.faint }} />
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} style={inputStyle} />
                </div>
              </div>
              {error && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "#fdecec", color: UI.red }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: UI.teal }}>
                {loading ? "Sending..." : "Email me a reset link"}
              </button>
              <p className="text-center text-xs"><a href="/client-login" style={{ color: UI.teal }} className="hover:underline">Back to sign in</a></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}
