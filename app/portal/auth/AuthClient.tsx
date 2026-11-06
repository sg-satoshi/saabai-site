"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Exchanges the emailed token with a POST so link scanners that only prefetch the URL cannot use it up. */
export default function AuthClient() {
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState("");

  async function exchange(t: string) {
    try {
      const r = await fetch("/api/portal/blueprint/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      window.location.replace(typeof d.redirect === "string" && d.redirect.startsWith("/") ? d.redirect : "/portal");
    } catch {
      window.location.replace("/portal/login?error=expired");
    }
  }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    if (!t) { setFailed(true); return; }
    setToken(t);
    exchange(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="bp-card" style={{ maxWidth: 420, textAlign: "center" }} role="status">
        {failed ? (
          <>
            <h1 style={{ fontSize: 26 }}>That link is not valid</h1>
            <p className="lead">Request a fresh one and we will email it straight away.</p>
            <Link className="bp-btn" href="/portal/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26 }}>Signing you in...</h1>
            <p className="lead">One moment.</p>
            <noscript><p>Please enable JavaScript to continue.</p></noscript>
            {token && <button className="bp-btn ghost" onClick={() => exchange(token)}>Continue</button>}
          </>
        )}
      </div>
    </div>
  );
}
