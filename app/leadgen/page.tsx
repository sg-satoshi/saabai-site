import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.leadgen;

const DEMO_SLUG = "bne-emergency-plumbing";

const FEATURES = [
  {
    title: "Captures lead details",
    desc: "The AI can talk with visitors and collect a name, phone, and the service they need, including after hours.",
    icon: "🎯",
  },
  {
    title: "Lead details for your team",
    desc: "Your team gets an email with the lead details.",
    icon: "📲",
  },
  {
    title: "Zero Effort Setup",
    desc: "We configure the AI with your services and service area. Ask us how long setup will take for your site.",
    icon: "🔌",
  },
  {
    title: "Works 24/7",
    desc: "While you are on a job, asleep, or on the weekend, the AI lead agent can qualify visitors and capture their details.",
    icon: "🕐",
  },
  {
    title: "Emergency Ready",
    desc: "The captured details can mark a job as urgent, so your team can see it when they read the lead.",
    icon: "🚨",
  },
  {
    title: "Grows Your Business",
    desc: "The widget collects a name, phone and the job, which a bare contact form often does not.",
    icon: "📈",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Embed the Widget", desc: "Add one line of code to your website. That is it." },
  { step: "02", title: "AI Greets Visitors", desc: "Your AI assistant welcomes visitors, asks what they need, and can capture their details." },
  { step: "03", title: "Lead Captured", desc: "Name, phone, service, address, and urgency, collected in a natural conversation." },
  { step: "04", title: "Your team gets the details", desc: "Your team gets an email with the lead details." },
];

export default function LeadGenPage() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────── */}
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
            Saabai LeadGen
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.92] mb-8">
          Turn website visitors<br />
          <span className="text-saabai-gold">into captured leads</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-dim max-w-2xl mx-auto mb-12 leading-relaxed">
          Saabai LeadGen is an AI lead capture widget for service businesses.
          It can collect a name, phone and the job at any hour, including while you are on a job.
          Your team gets an email with the lead details.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <a
            href="#demo"
            className="px-8 py-4 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all shadow-lg shadow-saabai-gold/25"
          >
            See It In Action ↓
          </a>
          <a
            href="#pricing"
            className="px-8 py-4 rounded-xl border-2 border-saabai-gold/50 text-saabai-gold font-bold text-sm tracking-wide hover:bg-saabai-gold/10 transition-all"
          >
            Pricing
          </a>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            From website visitor to a captured lead in four steps. No apps to install. No training needed.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="relative text-center">
              <div className="text-5xl font-bold text-saabai-gold/20 mb-4">{item.step}</div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-saabai-text-dim leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo / Test Drive ───────────────────────────── */}
      <section id="demo" className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Demo</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            This is an AI demo for an example plumbing business, not a real client. Jack can answer day and night and collect a name and phone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">

          {/* Left: Copy */}
          <div>
            <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8 mb-6">
              <h3 className="text-lg font-semibold mb-4">Try it right now →</h3>
              <p className="text-sm text-saabai-text-dim mb-6 leading-relaxed">
                Click the chat button and say something like:
              </p>
              <ul className="space-y-3 text-sm text-saabai-text-dim">
                <li className="flex items-start gap-2">
                  <span className="text-saabai-gold mt-0.5">•</span>
                  <span>&ldquo;Hey I need a plumber, my pipe burst&rdquo;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-saabai-gold mt-0.5">•</span>
                  <span>&ldquo;How much to fix a hot water system?&rdquo;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-saabai-gold mt-0.5">•</span>
                  <span>&ldquo;Can you come to Woolloongabba?&rdquo;</span>
                </li>
              </ul>
            </div>

            {/* What happens after */}
            <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8">
              <h3 className="text-lg font-semibold mb-4">What happens after Jack captures a lead</h3>
              <div className="space-y-4">
                {[
                  "The plan includes an email with the conversation and lead details",
                  "Urgent jobs can be marked in the captured details so your team can see them",
                  "The lead appears in your Saabai dashboard with all channels logged",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-saabai-text-dim">
                    <span className="w-5 h-5 rounded-full bg-saabai-gold/10 border border-saabai-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M1 5l3 3 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saabai-gold" />
                      </svg>
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex flex-col items-center">
            <div className="w-[340px] h-[620px] bg-[#0a0c10] border-2 border-[#222530] rounded-[32px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-[#080a0f] rounded-b-[16px] z-10" />
              <iframe
                src={`/leadgen-widget?slug=${DEMO_SLUG}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Jack AI Agent, live demo"
              />
            </div>
            <p className="text-xs text-saabai-text-dim mt-4">Live · Powered by Saabai</p>
          </div>

        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            Built for service businesses that want enquiries captured without more overhead.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-saabai-card rounded-2xl border border-saabai-border p-8 hover:border-saabai-gold/20 transition-all"
            >
              <div className="text-2xl mb-4">{f.icon}</div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-saabai-text-dim leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="relative px-6 py-32 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            One flat monthly fee. Published prices are Starter $197, Pro $397 and Enterprise $997.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Starter */}
          <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8 flex flex-col">
            <h3 className="text-lg font-semibold mb-1">Starter</h3>
            <p className="text-sm text-saabai-text-dim mb-6">For sole traders</p>
            <div className="text-3xl font-bold mb-6">
              $197<span className="text-sm font-normal text-saabai-text-dim">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-saabai-text-dim mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> AI lead capture widget</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Email notifications (unlimited)</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Monthly lead report</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Setup and configuration</li>
            </ul>
            <form action="/api/leadgen/checkout" method="POST" target="_blank">
              <input type="hidden" name="tier" value="starter" />
              <button type="submit" className="block w-full text-center py-3 rounded-xl border-2 border-saabai-gold/40 text-saabai-gold font-bold text-sm tracking-wide hover:bg-saabai-gold/10 transition-all">
                Subscribe
              </button>
            </form>
          </div>

          {/* Pro */}
          <div className="bg-saabai-card rounded-2xl border-2 border-saabai-gold/30 p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-saabai-gold text-black text-xs font-bold rounded-full">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <p className="text-sm text-saabai-text-dim mb-6">For growing teams</p>
            <div className="text-3xl font-bold mb-6">
              $397<span className="text-sm font-normal text-saabai-text-dim">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-saabai-text-dim mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Everything in Starter</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Weekly performance reports</li>
            </ul>
            <form action="/api/leadgen/checkout" method="POST" target="_blank">
              <input type="hidden" name="tier" value="pro" />
              <button type="submit" className="block w-full text-center py-3 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all shadow-lg shadow-saabai-gold/25">
                Subscribe
              </button>
            </form>
          </div>

          {/* Enterprise */}
          <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8 flex flex-col">
            <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
            <p className="text-sm text-saabai-text-dim mb-6">For multi-location businesses</p>
            <div className="text-3xl font-bold mb-6">
              $997<span className="text-sm font-normal text-saabai-text-dim">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-saabai-text-dim mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Everything in Pro</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Multi-location support</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Dedicated account management</li>
            </ul>
            <form action="/api/leadgen/checkout" method="POST" target="_blank">
              <input type="hidden" name="tier" value="enterprise" />
              <button type="submit" className="block w-full text-center py-3 rounded-xl border-2 border-saabai-gold/40 text-saabai-gold font-bold text-sm tracking-wide hover:bg-saabai-gold/10 transition-all">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-4xl mx-auto text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, var(--saabai-glow) 0%, transparent 70%)"
        }} />
        <h2 className="relative text-3xl md:text-5xl font-bold mb-6">
          Ready to capture more<br />
          <span className="text-saabai-gold">website enquiries?</span>
        </h2>
        <p className="relative text-saabai-text-dim text-lg mb-10 max-w-lg mx-auto">
          Talk to us. We set everything up for you.
        </p>
        <div className="relative flex flex-wrap justify-center gap-4">
          <a
            href="mailto:hello@saabai.ai?subject=LeadGen"
            className="px-8 py-4 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all shadow-lg shadow-saabai-gold/25"
          >
            Get started
          </a>
          <a
            href="mailto:hello@saabai.ai?subject=LeadGen%20Question"
            className="px-8 py-4 rounded-xl border-2 border-saabai-gold/40 text-saabai-gold font-bold text-sm tracking-wide hover:bg-saabai-gold/10 transition-all"
          >
            Questions? Email Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}