import { pageMeta } from "./seo-meta";
import { NAP } from "./seo-entity";

/**
 * Public saabai.ai titles and descriptions.
 * Each title is used as-is (absolute). Each description is one or two sentences
 * and names the service plus a location where that fits the page.
 */
export const publicPageMeta = {
  home: pageMeta({
    path: "/",
    title: "Know exactly where AI will save your business hours | Saabai",
    description:
      "Custom AI chatbots and websites for Australian small businesses and law firms. Saabai is based in Merrimac on the Gold Coast, and the chatbot answers visitors and keeps a log of each chat.",
  }),
  contact: pageMeta({
    path: "/contact",
    title: "Contact Saabai | Gold Coast and Brisbane",
    description:
      `Email ${NAP.email} to reach Saabai in ${NAP.addressLine}. We usually reply within 1 business day and serve the Gold Coast, Brisbane, Queensland and clients across Australia.`,
  }),
  terms: pageMeta({
    path: "/terms",
    title: "Saabai Terms of Service | Gold Coast",
    description:
      `Terms for Saabai website care plans and the Blueprint AI audit. Saabai is based in ${NAP.addressLine}, and you can contact ${NAP.email}.`,
  }),
  privacy: pageMeta({
    path: "/privacy",
    title: "Saabai Privacy Policy | Gold Coast",
    description:
      `How Saabai in ${NAP.addressLine} collects and uses personal information. Email ${NAP.email} with a privacy question.`,
  }),
  about: pageMeta({
    path: "/about",
    title: "About Saabai | Gold Coast AI Business",
    description:
      "Saabai is a Gold Coast AI business for Australian small businesses, founded by Shane Goldberg. Website care plans start from $100 a month and the Blueprint AI audit from $497.",
  }),
  faq: pageMeta({
    path: "/faq",
    title: "Saabai FAQ | Websites and AI, Gold Coast",
    description:
      "Answers about Saabai websites, AI audits and automation for small businesses on the Gold Coast, in Brisbane and across Australia. Care plans start from $100 a month.",
  }),
  websites: pageMeta({
    path: "/websites",
    title: "Website Care Plans | Saabai, Gold Coast",
    description:
      "Website care plans for Australian small businesses from Saabai on the Gold Coast. Presence is $100, Growth is $200 and Signature is $300 a month, and builds start from $2,000.",
  }),
  services: pageMeta({
    path: "/services",
    title: "Saabai Services | Websites and AI, Gold Coast",
    description:
      "Saabai services for Australian small businesses on the Gold Coast and in Brisbane. Website care plans from $100 a month, the Blueprint AI audit from $497, chat agents and automations.",
  }),
  legal: pageMeta({
    path: "/legal",
    title: "Lex AI Legal Assistant | Saabai, Gold Coast",
    description:
      "Lex is an AI legal assistant for Australian law firms, from Saabai on the Gold Coast. It cites ATO rulings and Commonwealth legislation, with a 60-day free trial and no card needed.",
  }),
  legalCompare: pageMeta({
    path: "/legal/lex-vs-ai-legal-tools",
    title: "Lex vs other AI legal tools 2026 | Saabai",
    description:
      "Published facts for Lex vs Quillio, Smokeball Archie, LEAP, Clio, Habeas, Harvey, CoCounsel and Lexis+ AI. Lex is an AI legal research and drafting assistant for Australian firms, with a free 60-day trial.",
  }),
  queenslandChatbot: pageMeta({
    path: "/ai-chatbot-developer-queensland",
    title: "Custom AI Chatbot Developer in Queensland | Saabai",
    description:
      "Saabai builds custom AI chatbots for Queensland businesses in Brisbane, the Gold Coast and the Sunshine Coast. The chatbot answers visitors and keeps a log of each chat.",
  }),
  receptionist: pageMeta({
    path: "/ai-receptionist-gold-coast",
    title: "AI Receptionist for Gold Coast Businesses | Saabai",
    description:
      "A Gold Coast built AI receptionist for your website, from Saabai in Merrimac. It answers visitors day and night and keeps a log of each chat.",
  }),
  lawFirms: pageMeta({
    path: "/ai-chatbot-law-firms",
    title: "AI Chatbot for Law Firms | Saabai, Gold Coast",
    description:
      "Custom AI chatbots and Lex for Australian law firms, built by Saabai on the Gold Coast. The chatbot answers after-hours questions and keeps a log of each chat.",
  }),
  blueprint: pageMeta({
    path: "/blueprint",
    title: "Saabai Blueprint AI Plan | Gold Coast",
    description:
      "A ranked AI plan for small businesses and practices, from Saabai on the Gold Coast. Starter is $497, Pro is $1,497 and Business is $3,500, credited if you build within 30 days.",
  }),
  goldCoast: pageMeta({
    path: "/gold-coast",
    title: "Web Design Gold Coast, Hosting Included, From $2,000 | Saabai",
    description:
      "Web design on the Gold Coast from $2,000 plus $100 a month care, with hosting included. Saabai is based in Merrimac, and Blueprint AI plans start from $497.",
  }),
  brisbane: pageMeta({
    path: "/brisbane",
    title: "Websites and AI Automation in Brisbane | Saabai",
    description:
      "Brisbane websites from $2,000 plus $100 a month, plus custom AI chatbots for local businesses. Book a free 30 minute call for a chatbot quote.",
  }),
  score: pageMeta({
    path: "/score",
    title: "Free AI Readiness Score | Saabai, Gold Coast",
    description:
      "A free 3 minute score for Australian small businesses, from Saabai on the Gold Coast. Twelve questions, an instant score out of 100 and three quick wins.",
  }),
  caseStudies: pageMeta({
    path: "/case-studies",
    title: "Saabai Case Studies | Gold Coast AI Results",
    description:
      "One published example from Saabai, a Gold Coast AI business: a custom AI sales agent that answered product questions and priced cut-to-size jobs.",
  }),
  rexCase: pageMeta({
    path: "/case-studies/rex-plastics-online",
    title: "PlasticOnline.com.au Case Study | Rex AI Sales Agent | Saabai",
    description:
      "Rex, a custom AI sales agent Saabai built on the Gold Coast for PlasticOnline.com.au. It answered product questions and priced cut-to-size jobs from that supplier's catalogue.",
  }),
  process: pageMeta({
    path: "/process",
    title: "Saabai AI Process | Gold Coast",
    description:
      "Saabai's process on the Gold Coast runs from a Blueprint to a live automation. Simple automations can go live in one to two weeks, and more complex workflows typically take four to six weeks.",
  }),
  insights: pageMeta({
    path: "/insights",
    title: "Saabai Insights | AI for Small Business, Gold Coast",
    description:
      "Patterns from building websites, AI agents and automation for Australian small businesses. Written by Saabai on the Gold Coast.",
    robots: { index: false, follow: true },
  }),
  useCases: pageMeta({
    path: "/use-cases",
    title: "AI Use Cases for Small Business | Saabai, Gold Coast",
    description:
      "Practical AI and automation examples for Australian small businesses, from Saabai on the Gold Coast. Chatbots answer at any hour, quoting and reminders are custom work, and Blueprint audits start from $497.",
  }),
  leadgen: pageMeta({
    path: "/leadgen",
    title: "Saabai LeadGen | AI Lead Capture, Gold Coast",
    description:
      "Saabai LeadGen is an AI lead capture widget for Australian service businesses on the Gold Coast. It can collect a name and phone at any hour.",
  }),
  calculator: pageMeta({
    path: "/calculator",
    title: "Automation Cost Calculator | Saabai, Gold Coast",
    description:
      "See what repetitive work costs your Australian business each year, including hours lost and a dollar estimate. It is a free calculator from Saabai on the Gold Coast, with no sign-up.",
  }),
  aiNews: pageMeta({
    path: "/ai-news",
    title: "AI News | Saabai, Gold Coast",
    description:
      "Live AI news and research, curated by Saabai on the Gold Coast. Updated from leading AI publications and discussions.",
    robots: { index: false, follow: true },
  }),
  pricing: pageMeta({
    path: "/pricing",
    title: "Saabai Pricing | Websites and AI, Gold Coast",
    description:
      "Published Saabai prices in Australian dollars. Website care plans start from $100 a month on the Gold Coast, and the Blueprint starts from $497.",
  }),
  compare: pageMeta({
    path: "/compare",
    title: "Saabai, an agency, or a DIY site builder | Gold Coast",
    description:
      "How a Saabai care plan compares with a traditional web agency and with DIY builders such as Wix and Squarespace. Saabai is based on the Gold Coast, and care plans start from $100 a month.",
  }),
  seoAiSearch: pageMeta({
    path: "/seo-ai-search",
    title: "SEO and AI Search Visibility | Saabai, Gold Coast",
    description:
      "SEO and AI search checks are included in every Saabai Blueprint, from $497. Saabai is based in Merrimac on the Gold Coast and looks at Google, ChatGPT, Claude, Perplexity and Gemini.",
  }),
  customAgents: pageMeta({
    path: "/custom-ai-agents",
    title: "Custom AI Agents for Gold Coast Businesses | Saabai",
    description:
      "Custom AI agents for Gold Coast and Australian businesses, scoped with you and quoted to the job before any build. Book a call for a quote.",
  }),
  changelog: pageMeta({
    path: "/saabai-changelog",
    title: "Saabai Changelog | Gold Coast",
    description:
      "Development history for Saabai, the Gold Coast studio behind Lex, websites and client AI projects.",
  }),
} as const;
