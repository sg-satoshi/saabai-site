import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { serviceSchema, schemaGraph, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import "../components/sb/sb.css";
import "../components/sb/home.css";

const PATH = "/ai-chatbot-developer-queensland";
const entryTier = WEBSITE_TIERS[0];
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
    a: "With a DIY tool you set up and train the bot yourself. With Saabai, we build and train the chatbot on your business for you.",
  },
  {
    q: "How will I receive enquiries from the chatbot?",
    a: "The chatbot answers visitors and keeps a log of each chat. Enquiry alerts by email, Telegram, WhatsApp or SMS are coming soon.",
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
      "Saabai builds custom AI chatbots for business websites in Brisbane, the Gold Coast and the Sunshine Coast. The chatbot answers visitors and keeps a log of each chat. Enquiry alerts are coming soon.",
    url: `${SITE_URL}${PATH}`,
    offers: {
      "@type": "Offer",
      name: `${entryTier.name} website with chatbot`,
      price: String(entryTier.buildFrom),
      priceCurrency: "AUD",
      url: `${SITE_URL}/websites`,
      description: `${entryTier.name} starts from ${formatAud(entryTier.buildFrom)} plus ${formatAud(entryTier.monthly)} a month care. A custom build is quoted on a call.`,
    },
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
    dateModified: "2026-10-29",
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
            Custom AI chatbots that turn Queensland website visitors into leads
          </h1>
          <p style={{ maxWidth: 720, margin: "18px auto 0", fontSize: 18 }}>
            Saabai builds custom AI chatbots for business websites across Queensland. We are based in Merrimac on the Gold Coast and work with clients in Brisbane, the Sunshine Coast and beyond.
          </p>
          <p style={{ maxWidth: 720, margin: "14px auto 0", fontSize: 17, color: "var(--teal)", fontWeight: 600 }}>
            From {formatAud(entryTier.buildFrom)} plus {formatAud(entryTier.monthly)} a month on a website care plan. For a custom build, book a free 30 minute call for a quote.
          </p>
          <div className="ctas" style={{ marginTop: 32 }}>
            <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a free 30-min call</a>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }} aria-labelledby="real-work">
        <div className="wrap">
          <div className="card">
            <span className="eyebrow">Real work</span>
            <h2 id="real-work" style={{ fontSize: 26, lineHeight: 1.25, marginTop: 12 }}>Rex, the AI sales agent we built for PlasticOnline</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Rex is the AI agent Saabai built for <a href="https://plasticonline.com.au" target="_blank" rel="noopener noreferrer" style={copyLink}>PlasticOnline.com.au</a>, a national plastics supplier.</p>
              <p>Rex answered product questions, priced cut-to-size jobs from the supplier&apos;s own product data and captured leads for the sales team. It was a custom build, quoted to the job.</p>
              <p>No result figures are published. <a href="/case-studies/rex-plastics-online" style={copyLink}>Read the PlasticOnline case study</a>.</p>
            </div>
          </div>
        </div>
      </section>

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
              <p>It answers visitors in your words and keeps a log of the chat.</p>
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
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Answers today, alerts coming soon</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>The chatbot answers visitors and keeps a log of each chat.</p>
              <p>Enquiry alerts by email, Telegram, WhatsApp or SMS are coming soon.</p>
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
