"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { TrendingUp, FileText, Shield, DollarSign, Home, ArrowRight } from "lucide-react";
import { UI, FONT_DISPLAY } from "../_ui/primitives";
import { PageWrap, Masthead, Card } from "../_ui/tearsheet";

const RESOURCES = [
  {
    title: "First home buyer guide",
    desc: "The complete step-by-step guide to buying your first home, from deposit to settlement.",
    icon: FileText,
    href: "#",
    sections: ["Deposit strategies", "FHOG eligibility by state", "Stamp duty concessions"],
    featured: true,
  },
  {
    title: "Negative gearing explained",
    desc: "How negative gearing works, when it makes sense, and how to structure your investment for maximum tax efficiency.",
    icon: DollarSign,
    href: "#",
    sections: ["What is negative gearing", "Depreciation benefits", "Capital gains considerations"],
  },
  {
    title: "Dual income strategy guide",
    desc: "Why dual-occupancy properties are one of the strongest-performing investment strategies in Australia.",
    icon: TrendingUp,
    href: "#",
    sections: ["Yield vs single dwellings", "Granny flat rental demand", "Finance structuring"],
  },
  {
    title: "Investment structures",
    desc: "Individual, joint, trust, or company. Which structure is right for your property investment strategy.",
    icon: Shield,
    href: "#",
    sections: ["SMSF property investment", "Trust structures explained", "Asset protection basics"],
  },
  {
    title: "Deposit & finance guide",
    desc: "How much deposit you really need, LMI explained, and how lenders assess investment properties.",
    icon: Home,
    href: "#",
    sections: ["Minimum deposits by type", "LMI vs 80% LVR", "Pre-approval process"],
  },
];

export default function ResourcesHub() {
  const featured = RESOURCES.find(r => r.featured)!;
  const rest = RESOURCES.filter(r => !r.featured);

  return (
    <ClientPortalShell>
      <PageWrap>
        <Masthead label="Wholesale Homes — Resources" />

        <div className="wh-rise" style={{ animationDelay: "60ms", position: "relative", overflow: "hidden", borderRadius: 28, background: UI.heroInk, color: "#e8efe9", padding: "clamp(28px,4vw,44px)", margin: "18px 0 22px" }}>
          <div aria-hidden style={{ position: "absolute", top: -140, right: -70, width: 460, height: 460, background: "radial-gradient(circle, rgba(8,145,178,0.38), rgba(8,145,178,0) 66%)", pointerEvents: "none" }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(103,197,214,0.85)" }}>Learning centre</span>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "12px 0 0", maxWidth: 640 }}>
            Guides and strategy, before you sign anything.
          </h1>
          <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "rgba(232,239,233,0.68)", maxWidth: 520 }}>
            Everything we tell our clients before they commit to a purchase — deposits, structuring, tax and dual-income strategy.
          </p>
        </div>

        {/* Featured */}
        <Link href={featured.href} className="wh-rise" style={{ animationDelay: "120ms", display: "block", textDecoration: "none", marginBottom: 20 }}>
          <Card className="group" style={{ transition: "transform .18s, box-shadow .18s" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
              <div style={{ display: "flex", height: 56, width: 56, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 16, background: `${UI.teal}14`, color: UI.teal }}>
                <featured.icon style={{ height: 26, width: 26 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: UI.teal }}>Start here</span>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 500, color: UI.ink, margin: "3px 0 0", letterSpacing: "-0.01em" }}>{featured.title}</h3>
                <p style={{ fontSize: 13, color: UI.faintInk, marginTop: 4, maxWidth: 620 }}>{featured.desc}</p>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {featured.sections.map((s) => (
                    <span key={s} style={{ borderRadius: 999, background: UI.bone, padding: "5px 12px", fontSize: 11, fontWeight: 500, color: UI.faintInk }}>{s}</span>
                  ))}
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 12, fontWeight: 600, color: UI.teal }}>
                  Read guide <ArrowRight className="transition-transform group-hover:translate-x-1" style={{ height: 13, width: 13 }} />
                </span>
              </div>
            </div>
          </Card>
        </Link>

        {/* Rest */}
        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {rest.map((r) => (
            <Link key={r.title} href={r.href} className="group" style={{ textDecoration: "none" }}>
              <Card style={{ height: "100%", transition: "transform .18s, box-shadow .18s" }}>
                <div style={{ display: "flex", height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: `${UI.teal}14`, color: UI.teal, marginBottom: 14 }}>
                  <r.icon style={{ height: 20, width: 20 }} />
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 500, color: UI.ink, letterSpacing: "-0.01em" }}>{r.title}</h3>
                <p style={{ fontSize: 12.5, color: UI.faintInk, marginTop: 6, lineHeight: 1.5 }}>{r.desc}</p>
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {r.sections.map((s) => (
                    <span key={s} style={{ borderRadius: 999, background: UI.bone, padding: "4px 10px", fontSize: 10.5, fontWeight: 500, color: UI.faintInk }}>{s}</span>
                  ))}
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 12, fontWeight: 600, color: UI.teal }}>
                  Read guide <ArrowRight className="transition-transform group-hover:translate-x-1" style={{ height: 13, width: 13 }} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </PageWrap>
    </ClientPortalShell>
  );
}
