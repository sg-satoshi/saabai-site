import type { Metadata } from "next";
import Nav from "./components/Nav";
import HeroHeadline from "./components/exp/HeroHeadline";
import HeroCta from "./components/exp/HeroCta";
import SbFooter from "./components/sb/SbFooter";
import JsonLd from "./components/JsonLd";
import { miaServiceSchema } from "@/lib/seo-entity";
import { faqSchema } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { formatAud, WEBSITE_TIERS, websiteHomeCareNote, websiteOfferLine } from "@/lib/website-tiers";
import { TIERS } from "@/lib/blueprint";
import VoiceDemo from "./components/sb/VoiceDemo";
import "./components/sb/sb.css";
import "./components/sb/home.css";

export const metadata: Metadata = publicPageMeta.home;

const copyLink = { color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 } as const;
const voiceDemoReady = Boolean(process.env.XAI_API_KEY);

const FAQS = [
  { q: "What is the AI Readiness Score?", a: "A free 3 minute quiz with 12 questions about how your business runs. You get an instant score out of 100, a breakdown by area and three quick wins you can use this week." },
  { q: "Do I need a new website to get a Blueprint?", a: "No. The Blueprint looks at your whole business, including your current website and tools. Many clients start with a Blueprint and decide on a website later." },
  { q: "How is the Blueprint fee credited?", a: "Book any Saabai build within 30 days of receiving your Blueprint and the full Blueprint fee comes off your build invoice." },
  { q: "Who looks after my site after launch?", a: "We do. Hosting, updates, security and small changes are included in your monthly care plan, so you can get on with running the business." },
];

export default function Home() {
  return (
    <div className="sb">
      {/* Next.js metadata drops the trailing slash on this URL. */}
      <link rel="canonical" href="https://www.saabai.ai/" />
      <JsonLd data={miaServiceSchema} />
      <JsonLd data={faqSchema(FAQS)} />
      <Nav activePage="/" />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div className="hero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="pill">New: Saabai Blueprint, your AI plan in 48 hours</span>
          <HeroHeadline />
          <p className="lead">
            Saabai Blueprint shows small businesses and practices which tasks to automate first, what each costs, and what you&apos;ll save. Start with the free 3 minute AI score.
          </p>
          <div className="ctas">
            <HeroCta />
            <a className="btn ghost" href="/blueprint">See the Blueprint</a>
            <VoiceDemo ready={voiceDemoReady} />
          </div>
          {/* TODO: Google rating goes here once Shane has consent to publish it. Do not add a rating, review count or stars until then. */}
          <div className="trust">Free 3 minute quiz · Blueprint from {TIERS.starter.priceLabel} · Websites from {formatAud(WEBSITE_TIERS[0].buildFrom)}</div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card offer">
            <span className="eyebrow">Web Solutions</span>
            <h3>A website that works as hard as you do</h3>
            <p>We design, build, host and look after it. Every tier includes hosting, care and a trained AI enquiry chatbot.</p>
            <ul className="tick">
              {WEBSITE_TIERS.map((tier) => <li key={tier.name}>{websiteOfferLine(tier)}</li>)}
            </ul>
            <div className="price">From <b>{formatAud(WEBSITE_TIERS[0].buildFrom)}</b> + {formatAud(WEBSITE_TIERS[0].monthly)}/mo care, AUD</div>
            <a className="btn ghost" href="/websites" style={{ marginTop: 22 }}>See websites →</a>
          </div>
          <div className="card offer feat">
            <span className="eyebrow">Saabai Blueprint</span>
            <h3>Your AI plan, ranked by dollars saved</h3>
            <p>Whether you run a workshop or a practice, we study how your business runs and hand you a clear plan: which tasks to automate first, what it costs and what it saves.</p>
            <ul className="tick">
              <li>Ranked opportunities with hours and $ saved</li>
              <li>Delivered as a PDF and in your client portal</li>
              <li>Fee credited if you build with us in 30 days</li>
            </ul>
            <div className="price">From <b>$497</b> · start with a free score</div>
            <a className="btn" href="/score" style={{ marginTop: 22 }}>Get your free AI score →</a>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="head">
            <span className="eyebrow">Live client sites</span>
            <h2 style={{ marginTop: 12 }}>Small businesses, running on Saabai</h2>
          </div>
          <div className="grid2">
            <a className="site" href="https://stuscyclerepairs.com" target="_blank" rel="noopener noreferrer">
              <div className="bar"><i /><i /><i /></div>
              <div className="shot" role="img" aria-label="Stu's Cycle Repairs website homepage" style={{ backgroundImage: "url(/sites/cycle-repair/stus-hero-thumb.webp)", backgroundPosition: "top center" }} />
              <div className="meta">
                <h3>Stu&apos;s Cycle Repairs</h3>
                <p style={{ fontSize: 15 }}>Bookings site with online enquiries, Google reviews and instant lead alerts to Stu&apos;s phone.</p>
              </div>
            </a>
            <a className="site" href="https://wholesalehomes.com.au" target="_blank" rel="noopener noreferrer">
              <div className="bar"><i /><i /><i /></div>
              <div className="shot" style={{ backgroundImage: "linear-gradient(0deg,rgba(11,9,46,.85),rgba(11,9,46,.1)),url(/sites/wholesale-homes/astel/astel-zara.jpg)" }}>
                <div style={{ position: "absolute", left: 20, right: 20, bottom: 18, fontWeight: 700, fontSize: 20, letterSpacing: ".02em" }}>
                  WHOLESALE HOMES <span style={{ color: "var(--teal)" }}>AUSTRALIA</span>
                </div>
              </div>
              <div className="meta">
                <h3>Wholesale Homes Australia</h3>
                <p style={{ fontSize: 15 }}>Home design catalogue with floor plans, enquiry flow and an AI assistant that answers buyer questions.</p>
              </div>
            </a>
            <a className="site" href="https://www.lifestylemoneymanagement.com.au" target="_blank" rel="noopener noreferrer">
              <div className="bar"><i /><i /><i /></div>
              <div className="shot" role="img" aria-label="Lifestyle Money Management website homepage with a golden-hour family home and 5.0 Google reviews badge" style={{ backgroundImage: "url(/sites/lmm-hero-thumb.webp)", backgroundPosition: "top center" }} />
              <div className="meta">
                <h3>Lifestyle Money Management</h3>
                <p style={{ fontSize: 15 }}>Mortgage broking and lending advice for SA and QLD, with a strategy call booking flow and Google reviews on show.</p>
              </div>
            </a>
            <a className="site" href="https://www.boconsulting.com.au" target="_blank" rel="noopener noreferrer">
              <div className="bar"><i /><i /><i /></div>
              <div className="shot" role="img" aria-label="BO Consulting website homepage with recruitment and workforce solutions hero" style={{ backgroundImage: "url(/sites/bo-consulting-hero-thumb.webp)", backgroundPosition: "top center" }} />
              <div className="meta">
                <h3>BO Consulting</h3>
                <p style={{ fontSize: 15 }}>Recruitment and workforce solutions for Australian businesses, with a clear enquiry form for employers and job seekers.</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow">How the Blueprint works</span>
            <h2 style={{ marginTop: 12 }}>From quiz to clear plan in four steps</h2>
          </div>
          <div className="grid4">
            {[
              ["Take the free score", "12 quick questions. Get a score out of 100 and three quick wins straight away."],
              ["Pick your Blueprint", "Choose Starter, Pro or Business. Pay securely by card in under a minute."],
              ["Tell us how you work", "A short fact-find on your tools, team and busiest tasks. About 15 minutes."],
              ["Get your plan", "A ranked plan with hours and dollars saved, reviewed by Shane on Pro and above."],
            ].map(([t, b], i) => (
              <div className="card step" key={t}>
                <div className="n">{i + 1}</div>
                <h3>{t}</h3>
                <p style={{ fontSize: 15, marginTop: 8 }}>{b}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a className="btn ghost" href="/blueprint">See Blueprint tiers →</a>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="head">
            <span className="eyebrow">Web Solutions packages</span>
            <h2 style={{ marginTop: 12 }}>Built, hosted and managed for you</h2>
          </div>
          <div className="grid3">
            {WEBSITE_TIERS.map((tier) => (
              <div className={`card pkg${tier.highlight ? " feat" : ""}`} key={tier.name}>
                {tier.highlight ? <span className="pill" style={{ float: "right" }}>Most popular</span> : null}
                <h3>{tier.name}</h3>
                <div className="amt">{formatAud(tier.buildFrom)}</div>
                <p className="dim" style={{ fontSize: 14 }}>{websiteHomeCareNote(tier)}</p>
                <ul className="tick">
                  {tier.homePoints.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a className="btn ghost" href="/websites">Compare website packages →</a>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="card">
            <h2>AI chatbots for Australian small businesses and law firms</h2>
            <div style={{ display: "grid", gap: 14, marginTop: 16, maxWidth: 900, fontSize: 17 }}>
              <p>Saabai is a <a href="/ai-receptionist-gold-coast" style={copyLink}>Gold Coast</a> business based in Merrimac, Queensland, and we work remotely with clients across Australia.</p>
              <p>We build custom AI chatbots for business websites, trained on your own services, hours and policies.</p>
              <p>Your chatbot answers visitors day and night, so enquiries that come in after hours get a reply instead of sitting in an inbox until morning.</p>
              <p>It captures the person&apos;s details and what they need, then alerts you straight away.</p>
              <p>Email enquiry alerts come with every plan, and we can also send alerts to Telegram, WhatsApp or SMS.</p>
              <p>Want to see one working? Chat with Mia, our own AI assistant, right here on saabai.ai.</p>
              <p>For <a href="/ai-chatbot-law-firms" style={copyLink}>law firms</a>, we also build <a href="/legal" style={copyLink}>Lex</a>, an AI legal assistant for legal practices.</p>
              <p>For businesses in Brisbane, the Gold Coast and the Sunshine Coast, see our <a href="/ai-chatbot-developer-queensland" style={copyLink}>custom AI chatbot developer in Queensland</a> page.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="card">
            <h2>Enquiry alerts</h2>
            <div style={{ display: "grid", gap: 14, marginTop: 16, maxWidth: 900, fontSize: 17 }}>
              <p>The website chatbot does not send enquiry emails yet.</p>
              <p>If you would rather hear about leads on your phone, we can also send alerts to Telegram, WhatsApp or SMS.</p>
              <p>You choose where each enquiry goes, so the right person sees it quickly and can follow up while the customer is still keen.</p>
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
              <h2>How ready is your business <span className="grad">for AI?</span></h2>
              <p style={{ maxWidth: 540, margin: "16px auto 30px", fontSize: 17 }}>Find out in 3 minutes. Free score out of 100, plus three quick wins you can use this week.</p>
              <a className="btn" href="/score">Get your free AI score →</a>
            </div>
          </div>
        </div>
      </section>
      <SbFooter />
    </div>
  );
}
