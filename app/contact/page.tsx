import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to contact Saabai: email, business details and service area.",
  alternates: { canonical: "https://www.saabai.ai/contact" },
};

const ROWS: [string, string][] = [
  ["Business name", "Saabai"],
  ["Operated by", "Shane Goldberg, sole trader"],
  ["ABN", "71 889 082 572"],
  ["Address", "Merrimac QLD 4226, Australia"],
  ["Service area", "Gold Coast, Brisbane and Queensland, with clients Australia-wide online"],
  ["GST", "Not applicable"],
];

export default function ContactPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#14202b", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 20px 80px" }}>
        <a href="/" style={{ color: "#5c6670", fontSize: 14, textDecoration: "none" }}>← Back to Saabai</a>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "24px 0 8px" }}>Contact Saabai</h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
          The best way to reach us is email. We reply within one business day.
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 32 }}>
          <a href="mailto:hello@saabai.ai" style={{ color: "#0b6b64" }}>hello@saabai.ai</a>
        </p>
        <dl style={{ margin: 0 }}>
          {ROWS.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 16, padding: "12px 0", borderTop: "1px solid #e3e7eb" }}>
              <dt style={{ width: 160, flexShrink: 0, color: "#5c6670", fontSize: 15 }}>{k}</dt>
              <dd style={{ margin: 0, fontSize: 16 }}>{v}</dd>
            </div>
          ))}
        </dl>
        <p style={{ color: "#5c6670", fontSize: 14, marginTop: 40 }}>
          Saabai is a home-based, online business. We do not operate a public shopfront, and visits are by appointment only. See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>.
        </p>
      </div>
    </main>
  );
}
