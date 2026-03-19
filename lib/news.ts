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
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "saabai-news/1.0 (https://saabai.ai)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, sourceName, limit);
  } catch {
    return [];
  }
}

// Reddit's JSON API blocks Vercel/cloud IPs — use their native RSS feed instead.
// Reddit RSS is an Atom feed, parsed by the existing parseRss function.
export async function fetchReddit(
  subreddit: string,
  _minScore = 50, // kept for API compatibility, not used with RSS
  limit = 5,
): Promise<NewsItem[]> {
  const items = await fetchRss(
    `https://www.reddit.com/r/${subreddit}/hot.rss`,
    `r/${subreddit}`,
    limit,
  );
  // Mark as reddit type and set permalink to reddit thread
  return items.map((item) => ({
    ...item,
    type: "reddit" as const,
    permalink: item.url,
  }));
}

// Greedy interleave — never places two items from the same source consecutively.
// Always picks from the largest remaining group, skipping the last-used source.
function shuffleNoConsecutive(items: NewsItem[]): NewsItem[] {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    if (!groups.has(item.source)) groups.set(item.source, []);
    groups.get(item.source)!.push(item);
  }
  // Shuffle within each source group for internal variety
  for (const group of groups.values()) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  }
  const result: NewsItem[] = [];
  let lastSource = "";
  while (groups.size > 0) {
    const candidates = [...groups.entries()]
      .filter(([src]) => src !== lastSource)
      .sort((a, b) => b[1].length - a[1].length);
    // If all remaining items share the last source, allow it (avoids infinite loop)
    const [source, group] = candidates.length > 0
      ? candidates[0]
      : [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    result.push(group.shift()!);
    lastSource = source;
    if (group.length === 0) groups.delete(source);
  }
  return result;
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

  const allRaw = [...reddit, ...news];

  return {
    reddit: shuffleNoConsecutive(reddit),
    news: shuffleNoConsecutive(news),
    all: shuffleNoConsecutive(allRaw),
    updatedAt: new Date().toISOString(),
  };
}
