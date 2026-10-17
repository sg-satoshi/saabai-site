"use client";
import { useEffect, useRef, useState } from "react";
import PoweredBySaabai from "@/app/components/PoweredBySaabai";
import { BOLogo } from "./BOLogo";

const ICONS: string[] = ["<path d=\"M6 42V10h22M6 16h22M28 10v8M22 18h12v6H22zM28 24v6M12 42V28h10v14\"/>", "<path d=\"M8 38l16-22 16 22zM4 42h40M24 16V8M18 12h12\"/>", "<path d=\"M24 16a8 8 0 100 16 8 8 0 000-16zM24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4\"/>", "<path d=\"M6 18l18-10 18 10v22H6zM6 18l18 10 18-10M24 28v12\"/>", "<path d=\"M4 14h26v20H4zM30 20h8l6 7v7H30zM12 38a4 4 0 100-.1M36 38a4 4 0 100-.1\"/>", "<path d=\"M14 42L20 6M34 42L28 6M24 10v6M24 22v6M24 34v6\"/>", "<path d=\"M10 38l16-16M30 8a8 8 0 00-8 10l-14 14 4 4 14-14A8 8 0 0040 18l-6 2-4-4z\"/>", "<path d=\"M6 14h36v8H6zM6 26h36v8H6zM12 14v8M20 14v8M12 26v8M20 26v8\"/>"];

const INDUSTRIES = [
  { name: "Construction", desc: "Commercial, residential and civil construction across Australia." },
  { name: "Mining", desc: "Surface and underground operations, maintenance and processing." },
  { name: "Manufacturing", desc: "Production, assembly, quality control and plant operations." },
  { name: "Warehousing", desc: "Distribution centres, pick & pack, inventory and logistics." },
  { name: "Transport", desc: "Heavy vehicle, freight, last-mile delivery and owner-operators." },
  { name: "Civil", desc: "Roads, utilities, earthworks and infrastructure projects." },
  { name: "Trades", desc: "Electrical, plumbing, HVAC, carpentry and specialist trades." },
  { name: "Logistics", desc: "Supply chain, dispatch, container handling and 3PL operations." },
];

const SERVICES = [
  { title: "Permanent Recruitment", desc: "End-to-end placement of full-time workers who fit your culture and pass our rigorous skills screening." },
  { title: "Labour Hire", desc: "Flexible workforce solutions. Scale up or down with pre-screened, safety-inducted workers ready to start." },
  { title: "Executive Search", desc: "Confidential search for senior operational leaders, site managers and department heads." },
  { title: "Volume Recruitment", desc: "High-volume hiring campaigns managed from brief to onboarding. Fast, compliant and cost-effective." },
  { title: "Workforce Planning", desc: "Strategic workforce consulting to match your labour needs with project timelines and budget." },
  { title: "Recruitment Process Outsourcing", desc: "We embed into your business as your dedicated recruitment function. Same team, lower cost." },
];

const PROCESS = [
  { n: "01", title: "Brief Us", desc: "Tell us what you need: the role, the site, the timeline. One call or email is all it takes." },
  { n: "02", title: "We Source", desc: "Our consultants tap their networks and databases to find pre-screened, reference-checked candidates fast." },
  { n: "03", title: "You Hire", desc: "Review our shortlist, interview your picks, and onboard with our support every step of the way." },
];

const NAV = [
  ["About", "#about"],
  ["Industries", "#industries"],
  ["Services", "#services"],
  ["How It Works", "#how-it-works"],
  ["Contact", "#contact"],
];

const EMAIL = "info@boconsulting.com.au";
type Kind = "employer" | "candidate";

async function submitEnquiry(payload: { name: string; email: string; company: string; message: string; formType: Kind }) {
  const r = await fetch("/api/bo-contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("failed");
}

export default function BOConsultingPage() {
  const [kind, setKind] = useState<Kind>("employer");
  const [menu, setMenu] = useState(false);
  const [fixedNav, setFixedNav] = useState(false);
  const [hideSticky, setHideSticky] = useState(false);
  const briefRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Brief card state
  const [b, setB] = useState({ name: "", email: "", role: "", site: "", timeline: "" });
  const [bState, setBState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  // Contact form state
  const [c, setC] = useState({ name: "", email: "", company: "", message: "" });
  const [cState, setCState] = useState<"idle" | "sending" | "ok" | "err">("idle");

  useEffect(() => {
    document.documentElement.classList.add("bo-js");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("bo-visible")),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    const onScroll = () => setFixedNav(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Hide the sticky bar while a form is in view to avoid duplicate CTAs
    const forms = [briefRef.current, contactRef.current].filter(Boolean) as Element[];
    const visible = new Set<Element>();
    const fo = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setHideSticky(visible.size > 0);
    }, { threshold: 0.25 });
    forms.forEach((f) => fo.observe(f));
    return () => { io.disconnect(); fo.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const goHiring = () => {
    setMenu(false);
    setKind("employer");
    const el = window.innerWidth >= 900 ? briefRef.current : contactRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const goWork = () => {
    setMenu(false);
    setKind("candidate");
    contactRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  async function sendBrief(e: React.FormEvent) {
    e.preventDefault();
    if (bState === "sending") return;
    setBState("sending");
    const message = `Role needed: ${b.role}\nSite or location: ${b.site || "Not given"}\nTimeline: ${b.timeline || "Not given"}\n(Sent from the homepage brief card)`;
    try {
      await submitEnquiry({ name: b.name.trim(), email: b.email.trim(), company: "", message, formType: "employer" });
      setBState("ok");
    } catch { setBState("err"); }
  }

  async function sendContact(e: React.FormEvent) {
    e.preventDefault();
    if (cState === "sending") return;
    setCState("sending");
    try {
      await submitEnquiry({ name: c.name.trim(), email: c.email.trim(), company: c.company.trim(), message: c.message.trim(), formType: kind });
      setCState("ok");
    } catch { setCState("err"); }
  }

  return (
    <main className="bo-root">
      <a href="#about" className="bo-sr">Skip to content</a>

      {/* Nav */}
      <header className={`bo-nav${fixedNav ? " bo-fixed" : ""}`}>
        <a href="#top" aria-label="BO Consulting home"><BOLogo /></a>
        <nav className="bo-links" aria-label="Main">
          {NAV.map(([l, h]) => <a key={l} href={h}>{l}</a>)}
        </nav>
        <a href="#brief" className="bo-cta" onClick={(e) => { e.preventDefault(); goHiring(); }}>Find Staff</a>
        <button className="bo-burger" aria-label="Toggle menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <i /><i /><i />
        </button>
      </header>
      <div className={`bo-menu${menu ? " bo-open" : ""}`}>
        {NAV.map(([l, h]) => <a key={l} href={h} onClick={() => setMenu(false)}>{l}</a>)}
        <a href="#contact" className="bo-cta" onClick={(e) => { e.preventDefault(); goHiring(); }}>Find Staff</a>
      </div>

      {/* Hero */}
      <section id="top" className="bo-hero">
        <img
          className="bo-hero-img"
          src="/sites/bo-consultancy/hero-site-1600.webp"
          srcSet="/sites/bo-consultancy/hero-site-900.webp 900w, /sites/bo-consultancy/hero-site-1600.webp 1600w"
          sizes="100vw"
          width={1600}
          height={899}
          alt="Construction workers in hi-vis vests on a building site at dusk with cranes behind them"
          fetchPriority="high"
        />
        <div className="bo-hero-shade" />
        <div className="bo-hb">
          <div>
            <span className="bo-tag">Australia&apos;s Workforce Specialists</span>
            <h1 className="bo-h1">Connecting Australia&apos;s <span>Workforce.</span></h1>
            <p className="bo-lead">Helping Australian businesses find reliable, skilled workers faster. Blue-collar recruitment done right.</p>
            <div className="bo-doors">
              <button className="bo-door bo-d1" onClick={goHiring}><span>I&apos;m Hiring<small>Brief us on the role</small></span><span aria-hidden>→</span></button>
              <button className="bo-door bo-d2" onClick={goWork}><span>I&apos;m Looking for Work<small>Tell us what you do</small></span><span aria-hidden>→</span></button>
            </div>
          </div>
          <div className="bo-brief" id="brief" ref={briefRef}>
            {bState === "ok" ? (
              <div className="bo-ok" role="status"><h3>Thanks, we&apos;ll be in touch shortly.</h3><p>Our team typically responds within a few hours during business hours.</p></div>
            ) : (
              <form onSubmit={sendBrief}>
                <h2>Brief us in one call</h2>
                <p className="bo-sub">Tell us the role and we will come back to you.</p>
                <label className="bo-field"><span>Your name</span><input required autoComplete="name" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></label>
                <label className="bo-field"><span>Email</span><input required type="email" autoComplete="email" value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} /></label>
                <label className="bo-field"><span>Role needed</span>
                  <select required value={b.role} onChange={(e) => setB({ ...b, role: e.target.value })}>
                    <option value="">Select an industry</option>
                    {INDUSTRIES.map((i) => <option key={i.name}>{i.name}</option>)}
                    <option>Other</option>
                  </select>
                </label>
                <label className="bo-field"><span>Site or location</span><input autoComplete="off" value={b.site} onChange={(e) => setB({ ...b, site: e.target.value })} /></label>
                <label className="bo-field"><span>Timeline</span>
                  <select value={b.timeline} onChange={(e) => setB({ ...b, timeline: e.target.value })}>
                    <option value="">Select a timeline</option>
                    <option>As soon as possible</option><option>Within 2 weeks</option><option>Within a month</option><option>Planning ahead</option>
                  </select>
                </label>
                {bState === "err" && <p className="bo-err" role="alert">Something went wrong. Please try again or email {EMAIL}.</p>}
                <button className="bo-go" disabled={bState === "sending"}>{bState === "sending" ? "Sending…" : "Send Enquiry"}</button>
                <p className="bo-mail">Or email <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Facts strip (only facts already on the site) */}
      <div className="bo-strip">
        <div><b>Australia Wide</b><span>National coverage</span></div>
        <div><b>6</b><span>Recruitment services</span></div>
        <div><b>8</b><span>Industries served</span></div>
        <div><b>Mon to Fri</b><span>9am to 5pm AEST</span></div>
      </div>

      {/* About */}
      <section id="about" className="bo-sec" data-reveal>
        <div className="bo-eyebrow">About BO Consulting</div>
        <h2>We don&apos;t just fill roles. We build workforces.</h2>
        <div className="bo-about">
          <p>BO Consulting was built on a simple belief: Australian businesses deserve a recruitment partner that truly understands blue-collar work. Not just the roles, but the sites, the culture, the safety requirements and the pressure of project deadlines.</p>
          <p>Our consultants have worked in the industries they recruit for. That means faster shortlists, better candidate fit and fewer surprises on site.</p>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="bo-sec" data-reveal>
        <div className="bo-eyebrow">Industries We Serve</div>
        <h2>Specialists across every blue-collar sector.</h2>
        <p className="bo-intro">Deep industry knowledge that means better candidate matching and faster placements.</p>
        <div className="bo-led">
          {INDUSTRIES.map((i, idx) => (
            <div className="bo-lr" key={i.name}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[idx] }} />
              <div><b>{i.name}</b><span>{i.desc}</span></div>
              <i aria-hidden>→</i>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bo-sec" data-reveal>
        <div className="bo-eyebrow">What We Do</div>
        <h2>The right service for every workforce need.</h2>
        <div className="bo-sv">
          <div className="bo-svimg">
            <img src="/sites/bo-consultancy/services-warehouse.webp" width={1000} height={667} loading="lazy" decoding="async" alt="Two workers in hi-vis vests walking through a large warehouse with tall shelving and sunlight through the roof" />
          </div>
          <div>
            {SERVICES.map((s, i) => (
              <div className="bo-r" key={s.title}>
                <em>{String(i + 1).padStart(2, "0")}</em>
                <div><b>{s.title}</b><span>{s.desc}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bo-sec" data-reveal>
        <div className="bo-eyebrow">How It Works</div>
        <h2>Hired in three steps.</h2>
        <p className="bo-intro">Simple, fast, no lock-in contracts. We work at the speed your business demands.</p>
        <div className="bo-route">
          {PROCESS.map((p) => (
            <div className="bo-rs" key={p.n}><div className="bo-n">{p.n}</div><b>{p.title}</b><span>{p.desc}</span></div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bo-sec" data-reveal>
        <div className="bo-contact">
          <div>
            <div className="bo-eyebrow">Get in Touch</div>
            <h2>Let&apos;s find the right people for your business.</h2>
            <p className="bo-intro">Whether you&apos;re an employer looking for skilled workers or a candidate looking for your next opportunity, we want to hear from you.</p>
            <div className="bo-facts">
              <div><small>Email</small><a href={`mailto:${EMAIL}`}>{EMAIL}</a></div>
              <div><small>Operating Hours</small><b>Mon to Fri: 9am to 5pm AEST</b></div>
              <div><small>Coverage</small><b>All states and territories, Australia</b></div>
            </div>
          </div>
          <div className="bo-card" ref={contactRef}>
            <div className="bo-tabs" role="group" aria-label="Enquiry type">
              <button type="button" aria-pressed={kind === "employer"} onClick={() => setKind("employer")}>I&apos;m Hiring</button>
              <button type="button" aria-pressed={kind === "candidate"} onClick={() => setKind("candidate")}>I&apos;m Looking for Work</button>
            </div>
            {cState === "ok" ? (
              <div className="bo-ok" role="status"><h3>Thanks, we&apos;ll be in touch shortly.</h3><p>Our team typically responds within a few hours during business hours.</p></div>
            ) : (
              <form onSubmit={sendContact}>
                <label className="bo-field"><span>Name *</span><input required autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></label>
                <label className="bo-field"><span>Email *</span><input required type="email" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></label>
                {kind === "employer" && (
                  <label className="bo-field"><span>Company</span><input autoComplete="organization" value={c.company} onChange={(e) => setC({ ...c, company: e.target.value })} /></label>
                )}
                <label className="bo-field"><span>{kind === "employer" ? "What roles are you looking to fill? *" : "What type of work are you looking for? *"}</span>
                  <textarea required value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} />
                </label>
                {cState === "err" && <p className="bo-err" role="alert">Something went wrong. Please try again or email {EMAIL}.</p>}
                <button className="bo-go" disabled={cState === "sending"}>{cState === "sending" ? "Sending…" : "Send Enquiry"}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bo-band">
        <div><h2>Ready to build your workforce?</h2><p>Tell us the role and we will take it from there.</p></div>
        <a href="#contact" className="bo-btn" onClick={(e) => { e.preventDefault(); goHiring(); }}>Contact Us Today</a>
      </section>

      {/* Footer */}
      <footer className="bo-footer">
        <div className="bo-fg">
          <div>
            <a href="#top" className="bo-fl" aria-label="BO Consulting home"><BOLogo /></a>
            <p>Australia&apos;s specialist blue-collar workforce recruitment partner.</p>
          </div>
          <div>
            <h4>Industries</h4>
            {INDUSTRIES.slice(0, 5).map((i) => <a key={i.name} href="#industries">{i.name}</a>)}
          </div>
          <div>
            <h4>Quick Links</h4>
            {NAV.map(([l, h]) => <a key={l} href={h}>{l}</a>)}
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <p>Mon to Fri: 9am to 5pm AEST</p>
          </div>
        </div>
        <div className="bo-copy">
          <span>&copy; 2026 BO Consulting. All rights reserved. &nbsp;·&nbsp; <PoweredBySaabai site="boconsulting" /></span>
          <span><a href="/sites/bo-consultancy/privacy-policy">Privacy Policy</a><a href="/sites/bo-consultancy/terms">Terms</a></span>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className={`bo-sticky${hideSticky ? " bo-hide" : ""}`}>
        <button className="bo-s1" onClick={goHiring}>Find Staff</button>
        <button className="bo-s2" onClick={goWork}>Looking for Work</button>
      </div>
    </main>
  );
}
