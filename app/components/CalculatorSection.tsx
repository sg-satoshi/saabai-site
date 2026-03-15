"use client";

import { useState } from "react";

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

export default function CalculatorSection() {
  const [teamMembers, setTeamMembers] = useState(3);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [hourlyCost, setHourlyCost] = useState(40);

  const weeklyHours  = teamMembers * hoursPerWeek;
  const annualHours  = weeklyHours * 52;
  const annualCost   = annualHours * hourlyCost;

  const inputs = [
    {
      id: "calc-team",
      label: "Team members handling repetitive tasks",
      value: teamMembers,
      min: 1,
      max: 500,
      onChange: (v: number) => setTeamMembers(v),
    },
    {
      id: "calc-hours",
      label: "Hours per week each spends on manual work",
      value: hoursPerWeek,
      min: 1,
      max: 60,
      onChange: (v: number) => setHoursPerWeek(v),
    },
    {
      id: "calc-cost",
      label: "Average hourly cost of that work (AUD)",
      value: hourlyCost,
      min: 1,
      max: 1000,
      onChange: (v: number) => setHourlyCost(v),
    },
  ];

  return (
    <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
      <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
        Free Calculator
      </p>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-5 max-w-2xl mx-auto leading-snug">
        How much is manual work costing your firm?
      </h2>
      <p className="text-base text-saabai-text-muted text-center max-w-xl mx-auto mb-16 leading-relaxed">
        Adjust the sliders to estimate the hidden labour cost of repetitive work across your team.
      </p>

      <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-2xl overflow-hidden">

        {/* Left — Inputs */}
        <div className="bg-saabai-surface p-10 flex flex-col gap-9">
          <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent -mt-10 mb-1" />
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            Your Business
          </p>
          {inputs.map(({ id, label, value, min, max, onChange }) => (
            <div key={id}>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor={id} className="text-sm font-medium text-saabai-text-muted leading-relaxed">
                  {label}
                </label>
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
                  className="w-20 bg-saabai-bg border border-saabai-border rounded-lg px-3 py-1.5 text-base font-semibold text-saabai-text text-center focus:outline-none focus:border-saabai-teal/60 transition-colors appearance-none ml-4 shrink-0"
                  style={{ MozAppearance: "textfield" } as React.CSSProperties}
                />
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--saabai-teal) 0%, var(--saabai-teal) ${((value - min) / (max - min)) * 100}%, var(--saabai-border) ${((value - min) / (max - min)) * 100}%, var(--saabai-border) 100%)`
                }}
              />
            </div>
          ))}
        </div>

        {/* Right — Results */}
        <div className="bg-saabai-surface p-10 flex flex-col justify-between gap-8">
          <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent -mt-10 mb-1" />

          {/* Annual cost — hero */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
              Estimated Annual Labour Cost
            </p>
            <div
              className="text-5xl md:text-6xl font-semibold tracking-tight stat-glow mb-1"
              style={{
                background: "linear-gradient(135deg, var(--saabai-text) 0%, var(--saabai-teal) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {formatCurrency(annualCost)}
            </div>
            <p className="text-sm text-saabai-text-dim">AUD per year in repetitive work</p>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
            {[
              { label: "Hours / week", value: formatHours(weeklyHours) },
              { label: "Hours / year", value: formatHours(annualHours) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-saabai-surface-raised p-5">
                <div className="text-2xl font-semibold tracking-tight text-saabai-teal mb-1">{value}</div>
                <div className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">{label}</div>
              </div>
            ))}
          </div>

          {/* Savings callout */}
          <div className="border-l-2 border-saabai-teal/50 pl-5 py-1">
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Automating just 25–50% of this workload could unlock{" "}
              <span className="text-saabai-teal font-medium">
                {formatCurrency(annualCost * 0.25)}–{formatCurrency(annualCost * 0.5)}
              </span>{" "}
              in annual savings.
            </p>
          </div>

          {/* CTA */}
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-saabai-teal text-saabai-bg px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            See where automation can help →
          </a>
        </div>

      </div>
    </section>
  );
}
