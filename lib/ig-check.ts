/**
 * Instagram free site check. Reuses the Blueprint search crawl and rules.
 * Does not score anything itself, and does not POST.
 *
 * robots.txt is read before any HTML. A disallow for * or SaabaiScanner stops
 * the check. Blueprint's own crawl still fetches the homepage first; this
 * wrapper does not change that path.
 */

import { getRedis } from "./redis";
import { safeFetch, type FetchResult } from "./site-scan/safe-fetch";
import { parseTarget } from "./site-scan/ssrf";
import { robotsDisallowsUs } from "./site-scan/scan";
import { runBlueprintSearchAudit, type Fetcher } from "./blueprint/search-audit";
import {
  AREA_LABEL,
  FOLD_NOTE,
  SEARCH_LIMITS,
  pathBlockedByRobots,
  type SearchArea,
  type SearchAudit,
  type SearchClientInput,
} from "./blueprint/search-rules";
import type { IgSiteCheck } from "./ig-lead";

const LIMIT = 4;
const WINDOW_MS = 600_000;

const mem = new Map<string, { n: number; exp: number }>();

function memHit(key: string, ttlSec: number): number {
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.exp < now) {
    mem.set(key, { n: 1, exp: now + ttlSec * 1000 });
    if (mem.size > 5000) for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
    return 1;
  }
  cur.n += 1;
  return cur.n;
}

async function hit(key: string, ttlSec: number): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, ttlSec);
      return n;
    } catch {
      /* memory fallback */
    }
  }
  return memHit(key, ttlSec);
}

/** True when this IP has started more than 4 site checks in the current 10 minutes. */
export async function igCheckLimited(ip: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const n = await hit(`ig-check:10m:${ip}:${bucket}`, 660);
  return n > LIMIT;
}

/** A * or SaabaiScanner rule that disallows this path. Uses the existing robots helpers. */
export function instagramRobotsBlock(robots: string, path: string): boolean {
  if (!robots.trim()) return false;
  if (robotsDisallowsUs(robots) || pathBlockedByRobots(robots, path)) return true;
  const asStar = robots.replace(/user-agent\s*:\s*saabaiscanner/gi, "User-agent: *");
  return asStar !== robots && pathBlockedByRobots(asStar, path);
}

function unread(summary: string): IgSiteCheck {
  return { read: false, score: null, fixes: [], checked: [], pages: 0, summary, foldNote: null };
}

function clientFromBusiness(business?: string): SearchClientInput {
  const name = (business ?? "").trim().slice(0, 200);
  if (!name) return {};
  return { name, overview: name };
}

function shape(audit: SearchAudit): IgSiteCheck {
  if (audit.mode === "unread") {
    const note = audit.unreadNote?.trim();
    return unread(note ? `We couldn't read your site. ${note}` : "We couldn't read your site. Nothing was guessed, and there is no score.");
  }
  const checked = (Object.keys(AREA_LABEL) as SearchArea[])
    .filter((area) => audit.areas[area] !== null)
    .map((area) => AREA_LABEL[area]);
  const fixes = [...audit.quickWins, ...audit.ownerDecisions]
    .slice(0, 3)
    .map((c) => ({ what: c.what, why: c.why }));
  const n = audit.pagesCrawled.length;
  const pages = `We opened ${n} page${n === 1 ? "" : "s"} with read-only requests${audit.capped ? " and stopped at the page cap" : ""}.`;
  const areas = checked.length ? `Checked ${checked.join(", ")}.` : "No section had enough evidence to score.";
  const scoreBit = audit.overall === null
    ? "There was not enough evidence for a score out of 100. Nothing was guessed."
    : `Overall ${audit.overall} out of 100. ${audit.weightingNote}`;
  return {
    read: true,
    score: audit.overall,
    fixes,
    checked,
    pages: n,
    summary: `${scoreBit} ${pages} ${areas}`,
    foldNote: FOLD_NOTE,
  };
}

/**
 * One public website. Throws ScanUrlError for an address we will not open.
 * A robots disallow returns unread and does not fetch HTML.
 */
export async function runInstagramSiteCheck(args: {
  url: string;
  business?: string;
  fetch?: Fetcher;
}): Promise<IgSiteCheck> {
  const target = parseTarget(args.url);
  const fetchImpl: Fetcher = args.fetch ?? safeFetch;
  try {
    const robots: FetchResult = await fetchImpl(`${target.origin}/robots.txt`, { timeoutMs: SEARCH_LIMITS.fetchTimeoutMs });
    if (robots.ok && instagramRobotsBlock(robots.body, target.pathname || "/")) {
      return unread("We couldn't read your site. Its robots.txt asks scanners to stay out, so no pages were opened and there is no score.");
    }
    const audit = await runBlueprintSearchAudit({
      url: target.toString(),
      client: clientFromBusiness(args.business),
      fetch: fetchImpl,
    });
    return shape(audit);
  } catch {
    return unread("We couldn't read your site. Nothing was guessed, and there is no score.");
  }
}
