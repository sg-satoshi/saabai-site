import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import { NAP } from "@/lib/seo-entity";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.privacy;

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. About this policy",
    body: `${NAP.name} (ABN ${NAP.abn}, ${NAP.addressLine}) ("we", "us") is a sole trader business operated by Shane Goldberg. This policy explains what we collect when you use saabai.ai or buy our services, and what we do with it.`,
  },
  {
    heading: "2. What we collect",
    body: "Information you give us, such as your name, email, phone number, business details and the answers you submit in our score quiz, Blueprint fact-find or contact forms. Payment details are handled by Stripe and we never see or store your full card number. If you use a chatbot we run, we also keep a transcript of what you type and the reply. We use that transcript to provide the chat, to handle an enquiry you start, and to check that the bot is working. A scheduled task deletes those chat logs after 90 days. Chat transcripts are stored with our database provider Supabase in Tokyo, Japan. Chat IP addresses are kept briefly in Upstash Redis for abuse protection. A short-window record expires after 11 minutes, and a daily record expires after 26 hours. If you join our email list, we keep your name, email, industry, IP address and an approximate location (looked up with a third-party IP location service) until you unsubscribe or ask us to delete it. Your IP address is also included in the notification email we receive.",
  },
  {
    heading: "3. Cookies and source tracking",
    body: "We set a first-party cookie called sb_attr that lasts 90 days. It records the first and the most recent way you arrived at our site (for example a search, an ad or a campaign link) so we can see which marketing works. It is only used by Saabai and is never shared or sold. You can clear or block it in your browser settings at any time. We also use Google Analytics on saabai.ai to understand how visitors use the site (pages viewed, quiz starts, checkouts and bookings). Google Analytics sets its own cookies (such as _ga) and Google processes this data, which may be stored outside Australia. We don't send your name, email or payment details to Google Analytics. You can opt out with Google's browser add-on at tools.google.com/dlpage/gaoptout or by blocking cookies. Google Analytics is not used on the client websites we host for other businesses. On some pages of saabai.ai we also test different versions of a headline or button to see which works best. To do that we set a first-party cookie called sb_exp (up to 90 days) holding a random ID and the version you saw, and we count anonymous events such as a page view, a click on the main button or an enquiry. We do not store your name, email, phone number, IP address or any other details against it. This data is stored with our database provider, Supabase, in Tokyo, Japan. We don't run these tests if your browser sends a Global Privacy Control or Do Not Track signal, and you can opt out any time by visiting saabai.ai/?exp_off=1 or by blocking cookies. We use the Meta pixel and the Meta Conversions API (Facebook and Instagram) on saabai.ai for analytics and advertising. They record which pages you view, and events such as viewing a pricing or demo page, giving us your contact details, booking a call, clicking a phone number, starting the Lachie voice demo, or paying for a Blueprint or a website. The pixel runs in your browser. The Conversions API sends the same events from our server, with a shared event id, so Meta can count them once. If you give us an email address or phone number, including in the enquiry form or by typing it into the Lex chat or Lachie voice demo, we convert it with SHA-256 before Meta receives it. We also send the page address, that event id, a payment amount in Australian dollars, your browser type, your IP address, and the Meta cookies _fbp and _fbc when your browser has them. We do not send your card number to Meta or to Google. These tools are not used on the client websites we host, and they do not load in the client portal or on admin pages. To opt out of Meta measurement, use your Facebook or Instagram ad settings at facebook.com/settings?tab=ads, or block cookies and scripts from facebook.com and connect.facebook.net.",
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
    body: "Only the service providers that help us run Saabai, such as hosting, payments, analytics and advertising (Google Analytics, and Meta for Facebook and Instagram), email and SMS delivery, and only as needed to provide their service. We do not sell personal information. Our chatbots use AI providers to write replies: Anthropic, OpenAI, Google, xAI and DeepSeek. Some chats on saabai.ai are sent to DeepSeek, which processes them in China. Anthropic, OpenAI, Google and xAI may process messages outside Australia, including in the United States. The custom sales agent Rex uses Anthropic.",
  },
  {
    heading: "7. Access, correction and complaints",
    body: `You can ask to see or correct the information we hold about you, or raise a privacy concern, by emailing ${NAP.email} or writing to ${NAP.name}, ${NAP.addressLine}. If you are not satisfied with our response you can contact the Office of the Australian Information Commissioner (oaic.gov.au).`,
  },
  {
    heading: "8. Overseas disclosure",
    body: "Voice demo audio is processed in real time by xAI, which may be located in the United States. We keep text transcripts only, not audio recordings, with the time and length of the chat for 30 days, and not your IP address. Chat transcripts are stored with Supabase in Tokyo, Japan. Chat messages may be sent to the AI providers named above. DeepSeek processes some chats in China. The others may process messages in the United States or elsewhere overseas. You can choose not to use the chat or the voice demo. We do not claim that chat data stays in Australia. Our host Vercel keeps standard server logs, including the request path, status code and IP address. Google and Meta may process the analytics and advertising information described above outside Australia, including in the United States.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbLd name="Privacy" path="/privacy" />
      <LegalDocument
        title="Privacy Policy"
        lede="Last updated: 27 October 2026"
        sections={SECTIONS}
      />
    </>
  );
}
