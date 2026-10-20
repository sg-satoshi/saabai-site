import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema, faqSchema, orgRef } from "@/lib/seo-meta";
import { lexServiceSchema } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import "./legal.css";

export const metadata: Metadata = publicPageMeta.legal;

const DEMO_URL = "https://calendly.com/shanegoldberg/30min";

/*
 * Every claim on this page is checked against the Lex code (lib/lex-tools.ts,
 * lib/lex-config.ts, lib/lex-document-types.ts, app/api/lex-*). Do not add a
 * source, document type or hosting/security claim here unless the code (or the
 * infrastructure) supports it. Not claimed on purpose: Australian hosting
 * (functions run in iad1), per-firm data workspaces (threads are per login),
 * uploaded-document review for firms (admin-only today) and a free trial.
 */

// Sources Lex can search today (one tool each in lib/lex-tools.ts).
const SOURCES = [
  { name: "AustLII", note: "Case law, tribunal decisions, legislation" },
  { name: "ATO", note: "Tax rulings, PCGs, interpretive decisions" },
  { name: "Federal Register of Legislation", note: "Acts, Regulations, Determinations" },
  { name: "State legislation", note: "All 8 jurisdictions" },
  { name: "ASIC", note: "Corporate law guidance" },
  { name: "Administrative Review Tribunal", note: "ART decisions, and former AAT" },
  { name: "Fair Work Commission", note: "Employment law" },
  { name: "Family Court of Australia", note: "Family law decisions" },
];

// The ten structured document types in lib/lex-document-types.ts (plus "Custom").
const DOC_TYPES = [
  "Discretionary Trust Deeds",
  "Unit Trust Deeds",
  "BFAs (married couples)",
  "BFAs (de facto couples)",
  "Financial Settlement Consent Orders",
  "Separation Agreements",
  "Service Agreements",
  "Shareholders Agreements",
  "Employment Contracts",
  "Commercial Leases",
];

const LEX_FAQS = [
  { q: "What is Lex?", a: "Lex is an AI legal research and drafting tool for Australian law firms. It searches AustLII, ATO rulings and Australian legislation, and every answer cites its source." },
  { q: "Can I rely on Lex's answers without checking?", a: "No. Lex cites the sources it relies on and says when the law is uncertain, so checking is fast, and you should always check primary sources before advising a client." },
  { q: "Which sources does Lex search?", a: "AustLII, ATO rulings and interpretive decisions, the Federal Register of Legislation, State and Territory legislation in all 8 jurisdictions, ASIC, Administrative Review Tribunal decisions (and former AAT decisions), the Fair Work Commission and Family Court of Australia decisions." },
  { q: "Is it useful for tax and ATO disputes?", a: "Yes. Lex searches ATO rulings and interpretive decisions alongside case law and legislation, so it suits objections, reviews and ruling work." },
  { q: "What documents can Lex draft?", a: "Ten document types: discretionary and unit trust deeds, BFAs for married and de facto couples, financial settlement consent orders, separation agreements, service agreements, shareholders agreements, employment contracts and commercial leases. You can also draft a custom document from your own instructions, and every draft gets a QA pass." },
  { q: "How much does Lex cost?", a: "The Firm plan is $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited research and 20 documents a month. Larger firms can ask about a custom Enterprise plan, with no lock-in and cancel any time." },
  { q: "How do I get started?", a: "Book a free 30-minute demo. We will show you Lex on your own practice area, and if it suits your firm we set up your logins." },
];

const lexSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lex",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.saabai.ai/legal",
  publisher: orgRef,
  offers: {
    "@type": "Offer",
    name: "Firm",
    price: 299,
    priceCurrency: "AUD",
    priceSpecification: { "@type": "UnitPriceSpecification", price: 299, priceCurrency: "AUD", unitText: "MONTH" },
  },
};

function Check() {
  return <span className="lx-tick" aria-hidden="true" />;
}

function Icon({ d }: { d: string }) {
  return (
    <span className="lx-ic" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d={d} /></svg>
    </span>
  );
}

/** Illustration of how a Lex answer is laid out. Placeholder lines, no real legal content. */
function AnswerIllustration() {
  return (
    <figure className="lx-illo" aria-label="Illustration of a Lex answer with its sources">
      <div className="lx-illo-bar">
        <i /><i /><i />
        <span className="lx-ex">Illustration only, not legal advice</span>
      </div>
      <div className="lx-illo-body">
        <div className="lx-illo-main">
          <div className="lx-q">Can the ATO treat a loan from a private company to a shareholder as a dividend?</div>
          <div className="lx-searched">
            <span>Searched</span>
            <b>AustLII</b><b>ATO</b><b>Federal Register of Legislation</b>
          </div>
          <div className="lx-lines">
            <p><i style={{ width: "92%" }} /><sup>1</sup></p>
            <p><i style={{ width: "78%" }} /></p>
            <p><i style={{ width: "86%" }} /><sup>2</sup></p>
            <p><i style={{ width: "64%" }} /></p>
            <p><i style={{ width: "88%" }} /><sup>3</sup></p>
            <p><i style={{ width: "52%" }} /></p>
          </div>
          <div className="lx-verify">Check the primary sources before you rely on this answer.</div>
        </div>
        <div className="lx-illo-src">
          <div className="lx-src-h">Sources</div>
          <div className="lx-src"><sup>1</sup><div><b>Legislation</b><span>Section and Act, linked to the Federal Register</span></div></div>
          <div className="lx-src"><sup>2</sup><div><b>ATO ruling</b><span>Ruling number and title, linked to ato.gov.au</span></div></div>
          <div className="lx-src"><sup>3</sup><div><b>Case law</b><span>Case name and citation, linked to AustLII</span></div></div>
        </div>
      </div>
    </figure>
  );
}

export default function LegalPage() {
  return (
    <div className="lx">
      <JsonLd data={lexServiceSchema} />
      <JsonLd data={lexSchema} />
      <JsonLd data={faqSchema(LEX_FAQS)} />
      <JsonLd data={breadcrumbSchema([{ name: "Lex", path: "/legal" }])} />
      <Nav activePage="/legal" />

      {/* Hero */}
      <section className="lx-hero">
        <div className="lx-wrap lx-hero-inner">
          <span className="lx-badge">Lex by Saabai<span className="lx-hm"> &middot; AI legal research for Australian firms</span></span>
          <h1>Legal research that <span className="lx-grad">shows its sources.</span></h1>
          <p className="lx-lead">
            Lex searches AustLII, ATO rulings and Federal and State legislation, then answers with citations and links to
            the sources it used, so you can check them yourself. Draft documents in the same workspace.
          </p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free 30-min demo</a>
            <a className="lx-btn lx-ghost" href="#how">See how it works</a>
          </div>
          <div className="lx-proof">
            <span>Every answer cites its sources</span>
            <span>Built for Australian law</span>
            <span>Built for review by a lawyer</span>
          </div>
          <AnswerIllustration />
        </div>
      </section>

      {/* Client line (approved: Tributum Law as the example firm) */}
      <div className="lx-strip">
        <div className="lx-wrap">
          <p>
            Tributum Law, an Adelaide, South Australia ATO dispute and tax law firm, uses Lex for legal research.{" "}
            <a href="https://tributumlaw.com" target="_blank" rel="noopener noreferrer">Visit Tributum Law</a>
          </p>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="lx-sec">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">How it works</div>
            <h2>From question to cited answer to draft.</h2>
            <p className="lx-lead">Lex lists its sources with the answer, so checking takes seconds, not a second search.</p>
          </div>
          <div className="lx-steps">
            <div className="lx-card">
              <div className="lx-n">01</div>
              <h3>Ask in plain English</h3>
              <p>Ask about an objection, a Division 7A loan or a penalty. Lex keeps the thread, so follow-up questions have the context.</p>
            </div>
            <div className="lx-card">
              <div className="lx-n">02</div>
              <h3>Check the citations</h3>
              <p>Each point cites the case, section or ruling it relies on, with a link to the source Lex found. Open it and read the passage yourself.</p>
            </div>
            <div className="lx-card">
              <div className="lx-n">03</div>
              <h3>Draft and check</h3>
              <p>Turn the research into a first draft. Lex runs a QA pass and marks each clause verified, flagged or unverified for your sign-off.</p>
            </div>
          </div>
          <div className="lx-callouts">
            <div><b>Proper citations</b>Case name and citation, section and Act, or ruling number, not just a vague reference.</div>
            <div><b>Binding or persuasive</b>Australian authority comes first. Overseas cases are only used for comparison and are marked as persuasive.</div>
            <div><b>Clear verify cues</b>Lex says when the law is uncertain or developing, and tells you what to check.</div>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Sources</div>
            <h2>Searches Australian legal sources together.</h2>
            <p className="lx-lead">No tab switching, no manual cross-referencing.</p>
          </div>
          <div className="lx-srcs">
            {SOURCES.map((s) => (
              <div key={s.name}><b>{s.name}</b>{s.note}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Features</div>
            <h2>One workspace for research and drafting.</h2>
          </div>
          <div className="lx-feats">
            <div className="lx-card lx-feat">
              <div className="lx-eyebrow">Drafting</div>
              <h3>Drafts with the legislation references built in.</h3>
              <p>Pick a document type and jurisdiction, then add parties and instructions. Lex searches the governing legislation first, then writes a first draft you can export to Word.</p>
              <div className="lx-doctypes">
                {DOC_TYPES.map((d) => <span key={d}>{d}</span>)}
                <span className="lx-dt-custom">Custom document</span>
              </div>
            </div>
            <div className="lx-card lx-feat">
              <div className="lx-eyebrow">QA on every draft</div>
              <h3>Every clause gets a status before you sign off.</h3>
              <p>Lex runs a QA pass on every draft it writes.</p>
              <ul>
                <li><Check />Verified, flagged or unverified status per clause</li>
                <li><Check />Critical issues: legislation mismatches, missing clauses, citation risks</li>
                <li><Check />Recommended checks for a senior lawyer before filing or signing</li>
              </ul>
            </div>
            <div className="lx-card lx-feat">
              <div className="lx-eyebrow">Threads and jurisdictions</div>
              <h3>Pick up where you left off.</h3>
              <p>Research threads are saved to your login, so you can come back to them across sessions.</p>
              <ul>
                <li><Check />Full research history per thread</li>
                <li><Check />Multi-jurisdiction: NSW, VIC, QLD, WA, SA, TAS, ACT, NT</li>
                <li><Check />Export drafts to Word</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="lx-sec lx-trust">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Trust</div>
            <h2>Designed for lawyers who check their work.</h2>
            <p className="lx-lead">Lex speeds up research. It does not replace your judgement, and it is built to make checking easy.</p>
          </div>
          <div className="lx-tgrid">
            <div className="lx-card"><Icon d="M5 3h10l4 4v14H5zM9 13h6M9 17h4" /><h3>Every answer cites its sources</h3><p>Points link to the source Lex found, so you can read the passage yourself.</p></div>
            <div className="lx-card"><Icon d="m5 12 5 5 9-10" /><h3>Always check primary sources</h3><p>Lex flags uncertain law. Its output is research assistance, not legal advice.</p></div>
            <div className="lx-card"><Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18" /><h3>Built for Australian law</h3><p>Australian databases across all 8 jurisdictions. Overseas cases are only used for comparison.</p></div>
            <div className="lx-card"><Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /><h3>QA on every draft</h3><p>Each clause is marked verified, flagged or unverified, with critical issues listed first.</p></div>
            <div className="lx-card"><Icon d="M4 6h16M4 12h16M4 18h10" /><h3>Saved to your login</h3><p>Research threads are tied to your own sign-in, so your history is there when you come back.</p></div>
            <div className="lx-card"><Icon d="M12 3v18M3 12h18" /><h3>No lock-in</h3><p>Cancel anytime.</p></div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lx-sec">
        <div className="lx-wrap">
          <div className="lx-head lx-center">
            <div className="lx-eyebrow">Pricing</div>
            <h2>Simple, transparent pricing.</h2>
            <p className="lx-lead">No surprises. No lock-in.</p>
          </div>
          <div className="lx-plans">
            <div className="lx-plan lx-hi">
              <div className="lx-tier">Firm</div>
              <div className="lx-price">$299<small> /month</small></div>
              <p>Perfect for small-to-mid sized firms.</p>
              <ul>
                {["Unlimited legal research", "20 documents per month", "3 lawyer seats", "All Australian databases", "QA verification on every draft", "Thread memory and history"].map((i) => (
                  <li key={i}><Check />{i}</li>
                ))}
              </ul>
              <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a demo</a>
            </div>
            <div className="lx-plan">
              <div className="lx-tier">Enterprise</div>
              <div className="lx-price">Custom</div>
              <p>For larger firms and legal networks.</p>
              <ul>
                {["Unlimited research and documents", "Unlimited lawyer seats", "Custom clientId embedding", "White-label widget option", "Dedicated onboarding", "Priority support and SLA"].map((i) => (
                  <li key={i}><Check />{i}</li>
                ))}
              </ul>
              <a className="lx-btn lx-ghost" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Contact Us</a>
            </div>
          </div>
          <div className="lx-fine">
            <p>Prices in AUD. GST not applicable.</p>
            <p>No lock-in. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head lx-center">
            <div className="lx-eyebrow">FAQ</div>
            <h2>Questions lawyers ask us.</h2>
          </div>
          <div className="lx-faq">
            {LEX_FAQS.map((f, i) => (
              <details key={f.q} open={i < 2}>
                <summary><h3>{f.q}</h3><span aria-hidden="true">+</span></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lx-final">
        <div className="lx-wrap lx-final-inner">
          <div className="lx-eyebrow">Book a demo</div>
          <h2>See Lex on your own practice area.</h2>
          <p className="lx-lead">Book a free 30-minute demo. We&apos;ll show you live research and document drafting for your exact practice areas.</p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free 30-min demo</a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
