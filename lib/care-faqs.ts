/**
 * Shared answers for /faq and /websites, including the FAQ JSON-LD on those pages.
 * Build time, cancellation, domain transfer and care-plan edits were confirmed
 * by Shane on 27 Oct 2026. CARE_PLAN_CANCELLATION is the terms sentence and
 * stays aligned with that cancellation decision.
 */

export const CARE_PLAN_CANCELLATION =
  "You can cancel a care plan at any time by emailing hello@saabai.ai. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it.";

export const SEO_RETAINER_NOTE = "A separate monthly SEO retainer is not listed.";

export const CARE_PLAN_FAQS: { q: string; a: string }[] = [
  {
    q: "Can I cancel a care plan?",
    a: CARE_PLAN_CANCELLATION,
  },
  {
    q: "How long does a website take to build?",
    a: "Basic websites take about 1 week, mid-tier websites about 2 weeks, and custom builds generally up to 4 weeks, depending on complexity. The timeline starts once we have your content and you have signed off on the design. Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment. A Starter Blueprint is delivered within 48 hours. Pro is 3 business days and Business is 2 to 3 weeks.",
  },
  {
    q: "Who owns the website and domain if I cancel?",
    a: "You own the content, logos and photos you give us. If you cancel your care plan, the site stays live until the end of the billing period you have already paid for, and hosting stops after that. A domain registered in your name stays yours. If Saabai registered it for you, email hello@saabai.ai and we transfer it to you free of charge. You then pay the registrar's renewal fees.",
  },
  {
    q: "What does a care plan include, and what are the limits?",
    a: "Presence, Growth and Signature include hosting, security, updates and a trained enquiry chatbot. Care plans include small edits on a fair-use basis. Work outside the list for your tier is quoted before we start.",
  },
  {
    q: "Where is chatbot data stored, and which AI providers process it?",
    a: "Messages typed into a Saabai chatbot are sent to an external AI provider to write the reply. The privacy policy names those providers, including one in China for one chat path. A transcript is stored, and a scheduled task deletes those chat logs after 90 days. The code does not name the region of that database. It is not the split-test store the privacy policy describes as being in Tokyo. Some conversation records are also stored with a separate cache provider. The code does not name that region. The site is hosted on Vercel, and the serverless functions run in Sydney. That does not mean chat data stays in Australia.",
  },
];
