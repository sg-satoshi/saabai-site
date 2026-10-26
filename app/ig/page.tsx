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
  title: "Free 5-minute site check",
  description: "Shane Goldberg records a free 5-minute video review of your website. For visitors from his Instagram bio.",
  // Campaign page. Same noindex treatment as /login and the other non-search pages in next.config headers.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: PATH },
  openGraph: {
    url: PATH,
    title: "Free 5-minute site check",
    description: "A free video review of your website from Shane Goldberg at Saabai.",
  },
  twitter: { card: "summary", title: "Free 5-minute site check" },
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
          <h1>Stop missing leads from your website.</h1>
          <p className="lead">Shane records a free 5-minute video review of your site and emails it to you.</p>
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
            <h2>Three ways Saabai helps after the video</h2>
          </div>
          <div className="grid3">
            <article className="card">
              <p className="eyebrow">AI receptionist</p>
              <h3>Someone answers when you are on the tools</h3>
              <p>A website receptionist takes the enquiry and sends it to you. Lachie, the voice demo, is on the Saabai homepage. That demo already says you are talking with an AI before it starts.</p>
              <a className="ig-more" href="/ai-receptionist-gold-coast">See the AI receptionist</a>
            </article>
            <article className="card">
              <p className="eyebrow">Websites</p>
              <h3>A site that captures the enquiry</h3>
              <p>
                Builds from {formatAud(presence.buildFrom)}, care from {formatAud(presence.monthly)} a month.
                A basic site is about 1 week, a mid-tier site about 2 weeks, and a custom build up to 4 weeks, once we have your content and you have signed off the design.
              </p>
              <a className="ig-more" href="/websites">See websites</a>
            </article>
            <article className="card">
              <p className="eyebrow">Blueprint</p>
              <h3>The paid audit the video can lead to</h3>
              <p>
                The video looks at your website. A Blueprint maps the whole business, ranked by hours and dollars.
                Starter {TIERS.starter.priceLabel}, Pro {TIERS.pro.priceLabel}, Business {TIERS.business.priceLabel}.
              </p>
              <a className="ig-more" href="/blueprint">See the Blueprint</a>
            </article>
          </div>
        </div>
      </section>

      <section className="ig-faq">
        <div className="wrap ig-narrow">
          <h2>Questions</h2>
          <details className="faq">
            <summary>What do I get? <span>+</span></summary>
            <p>A short video from Shane, about 5 minutes, reviewing your website. He records what he sees and emails it to you. The video covers the site. A Blueprint is the separate paid audit of the whole business.</p>
          </details>
          <details className="faq">
            <summary>Is it really free? <span>+</span></summary>
            <p>Yes. The video is free. A Blueprint is a separate paid audit if you want one after you have seen the video.</p>
          </details>
          <details className="faq">
            <summary>How fast will I hear back? <span>+</span></summary>
            {/* PLACEHOLDER for Shane to confirm: within 2 business days */}
            <p>Within 2 business days.</p>
          </details>
        </div>
      </section>

      <SbFooter />
    </div>
  );
}
