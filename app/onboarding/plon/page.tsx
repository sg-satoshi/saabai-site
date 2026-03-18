"use client";

import { useState } from "react";
import Image from "next/image";

const PRODUCT_CATEGORIES = [
  "Acrylic — cut to size",
  "Acrylic — full sheets",
  "HDPE — cut to size",
  "HDPE — full sheets",
  "Polycarbonate — cut to size",
  "Polycarbonate — full sheets",
  "Foam PVC (Foamex / Celtec)",
  "PETG",
  "Nylon / Delrin / Engineering plastics",
  "Perspex branded products",
  "Custom fabrication & manufacturing",
  "Signage & display materials",
];

const ENQUIRY_TYPES = [
  "Order status / tracking",
  "Product availability & stock",
  "Cut to size pricing & quoting",
  "Custom fabrication enquiries",
  "Technical / material specifications",
  "Returns & replacements",
  "Account & billing queries",
  "New customer / trade account setup",
  "Bulk / wholesale pricing",
  "Freight & delivery questions",
];

const CONTACT_CHANNELS = [
  "Phone",
  "Website (WooCommerce)",
  "Email",
  "Live chat",
  "Trade counter / walk-in",
  "Sales rep",
];

const AGENT_GOALS = [
  "Answer product & material questions 24/7",
  "Qualify and route sales enquiries to the right person",
  "Provide cut-to-size pricing / instant quotes",
  "Handle order status lookups (WooCommerce)",
  "Capture and log leads into Pipedrive automatically",
  "Save conversation transcripts to Pipedrive contact records",
  "Reduce inbound phone volume for customer service",
  "Upsell / cross-sell related products during conversations",
  "Handle returns and complaints — gather details before escalating",
  "New customer onboarding & trade account enquiries",
];

const PIPEDRIVE_USE = [
  "Logging customer interactions / call notes",
  "Managing sales pipeline & deals",
  "Contact & company records",
  "Activity reminders & follow-ups",
  "Email tracking",
  "Reporting & forecasting",
  "We use it but it's not kept up to date",
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-lg font-semibold tracking-wide text-saabai-teal uppercase mb-3">{children}</p>
      <div className="w-12 h-0.5 bg-saabai-teal/40" />
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
  options, selected, onChange, other, otherValue, onOtherChange,
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
  const allSelected = options.every((o) => selected.includes(o));
  function toggleAll() {
    onChange(allSelected ? selected.filter((s) => !options.includes(s)) : [...new Set([...selected, ...options])]);
  }
  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={toggleAll} className="self-start text-[11px] font-medium text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide mb-1">
        {allSelected ? "Deselect all" : "Select all"}
      </button>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-4 h-4 rounded shrink-0 border-2 transition-colors flex items-center justify-center ${selected.includes(opt) ? "bg-saabai-teal border-saabai-teal" : "border-white/30 bg-saabai-bg group-hover:border-saabai-teal/70"}`}>
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

export default function PlonOnboarding() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Business
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [replyEmail, setReplyEmail] = useState("");

  // Products
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [otherProduct, setOtherProduct] = useState("");
  const [typicalOrderValue, setTypicalOrderValue] = useState("");
  const [topSellingProducts, setTopSellingProducts] = useState("");

  // Enquiry volume
  const [enquiryTypes, setEnquiryTypes] = useState<string[]>([]);
  const [contactChannels, setContactChannels] = useState<string[]>([]);
  const [phoneCallsPerDay, setPhoneCallsPerDay] = useState("");
  const [onlineEnquiriesPerDay, setOnlineEnquiriesPerDay] = useState("");
  const [whoHandles, setWhoHandles] = useState("");
  const [peakPeriods, setPeakPeriods] = useState("");
  const [biggestPain, setBiggestPain] = useState("");

  // Sales
  const [salesProcess, setSalesProcess] = useState("");
  const [quoteProcess, setQuoteProcess] = useState("");
  const [timeToQuote, setTimeToQuote] = useState("");
  const [avgLeadToSale, setAvgLeadToSale] = useState("");
  const [lostLeadReasons, setLostLeadReasons] = useState("");

  // Systems
  const [pipedriveUse, setPipedriveUse] = useState<string[]>([]);
  const [pipedriveHealth, setPipedriveHealth] = useState("");
  const [woocommerceCustom, setWoocommerceCustom] = useState("");
  const [otherTools, setOtherTools] = useState("");

  // Agent scope
  const [agentGoals, setAgentGoals] = useState<string[]>([]);
  const [agentRestrictions, setAgentRestrictions] = useState("");
  const [escalationProcess, setEscalationProcess] = useState("");

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
          industry: "Plastics Distribution & Manufacturing — PlasticOnline",
          contactName, role, replyEmail,
          companyName: "PlasticOnline / Holland Plastics",
          services: [...productCategories, ...(otherProduct ? [otherProduct] : [])],
          typicalJobValue: typicalOrderValue,
          anythingElse: [
            topSellingProducts ? `Top selling products: ${topSellingProducts}` : "",
            `Enquiry types: ${enquiryTypes.join(", ")}`,
            `Contact channels: ${contactChannels.join(", ")}`,
            `Phone calls/day: ${phoneCallsPerDay}`,
            `Online enquiries/day: ${onlineEnquiriesPerDay}`,
            `Who handles: ${whoHandles}`,
            `Peak periods: ${peakPeriods}`,
            `Biggest pain: ${biggestPain}`,
            `Sales process: ${salesProcess}`,
            `Quote process: ${quoteProcess}`,
            `Time to quote: ${timeToQuote}`,
            `Avg lead to sale: ${avgLeadToSale}`,
            `Lost lead reasons: ${lostLeadReasons}`,
            `Pipedrive use: ${pipedriveUse.join(", ")}`,
            `Pipedrive health: ${pipedriveHealth}`,
            `WooCommerce custom: ${woocommerceCustom}`,
            `Other tools: ${otherTools}`,
            `Agent goals: ${agentGoals.join(", ")}`,
            `Agent restrictions: ${agentRestrictions}`,
            `Escalation process: ${escalationProcess}`,
            anythingElse ? `Additional notes: ${anythingElse}` : "",
          ].filter(Boolean).join("\n\n"),
          agentGoals, agentRestrictions,
          urgency, budget,
          websiteUrl: "https://plasticonline.com.au",
          websitePlatform: "WordPress / WooCommerce",
          tools: ["WooCommerce", "Pipedrive", ...( otherTools ? [otherTools] : [])],
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong — please email hello@saabai.ai directly");
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
          <h1 className="text-3xl font-semibold tracking-tight mb-4">Received — thank you.</h1>
          <p className="text-base text-saabai-text-muted leading-relaxed mb-8">
            We&apos;ll review your answers and come back with a clear scope of what we&apos;d build for PlasticOnline — including the agent design, WooCommerce and Pipedrive integrations, and a proposed timeline.
          </p>
          <a href="https://saabai.ai" className="text-sm text-saabai-teal hover:text-saabai-teal-bright transition-colors">← Back to saabai.ai</a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* Header */}
      <div className="border-b border-saabai-border px-8 py-5 flex items-center justify-between">
        <a href="/"><Image src="/brand/saabai-logo.png" alt="Saabai.ai" width={90} height={25} /></a>
        <p className="text-xs text-saabai-text-dim tracking-wide">PlasticOnline · Confidential</p>
      </div>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
          PlasticOnline · PLON · AI Agent Scoping
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5 leading-snug">
          Let&apos;s build something that actually works for your team.
        </h1>
        <p className="text-base text-saabai-text-muted leading-relaxed max-w-lg mx-auto">
          This scoping document helps us design an AI agent tailored to PlasticOnline — one that handles customer service, qualifies sales enquiries, and keeps Pipedrive accurate without anyone lifting a finger. Takes around 15 minutes.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 pb-24">
        <div className="flex flex-col gap-16">

          {/* 01 — Contact */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>01 — Your Details</SectionHeading>
            <div className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Your name">
                  <Input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="Your role">
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="CEO / GM / Operations Manager" />
                </Field>
              </div>
              <Field label="Best email to reply to">
                <Input type="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} placeholder="you@plasticonline.com.au" />
              </Field>
            </div>
          </div>

          {/* 02 — Products */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>02 — Products & Categories</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="Which product categories does the agent need to know inside out?">
                <CheckboxGroup
                  options={PRODUCT_CATEGORIES}
                  selected={productCategories}
                  onChange={setProductCategories}
                  other
                  otherValue={otherProduct}
                  onOtherChange={setOtherProduct}
                />
              </Field>
              <Field label="What are your top 3–5 selling products or SKUs?" hint="Help the agent prioritise what to know best">
                <Textarea value={topSellingProducts} onChange={(e) => setTopSellingProducts(e.target.value)} placeholder="e.g. 3mm Clear Acrylic 1200x900, 6mm HDPE Black, Opal polycarbonate twin-wall sheets..." />
              </Field>
              <Field label="Typical order value — approx. is fine">
                <Input value={typicalOrderValue} onChange={(e) => setTypicalOrderValue(e.target.value)} placeholder="e.g. $150 online, $800+ trade" />
              </Field>
            </div>
          </div>

          {/* 03 — Enquiry Volume */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>03 — Enquiry Volume & Types</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="What types of enquiries does the team handle most often?">
                <CheckboxGroup
                  options={ENQUIRY_TYPES}
                  selected={enquiryTypes}
                  onChange={setEnquiryTypes}
                  other
                  otherValue={undefined}
                  onOtherChange={undefined}
                />
              </Field>
              <Field label="How do customers currently reach you?">
                <CheckboxGroup options={CONTACT_CHANNELS} selected={contactChannels} onChange={setContactChannels} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Approx. phone calls per day">
                  <Input value={phoneCallsPerDay} onChange={(e) => setPhoneCallsPerDay(e.target.value)} placeholder="e.g. 40–60" />
                </Field>
                <Field label="Online / email enquiries per day">
                  <Input value={onlineEnquiriesPerDay} onChange={(e) => setOnlineEnquiriesPerDay(e.target.value)} placeholder="e.g. 20–30" />
                </Field>
              </div>
              <Field label="Who currently handles customer service enquiries?">
                <Input value={whoHandles} onChange={(e) => setWhoHandles(e.target.value)} placeholder="e.g. Dedicated CS team of 3, shared between sales and warehouse..." />
              </Field>
              <Field label="Are there peak periods or busy times?" hint="e.g. end of month, certain seasons, mornings">
                <Input value={peakPeriods} onChange={(e) => setPeakPeriods(e.target.value)} placeholder="e.g. Monday mornings, end of quarter, school holidays..." />
              </Field>
              <Field label="What's the biggest pain in your current customer service process?">
                <Textarea value={biggestPain} onChange={(e) => setBiggestPain(e.target.value)} placeholder="e.g. Too many repetitive calls about order status, staff pulled off productive work to answer the same questions, after-hours enquiries falling through..." />
              </Field>
            </div>
          </div>

          {/* 04 — Sales Process */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>04 — Sales Process</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How does a new B2B / trade customer typically come in and convert?" hint="Walk us through the journey from first contact to first order">
                <Textarea value={salesProcess} onChange={(e) => setSalesProcess(e.target.value)} placeholder="e.g. They call or email, we send a quote, follow up once, they order online or via phone..." />
              </Field>
              <Field label="How are cut-to-size or custom quotes currently produced?">
                <Textarea value={quoteProcess} onChange={(e) => setQuoteProcess(e.target.value)} placeholder="e.g. Customer emails specs, sales team calculates from price sheets, quotes sent via email within X hours..." />
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="How long does a quote typically take?">
                  <Input value={timeToQuote} onChange={(e) => setTimeToQuote(e.target.value)} placeholder="e.g. Same day, 24 hours" />
                </Field>
                <Field label="Avg. time from lead to first order?">
                  <Input value={avgLeadToSale} onChange={(e) => setAvgLeadToSale(e.target.value)} placeholder="e.g. 1–3 days for retail, weeks for trade" />
                </Field>
              </div>
              <Field label="Why do leads typically not convert?" hint="What objections or drop-off points do you see most?">
                <Textarea value={lostLeadReasons} onChange={(e) => setLostLeadReasons(e.target.value)} placeholder="e.g. Price, slow response, went to a competitor, couldn't find the right product..." />
              </Field>
            </div>
          </div>

          {/* 05 — Systems */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>05 — Systems & Integrations</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How is Pipedrive currently being used?">
                <CheckboxGroup options={PIPEDRIVE_USE} selected={pipedriveUse} onChange={setPipedriveUse} />
              </Field>
              <Field label="How would you rate the current state of your Pipedrive data?">
                <Select value={pipedriveHealth} onChange={(e) => setPipedriveHealth(e.target.value)}>
                  <option value="">Select</option>
                  <option>Very clean — records are up to date and complete</option>
                  <option>Mostly good — some gaps but generally reliable</option>
                  <option>Patchy — hit and miss depending on the rep</option>
                  <option>Needs work — lots of incomplete or outdated records</option>
                </Select>
              </Field>
              <Field label="Is your WooCommerce store heavily customised?" hint="e.g. custom pricing rules, product configurators, third-party plugins we should know about">
                <Textarea value={woocommerceCustom} onChange={(e) => setWoocommerceCustom(e.target.value)} placeholder="e.g. Custom cut-to-size calculator plugin, trade pricing tiers, Shippit for freight, Xero integration..." />
              </Field>
              <Field label="Any other tools or software in the stack?">
                <Input value={otherTools} onChange={(e) => setOtherTools(e.target.value)} placeholder="e.g. Xero, Shippit, Klaviyo, Monday.com..." />
              </Field>
            </div>
          </div>

          {/* 06 — Agent Scope */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>06 — Agent Scope</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="What should the agent be responsible for? Tick all that apply.">
                <CheckboxGroup options={AGENT_GOALS} selected={agentGoals} onChange={setAgentGoals} />
              </Field>
              <Field label="What should the agent never do or say?" hint="e.g. never commit to a delivery date, never quote custom fabrication without human approval">
                <Textarea value={agentRestrictions} onChange={(e) => setAgentRestrictions(e.target.value)} placeholder="e.g. Never promise a specific freight cost, never approve a return without escalating to the CS team first..." />
              </Field>
              <Field label="When something needs a human, who should it go to and how?" hint="e.g. complex complaints → CS manager, custom fab enquiries → sales rep via email">
                <Textarea value={escalationProcess} onChange={(e) => setEscalationProcess(e.target.value)} placeholder="e.g. Complaints escalate to the CS team lead via email. Custom fab quotes go to the sales team. Order disputes to operations..." />
              </Field>
            </div>
          </div>

          {/* 07 — Timeline & Budget */}
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-8" style={{ boxShadow: "0 0 40px rgba(98,197,209,0.1)" }}>
            <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent -mt-8 mb-8" />
            <SectionHeading>07 — Timeline & Budget</SectionHeading>
            <div className="flex flex-col gap-6">
              <Field label="How urgently do you want this running?">
                <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="">Select</option>
                  <option>ASAP — this is a priority</option>
                  <option>Within 4–6 weeks</option>
                  <option>Next quarter</option>
                  <option>Just scoping for now</option>
                </Select>
              </Field>
              <Field label="Is there a budget range in mind?">
                <Select value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="">Select</option>
                  <option>Not yet — waiting to understand the scope</option>
                  <option>Under $10,000</option>
                  <option>$10,000 – $25,000</option>
                  <option>$25,000 – $50,000</option>
                  <option>$50,000+</option>
                  <option>Prefer to discuss</option>
                </Select>
              </Field>
              <Field label="Anything else we should know before we scope this out?">
                <Textarea value={anythingElse} onChange={(e) => setAnythingElse(e.target.value)} placeholder="Optional — internal politics, previous tech projects, things that have failed before, things the team would love to see fixed..." />
              </Field>
            </div>
          </div>

          {/* Submit */}
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !contactName}
            className="w-full bg-saabai-teal text-saabai-bg px-8 py-4 rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: "0 0 32px rgba(98,197,209,0.3)" }}
          >
            {submitting ? "Sending…" : "Send My Answers →"}
          </button>
          <p className="text-xs text-saabai-text-dim text-center -mt-8">
            We&apos;ll come back with a tailored scope — agent design, integrations, timeline and investment.
          </p>

        </div>
      </form>
    </div>
  );
}
