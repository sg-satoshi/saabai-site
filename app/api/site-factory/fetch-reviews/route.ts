import { NextRequest } from "next/server";
import https from "https";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface ReviewItem {
  name: string;
  rating: number;
  text: string;
  date?: string;
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
  "Cookie": "CONSENT=YES+srp.gws-20220101-0-RC1.en+FX+666;",
};

// maps.app.goo.gl returns a JS-redirect page to fetch() — only a raw HEAD request
// gets the HTTP 302 Location header with the actual Maps URL.
function resolveShortUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      const loc = res.headers["location"];
      resolve(typeof loc === "string" && loc.startsWith("https://") ? loc : url);
    });
    req.setTimeout(8000, () => { req.destroy(); resolve(url); });
    req.on("error", () => resolve(url));
    req.end();
  });
}

// Extract the /maps/preview/place URL embedded in the Maps page — it returns
// aggregate rating + business info as a compact JSON blob.
async function fetchPreviewData(mapsHtml: string, referer: string): Promise<{ rating?: number; totalReviews?: number; businessName?: string }> {
  const match = mapsHtml.match(/href="(\/maps\/preview\/place\?[^"]+)"/);
  if (!match) return {};
  const previewUrl = "https://www.google.com" + match[1].replace(/&amp;/g, "&");
  try {
    const res = await fetch(previewUrl, {
      headers: { ...BROWSER_HEADERS, "Referer": referer },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();

    // Rating appears as a bare float (e.g. 4.9, 4.8) in the JSON array blob.
    // Match any X.Y float between 1.0 and 5.0 — take the highest value found
    // (aggregate ratings are always the largest float near the place data).
    const ratingMatches = [...text.matchAll(/[,\[](([1-5])\.(\d))[,\]]/g)].map(m => parseFloat(m[1]));
    const rating = ratingMatches.length > 0 ? Math.max(...ratingMatches) : undefined;

    // Review count — look for integers 5–9999 in the blob; skip tile/zoom numbers
    // (those are typically large like 3521 or tiny like 13). Review counts are 5–999.
    const countMatches = [...text.matchAll(/[,\[](\d{1,4})[,\]]/g)]
      .map(m => parseInt(m[1]))
      .filter(n => n >= 5 && n <= 999 && n !== 13 && n !== 17);
    const totalReviews = countMatches.length > 0 ? countMatches[0] : undefined;

    // Business name: quoted string of 4–80 chars starting with a capital letter
    const nameMatch = text.match(/,"([A-Z][^"]{3,79})"/);
    const businessName = nameMatch?.[1]?.replace(/\\u[\da-fA-F]{4}/g, "");

    return { rating, totalReviews, businessName };
  } catch {
    return {};
  }
}

// Extract business name from a decoded Maps URL path
function nameFromUrl(url: string): string | undefined {
  const m = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return undefined;
  return decodeURIComponent(m[1]).replace(/\+/g, " ").replace(/,.*$/, "").trim();
}

async function scrape(url: string): Promise<{
  reviews: ReviewItem[];
  rating?: number;
  totalReviews?: number;
  businessName?: string;
  tip?: string;
}> {
  // Resolve short links (maps.app.goo.gl) via raw HEAD — fetch() alone doesn't follow them
  let target = url;
  if (/goo\.gl|maps\.app/i.test(url)) {
    target = await resolveShortUrl(url);
  }

  const res = await fetch(target, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from Google`);
  const html = await res.text();

  let rating: number | undefined;
  let totalReviews: number | undefined;
  let businessName: string | undefined;
  const reviews: ReviewItem[] = [];

  // ── Strategy 1: JSON-LD structured data ─────────────────────────────────
  // Works for some third-party sites and older Maps pages — rarely for current Google Maps.
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
          const ratingVal = parseFloat(r.reviewRating?.ratingValue ?? "5");
          if (text.length > 15 && ratingVal >= 4) {
            reviews.push({
              name: typeof r.author === "string" ? r.author : (r.author?.name ?? "Google Reviewer"),
              rating: ratingVal,
              text: text.slice(0, 400),
              date: r.datePublished,
            });
          }
        }
      }
    } catch { /* malformed JSON */ }
  }

  if (reviews.length > 0) return { reviews: reviews.slice(0, 8), rating, totalReviews, businessName };

  // ── Strategy 2: APP_INITIALIZATION_STATE reviewer pattern ───────────────
  // Google embeds some data here but since ~2024 review text is loaded via XHR,
  // not in the initial HTML. This catches older-format pages if they exist.
  const appState = html.match(/APP_INITIALIZATION_STATE\s*=\s*(\[\[[\s\S]{200,}?\]\])\s*;/)?.[1];
  if (appState) {
    const chunks = appState.split(/"([A-Z][a-zA-Z\s]{2,40})","[^"]{0,50}",(?:null,){0,5}\[null,null,([1-5])\]/g);
    for (let i = 1; i + 2 < chunks.length && reviews.length < 8; i += 3) {
      const after = chunks[i + 2];
      const textMatch = after.match(/"([^"]{30,400})"/);
      const starCount = parseInt(chunks[i + 1]);
      if (textMatch && starCount >= 4) {
        reviews.push({
          name: chunks[i],
          rating: starCount,
          text: textMatch[1].replace(/\\n/g, " ").replace(/\\u[\da-fA-F]{4}/g, ""),
        });
      }
    }
  }

  if (reviews.length > 0) return { reviews: reviews.slice(0, 8), rating, totalReviews, businessName };

  // ── Strategy 3: Aggregate rating + business name from preview API ────────
  // Google Maps loads reviews dynamically via XHR — they're never in the server-rendered
  // HTML. We can still get the aggregate rating and business name from the preview API
  // endpoint that's embedded as a <link> in the page.
  const preview = await fetchPreviewData(html, target);
  if (preview.rating) rating = preview.rating;
  if (preview.totalReviews) totalReviews = preview.totalReviews;
  if (preview.businessName) businessName = preview.businessName;

  // Fall back: extract business name from the Maps URL itself
  if (!businessName) businessName = nameFromUrl(target);

  // Fall back: title tag
  if (!businessName) {
    const t = html.match(/<title>([^<]+)<\/title>/);
    if (t) businessName = t[1].replace(/\s*[-–|].*$/, "").replace(" - Google Maps", "").trim();
  }

  const tip = rating
    ? `Google loads individual reviews dynamically — they can't be scraped. ${businessName ? businessName + "'s " : ""}overall rating (${rating}/5) has been pre-filled. Add the review text manually below.`
    : "Google loads reviews dynamically and they can't be fetched without an API key. Add reviews manually below — the carousel will look great.";

  return { reviews: [], rating, totalReviews, businessName, tip };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url?.trim()) return Response.json({ error: "url required" }, { status: 400 });

    const result = await scrape(url.trim());
    return Response.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg, reviews: [], tip: "Fetch failed — add reviews manually below." });
  }
}
