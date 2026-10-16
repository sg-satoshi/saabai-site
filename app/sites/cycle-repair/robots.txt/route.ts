import { SITE_URL } from "../seo";

export const dynamic = "force-static";

// AI search and answer crawlers are explicitly welcome (Shane, 16 Oct 2026).
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
  "CCBot", "Bingbot", "meta-externalagent", "xAI-Bot", "GrokBot",
];

export function GET() {
  const blocks = [
    `User-agent: *\nAllow: /\nDisallow: /api/`,
    ...AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /api/`),
  ].join("\n\n");
  const body = `${blocks}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
