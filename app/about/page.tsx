import type { Metadata } from "next";
import Image from "next/image";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import InShort from "../components/InShort";
import JsonLd from "../components/JsonLd";
import { NAP, SAME_AS, aboutPageSchema } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.about;

const linkClass = "text-saabai-teal font-semibold underline underline-offset-2";

export default function About() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <JsonLd data={aboutPageSchema} />
      <BreadcrumbLd name="About" path="/about" />

      <Nav activePage="/about" />

      <main>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-36 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)"
        }} />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            The Saabai Story
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-[clamp(2.25rem,11.5vw,3.75rem)] md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          About Saabai,
          <br />
          <span className="text-gradient">a Gold Coast AI business.</span>
        </h1>

        <div className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed text-left flex flex-col gap-6">
          <p>
            Saabai is a sole trader business operated by Shane Goldberg, based in {NAP.addressLine}.
            We work with small businesses on the Gold Coast, in Brisbane and across Queensland, and with clients Australia-wide online.
            Saabai is a home-based, online business. We do not operate a public shopfront, and visits are by appointment only.
          </p>
          <p>
            Mia is Saabai&apos;s own AI assistant on this website, so you can see how a Saabai chat feels.
            Website care plans include a trained enquiry chatbot.
            Lex is an AI legal assistant for Australian law firms.
            The Saabai Blueprint is a separate fixed-price plan.
            Prices are in AUD. GST is not applicable.
          </p>
        </div>
        <InShort>
          <p>Saabai is a Gold Coast, Queensland AI business founded by Shane Goldberg.</p>
          <p>
            Shane operates it as a sole trader from {NAP.addressLine} (ABN {NAP.abn}).
            Website care starts from <strong>$100 a month</strong>, and builds start from <strong>$2,000</strong>.
            The Blueprint starts from <strong>$497</strong>. Lex Firm is <strong>$299 a month</strong>.
          </p>
          <p>Email {NAP.email}. We usually reply within 2 business days.</p>
        </InShort>


        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Founder ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[280px_1fr] gap-16 items-start">

          <div className="flex flex-col items-center md:items-start gap-5">
            <div
              className="w-48 h-48 rounded-2xl border border-saabai-border overflow-hidden"
              style={{ boxShadow: "0 0 40px rgba(98,197,209,0.2)" }}
            >
              <Image
                src="/shane-goldberg.png"
                alt="Shane Goldberg, Founder, Saabai"
                width={192}
                height={192}
                className="w-full h-full object-cover object-[center_25%]"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-saabai-text tracking-tight">Shane Goldberg</h2>
              <p className="text-sm text-saabai-text-dim mt-0.5">Founder, Saabai · Gold Coast, QLD</p>
              <p className="text-sm mt-2">
                <a href={SAME_AS[0]} className={linkClass} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Shane Goldberg founded Saabai and operates it as a sole trader.
              The public address is {NAP.addressLine}. The ABN on this site, {NAP.abn}, is the sole trader ABN.
              The contact email is {NAP.email}.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              A call with Shane is 30 minutes, booked on Calendly.
              Custom AI agents and a custom chatbot are quoted to the job. There is no published chatbot-only monthly price.
              On a Pro Blueprint he personally reviews and edits the plan, then walks through it on a 30 minute call.
            </p>
          </div>

        </div>
      </section>

      {/* ── What we build ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              What we build
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold tracking-tight">Mia, on this website</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Mia is not sold as a product, and there is no price for Mia.
              The chat answers at any hour, including after hours.
              A conversation here can also email the Saabai team. That email is an internal alert to us.
            </p>

            <h3 className="text-lg font-semibold tracking-tight">Websites and the enquiry chatbot</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Presence is $100 a month, builds from $2,000. Growth is $200 a month, builds from $4,000. Signature is $300 a month, builds from $6,500.
              Build fees are quoted from these figures and scoped to your project.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Presence includes a custom site designed for your business, built fast and mobile, ready for SEO and AI search, a Google reviews carousel showing your real reviews, AI information gathering and a basic training session before we build, a trained enquiry chatbot that answers FAQs, and hosting, security and updates.
              Growth adds a larger site or a full rebuild, a lead qualifying chatbot with booking, and light workflow automations. Booking is on Growth and Signature only.
              Signature adds a custom avatar trained to your chosen persona, a site that looks and sounds like your brand voice, workflow automations across your enquiries, and priority support.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The chatbot answers visitors and keeps a log of each chat. It is trained on your services, hours and policies, and it should say so rather than invent an answer.
              It should not give clinical, financial or legal advice, and it does not price jobs. Quoting is separate work, scoped and quoted.
              Enquiry alerts are coming soon.
              If you already have a site and only want the chatbot, book a free 30 minute call and we will quote that work.
              Phone answering with Lachie is coming soon. It is not live. A voice demo runs in the browser, not on a phone line.
            </p>

            <h3 className="text-lg font-semibold tracking-tight">Lex, for law firms</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Lex is an AI legal assistant for research and drafting at Australian law firms.
              Firm is $299 a month: unlimited legal research, 20 documents a month, 3 lawyer seats, a licensed case-law snapshot, QA verification on every draft, and thread memory.
              Enterprise is custom. There is no lock-in. You can cancel anytime.
              <a href="/legal" className={linkClass}>The Lex page</a> has the detail, and the workspace sits behind a login.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Lex searches ATO rulings, the Federal Register of Legislation (including Act status), ASIC and the Fair Work Commission, and answers cite their sources.
              Case law is a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions, cutoff 10 March 2025. It is not current law and not every court. Lex does not give legal advice.
              Names, business and trust names, phone numbers, emails, and ABNs or ACNs become placeholders before an AI model sees them, including for firms that use their own AI key. There is no off switch. If masking fails, nothing is sent.
            </p>
          </div>
        </div>
      </section>

      {/* ── How the work is done ────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              How the work is done
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              You can buy a website from the <a href="/websites" className={linkClass}>websites page</a> or the <a href="/pricing" className={linkClass}>pricing page</a> without a Blueprint.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The timeline starts once we have your content and you have signed off on the design.
              Basic websites take about 1 week, mid-tier websites about 2 weeks, and custom builds generally up to 4 weeks.
              Care is billed monthly in advance until you cancel. It covers hosting, security, updates and keeping the AI running, with small edits on a fair-use basis. Other work is quoted before we start.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              You can cancel a care plan at any time by emailing {NAP.email}. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it.
              You own the content, logos and photos you give us. A domain in your name stays yours. If Saabai registered it, we transfer it free of charge on request.
              The web functions run in Sydney. A scheduled task deletes chat logs after 90 days.
            </p>
            <h3 className="text-lg font-semibold tracking-tight">The Saabai Blueprint</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The <a href="/blueprint" className={linkClass}>Saabai Blueprint</a> is a paid plan.
              Starter is $497 and is delivered within 48 hours. It analyses your fact-find, website and tools, and ranks opportunities by estimated hours and dollars saved. The fact-find is online, about 15 minutes, with no call.
              Pro is $1,497, reviewed and edited by Shane, with a 30 minute walkthrough and build cost estimates, delivered within 3 business days.
              Business is $3,500, with discovery sessions, a 12 month roadmap and a leadership walkthrough, delivered in 2 to 3 weeks.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Book any build with Saabai within 30 days of delivery and the full Blueprint fee comes off your build invoice.
              Credit applies to implementation costs only, not care plans or monthly fees. Unused credit expires after 30 days.
              The plan is yours to keep and use with any provider or your own team.
              If we have not started your analysis, we will refund you in full.
              SEO and AI search checks are included in every Blueprint, from $497.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The AI Readiness Score is separate, and it is free: 12 questions, about 3 minutes, a score out of 100, and three quick wins.
              Published client work is on the <a href="/case-studies" className={linkClass}>case studies page</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Where to go ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Where to go next
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-4 text-lg text-saabai-text-muted leading-relaxed list-disc pl-5">
              <li><a href="/pricing" className={linkClass}>Pricing</a> for website care, the Blueprint and Lex Firm.</li>
              <li><a href="/websites" className={linkClass}>Websites</a> for what each care plan includes, build times and cancellation.</li>
              <li><a href="/legal" className={linkClass}>Lex</a> for sources, drafting and the privacy checkpoint.</li>
              <li><a href="/blueprint" className={linkClass}>Blueprint</a> for the three tiers, the 30 day credit and the refund rule.</li>
              <li><a href="/contact" className={linkClass}>Contact</a> to email {NAP.email}. We usually reply within 2 business days.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)"
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Get Started
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Talk with Shane
          <br />
          <span className="text-gradient">about the work.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Email {NAP.email}, or book a free 30 minute call.
          We usually reply within 2 business days.
        </p>
        <div className="relative flex flex-col items-center gap-4">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-block max-sm:w-full bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
          >
            Book a free 30 minute call
          </a>
          <a href="/score" className="btn-secondary max-sm:w-full">Or take the free AI score →</a>
        </div>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          Prices in AUD. GST not applicable.
        </p>
      </section>
      </main>

      <Footer />

    </div>
  );
}
