import type { CheckDef, CheckResult, Snapshot } from "./types";

const U = (found: string): CheckResult => ({ status: "unknown", found });
const R = (status: CheckResult["status"], found: string): CheckResult => ({ status, found });
const html = (s: Snapshot) => s.home?.html ?? "";
const all = (s: Snapshot) => html(s) + "\n" + s.extra;
const text = (h: string) => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
export const tag = (h: string, re: RegExp) => [...h.matchAll(re)].map((m) => m[1] ?? m[0]);
const meta = (h: string, attr: "name" | "property", v: string): string | null => {
  for (const m of h.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    if (new RegExp(`${attr}\\s*=\\s*["']${v}["']`, "i").test(t)) return (t.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "").trim();
  }
  return null;
};
/** Content checks need readable page text; a JavaScript-only shell has none. */
const noHome = (s: Snapshot) => !s.home || s.jsHeavy;
/** Head checks (title, viewport, schema, share tags) work on a JavaScript shell too, because they sit in the raw HTML. */
const noHead = (s: Snapshot) => !s.home;
const SHARED_MSG = "This page sits under the main saabai.ai site, which controls this file, so it is not judged here.";
/** Loose business-name match: ignores case, punctuation and apostrophes, and accepts most of the words. */
export function nameMatch(page: string, name: string): boolean {
  const n = (x: string) => x.toLowerCase().replace(/[\u2018\u2019'`]/g, "").replace(/&amp;|&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const p = ` ${n(page)} `, w = n(name).split(" ").filter((x) => x.length > 2 && !["the", "and", "pty", "ltd"].includes(x));
  if (!w.length) return p.includes(` ${n(name)} `);
  return w.filter((x) => p.includes(x)).length / w.length >= 0.6;
}
const jsMsg = (s: Snapshot) => (s.jsHeavy ? "The page builds itself with JavaScript, so a simple scan cannot read it." : "Could not read the homepage.");

/** JSON-LD blocks parsed (bad JSON ignored). */
export function jsonLd(h: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1].trim());
      const walk = (n: unknown) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === "object") { out.push(n as Record<string, unknown>); const g = (n as Record<string, unknown>)["@graph"]; if (g) walk(g); } };
      walk(j);
    } catch { /* ignore */ }
  }
  return out;
}
const types = (n: Record<string, unknown>) => ([] as unknown[]).concat(n["@type"] ?? []).map(String);

export const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot", "anthropic-ai"];
/** Which of the AI crawlers a robots.txt fully blocks ("Disallow: /" in their group, or in * when no group of their own). */
export function blockedBots(robots: string): string[] {
  const groups: { agents: string[]; rules: string[] }[] = [];
  let cur: { agents: string[]; rules: string[] } | null = null; let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim(); const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; }
    else { lastWasAgent = false; if (cur && k === "disallow") cur.rules.push(v); }
  }
  const blocks = (g?: { rules: string[] }) => !!g && g.rules.includes("/");
  const star = groups.find((g) => g.agents.includes("*"));
  return AI_BOTS.filter((b) => { const g = groups.find((x) => x.agents.includes(b.toLowerCase())); return g ? blocks(g) : blocks(star); });
}

export const CHECKS: CheckDef[] = [
  { id: "title_meta", area: "seo", weight: 6, label: "Page title and description", run: (s) => {
    if (noHead(s)) return U(jsMsg(s));
    const t = (html(s).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const d = meta(html(s), "name", "description") ?? "";
    if (t && d && t.length <= 75 && d.length >= 50 && d.length <= 200) return R("pass", `Title (${t.length} characters) and description (${d.length}) look good.`);
    if (!t && !d) return R("fail", "No page title and no description.");
    return R("partial", !t ? "No page title." : !d ? "No meta description." : `Title is ${t.length} characters and description is ${d.length}; aim for a title under 75 and a description of 50 to 200.`);
  } },
  { id: "headings", area: "seo", weight: 4, label: "Headings", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const h1 = tag(html(s), /<h1\b[^>]*>/gi).length, h2 = tag(html(s), /<h2\b[^>]*>/gi).length;
    if (h1 === 1 && h2 >= 2) return R("pass", `One main heading and ${h2} sub headings.`);
    if (h1 === 0 || h1 > 2) return R("fail", h1 === 0 ? "No main (H1) heading." : `${h1} main headings; there should be one.`);
    return R("partial", `${h1} main heading but only ${h2} sub heading${h2 === 1 ? "" : "s"}.`);
  } },
  { id: "mobile", area: "seo", weight: 5, label: "Mobile friendly", run: (s) => {
    if (noHead(s)) return U(jsMsg(s));
    const vp = meta(html(s), "name", "viewport");
    if (!vp) return R("fail", "No mobile viewport setting, so phones show a shrunken desktop page.");
    if (/<(table|div|iframe)\b[^>]*\bwidth\s*=\s*["']?(\d{4,}|1\d{3})(px)?["']?/i.test(html(s))) return R("partial", "Mobile setting present, but some elements have a fixed wide width.");
    return R("pass", "Mobile viewport is set.");
  } },
  { id: "speed", area: "seo", weight: 6, label: "Page speed (basic)", run: (s) => {
    if (!s.home) return U("Could not load the homepage.");
    const { ms, bytes } = s.home; const mb = bytes / 1e6;
    if (ms < 1500 && mb < 2) return R("pass", `Responded in ${ms} ms, ${mb.toFixed(1)} MB page.`);
    if (ms < 3500 && mb < 4) return R("partial", `Responded in ${ms} ms, ${mb.toFixed(1)} MB page. Faster is better.`);
    return R("fail", `Slow or heavy: ${ms} ms, ${mb.toFixed(1)} MB.`);
  } },
  { id: "https", area: "seo", weight: 5, label: "Secure (HTTPS)", run: (s) => {
    if (s.httpsOk === null) return U("Could not test.");
    if (!s.httpsOk) return R("fail", "The site does not load securely over HTTPS.");
    if (s.httpRedirects === false) return R("partial", "HTTPS works but the old http address does not redirect to it.");
    return R("pass", "HTTPS works and http redirects to it.");
  } },
  { id: "indexable", area: "seo", weight: 5, label: "Allowed in Google", run: (s) => {
    if (!s.home) return U("Could not load the homepage.");
    const rob = meta(html(s), "name", "robots") ?? ""; const hasCanon = /<link\b[^>]*rel=["']canonical["']/i.test(html(s));
    if (/noindex/i.test(rob)) return R("fail", "The page tells Google not to list it (noindex).");
    if (!s.shared && s.robots && /^\s*disallow\s*:\s*\/\s*$/im.test(s.robots.split(/user-agent\s*:/i).find((g) => /^\s*\*/.test(g)) ?? "")) return R("fail", "robots.txt blocks all search engines.");
    return hasCanon ? R("pass", "Indexable with a canonical tag.") : R("partial", "Indexable, but no canonical tag.");
  } },
  { id: "sitemap", area: "seo", weight: 4, label: "Sitemap", run: (s) => {
    if (s.shared) return s.inSitemap ? R("pass", "This site is listed in the main saabai.ai sitemap.") : U(SHARED_MSG);
    if (s.sitemap === null) return U("Could not test.");
    const ref = !!s.robots && /sitemap\s*:/i.test(s.robots);
    if (s.sitemap) return R("pass", ref ? "Sitemap found and listed in robots.txt." : "Sitemap found at /sitemap.xml.");
    return R("fail", "No sitemap.xml found.");
  } },
  { id: "alt", area: "seo", weight: 3, label: "Image descriptions (alt text)", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const imgs = tag(html(s), /<img\b[^>]*>/gi); if (!imgs.length) return R("pass", "No images to describe.");
    const ok = imgs.filter((i) => /\balt\s*=\s*["'][^"']+["']/i.test(i)).length; const p = ok / imgs.length;
    return p >= 0.9 ? R("pass", `${ok} of ${imgs.length} images have alt text.`) : p >= 0.5 ? R("partial", `${ok} of ${imgs.length} images have alt text.`) : R("fail", `Only ${ok} of ${imgs.length} images have alt text.`);
  } },
  { id: "social_tags", area: "seo", weight: 2, label: "Social sharing preview", run: (s) => {
    if (noHead(s)) return U(jsMsg(s));
    const t = meta(html(s), "property", "og:title"), i = meta(html(s), "property", "og:image");
    return t && i ? R("pass", "Share title and image set.") : t || i ? R("partial", `Missing the share ${t ? "image" : "title"}.`) : R("fail", "No social share title or image.");
  } },
  { id: "schema", area: "ai", weight: 8, label: "Business schema (structured data)", run: (s) => {
    if (noHead(s)) return U(jsMsg(s));
    const biz = jsonLd(html(s)).filter((n) => types(n).some((t) => /LocalBusiness|Organization|Store|Service|Professional|Restaurant|Dentist|Attorney|Plumber|Electrician|Contractor|Agency|Agent|Business|Company|Corporation|Shop|Clinic|Practice|Broker|Lawyer|Accountant|Physician|Salon|Studio|Repair/i.test(t)));
    if (!biz.length) return R("fail", "No business structured data, so AI tools and Google must guess what you do.");
    const n = biz[0]; const full = !!n.name && !!n.address && !!(n.telephone || n.url);
    return full ? R("pass", "Business schema with name, address and contact details.") : R("partial", "Business schema found but missing name, address or phone.");
  } },
  { id: "answers", area: "ai", weight: 7, label: "Answer-style content (FAQ)", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const a = all(s); const faqSchema = jsonLd(a).some((n) => types(n).includes("FAQPage"));
    const faq = /\bfaq\b|frequently asked|<details\b/i.test(a) || tag(a, /<h[2-4][^>]*>([^<]*\?)\s*<\/h[2-4]>/gi).length >= 2;
    return faq && faqSchema ? R("pass", "FAQ content with FAQ schema.") : faq ? R("partial", "FAQ content but no FAQ schema.") : R("fail", "No FAQ or question-style content that AI tools can quote.");
  } },
  { id: "ai_bots", area: "ai", weight: 7, label: "AI tools allowed in", run: (s) => {
    if (s.shared) return U(SHARED_MSG);
    if (s.robotsBlocksUs) return U("The site asks bots not to scan it.");
    if (s.robots === null) return R("pass", "No robots.txt rules, so AI crawlers are not blocked.");
    const b = blockedBots(s.robots);
    return b.length === 0 ? R("pass", "AI crawlers are allowed.") : b.length >= AI_BOTS.length - 1 ? R("fail", `Blocks AI tools (${b.join(", ")}).`) : R("partial", `Blocks some AI tools (${b.join(", ")}).`);
  } },
  { id: "llms", area: "ai", weight: 3, label: "AI summary file (llms.txt)", run: (s) => {
    if (s.shared) return U(SHARED_MSG);
    if (!s.llms) return U("Could not test.");
    return s.llms.found ? (s.llms.empty ? R("partial", "llms.txt exists but is empty.") : R("pass", "llms.txt found.")) : R("fail", "No llms.txt file.");
  } },
  { id: "who_what_where", area: "ai", weight: 5, label: "Clear who, what and where", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const t = text(html(s)).toLowerCase(); const { name, suburb, industry } = s.input;
    const who = name ? nameMatch(t + " " + (html(s).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""), name) : /<title/i.test(html(s));
    const where = suburb ? t.includes(suburb.toLowerCase()) : /\b(qld|nsw|vic|wa|sa|tas|nt|act|australia|brisbane|sydney|melbourne|perth|adelaide|gold coast)\b/.test(t);
    const what = industry ? t.split(/\W+/).some((w) => w.length > 3 && industry.toLowerCase().includes(w)) || t.includes(industry.toLowerCase()) : t.length > 300;
    const n = [who, what, where].filter(Boolean).length;
    const miss = [!who && "business name", !what && "what you do", !where && "where you work"].filter(Boolean).join(", ");
    return n === 3 ? R("pass", "Name, service and area are all on the homepage.") : n === 2 ? R("partial", `Homepage does not clearly state: ${miss}.`) : R("fail", `Homepage does not clearly state: ${miss}.`);
  } },
  { id: "nap", area: "local", weight: 7, label: "Name, address and phone (NAP)", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const a = all(s); const t = text(a);
    const phone = /(?:\+?61|\b0)[\s-]?[2-478](?:[\s-]?\d){8}\b|\b1[38]00[\s-]?\d{3}[\s-]?\d{3}\b|tel:/i.test(a);
    const addr = /\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Pde|Parade|Ct|Court|Pl|Place|Way|Cres|Crescent|Hwy|Highway|Blvd|Lane|Ln)\b|\b(QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\s+\d{4}\b/.test(t) || jsonLd(a).some((n) => !!n.address);
    const name = s.input.name ? nameMatch(t, s.input.name) : true;
    const suburbOk = s.input.suburb ? t.toLowerCase().includes(s.input.suburb.toLowerCase()) : true;
    if (phone && addr && name && suburbOk) return R("pass", "Name, address and phone are on the site.");
    if (!phone && !addr) return R("fail", "No phone number or address found on the site.");
    return R("partial", `Missing or unclear: ${[!phone && "phone", !addr && "address", !name && "business name", !suburbOk && `${s.input.suburb} (suburb)`].filter(Boolean).join(", ")}.`);
  } },
  { id: "local_signals", area: "local", weight: 5, label: "Local signals", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const a = all(s); const t = text(a).toLowerCase();
    const n = [s.input.suburb ? t.includes(s.input.suburb.toLowerCase()) : /service area|servicing|we service|areas we/.test(t), /google\.[a-z.]+\/maps|maps\.google|<iframe[^>]+map/i.test(a) || /get directions|find us/.test(t), /href=["']tel:/i.test(a)].filter(Boolean).length;
    return n === 3 ? R("pass", "Area named, map or directions, and click-to-call.") : n > 0 ? R("partial", `${n} of 3 local signals (area, map, click-to-call).`) : R("fail", "No area, map or click-to-call link.");
  } },
  { id: "reviews_site", area: "local", weight: 5, label: "Reviews shown on your site", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const a = all(s); const agg = jsonLd(a).some((n) => "aggregateRating" in n || types(n).includes("Review"));
    if (agg || /\d(\.\d)?\s*(\/\s*5|out of 5|stars?)/i.test(text(a)) || /review-?(carousel|widget)|elfsight|trustindex|testimonial.*rating/i.test(a)) return R("pass", "Customer reviews with a rating are visible.");
    return /testimonial|what (our )?(clients|customers) say|reviews?/i.test(text(a)) ? R("partial", "Testimonials or a reviews mention, but no star rating shown.") : R("fail", "No customer reviews visible.");
  } },
  { id: "gbp", area: "local", weight: 10, label: "Google Business Profile", run: (s) => {
    const a = all(s); const linked = /google\.[a-z.]+\/maps\/place|g\.page\/|g\.co\/kgs|search\.google\.com\/local|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google\//i.test(a);
    const g = s.input.gbp;
    if (g && (g.rating !== undefined || g.reviews !== undefined)) {
      const c = [linked, (g.rating ?? 0) >= 4.5, (g.reviews ?? 0) >= 20, g.newestDaysAgo !== undefined && g.newestDaysAgo <= 30].filter(Boolean).length;
      const f = `Rating ${g.rating ?? "?"}, ${g.reviews ?? "?"} reviews${g.newestDaysAgo !== undefined ? `, newest ${g.newestDaysAgo} days ago` : ""}${linked ? ", profile linked from the site" : ", not linked from the site"}.`;
      return c === 4 ? R("pass", f) : c >= 1 ? R("partial", f) : R("fail", f);
    }
    return linked ? R("partial", "A Google profile or review link is on your site. Rating and recency could not be checked from public data.") : U("No Google profile link found on your site, so it could not be checked.");
  } },
  { id: "social_links", area: "local", weight: 3, label: "Social links", run: (s) => {
    if (noHome(s)) return U(jsMsg(s));
    const n = ["facebook.com", "instagram.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com"].filter((d) => new RegExp(`(href=["'][^"']*|["'])https?:\\/\\/(www\\.)?${d.replace(".", "\\.")}`, "i").test(all(s))).length;
    return n >= 2 ? R("pass", `${n} social profiles linked.`) : n === 1 ? R("partial", "One social profile linked.") : R("fail", "No social profiles linked.");
  } },
];
