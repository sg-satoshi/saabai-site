"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SbNav from "../components/sb/SbNav";
import "../components/sb/score.css";
import "../components/scan/scan.css";
import { SCORE_CONSENT_WORDING } from "@/lib/score-consent";
import { gaEvent } from "@/lib/ga";
import type { ScanReport } from "@/lib/site-scan/types";

export type ScanDetails = { email: string; name: string; industry: string; suburb: string; goal: string; consent: boolean };
const GOALS = ["More leads", "Save time", "Look more professional", "Something else"];
const STEPS = ["Checking your homepage...", "Looking at how Google sees you...", "Checking if ChatGPT and other AI tools can read your site...", "Looking for your reviews and local signals..."];

/** Last steps of /score when the scanner is on: your details, then your website, then the scan. */
export default function ScanSteps({ onDone }: { onDone: (r: ScanReport, d: ScanDetails) => void }) {
  const [phase, setPhase] = useState<"details" | "site" | "scanning">("details");
  const [d, setD] = useState<ScanDetails>({ email: "", name: "", industry: "", suburb: "", goal: GOALS[0], consent: false });
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const set = (k: keyof ScanDetails, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setTick((n) => Math.min(n + 1, STEPS.length - 1)), 4500);
    return () => clearInterval(t);
  }, [phase]);

  const toSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) { setErr("Enter a valid email address so we know where to send your report."); document.getElementById("sx-email")?.focus(); return; }
    if (!d.name.trim()) { setErr("Tell us your business name."); document.getElementById("sx-name")?.focus(); return; }
    setErr(""); setPhase("site");
  };

  const run = async (noWebsite: boolean) => {
    if (!noWebsite && !url.trim()) { setErr("Enter your website address, or choose the option below if you do not have one."); document.getElementById("sx-url")?.focus(); return; }
    setErr(""); setTick(0); setPhase("scanning");
    gaEvent("score_scan_start", { no_website: noWebsite });
    try {
      const res = await fetch("/api/site-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: noWebsite ? "" : url.trim(), noWebsite, email: d.email.trim(), name: d.name, industry: d.industry, suburb: d.suburb, goal: d.goal }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.report) { setErr(j.error || "The scan did not work. Please check the address and try again."); setPhase("site"); return; }
      gaEvent("score_scan_complete", { score: j.report.overall, mode: j.report.mode });
      onDone(j.report, { ...d, email: d.email.trim(), name: d.name.trim() });
    } catch { setErr("The scan did not work. Please try again."); setPhase("site"); }
  };

  return (
    <div className="sb">
      <SbNav minimal right={<Link href="/" className="dim" style={{ fontSize: 14, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", textDecoration: "none" }}>Exit</Link>} />
      <div className="sx-form sx">
        {phase === "details" && (
          <form onSubmit={toSite} noValidate>
            <span className="eyebrow">Step 2 of 3 · your details</span>
            <h2>Last step: tell us a bit about your business so your report fits you.</h2>
            <p className="lead">Then we will check your website for free.</p>
            <label className="f" htmlFor="sx-email">Email<input id="sx-email" type="email" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!err && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())} /></label>
            <label className="f" htmlFor="sx-name">Business name<input id="sx-name" type="text" autoComplete="organization" value={d.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="f" htmlFor="sx-ind">What you do (for example plumber, accountant)<input id="sx-ind" type="text" value={d.industry} onChange={(e) => set("industry", e.target.value)} /></label>
            <label className="f" htmlFor="sx-sub">Suburb or area<input id="sx-sub" type="text" value={d.suburb} onChange={(e) => set("suburb", e.target.value)} /></label>
            <label className="f" htmlFor="sx-goal">Main goal<select id="sx-goal" value={d.goal} onChange={(e) => set("goal", e.target.value)}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="chk"><input type="checkbox" checked={d.consent} onChange={(e) => set("consent", e.target.checked)} /><span>{SCORE_CONSENT_WORDING} <Link href="/privacy" style={{ color: "#c9cdf5" }}>Privacy policy</Link>.</span></label>
            <p className="err" role="alert">{err}</p>
            <button className="go" type="submit">Next →</button>
          </form>
        )}
        {phase === "site" && (
          <form onSubmit={(e) => { e.preventDefault(); void run(false); }} noValidate>
            <span className="eyebrow">Step 3 of 3 · your website</span>
            <h2>Pop in your website and we will check how ready it is for Google and AI search.</h2>
            <p className="lead">About 20 seconds. We only read what is public.</p>
            <label className="f" htmlFor="sx-url">Website address<input id="sx-url" type="text" inputMode="url" autoCapitalize="none" placeholder="yourbusiness.com.au" value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={!!err} /></label>
            <p className="err" role="alert">{err}</p>
            <button className="go" type="submit">Scan my website →</button>
            <button className="skip" type="button" onClick={() => void run(true)}>I don&apos;t have a website yet</button>
            <button className="skip" type="button" onClick={() => setPhase("details")}>← Back</button>
          </form>
        )}
        {phase === "scanning" && (
          <div aria-live="polite">
            <span className="eyebrow">Scanning</span>
            <h2>Checking your website...</h2>
            <ul className="sx-prog">{STEPS.map((s, i) => <li key={s} className={i <= tick ? "on" : ""}><i />{s}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
