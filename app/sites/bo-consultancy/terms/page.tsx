export default function TermsOfService() {
  const NAVY = "#123B5D";
  const ORANGE = "#F58220";

  return (
    <main style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1A2B3C", minHeight: "100vh" }}>
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
        <h1 style={{ fontSize: 36, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#5C6670", fontSize: 14, marginBottom: 48 }}>Last updated: January 2025</p>

        {[
          {
            heading: "1. Acceptance of Terms",
            body: "By accessing the BO Consulting website (boconsulting.com.au) or engaging our recruitment and labour hire services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website or services.",
          },
          {
            heading: "2. Our Services",
            body: "BO Consulting Pty Ltd provides recruitment, permanent placement, labour hire, and workforce solutions services across Australia. We act as an intermediary between employers seeking staff and candidates seeking employment. The availability, scope and pricing of our services may change from time to time.",
          },
          {
            heading: "3. Employer Obligations",
            body: "Employers engaging our services agree to provide accurate information about roles and working conditions, maintain a safe workplace in compliance with all applicable work health and safety laws, pay all invoices within agreed payment terms, and not directly engage or solicit candidates introduced by BO Consulting outside of our agreed terms without paying the applicable placement fee.",
          },
          {
            heading: "4. Candidate Obligations",
            body: "Candidates using our services agree to provide accurate and truthful information including qualifications, work history and references, notify us promptly of any changes to their availability or circumstances, attend interviews and placements as agreed, and behave professionally when attending client workplaces.",
          },
          {
            heading: "5. Fees and Payment",
            body: "Fees for recruitment and labour hire services are agreed separately with each client. Invoices are payable within the terms specified on each invoice. Late payments may attract interest. BO Consulting reserves the right to suspend services where payment obligations are not met.",
          },
          {
            heading: "6. Confidentiality",
            body: "Both parties agree to keep confidential any proprietary or sensitive information shared in the course of engaging our services. This includes candidate details provided to employers and employer requirements shared with us.",
          },
          {
            heading: "7. Limitation of Liability",
            body: "To the extent permitted by law, BO Consulting's liability for any claim arising from our services is limited to the fees paid for the specific service giving rise to the claim. We are not liable for indirect, consequential or special damages. Nothing in these terms limits liability for personal injury, fraud or any liability that cannot be excluded by law.",
          },
          {
            heading: "8. Intellectual Property",
            body: "All content on this website including text, images, logos and design is owned by or licensed to BO Consulting and is protected by Australian and international intellectual property laws. You may not reproduce or distribute this content without our written permission.",
          },
          {
            heading: "9. Website Use",
            body: "You agree not to use our website for any unlawful purpose, to transmit any harmful, offensive or disruptive content, or to attempt to gain unauthorised access to our systems. We reserve the right to restrict access to the website at any time.",
          },
          {
            heading: "10. Governing Law",
            body: "These Terms of Service are governed by the laws of Queensland, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Queensland.",
          },
          {
            heading: "11. Changes to These Terms",
            body: "We may update these Terms of Service from time to time. Continued use of our website or services after any changes constitutes acceptance of the updated terms.",
          },
          {
            heading: "12. Contact Us",
            body: "If you have any questions about these Terms of Service, please contact us at: info@boconsulting.com.au",
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
