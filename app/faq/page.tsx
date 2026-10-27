import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import JsonLd from "../components/JsonLd";
import { faqSchema } from "@/lib/seo-meta";
import { publicPageMeta } from "@/lib/seo-pages";
import { CARE_PLAN_FAQS } from "@/lib/care-faqs";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.faq;

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
        a: "This is almost exclusively for non-tech businesses. Tradies, clinics, studios, agencies, retailers and local service businesses across Australia. These are exactly who we work with. Your team doesn't need to understand how any of it works. You just get the time back.",
      },
      {
        q: "Is this just another \"digital transformation\" project that takes forever and costs a fortune?",
        a: "No. We deliberately avoid the big-bang, rip-and-replace approach. We identify the highest-impact workflows, automate those first, and you start seeing results within weeks, not after a 12-month implementation programme. If something isn't working, we iterate quickly rather than defending a rigid plan.",
      },
      {
        q: "What makes Saabai different from other automation providers?",
        a: "Most automation providers sell you a platform and leave you to figure it out. We design and build the actual systems for you, tailored to how your business operates, not a generic template. We also stay involved after deployment. If a workflow drifts or breaks, that's our problem to fix. You shouldn't need an internal IT team to keep your automations running.",
      },
      {
        q: "Will this replace our staff?",
        a: "That's rarely the goal, and frankly not what our clients want. The aim is to remove the low-value, repetitive work that drains your team's time, so your people can focus on the work that actually requires their expertise. Most businesses that automate well find their team becomes more effective, not redundant.",
      },
    ],
  },
  {
    id: "cost-timeline",
    category: "Cost & Timeline",
    items: [
      {
        q: "How much does it typically cost?",
        a: "Every Saabai engagement starts with a fixed-price Saabai Blueprint: Starter $497, Pro $1,497 or Business $3,500. The Blueprint gives you a written roadmap of your highest-ROI automation opportunities, and the fee is credited if you book a build within 30 days. Builds are quoted after the Blueprint based on scope. Websites through Web Solutions start from $2,000 plus $100 a month. Not sure where to start? The free AI Readiness Score takes a few minutes. See the Blueprint page for what is included at each tier.",
      },
      {
        q: "How do we measure the ROI?",
        a: "We establish baseline metrics before we build: hours spent on a given task, response times, lead conversion rates, cost per outcome. After deployment, we track against those baselines so you can see exactly what's changed. Use our free calculator to get a rough estimate of what manual work is currently costing your business before we even speak.",
      },
      {
        q: "How long does it take to get something live?",
        a: "Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment. We move fast, but not at the expense of building it properly the first time.",
      },
      {
        q: "Is there ongoing cost after the initial build?",
        a: "Yes, most automation systems have ongoing running costs (software subscriptions, API usage, hosting) and we offer optional monthly optimisation retainers to keep systems performing well. We'll give you a full picture of ongoing costs upfront so there are no surprises.",
      },
      {
        q: "What if I buy a Saabai Blueprint and decide it's not for me?",
        a: "You have 7 days from purchase to cancel for a full refund, no questions asked, provided the discovery session hasn't started yet. Once the discovery session begins, the engagement is non-refundable. We don't pressure anyone into proceeding to a build after the Blueprint. If the Blueprint shows there's nothing high-impact worth automating, we'll tell you.",
      },
          ],
  },
  {
    id: "technical-integration",
    category: "Technical & Integration",
    items: [
      {
        q: "We already use [insert software here]. Will this work with our existing tools?",
        a: "Almost certainly yes. We build on top of the tools you already have: your CRM, email platform, practice management software, calendar, documents. You shouldn't have to rip anything out. If a tool has an API (or even just a web interface), we can typically automate around it.",
      },
      {
        q: "We're not particularly tech-savvy as a team. Will we actually be able to use this?",
        a: "That's the whole point. If your team needs to understand how it works to get value from it, we haven't built it well enough. The systems we design are meant to be invisible. They just run. If something does need manual input, it's designed to be as simple as filling in a form.",
      },
      {
        q: "What if we only want to automate one specific thing to start with?",
        a: "That's actually the sensible approach. Starting with one high-impact workflow means you see results quickly, build confidence in the system, and understand what good automation looks like for your business before expanding. We regularly start narrow and grow from there.",
      },
      {
        q: "We tried automation before and it didn't stick. Why would this be different?",
        a: "Usually because the previous attempt was a generic off-the-shelf tool that wasn't designed around how your business actually operates. Or it got set up, nobody maintained it, it broke, and everyone quietly went back to doing it manually. We build custom systems and stay involved post-launch. Ongoing maintenance is part of the deal, not an afterthought.",
      },
    ],
  },
  {
    id: "is-this-for-me",
    category: "Is This for My Business?",
    items: [
      {
        q: "I run a trade or local service business. What does AI actually do for us?",
        a: "Usually three things: a website that answers enquiries and captures leads after hours, instant quoting from your own price list, and automatic follow-up and invoice reminders. Most tradies and service businesses start with a website care plan from $100 a month or a Saabai Blueprint from $497 to find the biggest win first.",
      },
      {
        q: "We run a clinic, studio or salon. Where does it help most?",
        a: "Bookings and enquiries. An AI agent on your site answers the same ten questions you get every day, takes booking requests after hours and sends reminders, so fewer no-shows and less time on the phone. Pair it with a care plan so your site stays fast and found.",
      },
      {
        q: "We run a real estate agency. Where does automation have the biggest impact?",
        a: "Lead qualification and follow-up is where most agencies leak the most revenue. An AI system can respond to new enquiries within seconds, ask qualifying questions, and escalate serious buyers and sellers to your agents. Beyond that: inspection reminders, appraisal follow-up and listing update comms.",
      },
      {
        q: "What about privacy and data security?",
        a: "We design with data handling in mind from the start and only connect the tools you approve. Your requirements are discussed upfront and the setup is built around them. Most of what we automate is enquiries, follow-up and scheduling, not sensitive records. We're happy to walk through specifics on a call.",
      },
      {
        q: "We're a tiny business, just me and maybe one other person. Is this overkill?",
        a: "Usually the opposite. When you're the one doing the admin, every hour saved is your hour. Start with the free AI score at saabai.ai/score, it takes a few minutes and tells you whether a Blueprint is worth it before you spend a cent.",
      },
      {
        q: "Do you work with e-commerce or product businesses?",
        a: "Yes, and it's one of the most immediate ROI cases we see. Product businesses with high enquiry volume are losing leads every hour they can't respond instantly. We build AI agents that handle product questions, custom quoting, order lookups and lead capture 24/7. A national plastics supplier is currently running one of these in production.",
      },
    ],
  },
  {
    id: "working-with-us",
    category: "Working With Us",
    items: [
      {
        q: "What happens on the strategy call?",
        a: "It's a 30-minute working conversation, not a sales presentation. We'll ask about your current workflows, where your team's time goes, and what's most frustrating to operate. By the end, you'll have a rough map of where automation could have the biggest impact in your business. You'll leave with something useful regardless of whether we work together.",
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
  {
    id: "care-plans",
    category: "Care plans, ownership and data",
    items: CARE_PLAN_FAQS,
  },
];

export default function FAQ() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <BreadcrumbLd name="FAQ" path="/faq" />
      <JsonLd data={faqSchema(faqs.flatMap((cat) => cat.items))} />

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
          Everything you want to know about websites, AI and automation for
          Australian small businesses, answered plainly. Care plans from $100
          a month, Blueprint AI audits from $497, and a free AI score to start.
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
              className="inline-flex items-center min-h-[44px] text-xs font-medium tracking-wide text-saabai-text-dim hover:text-saabai-teal border border-saabai-border hover:border-saabai-teal/40 px-4 py-2 rounded-full transition-colors"
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
          what automation could look like in your business.
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
