import { SPLIT_TESTING } from "@/lib/website-tiers";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

const steps = [
  {
    n: "1",
    t: "Pick anything on the page",
    d: "Point at a headline, button, price or image in our visual editor and click \"Make this a split test\". No developer, no rebuild.",
  },
  {
    n: "2",
    t: "Write the other versions",
    d: "Type your alternatives, or ask the AI to suggest some in your voice. Nothing AI-written goes live until it is approved.",
  },
  {
    n: "3",
    t: "Real visitors decide",
    d: "Each visitor sees one version from the moment the page loads, with no flashing between them. We count views, clicks, calls and enquiries.",
  },
  {
    n: "4",
    t: "Keep the winner",
    d: "When one version is a clear winner, one click makes it the live version for everyone. Then you test the next thing.",
  },
];

const extras = [
  {
    t: "See which ad likes which headline",
    d: "Results break down by channel, source and campaign, so you can see whether Google Ads or Facebook visitors respond to a different message. Your ad links just need standard UTM tags.",
  },
  {
    t: "Honest verdicts, not hunches",
    d: "A version is only called the winner when the numbers are strong: high confidence, enough visitors and at least two full weeks. Until then it says \"too early to call\".",
  },
  {
    t: "Safe for SEO and privacy",
    d: "Google and AI search tools always see your normal page. We store a random visitor ID and a count, never names, emails or anything personal.",
  },
];

/** /websites feature section for the split testing add-on. Copy only claims what is built in lib/exp. */
export default function SplitTestingSection() {
  const tiers = SPLIT_TESTING.tiers.join(" and ");
  return (
    <section
      id="split-testing"
      aria-labelledby="split-testing-heading"
      className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border"
    >
      <div className="grid md:grid-cols-2 gap-12 items-center mb-14">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-saabai-teal mb-4">
            {SPLIT_TESTING.name}
          </p>
          <h2
            id="split-testing-heading"
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
          >
            More leads from the <span className="text-gradient">same ad spend</span>
          </h2>
          <p className="text-saabai-text-muted leading-relaxed mb-4">
            Most businesses guess which headline will work. Ours lets your visitors
            tell you.
          </p>
          <p className="text-saabai-text-muted leading-relaxed">
            We show different versions of a headline, button or image to real
            visitors and measure which one brings in more enquiries. The winner
            becomes your page, so every dollar you spend on ads works harder.
          </p>
        </div>

        {/* Illustration of the visual editor. Decorative, no results shown. */}
        <div
          aria-hidden="true"
          className="relative bg-saabai-surface border border-saabai-border rounded-2xl p-6 sm:p-8"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-saabai-text-dim mb-4">
            Visual editor
          </p>
          <div className="relative rounded-xl border-2 border-dashed border-saabai-teal/60 p-4 mb-3">
            <span className="absolute -top-3 right-3 bg-saabai-teal text-saabai-bg text-[10px] font-bold tracking-wide px-3 py-1 rounded-full">
              Make this a split test
            </span>
            <p className="text-lg font-semibold leading-snug">Your headline here</p>
          </div>
          <div className="flex flex-col gap-2">
            {["A", "B", "C"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-saabai-border px-3 py-2 text-sm"
              >
                <span className="w-6 h-6 shrink-0 rounded-full bg-saabai-teal/15 text-saabai-teal text-xs font-bold flex items-center justify-center">
                  {label}
                </span>
                <span className="text-saabai-text-muted">
                  {i === 0 ? "Your current headline" : i === 1 ? "A new version you write" : "An AI suggestion, once approved"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden mb-12">
        {steps.map((s) => (
          <div key={s.n} className="bg-saabai-surface p-6">
            <p className="text-saabai-teal text-sm font-bold mb-2">Step {s.n}</p>
            <h3 className="text-base font-semibold mb-2">{s.t}</h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {extras.map((e) => (
          <div key={e.t}>
            <h3 className="text-base font-semibold mb-2">{e.t}</h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">{e.d}</p>
          </div>
        ))}
      </div>

      <div className="bg-saabai-surface border border-saabai-teal/40 rounded-2xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="font-semibold mb-1">Available as an add-on for {tiers} sites.</p>
          <p className="text-sm text-saabai-text-muted leading-relaxed">
            Tests need real traffic to give a clear answer, so we switch it on once
            your site has visitors to learn from. Ask us at your consult.
          </p>
        </div>
        <a
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-center bg-saabai-teal text-saabai-bg px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide"
        >
          Ask about split testing
        </a>
      </div>
    </section>
  );
}
