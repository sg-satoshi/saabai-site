import type { Metadata } from "next";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import JsonLd from "../../components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/seo-meta";
import { lexServiceSchema } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import "../legal.css";

export const metadata: Metadata = publicPageMeta.legalCompare;

const DEMO_URL = "https://calendly.com/shanegoldberg/30min";
const CHECKED = "25 October 2026";
const CHECKED_AU = "30 October 2026";

/** Australian tools AI answers name most often (baseline 30 Oct). Wording is from each vendor's own public page. */
const AU_TOOLS: { name: string; eyebrow: string; what: string; price: string; href: string }[] = [
  { name: "Quillio", eyebrow: "Quillio", what: "Quillio's homepage describes it as an AI legal assistant built for Australian lawyers, covering research, document review, chronologies, drafting and file notes. The same page mentions Australian data sovereignty.", price: "Quillio publishes per-user pricing with a free trial on its pricing page. No figure is copied here; check the page for current prices.", href: "https://quillio.au/pricing/" },
  { name: "Smokeball Archie AI", eyebrow: "Smokeball", what: "Smokeball's Archie page describes Archie as an AI legal assistant for Australian law firms that works with Smokeball, listing document and matter summaries, matter analysis and document comparison.", price: "Smokeball publishes per-user plan pricing, and lists Archie AI as an add-on, on its pricing page. No figure is copied here.", href: "https://www.smokeball.com.au/pricing" },
  { name: "LEAP legal AI", eyebrow: "LEAP", what: "LEAP's legal AI page describes AI built into its practice management system to summarise matters, draft documents and research the law. The page also states that answers are checked by qualified Australian lawyers; that is LEAP's statement, not verified here.", price: "LEAP's Australian pricing URL returned a 404 on the check date, so no LEAP price is shown here.", href: "https://www.leaplegalsoftware.com/au/features/legal-ai/" },
  { name: "Clio", eyebrow: "Clio", what: "Clio's Australian homepage describes an AI platform across Clio Work (analysis and drafting), Clio Manage (practice management), Clio Grow (intake) and Clio Draft (document automation), for solo firms through to large law.", price: "Clio's pricing page could not be read on the check date, so no Clio price is shown here.", href: "https://www.clio.com/au/" },
  { name: "Habeas", eyebrow: "Habeas", what: "Habeas's homepage describes it as an AI legal research platform for Australian lawyers, founded in 2023, for research, querying the law and first drafts in one interface.", price: "Habeas publishes monthly plan pricing on its pricing page. No figure is copied here.", href: "https://www.habeas.ai/pricing" },
];

const FAQS = [
  {
    q: "How much does Lex cost?",
    a: "The Firm plan is $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited research and 20 documents a month. Larger firms can ask about a custom Enterprise plan.",
  },
  {
    q: "Which sources does Lex search?",
    a: "Public Australian government sources: ATO rulings and interpretive decisions, the Federal Register of Legislation (including whether an Act is in force), ASIC and the Fair Work Commission. Case citations are checked against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions (cutoff 10 March 2025). Other courts are not in that snapshot.",
  },
  {
    q: "What other AI legal tools are available to Australian firms?",
    a: "This page covers Quillio, Smokeball Archie, LEAP, Clio, Habeas, Harvey, CoCounsel and Lexis+ AI, using each company's own public pages. It is not a ranking. Lex is a research and drafting workspace: $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited legal research and 20 documents a month.",
  },
  {
    q: "Where does Lex host data?",
    a: "The Lex page does not state a hosting location. This comparison does not add one.",
  },
  {
    q: "Is Lex the same as the law firm website chatbot?",
    a: "No. Lex is the AI legal assistant for research and drafting, and the law firm website chatbot is a separate demo that answers visitors and does not search legislation or draft documents.",
  },
];

const SOURCES: { name: string; href: string; note: string }[] = [
  { name: "Lex on saabai.ai", href: "https://www.saabai.ai/legal", note: "Price, sources, privacy wording and the licensed case-law snapshot limits." },
  { name: "Harvey homepage", href: "https://www.harvey.ai/", note: "Product description. No price is listed on this page." },
  { name: "Harvey pricing URL", href: "https://www.harvey.ai/pricing", note: "Returned 404 on the check date. Not used as a price." },
  { name: "Harvey security", href: "https://www.harvey.ai/security", note: "Hosting and data localisation wording." },
  { name: "Harvey security addendum", href: "https://www.harvey.ai/legal/security-addendum", note: "Hosting region is the region on the order form." },
  { name: "CoCounsel Legal, Australia", href: "https://www.thomsonreuters.com.au/en-au/products/cocounsel-legal.html", note: "What the product does, and the sources Thomson Reuters names." },
  { name: "CoCounsel, Australia", href: "https://www.thomsonreuters.com.au/en-au/products/cocounsel.html", note: "Australia hosting FAQ for CoCounsel Core." },
  { name: "CoCounsel Legal pricing, United States", href: "https://sales.legalsolutions.thomsonreuters.com/en-us/products/cocounsel-legal/700/plans-pricing", note: "A dollar total is shown only after you enter firm details. No figure is copied here." },
  { name: "LexisNexis Australia press release, 18 March 2025", href: "https://www.lexisnexis.com/community/pressroom/au/b/au-news/posts/lexisnexis-australias-market-leading-lexis-ai-solution-enrols-1000s-of-active-adopters-within-first-12-months-as-it-launches-critical-local-hosting-milestone", note: "Local hosting statement for Lexis+ AI." },
  { name: "LexisNexis Australia customer terms, April 2025", href: "https://www.lexisnexis.com/assets/en-au/pdf/LNAU-Agreement-Global-Platform-General-Terms-and-Conditions_April-2025.pdf", note: "Clause 3.9, primary hosting and failover for the Lexis+ AI Service." },
];

export default function LexComparePage() {
  return (
    <div className="lx">
      <JsonLd data={lexServiceSchema} />
      <JsonLd data={faqSchema(FAQS)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Lex", path: "/legal" },
        { name: "Lex vs other AI legal tools 2026", path: "/legal/lex-vs-ai-legal-tools" },
      ])} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        url: "https://www.saabai.ai/legal/lex-vs-ai-legal-tools",
        name: "Lex vs other AI legal tools 2026 | Saabai",
        dateModified: "2026-10-30",
      }} />
      <Nav activePage="/legal" />

      <section className="lx-hero">
        <div className="lx-wrap lx-hero-inner">
          <span className="lx-badge">Lex by Saabai<span className="lx-hm"> &middot; AI legal assistant</span></span>
          <h1>Lex vs other AI legal tools 2026</h1>
          <p className="lx-lead">
            This page compares Lex with Quillio, Smokeball Archie, LEAP, Clio, Habeas, Harvey, CoCounsel and Lexis+ AI.
            Lex facts come from saabai.ai. The other facts are quoted from each company&apos;s public pages, checked on {CHECKED} (Harvey, CoCounsel, Lexis+ AI) and {CHECKED_AU} (the Australian tools).
          </p>
          <p className="lx-lead" style={{ marginTop: 16 }}>
            It is not a ranking. Where a public page does not state a price or a source list, this page says so.
          </p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href="/legal">Back to Lex</a>
            <a className="lx-btn lx-ghost" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free 30-min demo</a>
          </div>
        </div>
      </section>

      <section className="lx-sec">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Lex, the workspace</div>
            <h2>Lex is not the law firm website chatbot.</h2>
            <p className="lx-lead">Lex is Saabai&apos;s AI legal assistant for research and drafting. Lawyers use it on the <a href="/legal" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Lex page</a>.</p>
            <p className="lx-lead" style={{ marginTop: 12 }}>The chat demo on that page, and on the law firm chatbot page, is a separate website chatbot for a fictional firm. It answers visitors. It does not search legislation or draft documents.</p>
          </div>
        </div>
      </section>

      <section className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Lex</div>
            <h2>Lex, from Saabai</h2>
          </div>
          <div className="lx-feats">
            <div className="lx-card">
              <h3>Price</h3>
              <p>The Firm plan is $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited research and 20 documents a month.</p>
              <p style={{ marginTop: 12 }}>Enterprise is custom. Source: the <a href="/legal#pricing" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Lex pricing section</a>.</p>
            </div>
            <div className="lx-card">
              <h3>Sources</h3>
              <p>Lex searches public Australian government sources: ATO rulings and interpretive decisions, the Federal Register of Legislation, whether an Act is in force, ASIC and the Fair Work Commission.</p>
              <p style={{ marginTop: 12 }}>Case citations are checked against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions (cutoff 10 March 2025). It does not cover every court, and NSW and High Court results are citation and link only. Confirm anything the snapshot does not contain.</p>
            </div>
            <div className="lx-card">
              <h3>Data location</h3>
              <p>The Lex page does not state where data is hosted. This page does not add a location.</p>
              <p style={{ marginTop: 12 }}>What the page does say is that names, business names, phone numbers, emails and ABNs or ACNs are swapped for placeholders before anything is sent to a model.</p>
            </div>
          </div>
        </div>
      </section>

      {AU_TOOLS.map((t) => (
        <section className="lx-sec lx-pt0" key={t.name}>
          <div className="lx-wrap">
            <div className="lx-head">
              <div className="lx-eyebrow">{t.eyebrow}</div>
              <h2>{t.name}</h2>
              <p className="lx-lead">{t.what}</p>
            </div>
            <div className="lx-feats">
              <div className="lx-card">
                <h3>Price</h3>
                <p>{t.price}</p>
              </div>
              <div className="lx-card">
                <h3>Source</h3>
                <p><a href={t.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{t.href.replace("https://", "")}</a>, checked {CHECKED_AU}. Their wording, not a Saabai claim about their product.</p>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Harvey</div>
            <h2>Harvey</h2>
            <p className="lx-lead">Harvey&apos;s homepage describes an AI platform for law firms and in-house legal teams, including agents, a document vault and contract tools.</p>
          </div>
          <div className="lx-feats">
            <div className="lx-card">
              <h3>Price</h3>
              <p>The homepage does not list a price. On {CHECKED}, harvey.ai/pricing returned a 404, so no Harvey price is shown here.</p>
            </div>
            <div className="lx-card">
              <h3>Sources</h3>
              <p>The Harvey homepage and the Harvey security page do not name the legal databases Harvey searches. This page does not guess.</p>
            </div>
            <div className="lx-card">
              <h3>Data location</h3>
              <p>Harvey&apos;s security page says the cloud environment is hosted in Microsoft Azure, and that customers who need data localisation can use processing in the EU and Switzerland or Australia.</p>
              <p style={{ marginTop: 12 }}>The same page also says customers can keep data in-region in the EU or Switzerland, the US, or Australia. Harvey&apos;s security addendum says customer data is stored in the region on the current order form.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Thomson Reuters</div>
            <h2>CoCounsel</h2>
            <p className="lx-lead">Thomson Reuters Australia describes CoCounsel Legal as research, drafting and analysis grounded in Practical Law, Westlaw and the organisation&apos;s own knowledge.</p>
          </div>
          <div className="lx-feats">
            <div className="lx-card">
              <h3>Price</h3>
              <p>The Australian CoCounsel pages checked on {CHECKED} do not show a dollar price.</p>
              <p style={{ marginTop: 12 }}>The US CoCounsel Legal pricing page shows a total only after you enter sector, number of attorneys, jurisdiction and plan length. It offers 1-year, 2-year and 3-year plans, and says online prices are for new customers. No dollar figure from that form is copied here.</p>
            </div>
            <div className="lx-card">
              <h3>Sources</h3>
              <p>The CoCounsel Legal Australia page says it draws on Practical Law guidance, Westlaw authority, and the organisation&apos;s documents.</p>
              <p style={{ marginTop: 12 }}>That is Thomson Reuters&apos; description of its own product. This page does not restate their marketing slogans.</p>
            </div>
            <div className="lx-card">
              <h3>Data location</h3>
              <p>The CoCounsel Australia page says data is hosted and processed in Australia. Its FAQ says CoCounsel Core customer prompts, content and output are stored and processed in Australia.</p>
              <p style={{ marginTop: 12 }}>That FAQ names CoCounsel Core. The CoCounsel Legal Australia page checked on {CHECKED} does not itself name a hosting country.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">LexisNexis</div>
            <h2>Lexis+ AI</h2>
            <p className="lx-lead">LexisNexis Australia&apos;s press release of 18 March 2025, published 20 March 2025, describes Lexis+ AI as conversational search, summarisation, drafting and document upload, with results backed by citable sources.</p>
          </div>
          <div className="lx-feats">
            <div className="lx-card">
              <h3>Price</h3>
              <p>That press release and the April 2025 Australia customer terms do not state a dollar price.</p>
              <p style={{ marginTop: 12 }}>On {CHECKED} the Lexis+ with Protégé page and the Australia products page returned HTTP 403, so they are not cited.</p>
            </div>
            <div className="lx-card">
              <h3>Sources</h3>
              <p>The press release says results are backed by verifiable, citable authority and describes the content as Australian legal content. It does not list database names in the passage used here.</p>
              <p style={{ marginTop: 12 }}>The April 2025 terms say access to the Lexis+ AI Service requires a current subscription to Lexis+ and the associated minimum content package.</p>
            </div>
            <div className="lx-card">
              <h3>Data location</h3>
              <p>The press release says sensitive information is stored and processed in Australia, using Amazon Web Services and Microsoft Azure.</p>
              <p style={{ marginTop: 12 }}>Clause 3.9 of the April 2025 terms says the primary hosting location for the Lexis+ AI Service is Australia. If a failover moves processing outside Australia, the terms say upload is disabled during that failover.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec lx-pt0" id="sources">
        <div className="lx-wrap">
          <div className="lx-head">
            <div className="lx-eyebrow">Sources</div>
            <h2>Pages checked on {CHECKED}</h2>
            <p className="lx-lead">Each link is the public page the row above relies on. Competitor wording is theirs, not a Saabai claim about their product.</p>
          </div>
          <div className="lx-feats">
            {SOURCES.map((source) => (
              <div className="lx-card" key={source.href}>
                <h3>
                  <a href={source.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{source.name}</a>
                </h3>
                <p>{source.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="lx-sec lx-pt0">
        <div className="lx-wrap">
          <div className="lx-head lx-center">
            <div className="lx-eyebrow">FAQ</div>
            <h2>Questions this comparison can answer</h2>
          </div>
          <div className="lx-faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary><h3>{f.q}</h3><span aria-hidden="true">+</span></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-final">
        <div className="lx-wrap lx-final-inner">
          <div className="lx-eyebrow">Lex</div>
          <h2>See Lex on your own practice area.</h2>
          <p className="lx-lead">Book a free 30-minute demo of the research and drafting workspace.</p>
          <div className="lx-ctas">
            <a className="lx-btn lx-pri" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Book a free 30-min demo</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
