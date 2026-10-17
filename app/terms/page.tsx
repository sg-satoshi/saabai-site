import type { Metadata } from "next";
import Nav from "../components/Nav";
import SbFooter from "../components/sb/SbFooter";
import "../components/sb/sb.css";

export const metadata: Metadata = {
  title: "Terms",
  description: "General terms for Saabai website care plans and the Saabai Blueprint.",
  alternates: { canonical: "https://www.saabai.ai/terms" },
};

const SECTIONS: { heading: string; body: string }[] = [
  { heading: "1. Who we are", body: "These terms apply to services supplied by Saabai (ABN 71 889 082 572, Merrimac QLD 4226, Australia), a sole trader business operated by Shane Goldberg. Contact: hello@saabai.ai." },
  { heading: "2. Our services", body: "We provide website building, hosting and care plans, and the Saabai Blueprint AI audit. What is included in each is described on the relevant page of saabai.ai at the time you buy, or in a written quote we send you." },
  { heading: "3. Prices and payment", body: "Prices are in Australian dollars. Saabai is not registered for GST, so GST is not applicable and invoices are not tax invoices. If this changes we will update our prices and invoices. Payments are processed securely by Stripe. Care plans are billed monthly in advance until cancelled." },
  { heading: "4. Cancellation", body: "You can cancel a care plan at any time by emailing hello@saabai.ai. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it." },
  { heading: "5. Refunds and Australian Consumer Law", body: "Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms limits those rights. If something is not right, email us and we will work with you to fix it." },
  { heading: "6. Your content", body: "You own the content, logos and photos you give us. You confirm you have the right to use them and give us permission to use them to deliver the service." },
  { heading: "7. Liability", body: "To the extent the law allows, our liability is limited to resupplying the service or refunding the amount paid for it. We do not guarantee particular search rankings, traffic or sales results." },
  { heading: "8. Privacy", body: "How we handle personal information is explained in our Privacy Policy at saabai.ai/privacy." },
  { heading: "9. Governing law", body: "These terms are governed by the laws of Queensland, Australia." },
];

export default function TermsPage() {
  return (
    <div className="sb">
      <Nav />
      <div aria-hidden="true" style={{ height: 92 }} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap" style={{ position: "relative", maxWidth: 760, paddingTop: 72, paddingBottom: 96 }}>
          <span className="eyebrow">Saabai</span>
          <h1 style={{ marginTop: 16 }}>Terms</h1>
          <p className="dim" style={{ marginTop: 14, fontSize: 15 }}>General terms. Last updated: October 2026</p>

          <div className="card" style={{ marginTop: 32, display: "grid", gap: 28 }}>
            {SECTIONS.map((s) => (
              <section key={s.heading} style={{ minWidth: 0 }}>
                <h3>{s.heading}</h3>
                <p style={{ marginTop: 8, overflowWrap: "break-word" }}>{s.body}</p>
              </section>
            ))}
          </div>

          <p className="dim" style={{ marginTop: 28, fontSize: 14 }}>
            Saabai, ABN 71 889 082 572, Merrimac QLD 4226, Australia.{" "}
            <a href="/contact" style={{ color: "var(--teal)", textDecoration: "underline" }}>Contact</a>
            {" · "}
            <a href="/privacy" style={{ color: "var(--teal)", textDecoration: "underline" }}>Privacy</a>
          </p>
        </div>
      </div>
      <SbFooter />
    </div>
  );
}
