import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { TIERS, TIER_ORDER } from "@/lib/blueprint";
import { SEO_RETAINER_NOTE } from "@/lib/care-faqs";
import "../components/sb/sb.css";

export const metadata: Metadata = publicPageMeta.seoAiSearch;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/seo-ai-search";

const CHECKS = [
  "Google ranking and Business Profile check",
  "AI answer checks across ChatGPT, Claude, Perplexity and Gemini",
  "Side-by-side competitor comparison",
  "Copy-paste fixes for your site",
];

const SIGNALS = [
  {
    title: "Reviews",
    body: "Recent, genuine reviews that mention the service and the suburb give Google and AI tools confidence that real customers use you.",
  },
  {
    title: "Google Business Profile",
    body: "A complete profile with the right category, service area, hours, photos and services is one of the first places Google looks for local results.",
  },
  {
    title: "Consistent details",
    body: "Your business name, address and phone number should match everywhere: your site, your profile, directories and social pages. Mixed details make you harder to trust.",
  },
  {
    title: "Clear service pages",
    body: "One page per main service, written in plain words, saying what you do, where, for whom and what happens next. AI assistants quote pages that answer the question directly.",
  },
  {
    title: "Structured data",
    body: "Schema markup tells search engines in a machine-readable way what your business is, where it is and what it offers. Most small business sites have none or have it wrong.",
  },
  {
    title: "Being mentioned elsewhere",
    body: "Directories, industry bodies, local news and other trusted sites that name you help AI tools decide you are a real and relevant option.",
  },
];

const STEPS = [
  { title: "Start with the free score", body: "Take the free AI Readiness Score to see where you stand. It takes a few minutes and costs nothing." },
  { title: "Choose a Blueprint tier", body: "Pick Starter, Pro or Business and complete the online fact-find about your business, your site and your competitors." },
  { title: "We run the checks", body: "We review your Google presence and Business Profile, ask ChatGPT, Claude, Perplexity and Gemini the questions your customers ask, and compare you with competitors." },
  { title: "You get the fixes", body: "Your Blueprint arrives as a branded PDF plus a web version in your portal, with ranked opportunities and copy-paste fixes you or your web person can apply." },
];

const SUITS = [
  "Local service businesses that rely on people searching for them, such as trades, clinics and professional practices",
  "Owners who have asked ChatGPT or Google about their own industry and found competitors named instead",
  "Businesses planning a new website who want to know what to fix before spending on a build",
  "Anyone who wants a clear list of fixes rather than a monthly SEO contract",
];

const FAQS = [
  {
    q: "How much is SEO and AI search visibility?",
    a: `It is included in every Saabai Blueprint. Starter is ${TIERS.starter.priceLabel}, Pro is ${TIERS.pro.priceLabel} and Business is ${TIERS.business.priceLabel}. That is from ${TIERS.starter.priceLabel}.`,
  },
  {
    q: "Is anything free?",
    a: "Yes. The AI Readiness Score at saabai.ai/score is free. The Blueprint itself is a paid report.",
  },
  {
    q: "What is the difference between SEO and AI search?",
    a: "SEO is about showing up in Google results. AI search is about being named when someone asks an assistant like ChatGPT, Claude, Perplexity or Gemini for a recommendation. Both lean on the same basics: clear pages, consistent details, reviews and being mentioned on trusted sites.",
  },
  {
    q: "Which AI tools do you check?",
    a: "ChatGPT, Claude, Perplexity and Gemini, alongside Google search and your Google Business Profile.",
  },
  {
    q: "Do you make the changes for me?",
    a: "The Blueprint gives you copy-paste fixes that you or your web person can apply. If you want us to do the work, book a call and we will quote it separately.",
  },
  {
    q: "Can you guarantee a top ranking or an AI recommendation?",
    a: "No. Nobody controls how Google or AI assistants rank businesses, so anyone promising that is guessing. What we can do is show you the gaps and how to close them.",
  },
  {
    q: "Is this a monthly SEO retainer?",
    a: `The published offer is the Blueprint, which includes these checks. ${SEO_RETAINER_NOTE} Book a call for a quote if you want ongoing work.`,
  },
  {
    q: "How long does it take?",
    a: `Starter is delivered within ${TIERS.starter.delivery}, Pro within ${TIERS.pro.delivery} and Business in ${TIERS.business.delivery}.`,
  },
];

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "SEO and AI search visibility",
    serviceType: "Search and AI answer review",
    description: String(publicPageMeta.seoAiSearch.description),
    url: `${SITE_URL}${PATH}`,
    offers: TIER_ORDER.map((id) => ({
      "@type": "Offer",
      name: `Blueprint ${TIERS[id].name}`,
      price: String(TIERS[id].price),
      priceCurrency: "AUD",
      url: `${SITE_URL}/blueprint`,
      description: `SEO and AI search checks are included in Blueprint ${TIERS[id].name}.`,
    })),
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "SEO and AI search", path: PATH }]),
]);

export default function SeoAiSearchPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 800, paddingTop: 72, paddingBottom: 24 }}>
          <span className="eyebrow">Included in every Blueprint</span>
          <h1 style={{ marginTop: 16 }}>SEO and AI search visibility</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 640 }}>
            From {TIERS.starter.priceLabel}. These checks sit inside the Saabai Blueprint, so you can see where you show up on Google and in AI answers before you spend on a build.
          </p>
        </div>
      </div>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>What AI search visibility means</h2>
          <p style={{ marginTop: 14 }}>
            More customers now ask an AI assistant instead of scrolling a list of links. They type something like &ldquo;who is a good electrician near Robina&rdquo; into ChatGPT, or see an AI summary at the top of Google, and get a short answer naming two or three businesses. AI search visibility is whether your business is one of the names in that answer.
          </p>
          <p style={{ marginTop: 14 }}>
            For Australian small businesses this matters in 2026 because the short answer often replaces the click. If an assistant names a competitor and not you, the customer may never reach your website at all. Classic SEO still matters too, since Google results and your Business Profile feed many of these answers.
          </p>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>How Google and AI assistants choose who to recommend</h2>
          <p style={{ marginTop: 14 }}>
            No one outside these companies knows the exact rules, but the public guidance and what shows up in answers point to the same handful of signals.
          </p>
          <div className="grid2" style={{ marginTop: 24 }}>
            {SIGNALS.map((s) => (
              <div className="card" key={s.title}>
                <h3>{s.title}</h3>
                <p className="dim" style={{ marginTop: 8 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>What the Blueprint checks</h2>
          <p style={{ marginTop: 14 }}>Every tier includes these search and AI checks:</p>
          <ul className="tick" style={{ marginTop: 14 }}>
            {CHECKS.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p style={{ marginTop: 24 }}>The tiers differ in how much extra review and planning you get:</p>
          <div className="grid3" style={{ marginTop: 18 }}>
            {TIER_ORDER.map((id) => (
              <div className="card" key={id}>
                <h3>{TIERS[id].name}</h3>
                <p style={{ marginTop: 8, color: "var(--teal)", fontWeight: 600 }}>{TIERS[id].priceLabel}</p>
                <p className="dim" style={{ marginTop: 6 }}>{TIERS[id].delivery}</p>
                <p className="dim" style={{ marginTop: 10 }}>{TIERS[id].who}</p>
                <ul className="tick" style={{ marginTop: 12 }}>
                  {TIERS[id].features.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 18 }}>
            <a href="/blueprint">Compare the Blueprint tiers in full</a>
          </p>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <div className="card">
            <span className="eyebrow">Example only</span>
            <h3 style={{ marginTop: 12 }}>A sample finding and fix</h3>
            <p className="dim" style={{ marginTop: 6 }}>This is an illustration of the format, not a real client.</p>
            <p style={{ marginTop: 14 }}>
              <strong>Finding:</strong> When asked for a plumber in the business&rsquo;s suburb, ChatGPT and Perplexity named two competitors but not this business. The site has one general &ldquo;Services&rdquo; page, the phone number on the Google Business Profile differs from the website, and there is no structured data.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>Fix:</strong> Make the phone number match everywhere. Split the Services page into one page per main service with the suburbs served. Add LocalBusiness schema with the correct name, address, phone and hours. A ready-to-paste schema block and page outline are included.
            </p>
          </div>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>How it works</h2>
          <ol style={{ marginTop: 18, paddingLeft: 20, display: "grid", gap: 14 }}>
            {STEPS.map((s) => (
              <li key={s.title}>
                <strong>{s.title}.</strong> <span className="dim">{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>Who it suits</h2>
          <ul className="tick" style={{ marginTop: 14 }}>
            {SUITS.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
      <section>
        <div className="wrap" style={{ maxWidth: 800 }}>
          <h2>Questions</h2>
          <div style={{ marginTop: 18 }}>
            {FAQS.map((item) => (
              <details className="faq" key={item.q}>
                <summary>{item.q}<span aria-hidden>+</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div className="card" style={{ marginTop: 36 }}>
            <h3>Not sure where to start?</h3>
            <p className="dim" style={{ marginTop: 8 }}>
              Take the free AI Readiness Score first. When you want the full picture and the fixes, order a Blueprint from {TIERS.starter.priceLabel}.
            </p>
            <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a className="btn" href="/score">Get your free score</a>
              <a className="btn ghost" href="/blueprint">See the Blueprint</a>
              <a className="btn ghost" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
