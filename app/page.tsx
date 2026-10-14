import type { Metadata } from "next";
import Nav from "./components/Nav";
import SbFooter from "./components/sb/SbFooter";
import "./components/sb/sb.css";
import "./components/sb/home.css";

export const metadata: Metadata = {
  title: { absolute: "Websites and AI Systems for Small Businesses | Saabai" },
  description:
    "Saabai builds, hosts and manages websites for small businesses and professional practices, then shows you exactly where AI can save hours every week with a Saabai Blueprint.",
  alternates: { canonical: "/" },
};

const FAQS = [
  { q: "What is the AI Readiness Score?", a: "A free 3 minute quiz with 12 questions about how your business runs. You get an instant score out of 100, a breakdown by area and three quick wins you can use this week." },
  { q: "Do I need a new website to get a Blueprint?", a: "No. The Blueprint looks at your whole business, including your current website and tools. Many clients start with a Blueprint and decide on a website later." },
  { q: "How is the Blueprint fee credited?", a: "Book any Saabai build within 30 days of receiving your Blueprint and the full Blueprint fee comes off your build invoice." },
  { q: "Who looks after my site after launch?", a: "We do. Hosting, updates, security and small changes are included in your monthly care plan, so you can get on with running the business." },
];

export default function Home() {
  return (
    <div className="sb">
      <Nav activePage="/" />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div className="hero">
        <div className="glow" />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="pill">New: Saabai Blueprint, your AI plan in 48 hours</span>
          <h1 style={{ marginTop: 28 }}>
            Websites and AI systems <br />
            <span className="grad">that run your business for&nbsp;you</span>
          </h1>
          <p className="lead">
            Built for small businesses first, and professional practices too. We build, host and manage your website, then show you exactly where AI can save you hours every week.
          </p>
          <div className="ctas">
            <a className="btn" href="/score">Get your free AI score →</a>
            <a className="btn ghost" href="/websites">See websites</a>
          </div>
          <div className="trust">Free 3 minute quiz · Instant score out of 100 · No credit card</div>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="wrap grid2">
          <div className="card offer">
            <span className="eyebrow">Web Solutions</span>
            <h3>A website that works as hard as you do</h3>
            <p>We design, build, host and look after it. You get a fast, modern site with lead alerts, reviews and SEO set up from day one.</p>
            <ul className="tick">
              <li>Built in about two weeks</li>
              <li>Hosting, updates and fixes included</li>
              <li>Optional chatbot and Google reviews</li>
            </ul>
            <div className="price">From <b>$2,000</b> + $100/mo care</div>
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
              <div className="shot" style={{ backgroundImage: "linear-gradient(0deg,rgba(11,9,46,.85),rgba(11,9,46,.1)),url(/sites/cycle-repair/mechanic.jpg)" }}>
                <img src="/sites/cycle-repair/stus-logo-v2.png" alt="Stu's Cycle Repairs logo" style={{ position: "absolute", left: 20, bottom: 18, height: 46, width: "auto" }} />
              </div>
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
            <div className="card pkg">
              <h3>Starter site</h3>
              <div className="amt">$2,000</div>
              <p className="dim" style={{ fontSize: 14 }}>from, + $100/mo hosting and care</p>
              <ul className="tick"><li>Up to 5 pages</li><li>Contact form with lead alerts</li><li>Hosting, SSL and updates</li></ul>
            </div>
            <div className="card pkg feat">
              <span className="pill" style={{ float: "right" }}>Most popular</span>
              <h3>Growth site</h3>
              <div className="amt">$4,000</div>
              <p className="dim" style={{ fontSize: 14 }}>from, + $200/mo</p>
              <ul className="tick"><li>Everything in Starter</li><li>AI chatbot and Google reviews</li><li>Local SEO setup</li></ul>
            </div>
            <div className="card pkg">
              <h3>Custom</h3>
              <div className="amt">Quoted</div>
              <p className="dim" style={{ fontSize: 14 }}>for bigger builds</p>
              <ul className="tick"><li>Portals, bookings, integrations</li><li>Multi-location sites</li><li>Dedicated build plan</li></ul>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a className="btn ghost" href="/websites">Compare website packages →</a>
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
