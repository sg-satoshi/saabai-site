import type { Metadata } from "next";
import SbNav from "../components/sb/SbNav";
import SbFooter from "../components/sb/SbFooter";
import "../components/sb/blueprint.css";
import { TIERS, TIER_ORDER } from "@/lib/blueprint";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.blueprint;

const ROWS: [string, string, string, string][] = [
  ["Ranked opportunities with $ saved", "✓", "✓", "✓"],
  ["PDF and client portal version", "✓", "✓", "✓"],
  ["Reviewed by Shane", "·", "✓", "✓"],
  ["Walkthrough call", "Not included", "30 min", "Leadership session"],
  ["Team discovery sessions", "·", "·", "✓"],
  ["12 month roadmap", "·", "·", "✓"],
  ["Delivery", "48 hours", "3 business days", "2 to 3 weeks"],
];

const FAQS = [
  ["What do I need to provide?", "After checkout we email a short fact-find about your team, tools and busiest tasks. It takes about 15 minutes."],
  ["How does the 30 day credit work?", "If you book any Saabai build within 30 days of receiving your Blueprint, the full fee is taken off that build. Credit applies to implementation costs only, not care plans or monthly fees. Any unused credit expires after 30 days."],
  ["Is this the same as your old AI review service?", "Yes, rebuilt. The Blueprint replaces it with clearer pricing and faster delivery."],
  ["Do I have to build with Saabai?", "No. The plan is yours to keep and use with any provider or your own team."],
  ["Are prices in AUD?", "Yes. All prices are in Australian dollars. GST not applicable. You get an invoice by email straight after payment."],
  ["Can I get a refund?", "If work hasn't begun, we'll refund you in full. Just reply to your confirmation email. Once work has begun, we don't give change-of-mind refunds. Your rights under the Australian Consumer Law always apply."],
];

const blueprintSchema = schemaGraph([
  serviceSchema({
    id: "https://www.saabai.ai/blueprint#service",
    name: "Saabai Blueprint AI audit",
    serviceType: "AI audit",
    description: String(publicPageMeta.blueprint.description),
    url: "https://www.saabai.ai/blueprint",
    offers: TIER_ORDER.map((id) => ({
      "@type": "Offer",
      name: `Blueprint ${TIERS[id].name}`,
      description: `${TIERS[id].who} Delivery: ${TIERS[id].delivery}.`,
      price: TIERS[id].price,
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
      url: "https://www.saabai.ai/blueprint",
    })),
  }),
  faqNode(FAQS.map(([q, a]) => ({ q, a }))),
  breadcrumbNode([{ name: "Blueprint", path: "/blueprint" }]),
]);

export default function BlueprintPage() {
  return (
    <div className="sb">
      <JsonLd data={blueprintSchema} />
      <SbNav active="blueprint" />
      <div className="bhero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="eyebrow">Saabai Blueprint · for small businesses and professional practices</span>
          <h1 style={{ marginTop: 18 }}>Know exactly what to<br /> <span className="grad">automate first</span></h1>
          <p className="lead">A clear, ranked AI plan for small businesses, with professional practices just as welcome. Every opportunity comes with the hours and dollars it could save. Pro and Business add a build cost estimate for each.</p>
          <div style={{ marginTop: 32, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn" href="/score">Not sure which? Take the free score →</a>
            <a className="btn ghost" href="https://calendly.com/shanegoldberg/30min" target="_blank" rel="noopener noreferrer">Book a call</a>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 16 }} id="tiers">
        <div className="wrap grid3">
          {TIER_ORDER.map((id) => {
            const t = TIERS[id];
            const feat = id === "pro";
            return (
              <div className={`card tier${feat ? " feat" : ""}`} key={id}>
                <div>
                  {feat && <span className="pill" style={{ float: "right" }}>Recommended</span>}
                  <h3>{t.name}</h3>
                </div>
                <div className="amt">{t.priceLabel} <small>one-off</small></div>
                <p className="who">{t.who}</p>
                <hr />
                <ul className="tick">{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <a className={`btn full${feat ? "" : " ghost"}`} href={`/blueprint/checkout?tier=${id}`}>Choose {t.name}</a>
              </div>
            );
          })}
        </div>
        <div className="wrap" style={{ marginTop: 28 }}>
          <div className="credit">
            <div className="big">100% credited</div>
            <div>
              <h3>Build with us within 30 days and your Blueprint fee (from {TIERS.starter.priceLabel}) is credited to your build</h3>
              <p style={{ fontSize: 14, marginTop: 4 }}>Credit applies to implementation costs only, not care plans or monthly fees. Any unused credit expires after 30 days.</p>
              <p style={{ fontSize: 15, marginTop: 4 }}>Book any build with Saabai within 30 days of delivery and the full Blueprint fee comes off your build invoice.</p>
            </div>
          </div>
          <p className="dim" style={{ fontSize: 13, marginTop: 14, textAlign: "center" }}>Prices in AUD. GST not applicable.</p>
          <p style={{ fontSize: 15, marginTop: 18, textAlign: "center", display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/case-studies" style={{ color: "var(--teal)" }}>See the case studies →</a>
            <a href="/process" style={{ color: "var(--teal)" }}>How we work →</a>
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap" style={{ maxWidth: 960 }}>
          <div className="head"><h2>Compare tiers</h2></div>
          <div className="cmpwrap">
            <table>
              <thead><tr><th></th><th>Starter</th><th>Pro</th><th>Business</th></tr></thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => <td key={i} className={c === "✓" ? "yes" : ""}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <div className="head"><h2>Questions</h2></div>
          {FAQS.map(([q, a]) => (
            <details className="faq" key={q}>
              <summary>{q}<span aria-hidden>+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
