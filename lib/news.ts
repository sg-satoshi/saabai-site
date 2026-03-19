export interface NewsItem {
  title: string;
  url: string;
  source: string;
  type: "reddit" | "news";
  score?: number;
  comments?: number;
  permalink?: string;
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

function parseRss(xml: string, sourceName: string, limit = 5): NewsItem[] {
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

export async function fetchRss(url: string, sourceName: string, limit = 5): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, sourceName, limit);
  } catch {
    return [];
  }
}

export async function fetchReddit(
  subreddit: string,
  minScore = 50,
  limit = 5,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`,
      {
        headers: { "User-Agent": "saabai-news/1.0 (saabai.ai)" },
        next: { revalidate: 1800 },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.data.children
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) =>
        p.data.score >= minScore &&
        !p.data.is_video &&
        !p.data.stickied &&
        p.data.title.length > 15,
      )
      .slice(0, limit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        title: p.data.title,
        url: p.data.url.startsWith("http")
          ? p.data.url
          : `https://reddit.com${p.data.permalink}`,
        permalink: `https://reddit.com${p.data.permalink}`,
        source: `r/${subreddit}`,
        type: "reddit" as const,
        score: p.data.score,
        comments: p.data.num_comments,
      }));
  } catch {
    return [];
  }
}

export interface NewsData {
  reddit: NewsItem[];
  news: NewsItem[];
  all: NewsItem[];
  updatedAt: string;
}

export async function getNewsData(opts?: { redditLimit?: number; newsLimit?: number }): Promise<NewsData> {
  const rl = opts?.redditLimit ?? 4;
  const nl = opts?.newsLimit ?? 4;

  const [
    redditAINews,
    redditAI,
    redditML,
    redditSingularity,
    redditLLM,
    redditChatGPT,
    rssTechCrunch,
    rssVentureBeat,
    rssVerge,
    rssHN,
    rssMIT,
    rssWired,
    rssArsTechnica,
    rssZDNet,
    rssRegister,
    rssAINews,
    rssMarkTechPost,
  ] = await Promise.all([
    fetchReddit("AINews", 50, rl),
    fetchReddit("artificial", 100, rl),
    fetchReddit("MachineLearning", 50, rl),
    fetchReddit("singularity", 100, rl),
    fetchReddit("LocalLLaMA", 50, Math.ceil(rl / 2)),
    fetchReddit("ChatGPT", 200, Math.ceil(rl / 2)),
    fetchRss("https://techcrunch.com/category/artificial-intelligence/feed/", "TechCrunch", nl),
    fetchRss("https://venturebeat.com/category/ai/feed/", "VentureBeat", nl),
    fetchRss("https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", "The Verge", nl),
    fetchRss("https://hnrss.org/newest?q=artificial+intelligence&points=100", "Hacker News", nl),
    fetchRss("https://www.technologyreview.com/feed/", "MIT Tech Review", nl),
    fetchRss("https://www.wired.com/feed/tag/ai/latest/rss", "Wired", nl),
    fetchRss("https://feeds.arstechnica.com/arstechnica/technology-lab", "Ars Technica", nl),
    fetchRss("https://www.zdnet.com/topic/artificial-intelligence/rss.xml", "ZDNet", nl),
    fetchRss("https://www.theregister.com/software/ai_ml/headlines.atom", "The Register", nl),
    fetchRss("https://artificialintelligence-news.com/feed/", "AI News", nl),
    fetchRss("https://www.marktechpost.com/feed/", "MarkTechPost", nl),
  ]);

  const reddit = [
    ...redditAINews,
    ...redditAI,
    ...redditSingularity,
    ...redditML,
    ...redditLLM,
    ...redditChatGPT,
  ];

  const news = [
    ...rssTechCrunch,
    ...rssVentureBeat,
    ...rssVerge,
    ...rssHN,
    ...rssMIT,
    ...rssWired,
    ...rssArsTechnica,
    ...rssZDNet,
    ...rssRegister,
    ...rssAINews,
    ...rssMarkTechPost,
  ];

  // Interleave for the ticker
  const all: NewsItem[] = [];
  const maxLen = Math.max(reddit.length, news.length);
  for (let i = 0; i < maxLen; i++) {
    if (news[i]) all.push(news[i]);
    if (reddit[i]) all.push(reddit[i]);
  }

  return { reddit, news, all, updatedAt: new Date().toISOString() };
}
