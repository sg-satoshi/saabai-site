import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Advisory & Board Positions | Shane Goldberg | Saabai",
  description:
    "Shane Goldberg brings hands-on AI implementation experience to advisory and board roles — helping leadership teams make confident decisions about AI strategy, investment, and risk.",
  alternates: { canonical: "https://www.saabai.ai/advisory" },
  openGraph: {
    url: "https://www.saabai.ai/advisory",
    title: "AI Advisory & Board Positions | Shane Goldberg | Saabai",
    description:
      "Shane Goldberg brings hands-on AI implementation experience to advisory and board roles — helping leadership teams make confident decisions about AI strategy, investment, and risk.",
  },
};

const engagements = [
  {
    num: "01",
    title: "AI Advisory Retainer",
    description:
      "Ongoing retained advisor — typically 2–4 days per month. Attends leadership meetings, helps evaluate AI investments, stress-tests vendor proposals, and keeps leadership ahead of the curve without requiring them to become AI experts themselves.",
    suited: "Suited to: mid-market firms ($5M–$100M revenue) navigating AI adoption for the first time, or those who have started investing in AI and want an independent voice in the room.",
  },
  {
    num: "02",
    title: "Board of Directors",
    description:
      "Formal director position where AI and automation strategy is a board-level priority. Brings lived experience building and deploying AI systems commercially — not theoretical knowledge from conferences, but real systems live in real businesses.",
    suited: "Suited to: businesses where AI is becoming a material strategic or operational risk, or where the board recognises a capability gap at director level.",
  },
  {
    num: "03",
    title: "Advisory Board Member",
    description:
      "A lighter-touch engagement than a full director role. Provides strategic input on AI direction, reviews proposals and investment cases, and is available for leadership team Q&A. Typically one day per month.",
    suited: "Suited to: growth-stage businesses or PE-backed firms building out an advisory board with functional expertise across key domains.",
  },
  {
    num: "04",
    title: "Implementation Oversight",
    description:
      "Contracted for the duration of a specific AI project. Reviews vendor proposals, sets technical direction, stress-tests assumptions, and reports independently to the board on progress and risk. No vendor alignment — no incentive to tell you what you want to hear.",
    suited: "Suited to: organisations undertaking a significant AI or automation investment who want independent oversight without adding permanent headcount.",
  },
];

const credentials = [
  {
    point: "Built and deployed AI agents commercially",
    detail: "Across law, real estate, and industrial distribution — not proof-of-concepts, live systems in operating businesses.",
  },
  {
    point: "Systems generating revenue today",
    detail: "The AI agents built by Saabai are live, handling real client interactions and real commercial outcomes right now.",
  },
  {
    point: "Deep understanding of ROI and where it fails",
    detail: "Having built systems that worked and systems that didn't, the picture of where AI delivers and where it burns money is clear.",
  },
  {
    point: "No vendor alignment",
    detail: "No reseller agreements, no referral arrangements, no platform incentives. The advice is independent.",
  },
  {
    point: "Australian market focus",
    detail: "Based in Australia, available nationally. Understands the regulatory environment, the market conditions, and the talent constraints.",
  },
];

export default function Advisory() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/advisory" />

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
            Advisory &amp; Board
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          AI expertise at the board level.
          <br />
          <span className="text-gradient">Not just the operational level.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Most leadership teams are making AI decisions without anyone in the room
          who has actually built and deployed an AI system. Shane Goldberg brings
          real implementation experience — not theory — to advisory and board-level
          engagements, so leadership can make confident decisions about AI strategy,
          investment, and risk.
        </p>

        <a
          href="mailto:hello@saabai.ai?subject=Advisory%20Enquiry"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Discuss an Advisory Role
        </a>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Engagement Types ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            What This Looks Like in Practice
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Four ways to engage
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {engagements.map(({ num, title, description, suited }) => (
            <div key={num} className="bg-saabai-surface p-12 flex flex-col gap-4 hover:bg-saabai-surface-raised transition-colors relative group">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent group-hover:via-saabai-teal/30 transition-all" />
              <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold shrink-0">
                {num}
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
              <p className="text-base text-saabai-text-muted leading-relaxed">{description}</p>
              <p className="text-sm text-saabai-text-dim leading-relaxed border-t border-saabai-border pt-4 mt-auto">
                {suited}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why It Matters ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            The Problem
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl mx-auto leading-snug">
            The gap between AI hype and AI reality
          </h2>
        </div>

        <div className="flex flex-col gap-px bg-saabai-border rounded-xl overflow-hidden">

          <div className="bg-saabai-surface p-10 md:p-14">
            <p className="text-xl md:text-2xl text-saabai-text leading-relaxed mb-8 font-medium tracking-tight max-w-3xl">
              Most boards have no one who has actually built and deployed an AI system commercially.
              Not one director, not one advisor. They&apos;re making multi-hundred-thousand-dollar
              decisions based on a vendor&apos;s presentation deck.
            </p>
            <p className="text-base text-saabai-text-muted leading-relaxed max-w-3xl mb-6">
              That&apos;s not a criticism — it&apos;s a capability gap that didn&apos;t exist five years ago and
              didn&apos;t matter two years ago. It matters now. Businesses are spending serious money on
              AI initiatives, and the people approving that spend often have no way to evaluate
              whether the proposal in front of them is sound.
            </p>
            <p className="text-base text-saabai-text-muted leading-relaxed max-w-3xl">
              The risk isn&apos;t moving too slowly. The risk is making a $500k decision based on a
              vendor&apos;s PowerPoint. Shane has built AI systems that are live in businesses right now
              — generating revenue, handling client interactions, automating workflows. That
              perspective — what actually works, what doesn&apos;t, and why — is what&apos;s missing from most boardrooms.
            </p>
          </div>

          <div
            className="grid md:grid-cols-3 gap-px bg-saabai-border"
            style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
          >
            <div className="bg-saabai-surface p-12 flex flex-col gap-4">
              <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">$500k</p>
              <p className="text-base text-saabai-text-muted leading-relaxed">
                The size of AI investment decisions being made in boardrooms with no one in the
                room who has ever deployed an AI system.
              </p>
            </div>
            <div className="bg-saabai-surface p-12 flex flex-col gap-4">
              <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">0</p>
              <p className="text-base text-saabai-text-muted leading-relaxed">
                The number of directors on most Australian boards with hands-on AI implementation
                experience. The capability gap is real and it&apos;s not closing fast.
              </p>
            </div>
            <div className="bg-saabai-surface p-12 flex flex-col gap-4">
              <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">Now</p>
              <p className="text-base text-saabai-text-muted leading-relaxed">
                When the expertise matters. Not once an investment has gone wrong, not after the
                vendor has locked you in. Before the decision is made.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── What Shane Brings ────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            Credentials
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            What Shane brings to the table
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden">
          {credentials.map(({ point, detail }) => (
            <div key={point} className="bg-saabai-surface p-8 md:p-10 grid md:grid-cols-[1fr_2fr] gap-6 items-start hover:bg-saabai-surface-raised transition-colors">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0 mt-2" />
                <p className="text-base font-semibold tracking-tight leading-snug">{point}</p>
              </div>
              <p className="text-base text-saabai-text-muted leading-relaxed">{detail}</p>
            </div>
          ))}
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
          Enquire
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Ready to add AI expertise
          <br />
          <span className="text-gradient">to your board?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-6 max-w-lg mx-auto leading-relaxed">
          Whether you&apos;re a CEO, Chair, investor, or existing board member — if AI
          strategy is becoming a board-level question, let&apos;s have a conversation.
        </p>
        <p className="relative text-saabai-text-dim text-base mb-14 max-w-lg mx-auto leading-relaxed italic">
          These engagements are selective. If there&apos;s a fit, we&apos;ll know quickly.
        </p>
        <a
          href="mailto:hello@saabai.ai?subject=Advisory%20Enquiry"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Send an Enquiry
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          Email hello@saabai.ai directly. No forms, no funnels.
        </p>
      </section>

      <Footer />

    </div>
  );
}
