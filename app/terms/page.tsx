import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import { NAP } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import { CARE_PLAN_CANCELLATION } from "@/lib/care-faqs";
import BreadcrumbLd from "../components/BreadcrumbLd";
import { LEX_TERMS, LEX_TERMS_SUMMARY } from "@/lib/lex-terms";

export const metadata: Metadata = publicPageMeta.terms;

const SECTIONS: { heading: string; body: string; id?: string }[] = [
  { heading: "1. Who we are", body: `These terms apply to services supplied by ${NAP.name} (ABN ${NAP.abn}, ${NAP.addressLine}), a sole trader business operated by Shane Goldberg. Contact: ${NAP.email}.` },
  { heading: "2. Our services", body: "We provide website building, hosting and care plans, and the Saabai Blueprint AI audit. What is included in each is described on the relevant page of saabai.ai at the time you buy, or in a written quote we send you." },
  { heading: "3. Prices and payment", body: "Prices are in Australian dollars. Saabai is not registered for GST, so GST is not applicable and invoices are not tax invoices. If this changes we will update our prices and invoices. Payments are processed securely by Stripe. Care plans are billed monthly in advance until cancelled." },
  { heading: "4. Cancellation", body: CARE_PLAN_CANCELLATION },
  { heading: "5. Refunds and Australian Consumer Law", body: "Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms limits those rights. If something is not right, email us and we will work with you to fix it." },
  { heading: "6. Your content", body: "You own the content, logos and photos you give us. You confirm you have the right to use them and give us permission to use them to deliver the service." },
  { heading: "7. Liability", body: "To the extent the law allows, our liability is limited to resupplying the service or refunding the amount paid for it. We do not guarantee particular search rankings, traffic or sales results." },
  { heading: "8. Privacy", body: "How we handle personal information is explained in our Privacy Policy at saabai.ai/privacy." },
  { heading: "9. Governing law", body: "These terms are governed by the laws of Queensland, Australia." },
  // Lex subscription terms. Approved by Shane 30 Oct 2026 (issue #388); source: Sales & Marketing lex-terms-draft v2.
  { id: "lex", heading: "10. Lex subscriptions", body: LEX_TERMS_SUMMARY },
  ...LEX_TERMS.map((t, i) => ({ heading: `10.${i + 1} ${t.heading}`, body: t.body })),
];

export default function TermsPage() {
  return (
    <>
    <BreadcrumbLd name="Terms" path="/terms" />
    <LegalDocument
      title="Terms"
      lede="General terms. Last updated: October 2026"
      sections={SECTIONS}
      links={[
        { href: "/contact", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
      ]}
    />
    </>
  );
}
