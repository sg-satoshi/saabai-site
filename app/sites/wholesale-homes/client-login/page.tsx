"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { Eye, EyeOff, Lock, Mail, Check } from "lucide-react";
import { AUTH_KEY, saveJSON } from "../_lib/portal";
import { UI, FONT_DISPLAY, FONT_UI } from "../client/_ui/primitives";
import { RISE_CSS } from "../client/_ui/tearsheet";

export default function ClientLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/wholesale-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        saveJSON(AUTH_KEY, { email: email.trim(), loggedInAt: Date.now() });
        router.push("/client/dashboard");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: FONT_UI }}>
      <style>{RISE_CSS}</style>
      <Header />
      <main className="flex flex-1">
        <div className="grid w-full lg:grid-cols-2">

          {/* ── Exclusivity panel ── */}
          <div className="wh-rise relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center" style={{ background: UI.heroInk, color: "#e8efe9", padding: "clamp(40px,6vw,80px)" }}>
            <div aria-hidden style={{ position: "absolute", top: -160, right: -90, width: 480, height: 480, background: "radial-gradient(circle, rgba(8,145,178,0.36), rgba(8,145,178,0) 66%)", pointerEvents: "none" }} />
            <div aria-hidden style={{ position: "absolute", bottom: -180, left: -90, width: 420, height: 420, background: "radial-gradient(circle, rgba(20,160,120,0.15), rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.045, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

            <div style={{ position: "relative", maxWidth: 460 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "rgba(232,239,233,0.08)", padding: "6px 14px", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(103,197,214,0.9)" }}>
                <Lock style={{ height: 12, width: 12 }} /> Members only — private access
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(30px,3.2vw,44px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "18px 0 0" }}>
                Property most buyers never see.
              </h1>
              <p style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.65, color: "rgba(232,239,233,0.68)" }}>
                Sign in to browse pre-market house and land packages, run the numbers with our built-in calculators, and track your purchase — all reserved for approved clients only.
              </p>
              <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
                {["Priced below bank valuation", "Pre-market inventory, never publicly listed", "Investment calculators built for every package"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", height: 20, width: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(103,197,214,0.14)" }}>
                      <Check style={{ height: 11, width: 11, color: "#67c5d6" }} />
                    </div>
                    <span style={{ fontSize: 13.5, color: "rgba(232,239,233,0.85)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Form ── */}
          <div className="flex items-center justify-center px-6 py-16 lg:py-24" style={{ background: UI.bone }}>
            <div className="wh-rise w-full max-w-md" style={{ animationDelay: "60ms" }}>
              <div style={{ background: UI.boneCard, border: `1px solid ${UI.hair}`, borderRadius: 24, padding: "36px 32px", boxShadow: "0 1px 2px rgba(16,24,40,0.03), 0 16px 40px -28px rgba(16,24,40,0.4)" }}>
                <div className="mb-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${UI.teal}14` }}>
                    <Lock className="h-5 w-5" style={{ color: UI.teal }} />
                  </div>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", color: UI.ink, margin: "16px 0 0" }}>Client Login</h2>
                  <p style={{ marginTop: 6, fontSize: 13.5, color: UI.faintInk }}>Access your portal to run the numbers and track your purchase.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: UI.muted }}>Email</label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.faint }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2]"
                        style={{ border: `1px solid ${UI.hair}`, color: UI.ink }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: UI.muted }}>Password</label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.faint }} />
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full rounded-xl bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-[#0891b2]"
                        style={{ border: `1px solid ${UI.hair}`, color: UI.ink }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: UI.faint }}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "#fdecec", color: UI.red }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                    style={{ background: UI.teal }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.background = UI.tealDk)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = UI.teal)}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs" style={{ color: UI.faintInk }}>
                  Don&apos;t have access yet?{" "}
                  <a href="/client/register" style={{ color: UI.teal }} className="hover:underline">Request access</a>
                  {" "}or{" "}
                  <a href="/contact" style={{ color: UI.teal }} className="hover:underline">contact your advisor</a>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
