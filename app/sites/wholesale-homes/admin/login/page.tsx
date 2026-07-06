"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";

const ADMIN_KEY = "wholesale_admin_auth";

export default function AdminLogin() {
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
      const res = await fetch("/api/wholesale-admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        localStorage.setItem(ADMIN_KEY, JSON.stringify({ email: email.trim(), loggedInAt: Date.now() }));
        router.push("/admin");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d1b2a", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#162236", borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.06)", padding: "40px 36px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: "0 auto",
            background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: "#fff",
          }}>W</div>
          <p style={{ margin: "16px 0 0", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "#0891b2" }}>
            Admin Portal
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#e8edf5", letterSpacing: "-0.3px" }}>
            Wholesale Homes
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b8299" }}>Email</label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#4a6080" }} />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@wholesalehomes.com.au" required
                style={{
                  width: "100%", padding: "11px 12px 11px 38px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)", background: "#0d1b2a",
                  fontSize: 13, color: "#e8edf5", outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b8299" }}>Password</label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#4a6080" }} />
              <input
                type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password" required
                style={{
                  width: "100%", padding: "11px 38px 11px 38px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)", background: "#0d1b2a",
                  fontSize: 13, color: "#e8edf5", outline: "none",
                }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#4a6080" }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.1)", color: "#ef4444", fontSize: 12 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 999, border: "none",
              background: "#0891b2", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
