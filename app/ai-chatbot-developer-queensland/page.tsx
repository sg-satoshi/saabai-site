import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { serviceSchema, schemaGraph, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import "../components/sb/sb.css";
import "../components/sb/home.css";

const PATH = "/ai-chatbot-developer-queensland";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const copyLink = { color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 } as const;

const FAQS: { q: string; a: string }[] = [
  {
    q: "Who builds custom AI chatbots in Queensland?",
    a: "Saabai builds custom AI chatbots for business websites. We are based in Merrimac on the Gold Coast and work with businesses across Queensland.",
  },
  {
    q: "Do you work with businesses in Brisbane and the Sunshine Coast?",
    a: "Yes. We work with clients in Brisbane, the Gold Coast, the Sunshine Coast and across Australia, mostly remotely.",
  },
  {
    q: "What is the difference between a custom chatbot and a DIY chatbot tool?",
    a: "With a DIY tool you set up and train the bot yourself. With Saabai, we build and train the chatbot on your business for you and set up your alerts.",
  },
  {
    q: "How will I receive enquiries from the chatbot?",
    a: "By email on every plan. We can also send alerts to Telegram, WhatsApp or SMS.",
  },
  {
    q: "How much does a custom AI chatbot cost?",
    a: "It depends on what your chatbot needs to do. Book a free 30 minute call for a quote.",
  },
];

export const metadata: Metadata = publicPageMeta.queenslandChatbot;

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Custom AI chatbot development in Queensland",
    serviceType: "Custom AI chatbot development",
    description:
      "Saabai builds custom AI chatbots for business websites in Brisbane, the Gold Coast and the Sunshine Coast. Alerts by email on all plans, plus Telegram, WhatsApp or SMS.",
    url: `${SITE_URL}${PATH}`,
    areaServed: [
      { "@type": "City", name: "Brisbane" },
      { "@type": "City", name: "Gold Coast" },
      { "@type": "City", name: "Sunshine Coast" },
      { "@type": "State", name: "Queensland" },
    ],
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "Custom AI chatbots in Queensland", path: PATH }]),
  {
    "@type": "WebPage",
    url: `${SITE_URL}${PATH}`,
    name: "Custom AI Chatbot Developer in Queensland | Saabai",
    dateModified: "2026-10-25",
  },
]);

export default function QueenslandChatbotPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav activePage={PATH} />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div className="hero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <h1 style={{ margin: "18px auto 0", maxWidth: 920 }}>
            Custom AI chatbots built in Queensland
          </h1>
          <p style={{ maxWidth: 720, margin: "18px auto 0", fontSize: 18 }}>
            Saabai builds custom AI chatbots for business websites across Queensland. We are based in Merrimac on the Gold Coast and work with clients in Brisbane, the Sunshine Coast and beyond.
          </p>
          <div className="ctas" style={{ marginTop: 32 }}>
            <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a free 30-min call</a>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>A Queensland team that builds your chatbot</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>We design, train and set up your chatbot ourselves, rather than handing you a do-it-yourself tool.</p>
              <p>You get one local contact from the first call to launch.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Trained on your business, not a template</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Your chatbot learns your services, hours, prices and policies.</p>
              <p>It answers visitors in your words and captures their details when they want to get in touch.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Brisbane, Gold Coast and Sunshine Coast</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>We work with businesses on the Gold Coast, in Brisbane and on the Sunshine Coast, mostly remotely.</p>
              <p>Most of the work happens over video calls and email, so distance is not a problem.</p>
              <p>On the Gold Coast, the <a href="/ai-receptionist-gold-coast" style={copyLink}>AI receptionist</a> page describes the same kind of website chatbot for local businesses.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>See one working</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Mia is our own AI assistant, and you can try it on saabai.ai right now.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Alerts where you already work</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Every new enquiry arrives by email on all plans.</p>
              <p>We can also send alerts to Telegram, WhatsApp or SMS, so you see leads while you are on the go.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Chatbots for law firms, and full websites</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>For legal practices, we build <a href="/ai-chatbot-law-firms" style={copyLink}>chatbots for law firms</a> and <a href="/legal" style={copyLink}>Lex</a>, our AI legal assistant for law firms.</p>
              <p>Lex the workspace is for lawyers doing research and drafting. It is separate from a website chatbot.</p>
              <p>Need a new site too? <a href="/websites" style={copyLink}>Website tiers</a> start from $2,000 plus $100/mo care, and each tier includes a trained enquiry chatbot and hosting.</p>
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
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="cta">
            <div className="glow" />
            <div style={{ position: "relative" }}>
              <h2>Book a free 30 minute call</h2>
              <p style={{ maxWidth: 540, margin: "16px auto 0", fontSize: 17 }}>Tell us what the chatbot needs to do and we will quote the work.</p>
              <div className="ctas" style={{ marginTop: 28 }}>
                <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a free 30-min call</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
