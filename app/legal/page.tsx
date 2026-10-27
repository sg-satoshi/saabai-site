import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema, faqSchema, orgRef } from "@/lib/seo-meta";
import { lexServiceSchema } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import { LachieLegalDemo, LexWebsiteDemo } from "../components/legal-demos/HarbourDemos";
import { OALC_SOURCE_PANEL } from "@/lib/oalc-disclosure";
import "./legal.css";

export const metadata: Metadata = publicPageMeta.legal;

const DEMO_URL = "https://calendly.com/shanegoldberg/30min";
const voiceDemoReady = Boolean(process.env.XAI_API_KEY);

/*
 * Every claim on this page is checked against the Lex code (lib/lex-tools.ts,
 * lib/lex-config.ts, lib/lex-document-types.ts, app/api/lex-*). Do not add a
 * source, document type or hosting/security claim here unless the code (or the
 * infrastructure) supports it. Not claimed on purpose: Australian hosting
 * (functions run in iad1), per-firm data workspaces (threads are per login),
 * uploaded-document review for firms (admin-only today) and a free trial.
 *
 * Client privacy claims are limited to what is live (Lex privacy Phases 1 and 2):
 * masking in lib/lex-privacy/mask.ts and lib/pii-scanner.ts, the single gateway with no
 * switch in lib/lex-privacy/gateway.ts (used by every app/api/lex-* model route), tool and
 * search masking in LexGateway.wrapTools, the counts-only log in lib/lex-privacy/redaction-log.ts,
 * and the leak tests in tests/lex-privacy-*.test.ts. Not claimed yet: AI-powered name detection,
 * masking of uploaded documents, data residency, and provider retention or training terms.
 */

// Sources Lex can search today (one tool each in lib/lex-tools.ts).
const SOURCES = [
  { name: "ATO", note: "Tax rulings, PCGs, interpretive decisions" },
  { name: "Federal Register of Legislation", note: "Acts, Regulations, Determinations" },
  { name: "Act status", note: "In force, repealed or renamed, and pending amendments" },
  { name: "ASIC", note: "Corporate law guidance" },
  { name: "Fair Work Commission", note: "Employment law" },
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
  { q: "What is Lex?", a: "Lex is an AI legal assistant for research and drafting at Australian law firms. It searches public Australian government sources, including ATO rulings and Commonwealth legislation, and every answer cites its source." },
  { q: "Is the website chatbot the same as Lex?", a: "No. Lex is the AI legal assistant for research and drafting. The chat demo on this page is a separate website chatbot for a fictional firm. It answers visitor questions. It does not search legislation or draft documents." },
  { q: "Can I rely on Lex's answers without checking?", a: "No. Lex cites the legislation and rulings it relies on and says when the law is uncertain. A case citation can be checked against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions (cutoff 10 March 2025). That snapshot is not live case law and does not cover every court. Always check primary sources before advising a client." },
  { q: "Which sources does Lex search?", a: "Public Australian government sources: ATO rulings and interpretive decisions, the Federal Register of Legislation (including whether an Act is in force), ASIC and the Fair Work Commission. Case citations are checked against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions, cutoff 10 March 2025. Other courts are not in that snapshot." },
  { q: "Is it useful for tax and ATO disputes?", a: "Yes. Lex searches ATO rulings and interpretive decisions alongside Commonwealth legislation, so it suits objections, reviews and ruling work." },
  { q: "What documents can Lex draft?", a: "Ten document types: discretionary and unit trust deeds, BFAs for married and de facto couples, financial settlement consent orders, separation agreements, service agreements, shareholders agreements, employment contracts and commercial leases. You can also draft a custom document from your own instructions, and every draft gets a QA pass." },
  { q: "Does my client's information reach the AI model?", a: "Not in readable form. Names, business names, phone numbers, emails and ABNs or ACNs are swapped for placeholders before anything is sent, and the real details are put back only in the answer you see." },
  { q: "Can a firm switch the privacy masking off?", a: "No. Every Lex AI request goes through the same privacy checkpoint for every firm, including firms that use their own AI key, and if masking fails nothing is sent." },
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
            <b>ATO</b><b>Federal Register of Legislation</b>
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
          <div className="lx-src"><sup>3</sup><div><b>Act status</b><span>In force or repealed, from the Federal Register</span></div></div>
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
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: "https://www.saabai.ai/legal", name: "Lex AI Legal Assistant | Saabai, Gold Coast", dateModified: "2026-10-26" }} />
      <Nav activePage="/legal" />

      {/* Hero */}
      <section className="lx-hero">
        <div className="lx-wrap lx-hero-inner">
          <span className="lx-badge">Lex by Saabai<span className="lx-hm"> &middot; AI legal assistant for Australian firms</span></span>
          <h1>Lex, an AI legal assistant that <span className="lx-grad">shows its sources.</span></h1>
          <p className="lx-lead">
            Lex searches public Australian government sources, including ATO rulings and Commonwealth legislation.
            It answers with citations and links to the sources it used, so you can check them yourself. Draft documents in the same workspace.
          </p>
          <p className="lx-lead" style={{ marginTop: 16 }}>
            <a href="/legal/lex-vs-ai-legal-tools" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Lex vs other AI legal tools 2026</a>
          </p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free 30-min demo</a>
            <a className="lx-btn lx-ghost" href="#demo">Try the website demo</a>
          </div>
          <div className="lx-proof">
            <span>Every answer cites its sources</span>
            <span>Built for Australian law</span>
            <span>Built for review by a lawyer</span>
            <span>Client details masked before the AI sees them</span>
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

      <section className="lx-sec" id="workspace">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Two products</div>
            <h2>Lex the workspace is not the chatbot demo.</h2>
            <p className="lx-lead">Lex is the AI legal assistant on this page. Lawyers use it to research and draft.</p>
            <p className="lx-lead" style={{ marginTop: 12 }}>The chat further down is a demo of a website chatbot for a fictional firm. It answers visitors. It does not search legislation or draft documents.</p>
          </div>
        </div>
      </section>

      {/* Live client-chat demo. Harbour Street Legal is fictional. */}
      <section id="demo" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <LexWebsiteDemo />
        </div>
      </section>

      {/* Phone demo. Lex is the assistant on this page. Lachie is the voice demo. Live phone answering is coming soon. */}
      <section id="lachie" className="lx-sec lx-pt0 lx-lachie">
        <div className="lx-wrap">
          <LachieLegalDemo ready={voiceDemoReady} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lx-sec lx-pt0">
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
              <p>Each point cites the section or ruling it relies on, with a link to the source Lex found. Open it and read the passage yourself. A case citation can be checked against the licensed snapshot (cutoff 10 March 2025). If it is not in the snapshot, confirm it exists.</p>
            </div>
            <div className="lx-card">
              <div className="lx-n">03</div>
              <h3>Draft and check</h3>
              <p>Turn the research into a first draft. Lex runs a QA pass and marks each clause verified, flagged or unverified for your review. The QA pass does not quote case law.</p>
            </div>
          </div>
          <div className="lx-callouts">
            <div><b>Proper citations</b>Section and Act, or ruling number, not just a vague reference.</div>
            <div><b>Cases in the snapshot</b>NSW Caselaw, the Federal Court and the High Court, cutoff 10 March 2025. Not every court. NSW and High Court results are citation and link only.</div>
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
          <div className="lx-head" style={{ marginTop: 48 }}>
            <h2>Case law is a licensed snapshot.</h2>
            <p className="lx-lead">NSW Caselaw, the Federal Court and the High Court. Cutoff 10 March 2025. Not every court, and not current law.</p>
          </div>
          <div className="lx-snap">
            {OALC_SOURCE_PANEL.map((p) => (
              <div key={p.title}><b>{p.title}</b><span>{p.body}</span></div>
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
                <li><Check />The case-law snapshot does not include judgment text, so verify any quote yourself</li>
                <li><Check />Recommended checks for a senior lawyer before filing or signing</li>
              </ul>
            </div>
            <div className="lx-card lx-feat">
              <div className="lx-eyebrow">Threads and jurisdictions</div>
              <h3>Pick up where you left off.</h3>
              <p>Research threads are saved to your login, so you can come back to them across sessions.</p>
              <ul>
                <li><Check />Full research history per thread</li>
                <li><Check />Drafting for all 8 states and territories</li>
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
            <div className="lx-card"><Icon d="M5 3h10l4 4v14H5zM9 13h6M9 17h4" /><h3>Every answer cites its sources</h3><p>Points link to the legislation or ruling Lex found, so you can read the passage yourself.</p></div>
            <div className="lx-card"><Icon d="m5 12 5 5 9-10" /><h3>Always check primary sources</h3><p>Lex flags uncertain law. Its output is research assistance, not legal advice.</p></div>
            <div className="lx-card"><Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18" /><h3>Built for Australian law</h3><p>Australian government sources first. Overseas material is only used for comparison.</p></div>
            <div className="lx-card"><Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /><h3>QA on every draft</h3><p>Each clause is marked verified, flagged or unverified, with critical issues listed first. Case-law text is not checked.</p></div>
            <div className="lx-card"><Icon d="M4 6h16M4 12h16M4 18h10" /><h3>Saved to your login</h3><p>Research threads are tied to your own sign-in, so your history is there when you come back.</p></div>
            <div className="lx-card"><Icon d="M12 3v18M3 12h18" /><h3>No lock-in</h3><p>Cancel anytime.</p></div>
          </div>
        </div>
      </section>

      {/* Client privacy (Lex privacy Phases 1 and 2, live) */}
      <section id="privacy" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Client privacy</div>
            <h2>Your client&apos;s details never reach the AI in readable form.</h2>
            <p className="lx-lead">Lex swaps personal details for placeholders before anything is sent to an AI model. You see the real names in your answer, and the model only ever sees the placeholders.</p>
          </div>
          <div className="lx-tgrid">
            <div className="lx-card"><Icon d="M4 7h16M4 12h10M4 17h7M17 15l3 3-3 3" /><h3>Masked before it is sent</h3><p>Names, business and trust names, phone numbers, emails, and ABNs or ACNs become placeholders like {"{{PERSON_1}}"}. They are put back only in the answer you see.</p></div>
            <div className="lx-card"><Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /><h3>One checkpoint, no off switch</h3><p>Every Lex AI request goes through the same privacy checkpoint, for every firm, including firms using their own AI key. If masking fails, nothing is sent.</p></div>
            <div className="lx-card"><Icon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" /><h3>Searches are masked too</h3><p>Legal searches and source lookups get placeholders, not your client&apos;s details. Results come back masked the same way.</p></div>
            <div className="lx-card"><Icon d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3" /><h3>A redaction log, without the details</h3><p>Lex keeps a log for each firm of what kind of details were hidden on each request and how many. It never records the real values.</p></div>
            <div className="lx-card"><Icon d="m5 12 5 5 9-10" /><h3>Tested for leaks</h3><p>Automated leak tests run against the privacy layer, so any code change that would let a real detail through fails its checks.</p></div>
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
              <div className="lx-price">$299<small> per month</small></div>
              <p>Perfect for small-to-mid sized firms.</p>
              <ul>
                {["Unlimited legal research", "20 documents per month", "3 lawyer seats", "Government sources and a licensed case-law snapshot", "QA verification on every draft", "Thread memory and history"].map((i) => (
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
