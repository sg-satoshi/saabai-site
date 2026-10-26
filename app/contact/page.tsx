import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import { NAP } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";
import "../components/sb/sb.css";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

export const metadata: Metadata = publicPageMeta.contact;

const ROWS: [string, string][] = [
  ["Email", NAP.email],
  ["Address", NAP.addressLine],
  ["ABN", NAP.abn],
  ["Service areas", "Gold Coast, Brisbane and Queensland, with clients Australia-wide online"],
  ["GST", "Not applicable"],
];

export default function ContactPage() {
  return (
    <div className="sb">
      <BreadcrumbLd name="Contact" path="/contact" />
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 760, paddingTop: 72, paddingBottom: 96 }}>
          <span className="eyebrow">Saabai</span>
          <h1 style={{ marginTop: 16 }}>Contact</h1>
          <p style={{ marginTop: 18, fontSize: 19, maxWidth: 640 }}>
            The best way to reach us is email. We reply within one business day.
          </p>

          <div className="card" style={{ marginTop: 32, display: "grid", gap: 22 }}>
            {ROWS.map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <p className="dim" style={{ fontSize: 13, marginBottom: 4 }}>{label}</p>
                {label === "Email" ? (
                  <a
                    href={`mailto:${NAP.email}`}
                    style={{ color: "var(--teal)", fontSize: 20, fontWeight: 600, textDecoration: "none", overflowWrap: "anywhere" }}
                  >
                    {value}
                  </a>
                ) : (
                  <p style={{ color: "#fff", fontSize: 17, overflowWrap: "break-word" }}>{value}</p>
                )}
              </div>
            ))}
          </div>

          <p className="dim" style={{ marginTop: 28, fontSize: 15 }}>
            Saabai is a home-based, online business. We do not operate a public shopfront, and visits are by appointment only.
          </p>

          <div style={{ marginTop: 28 }}>
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-h-[44px] text-sm font-semibold bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap max-w-full"
            >
              <span className="sm:hidden">Book a call</span>
              <span className="hidden sm:inline">Book a Free 30-Min Call</span>
            </a>
          </div>

          <p className="dim" style={{ marginTop: 28, fontSize: 14 }}>
            See our{" "}
            <a href="/privacy" style={{ color: "var(--teal)", textDecoration: "underline" }}>Privacy Policy</a>
            {" "}and{" "}
            <a href="/terms" style={{ color: "var(--teal)", textDecoration: "underline" }}>Terms</a>.
          </p>
        </div>
      </div>
      <SbFooter />
    </div>
  );
}
