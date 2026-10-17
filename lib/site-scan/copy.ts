import type { OfferId } from "./types";

export type FixCopy = { meaning: string; fix: string; time: string; mins: number; dev: boolean; offer: OfferId };

export const OFFERS: Record<OfferId, { name: string; line: string; href: string }> = {
  build: { name: "Saabai website build", line: "A fast, AI-ready and SEO-ready website with an AI enquiry chatbot and Google reviews carousel included. Every build starts with AI information gathering and a basic training session. Typically 2 to 3 weeks. Fixing your current site instead is quoted separately. Presence $2,000 + $100/mo, Growth $4,000 + $200/mo, Signature $6,500 + $300/mo (AUD, GST not applicable).", href: "/websites" },
  chatbot: { name: "AI enquiry chatbot", line: "Answers questions and catches leads after hours. Included in every Saabai website tier (booking and qualifying on Growth and above).", href: "/websites" },
  reviews: { name: "Google reviews on your site", line: "A reviews carousel showing your real Google reviews. Included in every Saabai website plan.", href: "/websites" },
  blueprint: { name: "AI Blueprint", line: "A ranked plan for your whole business. Starter $497, Pro $1,497, Business $3,500. Fee credited if you build within 30 days.", href: "/blueprint" },
};

export const NO_SITE_FIX = {
  id: "no_website", label: "Website not present or detected",
  meaning: "Customers who search for you, or ask Google and ChatGPT for a business like yours, find nothing to read or trust. That is the biggest gap a business can have.",
  fix: "Get a fast, professional website with your services, area, phone and reviews, set up so Google and AI tools can read it.",
  time: "Typically 2 to 3 weeks with Saabai", offer: "build" as OfferId,
};

export const FIX_COPY: Record<string, FixCopy> = {
  title_meta: { meaning: "The title and description are what people see in Google. Without them you look unfinished and get fewer clicks.", fix: "Write a title under 70 characters with your service and suburb, and a 50 to 160 character description.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  headings: { meaning: "Headings tell Google and AI tools what the page is about.", fix: "Use one main heading with your service and area, then sub headings for each section.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  mobile: { meaning: "Most visitors are on phones. A page that is not set up for mobile is hard to read, and Google ranks it lower.", fix: "Add the mobile viewport setting and make the layout responsive.", time: "1 to 2 days", mins: 960, dev: true, offer: "build" },
  speed: { meaning: "People on phones leave slow pages, and Google notices.", fix: "Compress images, remove heavy scripts, and use faster hosting.", time: "1 to 2 days", mins: 960, dev: true, offer: "build" },
  https: { meaning: "Browsers warn visitors about sites that are not secure, which damages trust straight away.", fix: "Turn on a free security certificate and redirect http to https. Most hosts offer this in one click.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  indexable: { meaning: "The page is telling Google not to list it, so it cannot be found in search.", fix: "Remove the noindex setting or the robots.txt rule that blocks search engines, and add a canonical tag.", time: "5 minutes", mins: 5, dev: false, offer: "build" },
  sitemap: { meaning: "A sitemap helps Google find all your pages quickly.", fix: "Publish a sitemap.xml and mention it in robots.txt.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  alt: { meaning: "Alt text describes images for Google, AI tools and people using screen readers.", fix: "Add a short description to each image.", time: "1 to 2 hours", mins: 90, dev: false, offer: "build" },
  social_tags: { meaning: "Without share tags, links to your site look bare on Facebook, LinkedIn and messages.", fix: "Add a share title and image to your site settings.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  schema: { meaning: "When someone asks ChatGPT or Google for a business like yours, AI tools struggle to tell what you do or where without structured data.", fix: "Add LocalBusiness structured data with your name, address, phone and services.", time: "1 to 2 hours", mins: 90, dev: true, offer: "build" },
  answers: { meaning: "AI tools quote pages that answer questions directly. A short FAQ makes you quotable.", fix: "Add 5 to 8 real customer questions with clear answers, with FAQ schema.", time: "1 to 2 hours", mins: 90, dev: false, offer: "build" },
  ai_bots: { meaning: "Your site tells AI tools to stay away, so you will not be mentioned when people ask them for recommendations.", fix: "Edit robots.txt to allow GPTBot, ClaudeBot, PerplexityBot and Google-Extended.", time: "5 minutes", mins: 5, dev: false, offer: "build" },
  llms: { meaning: "An llms.txt file gives AI tools a plain summary of your business.", fix: "Add a short llms.txt at the top of your site.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  who_what_where: { meaning: "If the homepage does not plainly say who you are, what you do and where, neither visitors nor AI tools can place you.", fix: "Say it in the first paragraph: business name, main service, and the area you serve.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  nap: { meaning: "Google checks that your name, address and phone match everywhere. Gaps or mismatches hurt local results.", fix: "Show your name, address and phone in the footer and on a contact page, matching your Google profile.", time: "30 minutes", mins: 30, dev: false, offer: "build" },
  local_signals: { meaning: "Local signals tell Google which area you serve.", fix: "Name your suburbs, add a map and a tap-to-call phone link.", time: "1 to 2 hours", mins: 90, dev: false, offer: "build" },
  reviews_site: { meaning: "Visitors cannot see that real customers rate you.", fix: "Show your best Google reviews with star ratings on the homepage.", time: "1 to 2 hours", mins: 90, dev: false, offer: "reviews" },
  gbp: { meaning: "Your Google Business Profile is how most local customers first find you. A strong rating, plenty of reviews and recent activity win the click.", fix: "Link your profile from your site, ask recent customers for reviews (a tool like Podium, Birdeye or Hatch can automate it) and post an update monthly. This is owner advice, not a Saabai service.", time: "1 to 2 hours", mins: 90, dev: false, offer: "blueprint" },
  social_links: { meaning: "Linked social profiles prove you are a real, active business.", fix: "Link your active profiles from the footer.", time: "5 minutes", mins: 5, dev: false, offer: "build" },
};
