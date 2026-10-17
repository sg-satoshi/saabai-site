"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SbNav from "../components/sb/SbNav";
import SbFooter from "../components/sb/SbFooter";
import "../components/sb/score.css";
import { CATEGORIES, QUESTIONS, TIERS, scoreAnswers } from "@/lib/blueprint";
import { gaEvent } from "@/lib/ga";
import { SCORE_CONSENT_WORDING } from "@/lib/score-consent";
import { ARROW_DESKTOP, ARROW_MOBILE } from "./arrowSvg";
import ReportView from "../components/scan/ReportView";
import ScanSteps, { type ScanDetails } from "./ScanSteps";
import type { ScanReport } from "@/lib/site-scan/types";

/** Brush arrow from the recommended card down to the PDF box. Draws once when scrolled into view (no animation for reduced motion, see score.css). */
function ScoreArrow() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setGo(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setGo(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`arrowgap${go ? " go" : ""}`} aria-hidden="true">
      <div className="arrow-wrap" dangerouslySetInnerHTML={{ __html: ARROW_DESKTOP + ARROW_MOBILE }} />
    </div>
  );
}

export default function ScorePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  // Website scan step: only when the flag is on (or an admin is signed in). Otherwise the page is exactly as before.
  const [scanOn, setScanOn] = useState(false);
  const [scanPhase, setScanPhase] = useState(false);
  const [scan, setScan] = useState<{ report: ScanReport; details: ScanDetails } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/site-scan/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.enabled === true) setScanOn(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const restart = () => { setAnswers({}); setStep(0); setDone(false); setScanPhase(false); setScan(null); };
  if (scanPhase && !done) return <ScanSteps onDone={(report, details) => { setScan({ report, details }); setDone(true); setScanPhase(false); window.scrollTo({ top: 0 }); }} />;
  if (done) return <Result answers={answers} scan={scan} onRestart={restart} />;

  const q = QUESTIONS[step];
  const total = QUESTIONS.length;
  const catIdx = CATEGORIES.findIndex((c) => c.id === q.category);
  const selected = answers[q.id];
  const left = Math.max(1, Math.round(((total - step) * 15) / 60));

  const next = () => {
    if (selected === undefined) return;
    if (step + 1 >= total) {
      if (scanOn) setScanPhase(true); else setDone(true);
      window.scrollTo({ top: 0 });
    } else setStep(step + 1);
  };

  return (
    <div className="sb">
      <SbNav minimal right={<Link href="/" className="dim" style={{ fontSize: 14, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", textDecoration: "none" }}>Exit</Link>} />
      <div style={{ position: "relative" }}>
        <div className="glow" style={{ opacity: 0.6 }} />
        <div className="qwrap">
          <span className="eyebrow">AI Readiness Score · small businesses and professional practices</span>
          <div className="prog" style={{ marginTop: 18 }}>
            <span>Question {step + 1} of {total}</span>
            <span>About {left} minute{left > 1 ? "s" : ""} left</span>
          </div>
          <div className="qbar"><i style={{ width: `${Math.round(((step + 1) / total) * 100)}%` }} /></div>
          <div className="cats">
            {CATEGORIES.map((c, i) => (
              <span key={c.id} className={i === catIdx ? "on" : i < catIdx ? "done" : ""}>{i < catIdx ? "✓ " : ""}{c.label}</span>
            ))}
          </div>
          <h2 style={{ marginTop: 40, fontSize: 34 }}>{q.q}</h2>
          <p style={{ marginTop: 10 }}>Pick the one closest to how it usually works.</p>
          <div style={{ marginTop: 24 }} role="radiogroup" aria-label={q.q}>
            {q.options.map((o, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={selected === i}
                key={o.label}
                className={`opt${selected === i ? " sel" : ""}`}
                onClick={() => { if (Object.keys(answers).length === 0) gaEvent("score_quiz_start", { quiz: "ai_readiness" }); setAnswers({ ...answers, [q.id]: i }); }}
              >
                <span className="r" />
                <div>{o.label}<small>{o.hint}</small></div>
              </button>
            ))}
          </div>
          <div className="navb">
            <button type="button" className="btn ghost" disabled={step === 0} style={step === 0 ? { visibility: "hidden" } : undefined} onClick={() => setStep(Math.max(0, step - 1))}>← Back</button>
            <button type="button" className="btn" onClick={next} disabled={selected === undefined} style={selected === undefined ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
              {step + 1 === total ? "See my score →" : "Next →"}
            </button>
          </div>
          <p className="dim" style={{ fontSize: 13, marginTop: 28, textAlign: "center" }}>Your answers are private. We only use them to calculate your score.</p>
        </div>
      </div>
    </div>
  );
}

function Result({ answers, scan, onRestart }: { answers: Record<string, number>; scan: { report: ScanReport; details: ScanDetails } | null; onRestart: () => void }) {
  const r = useMemo(() => scoreAnswers(answers), [answers]);
  const rec = TIERS[r.recommended];
  useEffect(() => {
    gaEvent("score_quiz_complete", { quiz: "ai_readiness", recommended_tier: r.recommended });
  }, [r.recommended]);
  const [email, setEmail] = useState(scan?.details.email ?? "");
  const [consent, setConsent] = useState(scan?.details.consent ?? false);
  const [fieldError, setFieldError] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Enter a valid email address so we know where to send your PDF.");
      document.getElementById("score-pdf-email")?.focus();
      return;
    }
    setFieldError("");
    setState("sending");
    try {
      const res = await fetch("/api/blueprint/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), answers, pdf: true, consent, pageUrl: window.location.href, ...(scan ? { scanId: scan.report.id, name: scan.details.name, industry: scan.details.industry, suburb: scan.details.suburb, goal: scan.details.goal } : {}) }),
      });
      setState(res.ok ? "sent" : "error");
      if (res.ok) gaEvent("generate_lead", { form: "score_result_email", recommended_tier: r.recommended, pdf: true, marketing_consent: consent });
    } catch {
      setState("error");
    }
  };

  return (
    <div className="sb">
      <SbNav />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <div className="rtop">
            <div className="ring" style={{ background: `conic-gradient(var(--teal) 0 ${r.total}%, #211f55 ${r.total}% 100%)` }}>
              <div><b>{r.total}</b><span>out of 100</span></div>
            </div>
            <div>
              <span className="eyebrow">Your AI Readiness Score</span>
              <h1 style={{ fontSize: 52, marginTop: 14 }}>{r.headline.split(",")[0]},{" "}<span className="grad">{r.headline.split(",").slice(1).join(",").trim()}</span></h1>
              <p style={{ fontSize: 18, marginTop: 16 }}>{r.summary} We estimate <b style={{ color: "#fff" }}>{r.hours}</b> could be automated.</p>
            </div>
          </div>
          <div className="grid2">
            <div className="card">
              <h3>Score breakdown</h3>
              {r.breakdown.map((b) => (
                <div className="row" key={b.id}>
                  <div className="l"><span>{b.label}</span><b>{b.score}</b></div>
                  <div className="track"><i style={{ width: `${b.score}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>Three quick wins for this week</h3>
              {r.wins.map((w, i) => (
                <div className="win" style={{ marginTop: i ? 18 : 20 }} key={w.title}>
                  <span className="n">{i + 1}</span>
                  <div><b>{w.title}</b><p style={{ fontSize: 15 }}>{w.body}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card feat rec" style={{ marginTop: 24 }}>
            <div>
              <span className="pill">Recommended for you</span>
              <h2 style={{ marginTop: 14, fontSize: 32 }}>{rec.name} Blueprint · {rec.priceLabel}</h2>
              <p style={{ marginTop: 8 }}>
                {rec.id === "starter"
                  ? "A fast, practical plan with your top opportunities ranked by hours and dollars saved. No call needed."
                  : rec.id === "pro"
                    ? "Your score suggests several automation opportunities. Pro adds Shane's review and a 30 minute call to prioritise them."
                    : "With several teams, Business adds discovery sessions and a phased 12 month roadmap."}{" "}
                Fee credited if you build within 30 days.
              </p>
              {rec.id !== "starter" && (
                <p className="dim" style={{ fontSize: 14, marginTop: 10 }}>Or start smaller with <a href="/blueprint/checkout?tier=starter">Starter at $497</a></p>
              )}
            </div>
            <a className="btn" href={`/blueprint/checkout?tier=${rec.id}`}>Get my {rec.name} Blueprint →</a>
          </div>
          {scan && (
            <section className="card" style={{ marginTop: 24, padding: 28 }} aria-label="Your website report">
              <ReportView report={scan.report} />
            </section>
          )}
          <ScoreArrow />
          <section className="pdfbox" aria-labelledby="pdfbox-h">
            <div className="pdfbox-copy">
              <span className="pdfbox-tag">Free · your personal report</span>
              <h2 id="pdfbox-h">Get your results as a <u>PDF</u></h2>
              <p className="pdfbox-ben">Your score of {r.total} out of 100, what it means for your business, your three quick wins and your recommended {rec.name} Blueprint, all in one PDF sent to your inbox. Keep it, print it or forward it to your team.</p>
              <ul className="pdfbox-list">
                <li>Your score and breakdown</li>
                <li>What it means, in plain English</li>
                <li>Your three quick wins for this week</li>
                <li>Your {rec.name} Blueprint, priced in AUD</li>
              </ul>
            </div>
            <div className="pdfbox-form">
              <div className="pdfthumb" aria-hidden="true"><b>AI READINESS</b><span className="pr" /><i /><i style={{ width: "70%" }} /><span className="pp" /><em>PDF</em></div>
              {state === "sent" ? (
                <p className="pdfbox-done" role="status">Done. Your PDF is on its way to {email}.</p>
              ) : (
                <form onSubmit={send} noValidate>
                  <label htmlFor="score-pdf-email" className="sr-only">Email address</label>
                  <input
                    id="score-pdf-email"
                    type="email"
                    inputMode="email"
                    placeholder="you@business.com.au"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldError) setFieldError(""); }}
                    autoComplete="email"
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? "score-pdf-err" : undefined}
                  />
                  <p id="score-pdf-err" className="pdfbox-err" aria-live="polite">{fieldError}</p>
                  <label className="pdfbox-chk">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>{SCORE_CONSENT_WORDING} Unsubscribe any time. See our <Link href="/privacy">Privacy Policy</Link>.</span>
                  </label>
                  <button className="pdfbox-btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending..." : "Email me my PDF →"}</button>
                  <p className="pdfbox-fine">One email with your PDF. No spam.</p>
                  {state === "error" && <p className="pdfbox-err" role="alert" style={{ minHeight: 0 }}>Could not send right now. Your results are still shown above, please try again.</p>}
                </form>
              )}
            </div>
          </section>
          <p className="dim" style={{ fontSize: 14, margin: "22px 0 96px", textAlign: "center" }}>
            Not now? <button type="button" className="linkbtn" onClick={onRestart}>Retake the quiz</button>
          </p>
        </div>
      </div>
      <SbFooter />
    </div>
  );
}
