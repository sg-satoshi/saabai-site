import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { TIERS, TIER_ORDER } from "@/lib/blueprint";
import { SEO_RETAINER_NOTE } from "@/lib/care-faqs";
import "../components/sb/sb.css";

export const metadata: Metadata = publicPageMeta.seoAiSearch;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/seo-ai-search";

const CHECKS = [
  "Google ranking and Business Profile check",
  "AI answer checks across ChatGPT, Claude, Perplexity and Gemini",
  "Side-by-side competitor comparison",
  "Copy-paste fixes for your site",
];

const FAQS = [
  {
    q: "How much is SEO and AI search visibility?",
    a: `It is included in every Saabai Blueprint. Starter is ${TIERS.starter.priceLabel}, Pro is ${TIERS.pro.priceLabel} and Business is ${TIERS.business.priceLabel}. That is from ${TIERS.starter.priceLabel}.`,
  },
  {
    q: "Is this a monthly SEO retainer?",
    a: `The published offer is the Blueprint, which includes these checks. ${SEO_RETAINER_NOTE} Book a call for a quote if you want ongoing work.`,
  },
];

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "SEO and AI search visibility",
    serviceType: "Search and AI answer review",
    description: String(publicPageMeta.seoAiSearch.description),
    url: `${SITE_URL}${PATH}`,
    offers: TIER_ORDER.map((id) => ({
      "@type": "Offer",
      name: `Blueprint ${TIERS[id].name}`,
      price: String(TIERS[id].price),
      priceCurrency: "AUD",
      url: `${SITE_URL}/blueprint`,
      description: `SEO and AI search checks are included in Blueprint ${TIERS[id].name}.`,
    })),
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "SEO and AI search", path: PATH }]),
]);

export default function SeoAiSearchPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 800, paddingTop: 72, paddingBottom: 24 }}>
          <span className="eyebrow">Included in every Blueprint</span>
          <h1 style={{ marginTop: 16 }}>SEO and AI search visibility</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 640 }}>
            From {TIERS.starter.priceLabel}. These checks sit inside the Saabai Blueprint, so you can see where you show up on Google and in AI answers before you spend on a build.
          </p>
        </div>
      </div>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <ul className="tick">
            {CHECKS.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="grid3" style={{ marginTop: 28 }}>
            {TIER_ORDER.map((id) => (
              <div className="card" key={id}>
                <h3>{TIERS[id].name}</h3>
                <p style={{ marginTop: 8, color: "var(--teal)", fontWeight: 600 }}>{TIERS[id].priceLabel}</p>
                <p className="dim" style={{ marginTop: 6 }}>{TIERS[id].delivery}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            {FAQS.map((item) => (
              <details className="faq" key={item.q}>
                <summary>{item.q}<span aria-hidden>+</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a className="btn" href="/blueprint">See the Blueprint</a>
            <a className="btn ghost" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
