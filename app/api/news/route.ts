export const revalidate = 1800; // cache 30 minutes

interface NewsItem {
  title: string;
  url: string;
  source: string;
  type: "reddit" | "news";
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function parseRss(xml: string, sourceName: string, limit = 4): NewsItem[] {
  const items: NewsItem[] = [];
  const pattern = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/g;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(xml)) !== null && items.length < limit) {
    const block = m[1];

    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch ? decodeHtml(titleMatch[1]) : "";

    const linkRss = block.match(/<link[^>]*>\s*(https?[^\s<]+)\s*<\/link>/);
    const linkAtom = block.match(/<link[^>]*href="(https?[^"]+)"/);
    const url = linkRss ? linkRss[1].trim() : linkAtom ? linkAtom[1].trim() : "";

    if (title.length > 15 && url) {
      items.push({ title, url, source: sourceName, type: "news" });
    }
  }

  return items;
}

async function fetchRss(url: string, sourceName: string, limit = 4): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, sourceName, limit);
  } catch {
    return [];
  }
}

async function fetchReddit(subreddit: string, minScore = 50, limit = 3): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
      {
        headers: { "User-Agent": "saabai-news-ticker/1.0 (saabai.ai)" },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (
      data.data.children
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) =>
          p.data.score >= minScore &&
          !p.data.is_video &&
          !p.data.stickied &&
          p.data.title.length > 15
        )
        .slice(0, limit)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({
          title: p.data.title,
          url: p.data.url.startsWith("http")
            ? p.data.url
            : `https://reddit.com${p.data.permalink}`,
          source: `r/${subreddit}`,
          type: "reddit" as const,
        }))
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const [
    redditAI,
    redditML,
    redditSingularity,
    redditAINews,
    redditLLM,
    rssTechCrunch,
    rssVentureBeat,
    rssVerge,
    rssHN,
  ] = await Promise.all([
    fetchReddit("artificial", 100, 3),
    fetchReddit("MachineLearning", 50, 3),
    fetchReddit("singularity", 100, 3),
    fetchReddit("AINews", 50, 3),
    fetchReddit("LocalLLaMA", 50, 2),
    fetchRss("https://techcrunch.com/category/artificial-intelligence/feed/", "TechCrunch", 3),
    fetchRss("https://venturebeat.com/category/ai/feed/", "VentureBeat", 3),
    fetchRss("https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", "The Verge", 3),
    fetchRss("https://hnrss.org/newest?q=artificial+intelligence&points=100", "Hacker News", 3),
  ]);

  // Interleave Reddit and news for variety
  const reddit = [...redditAINews, ...redditAI, ...redditSingularity, ...redditML, ...redditLLM];
  const news = [...rssTechCrunch, ...rssVentureBeat, ...rssVerge, ...rssHN];

  const combined: NewsItem[] = [];
  const maxLen = Math.max(reddit.length, news.length);
  for (let i = 0; i < maxLen; i++) {
    if (news[i]) combined.push(news[i]);
    if (reddit[i]) combined.push(reddit[i]);
  }

  return Response.json({ items: combined, updatedAt: new Date().toISOString() });
}
