import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { TIERS } from "@/lib/blueprint";
import "../components/sb/sb.css";

export const metadata: Metadata = publicPageMeta.customAgents;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/custom-ai-agents";

const POINTS = [
  "Trained on your services, prices and FAQs",
  "Captures and qualifies leads",
  "Follow-up and reminders are quoted separately",
  "Scoped from your Blueprint, with the build quoted before it starts",
];

const FAQS = [
  {
    q: "How much does a custom AI agent cost?",
    a: `Book a call for a quote. A custom agent is quoted to the job. A Blueprint is optional: Starter ${TIERS.starter.priceLabel}, Pro ${TIERS.pro.priceLabel} or Business ${TIERS.business.priceLabel}. Website care plans are sold on their own. If you book a build within 30 days of receiving a Blueprint, the fee comes off that build invoice. It does not come off care plans.`,
  },
  {
    q: "Is this the same as the chatbot on a website care plan?",
    a: "A website care plan includes a trained enquiry chatbot. A custom agent, such as quoting or a CRM handoff, is scoped from the Blueprint and quoted on its own.",
  },
];

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Custom AI agents",
    serviceType: "Custom AI agent",
    description: String(publicPageMeta.customAgents.description),
    url: `${SITE_URL}${PATH}`,
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "Custom AI agents", path: PATH }]),
]);

export default function CustomAiAgentsPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 800, paddingTop: 72, paddingBottom: 24 }}>
          <span className="eyebrow">Quoted to the job</span>
          <h1 style={{ marginTop: 16 }}>Custom AI agents</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 640 }}>
            Book a call for a quote. Agents that answer, quote and follow up are scoped from your Blueprint, from {TIERS.starter.priceLabel}.
          </p>
        </div>
      </div>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <ul className="tick">
            {POINTS.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p style={{ marginTop: 20 }}>
            See also the <a href="/ai-chatbot-developer-queensland" style={{ color: "var(--teal)" }}>Queensland chatbot page</a>, the <a href="/ai-receptionist-gold-coast" style={{ color: "var(--teal)" }}>Gold Coast AI receptionist</a>, and <a href="/legal" style={{ color: "var(--teal)" }}>Lex</a> for law firms.
          </p>
          <div style={{ marginTop: 28 }}>
            {FAQS.map((item) => (
              <details className="faq" key={item.q}>
                <summary>{item.q}<span aria-hidden>+</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call for a quote</a>
            <a className="btn ghost" href="/blueprint">See the Blueprint</a>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
