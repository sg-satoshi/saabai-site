"use client";

import { useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

function formatHours(h: number) {
  return h.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export default function Calculator() {
  const [teamMembers, setTeamMembers] = useState(3);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [hourlyCost, setHourlyCost] = useState(40);

  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const weeklyHours   = teamMembers * hoursPerWeek;
  const monthlyHours  = Math.round(weeklyHours * 4.33);
  const annualHours   = weeklyHours * 52;

  const weeklyCost  = weeklyHours  * hourlyCost;
  const monthlyCost = monthlyHours * hourlyCost;
  const annualCost  = annualHours  * hourlyCost;

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || emailSubmitting) return;
    setEmailSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "calculator_page",
          calculatorResults: { teamMembers, hoursPerWeek, hourlyCost, weeklyHours, monthlyHours, annualHours, weeklyCost, monthlyCost, annualCost },
          timestamp: new Date().toISOString(),
        }),
      });
      setEmailSubmitted(true);
    } finally {
      setEmailSubmitting(false);
    }
  }

  const inputs = [
    {
      id: "team",
      label: "How many team members regularly handle repetitive tasks?",
      value: teamMembers,
      min: 1,
      max: 500,
      onChange: (v: number) => setTeamMembers(v),
    },
    {
      id: "hours",
      label: "How many hours per week does each person spend on repetitive or manual work?",
      value: hoursPerWeek,
      min: 1,
      max: 60,
      onChange: (v: number) => setHoursPerWeek(v),
    },
    {
      id: "cost",
      label: "What is the average hourly cost of that work? (AUD)",
      value: hourlyCost,
      min: 1,
      max: 1000,
      onChange: (v: number) => setHourlyCost(v),
    },
  ];

  const timeResults = [
    { label: "Weekly repetitive work",  value: formatHours(weeklyHours),  unit: "hours" },
    { label: "Monthly repetitive work", value: formatHours(monthlyHours), unit: "hours" },
    { label: "Annual repetitive work",  value: formatHours(annualHours),  unit: "hours" },
  ];

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/calculator" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-20 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)"
        }} />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            Free Tool · Instant Estimate · No Sign-Up Required
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-5xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          How Much Is Repetitive Work
          <br />
          <span className="text-gradient">Really Costing Your Business?</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-5 leading-relaxed">
          Estimate how many hours and labour costs may be tied up in repetitive
          manual work across your business.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-14 leading-relaxed">
          This simple calculator provides an indicative estimate of the
          operational time and cost that automation could help reduce.
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Calculator ──────────────────────────────────────────────────── */}
      <section className="py-8 px-6 max-w-3xl mx-auto">

        {/* Inputs */}
        <div className="bg-saabai-surface border border-saabai-border-accent rounded-2xl overflow-hidden mb-6" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {/* Card top accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />

          <div className="p-10 flex flex-col gap-10">
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
              Your Business
            </p>

            {inputs.map(({ id, label, value, min, max, onChange }) => (
              <div key={id}>
                <label
                  htmlFor={id}
                  className="block text-base font-medium text-saabai-text-muted mb-4 leading-relaxed"
                >
                  {label}
                </label>
                <div className="flex items-center gap-5">
                  {/* Number input */}
                  <input
                    id={id}
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => {
                      const v = Math.max(min, Number(e.target.value) || min);
                      onChange(v);
                    }}
                    className="w-28 bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-xl font-semibold text-saabai-text text-center focus:outline-none focus:border-saabai-teal/60 transition-colors appearance-none"
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  {/* Slider */}
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--saabai-teal) 0%, var(--saabai-teal) ${((value - min) / (max - min)) * 100}%, var(--saabai-border) ${((value - min) / (max - min)) * 100}%, var(--saabai-border) 100%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-4">

          {/* Time results */}
          <div className="grid grid-cols-3 gap-px bg-saabai-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.35), 0 0 24px rgba(98,197,209,0.2)" }}>
            {timeResults.map(({ label, value, unit }) => (
              <div key={label} className="bg-saabai-surface p-8 relative">
                <div className="h-px absolute top-0 left-0 right-0 bg-gradient-to-r from-transparent via-saabai-teal/25 to-transparent" />
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-saabai-teal stat-glow mb-1">
                  {value}
                </div>
                <div className="text-xs text-saabai-text-dim tracking-wide mb-3">{unit}</div>
                <div className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase leading-snug">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Annual cost — hero result */}
          <div className="bg-saabai-surface border border-saabai-border-accent rounded-2xl overflow-hidden relative" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.35), 0 0 24px rgba(98,197,209,0.2)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/60 to-transparent" />
            <div className="p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
                  Estimated Annual Labour Cost in Repetitive Work
                </p>
                <div
                  className="text-5xl md:text-6xl font-semibold tracking-tight stat-glow"
                  style={{
                    background: "linear-gradient(135deg, var(--saabai-text) 0%, var(--saabai-teal) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {formatCurrency(annualCost)}
                </div>
                <p className="text-sm text-saabai-text-dim mt-2">AUD per year</p>
              </div>
              <div className="md:text-right md:max-w-xs">
                <p className="text-sm text-saabai-text-dim leading-relaxed">
                  Based on {formatHours(annualHours)} hrs/yr across{" "}
                  {teamMembers} team member{teamMembers !== 1 ? "s" : ""} at{" "}
                  {formatCurrency(hourlyCost)}/hr
                </p>
              </div>
            </div>
          </div>

          {/* Weekly / monthly costs — supporting */}
          <div className="grid grid-cols-2 gap-px bg-saabai-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.35), 0 0 24px rgba(98,197,209,0.2)" }}>
            {[
              { label: "Weekly labour cost", value: formatCurrency(weeklyCost) },
              { label: "Monthly labour cost", value: formatCurrency(monthlyCost) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-saabai-surface p-8">
                <div className="text-2xl font-semibold tracking-tight text-saabai-teal mb-1">{value}</div>
                <div className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">{label}</div>
              </div>
            ))}
          </div>

          {/* Email capture */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
            <div className="p-6">
              {emailSubmitted ? (
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-saabai-teal/20 flex items-center justify-center shrink-0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1 5.5l3 3L10 1.5" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-sm text-saabai-text-muted">Your estimate is on its way — check your inbox.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-saabai-text mb-1">
                    Email me my results
                  </p>
                  <p className="text-xs text-saabai-text-dim mb-4 leading-relaxed">
                    We&apos;ll send your {formatCurrency(annualCost)} estimate straight to your inbox.
                  </p>
                  <form onSubmit={submitEmail} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 min-w-0 bg-saabai-bg border border-saabai-border rounded-xl px-4 py-2.5 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={emailSubmitting}
                      className="shrink-0 bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-saabai-teal-bright transition-colors disabled:opacity-40"
                    >
                      {emailSubmitting ? "…" : "Send"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Insight block */}
          <div className="border-l-2 border-saabai-teal/50 pl-6 py-2 mt-2">
            <p className="text-base text-saabai-text-muted leading-relaxed mb-2">
              If a meaningful portion of this work can be automated, the
              potential time and cost savings can be substantial. Saabai helps
              businesses identify where automation can create the biggest
              operational leverage.
            </p>
            <p className="text-sm text-saabai-text-dim leading-relaxed">
              Even automating 25%–50% of this workload could unlock{" "}
              <span className="text-saabai-teal font-medium">
                {formatHours(annualHours * 0.25)}–{formatHours(annualHours * 0.5)} hours
              </span>{" "}
              and{" "}
              <span className="text-saabai-teal font-medium">
                {formatCurrency(annualCost * 0.25)}–{formatCurrency(annualCost * 0.5)}
              </span>{" "}
              in annual savings.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border mt-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)"
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Next Step
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Find out how much of this
          <br />
          <span className="text-gradient">your firm could recover.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map the highest-value
          automation opportunities in your operation — no obligation.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      <Footer />

    </div>
  );
}
