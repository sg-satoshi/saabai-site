import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import { NAP } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.terms;

const SECTIONS: { heading: string; body: string }[] = [
  { heading: "1. Who we are", body: `These terms apply to services supplied by ${NAP.name} (ABN ${NAP.abn}, ${NAP.addressLine}), a sole trader business operated by Shane Goldberg. Contact: ${NAP.email}.` },
  { heading: "2. Our services", body: "We provide website building, hosting and care plans, and the Saabai Blueprint AI audit. What is included in each is described on the relevant page of saabai.ai at the time you buy, or in a written quote we send you." },
  { heading: "3. Prices and payment", body: "Prices are in Australian dollars. Saabai is not registered for GST, so GST is not applicable and invoices are not tax invoices. If this changes we will update our prices and invoices. Payments are processed securely by Stripe. Care plans are billed monthly in advance until cancelled. Where a price is shown as 'from', it only goes above that figure for custom integrations or other additional work, and we quote that in writing before any work starts. Saabai Blueprint credit: if you book a build within 30 days of your Blueprint being delivered, the full Blueprint fee is taken off that build. Credit applies to implementation costs only, not care plans or monthly fees. Any unused credit expires after 30 days." },
  { heading: "4. Cancellation", body: "You can cancel a care plan at any time by emailing hello@saabai.ai. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it." },
  { heading: "5. Refunds and Australian Consumer Law", body: "If work on a service has not begun, we will refund you in full on request. Once work has begun, we do not give change-of-mind refunds. Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms limits those rights. If something is not right, email us and we will work with you to fix it." },
  { heading: "6. Your content", body: "You own the content, logos and photos you give us. You confirm you have the right to use them and give us permission to use them to deliver the service." },
  { heading: "7. Liability", body: "To the extent the law allows, our liability is limited to resupplying the service or refunding the amount paid for it. We do not guarantee particular search rankings, traffic or sales results." },
  { heading: "8. Privacy", body: "How we handle personal information is explained in our Privacy Policy at saabai.ai/privacy." },
  { heading: "9. Governing law", body: "These terms are governed by the laws of Queensland, Australia." },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms"
      lede="General terms. Last updated: October 2026"
      sections={SECTIONS}
      links={[
        { href: "/contact", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
      ]}
    />
  );
}
