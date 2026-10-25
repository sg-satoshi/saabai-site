import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import { NAP } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.privacy;

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. About this policy",
    body: `${NAP.name} (ABN ${NAP.abn}, ${NAP.addressLine}) ("we", "us") respects your privacy and handles personal information in line with the Australian Privacy Principles. This policy explains what we collect when you use saabai.ai or buy our services, and what we do with it.`,
  },
  {
    heading: "2. What we collect",
    body: "Information you give us, such as your name, email, phone number, business details and the answers you submit in our score quiz, Blueprint fact-find or contact forms. Payment details are handled by Stripe and we never see or store your full card number.",
  },
  {
    heading: "3. Cookies and source tracking",
    body: "We set a first-party cookie called sb_attr that lasts 90 days. It records the first and the most recent way you arrived at our site (for example a search, an ad or a campaign link) so we can see which marketing works. It is only used by Saabai and is never shared or sold. You can clear or block it in your browser settings at any time. We also use Google Analytics on saabai.ai to understand how visitors use the site (pages viewed, quiz starts, checkouts and bookings). Google Analytics sets its own cookies (such as _ga) and Google processes this data, which may be stored outside Australia. We don't send your name, email or payment details to Google Analytics. You can opt out with Google's browser add-on at tools.google.com/dlpage/gaoptout or by blocking cookies. Google Analytics is not used on the client websites we host for other businesses. On some pages of saabai.ai we also test different versions of a headline or button to see which works best. To do that we set a first-party cookie called sb_exp (up to 90 days) holding a random ID and the version you saw, and we count anonymous events such as a page view, a click on the main button or an enquiry. We do not store your name, email, phone number, IP address or any other details against it. This data is stored with our database provider, Supabase, in Tokyo, Japan. We don't run these tests if your browser sends a Global Privacy Control or Do Not Track signal, and you can opt out any time by visiting saabai.ai/?exp_off=1 or by blocking cookies.",
  },
  {
    heading: "4. Website scans",
    body: "If you use our free website check, we read the public pages of the website address you enter (the homepage, robots.txt, the sitemap, llms.txt and up to two contact or about pages) to score how ready it is for Google and AI search. We only read what any visitor can see, we do not log in to anything, and we do not collect personal information from the scanned site. We keep the scan result, the address you entered and the details you give us (such as your email, business name, industry and suburb) so we can show and email you your report, and so we can follow up if you have agreed. We use Cloudflare Turnstile to tell people from bots. It runs a short check in your browser and Cloudflare processes that signal. Our scanner identifies itself as SaabaiScanner and respects robots.txt. If you own a site and do not want it scanned, email hello@saabai.ai.",
  },
  {
    heading: "5. How we use it",
    body: "To deliver the services you buy, reply to enquiries, send transactional messages such as receipts and delivery updates, and, if you have agreed, send marketing emails or SMS. Every marketing message includes a way to unsubscribe, or reply STOP for SMS.",
  },
  {
    heading: "6. Who we share it with",
    body: "Only the service providers that help us run Saabai, such as hosting, payments, analytics (Google Analytics), email and SMS delivery, and only as needed to provide their service. We do not sell personal information.",
  },
  {
    heading: "7. Access, correction and complaints",
    body: `You can ask to see or correct the information we hold about you, or raise a privacy concern, by emailing ${NAP.email} or writing to ${NAP.name}, ${NAP.addressLine}. If you are not satisfied with our response you can contact the Office of the Australian Information Commissioner (oaic.gov.au).`,
  },
  {
    heading: "8. Overseas disclosure",
    body: "Voice demo audio is processed in real time by an overseas AI service provider, which may be located in the United States. We keep text transcripts only, not audio recordings, with the time and length of the chat for 30 days, and not your IP address (Australian Privacy Principle 8).",
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lede="Last updated: October 2026"
      sections={SECTIONS}
    />
  );
}
