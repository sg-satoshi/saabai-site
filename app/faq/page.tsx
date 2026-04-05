import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation FAQ for Professional Firms",
  description:
    "Honest answers about AI automation for professional firms — cost, timeline, integration, compliance, and working with Saabai. No buzzwords, no sales spin.",
  alternates: { canonical: "https://www.saabai.ai/faq" },
  openGraph: {
    url: "https://www.saabai.ai/faq",
    title: "AI Automation FAQ for Professional Firms | Saabai",
    description:
      "Honest answers about AI automation for professional firms — cost, timeline, integration, compliance, and working with Saabai. No buzzwords, no sales spin.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "We're not a tech company. Is AI automation actually for us?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "This is almost exclusively for non-tech businesses. Law firms, real estate agencies, accounting practices, financial advisers — these are exactly who we work with. Your team doesn't need to understand how any of it works. You just get the time back.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get AI automation live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment.",
      },
    },
    {
      "@type": "Question",
      name: "Will AI automation work with our existing software tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Almost certainly yes. We build on top of the tools you already have — your CRM, email platform, practice management software, calendar, documents. You shouldn't have to rip anything out.",
      },
    },
    {
      "@type": "Question",
      name: "How much does AI automation typically cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on scope and complexity. We don't quote before understanding your operation — that's what the free strategy call is for. Most clients recover the investment inside the first few months through time and operational cost savings.",
      },
    },
    {
      "@type": "Question",
      name: "Is the strategy call really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, genuinely free. No invoice, no follow-up pressure, no free call that turns into a two-hour pitch. We only take it if we think there's a real opportunity to help. If your operation isn't a good fit, we'll tell you on the call.",
      },
    },
    {
      "@type": "Question",
      name: "We tried automation before and it didn't stick. Why would this be different?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Usually because the previous attempt was a generic off-the-shelf tool not designed around how your business actually operates. We build custom systems and stay involved post-launch. Ongoing maintenance is part of the deal — not an afterthought.",
      },
    },
    {
      "@type": "Question",
      name: "We're a law firm. What does AI automation look like for us?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI-assisted client intake that qualifies matters before anyone on your team touches it. Automated follow-up for enquiries. Document templates that populate from intake data. Billing and deadline reminders that go out automatically. None of this requires changing how you practise law — it removes the admin wrapped around it.",
      },
    },
    {
      "@type": "Question",
      name: "We're an accounting or financial services firm. What about compliance and data security?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We design systems with data handling in mind from the start. Your compliance requirements are discussed upfront and the architecture is built around them. Most of what we automate involves workflow orchestration and communications, not raw financial data processing.",
      },
    },
  ],
};

const faqs = [
  {
    id: "the-basics",
    category: "The Basics",
    items: [
      {
        q: "What exactly is AI automation?",
        a: "In plain terms: software that does the repetitive, rules-based work your team currently does by hand. Think automatically sending follow-up emails, pulling data from one system into another, answering routine client questions at 11pm, or generating that weekly report nobody enjoys building. We design the systems; they run themselves.",
      },
      {
        q: "We're not a tech company. Is this actually for us?",
        a: "This is almost exclusively for non-tech businesses. Law firms, real estate agencies, accounting practices, financial advisers — these are exactly who we work with. Your team doesn't need to understand how any of it works. You just get the time back.",
      },
      {
        q: "Is this just another \"digital transformation\" project that takes forever and costs a fortune?",
        a: "No. We deliberately avoid the big-bang, rip-and-replace approach. We identify the highest-impact workflows, automate those first, and you start seeing results within weeks — not after a 12-month implementation programme. If something isn't working, we iterate quickly rather than defending a rigid plan.",
      },
      {
        q: "What makes Saabai different from other automation providers?",
        a: "Most automation providers sell you a platform and leave you to figure it out. We design and build the actual systems for you, tailored to how your business operates — not a generic template. We also stay involved after deployment. If a workflow drifts or breaks, that's our problem to fix. You shouldn't need an internal IT team to keep your automations running.",
      },
      {
        q: "Will this replace our staff?",
        a: "That's rarely the goal, and frankly not what our clients want. The aim is to remove the low-value, repetitive work that drains your team's time — so your people can focus on the work that actually requires their expertise. Most firms that automate well find their team becomes more effective, not redundant.",
      },
    ],
  },
  {
    id: "cost-timeline",
    category: "Cost & Timeline",
    items: [
      {
        q: "How much does it typically cost?",
        a: "It depends on scope and complexity. A focused single-workflow automation is materially different from building out a firm-wide operational system. We don't quote before understanding your operation — that's what the strategy call is for. What we will say: most clients recover the investment inside the first few months through time and operational cost savings.",
      },
      {
        q: "How do we measure the ROI?",
        a: "We establish baseline metrics before we build — hours spent on a given task, response times, lead conversion rates, cost per outcome. After deployment, we track against those baselines so you can see exactly what's changed. Use our free calculator to get a rough estimate of what manual work is currently costing your business before we even speak.",
      },
      {
        q: "How long does it take to get something live?",
        a: "Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment. We move fast — but not at the expense of building it properly the first time.",
      },
      {
        q: "Is there ongoing cost after the initial build?",
        a: "Yes — most automation systems have ongoing running costs (software subscriptions, API usage, hosting) and we offer optional monthly optimisation retainers to keep systems performing well. We'll give you a full picture of ongoing costs upfront so there are no surprises.",
      },
    ],
  },
  {
    id: "technical-integration",
    category: "Technical & Integration",
    items: [
      {
        q: "We already use [insert software here]. Will this work with our existing tools?",
        a: "Almost certainly yes. We build on top of the tools you already have — your CRM, email platform, practice management software, calendar, documents. You shouldn't have to rip anything out. If a tool has an API (or even just a web interface), we can typically automate around it.",
      },
      {
        q: "We're not particularly tech-savvy as a team. Will we actually be able to use this?",
        a: "That's the whole point. If your team needs to understand how it works to get value from it, we haven't built it well enough. The systems we design are meant to be invisible — they just run. If something does need manual input, it's designed to be as simple as filling in a form.",
      },
      {
        q: "What if we only want to automate one specific thing to start with?",
        a: "That's actually the sensible approach. Starting with one high-impact workflow means you see results quickly, build confidence in the system, and understand what good automation looks like for your business before expanding. We regularly start narrow and grow from there.",
      },
      {
        q: "We tried automation before and it didn't stick. Why would this be different?",
        a: "Usually because the previous attempt was a generic off-the-shelf tool that wasn't designed around how your business actually operates. Or it got set up, nobody maintained it, it broke, and everyone quietly went back to doing it manually. We build custom systems and stay involved post-launch. Ongoing maintenance is part of the deal — not an afterthought.",
      },
    ],
  },
  {
    id: "industry-specific",
    category: "Industry-Specific",
    items: [
      {
        q: "We're a law firm. What does this actually look like for us?",
        a: "Practically: AI-assisted client intake that qualifies matters and routes them correctly before anyone on your team touches it. Automated follow-up sequences for enquiries that went quiet. Document templates that populate from intake data. Billing and deadline reminders that go out without a principal chasing them. None of this requires changing how you practise law — it removes the admin wrapped around it.",
      },
      {
        q: "We run a real estate agency. Where does automation have the biggest impact?",
        a: "Lead qualification and follow-up is where most agencies leak the most revenue. An AI system can respond to every new enquiry within seconds, ask qualifying questions, and only escalate serious buyers and sellers to your agents. Beyond that: automated inspection reminders, appraisal follow-up sequences, listing update comms, and vendor report workflows. Your agents focus on relationships and negotiations — the system handles everything else.",
      },
      {
        q: "We're an accounting or financial services firm. What about compliance and data security?",
        a: "Fair question and a serious one. We design systems with data handling in mind from the start — we're not connecting sensitive client data to random third-party tools. Your compliance requirements are discussed upfront and the architecture is built around them. Most of what we automate involves workflow orchestration and communications, not raw financial data processing. We're happy to walk through specifics on the call.",
      },
      {
        q: "We're a financial advisory business. How does this apply to us?",
        a: "Compliance documentation, review scheduling, and client communication are the usual starting points. Automating annual review reminders, pre-meeting data collection, post-meeting follow-up, and SOA preparation workflows can reclaim significant adviser time. We can also build client-facing tools that improve the experience without adding workload — things like automated portfolio update emails or onboarding portals.",
      },
      {
        q: "We're a professional services or advisory business — not quite any of the above. Do you work with us?",
        a: "Yes. The specifics vary but the pattern is the same — high-value people spending too much time on low-value operational work. If your business runs on expertise and relationships, there's almost always an automation opportunity that frees up time without compromising the quality of your output.",
      },
      {
        q: "Do you work with e-commerce or product businesses, not just professional services?",
        a: "Yes — and it's one of the most immediate ROI cases we see. Product businesses with high enquiry volume are losing leads every hour they can't respond instantly. We build AI agents that handle product questions, custom quoting, order lookups, and lead capture in real time — 24/7, without staff. A national plastics supplier is currently running one of these in production. If your business gets a lot of inbound enquiries that require a fast, accurate response, this is worth a conversation.",
      },
    ],
  },
  {
    id: "working-with-us",
    category: "Working With Us",
    items: [
      {
        q: "What happens on the strategy call?",
        a: "It's a 30-minute working conversation — not a sales presentation. We'll ask about your current workflows, where your team's time goes, and what's most frustrating to operate. By the end, you'll have a rough map of where automation could have the biggest impact in your business. You'll leave with something useful regardless of whether we work together.",
      },
      {
        q: "Is the strategy call really free? What's the catch?",
        a: "Yes, genuinely free. No invoice, no follow-up pressure, no \"free call\" that turns into a two-hour pitch. The only catch: we only take it if we think there's a real opportunity to help. If your operation isn't a good fit for what we do, we'll tell you on the call.",
      },
      {
        q: "What does ongoing support look like after the build?",
        a: "We offer monthly optimisation retainers that include performance monitoring, workflow refinements, and proactive improvements as your business evolves. Outside of that, we're available when things need attention. You won't be left with a system and a phone number that goes to voicemail.",
      },
      {
        q: "How do we get started?",
        a: "Book a free 30-minute strategy call. We'll spend the time understanding your operation and identifying where automation can have the biggest impact. From there, if it makes sense to work together, we'll put together a proposal. No commitment required to have the first conversation.",
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Nav activePage="/faq" />

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
            Honest Answers · No Buzzwords · No Sales Spin
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Questions we actually
          <br />
          <span className="text-gradient">get asked.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-6 leading-relaxed">
          Everything you want to know about AI automation for professional
          firms — answered plainly.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-12 leading-relaxed">
          If your question isn&apos;t here, book a free strategy call. We&apos;re
          happy to talk through the specifics of your business.
        </p>

        {/* Anchor navigation */}
        <div className="relative flex flex-wrap items-center justify-center gap-3 mb-2">
          {faqs.map(({ id, category }) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-xs font-medium tracking-wide text-saabai-text-dim hover:text-saabai-teal border border-saabai-border hover:border-saabai-teal/40 px-4 py-2 rounded-full transition-colors"
            >
              {category}
            </a>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── FAQ Categories ───────────────────────────────────────────────── */}
      {faqs.map(({ id, category, items }, catIndex) => (
        <section
          key={category}
          id={id}
          className={`py-16 px-6 max-w-3xl mx-auto ${catIndex > 0 ? "border-t border-saabai-border" : ""}`}
        >
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-8">
            {category}
          </p>

          <div
            className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)" }}
          >
            {items.map(({ q, a }) => (
              <details key={q} className="group bg-saabai-surface">
                <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none select-none hover:bg-saabai-surface-raised transition-colors">
                  <span className="text-base font-medium text-saabai-text leading-snug">{q}</span>
                  <span className="shrink-0 w-6 h-6 rounded-full border border-saabai-border flex items-center justify-center text-saabai-text-dim text-sm font-light transition-all group-open:border-saabai-teal/60 group-open:text-saabai-teal group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-8 pb-7 pt-1">
                  <p className="text-base text-saabai-text-muted leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border mt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)"
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Still Have Questions?
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Let&apos;s talk through
          <br />
          <span className="text-gradient">your specific situation.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          A free 30-minute strategy call is the fastest way to understand
          what automation could look like in your firm.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      <Footer />

    </div>
  );
}
