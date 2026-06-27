"use client";

import { useState } from "react";

const C = {
  navy: "#123B5D",
  orange: "#F58220",
  grey: "#5C6670",
  white: "#ffffff",
  lightGrey: "#F4F5F6",
  charcoal: "#1A2B3C",
  border: "#E2E6EA",
};

const INDUSTRIES = [
  { name: "Construction", icon: "🏗️", desc: "Commercial, residential and civil construction across Australia." },
  { name: "Mining", icon: "⛏️", desc: "Surface and underground operations, maintenance and processing." },
  { name: "Manufacturing", icon: "🏭", desc: "Production, assembly, quality control and plant operations." },
  { name: "Warehousing", icon: "📦", desc: "Distribution centres, pick & pack, inventory and logistics." },
  { name: "Transport", icon: "🚛", desc: "Heavy vehicle, freight, last-mile delivery and owner-operators." },
  { name: "Civil", icon: "🛣️", desc: "Roads, utilities, earthworks and infrastructure projects." },
  { name: "Trades", icon: "🔧", desc: "Electrical, plumbing, HVAC, carpentry and specialist trades." },
  { name: "Logistics", icon: "🔄", desc: "Supply chain, dispatch, container handling and 3PL operations." },
];

const SERVICES = [
  {
    title: "Permanent Recruitment",
    desc: "End-to-end placement of full-time workers who fit your culture and pass our rigorous skills screening.",
    icon: "👤",
  },
  {
    title: "Labour Hire",
    desc: "Flexible workforce solutions — scale up or down with pre-screened, safety-inducted workers ready to start.",
    icon: "👷",
  },
  {
    title: "Executive Search",
    desc: "Confidential search for senior operational leaders, site managers and department heads.",
    icon: "🎯",
  },
  {
    title: "Volume Recruitment",
    desc: "High-volume hiring campaigns managed from brief to onboarding — fast, compliant and cost-effective.",
    icon: "📋",
  },
  {
    title: "Workforce Planning",
    desc: "Strategic workforce consulting to match your labour needs with project timelines and budget.",
    icon: "📊",
  },
  {
    title: "Recruitment Process Outsourcing",
    desc: "We embed into your business as your dedicated recruitment function — same team, lower cost.",
    icon: "🤝",
  },
];

const WHY = [
  { title: "Fast Response", desc: "We move at the speed of your projects. Same-day response, fast shortlists.", icon: "⚡" },
  { title: "Quality Candidates", desc: "Every candidate is screened, reference-checked and verified before they reach you.", icon: "✅" },
  { title: "Industry Specialists", desc: "Our consultants have worked in the industries they recruit for. They speak your language.", icon: "🎓" },
  { title: "National Coverage", desc: "Offices and networks across every major metro and regional market in Australia.", icon: "🗺️" },
  { title: "Relationship Driven", desc: "We build long-term partnerships, not transactional placements. Your success is ours.", icon: "🤝" },
  { title: "Compliance Focus", desc: "Fully compliant labour hire. PAYG, super, WHS — all handled so you're protected.", icon: "🛡️" },
];

const TESTIMONIALS = [
  {
    text: "BO Consulting filled three site supervisor roles for us within two weeks. The quality of candidates was exceptional — all had the right tickets, experience and attitude. We've used them exclusively ever since.",
    name: "James T.",
    title: "Operations Manager, Commercial Builder — Queensland",
    initials: "JT",
  },
  {
    text: "We needed to ramp up 40 warehouse workers for peak season with less than three weeks notice. BO Consulting delivered on time, every worker was inducted and ready to go. Genuinely impressive.",
    name: "Michelle R.",
    title: "Logistics Director, Distribution Centre — New South Wales",
    initials: "MR",
  },
  {
    text: "What sets BO Consulting apart is that they actually understand civil construction. They don't send us candidates who look good on paper but have never been on a site. Every referral is the real deal.",
    name: "Dave K.",
    title: "Project Director, Civil Infrastructure — Western Australia",
    initials: "DK",
  },
];

const STATS = [
  { val: "1,000+", label: "Placements" },
  { val: "Australia Wide", label: "National Coverage" },
  { val: "48hr", label: "Average Turnaround" },
  { val: "95%", label: "Retention Rate" },
];

const NAV_ITEMS = ["About", "Industries", "Services", "Why Us", "Testimonials", "Contact"];

export default function BOConsultancyPage() {
  const [formData, setFormData] = useState({ type: "employer" });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", color: C.charcoal }}>

      {/* ── Sticky Nav ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(18, 59, 93, 0.97)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          {/* Logo */}
          <a href="#" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/sites/bo-consultancy/logo.png" alt="BO Consultancy" style={{ height: 36, width: "auto", background: "#fff", borderRadius: 6, padding: "4px 10px" }} />
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 32, display: "flex" }}>
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a
              href="#contact"
              className="hidden md:inline-flex"
              style={{ background: C.orange, color: "#fff", padding: "10px 24px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Find Staff
            </a>
            {/* Hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexDirection: "column", gap: 5 }}
            >
              <span style={{ display: "block", width: 24, height: 2, background: menuOpen ? "transparent" : "#fff", transition: "0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ display: "block", width: 24, height: 2, background: "#fff", transition: "0.2s", transform: menuOpen ? "rotate(-45deg)" : "none" }} />
              {!menuOpen && <span style={{ display: "block", width: 24, height: 2, background: "#fff" }} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{ background: C.navy, borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px 24px 24px" }}>
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMenuOpen(false)}
                style={{ display: "block", color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 16, fontWeight: 500, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {item}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              style={{ display: "block", marginTop: 16, background: C.orange, color: "#fff", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center" }}
            >
              Find Staff
            </a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section
        id="home"
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, #0d2d47 60%, #1a4a6e 100%)`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 72,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hero background image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            opacity: 0.18,
            pointerEvents: "none",
          }}
        />
        {/* Dark overlay for text legibility */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to right, rgba(18,59,93,0.92) 0%, rgba(18,59,93,0.7) 60%, rgba(18,59,93,0.4) 100%)`,
            pointerEvents: "none",
          }}
        />
        {/* Background geometric accent */}
        <div
          style={{
            position: "absolute",
            right: "-10%",
            top: "10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(245,130,32,0.12) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-5%",
            bottom: "-10%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(245,130,32,0.06) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,130,32,0.15)", border: "1px solid rgba(245,130,32,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, display: "inline-block" }} />
            <span style={{ color: C.orange, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Australia's Workforce Specialists
            </span>
          </div>

          <h1 style={{ color: "#fff", fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 24, maxWidth: 800 }}>
            Connecting Australia's{" "}
            <span style={{ color: C.orange }}>Workforce.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(16px, 2vw, 20px)", maxWidth: 540, lineHeight: 1.7, marginBottom: 48 }}>
            Helping Australian businesses find reliable, skilled workers faster. Blue-collar recruitment done right.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a
              href="#contact"
              style={{
                background: C.orange,
                color: "#fff",
                padding: "16px 36px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Find Staff →
            </a>
            <a
              href="#contact"
              onClick={() => setFormData((f) => ({ ...f, type: "candidate" }))}
              style={{
                background: "transparent",
                color: "#fff",
                padding: "16px 36px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                border: "2px solid rgba(255,255,255,0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Looking for Work
            </a>
          </div>

          {/* Trust Bar */}
          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 72,
              paddingTop: 40,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              flexWrap: "wrap",
            }}
          >
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{ color: C.orange, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ background: C.white, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 64, alignItems: "center" }}>
          <div>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              About BO Consulting
            </p>
            <h2 style={{ color: C.navy, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>
              We don't just fill roles. We build workforces.
            </h2>
            <p style={{ color: C.grey, fontSize: 16, lineHeight: 1.8, marginBottom: 20 }}>
              BO Consulting was built on a simple belief: Australian businesses deserve a recruitment partner that truly understands blue-collar work. Not just the roles, but the sites, the culture, the safety requirements and the pressure of project deadlines.
            </p>
            <p style={{ color: C.grey, fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
              Our consultants have worked in the industries they recruit for. That means faster shortlists, better candidate fit and fewer surprises on site.
            </p>
            <a
              href="#contact"
              style={{ color: C.orange, fontSize: 15, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Talk to our team →
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { val: "8", label: "Industries Covered" },
              { val: "6", label: "Service Offerings" },
              { val: "National", label: "Australia Wide" },
              { val: "Fast", label: "48hr Turnaround" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: i % 2 === 0 ? C.navy : C.lightGrey,
                  borderRadius: 16,
                  padding: "32px 24px",
                }}
              >
                <div style={{ color: i % 2 === 0 ? C.orange : C.navy, fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{item.val}</div>
                <div style={{ color: i % 2 === 0 ? "rgba(255,255,255,0.6)" : C.grey, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section id="industries" style={{ background: C.lightGrey, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, maxWidth: 640 }}>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              Industries We Serve
            </p>
            <h2 style={{ color: C.navy, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              Specialists across every blue-collar sector.
            </h2>
            <p style={{ color: C.grey, fontSize: 16, lineHeight: 1.7 }}>
              Deep industry knowledge that means better candidate matching and faster placements.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {INDUSTRIES.map((ind, i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  borderRadius: 12,
                  padding: "28px 24px",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 2px 12px rgba(18,59,93,0.06)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(18,59,93,0.12)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(18,59,93,0.06)";
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{ind.icon}</div>
                <h3 style={{ color: C.navy, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{ind.name}</h3>
                <p style={{ color: C.grey, fontSize: 14, lineHeight: 1.6 }}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ background: C.white, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, maxWidth: 640 }}>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              What We Do
            </p>
            <h2 style={{ color: C.navy, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              The right service for every workforce need.
            </h2>
            <p style={{ color: C.grey, fontSize: 16, lineHeight: 1.7 }}>
              From single permanent placements to full RPO partnerships, we scale to your requirements.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {SERVICES.map((s, i) => (
              <div
                key={i}
                style={{
                  background: C.lightGrey,
                  borderRadius: 16,
                  padding: "36px 32px",
                  border: `1px solid ${C.border}`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 4,
                    height: "100%",
                    background: C.orange,
                    borderRadius: "16px 0 0 16px",
                  }}
                />
                <div style={{ fontSize: 28, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ color: C.navy, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                <p style={{ color: C.grey, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ── */}
      <section id="why-us" style={{ background: C.navy, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, maxWidth: 640 }}>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              Why BO Consulting
            </p>
            <h2 style={{ color: "#fff", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              The difference is in the details.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.7 }}>
              We've built our business around the things that actually matter to the industries we serve.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {WHY.map((w, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "32px 28px",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{w.icon}</div>
                <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{w.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.7 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" style={{ background: C.lightGrey, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              Client Testimonials
            </p>
            <h2 style={{ color: C.navy, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2 }}>
              What our clients say.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  borderRadius: 16,
                  padding: "36px 32px",
                  boxShadow: "0 4px 24px rgba(18,59,93,0.08)",
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: C.orange, fontSize: 20, letterSpacing: 2, marginBottom: 20 }}>★★★★★</div>
                  <p style={{ color: C.charcoal, fontSize: 15, lineHeight: 1.8, fontStyle: "italic", marginBottom: 28 }}>
                    "{t.text}"
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: C.navy,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p style={{ color: C.navy, fontSize: 14, fontWeight: 700 }}>{t.name}</p>
                    <p style={{ color: C.grey, fontSize: 12, marginTop: 2 }}>{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${C.orange} 0%, #d96f10 100%)`,
          padding: "72px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, marginBottom: 16 }}>
            Ready to build your workforce?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, marginBottom: 40, lineHeight: 1.6 }}>
            Talk to our team today. No lock-in contracts, no hidden fees — just great recruitment.
          </p>
          <a
            href="#contact"
            style={{
              background: C.white,
              color: C.orange,
              padding: "18px 48px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Contact Us Today
          </a>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ background: C.white, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 64 }}>
          <div>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              Get in Touch
            </p>
            <h2 style={{ color: C.navy, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>
              Let's find the right people for your business.
            </h2>
            <p style={{ color: C.grey, fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
              Whether you're an employer looking for skilled workers or a candidate looking for your next opportunity, we want to hear from you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                { label: "Email", value: "info@boconsulting.com.au", href: "mailto:info@boconsulting.com.au" },
                { label: "Operating Hours", value: "Mon–Fri: 9am – 5pm AEST", href: null },
                { label: "Coverage", value: "All states and territories, Australia", href: null },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ color: C.grey, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{item.label}</p>
                  {item.href ? (
                    <a href={item.href} style={{ color: C.navy, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>{item.value}</a>
                  ) : (
                    <p style={{ color: C.navy, fontSize: 16, fontWeight: 600 }}>{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            {/* Employer / Candidate toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 32, background: C.lightGrey, borderRadius: 8, padding: 4 }}>
              <button
                id="bo-tab-hiring"
                onClick={() => setFormData((f) => ({ ...f, type: "employer" }))}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: formData.type === "employer" ? C.navy : "transparent",
                  color: formData.type === "employer" ? "#fff" : C.grey,
                  transition: "all 0.2s",
                }}
              >
                I&apos;m Hiring
              </button>
              <button
                id="bo-tab-candidate"
                onClick={() => setFormData((f) => ({ ...f, type: "candidate" }))}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: formData.type === "candidate" ? C.navy : "transparent",
                  color: formData.type === "candidate" ? "#fff" : C.grey,
                  transition: "all 0.2s",
                }}
              >
                I&apos;m Looking for Work
              </button>
            </div>

            {/* Success message — always in DOM, shown by vanilla JS after submit */}
            <div
              id="bo-form-success"
              style={{
                display: "none",
                background: C.lightGrey,
                borderRadius: 16,
                padding: 48,
                textAlign: "center",
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <h3 style={{ color: C.navy, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Thanks — we&apos;ll be in touch shortly.</h3>
              <p style={{ color: C.grey, fontSize: 15 }}>Our team typically responds within a few hours during business hours.</p>
            </div>

            {/* Form — vanilla JS handles submission */}
            <form id="bo-contact-form" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.grey, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Name *</label>
                <input
                  id="bo-name"
                  type="text"
                  required
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.charcoal, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.grey, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Email *</label>
                <input
                  id="bo-email"
                  type="email"
                  required
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.charcoal, boxSizing: "border-box" }}
                />
              </div>
              {formData.type === "employer" && (
                <div id="bo-company-row">
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.grey, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Company</label>
                  <input
                    id="bo-company"
                    type="text"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.charcoal, boxSizing: "border-box" }}
                  />
                </div>
              )}
              <div>
                <label id="bo-msg-label" style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.grey, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                  {formData.type === "employer" ? "What roles are you looking to fill?" : "What type of work are you looking for?"}
                </label>
                <textarea
                  id="bo-message"
                  required
                  rows={4}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.charcoal, resize: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: C.orange,
                  color: "#fff",
                  padding: "16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Send Enquiry
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: C.navy, color: "#fff", padding: "64px 32px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 48, marginBottom: 48 }}>
            <div>
              <img src="/sites/bo-consultancy/logo.png" alt="BO Consultancy" style={{ height: 40, marginBottom: 16, filter: "brightness(0) invert(1)" }} />
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7 }}>
                Australia's specialist blue-collar workforce recruitment partner.
              </p>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Industries</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {INDUSTRIES.slice(0, 5).map((ind, i) => (
                  <a key={i} href="#industries" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none" }}>{ind.name}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Quick Links</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["About", "Services", "Why Us", "Testimonials", "Contact"].map((link, i) => (
                  <a key={i} href={`#${link.toLowerCase().replace(" ", "-")}`} style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none" }}>{link}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Contact</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="mailto:info@boconsulting.com.au" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none" }}>info@boconsulting.com.au</a>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              © 2026 BO Consulting. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: 24 }}>
              <a href="/privacy-policy" style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "none" }}>Privacy Policy</a>
              <a href="/terms" style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "none" }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
