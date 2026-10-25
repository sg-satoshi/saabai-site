import http from "node:http";
import https from "node:https";
import { checkUrl, resolvePublic, ScanUrlError, type Resolver } from "./ssrf";

export const SCAN_UA = "SaabaiScanner/1.0 (+https://www.saabai.ai/score)";
export const MAX_BYTES = 1_500_000;

export type FetchResult = {
  ok: boolean; status: number; url: string; headers: Record<string, string>; body: string; bytes: number; ms: number;
  error?: "dns" | "refused" | "timeout" | "blocked_url" | "too_many_redirects" | "other";
  redirectedTo?: string;
};

type Opts = { timeoutMs?: number; maxRedirects?: number; resolver?: Resolver; follow?: boolean; textOnly?: boolean; maxBytes?: number };

/** The only way the scanner touches the internet. Public IPs only, pinned per request, re-checked on every redirect. */
export async function safeFetch(rawUrl: string, o: Opts = {}): Promise<FetchResult> {
  const start = Date.now();
  const maxRedirects = o.maxRedirects ?? 3;
  let url: URL;
  try { url = checkUrl(new URL(rawUrl)); } catch { return fail("blocked_url", rawUrl, start); }
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let pin: { ip: string; family: 4 | 6 };
    try { pin = await resolvePublic(url.hostname, o.resolver); }
    catch (e) { return fail(e instanceof ScanUrlError && e.message === "DNS_NOT_FOUND" ? "dns" : "blocked_url", url.toString(), start); }
    const r = await once(url, pin, o, start);
    if (r.status >= 300 && r.status < 400 && r.headers.location && o.follow !== false) {
      if (hop === maxRedirects) return { ...r, ok: false, error: "too_many_redirects" };
      try { url = checkUrl(new URL(r.headers.location, url)); } catch { return fail("blocked_url", url.toString(), start); }
      continue;
    }
    return { ...r, redirectedTo: url.toString() !== rawUrl ? url.toString() : undefined };
  }
  return fail("too_many_redirects", rawUrl, start);
}

function fail(error: FetchResult["error"], url: string, start: number): FetchResult {
  return { ok: false, status: 0, url, headers: {}, body: "", bytes: 0, ms: Date.now() - start, error };
}

function once(url: URL, pin: { ip: string; family: 4 | 6 }, o: Opts, start: number): Promise<FetchResult> {
  return new Promise((resolve) => {
    const mod = url.protocol === "https:" ? https : http;
    let done = false;
    const finish = (r: FetchResult) => { if (!done) { done = true; resolve(r); } };
    const req = mod.request(
      url,
      {
        method: "GET", timeout: o.timeoutMs ?? 5000, servername: url.hostname,
        headers: { "user-agent": SCAN_UA, accept: "text/html,text/plain,application/xml;q=0.9,*/*;q=0.5", "accept-encoding": "identity" },
        // Pin the already validated IP so DNS cannot change between check and connect.
        lookup: ((_h: string, lo: { all?: boolean }, cb: (e: Error | null, a: unknown, f?: number) => void) => (lo && lo.all ? cb(null, [{ address: pin.ip, family: pin.family }]) : cb(null, pin.ip, pin.family))) as never,
      },
      (res) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        const ct = headers["content-type"] ?? "";
        const status = res.statusCode ?? 0;
        if (o.textOnly !== false && status < 300 && ct && !/text|xml|json/i.test(ct)) { res.destroy(); return finish({ ok: false, status, url: url.toString(), headers, body: "", bytes: 0, ms: Date.now() - start, error: "other" }); }
        const cap = o.maxBytes ?? MAX_BYTES;
        const chunks: Buffer[] = []; let bytes = 0;
        res.on("data", (c: Buffer) => { bytes += c.length; if (bytes <= cap) chunks.push(c); else { res.destroy(); } });
        const end = () => finish({ ok: status >= 200 && status < 300, status, url: url.toString(), headers, body: Buffer.concat(chunks).toString("utf8"), bytes: Math.min(bytes, cap), ms: Date.now() - start });
        res.on("end", end); res.on("close", end); res.on("error", end);
      },
    );
    req.on("timeout", () => { req.destroy(); finish(fail("timeout", url.toString(), start)); });
    req.on("error", (e: NodeJS.ErrnoException) => finish(fail(e.code === "ECONNREFUSED" ? "refused" : e.code === "ENOTFOUND" ? "dns" : "other", url.toString(), start)));
    req.end();
  });
}
