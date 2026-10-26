/**
 * Shared answers for /faq and /websites.
 * Prices, delivery times and the cancellation sentence are copied from pages
 * already on the site. Sentences that are a business decision, or that infer
 * a fact the privacy policy does not state outright, are listed in
 * SHANE_CONFIRM so the PR can quote them before merge.
 */

export const CARE_PLAN_CANCELLATION =
  "You can cancel a care plan at any time by emailing hello@saabai.ai. Cancellation takes effect at the end of the period you have already paid for, and we do not give part-month refunds unless the law requires it.";

/** Verbatim sentences Shane needs to approve or rewrite before this ships. */
export const SHANE_CONFIRM = [
  "A website does not have one published build time.",
  "The timing is in the written quote we send you.",
  "While a care plan is active, we host the site.",
  "If you cancel, the site stays online until the end of the period you have already paid for.",
  "After that, hosting stops unless we have agreed something else in writing.",
  "A domain registered in your name stays yours.",
  "If Saabai registered the domain for you, email hello@saabai.ai and we will start a transfer.",
  "You then pay the registrar's renewal fee.",
  "A monthly cap on edits, pages or visits is not published.",
  "Work outside the list for your tier is quoted before we start.",
  "That Supabase project is the one the privacy policy describes as stored in Tokyo, Japan.",
  "The code does not name the Redis region.",
  "A separate monthly SEO retainer is not listed.",
] as const;

export const SEO_RETAINER_NOTE = "A separate monthly SEO retainer is not listed.";

export const CARE_PLAN_FAQS: { q: string; a: string }[] = [
  {
    q: "Can I cancel a care plan?",
    a: CARE_PLAN_CANCELLATION,
  },
  {
    q: "How long does a website take to build?",
    a: "A website does not have one published build time. The timing is in the written quote we send you. Simple automations can go live in one to two weeks. More complex multi-system workflows typically take four to six weeks from design to deployment. A Saabai Blueprint is delivered in 48 hours on Starter, 3 business days on Pro, or 2 to 3 weeks on Business.",
  },
  {
    q: "Who owns the website and domain if I cancel?",
    a: "You own the content, logos and photos you give us. While a care plan is active, we host the site. If you cancel, the site stays online until the end of the period you have already paid for. After that, hosting stops unless we have agreed something else in writing. A domain registered in your name stays yours. If Saabai registered the domain for you, email hello@saabai.ai and we will start a transfer. You then pay the registrar's renewal fee.",
  },
  {
    q: "What does a care plan include, and what are the limits?",
    a: "Presence, Growth and Signature include hosting, security, updates and a trained enquiry chatbot. Small changes are included. A monthly cap on edits, pages or visits is not published. Work outside the list for your tier is quoted before we start.",
  },
  {
    q: "Where is chatbot data stored, and which AI providers process it?",
    a: "Messages typed into a Saabai chatbot are sent to an external AI provider to write the reply. The code can send that message to Anthropic, OpenAI, Google, xAI or DeepSeek. The provider in use is chosen in the hosting configuration. A transcript is stored in Supabase, and a scheduled task deletes those chat logs after 90 days. That Supabase project is the one the privacy policy describes as stored in Tokyo, Japan. Some conversation records are also stored in Upstash Redis. The code does not name the Redis region. The site is hosted on Vercel, and the serverless functions are set to run in Sydney.",
  },
];
