import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | BO Consulting",
  description: "BO Consulting's privacy policy — how we collect, use and protect your personal information.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.boconsulting.com.au/privacy-policy" },
};

export default function PrivacyPolicy() {
  const NAVY = "#123B5D";
  const ORANGE = "#F58220";

  return (
    <main style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1A2B3C", minHeight: "100vh", background: "#fff" }}>
      {/* Nav */}
      <nav style={{ background: NAVY, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
            <img src="/sites/bo-consultancy/logo.png" alt="BO Consultancy" style={{ height: 32, width: "auto", display: "block" }} />
          </div>
        </a>
        <a href="/" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textDecoration: "none" }}>← Back to Home</a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#5C6670", fontSize: 14, marginBottom: 48 }}>Last updated: January 2025</p>

        {[
          {
            heading: "1. About This Policy",
            body: "BO Consulting Pty Ltd (\"BO Consulting\", \"we\", \"us\" or \"our\") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose and protect personal information when you interact with our website (boconsulting.com.au) or engage our recruitment and labour hire services.",
          },
          {
            heading: "2. Information We Collect",
            body: "We collect personal information including your name, contact details (email address, phone number), resume and employment history, professional qualifications, references, and any other information you provide when registering as a candidate or engaging us as an employer. We may also collect information about how you use our website through cookies and analytics tools.",
          },
          {
            heading: "3. How We Use Your Information",
            body: "We use your personal information to match candidates with suitable employment opportunities, provide recruitment and labour hire services to employer clients, communicate with you about job opportunities or placements, process enquiries submitted through our website, comply with legal obligations including workplace health and safety requirements, and improve our services and website.",
          },
          {
            heading: "4. Disclosure of Your Information",
            body: "We may share your personal information with employer clients for the purpose of recruitment, labour hire providers and contractors engaged by us, background check and verification service providers, and government or regulatory bodies where required by law. We do not sell your personal information to third parties.",
          },
          {
            heading: "5. Data Security",
            body: "We take reasonable steps to protect your personal information from misuse, interference, loss, unauthorised access, modification or disclosure. However, no data transmission over the internet is completely secure and we cannot guarantee the security of information transmitted to us online.",
          },
          {
            heading: "6. Data Retention",
            body: "We retain your personal information for as long as necessary to provide our services and comply with our legal obligations. Candidate profiles are typically retained for up to 7 years unless you request earlier deletion.",
          },
          {
            heading: "7. Your Rights",
            body: "You have the right to access, correct or request deletion of your personal information held by us. To make a request, contact us at info@boconsulting.com.au. We will respond within a reasonable timeframe, typically within 30 days.",
          },
          {
            heading: "8. Cookies",
            body: "Our website uses cookies to improve your experience and analyse website traffic. You can control cookies through your browser settings. Disabling cookies may affect some website functionality.",
          },
          {
            heading: "9. Changes to This Policy",
            body: "We may update this Privacy Policy from time to time. The updated version will be posted on this page with the revised date. We encourage you to review this policy periodically.",
          },
          {
            heading: "10. Contact Us",
            body: "If you have any questions about this Privacy Policy or how we handle your personal information, please contact us at: info@boconsulting.com.au",
          },
        ].map((section, i) => (
          <section key={i} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 12, borderLeft: `3px solid ${ORANGE}`, paddingLeft: 12 }}>
              {section.heading}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>{section.body}</p>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ background: NAVY, padding: "24px 32px", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          © 2026 BO Consulting. All rights reserved. &nbsp;·&nbsp;
          <a href="/privacy-policy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Terms of Service</a>
        </p>
      </footer>
    </main>
  );
}
