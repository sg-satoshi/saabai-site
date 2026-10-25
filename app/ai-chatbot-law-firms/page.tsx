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

const SECTIONS: { title: string; body: string[]; features?: string[]; href?: string; hrefLabel?: string }[] = [
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
    title: "Lex, an AI legal assistant for law firms",
    body: [
      "Lex is Saabai's AI legal assistant for research and drafting.",
      "It is a different product from the website chatbot demo on this page.",
      "The demo answers a visitor. Lex searches public Australian government sources and drafts documents for lawyers.",
    ],
    features: LEX_FEATURES,
    href: "/legal",
    hrefLabel: "See Lex, the AI legal assistant",
  },
  {
    title: "Custom AI chatbots in Queensland",
    body: [
      "Saabai is based in Merrimac on the Gold Coast and builds chatbots for firms in Brisbane, the Gold Coast and the Sunshine Coast.",
      "The Queensland page covers who builds them, how alerts work, and how to book a quote.",
    ],
    href: "/ai-chatbot-developer-queensland",
    hrefLabel: "Custom AI chatbot developer in Queensland",
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
      "Saabai builds Lex, an AI legal assistant for research and drafting, and is based on the Gold Coast in Queensland.",
      "Lex is not the website chatbot demo on this page.",
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
  {
    "@type": "WebPage",
    url: "https://www.saabai.ai/ai-chatbot-law-firms",
    name: "AI Chatbot for Law Firms | Saabai, Gold Coast",
    dateModified: "2026-10-25",
  },
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
      {section.href && section.hrefLabel ? (
        <p style={{ marginTop: 16 }}>
          <a href={section.href} style={{ color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 }}>{section.hrefLabel}</a>
        </p>
      ) : null}
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
          <div className="head"><h2>Tributum Law</h2></div>
          <p style={{ fontSize: 17, marginBottom: 16 }}>
            From the <a href="/case-studies" style={{ color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 }}>Tributum Law case study</a>.
          </p>
          <blockquote className="card" style={{ margin: 0 }}>
            <p style={{ fontSize: 18, lineHeight: 1.5 }}>
              &ldquo;The clients calling about ATO disputes are stressed. They want to know someone&apos;s there. Lex answers that in 90 seconds, any time of day. The difference it&apos;s made to our conversion rate has been significant.&rdquo;
            </p>
            <p style={{ marginTop: 16, fontSize: 14, letterSpacing: "0.04em" }}>
              , Principal, Tributum Law
            </p>
          </blockquote>
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
