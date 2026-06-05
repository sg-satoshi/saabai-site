import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Lead Conversion for Service Businesses | Saabai LeadGen",
  description:
    "Turn every website visitor into a booked job. Saabai LeadGen captures, qualifies, and alerts you the moment a lead comes in — 24/7, automatically.",
  alternates: { canonical: "https://www.saabai.ai/leadgen" },
  openGraph: {
    url: "https://www.saabai.ai/leadgen",
    title: "AI Lead Conversion for Service Businesses | Saabai LeadGen",
    description:
      "Turn every website visitor into a booked job. Saabai LeadGen captures, qualifies, and alerts you the moment a lead comes in — 24/7, automatically.",
  },
};

const DEMO_SLUG = "bne-emergency-plumbing";
const WIDGET_SCRIPT = `<script src="https://www.saabai.ai/api/leadgen/widget?slug=${DEMO_SLUG}"></script>`;

const FEATURES = [
  {
    title: "Captures Every Lead",
    desc: "Never miss a potential customer. Our AI engages every visitor, collecting name, phone, and service needed — even after hours.",
    icon: "🎯",
  },
  {
    title: "Instant Alerts",
    desc: "Email notification the second a lead comes in. Name, phone, service, and urgency — everything you need to call back fast.",
    icon: "⚡",
  },
  {
    title: "Zero Effort Setup",
    desc: "One line of code on your website. We configure the AI with your services, pricing, and service area. Done in under an hour.",
    icon: "🔌",
  },
  {
    title: "Works 24/7",
    desc: "While you're on a job, asleep, or on the weekend — your AI lead agent is qualifying and capturing every visitor.",
    icon: "🕐",
  },
  {
    title: "Emergency Ready",
    desc: "Emergency callouts flagged immediately. The AI knows to prioritise urgent leads so you can respond when it matters most.",
    icon: "🚨",
  },
  {
    title: "Grows Your Business",
    desc: "More leads captured = more jobs booked. Our clients see 2-3x more lead capture vs contact forms alone.",
    icon: "📈",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Embed the Widget", desc: "Add one line of code to your website. That's it." },
  { step: "02", title: "AI Greets Visitors", desc: "Your AI assistant welcomes every visitor, asks what they need, and captures their details." },
  { step: "03", title: "Lead Captured", desc: "Name, phone, service, address, urgency — collected in a natural conversation." },
  { step: "04", title: "You Get Notified", desc: "Instant email alert with every detail. Call the lead back and book the job." },
];

export default function LeadGenPage() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav />

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
            Saabai LeadGen
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.92] mb-8">
          Turn website visitors<br />
          <span className="text-saabai-gold">into booked jobs</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-dim max-w-2xl mx-auto mb-12 leading-relaxed">
          Saabai LeadGen is a 24/7 AI lead conversion agent for service businesses.
          It captures, qualifies, and alerts you the moment a lead comes in —
          automatically. No forms to fill. No missed calls. No lost revenue.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <a
            href="#demo"
            className="px-8 py-4 rounded-xl bg-saabai-gold text-saabai-bg font-semibold text-sm tracking-wide hover:brightness-110 transition-all"
          >
            See It In Action ↓
          </a>
          <a
            href="#pricing"
            className="px-8 py-4 rounded-xl border border-saabai-border text-saabai-text-dim font-semibold text-sm tracking-wide hover:border-saabai-text-dim transition-all"
          >
            Pricing
          </a>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            From website visitor to booked job in four steps. No apps to install. No training needed.
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

      {/* ── Demo / Test Drive ─────────────────────────────────────────── */}
      <section id="demo" className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Test Drive the Widget</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            Click the chat button in the bottom-right corner. This is exactly what your customers would see.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start max-w-4xl mx-auto">
          <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8">
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
            <div className="mt-8 p-4 bg-saabai-bg rounded-xl border border-saabai-border">
              <p className="text-xs text-saabai-text-dim mb-2 font-mono">Embed code (one line):</p>
              <code className="text-xs text-saabai-gold break-all font-mono">
                {WIDGET_SCRIPT}
              </code>
            </div>
          </div>

          <div className="bg-saabai-card rounded-2xl border border-saabai-border p-8">
            <h3 className="text-lg font-semibold mb-4">What happens next:</h3>
            <ol className="space-y-4 text-sm text-saabai-text-dim">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-saabai-teal/20 text-saabai-teal flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>AI greets the visitor and asks what they need</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-saabai-teal/20 text-saabai-teal flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Collects their name and phone number naturally</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-saabai-teal/20 text-saabai-teal flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Lead saved + email notification sent to you instantly</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-saabai-teal/20 text-saabai-teal flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>You call the lead back and book the job</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Inline embed for the widget */}
        <div dangerouslySetInnerHTML={{ __html: WIDGET_SCRIPT }} />
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            Built for service businesses that want more bookings without more overhead.
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

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="relative px-6 py-32 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-saabai-text-dim text-lg max-w-xl mx-auto">
            One flat monthly fee. No surprises, no long contracts, no hidden costs.
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
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Instant email notifications</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Monthly lead report</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Setup & configuration</li>
            </ul>
            <a href="#demo" className="block text-center py-3 rounded-xl border border-saabai-border text-sm font-semibold hover:border-saabai-text-dim transition-all">
              Try Free Demo
            </a>
          </div>

          {/* Pro */}
          <div className="bg-saabai-card rounded-2xl border-2 border-saabai-gold/30 p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-saabai-gold text-saabai-bg text-xs font-semibold rounded-full">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <p className="text-sm text-saabai-text-dim mb-6">For growing teams</p>
            <div className="text-3xl font-bold mb-6">
              $397<span className="text-sm font-normal text-saabai-text-dim">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-saabai-text-dim mb-8 flex-1">
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Everything in Starter</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Google Maps listing management</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Automated review responses</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Weekly performance reports</li>
            </ul>
            <a href="#demo" className="block text-center py-3 rounded-xl bg-saabai-gold text-saabai-bg text-sm font-semibold hover:brightness-110 transition-all">
              Try Free Demo
            </a>
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
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> SMS lead alerts</li>
              <li className="flex items-center gap-2"><span className="text-saabai-teal">✓</span> Dedicated account management</li>
            </ul>
            <a href="#demo" className="block text-center py-3 rounded-xl border border-saabai-border text-sm font-semibold hover:border-saabai-text-dim transition-all">
              Try Free Demo
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-32 max-w-4xl mx-auto text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, var(--saabai-glow) 0%, transparent 70%)"
        }} />
        <h2 className="relative text-3xl md:text-5xl font-bold mb-6">
          Ready to turn more visitors<br />
          <span className="text-saabai-gold">into booked jobs?</span>
        </h2>
        <p className="relative text-saabai-text-dim text-lg mb-10 max-w-lg mx-auto">
          Get started with a free 14-day trial. No credit card. No commitment. We set everything up for you.
        </p>
        <div className="relative flex flex-wrap justify-center gap-4">
          <a
            href="mailto:hello@saabai.ai?subject=LeadGen%20Trial"
            className="px-8 py-4 rounded-xl bg-saabai-gold text-saabai-bg font-semibold text-sm tracking-wide hover:brightness-110 transition-all"
          >
            Start Free Trial
          </a>
          <a
            href="mailto:hello@saabai.ai?subject=LeadGen%20Question"
            className="px-8 py-4 rounded-xl border border-saabai-border text-saabai-text-dim font-semibold text-sm tracking-wide hover:border-saabai-text-dim transition-all"
          >
            Questions? Email Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
