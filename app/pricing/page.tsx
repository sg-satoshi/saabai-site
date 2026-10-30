import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import { TIERS, TIER_ORDER } from "@/lib/blueprint";
import { CARE_PLAN_CANCELLATION } from "@/lib/care-faqs";
import "../components/sb/sb.css";

export const metadata: Metadata = publicPageMeta.pricing;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/pricing";

/** Prices printed on /leadgen. Keep these in step with that page. */
const LEADGEN = [
  { name: "Starter", monthly: 197 },
  { name: "Pro", monthly: 397 },
  { name: "Enterprise", monthly: 997 },
] as const;

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Saabai published prices",
    serviceType: "Website care, AI audit and chat products",
    description: String(publicPageMeta.pricing.description),
    url: `${SITE_URL}${PATH}`,
    offers: [
      ...WEBSITE_TIERS.map((tier) => ({
        "@type": "Offer",
        name: `${tier.name} care plan`,
        price: String(tier.monthly),
        priceCurrency: "AUD",
        url: `${SITE_URL}/websites`,
        description: `${tier.name} care is ${formatAud(tier.monthly)} a month. Builds start from ${formatAud(tier.buildFrom)}.`,
      })),
      ...TIER_ORDER.map((id) => ({
        "@type": "Offer",
        name: `Blueprint ${TIERS[id].name}`,
        price: String(TIERS[id].price),
        priceCurrency: "AUD",
        url: `${SITE_URL}/blueprint`,
      })),
      {
        "@type": "Offer",
        name: "Lex 60-day free trial",
        price: "0",
        eligibleDuration: { "@type": "QuantitativeValue", value: 60, unitCode: "DAY" },
        priceCurrency: "AUD",
        url: `${SITE_URL}/legal`,
        description: "60-day free trial, no card needed. 3 lawyer seats, legal research and 20 documents a month. Pricing is set after the trial.",
      },
      ...LEADGEN.map((tier) => ({
        "@type": "Offer",
        name: `LeadGen ${tier.name}`,
        price: String(tier.monthly),
        priceCurrency: "AUD",
        url: `${SITE_URL}/leadgen`,
      })),
      { "@type": "Offer", name: "AI Readiness Score", price: "0", priceCurrency: "AUD", url: `${SITE_URL}/score` },
    ],
  }),
  breadcrumbNode([{ name: "Pricing", path: PATH }]),
]);

export default function PricingPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 860, paddingTop: 72, paddingBottom: 40 }}>
          <span className="eyebrow">Prices in AUD. GST not applicable.</span>
          <h1 style={{ marginTop: 16 }}>Pricing</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 640 }}>
            These are the prices already published on saabai.ai. Website care starts from {formatAud(WEBSITE_TIERS[0].monthly)} a month, and builds start from {formatAud(WEBSITE_TIERS[0].buildFrom)}.
          </p>
        </div>
      </div>

      <section>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <h2>Website care plans</h2>
          <div className="grid3" style={{ marginTop: 24 }}>
            {WEBSITE_TIERS.map((tier) => (
              <div className={`card${tier.highlight ? " feat" : ""}`} key={tier.name}>
                <h3>{tier.name}</h3>
                <p style={{ marginTop: 10, color: "var(--teal)", fontSize: 28, fontWeight: 600 }}>{formatAud(tier.monthly)} a month</p>
                <p className="dim" style={{ marginTop: 6 }}>Builds from {formatAud(tier.buildFrom)}</p>
                <p style={{ marginTop: 12 }}>{tier.tagline}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>
            <a href="/websites" style={{ color: "var(--teal)" }}>See website care plans</a>
          </p>

          <h2 style={{ marginTop: 56 }}>Saabai Blueprint</h2>
          <div className="grid3" style={{ marginTop: 24 }}>
            {TIER_ORDER.map((id) => (
              <div className="card" key={id}>
                <h3>{TIERS[id].name}</h3>
                <p style={{ marginTop: 10, color: "var(--teal)", fontSize: 28, fontWeight: 600 }}>{TIERS[id].priceLabel}</p>
                <p className="dim" style={{ marginTop: 6 }}>{TIERS[id].delivery}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>From {TIERS.starter.priceLabel}. The fee is credited if you build with Saabai within 30 days.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/blueprint" style={{ color: "var(--teal)" }}>See the Blueprint</a>
          </p>

          <h2 style={{ marginTop: 56 }}>Other published prices</h2>
          <div className="card" style={{ marginTop: 24, display: "grid", gap: 18 }}>
            <p><a href="/legal" style={{ color: "var(--teal)" }}>Lex Firm</a> starts with a 60-day free trial, no card needed: 3 lawyer seats, legal research and 20 documents a month. Pricing is set after the trial; you choose whether to subscribe. Larger firms can ask about a custom Enterprise plan. <a href="/lex/signup/trial" style={{ color: "var(--teal)" }}>Start your 60-day free trial</a> or <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)" }}>book a free Lex demo<span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}> (opens in new tab)</span></a>.</p>
            <p><a href="/score" style={{ color: "var(--teal)" }}>AI Readiness Score</a> is free.</p>
            <p>
              The <a href="/ai-receptionist-gold-coast" style={{ color: "var(--teal)" }}>AI receptionist</a> on your website is the chatbot, and it is included in the website tiers, from {formatAud(WEBSITE_TIERS[0].buildFrom)} plus {formatAud(WEBSITE_TIERS[0].monthly)} a month care.
            </p>
            <p>
              <a href="/seo-ai-search" style={{ color: "var(--teal)" }}>SEO and AI search checks</a> are included in every Blueprint, from {TIERS.starter.priceLabel}.
            </p>
            <p>
              <a href="/custom-ai-agents" style={{ color: "var(--teal)" }}>Custom AI agents</a> and a <a href="/ai-chatbot-developer-queensland" style={{ color: "var(--teal)" }}>custom chatbot</a> are quoted to the job. Book a call for a quote.
            </p>
            <div>
              <p><a href="/leadgen" style={{ color: "var(--teal)" }}>LeadGen</a></p>
              <ul className="tick">
                {LEADGEN.map((tier) => (
                  <li key={tier.name}>{tier.name} {formatAud(tier.monthly)} a month</li>
                ))}
              </ul>
            </div>
          </div>

          <h2 style={{ marginTop: 56 }}>Cancellation</h2>
          <p style={{ marginTop: 14 }}>{CARE_PLAN_CANCELLATION}</p>
          <p style={{ marginTop: 8 }}>
            <a href="/terms" style={{ color: "var(--teal)" }}>Read the terms</a>
          </p>

          <div style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>
            <a className="btn ghost" href="/websites">See websites</a>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
