import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface ReviewItem {
  name: string;
  rating: number;
  text: string;
  date?: string;
}

async function scrape(url: string): Promise<{
  reviews: ReviewItem[];
  rating?: number;
  totalReviews?: number;
  businessName?: string;
}> {
  // Expand short URLs (maps.app.goo.gl etc.)
  let target = url;
  if (/goo\.gl|maps\.app/i.test(url)) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      target = r.url || url;
    } catch { /* use original */ }
  }

  const res = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-AU,en;q=0.9",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from Google`);
  const html = await res.text();

  let rating: number | undefined;
  let totalReviews: number | undefined;
  let businessName: string | undefined;
  const reviews: ReviewItem[] = [];

  // ── Strategy 1: JSON-LD structured data ──────────────────────────────────
  const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      for (const item of (Array.isArray(d) ? d : [d])) {
        if (item.name) businessName = item.name;
        if (item.aggregateRating) {
          rating = parseFloat(item.aggregateRating.ratingValue);
          totalReviews = parseInt(item.aggregateRating.reviewCount ?? item.aggregateRating.ratingCount ?? 0);
        }
        for (const r of (item.review ?? [])) {
          const text = r.reviewBody ?? r.description ?? "";
          if (text.length > 15) {
            reviews.push({
              name: typeof r.author === "string" ? r.author : (r.author?.name ?? "Google Reviewer"),
              rating: parseFloat(r.reviewRating?.ratingValue ?? "5"),
              text: text.slice(0, 400),
              date: r.datePublished,
            });
          }
        }
      }
    } catch { /* malformed JSON */ }
  }

  if (reviews.length > 0) return { reviews: reviews.slice(0, 8), rating, totalReviews, businessName };

  // ── Strategy 2: Google Maps embedded APP_INITIALIZATION_STATE ────────────
  // Google encodes place data as a giant nested array in the page source.
  // Reviews appear as strings that follow a specific reviewer name + stars pattern.
  // We pull them from the raw JS data using regex.
  const appState = html.match(/APP_INITIALIZATION_STATE\s*=\s*(\[\[[\s\S]{200,}?\]\])\s*;/)?.[1];
  if (appState) {
    // Extract reviewer name + star count + review text triplets
    // Pattern: reviewer strings followed by numeric rating 1-5 and text paragraphs
    const chunks = appState.split(/"([A-Z][a-zA-Z\s]{2,40})","[^"]{0,50}",(?:null,){0,5}\[null,null,([1-5])\]/g);
    for (let i = 1; i + 2 < chunks.length && reviews.length < 8; i += 3) {
      const after = chunks[i + 2];
      const textMatch = after.match(/"([^"]{30,400})"/);
      if (textMatch) {
        reviews.push({
          name: chunks[i],
          rating: parseInt(chunks[i + 1]),
          text: textMatch[1].replace(/\\n/g, " ").replace(/\\u[\da-fA-F]{4}/g, ""),
        });
      }
    }
  }

  // ── Strategy 3: Aggregate rating from meta/title ────────────────────────
  if (!rating) {
    const rMatch = html.match(/(\d\.\d)\s*(?:stars?|★).*?(\d[\d,]+)\s*(?:reviews?|ratings?)/i) ??
                   html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?[\s\S]{0,200}"reviewCount"\s*:\s*"?(\d+)"?/i);
    if (rMatch) { rating = parseFloat(rMatch[1]); totalReviews = parseInt(rMatch[2].replace(",", "")); }
  }
  if (!businessName) {
    const t = html.match(/<title>([^<]+)<\/title>/);
    if (t) businessName = t[1].replace(/\s*[-–|].*$/, "").replace(" - Google Maps", "").trim();
  }

  return { reviews: reviews.slice(0, 8), rating, totalReviews, businessName };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url?.trim()) return Response.json({ error: "url required" }, { status: 400 });

    const result = await scrape(url.trim());
    return Response.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg, reviews: [], tip: "Auto-fetch failed — paste reviews manually below." });
  }
}
