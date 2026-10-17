import { randomUUID } from "node:crypto";
import { CHECKS } from "./checks";
import { safeFetch, type FetchResult } from "./safe-fetch";
import { parseTarget, ScanUrlError, type Resolver } from "./ssrf";
import { buildReport, noWebsiteReport } from "./score";
import type { Input, ScanReport, Snapshot } from "./types";

type Fetcher = (url: string, o?: { follow?: boolean; timeoutMs?: number; resolver?: Resolver }) => Promise<FetchResult>;

/** Does robots.txt ask all bots (or ours) to stay out of the whole site? */
export function robotsDisallowsUs(robots: string): boolean {
  let applies = false, last = false;
  for (const raw of robots.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, "").trim().match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim().toLowerCase();
    if (k === "user-agent") { if (!last) applies = false; applies = applies || v === "*" || v === "saabaiscanner"; last = true; }
    else { last = false; if (applies && k === "disallow" && v === "/") return true; }
  }
  return false;
}

const looksEmpty = (h: string) => { const t = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return t.length < 200 && /<script/i.test(h); };

export async function runScan(rawUrl: string, input: Input = {}, deps: { fetch?: Fetcher; now?: Date } = {}): Promise<ScanReport> {
  const f: Fetcher = deps.fetch ?? safeFetch;
  const target = parseTarget(rawUrl); // throws ScanUrlError on bad or unsafe input
  const id = randomUUID();
  const domain = target.hostname.replace(/^www\./, "");
  const origin = target.origin;
  const budget = 5000;
  const [home, robotsR, sitemapR, llmsR, httpR] = await Promise.all([
    f(target.toString(), { timeoutMs: 8000 }),
    f(`${origin}/robots.txt`, { timeoutMs: budget }),
    f(`${origin}/sitemap.xml`, { timeoutMs: budget }),
    f(`${origin}/llms.txt`, { timeoutMs: budget }),
    f(`http://${target.hostname}/`, { follow: false, timeoutMs: budget }),
  ]);
  // One retry on a flaky first load so a slow moment is not reported as "blocked".
  if (!home.ok && (home.error === "timeout" || home.error === "other")) { const again = await f(target.toString(), { timeoutMs: 8000 }); if (again.ok) Object.assign(home, again); }
  const gone = (r: FetchResult) => r.error === "dns" || r.error === "refused" || r.status === 404 || r.status === 410;
  if (gone(home)) return noWebsiteReport({ id, domain, url: target.toString(), input, reason: `We could not find a working website at ${domain}.`, now: deps.now });
  if (!home.ok && (home.error === "blocked_url")) throw new ScanUrlError("That address cannot be scanned.");
  if (!home.ok) {
    const why = [401, 403, 429].includes(home.status) || home.status >= 500 ? "The site blocked or refused our scan" : home.error === "timeout" ? "The site took too long to answer" : "We could not read the site";
    return { ...noWebsiteReport({ id, domain, url: target.toString(), input, now: deps.now }), mode: "blocked", overall: null, areas: { seo: null, ai: null, local: null }, fixes: [], quickWins: [], offer: "blueprint", offerReason: "We could not scan the site, so we have not scored it.", message: `${why}. We have not scored it. Try again, or tell us about your business and we will review it by hand.` };
  }
  const robots = robotsR.ok ? robotsR.body : null;
  const base = home.redirectedTo || home.url || target.toString();
  // up to 2 linked pages (contact, about) for NAP and local signals
  const links = [...home.body.matchAll(/href=["']([^"'#?]+)["']/gi)].map((m) => m[1]).filter((h) => /contact|about/i.test(h) && !/^(mailto|tel):/i.test(h));
  const uniq: string[] = [];
  for (const l of links) { try { const u = new URL(l, base); if (u.hostname.replace(/^www\./, "") === domain && !uniq.includes(u.toString())) uniq.push(u.toString()); } catch { /* skip */ } if (uniq.length >= 2) break; }
  const extraR = await Promise.all(uniq.map((u) => f(u, { timeoutMs: budget })));
  const snap: Snapshot = {
    input, finalUrl: base, host: domain,
    home: { status: home.status, html: home.body, ms: home.ms, bytes: home.bytes },
    httpsOk: new URL(base).protocol === "https:" ? true : false,
    httpRedirects: httpR.status >= 300 && httpR.status < 400 ? /^https:/i.test(httpR.headers.location ?? "") : httpR.status ? false : null,
    robots, robotsBlocksUs: !!robots && robotsDisallowsUs(robots),
    sitemap: sitemapR.status ? sitemapR.ok && /<(urlset|sitemapindex)/i.test(sitemapR.body) : null,
    llms: llmsR.status ? { found: llmsR.ok && !/<html/i.test(llmsR.body.slice(0, 500)), empty: llmsR.ok && llmsR.body.trim().length < 20 } : null,
    extra: extraR.filter((r) => r.ok).map((r) => r.body).join("\n"),
    jsHeavy: looksEmpty(home.body),
  };
  const results = CHECKS.map((def) => ({ def, r: def.run(snap) }));
  return buildReport({ id, domain, url: base, results, input, now: deps.now });
}
export { noWebsiteReport };
