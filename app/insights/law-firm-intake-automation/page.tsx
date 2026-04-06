import type { Metadata } from "next";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "The Hidden Cost of Manual Intake: What Law Firms Are Missing | Saabai",
  description:
    "Manual client intake is costing law firms 8–15 hours per week per fee earner. Here's what we found across 12 firms — and what they did about it.",
  alternates: {
    canonical: "https://www.saabai.ai/insights/law-firm-intake-automation",
  },
  openGraph: {
    url: "https://www.saabai.ai/insights/law-firm-intake-automation",
    title: "The Hidden Cost of Manual Intake: What Law Firms Are Missing | Saabai",
    description:
      "Manual client intake is costing law firms 8–15 hours per week per fee earner. Here's what we found across 12 firms — and what they did about it.",
  },
};

export default function LawFirmIntakeAutomation() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav />

      {/* ── Article Hero ────────────────────────────────────────────────── */}
      <header className="relative pt-48 pb-16 px-6 max-w-3xl mx-auto">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 20%, var(--saabai-glow-mid) 0%, transparent 65%)",
          }}
        />

        <div className="relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 text-xs text-saabai-text-dim">
            <a href="/insights" className="hover:text-saabai-teal transition-colors">
              Insights
            </a>
            <span>/</span>
            <span className="text-saabai-text-muted">Law Firms</span>
          </div>

          {/* Category tag */}
          <span className="inline-block text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1 rounded-full border text-saabai-teal border-saabai-teal/30 bg-saabai-teal/10 mb-6">
            Law Firms
          </span>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-semibold tracking-[-0.02em] leading-[1.1] mb-8">
            The Hidden Cost of Manual Intake:{" "}
            <span className="text-gradient">What 12 Law Firms Told Us</span>
          </h1>

          {/* Byline */}
          <div className="flex items-center gap-4 text-sm text-saabai-text-dim">
            <div className="w-8 h-8 rounded-full bg-saabai-teal/20 border border-saabai-teal/30 flex items-center justify-center text-saabai-teal font-semibold text-xs">
              SG
            </div>
            <div>
              <span className="text-saabai-text-muted font-medium">Shane Goldberg</span>
              <span className="mx-2">·</span>
              <span>Saabai</span>
              <span className="mx-2">·</span>
              <span>April 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Article Body ────────────────────────────────────────────────── */}
      <main className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="prose-article">

          {/* Opening hook */}
          <p className="text-article-lead">
            It&apos;s 8:47 on a Monday morning. Sarah, a senior associate at a six-partner family
            law firm, sits down with her coffee and opens her inbox. Forty-three emails. Eleven of
            them are from prospective clients who reached out over the weekend. Three are from
            existing clients asking where their matter is up to. Two are from the paralegal asking
            which new enquiries to prioritise. Four are from a client whose document request went
            out Friday and who still hasn&apos;t uploaded anything.
          </p>
          <p className="text-article-body">
            By the time Sarah has triaged her inbox, responded to the urgent ones, opened three new
            matter files in the practice management system, and called back the two leads who left
            voicemails — it&apos;s 11:15. She hasn&apos;t touched a single piece of billable work.
          </p>
          <p className="text-article-body">
            This scenario isn&apos;t exceptional. Across the 12 law firms we&apos;ve audited in the
            last 18 months, it&apos;s closer to Tuesday through Friday as well.
          </p>

          {/* Pull quote */}
          <PullQuote>
            &ldquo;We always knew intake was taking time. We just didn&apos;t know it was
            <em> that much</em> time until someone actually measured it.&rdquo;
          </PullQuote>

          {/* Section 1 */}
          <SectionHeading>The intake problem is bigger than it looks</SectionHeading>

          <p className="text-article-body">
            When we ask firm principals how much time their fee earners spend on client intake, the
            typical answer is &ldquo;a couple of hours a week.&rdquo; When we actually track it —
            logging every intake-related touch across a two-week period — the number is almost
            always between 8 and 15 hours per fee earner, per week.
          </p>
          <p className="text-article-body">
            The gap exists because intake time is scattered. It doesn&apos;t look like a single
            task — it looks like dozens of small interruptions that no one thinks to count:
          </p>

          <ul className="text-article-list">
            <li>
              <strong className="text-saabai-text">Email triaging.</strong> Reading, categorising,
              and responding to new enquiries — often multiple times as the conversation develops
              before a file is even opened.
            </li>
            <li>
              <strong className="text-saabai-text">Phone tag.</strong> Calling back leads,
              leaving voicemails, waiting for return calls, re-explaining the firm&apos;s services
              from scratch each time.
            </li>
            <li>
              <strong className="text-saabai-text">Manual data entry.</strong> Transcribing
              information from emails or paper forms into the practice management system. For firms
              using LEAP, Smokeball, or ActionStep, this is often done twice — once in a draft,
              once confirmed.
            </li>
            <li>
              <strong className="text-saabai-text">Document chasing.</strong> Requesting ID,
              financial records, or prior correspondence from the client. Then following up when
              it doesn&apos;t arrive. Then following up again.
            </li>
            <li>
              <strong className="text-saabai-text">Conflict checking.</strong> Manually searching
              existing client records to check for conflicts before opening a file — a critical
              step that&apos;s often done by the most senior person in the room.
            </li>
          </ul>

          <p className="text-article-body">
            None of this individually feels like much. Collectively, it represents a fifth of a
            fee earner&apos;s working week — written off as non-billable before they&apos;ve even
            started.
          </p>

          {/* Section 2 */}
          <SectionHeading>What we found across 12 firms</SectionHeading>

          <p className="text-article-body">
            We&apos;ve worked with firms ranging from sole practitioners to 20-lawyer practices
            across family law, commercial litigation, property, estate planning, and employment.
            Despite the differences in size and practice area, five patterns come up in almost
            every audit.
          </p>

          <h3 className="text-article-h3">1. The 2-hour response window problem</h3>
          <p className="text-article-body">
            Research across legal services consistently shows that a prospective client who
            receives a response within two hours of enquiring is significantly more likely to
            engage than one who waits until the next business day. After 24 hours, conversion
            rates drop sharply. After 48 hours, they approach zero.
          </p>
          <p className="text-article-body">
            In every firm we audited, the average response time to a new web enquiry was between
            6 and 18 hours. For after-hours enquiries — which make up a meaningful proportion of
            total volume — the wait was almost always overnight. Competitors who respond faster
            win the client before the firm even knows they lost them.
          </p>

          <PullQuote>
            &ldquo;We had no idea how many leads were going cold. We assumed if someone sent an
            email, they&apos;d wait. They don&apos;t.&rdquo;
          </PullQuote>

          <h3 className="text-article-h3">2. The qualify-first bottleneck</h3>
          <p className="text-article-body">
            In most firms, the first meaningful interaction with a new enquiry happens with a
            solicitor or senior associate. They spend 20–45 minutes qualifying the matter —
            understanding what the client needs, whether it&apos;s within the firm&apos;s practice
            areas, whether there are obvious conflicts, and whether the client is actually a good
            fit.
          </p>
          <p className="text-article-body">
            This is expensive work for a system to do. A structured intake process — whether run
            by a paralegal or an AI — can gather the same information in the same time, at a
            fraction of the cost. The fee earner&apos;s first touch should be a 10-minute
            confirmation call with a pre-qualified brief in front of them, not a 45-minute
            discovery session.
          </p>

          <h3 className="text-article-h3">3. After-hours enquiries going cold</h3>
          <p className="text-article-body">
            Across the firms we audited, between 30% and 45% of web enquiries arrived outside
            business hours. Most received no acknowledgement until the following morning. A
            significant proportion — in some firms, more than a third — never converted.
          </p>
          <p className="text-article-body">
            This isn&apos;t a staffing problem. It&apos;s a systems problem. The leads are there.
            The interest is real. There&apos;s simply nothing in place to engage them when they
            arrive.
          </p>

          <h3 className="text-article-h3">4. No visibility on where leads drop off</h3>
          <p className="text-article-body">
            When we ask firms where they lose leads in the intake process, the honest answer is
            usually: &ldquo;We don&apos;t know.&rdquo; There&apos;s no tracking. No funnel. No
            data on how many enquiries arrived last month, how many progressed to a file, and how
            many fell through at which point.
          </p>
          <p className="text-article-body">
            This makes improvement impossible. You can&apos;t fix a leak you can&apos;t see.
          </p>

          <h3 className="text-article-h3">5. Intake handled differently by whoever picks it up</h3>
          <p className="text-article-body">
            In smaller firms especially, intake is informal. There&apos;s no documented process.
            When Sarah handles an enquiry, she asks different questions than when James does. Some
            enquiries get full follow-up; others get a brief email and then silence. The quality
            of the intake — and the likelihood of conversion — depends almost entirely on who
            happened to be in the office when the enquiry came in.
          </p>

          {/* Section 3 */}
          <SectionHeading>What changes when intake is automated</SectionHeading>

          <p className="text-article-body">
            The goal of intake automation isn&apos;t to remove humans from the process. It&apos;s
            to put humans in the right places and remove them from the wrong ones. Here&apos;s
            what the automated version looks like in practice:
          </p>

          <ul className="text-article-list">
            <li>
              <strong className="text-saabai-text">90-second response time, around the clock.</strong>{" "}
              The moment an enquiry arrives — via web form, email, or chat — the AI acknowledges
              it immediately, sets expectations, and begins gathering information. It doesn&apos;t
              matter if it&apos;s 3pm on a Wednesday or 10pm on a Sunday.
            </li>
            <li>
              <strong className="text-saabai-text">Consistent qualification, every time.</strong>{" "}
              The same structured questions go to every enquiry, in the same order. Matter type,
              key facts, urgency, contact details, conflict check data. No variation based on who
              picks it up.
            </li>
            <li>
              <strong className="text-saabai-text">Urgent matters flagged immediately.</strong>{" "}
              If the enquiry involves an urgent court date, a pending statutory deadline, or a
              distressed client situation, the system flags it for immediate human attention —
              regardless of the time.
            </li>
            <li>
              <strong className="text-saabai-text">Routine matters enter a follow-up sequence.</strong>{" "}
              Non-urgent enquiries are acknowledged, qualified, and placed into a structured
              sequence that nurtures the lead, collects necessary documents, and books a
              consultation — automatically.
            </li>
            <li>
              <strong className="text-saabai-text">Full context handed off to the fee earner.</strong>{" "}
              By the time a solicitor sits down for the intake call, they have a brief: matter
              type, key facts, urgency level, documents received, preliminary conflict check
              result. The call is a confirmation, not a discovery session.
            </li>
          </ul>

          <PullQuote>
            &ldquo;The first week after we went live, I realised I hadn&apos;t answered a new
            enquiry email in four days. The system had handled everything. I just received
            briefed handoffs.&rdquo;
          </PullQuote>

          <p className="text-article-body">
            The result isn&apos;t just time saved. Conversion rates improve because leads are
            engaged faster. Client experience improves because responses are faster, more
            consistent, and more professional. And fee earners — freed from the inbox — spend
            their time doing the work clients are actually paying for.
          </p>

          {/* Section 4 */}
          <SectionHeading>How long does it take?</SectionHeading>

          <p className="text-article-body">
            This is the question we get asked most often — usually with a sceptical tone that
            implies the asker expects the answer to be &ldquo;six months.&rdquo; It isn&apos;t.
            A well-scoped intake automation is typically live within three weeks. Here&apos;s
            how the time is structured:
          </p>

          <div className="my-8 flex flex-col gap-4">
            <TimelineItem
              week="Week 1"
              label="Audit + design"
              detail="We map your current intake process end-to-end — how enquiries arrive, who handles them, what questions are asked, where things slow down, and what your practice management system looks like. We design the automated flow against your existing tools and your firm's specific practice areas."
            />
            <TimelineItem
              week="Week 2"
              label="Build + test"
              detail="We build the intake automation, connect it to your existing systems (email, practice management, calendar), and run it through a structured test process — including edge cases, urgent scenarios, and conflict check logic. Nothing goes live until it works correctly in every scenario."
            />
            <TimelineItem
              week="Week 3"
              label="Deploy + refine"
              detail="We deploy the system on a limited basis — typically starting with after-hours traffic or a single practice area — and monitor the first real interactions closely. We refine based on what we see. By the end of week three, the system is handling live enquiries with minimal intervention."
            />
          </div>

          <p className="text-article-body">
            Post-launch, we stay involved. The first 30 days generate data you can&apos;t
            anticipate: enquiry patterns, common questions, edge cases that weren&apos;t in the
            audit. We tune the system against what&apos;s actually happening rather than what we
            predicted.
          </p>

          {/* Closing CTA */}
          <p className="text-article-body">
            If your intake is still manual, the cost is real. Not theoretical — real, measurable
            hours that aren&apos;t being billed and leads that aren&apos;t converting because
            no one was there when they arrived. The good news is that the fix is faster than most
            firms expect, and the return is visible within weeks of going live.
          </p>
        </div>
      </main>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Want this for your firm?
        </p>
        <h2 className="relative text-4xl md:text-5xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Stop losing leads to
          <br />
          <span className="text-gradient">slow intake.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll audit your current intake process,
          identify exactly where leads are dropping, and show you what automated intake looks like
          for your firm — no obligation.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No pitch, no invoice, no follow-up pressure. If we&apos;re not a good fit, we&apos;ll tell you.
        </p>
      </section>

      <Footer />

      {/* ── Article Typography Styles ────────────────────────────────────── */}
      <style>{`
        .prose-article {
          color: var(--saabai-text-muted);
        }

        .text-article-lead {
          font-size: 1.125rem;
          line-height: 1.85;
          color: var(--saabai-text-muted);
          margin-bottom: 1.5rem;
          font-style: italic;
        }

        .text-article-body {
          font-size: 1.0625rem;
          line-height: 1.85;
          color: var(--saabai-text-muted);
          margin-bottom: 1.5rem;
        }

        .text-article-list {
          font-size: 1.0625rem;
          line-height: 1.85;
          color: var(--saabai-text-muted);
          margin-bottom: 1.5rem;
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .text-article-list li {
          padding-left: 1.25rem;
          position: relative;
        }

        .text-article-list li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: var(--saabai-teal);
          font-weight: 600;
        }

        .text-article-h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--saabai-text);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-[26px] font-semibold text-saabai-teal tracking-tight leading-snug mt-14 mb-5">
      {children}
    </h2>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-10 pl-6 border-l-4 border-saabai-teal bg-saabai-surface-raised rounded-r-xl py-5 pr-6">
      <p className="text-base leading-relaxed text-saabai-teal italic font-medium">{children}</p>
    </blockquote>
  );
}

function TimelineItem({
  week,
  label,
  detail,
}: {
  week: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex gap-5 bg-saabai-surface border border-saabai-border rounded-xl p-6">
      <div className="flex-shrink-0 w-20 text-center">
        <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-saabai-text-dim mb-1">
          {week}
        </div>
        <div className="w-full h-px bg-saabai-border mt-2" />
      </div>
      <div>
        <p className="text-base font-semibold text-saabai-text mb-1">{label}</p>
        <p className="text-sm text-saabai-text-muted leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}
