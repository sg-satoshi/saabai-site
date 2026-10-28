import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import { TIERS } from "@/lib/blueprint";
import "../components/sb/sb.css";

export const metadata: Metadata = publicPageMeta.compare;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/compare";
const entry = WEBSITE_TIERS[0];

const FAQS = [
  {
    q: "Does this page list other companies' prices?",
    a: "No. The dollar amounts on this page are Saabai prices already published on saabai.ai. Wix and Squarespace publish their own plans on their sites.",
  },
  {
    q: "What does a Saabai website cost?",
    a: `Website builds start from ${formatAud(entry.buildFrom)}, then ${formatAud(entry.monthly)} a month care. A Blueprint starts from ${TIERS.starter.priceLabel}.`,
  },
];

const columns = [
  {
    name: "Saabai",
    points: [
      "Saabai designs, builds, hosts and looks after the site.",
      `Care plans start from ${formatAud(entry.monthly)} a month. Builds start from ${formatAud(entry.buildFrom)}. Hosting is included in the care plan.`,
      "Every website tier includes a trained enquiry chatbot.",
      "Small changes, security and updates are part of the care plan.",
      `A Blueprint, from ${TIERS.starter.priceLabel}, ranks what to automate first.`,
    ],
  },
  {
    name: "Traditional agency",
    points: [
      "You hire a studio to design and build a site for your business.",
      "Ask that studio what happens after launch: hosting, edits and a chatbot are often written up as their own items.",
      "The fit depends on the quote you receive. This page does not publish other firms' prices.",
      "You can use an agency for the design and Saabai for care, or the other way around. The choice is yours.",
    ],
  },
  {
    name: "DIY builder",
    points: [
      "Wix and Squarespace are hosted builders. You pick a template and edit the pages yourself.",
      "The platform hosts the site while your subscription with them is active.",
      "A custom chatbot, quoting flow or CRM handoff is usually a separate app you connect.",
      "Their current plans are on their own sites, linked below.",
    ],
  },
];

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Saabai website care compared with other ways to get a site",
    serviceType: "Website care plan",
    description: String(publicPageMeta.compare.description),
    url: `${SITE_URL}${PATH}`,
    offers: {
      "@type": "Offer",
      name: `${entry.name} care plan`,
      price: String(entry.monthly),
      priceCurrency: "AUD",
      url: `${SITE_URL}/websites`,
      description: `${entry.name} is ${formatAud(entry.monthly)} a month. Builds start from ${formatAud(entry.buildFrom)}.`,
    },
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "Compare", path: PATH }]),
]);

export default function ComparePage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 960, paddingTop: 72, paddingBottom: 24 }}>
          <span className="eyebrow">A fair look at three ways to get a website</span>
          <h1 style={{ marginTop: 16 }}>Saabai, an agency, or a DIY builder</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 680 }}>
            From {formatAud(entry.buildFrom)} to build, then {formatAud(entry.monthly)} a month care. This page describes how the work is split. It does not rank anyone, and it does not quote other companies.
          </p>
          {/* TODO: Google rating goes here once Shane has consent to publish it. Do not add a rating, review count or stars until then. */}
        </div>
      </div>

      <section>
        <div className="wrap" style={{ maxWidth: 960 }}>
          <div className="grid3">
            {columns.map((col) => (
              <div className="card" key={col.name}>
                <h2 style={{ fontSize: 26 }}>{col.name}</h2>
                <ul className="tick">
                  {col.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 26 }}>Sources for the DIY builders</h2>
            <p style={{ marginTop: 12 }}>
              Wix and Squarespace describe their own products. Features and plans change, so use their sites for the current offer.
            </p>
            <p style={{ marginTop: 12 }}>
              <a href="https://www.wix.com/" style={{ color: "var(--teal)" }}>Wix</a>
              {" · "}
              <a href="https://www.squarespace.com/" style={{ color: "var(--teal)" }}>Squarespace</a>
            </p>
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
            <a className="btn" href="/websites">See website care plans</a>
            <a className="btn ghost" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
