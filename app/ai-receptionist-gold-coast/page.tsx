import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { LachieLockup, LachiePortrait } from "../components/sb/LachieLockup";
import { receptionistServiceNode, schemaGraph, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import "../components/sb/sb.css";
import "../components/sb/home.css";

const PATH = "/ai-receptionist-gold-coast";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";
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
    q: "Website receptionist or phone receptionist?",
    a: [
      "This page is the website receptionist. It chats with people on your website, takes their details and sends you the enquiry.",
      "Phone answering with Lachie, Saabai's AI voice receptionist, is coming soon. It is not live.",
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
  {
    q: "How much does it cost?",
    a: [
      `The chatbot is included in the website tiers. ${entryTier.name} starts from ${formatAud(entryTier.buildFrom)} plus ${formatAud(entryTier.monthly)} a month care, and that care includes hosting.`,
      "Growth and Signature include the chatbot as well.",
    ],
  },
];

export const metadata: Metadata = publicPageMeta.receptionist;

const schema = schemaGraph([
  receptionistServiceNode,
  faqNode(FAQS.map((f) => ({ q: f.q, a: f.a.join(" ") }))),
  breadcrumbNode([{ name: "AI receptionist for Gold Coast businesses", path: PATH }]),
  {
    "@type": "WebPage",
    url: `${SITE_URL}${PATH}`,
    name: "AI Receptionist for Gold Coast Businesses | Saabai",
    dateModified: "2026-10-25",
  },
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
          <p style={{ maxWidth: 760, margin: "18px auto 0", fontSize: 18 }}>
            Saabai builds AI chatbots that act as a receptionist on your website. Visitors get an answer when you are on a job, with a guest, or closed for the night.
          </p>
          <p style={{ maxWidth: 760, margin: "14px auto 0", fontSize: 17, color: "var(--teal)", fontWeight: 600 }}>
            From {formatAud(entryTier.buildFrom)} plus {formatAud(entryTier.monthly)} a month care. The chatbot is included in the website tiers.
          </p>
          <div className="ctas" style={{ marginTop: 32 }}>
            <a className="btn" href="/websites">See website tiers</a>
            <a className="btn ghost" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a free 30-min call</a>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Your website, answered day and night</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>The chatbot sits on your site and answers common questions in the chat window.</p>
              <p>It takes down the visitor&apos;s name, contact details and what they need, then lets you know straight away.</p>
              <p>People can ask at any hour. The reply does not wait until the next morning.</p>
              <p>On the Gold Coast, enquiries often arrive in the evening or on the weekend, when the owner is still on a job or with a guest.</p>
              <p>The chatbot answers from the services, hours and policies you provide. You still make the follow-up. The chat only collects the enquiry and sends it on.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Local, from Merrimac on the Gold Coast</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>We are a Gold Coast business based in Merrimac, Queensland.</p>
              <p>We work with businesses across the Gold Coast, Brisbane and the rest of Australia, mostly remotely.</p>
              <p>The same team also publishes a <a href="/ai-chatbot-developer-queensland" style={copyLink}>Queensland chatbot page</a> and a <a href="/gold-coast" style={copyLink}>Gold Coast web design page</a>.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Trained on your business</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Your AI receptionist learns your services, hours and policies, so the answers come from your business, not guesses.</p>
              <p>If a question is outside what it was trained on, it should take the details and pass them to you rather than invent an answer.</p>
              <p>Try Mia, our own assistant, on saabai.ai to see how a Saabai chat feels.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>The website chat receptionist</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>This page is about the chatbot on your website.</p>
              <p>It answers visitors in the chat, takes their details, and sends the enquiry to you.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <div className="card">
            <div className="voice-launch">
              <LachiePortrait alt="Lachie, Saabai's AI voice receptionist" />
              <LachieLockup as="h2" second="Legend" descriptor="Saabai's AI receptionist." />
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 20, fontSize: 17, textAlign: "center" }}>
              <p>Phone answering with Lachie, Saabai&apos;s AI voice receptionist, is coming soon.</p>
              <p>It is not live. The receptionist on this page is the website chat.</p>
            </div>
            <div className="ctas" style={{ marginTop: 20 }}>
              <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a demo</a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="head">
            <h2>Gold Coast businesses, and the questions they get</h2>
          </div>
          <p style={{ maxWidth: 760, fontSize: 17, marginBottom: 18 }}>
            These are examples of the questions a website chatbot can be trained to answer. They are not client results, and they are not a promise about bookings or sales.
          </p>
          <div className="grid2">
            <div className="card">
              <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Tourism and hospitality</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
                <p>Gold Coast tourism and hospitality businesses get questions about hours, what is open, and how to enquire, including in school holidays.</p>
                <p>A website receptionist can answer from the hours and services you give it, and can collect a name when someone wants a person to follow up.</p>
                <p>It does not take a booking unless that booking step is part of the site we set up with you. The published website tiers describe a lead qualifying chatbot with booking on Growth and Signature, not on every plan.</p>
              </div>
            </div>
            <div className="card">
              <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Trades</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
                <p>A trades business can train the chatbot on the services it offers, the suburbs it covers, and how someone asks for a quote.</p>
                <p>The visitor describes the job in the chat. You get the details by email, or by Telegram, WhatsApp or SMS if you want those alerts.</p>
                <p>The chatbot on this page does not price the job. A quoting tool is a separate piece of work, and this page does not list a price for it.</p>
              </div>
            </div>
            <div className="card">
              <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Property</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
                <p>A property business can train the chatbot on inspection times, the listings it is allowed to describe, and how to ask for a call.</p>
                <p>After-hours visitors can leave their details on the site instead of waiting until the office opens.</p>
                <p>The chatbot should only describe what you have trained it on. It should not invent a price, a tenancy term, or a legal answer.</p>
              </div>
            </div>
            <div className="card">
              <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>What you receive</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
                <p>Every new enquiry arrives by email on all plans.</p>
                <p>We can also send the same alert to Telegram, WhatsApp or SMS, so you see it while you are away from the desk.</p>
                <p>You choose where it goes. The chatbot does not replace a person for the follow-up. It gets the enquiry to you.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="head">
            <h2>Price: use a website tier that includes the chatbot</h2>
          </div>
          <div style={{ display: "grid", gap: 12, maxWidth: 760, fontSize: 17, marginBottom: 18 }}>
            <p>The chatbot comes with the website tiers.</p>
            <p>Hosting and a trained enquiry chatbot are included in the care plan.</p>
          </div>
          <div className="grid3">
            {WEBSITE_TIERS.map((tier) => (
              <div className={`card pkg${tier.highlight ? " feat" : ""}`} key={tier.name}>
                <h3>{tier.name}</h3>
                <div className="amt">{formatAud(tier.buildFrom)}</div>
                <p className="dim" style={{ fontSize: 14 }}>plus {formatAud(tier.monthly)}/mo care</p>
                <p style={{ fontSize: 16, marginTop: 12 }}>{tier.description}</p>
              </div>
            ))}
          </div>
          <p style={{ maxWidth: 760, fontSize: 17, marginTop: 18 }}>
            <a href="/websites" style={copyLink}>Compare the website tiers</a>. If you already have a site and only want the chatbot added, book a free 30 minute call and we will quote that work.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>Clinics, studios and local services</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>A clinic or studio can train the chatbot on services, hours, and how a new client gets in touch.</p>
              <p>Someone browsing at night can read those answers on the site and leave their details for the morning.</p>
              <p>The chatbot should not give clinical, financial or legal advice. It collects the enquiry and sends it to you.</p>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 26, lineHeight: 1.25 }}>How a Gold Coast build starts</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 17 }}>
              <p>Book a free 30 minute call. We ask what the chatbot should know, and where enquiries should go.</p>
              <p>We train it on your services, hours and policies, and we set up email alerts. Telegram, WhatsApp or SMS can be added.</p>
              <p>If you also need the site, the <a href="/websites" style={copyLink}>website tiers</a> include hosting and the chatbot. Brisbane businesses can start from the <a href="/brisbane" style={copyLink}>Brisbane page</a>, which links to the same Queensland chatbot offer.</p>
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
                <a className="btn" href="/websites">See website tiers</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
