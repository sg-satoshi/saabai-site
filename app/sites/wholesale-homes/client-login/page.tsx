"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { AUTH_KEY, saveJSON } from "../_lib/portal";

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-sm md:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0891b2]/10">
                <Lock className="h-5 w-5 text-[#0891b2]" />
              </div>
              <h1 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">Client Login</h1>
              <p className="mt-1.5 text-sm text-[#5C6670]">Access your portal to track your purchase.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2] md:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-[#0891b2] md:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#5C6670]"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] disabled:opacity-60 md:text-base"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#9CA3AF] md:text-sm">
              Don&apos;t have access yet?{" "}
              <a href="/client/register" className="text-[#0891b2] hover:underline">Request access</a>
              {" "}or{" "}
              <a href="/contact" className="text-[#0891b2] hover:underline">contact your advisor</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
