import type { Metadata } from "next";
import Image from "next/image";
import SbFooter from "../components/sb/SbFooter";
import { NAP } from "@/lib/seo-entity";
import { TIERS } from "@/lib/blueprint";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import IgForm from "./IgForm";
import "../components/sb/sb.css";
import "./ig.css";

const PATH = "/ig";

export const metadata: Metadata = {
  title: "Free instant site check",
  description: "Free instant site check. See a score out of 100 and the first three fixes on your website.",
  // Campaign page. Same noindex treatment as /login and the other non-search pages in next.config headers.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: PATH },
  openGraph: {
    url: PATH,
    title: "Free instant site check",
    description: "See a score out of 100 and the first three fixes on your website.",
  },
  twitter: { card: "summary", title: "Free instant site check" },
};

const presence = WEBSITE_TIERS[0];

export default function InstagramLandingPage() {
  return (
    <div className="sb ig">
      <header className="ig-top wrap">
        <a href="/" aria-label="Saabai home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/saabai-logo.png" alt={NAP.name} width={118} height={32} />
        </a>
      </header>

      <section className="ig-hero">
        <div className="glow" aria-hidden="true" />
        <div className="wrap ig-narrow" style={{ position: "relative" }}>
          <p className="eyebrow">Instagram</p>
          <h1>Free instant site check: see what&apos;s costing you leads</h1>
          <p className="lead">Enter your website. We read the pages we are allowed to open and show a score out of 100, the first three fixes, and what was checked.</p>
          <div className="ig-shane">
            <Image
              src="/shane-goldberg.png"
              alt="Shane Goldberg, founder of Saabai"
              width={64}
              height={64}
              priority
            />
            <div>
              <p className="who">Shane Goldberg</p>
              <p className="cred">Built and sold Ink FX Printing. Now building Saabai for Gold Coast businesses.</p>
            </div>
          </div>
          <IgForm />
          <noscript>
            <p className="ig-fine" style={{ marginTop: 12 }}>
              Email <a href={`mailto:${NAP.email}`}>{NAP.email}</a> with your name, business and website, and mention the free site check.
            </p>
          </noscript>
        </div>
      </section>

      <section className="ig-next">
        <div className="wrap">
          <div className="head">
            <p className="eyebrow">If you want to look around</p>
            <h2>Four ways Saabai helps after the check</h2>
          </div>
          <div className="grid4">
            <article className="card">
              <p className="eyebrow">AI receptionist</p>
              <h3>Someone answers when you are on the tools</h3>
              <p>A website receptionist answers visitors and keeps a log of the chat. Enquiry alerts are coming soon. Lachie, the voice demo, is on the Saabai homepage. That demo already says you are talking with an AI before it starts.</p>
              <a className="ig-more" href="/ai-receptionist-gold-coast">See the AI receptionist</a>
            </article>
            <article className="card">
              <p className="eyebrow">Websites</p>
              <h3>A site with a chatbot that answers</h3>
              <p>
                Builds from {formatAud(presence.buildFrom)}, care from {formatAud(presence.monthly)} a month.
                A basic site is about 1 week, a mid-tier site about 2 weeks, and a custom build up to 4 weeks, once we have your content and you have signed off the design.
              </p>
              <a className="ig-more" href="/websites">See websites</a>
            </article>
            <article className="card">
              <p className="eyebrow">Blueprint</p>
              <h3>The paid audit after this check</h3>
              <p>
                This check reads your website. A Blueprint maps the whole business, ranked by hours and dollars.
                Starter {TIERS.starter.priceLabel}, Pro {TIERS.pro.priceLabel}, Business {TIERS.business.priceLabel}.
              </p>
              <a className="ig-more" href="/blueprint">See the Blueprint</a>
            </article>
            <article className="card">
              <p className="eyebrow">Lex for law firms</p>
              <h3>An AI legal assistant that shows its sources</h3>
              <p>
                Lex searches public Australian government sources, including ATO rulings and Commonwealth legislation, and answers with citations so you can check them yourself.
                Book a free 30-minute demo.
              </p>
              <a className="ig-more" href="/legal">See Lex and book a demo</a>
            </article>
          </div>
        </div>
      </section>

      <section className="ig-faq">
        <div className="wrap ig-narrow">
          <h2>Questions</h2>
          <details className="faq">
            <summary>What do I get? <span>+</span></summary>
            <p>A score out of 100 from the search and conversion checks we could actually run, the first three fixes in plain English, and a note of what was checked. If we cannot read the site, there is no score.</p>
          </details>
          <details className="faq">
            <summary>Is it really free? <span>+</span></summary>
            <p>Yes. The check is free. A Blueprint is a separate paid audit if you want one after you have seen the result.</p>
          </details>
          <details className="faq">
            <summary>What if you can&apos;t read my site? <span>+</span></summary>
            <p>We say so on the page. We do not invent a score. Your name, business, website and email are still saved.</p>
          </details>
        </div>
      </section>

      <SbFooter />
    </div>
  );
}
