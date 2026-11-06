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
            Saabai is operated by Saabai Pty Ltd (ABN 44 703 735 264, ACN 703 735 264), founded by Shane Goldberg, based in {NAP.addressLine}.
            We work with Australian small businesses, including law firms and accounting firms, on the Gold Coast, in Brisbane and across Queensland, and with clients Australia-wide online.
            Saabai is an online business. We do not operate a public shopfront, and visits are by appointment only.
          </p>
          <p>
            The work is practical. A website that answers enquiries, looked after on a flat monthly care plan that includes fixes.
            A Blueprint that says, at a fixed price, where AI will actually save time and money.
            Lex, an AI legal assistant for Australian law firms.
            Mia, the assistant on this website, so you can see how a Saabai chat feels before you buy anything.
          </p>
          <p>
            Prices are in AUD. GST is not applicable.
            Email {NAP.email}. We usually reply within 1 business day.
          </p>
        </div>
        <InShort>
          <p>Saabai is a Gold Coast, Queensland AI business founded by Shane Goldberg.</p>
          <p>
            It is operated by {NAP.legalName} (ABN {NAP.abn}, ACN {NAP.acn}) from {NAP.addressLine}.
            Website care starts from <strong>$100 a month</strong>, and builds start from <strong>$2,000</strong>.
            The Blueprint starts from <strong>$497</strong>. Lex starts with a <strong>60-day free trial</strong>.
          </p>
          <p>Email {NAP.email}. We usually reply within 1 business day.</p>
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
              Shane Goldberg founded Saabai. It is operated by {NAP.legalName} (ABN {NAP.abn}, ACN {NAP.acn}).
              The public address is {NAP.addressLine}.
              The contact email is {NAP.email}.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              He started Saabai after years of watching good Australian businesses, tradies, clinics, studios and agencies, lose work to slow websites, missed enquiries and admin that ate the week.
              The problem was not effort. The wrong work was landing on the wrong desks, and the tools that were supposed to fix it either needed a technical team to maintain, or were not built for a business with five staff, not five hundred.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              So Saabai keeps it simple. A website that answers enquiries for you, looked after on a flat monthly plan.
              A Blueprint that tells you, in plain English and at a fixed price, where AI will actually save time and money, and whether Google, ChatGPT, Claude, Perplexity and Gemini can find you.
              Then we build what is worth building, and skip what is not.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              A call with Shane is 30 minutes, booked on Calendly. The call is free. The Blueprint is not.
              Custom AI agents and a custom chatbot are quoted to the job. There is no published chatbot-only monthly price.
              On a Pro Blueprint he personally reviews and edits the plan, then walks through it on a 30 minute call.
            </p>
          </div>

        </div>
      </section>

      {/* ── Why Saabai exists ───────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Why Saabai exists
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Give Australian small businesses the kind of website, search visibility and AI help that used to need an agency, a developer and a consultant, for a price that makes sense on a small business budget.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              AI should deliver results, not just a good demo.
              Every system is designed around a specific operational problem. If it does not recover time or reduce cost, it is not the job.
              We do not disappear after the site goes live. If something breaks or drifts, that is our problem to fix, not yours. That is what the care plan is for.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              You can buy a website from the <a href="/websites" className={linkClass}>websites page</a> or the <a href="/pricing" className={linkClass}>pricing page</a> without a Blueprint.
              The Blueprint is the optional starting point when you want a written plan first.
              Published client work sits on the <a href="/case-studies" className={linkClass}>case studies page</a>. This page does not retell those jobs.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who we work with ────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Who it is for
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Australian small businesses, including law firms and accounting firms, on the Gold Coast and across Queensland. Clients elsewhere in Australia can work with us online.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              A tradie, a clinic, a studio or an agency can start with a care plan: a new site or a rebuild, plus a trained enquiry chatbot.
              A law firm can use that same kind of website chatbot for visitors, and use Lex when the work is research and drafting.
              Those are different products. Lex searches legislation and drafts documents. The website chatbot answers visitors. It does not search legislation or draft documents.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Accounting firms and other professional practices are welcome on the same website plans and on the Blueprint.
              The Blueprint is written for small businesses and professional practices. Pro is the tier for growing teams and professional practices that want Shane&apos;s eye on the plan.
              Business is for a business with several teams or locations.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              If you already have a site and only want the chatbot, book a free 30 minute call and we will quote that work.
              There is no separate published price for a chatbot on its own.
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
              Mia is Saabai&apos;s own AI assistant on saabai.ai. Mia is not sold as a product, and there is no price for Mia.
              The chat answers at any hour, including after hours.
              A conversation here can also email the Saabai team. That email is an internal alert to us. We usually reply within 1 business day.
            </p>

            <h3 className="text-lg font-semibold tracking-tight">Websites and care plans</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Presence is $100 a month, builds from $2,000. Growth is $200 a month, builds from $4,000. Signature is $300 a month, builds from $6,500.
              Build fees are quoted from these figures and scoped to your project. Every tier covers a brand new build or a full rebuild of an existing site.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Presence includes a custom site designed for your business, built fast and mobile, ready for SEO and AI search, a Google reviews carousel showing your real reviews, AI information gathering and a basic training session before we build, a trained enquiry chatbot that answers FAQs, and hosting, security and updates.
              Growth adds a larger site or a full rebuild, a lead qualifying chatbot with booking, and light workflow automations. Booking is on Growth and Signature only.
              Signature adds a custom avatar trained to your chosen persona, a site that looks and sounds like your brand voice, workflow automations across your enquiries, and priority support.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Care is billed monthly in advance until you cancel.
              Presence, Growth and Signature include hosting, security, updates and a trained enquiry chatbot.
              Fixes are included at no extra charge, plus small edits on a fair-use basis. Work outside the list for your tier is quoted before we start.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The chatbot answers visitors and keeps a log of each chat. It is trained on your services, hours and policies, and it should say so rather than invent an answer.
              It should not give clinical, financial or legal advice, and it does not price jobs. Quoting is separate work, scoped and quoted.
              Enquiry alerts are coming soon.
              A Lachie voice demo runs in the browser, not on a phone line.
            </p>

            <h3 className="text-lg font-semibold tracking-tight">Lex, for law firms</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Lex is an AI legal assistant for research and drafting at Australian law firms.
              It starts with a 60-day free trial, no card needed: legal research included, 20 documents a month, 3 lawyer seats, a licensed case-law snapshot, QA verification on every draft, and thread memory.
              Pricing is set after the trial; you choose whether to subscribe. Enterprise is custom.
              <a href="/legal" className={linkClass}>The Lex page</a> has the detail, and the workspace sits behind a login.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Lex searches ATO rulings, the Federal Register of Legislation (including Act status), ASIC and the Fair Work Commission, and answers cite their sources.
              Drafts cover eleven document types: discretionary and unit trust deeds, trust distribution resolutions, binding financial agreements for married and de facto couples, financial settlement consent orders, separation agreements, service agreements, shareholders agreements, employment contracts and commercial leases. A custom document can be drafted from your own instructions, and every draft gets a QA pass.
              Case law is a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions, cutoff 10 March 2025. It is not current law and not every court. Lex does not give legal advice.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
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
              How a project works
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Four steps, the same ones on the <a href="/process" className={linkClass}>process page</a>: Blueprint, system design, build and deploy, then ongoing care.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              A Blueprint maps workflows, tools and where automation will matter. Starter analyses the fact-find, website and tools, and ranks opportunities by estimated hours and dollars saved. The fact-find is online, about 15 minutes, with no call. Starter is $497 and is delivered within 48 hours.
              Pro is $1,497, reviewed and edited by Shane, with a 30 minute walkthrough and build cost estimates, delivered within 3 business days.
              Business is $3,500, with discovery sessions, a 12 month roadmap and a leadership walkthrough, delivered in 2 to 3 weeks.
              SEO and AI search checks are included in every Blueprint, from $497. You get a PDF and a version in the client portal.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Design is built around the tools you already use. We integrate with what you have. You do not have to rip out the systems the team already runs.
              Build covers implementation, testing and handover, with documentation so the team can operate what we shipped.
              The timeline for a website starts once we have your content and you have signed off on the design.
              Basic websites take about 1 week, mid-tier websites about 2 weeks, and custom builds generally up to 4 weeks.
              Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              After launch, the care plan covers hosting, security, updates, the chatbot, fixes at no extra charge, and small edits on a fair-use basis.
              You can cancel a care plan at any time by emailing {NAP.email}. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it.
              The site stays live until the end of that paid period, and hosting stops after that.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              You own the content, logos and photos you give us. A domain in your name stays yours. If Saabai registered it, we transfer it free of charge on request. You then pay the registrar&apos;s renewal fees.
              The web functions run in Sydney. Messages typed into a chatbot are sent to an external AI provider to write the reply. Some chats are processed in China. Chat transcripts are stored in Tokyo, and a scheduled task deletes those chat logs after 90 days. That does not mean every chat stays in Australia.
            </p>
            <h3 className="text-lg font-semibold tracking-tight">The Saabai Blueprint</h3>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The <a href="/blueprint" className={linkClass}>Saabai Blueprint</a> is a paid plan. It is not free.
              Book any build with Saabai within 30 days of delivery and the full Blueprint fee comes off your build invoice.
              Credit applies to implementation costs only, not care plans or monthly fees. Unused credit expires after 30 days.
              The plan is yours to keep and use with any provider or your own team.
              If we have not started your analysis, we will refund you in full.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The AI Readiness Score is separate, and it is free: 12 questions, about 3 minutes, a score out of 100, and three quick wins.
              It does not replace the Blueprint.
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
              <li><a href="/websites" className={linkClass}>Websites</a> for what each care plan includes, build times, fixes and cancellation.</li>
              <li><a href="/legal" className={linkClass}>Lex</a> for sources, drafting and the privacy checkpoint.</li>
              <li><a href="/blueprint" className={linkClass}>Blueprint</a> for the three tiers, the 30 day credit and the refund rule. It starts at $497.</li>
              <li><a href="/case-studies" className={linkClass}>Case studies</a> for the published client work.</li>
              <li><a href="/contact" className={linkClass}>Contact</a> to email {NAP.email}. We usually reply within 1 business day.</li>
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
          We usually reply within 1 business day.
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
