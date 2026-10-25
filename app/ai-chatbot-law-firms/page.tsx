import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { lawFirmChatbotServiceNode, schemaGraph } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { LachieLegalDemo, LexWebsiteDemo } from "../components/legal-demos/HarbourDemos";
import "../components/sb/sb.css";
import "../components/sb/home.css";
import "../legal/legal.css";

const voiceDemoReady = Boolean(process.env.XAI_API_KEY);

const PATH = "/ai-chatbot-law-firms";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";

const LEX_FEATURES = [
  "AI answers to legal questions",
  "document review",
  "citation checking",
  "matter management",
];

const SECTIONS: { title: string; body: string[]; features?: string[] }[] = [
  {
    title: "Never miss a new client enquiry",
    body: [
      "People often look for a lawyer at night or on the weekend.",
      "A Saabai chatbot on your firm's website answers their first questions, collects their details and the type of matter, and sends the enquiry to your team straight away.",
    ],
  },
  {
    title: "Built around your firm",
    body: [
      "Your chatbot is trained on your firm's own information: practice areas, locations, hours and how to book.",
      "It sounds like your firm, not a generic bot, and it hands enquiries to a person rather than giving legal advice.",
    ],
  },
  {
    title: "Lex, an AI workspace for law firms",
    body: [
      "Lex is Saabai's AI workspace made for legal practices.",
      "It gives your team one place to use AI in daily firm work.",
      "Talk to us about how Lex could fit how your firm runs.",
    ],
    features: LEX_FEATURES,
  },
  {
    title: "Alerts where your team already works",
    body: [
      "Every new enquiry can arrive by email, and we can also send alerts to Telegram, WhatsApp or SMS, so the right person sees it fast.",
    ],
  },
];

const FAQS: { q: string; a: string[] }[] = [
  {
    q: "What is the best AI chatbot for a law firm in Australia?",
    a: [
      "The best one is built for your firm and answers from your own information.",
      "Saabai builds custom chatbots for Australian law firms that capture enquiries around the clock and alert your team.",
    ],
  },
  {
    q: "Is there an AI legal assistant built for Australian law firms?",
    a: [
      "Yes.",
      "Saabai builds Lex, an AI workspace for law firms, and is based on the Gold Coast in Queensland.",
    ],
  },
  {
    q: "Does the chatbot give legal advice?",
    a: [
      "No.",
      "It answers general questions about your firm, collects enquiry details and passes them to your team.",
    ],
  },
  {
    q: "Can you work with firms outside Queensland?",
    a: [
      "Yes.",
      "We are based in Merrimac on the Gold Coast and work remotely with firms across Australia.",
    ],
  },
];

export const metadata: Metadata = publicPageMeta.lawFirms;

const schema = schemaGraph([
  lawFirmChatbotServiceNode,
  faqNode(FAQS.map((f) => ({ q: f.q, a: f.a.join(" ") }))),
  breadcrumbNode([{ name: "AI chatbot for law firms", path: PATH }]),
]);

function BookDemo() {
  return (
    <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">
      Book a demo
    </a>
  );
}

function FirmCard({ section }: { section: (typeof SECTIONS)[number] }) {
  return (
    <div className={section.features ? "card feat" : "card"}>
      <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>{section.title}</h2>
      <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
        {section.body.map((para) => <p key={para}>{para}</p>)}
      </div>
      {section.features && (
        <ul className="tick">
          {section.features.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AiChatbotLawFirmsPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav activePage={PATH} />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div className="hero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <h1 style={{ margin: "18px auto 0", maxWidth: 980 }}>
            AI chatbot and AI legal assistant for Australian law firms
          </h1>
          <div className="ctas" style={{ marginTop: 32 }}>
            <BookDemo />
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          {SECTIONS.slice(0, 2).map((section) => <FirmCard key={section.title} section={section} />)}
        </div>
      </section>

      {/* Lex is the website chat. Same Harbour Street demo as /legal. */}
      <section id="demo" className="lx-demo-scope" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <LexWebsiteDemo />
        </div>
      </section>

      {/* Lachie answers the phones. Same legal voice demo as /legal. */}
      <section id="lachie" className="lx-demo-scope lx-lachie" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <LachieLegalDemo ready={voiceDemoReady} />
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          {SECTIONS.slice(2).map((section) => <FirmCard key={section.title} section={section} />)}
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
              <h2>Never miss a new client enquiry</h2>
              <div className="ctas" style={{ marginTop: 28 }}>
                <BookDemo />
              </div>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
