import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import JsonLd from "../../components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/seo-meta";
import "../legal.css";

export const DEMO_URL = "https://calendly.com/shanegoldberg/30min";
export const INVITE_URL = "mailto:hello@saabai.ai?subject=Lex%20beta%20invite";
export const ASSISTANCE_ONLY = "Lex provides drafting and research assistance only, not legal advice. A lawyer must review all output before it is relied on.";

export type Topic = {
  path: string;
  crumb: string;
  h1: string;
  lead: string;
  does: string[];
  doesNot: string[];
  faqs: { q: string; a: string }[];
};

export default function TopicPage({ t }: { t: Topic }) {
  return (
    <div className="lx">
      <JsonLd data={faqSchema(t.faqs)} />
      <JsonLd data={breadcrumbSchema([{ name: "Lex", path: "/legal" }, { name: t.crumb, path: t.path }])} />
      <Nav activePage="/legal" />
      <section className="lx-hero">
        <div className="lx-wrap lx-hero-inner">
          <span className="lx-badge">Lex by Saabai<span className="lx-hm"> &middot; AI legal assistant for Australian firms</span></span>
          <h1>{t.h1}</h1>
          <p className="lx-lead">{t.lead}</p>
          <p className="lx-lead" style={{ marginTop: 12, fontSize: 15 }}>{ASSISTANCE_ONLY}</p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free Lex demo</a>
            <a className="lx-btn lx-ghost" href={INVITE_URL}>Request a beta invite</a>
          </div>
        </div>
      </section>
      <section className="lx-sec">
        <div className="lx-wrap">
          <div className="lx-feats">
            <div className="lx-card"><h3>What Lex does</h3><ul>{t.does.map((d) => <li key={d}>{d}</li>)}</ul></div>
            <div className="lx-card"><h3>What Lex does not do</h3><ul>{t.doesNot.map((d) => <li key={d}>{d}</li>)}</ul></div>
            <div className="lx-card"><h3>Price</h3><p>Firm plan: $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited legal research and 20 documents a month. Enterprise for larger firms. See <a href="/legal#pricing" style={{ textDecoration: "underline" }}>Lex pricing</a>.</p></div>
          </div>
        </div>
      </section>
      <section id="faq" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head lx-center"><div className="lx-eyebrow">FAQ</div><h2>Questions lawyers ask</h2></div>
          <div className="lx-faq">
            {t.faqs.map((f) => (
              <details key={f.q}><summary><h3>{f.q}</h3><span aria-hidden="true">+</span></summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>
      <section className="lx-final">
        <div className="lx-wrap lx-final-inner">
          <h2>See Lex on your own matters.</h2>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free Lex demo</a>
            <a className="lx-btn lx-ghost" href={INVITE_URL}>Request a beta invite</a>
          </div>
          <p className="lx-lead" style={{ marginTop: 12, fontSize: 15 }}>
            <a href="/legal" style={{ textDecoration: "underline" }}>Back to Lex</a>{" · "}Already a Lex firm? <a href="/login?redirect=/lex" style={{ textDecoration: "underline" }}>Sign in to Lex</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
