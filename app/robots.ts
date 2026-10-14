import type { MetadataRoute } from "next";

const DISALLOW = ["/api/", "/saabai-admin", "/admin", "/dashboard"];

// AI search and answer crawlers are explicitly welcome (Shane, 14 Oct 2026).
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bingbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://www.saabai.ai/sitemap.xml",
    host: "https://www.saabai.ai",
  };
}
