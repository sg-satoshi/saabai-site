import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { receptionistServiceNode, schemaGraph } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import "../components/sb/sb.css";
import "../components/sb/home.css";

const PATH = "/ai-receptionist-gold-coast";

const copyLink = { color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 } as const;

const entryTier = WEBSITE_TIERS[0];

const FAQS: { q: string; a: string[] }[] = [
  {
    q: "What is an AI receptionist?",
    a: [
      "It is an AI assistant that answers your website visitors, captures their details and passes enquiries to you, any time of day.",
    ],
  },
  {
    q: "Who builds AI receptionists on the Gold Coast?",
    a: [
      "Saabai, based in Merrimac on the Gold Coast, builds custom AI chatbots for business websites.",
    ],
  },
  {
    q: "How will I get my enquiries?",
    a: [
      "By email on every plan, and also by Telegram, WhatsApp or SMS if you want.",
    ],
  },
  {
    q: "Do I need a new website?",
    a: [
      "No.",
      `We can add a chatbot to your current site, or build a new site from ${formatAud(entryTier.buildFrom)} plus ${formatAud(entryTier.monthly)}/mo care.`,
    ],
  },
];

export const metadata: Metadata = publicPageMeta.receptionist;

const schema = schemaGraph([
  receptionistServiceNode,
  faqNode(FAQS.map((f) => ({ q: f.q, a: f.a.join(" ") }))),
  breadcrumbNode([{ name: "AI receptionist for Gold Coast businesses", path: PATH }]),
]);

export default function AiReceptionistGoldCoastPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav activePage={PATH} />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div className="hero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <h1 style={{ margin: "18px auto 0", maxWidth: 920 }}>
            AI receptionist for Gold Coast businesses
          </h1>
          <div className="ctas" style={{ marginTop: 32 }}>
            <a className="btn" href="/websites">See websites</a>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Your website, answered day and night</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Saabai builds AI chatbots that act as a receptionist on your website.</p>
              <p>They answer common questions, take down enquiry details and let you know straight away, even when you are on a job or closed for the night.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Local, from Merrimac on the Gold Coast</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>We are a Gold Coast business based in Merrimac, Queensland.</p>
              <p>We work with businesses across the Gold Coast, Brisbane and the rest of Australia, mostly remotely.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Trained on your business</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Your AI receptionist learns your services, hours and policies, so the answers come from your business, not guesses.</p>
              <p>Try Mia, our own assistant, on saabai.ai to see how it feels.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Website and chatbot together</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Need a new site as well?</p>
              <p>Every <a href="/websites" style={copyLink}>website tier</a> includes a trained AI enquiry chatbot, hosting and care. {entryTier.name} starts from {formatAud(entryTier.buildFrom)} plus {formatAud(entryTier.monthly)}/mo.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <div className="head"><h2>Common questions</h2></div>
          {FAQS.map((f) => (
            <details className="faq" key={f.q}>
              <summary>{f.q}<span aria-hidden>+</span></summary>
              {f.a.map((para) => <p key={para}>{para}</p>)}
            </details>
          ))}
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="cta">
            <div className="glow" />
            <div style={{ position: "relative" }}>
              <h2>Your website, answered day and night</h2>
              <div className="ctas" style={{ marginTop: 28 }}>
                <a className="btn" href="/websites">See websites</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
