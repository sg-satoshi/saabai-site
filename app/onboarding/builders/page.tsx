"use client";

import { useState } from "react";
import Image from "next/image";

const SERVICES = [
  "New home builds",
  "Knockdown rebuilds",
  "Renovations / extensions",
  "Dual occupancy / duplexes",
  "Commercial construction",
  "Fit-outs",
  "Decks / patios / outdoor structures",
];

const CONTACT_CHANNELS = [
  "Website contact form",
  "Phone",
  "Email",
  "Facebook / Instagram",
  "Word of mouth / referral",
];

const TOOLS = [
  "CRM",
  "Buildertrend",
  "simPRO",
  "Procore",
  "ServiceM8",
  "CoConstruct",
  "Buildxact",
  "Databuild / Cordell",
  "Google Workspace / Microsoft 365",
  "Xero / MYOB",
];

const AGENT_GOALS = [
  "Engage website visitors and capture their details",
  "Ask qualifying questions to understand the job scope",
  "Provide a rough / ballpark estimate based on info collected",
  "Book a consultation or site visit into your calendar",
  "Answer common questions about your services and process",
  "Follow up leads who haven't responded",
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-2">
        {children}
      </p>
      <div className="w-8 h-px bg-saabai-teal/40" />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-saabai-text leading-snug">
        {label}
        {hint && <span className="block text-xs text-saabai-text-dim font-normal mt-0.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors w-full"
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={4}
      className="bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors w-full resize-none"
    />
  );
}

function Select({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-sm text-saabai-text focus:outline-none focus:border-saabai-teal/60 transition-colors w-full appearance-none cursor-pointer"
    />
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
  other,
  otherValue,
  onOtherChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  other?: boolean;
  otherValue?: string;
  onOtherChange?: (val: string) => void;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-4 h-4 rounded shrink-0 border transition-colors flex items-center justify-center ${
              selected.includes(opt)
                ? "bg-saabai-teal border-saabai-teal"
                : "border-saabai-border bg-saabai-bg group-hover:border-saabai-teal/50"
            }`}
          >
            {selected.includes(opt) && (
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 4.5l2.5 2.5L8 1.5" stroke="#0b092e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-saabai-text-muted">{opt}</span>
          <input type="checkbox" className="sr-only" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
        </label>
      ))}
      {other && (
        <div className="flex items-center gap-3 mt-1">
          <div className="w-4 h-4 shrink-0" />
          <input
            type="text"
            placeholder="Something else..."
            value={otherValue || ""}
            onChange={(e) => onOtherChange?.(e.target.value)}
            className="bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors flex-1"
          />
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Business
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [revenue, setRevenue] = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Services
  const [services, setServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [typicalJobValue, setTypicalJobValue] = useState("");
  const [minJobSize, setMinJobSize] = useState("");

  // Enquiry
  const [contactChannels, setContactChannels] = useState<string[]>([]);
  const [otherChannel, setOtherChannel] = useState("");
  const [enquiriesPerWeek, setEnquiriesPerWeek] = useState("");
  const [whoHandles, setWhoHandles] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [frustration, setFrustration] = useState("");

  // Quoting
  const [howTheyQuote, setHowTheyQuote] = useState("");
  const [quoteInfo, setQuoteInfo] = useState("");
  const [timeToQuote, setTimeToQuote] = useState("");
  const [offersEstimate, setOffersEstimate] = useState("");
  const [estimateDetail, setEstimateDetail] = useState("");
  const [pricingVariables, setPricingVariables] = useState("");

  // Tech
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websitePlatform, setWebsitePlatform] = useState("");
  const [tools, setTools] = useState<string[]>([]);

  // Agent scope
  const [agentGoals, setAgentGoals] = useState<string[]>([]);
  const [agentRestrictions, setAgentRestrictions] = useState("");

  // Timeline
  const [urgency, setUrgency] = useState("");
  const [budget, setBudget] = useState("");
  const [anythingElse, setAnythingElse] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: "Building & Construction",
          companyName, contactName, role, location, revenue, teamSize,
          services, otherService, typicalJobValue, minJobSize,
          contactChannels: [...contactChannels, ...(otherChannel ? [otherChannel] : [])],
          enquiriesPerWeek, whoHandles, responseTime, frustration,
          howTheyQuote, quoteInfo, timeToQuote, offersEstimate, estimateDetail, pricingVariables,
          websiteUrl, websitePlatform, tools,
          agentGoals, agentRestrictions,
          urgency, budget, anythingElse,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong — please email us directly at hello@saabai.ai");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-full bg-saabai-teal/15 border border-saabai-teal/30 flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l5 5L20 6" stroke="var(--saabai-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-4">Got it — thank you.</h1>
          <p className="text-base text-saabai-text-muted leading-relaxed mb-8">
            We&apos;ll review your answers and come back to you within 1 business day with a clear picture of what&apos;s possible.
          </p>
          <a href="https://saabai.ai" className="text-sm text-saabai-teal hover:text-saabai-teal-bright transition-colors">
            ← Back to saabai.ai
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* Header */}
      <div className="border-b border-saabai-border px-8 py-5 flex items-center justify-between">
        <a href="/">
          <Image src="/brand/saabai-logo.png" alt="Saabai.ai" width={90} height={25} />
        </a>
        <p className="text-xs text-saabai-text-dim tracking-wide">Confidential · Takes 10–15 min</p>
      </div>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
          Building & Construction · AI Agent Fact Find
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5 leading-snug">
          Help us understand how<br />your build business works.
        </h1>
        <p className="text-base text-saabai-text-muted leading-relaxed max-w-lg mx-auto">
          Your answers let us skip the small talk and get straight to what matters — a clear picture of where your business is losing time and exactly what we&apos;d automate. Takes around 10–15 minutes.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 pb-24">
        <div className="flex flex-col gap-16">

          {/* 1 — Business */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>01 — Your Business</SectionHeading>
            <div className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Company name">
                  <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Apex Constructions" />
                </Field>
                <Field label="Your name">
                  <Input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Smith" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Your role">
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Owner / Director / Manager" />
                </Field>
                <Field label="Location — suburb, city or state">
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Sydney, NSW" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Approximate annual revenue">
                  <Select value={revenue} onChange={(e) => setRevenue(e.target.value)}>
                    <option value="">Select range</option>
                    <option>Under $1M</option>
                    <option>$1M – $3M</option>
                    <option>$3M – $10M</option>
                    <option>$10M+</option>
                  </Select>
                </Field>
                <Field label="Team size — include trades, admin, PMs">
                  <Input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} placeholder="e.g. 8" />
                </Field>
              </div>
            </div>
          </div>

          {/* 2 — Services */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>02 — Services You Offer</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="What types of work do you do?">
                <CheckboxGroup
                  options={SERVICES}
                  selected={services}
                  onChange={setServices}
                  other
                  otherValue={otherService}
                  onOtherChange={setOtherService}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Typical job value" hint="Ballpark is fine">
                  <Input value={typicalJobValue} onChange={(e) => setTypicalJobValue(e.target.value)} placeholder="e.g. $350,000" />
                </Field>
                <Field label="Minimum job size you'll quote">
                  <Input value={minJobSize} onChange={(e) => setMinJobSize(e.target.value)} placeholder="e.g. $50,000" />
                </Field>
              </div>
            </div>
          </div>

          {/* 3 — Enquiry Process */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>03 — How Enquiries Come In</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How do customers currently contact you?">
                <CheckboxGroup
                  options={CONTACT_CHANNELS}
                  selected={contactChannels}
                  onChange={setContactChannels}
                  other
                  otherValue={otherChannel}
                  onOtherChange={setOtherChannel}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Enquiries per week (roughly)">
                  <Input value={enquiriesPerWeek} onChange={(e) => setEnquiriesPerWeek(e.target.value)} placeholder="e.g. 5–10" />
                </Field>
                <Field label="Who handles initial enquiries?">
                  <Input value={whoHandles} onChange={(e) => setWhoHandles(e.target.value)} placeholder="e.g. Me, office admin" />
                </Field>
              </div>
              <Field label="How quickly do you typically respond?">
                <Select value={responseTime} onChange={(e) => setResponseTime(e.target.value)}>
                  <option value="">Select</option>
                  <option>Same day</option>
                  <option>Within 24 hours</option>
                  <option>2–3 days</option>
                  <option>Longer</option>
                </Select>
              </Field>
              <Field label="What's the biggest frustration with your current enquiry process?">
                <Textarea value={frustration} onChange={(e) => setFrustration(e.target.value)} placeholder="e.g. Too many tyre-kickers, slow response times, leads falling through the cracks..." />
              </Field>
            </div>
          </div>

          {/* 4 — Quoting */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>04 — How You Quote</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How do you currently produce quotes?">
                <Select value={howTheyQuote} onChange={(e) => setHowTheyQuote(e.target.value)}>
                  <option value="">Select</option>
                  <option>I do it myself</option>
                  <option>Office / admin staff</option>
                  <option>Estimator</option>
                  <option>Software</option>
                  <option>Combination of the above</option>
                </Select>
              </Field>
              <Field label="What do you need from a customer to produce a quote?" hint="Job type, size in m², location, site conditions, finishes level, land details — anything you'd normally ask">
                <Textarea value={quoteInfo} onChange={(e) => setQuoteInfo(e.target.value)} placeholder="e.g. Job type, approx m², location, site conditions, finishes level (standard / mid / premium), council area, existing structure..." />
              </Field>
              <Field label="How long does it typically take you to produce a quote after an enquiry?">
                <Input value={timeToQuote} onChange={(e) => setTimeToQuote(e.target.value)} placeholder="e.g. 3–5 business days" />
              </Field>
              <Field label="Do you offer a preliminary / ballpark estimate before a full quote?">
                <Select value={offersEstimate} onChange={(e) => setOffersEstimate(e.target.value)}>
                  <option value="">Select</option>
                  <option>Yes — we're comfortable giving rough $/m² or $/project ranges</option>
                  <option>Sometimes — depends on the job</option>
                  <option>No — we only quote after a site visit</option>
                </Select>
              </Field>
              {offersEstimate && offersEstimate !== "No — we only quote after a site visit" && (
                <Field label="What does a ballpark estimate look like for your most common job type?" hint="e.g. A standard 200m² new build runs $X–$Y per m² depending on finishes">
                  <Textarea value={estimateDetail} onChange={(e) => setEstimateDetail(e.target.value)} placeholder="e.g. A standard renovation runs $2,500–$3,500/m² depending on scope and finishes. New builds in our area range from $2,800–$4,500/m²..." />
                </Field>
              )}
              <Field label="What are the main variables that affect your pricing?" hint="e.g. site conditions, finishes level, access, location, inclusions">
                <Textarea value={pricingVariables} onChange={(e) => setPricingVariables(e.target.value)} placeholder="e.g. Site slope and access, distance from CBD, finishes specification, demolition required, council area, structural complexity..." />
              </Field>
            </div>
          </div>

          {/* 5 — Tech */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>05 — Website & Tools</SectionHeading>
            <div className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Website URL">
                  <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com.au" />
                </Field>
                <Field label="Website platform">
                  <Input value={websitePlatform} onChange={(e) => setWebsitePlatform(e.target.value)} placeholder="WordPress, Wix, Squarespace, custom..." />
                </Field>
              </div>
              <Field label="Software and tools you currently use">
                <CheckboxGroup options={TOOLS} selected={tools} onChange={setTools} />
              </Field>
            </div>
          </div>

          {/* 6 — Agent Scope */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>06 — What the Agent Needs to Handle</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="Tick everything that applies to your business">
                <CheckboxGroup options={AGENT_GOALS} selected={agentGoals} onChange={setAgentGoals} />
              </Field>
              <Field label="Is there anything specific the agent should NOT do or say?" hint="e.g. never quote for commercial work, always require a site visit before confirming any price">
                <Textarea value={agentRestrictions} onChange={(e) => setAgentRestrictions(e.target.value)} placeholder="Optional — leave blank if none" />
              </Field>
            </div>
          </div>

          {/* 7 — Timeline & Budget */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>07 — Timeline & Budget</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How urgently do you want this running?">
                <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="">Select</option>
                  <option>ASAP</option>
                  <option>Within 4–6 weeks</option>
                  <option>Next quarter</option>
                  <option>Just exploring for now</option>
                </Select>
              </Field>
              <Field label="Do you have a rough budget in mind?">
                <Select value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="">Select</option>
                  <option>Not yet — waiting to understand the scope</option>
                  <option>Under $5,000</option>
                  <option>$5,000 – $15,000</option>
                  <option>$15,000+</option>
                  <option>Prefer to discuss</option>
                </Select>
              </Field>
              <Field label="Anything we haven't covered?">
                <Textarea value={anythingElse} onChange={(e) => setAnythingElse(e.target.value)} placeholder="Optional — any context that might be useful before we speak" />
              </Field>
            </div>
          </div>

          {/* Submit */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !companyName || !contactName}
            className="w-full bg-saabai-teal text-saabai-bg px-8 py-4 rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: "0 0 32px rgba(98,197,209,0.3)" }}
          >
            {submitting ? "Sending…" : "Send My Answers →"}
          </button>
          <p className="text-xs text-saabai-text-dim text-center -mt-8">
            We&apos;ll review your answers and come back within 1 business day with a tailored scope of what we&apos;d build.
          </p>

        </div>
      </form>

    </div>
  );
}
