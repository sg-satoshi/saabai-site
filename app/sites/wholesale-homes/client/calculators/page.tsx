"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { Calculator, TrendingUp, DollarSign, Home, ArrowRight } from "lucide-react";
import { UI, FONT_DISPLAY } from "../_ui/primitives";
import { PageWrap, Masthead, Card } from "../_ui/tearsheet";

const CALCULATORS = [
  {
    slug: "investment-analyzer",
    label: "Property investment analyzer",
    desc: "Complete financial analysis — repayments, cash flow, yields, ROI projections and equity growth over 30 years.",
    icon: Calculator,
    featured: true,
  },
  {
    slug: "dual-income-yield",
    label: "Dual income yield",
    desc: "Net rental yield on dual-occupancy packages — main house plus granny flat income streams.",
    icon: TrendingUp,
  },
  {
    slug: "stamp-duty",
    label: "Stamp duty",
    desc: "Transfer duty across every Australian state, compared side by side on your purchase price.",
    icon: DollarSign,
  },
  {
    slug: "borrowing-power",
    label: "Borrowing power",
    desc: "How much you may be able to borrow, stress-tested at the APRA +3% buffer.",
    icon: Home,
  },
];

export default function CalculatorsHub() {
  const featured = CALCULATORS.find(c => c.featured)!;
  const rest = CALCULATORS.filter(c => !c.featured);

  return (
    <ClientPortalShell>
      <PageWrap>
        <Masthead label="Wholesale Homes — Calculators" />

        <div className="wh-rise" style={{ animationDelay: "60ms", position: "relative", overflow: "hidden", borderRadius: 28, background: UI.heroInk, color: "#e8efe9", padding: "clamp(28px,4vw,44px)", margin: "18px 0 22px" }}>
          <div aria-hidden style={{ position: "absolute", top: -140, right: -70, width: 460, height: 460, background: "radial-gradient(circle, rgba(8,145,178,0.38), rgba(8,145,178,0) 66%)", pointerEvents: "none" }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(103,197,214,0.85)" }}>Run the numbers</span>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "12px 0 0", maxWidth: 640 }}>
            Four tools. One complete picture of every deal.
          </h1>
          <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "rgba(232,239,233,0.68)", maxWidth: 520 }}>
            Adjust any assumption and watch cash flow, yield and equity recalculate instantly.
          </p>
        </div>

        {/* Featured */}
        <Link href={`/client/calculators/${featured.slug}`} className="wh-rise" style={{ animationDelay: "120ms", display: "block", textDecoration: "none", marginBottom: 20 }}>
          <Card className="group" style={{ display: "flex", alignItems: "center", gap: 22, transition: "transform .18s, box-shadow .18s" }}>
            <div style={{ display: "flex", height: 56, width: 56, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 16, background: `${UI.teal}14`, color: UI.teal }}>
              <featured.icon style={{ height: 26, width: 26 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: UI.teal }}>Featured</span>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 500, color: UI.ink, margin: "3px 0 0", letterSpacing: "-0.01em" }}>{featured.label}</h3>
              <p style={{ fontSize: 13, color: UI.faintInk, marginTop: 4, maxWidth: 620 }}>{featured.desc}</p>
            </div>
            <ArrowRight className="transition-transform group-hover:translate-x-1" style={{ height: 20, width: 20, color: UI.teal, flexShrink: 0 }} />
          </Card>
        </Link>

        {/* Rest */}
        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {rest.map((c) => (
            <Link key={c.slug} href={`/client/calculators/${c.slug}`} className="group" style={{ textDecoration: "none" }}>
              <Card style={{ height: "100%", transition: "transform .18s, box-shadow .18s" }}>
                <div style={{ display: "flex", height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: `${UI.teal}14`, color: UI.teal, marginBottom: 14 }}>
                  <c.icon style={{ height: 20, width: 20 }} />
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 500, color: UI.ink, letterSpacing: "-0.01em" }}>{c.label}</h3>
                <p style={{ fontSize: 12.5, color: UI.faintInk, marginTop: 6, lineHeight: 1.5 }}>{c.desc}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 12, fontWeight: 600, color: UI.teal }}>
                  Open calculator <ArrowRight className="transition-transform group-hover:translate-x-1" style={{ height: 13, width: 13 }} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </PageWrap>
    </ClientPortalShell>
  );
}
