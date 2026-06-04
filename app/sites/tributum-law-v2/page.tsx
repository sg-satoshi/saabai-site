"use client";

import { useState } from "react";
import TributumChatWidget from "@/app/components/TributumChatWidget";

const COLORS = {
  navy: "#0F1B2E",
  ivory: "#FAF8F5",
  gold: "#B8860B",
  charcoal: "#1A1A1A",
  grey: "#6B6B6B",
  cream: "#F5F0EA",
  border: "#E5E0DA",
};

const SERVICES = [
  {
    title: "International Tax & Complex Structures",
    desc: "Cross-border transactions, transfer pricing, and multi-jurisdictional structuring for global enterprises.",
  },
  {
    title: "Anti-Avoidance & ATO Disputes",
    desc: "Strategic defence against Part IVA challenges, audits, and tax controversy resolution.",
  },
  {
    title: "Trusts & Family Wealth",
    desc: "Trust establishment, restructuring, and succession planning for high-net-worth families.",
  },
  {
    title: "Excise, Fuel Tax & WET",
    desc: "Specialised advice on indirect taxes, rebates, and compliance for manufacturers and distributors.",
  },
  {
    title: "Charities & Not-for-Profits",
    desc: "Tax exemption applications, ACNC compliance, and deductible gift recipient status.",
  },
  {
    title: "State Taxes - Land, Payroll & Duties",
    desc: "Land tax objections, payroll tax audits, and stamp duty assessments across all jurisdictions.",
  },
];

const PROCESS = [
  {
    num: "01",
    title: "Assess",
    desc: "We analyse your position thoroughly, identifying every risk and opportunity.",
  },
  {
    num: "02",
    title: "Advise",
    desc: "Clear, actionable recommendations backed by deep technical expertise.",
  },
  {
    num: "03",
    title: "Resolve",
    desc: "Achieve the best possible outcome through negotiation or litigation.",
  },
];

export default function TributumLawPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/site-factory/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, siteSlug: "tributum-law-v2" }),
    });
    setSubmitted(true);
  }

  return (
    <main className="font-sans">
      {/* ── Hero ── */}
      <section className="relative min-h-screen" style={{ background: COLORS.navy, color: "#fff" }}>
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16">
          <div style={{ fontFamily: "Georgia, serif" }} className="text-xl font-semibold tracking-wide">
            Tributum Law
          </div>
          <div className="hidden md:flex gap-8 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            {["Services", "About", "Reviews", "Team", "Process", "Contact"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </nav>

        {/* Hero Content — Split Layout */}
        <div className="relative z-10 flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
          {/* Left: Text */}
          <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-12 lg:py-0">
            <p className="text-xs tracking-[0.3em] uppercase mb-8" style={{ color: COLORS.gold }}>
              Tax & Trust Law Advisory
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="text-5xl md:text-6xl lg:text-7xl font-normal leading-[1.1] mb-8">
              Tax & Trust Law.
              <br />
              <span style={{ color: COLORS.gold }}>Resolved.</span>
            </h1>
            <p className="text-lg md:text-xl max-w-lg mb-12 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              Specialist tax and trust advisory for complex matters.
              <br className="hidden md:block" />
              Adelaide-based. Australia-wide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: COLORS.gold, color: COLORS.navy }}
              >
                Book a Consultation
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold border transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
              >
                Explore Our Services
              </a>
            </div>

            {/* Trust Bar */}
            <div className="mt-16 pt-8 border-t flex flex-wrap gap-8 text-xs tracking-wide" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <span>50+ years combined experience</span>
              <span>•</span>
              <span>ATO disputes resolved</span>
              <span>•</span>
              <span>ASX-listed clients</span>
            </div>
          </div>

          {/* Right: Image */}
          <div className="hidden lg:block lg:w-[45%] relative">
            <img
              src="/sites/tributum-law-v2/consultation.png"
              alt="Tributum Law consultation"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #0F1B2E 0%, transparent 40%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, #0F1B2E 100%)" }} />
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ background: COLORS.ivory }} className="py-24 md:py-32 px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>
            Practice Areas
          </p>
          <h2 style={{ fontFamily: "Georgia, serif", color: COLORS.navy }} className="text-4xl md:text-5xl font-normal mb-16">
            Where complexity meets clarity.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="p-8 rounded-xl transition-all hover:-translate-y-1"
                style={{ background: COLORS.cream, border: `1px solid ${COLORS.border}` }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.navy }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.grey }}>
                  {s.desc}
                </p>
                <a href="#contact" className="text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: COLORS.gold }}>
                  Learn more <span>→</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About / Differentiator ── */}
      <section id="about" className="relative py-24 md:py-32 px-8 md:px-16 overflow-hidden" style={{ background: COLORS.ivory }}>
        {/* Texture Background */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "url('/sites/tributum-law-v2/about-texture.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>
            Why Tributum
          </p>
          <blockquote style={{ fontFamily: "Georgia, serif", color: COLORS.navy }} className="text-3xl md:text-4xl font-normal leading-snug mb-4">
            "The hardest thing in the world to understand is the income tax."
          </blockquote>
          <p className="text-sm mb-16" style={{ color: COLORS.grey }}>
            — Albert Einstein. We understand it so you don't have to.
          </p>

          <div className="grid grid-cols-3 gap-8 mb-16">
            {[
              { val: "15+", label: "Years specialist focus" },
              { val: "100%", label: "Tax & trust only" },
              { val: "$500M+", label: "Disputes resolved" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-light mb-2" style={{ color: COLORS.gold }}>
                  {stat.val}
                </div>
                <div className="text-xs tracking-wide uppercase" style={{ color: COLORS.grey }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: COLORS.charcoal }}>
            Tributum Law was founded on a simple principle: the most complex areas of law deserve the deepest specialist expertise.
            Operating from our offices at Level 1, 195 Victoria Square in the heart of Adelaide's legal precinct,
            we focus exclusively on taxation and trust law. That singular focus means every client engages with a team that
            lives and breathes this area of law, every day.
          </p>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section id="reviews" className="py-24 md:py-32 px-8 md:px-16" style={{ background: COLORS.ivory }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>Client Reviews</p>
          <h2 style={{ fontFamily: "Georgia, serif", color: COLORS.navy }} className="text-4xl md:text-5xl font-normal mb-4">
            What our clients say.
          </h2>
          <p className="text-base max-w-2xl mb-16 leading-relaxed" style={{ color: COLORS.grey }}>
            Real results for real clients. Here is what high net worth individuals and referring professionals have to say about working with Tributum Law.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                stars: "★★★★★",
                text: "\"We referred a complicated discretionary trust restructure to Tributum Law after hitting the limits of our own expertise. They turned it around quickly, communicated clearly throughout, and our client was thrilled with the outcome. Absolutely the best specialist firm we have worked with.\"",
                name: "Michael B.",
                title: "Senior Partner, Accounting Firm, Adelaide SA",
                initials: "MB",
              },
              {
                stars: "★★★★★",
                text: "\"I was facing an ATO audit and significant potential tax liability on a series of trust distributions going back three years. The team reviewed the documentation, identified a clear legal basis for our position, and handled the entire objection process. The outcome saved me well into six figures. Exceptional expertise.\"",
                name: "Sandra K.",
                title: "Business Owner, Prospect SA",
                initials: "SK",
              },
              {
                stars: "★★★★★",
                text: "\"Our firm regularly briefs Tributum Law on behalf of our clients. The quality of their advice is consistently outstanding, their turnaround is fast, and they are genuinely easy to work with. They have a rare ability to translate complex tax law into practical, actionable guidance.\"",
                name: "Thomas L.",
                title: "Principal Solicitor, General Practice, Adelaide SA",
                initials: "TL",
              },
            ].map((review, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl transition-all hover:-translate-y-1"
                style={{ background: "#ffffff", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(15,27,46,0.06)" }}
              >
                <div className="text-lg mb-4 tracking-wider" style={{ color: COLORS.gold }}>{review.stars}</div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: COLORS.charcoal, fontStyle: "italic" }}>{review.text}</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: COLORS.navy }}
                  >
                    {review.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>{review.name}</p>
                    <p className="text-xs" style={{ color: COLORS.grey }}>{review.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Google badge */}
          <div className="mt-12 flex items-center justify-center gap-3 text-sm" style={{ color: COLORS.grey }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ color: COLORS.charcoal, fontWeight: 600 }}>5.0</span>
            <span>on Google Reviews</span>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section id="team" className="py-24 md:py-32 px-8 md:px-16" style={{ background: COLORS.navy, color: "#fff" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>
            Our People
          </p>
          <h2 style={{ fontFamily: "Georgia, serif" }} className="text-4xl md:text-5xl font-normal mb-6">
            Meet the team.
          </h2>
          <p className="text-base max-w-xl mb-16 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Our principals bring deep specialist expertise across tax law, trust structures and estate planning, with careers built exclusively in this field.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Mathew Brittingham */}
            <div className="p-8 md:p-10 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start gap-6 mb-6">
                <img
                  src="/sites/tributum-law-v2/mathew-brittingham.jpg"
                  alt="Mathew Brittingham"
                  className="w-20 h-20 rounded-full object-cover shrink-0"
                  style={{ border: `2px solid ${COLORS.gold}` }}
                />
                <div>
                  <h3 style={{ fontFamily: "Georgia, serif" }} className="text-2xl font-normal mb-1">
                    Mathew Brittingham
                  </h3>
                  <p className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.gold }}>
                    Managing Director
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Mathew is a tax and trust law specialist with a Master of Laws in Taxation from Sydney University.
                He was a partner in a leading corporate law firm and acts for clients across all of Australia and the globe.
                This expertise allows him to advise clients on complex areas of tax law such as tax avoidance, international tax,
                mergers and acquisitions, restructuring and sophisticated trust arrangements.
                Mathew is also regularly called on to act for taxpayers in disputes with the ATO and State Revenue Offices,
                and routinely assists to resolve audits with those authorities.
              </p>
            </div>

            {/* Teresa Ta */}
            <div className="p-8 md:p-10 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start gap-6 mb-6">
                <img
                  src="/sites/tributum-law-v2/teresa-ta.png"
                  alt="Teresa Ta"
                  className="w-20 h-20 rounded-full object-cover shrink-0"
                  style={{ border: `2px solid ${COLORS.gold}` }}
                />
                <div>
                  <h3 style={{ fontFamily: "Georgia, serif" }} className="text-2xl font-normal mb-1">
                    Teresa Ta
                  </h3>
                  <p className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.gold }}>
                    Associate
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Teresa graduated from the University of South Australia with a Bachelor of Laws (Honours) and a Bachelor of Business (Management).
                She is currently on the path to becoming a Chartered Tax Adviser.
                Prior to joining Tributum Law, Teresa worked at both leading and boutique commercial law firms,
                gaining experience solving complex tax and legal challenges for a broad range of clients.
                Her clients have included growing sole traders, incorporated associations and established private and public companies.
                At Tributum Law, Teresa works closely with the Managing Director across all facets of tax and trust law,
                ensuring clients receive coordinated, practical advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="relative py-24 md:py-32 px-8 md:px-16 overflow-hidden" style={{ background: COLORS.navy, color: "#fff" }}>
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>
            Our Process
          </p>
          <h2 style={{ fontFamily: "Georgia, serif" }} className="text-4xl md:text-5xl font-normal mb-6">
            Three steps to resolution.
          </h2>
          <p className="text-base max-w-2xl mb-16 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            A clear, structured path to resolving your tax or trust matter — from initial assessment through to resolution.
          </p>

          {/* Process Image */}
          <div className="mb-16 rounded-2xl overflow-hidden">
            <img
              src="/sites/tributum-law-v2/process-timeline.png"
              alt="Tributum Law process timeline — Assess, Advise, Resolve"
              className="w-full h-auto"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {PROCESS.map((step, i) => (
              <div key={i} className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light mb-6" style={{ background: "rgba(184,134,11,0.15)", border: `1px solid rgba(184,134,11,0.3)`, color: COLORS.gold }}>
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {step.desc}
                </p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 w-px h-32" style={{ background: "rgba(184,134,11,0.2)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ background: COLORS.ivory }} className="py-24 md:py-32 px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.gold }}>
                Get in Touch
              </p>
              <h2 style={{ fontFamily: "Georgia, serif", color: COLORS.navy }} className="text-4xl md:text-5xl font-normal mb-8">
                Ready to resolve your tax matter?
              </h2>

              <div className="space-y-6 mb-12">
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.grey }}>Phone</p>
                  <a href="tel:+61405014888" className="text-lg" style={{ color: COLORS.navy }}>+61 405 014 888</a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.grey }}>Email</p>
                  <a href="mailto:contact@tributumlaw.com" className="text-lg" style={{ color: COLORS.navy }}>contact@tributumlaw.com</a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.grey }}>Address</p>
                  <p className="text-lg" style={{ color: COLORS.navy }}>
                    Level 1, 195 Victoria Square
                    <br />
                    Adelaide SA 5000
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.grey }}>Hours</p>
                  <p style={{ color: COLORS.navy }}>Mon–Fri: 9am – 6pm</p>
                  <p style={{ color: COLORS.navy }}>Sat–Sun: By Appointment</p>
                </div>
              </div>
            </div>

            <div>
              {submitted ? (
                <div className="p-8 rounded-xl text-center" style={{ background: COLORS.cream, border: `1px solid ${COLORS.border}` }}>
                  <div className="text-3xl mb-4">✓</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.navy }}>Thank you</h3>
                  <p style={{ color: COLORS.grey }}>We'll be in touch within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.grey }}>Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg text-sm"
                      style={{ background: "#fff", border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.grey }}>Phone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 rounded-lg text-sm"
                      style={{ background: "#fff", border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.grey }}>Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 rounded-lg text-sm"
                      style={{ background: "#fff", border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.grey }}>How can we help?</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                      style={{ background: "#fff", border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: COLORS.navy, color: "#fff" }}
                  >
                    Send Enquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: COLORS.navy, color: "#fff" }} className="py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div style={{ fontFamily: "Georgia, serif" }} className="text-lg font-semibold mb-3">
                Tributum Law
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Adelaide's dedicated tax and trust law firm. Specialist expertise for complex matters.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Practice Areas</p>
              <div className="space-y-2">
                {SERVICES.slice(0, 4).map((s, i) => (
                  <a key={i} href="#services" className="block text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Contact</p>
              <div className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <p>+61 405 014 888</p>
                <p>contact@tributumlaw.com</p>
                <p>Level 1, 195 Victoria Square</p>
                <p>Adelaide SA 5000</p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}>
            <p className="mb-2">Liability limited by a scheme approved under Professional Standards Legislation.</p>
            <p>© 2024 Tributum Law. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
      <TributumChatWidget />
    </main>
  );
}
