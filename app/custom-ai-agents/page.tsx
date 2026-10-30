import { GST } from "@/lib/entity";
import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import JsonLd from "../components/JsonLd";
import { schemaGraph, serviceSchema, SITE_URL } from "@/lib/seo-entity";
import { breadcrumbNode, faqNode } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { TIERS } from "@/lib/blueprint";
import { formatAud, WEBSITE_TIERS } from "@/lib/website-tiers";
import { Icon, IconTile, type IconName } from "./icons";
import "../components/sb/sb.css";
import "./custom-ai-agents.css";

export const metadata: Metadata = publicPageMeta.customAgents;

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PATH = "/custom-ai-agents";
const CASE_STUDY = "/case-studies/rex-plastics-online";

const entryTier = WEBSITE_TIERS[0];
const chatbotFrom = `${formatAud(entryTier.buildFrom)} plus ${formatAud(entryTier.monthly)} a month care`;
const { starter, pro, business } = TIERS;

const USE_CASES: { icon: IconName; tag: string; title: string; body: string }[] = [
  {
    icon: "quote",
    tag: "Trades",
    title: "Estimates from your price list",
    body: "The agent asks the questions you would ask about the job, works out an estimate from your own price list and rules, and sends it to you to confirm.",
  },
  {
    icon: "product",
    tag: "Suppliers and retail",
    title: "Product and spec questions",
    body: "Customers ask about sizes, materials or which product suits the job. The agent answers from your product data, not from guesses.",
  },
  {
    icon: "filter",
    tag: "Service businesses",
    title: "Lead qualifying to your rules",
    body: "It asks about suburb, budget and timing, sorts the enquiry the way you would, and passes good leads on with the details filled in.",
  },
  {
    icon: "intake",
    tag: "Clinics and professional services",
    title: "Intake before the first call",
    body: "It collects the details you need before a first call. It should not give clinical, financial or legal advice.",
  },
  {
    icon: "followup",
    tag: "Busy owners",
    title: "Follow-up drafts for your team",
    body: "It drafts a follow-up from the chat for your team to check and send. Follow-up and reminders are quoted separately.",
  },
  {
    icon: "group",
    tag: "Tourism and hospitality",
    title: "Group and event enquiries",
    body: "It gathers dates, numbers and needs into one tidy enquiry, so your team can reply once with the full picture.",
  },
];

const FLOW: { icon: IconName; title: string; body: string; feat?: boolean }[] = [
  { icon: "chat", title: "A customer asks", body: "On your website, in their own words" },
  { icon: "book", title: "It checks your info", body: "Price list, FAQs and your rules" },
  { icon: "task", title: "It does the one job", body: "Answers, estimates or qualifies", feat: true },
  { icon: "handoff", title: "It hands over to you", body: "Inbox or CRM, with the details" },
];

const STEPS: { icon: IconName; pill: string; title: string; body: string }[] = [
  {
    icon: "score",
    pill: "Free",
    title: "Get your free AI score",
    body: "A short quiz that shows where AI could help your business. Optional.",
  },
  {
    icon: "blueprint",
    pill: `Free call, or Blueprint from ${starter.priceLabel}`,
    title: "Scope the job",
    body: `Talk it through on a free 30 minute call, or get a Saabai Blueprint from ${starter.priceLabel} for a written plan.`,
  },
  {
    icon: "price",
    pill: "Before any build",
    title: "Get a quote",
    body: "The agent is quoted to the job. You see the quote before any build starts.",
  },
  {
    icon: "build",
    pill: "Build and train",
    title: "We build and train it",
    body: "Trained on your services, prices and FAQs, and the rules you set for the job.",
  },
  {
    icon: "live",
    pill: "Go live",
    title: "It goes to work",
    body: "It runs on your site and hands enquiries to you. Changes after launch are agreed in your quote.",
  },
];

const INCLUDED: { icon: IconName; title: string; body: string }[] = [
  { icon: "task", title: "One clear job", body: "We scope the one job the agent does and the rules it follows." },
  { icon: "book", title: "Trained on your business", body: "Your services, prices and FAQs, so answers come from you." },
  { icon: "handoff", title: "Handoff to you", body: "Leads and details go to your inbox, or your CRM where it is in scope." },
  { icon: "shield", title: "Sensible limits", body: "If a question is outside what it knows, it should say so rather than invent an answer." },
  { icon: "price", title: "Quoted first", body: "A quote before any build starts. No build begins without your yes." },
  { icon: "chat", title: "Works with your website", body: "It can sit on a Saabai website or the site you already have." },
];

const REX_ROWS: { icon: IconName; title: string; body: string }[] = [
  { icon: "product", title: "Product questions", body: "Answered from the supplier's catalogue" },
  { icon: "quote", title: "Cut-to-size pricing", body: "Priced from the supplier's own product data" },
  { icon: "handoff", title: "Leads to the sales team", body: "Captured in the chat and emailed to the sales team" },
];

const FAQS = [
  {
    q: "How much does a custom AI agent cost?",
    a: `Book a call for a quote. A custom agent is quoted to the job. A Blueprint is optional: Starter ${starter.priceLabel}, Pro ${pro.priceLabel} or Business ${business.priceLabel}. If you book a build within 30 days of receiving a Blueprint, the fee comes off that build invoice. It does not come off care plans.`,
  },
  {
    q: "Is this the same as the chatbot on a website care plan?",
    a: `No. Every website tier includes a trained enquiry chatbot that answers visitors, from ${chatbotFrom}. A custom agent does a defined job, such as quoting from your price list or a CRM handoff, and is quoted on its own.`,
  },
  {
    q: "Do I need a Blueprint first?",
    a: "No. A Blueprint is optional. You can book a free 30 minute call and we will scope the job and quote it. A Blueprint suits you if you want a written plan of where AI could save time across the business.",
  },
  {
    q: "Will the agent make things up?",
    a: "It is trained on the information you give it. If a question is outside that, it should say so rather than invent an answer.",
  },
  {
    q: "Can it work with my existing website?",
    a: "Yes. A custom agent can sit on a Saabai website or the site you already have. We check it on the call and quote it. If you only need a chatbot on an existing site, book a free 30 minute call and we will quote that work.",
  },
  {
    q: "Are you local to the Gold Coast?",
    a: "Yes. Saabai is a Gold Coast business based in Merrimac, Queensland. We work with businesses across the Gold Coast, Brisbane and the rest of Australia, mostly remotely.",
  },
];

const schema = schemaGraph([
  serviceSchema({
    id: `${SITE_URL}${PATH}#service`,
    name: "Custom AI agents",
    serviceType: "Custom AI agent",
    description: String(publicPageMeta.customAgents.description),
    url: `${SITE_URL}${PATH}`,
  }),
  faqNode(FAQS),
  breadcrumbNode([{ name: "Custom AI agents", path: PATH }]),
]);

export default function CustomAiAgentsPage() {
  return (
    <div className="sb">
      <JsonLd data={schema} />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <main className="cai">
        {/* S1 hero */}
        <div className="hero">
          <div className="glow" />
          <div className="wrap">
            <div>
              <span className="eyebrow">Custom AI agents · Gold Coast</span>
              <h1>
                Custom AI agents for <span className="grad">Gold Coast businesses</span>
              </h1>
              <p className="lead">
                An AI agent built around one job in your business, such as estimating from your price list, answering product questions or qualifying leads. We scope it with you, then quote it to the job before any build starts.
              </p>
              <div className="ctas">
                <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call for a quote</a>
                <a className="btn ghost" href="#how">See how it works</a>
              </div>
              <ul className="tick">
                <li>Trained on your services, prices and FAQs</li>
                <li>Hands leads and details over to you</li>
                <li>Quoted to the job, before anything is built</li>
              </ul>
              <p className="trust">
                <Icon name="pin" />
                Based in Merrimac on the Gold Coast. Working with businesses across Australia.
              </p>
            </div>
            <figure className="mock" style={{ margin: 0 }}>
              <div className="card feat">
                <div className="mhead">
                  <div className="av" aria-hidden="true"><Icon name="agent" /></div>
                  <div>
                    <b>Quote assistant</b>
                    <small>Example trades business</small>
                  </div>
                  <span className="exlabel">Example only</span>
                </div>
                <div className="msgs">
                  <div className="m u">Hi, roughly what would a 6 by 4 metre deck cost in Robina?</div>
                  <div className="m a">Happy to help. Is it hardwood or composite, and is it ground level or raised?</div>
                  <div className="m u">Hardwood, about a metre off the ground.</div>
                  <div className="m a">Thanks. I can send you a rough estimate from our price list, and the team will confirm a firm price after a site visit. What is your name and best number?</div>
                </div>
                <div className="sum">
                  <div className="t"><Icon name="handoff" />Sent to your inbox</div>
                  <dl>
                    <dt>Job</dt><dd>Hardwood deck, 6 x 4 m, raised</dd>
                    <dt>Suburb</dt><dd>Robina</dd>
                    <dt>Next step</dt><dd>Site visit to confirm price</dd>
                  </dl>
                </div>
              </div>
              <figcaption className="mnote">Example conversation for an example business. Not a real client.</figcaption>
            </figure>
          </div>
        </div>

        {/* S2 what it is */}
        <section style={{ paddingTop: 72 }}>
          <div className="wrap what">
            <div className="copy">
              <span className="eyebrow">What it is</span>
              <h2>A custom agent does one job, the way you would do it</h2>
              <p>A custom AI agent is software trained on your own information and rules. It reads what a customer asks, checks what you have told it, does the job you set, and hands the result to you.</p>
              <p>It is not a general chatbot that tries to answer everything. It is scoped to one clear task, like an estimate, a product answer or a qualified lead, so it is easier to trust and easier to check.</p>
            </div>
            <div className="cmp">
              <div className="card">
                <div className="row">
                  <IconTile name="chat" small />
                  <h3>Website chatbot</h3>
                  <span className="price">Included in website tiers</span>
                </div>
                <ul className="tick">
                  <li>Answers visitor questions from your services, hours and policies</li>
                  <li>Keeps a log of each chat</li>
                  <li>From {chatbotFrom}</li>
                </ul>
                <p className="cmpnote">Enquiry alerts are not included on the published website plans.</p>
                <a className="lnk" href="/websites">See website tiers →</a>
              </div>
              <div className="card feat">
                <div className="row">
                  <IconTile name="agent" small />
                  <h3>Custom AI agent</h3>
                  <span className="price">Quoted to the job</span>
                </div>
                <ul className="tick">
                  <li>Does a defined job, such as an estimate from your price list</li>
                  <li>Follows the rules you set, then hands over to you</li>
                  <li>Can pass leads to your CRM where it is in scope</li>
                </ul>
                <a className="lnk" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call for a quote →</a>
              </div>
            </div>
          </div>
        </section>

        {/* S3 use cases */}
        <section className="band">
          <div className="wrap">
            <div className="head">
              <span className="eyebrow">Use cases</span>
              <h2>Jobs a custom agent can do for Gold Coast businesses</h2>
              <p>These are examples of the jobs we scope. They are not client results, and each one is quoted to the job.</p>
            </div>
            <div className="grid3">
              {USE_CASES.map((u) => (
                <article className="card uc" key={u.title}>
                  <div className="uct">
                    <IconTile name={u.icon} />
                    <div>
                      <span className="tag">{u.tag}</span>
                      <h3>{u.title}</h3>
                    </div>
                  </div>
                  <p>{u.body}</p>
                </article>
              ))}
            </div>
            <p className="note">
              Law firm? See <a href="/legal">Lex, the AI legal assistant for law firms</a>.
            </p>
          </div>
        </section>

        {/* S4 how it works */}
        <section id="how">
          <div className="wrap">
            <div className="head">
              <span className="eyebrow">How a custom agent works</span>
              <h2>From a customer question to a lead in your inbox</h2>
              <p>The pattern is simple. What the agent checks, and what it does, is scoped to your business.</p>
            </div>
            <ol className="flow" aria-label="How a custom AI agent works">
              {FLOW.map((f, i) => (
                <li className={f.feat ? "fcard feat" : "fcard"} key={f.title}>
                  <div className="ftop">
                    <div className="fdot" aria-hidden="true"><Icon name={f.icon} /></div>
                    <span className="fnum" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ol>
            <p className="guard">
              <Icon name="shield" />
              <span><b>Outside what it knows?</b> It should say so and pass the question to you, rather than guess.</span>
            </p>

            <div className="head" style={{ marginTop: 96 }}>
              <span className="eyebrow">Getting started</span>
              <h2>Scoped and quoted before any build</h2>
              <p>You know what the agent will do and what it costs before we start.</p>
            </div>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li className="step" key={s.title}>
                  <div className="sdot">
                    <Icon name={s.icon} />
                    <span className="snum" aria-hidden="true">{i + 1}</span>
                  </div>
                  <div className="sbody">
                    <span className="pill">{s.pill}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* S5 what's included */}
        <section className="band">
          <div className="wrap">
            <div className="head">
              <span className="eyebrow">What&apos;s included</span>
              <h2>What goes into a custom agent build</h2>
            </div>
            <div className="incg">
              {INCLUDED.map((c) => (
                <div className="inc" key={c.title}>
                  <IconTile name={c.icon} small />
                  <div>
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="notinc">
              <Icon name="followup" />
              <div><b>Quoted separately:</b> follow-up and reminders, and any extra connections to your other tools that are not in the original scope.</div>
            </div>
          </div>
        </section>

        {/* S6 a custom agent we built */}
        <section>
          <div className="wrap ex">
            <div className="copy">
              <span className="eyebrow">A custom agent we built</span>
              <h2>Rex, a custom AI sales agent for PlasticOnline.com.au</h2>
              <p>Rex, a custom AI sales agent, ran on the PlasticOnline.com.au website. It answered product questions, priced cut-to-size jobs from the supplier&apos;s own product data, captured leads and emailed them to the sales team.</p>
              <p className="exnote">This was custom work, scoped and quoted for this client. No result figures are published.</p>
              <a className="lnk exlink" href={CASE_STUDY}>Read the Rex case study →</a>
            </div>
            <div className="card exviz">
              {REX_ROWS.map((r) => (
                <div className="r" key={r.title}>
                  <IconTile name={r.icon} small />
                  <div>
                    <b>{r.title}</b>
                    <span>{r.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* S7 pricing */}
        <section className="band">
          <div className="wrap">
            <div className="head">
              <span className="eyebrow">Pricing</span>
              <h2>Start free, then get a quote</h2>
              <p>Custom AI agents are quoted to the job. Here is how to get to a number.</p>
            </div>
            <div className="grid3 pcards">
              <div className="card">
                <div className="top"><IconTile name="score" small /><span className="pill">Optional</span></div>
                <h3>AI Readiness Score</h3>
                <div className="amt">Free</div>
                <p>A short quiz with a score out of 100 and three quick wins.</p>
                <a className="btn ghost" href="/score">Get your free AI score</a>
              </div>
              <div className="card">
                <div className="top"><IconTile name="blueprint" small /><span className="pill">Optional</span></div>
                <h3>Saabai Blueprint</h3>
                <div className="amt">{starter.priceLabel}<small>{starter.name}, {starter.delivery}</small></div>
                <p>A written plan of where AI could save time. {pro.name} {pro.priceLabel} and {business.name} {business.priceLabel} also available. The fee is credited if you build with Saabai within 30 days.</p>
                <a className="btn ghost" href="/blueprint">See the Blueprint</a>
              </div>
              <div className="card feat">
                <div className="top"><IconTile name="agent" small /><span className="pill">Custom</span></div>
                <h3>Custom AI agent</h3>
                <div className="amt">Quoted</div>
                <p>Scoped to your job and quoted before any build starts. Book a free 30 minute call to talk it through.</p>
                <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call for a quote</a>
              </div>
            </div>
            <p className="chatline">
              Just need a chatbot that answers questions? It is included in every website tier. <a href="/websites">See website tiers</a> or <a href="/pricing">see all pricing</a>.
            </p>
            <p className="fine">{GST.pricesLine}</p>
          </div>
        </section>

        {/* S8 FAQ */}
        <section>
          <div className="wrap">
            <div className="head">
              <span className="eyebrow">FAQ</span>
              <h2>Custom AI agent questions</h2>
            </div>
            <div className="faqw">
              {FAQS.map((item, i) => (
                <details className="faq" key={item.q} open={i === 0}>
                  <summary>{item.q}<span aria-hidden="true">+</span></summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* S9 final CTA */}
        <section className="ctasec">
          <div className="wrap">
            <div className="card feat cta">
              <div className="glow" style={{ opacity: 0.6 }} />
              <div style={{ position: "relative" }}>
                <span className="eyebrow">Next step</span>
                <h2>Tell us the job you want an agent to do</h2>
                <p className="lede">Book a free 30 minute call. We will tell you if a custom AI agent is the right fit for your Gold Coast business, or if a website chatbot already does the job.</p>
                <div className="ctas">
                  <a className="btn" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call for a quote</a>
                  <a className="btn ghost" href="/score">Get your free AI score</a>
                </div>
                <p className="fine">
                  Or email <a href="mailto:hello@saabai.ai">hello@saabai.ai</a>. We usually reply within 1 business day.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SbFooter />
    </div>
  );
}
