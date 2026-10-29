import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL, LEX_FIRM_MONTHLY } from "@/lib/seo-entity";
import { breadcrumbNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import { TIERS, TIER_ORDER } from "@/lib/blueprint";
import { CARE_PLAN_CANCELLATION } from "@/lib/care-faqs";
import "../components/sb/sb.css";
import SalePrice from "../components/sale/SalePrice";
import { getPublicSales, type PublicSales } from "@/lib/public-sales";
import SaleInline from "../components/sale/SaleInline";
import { SaleRibbon, OnSaleLabel } from "../components/sale/SalePrice";
import { applySalesToText, offerPriceOr, careSlot, buildSlot, leadgenSlot, blueprintSlot } from "@/lib/sale-price";

// An ended sale stops showing within about a minute (the countdown also hides itself at 0).
export const revalidate = 60;

/** Meta and OG description follow a live sale and revert when it ends. */
export async function generateMetadata(): Promise<Metadata> {
  const sales = await getPublicSales();
  const base = publicPageMeta.pricing;
  if (!Object.keys(sales).length) return base;
  const description = applySalesToText(String(base.description ?? ""), sales);
  return { ...base, description, openGraph: { ...base.openGraph, description }, twitter: { ...base.twitter, description } };
}

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/pricing";

/** Prices printed on /leadgen. Keep these in step with that page. */
const LEADGEN = [
  { name: "Starter", monthly: 197 },
  { name: "Pro", monthly: 397 },
  { name: "Enterprise", monthly: 997 },
] as const;

const buildSchema = (sales: PublicSales) => schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Saabai published prices",
    serviceType: "Website care, AI audit and chat products",
    description: applySalesToText(String(publicPageMeta.pricing.description), sales),
    url: `${SITE_URL}${PATH}`,
    offers: [
      ...WEBSITE_TIERS.map((tier) => ({
        "@type": "Offer",
        name: `${tier.name} care plan`,
        ...offerPriceOr(sales[careSlot(tier.name)], tier.monthly),
        url: `${SITE_URL}/websites`,
        description: `${tier.name} care is ${formatAud(tier.monthly)} a month. Builds start from ${formatAud(tier.buildFrom)}.`,
      })),
      ...TIER_ORDER.map((id) => ({
        "@type": "Offer",
        name: `Blueprint ${TIERS[id].name}`,
        ...offerPriceOr(sales[blueprintSlot(id)], TIERS[id].price),
        url: `${SITE_URL}/blueprint`,
      })),
      {
        "@type": "Offer",
        name: "Lex Firm",
        ...offerPriceOr(sales["lex-firm"], LEX_FIRM_MONTHLY),
        url: `${SITE_URL}/legal`,
      },
      ...LEADGEN.map((tier) => ({
        "@type": "Offer",
        name: `LeadGen ${tier.name}`,
        ...offerPriceOr(sales[leadgenSlot(tier.name)], tier.monthly),
        url: `${SITE_URL}/leadgen`,
      })),
      { "@type": "Offer", name: "AI Readiness Score", price: "0", priceCurrency: "AUD", url: `${SITE_URL}/score` },
    ],
  }),
  breadcrumbNode([{ name: "Pricing", path: PATH }]),
]);

export default async function PricingPage() {
  const sales = await getPublicSales();
  const schema = buildSchema(sales);
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
              <div className={`card${tier.highlight ? " feat" : ""}`} key={tier.name} style={{ position: "relative" }}>
                <SaleRibbon sale={sales[careSlot(tier.name)] ?? sales[buildSlot(tier.name)]} />
                <h3>{tier.name}<OnSaleLabel sale={sales[careSlot(tier.name)] ?? sales[buildSlot(tier.name)]} /></h3>
                <SalePrice
                  sale={sales[careSlot(tier.name)] ?? null}
                  unit="a month"
                  fallback={<p style={{ marginTop: 10, color: "var(--teal)", fontSize: 28, fontWeight: 600 }}>{formatAud(tier.monthly)} a month</p>}
                />
                <p className="dim" style={{ marginTop: 6 }}>Builds from <SaleInline sale={sales[buildSlot(tier.name)]} fallback={formatAud(tier.buildFrom)} /></p>
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
              <div className="card" key={id} style={{ position: "relative" }}>
                <SaleRibbon sale={sales[blueprintSlot(id)]} />
                <h3>{TIERS[id].name}<OnSaleLabel sale={sales[blueprintSlot(id)]} /></h3>
                <SalePrice
                  sale={sales[blueprintSlot(id)] ?? null}
                  fallback={<p style={{ marginTop: 10, color: "var(--teal)", fontSize: 28, fontWeight: 600 }}>{TIERS[id].priceLabel}</p>}
                />
                <p className="dim" style={{ marginTop: 6 }}>{TIERS[id].delivery}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>From <SaleInline sale={sales["blueprint-starter"]} fallback={TIERS.starter.priceLabel} />. The fee is credited if you build with Saabai within 30 days.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/blueprint" style={{ color: "var(--teal)" }}>See the Blueprint</a>
          </p>

          <h2 style={{ marginTop: 56 }}>Other published prices</h2>
          <div className="card" style={{ marginTop: 24, display: "grid", gap: 18 }}>
            <p><a href="/legal" style={{ color: "var(--teal)" }}>Lex Firm</a> is <SaleInline sale={sales["lex-firm"]} fallback={`$${LEX_FIRM_MONTHLY}`} /> a month.</p>
            <p><a href="/score" style={{ color: "var(--teal)" }}>AI Readiness Score</a> is free.</p>
            <p>
              The <a href="/ai-receptionist-gold-coast" style={{ color: "var(--teal)" }}>AI receptionist</a> on your website is the chatbot, and it is included in the website tiers, from {formatAud(WEBSITE_TIERS[0].buildFrom)} plus {formatAud(WEBSITE_TIERS[0].monthly)} a month care. Phone answering with Lachie is coming soon. It is not live.
            </p>
            <p>
              <a href="/seo-ai-search" style={{ color: "var(--teal)" }}>SEO and AI search checks</a> are included in every Blueprint, from <SaleInline sale={sales["blueprint-starter"]} fallback={TIERS.starter.priceLabel} />.
            </p>
            <p>
              <a href="/custom-ai-agents" style={{ color: "var(--teal)" }}>Custom AI agents</a> and a <a href="/ai-chatbot-developer-queensland" style={{ color: "var(--teal)" }}>custom chatbot</a> are quoted to the job. Book a call for a quote.
            </p>
            <div>
              <p><a href="/leadgen" style={{ color: "var(--teal)" }}>LeadGen</a></p>
              <ul className="tick">
                {LEADGEN.map((tier) => (
                  <li key={tier.name}>{tier.name} <SaleInline sale={sales[leadgenSlot(tier.name)]} fallback={formatAud(tier.monthly)} /> a month</li>
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
