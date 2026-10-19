/**
 * Safety helpers for Mia's chat route (/api/chat).
 * Pure functions where possible so they can be unit tested.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getRedis } from "./redis";

const MAX_PART = 2000;
const MAX_MESSAGES = 40;

type Incoming = { role?: unknown; content?: unknown; parts?: unknown };

/** Keep only user/assistant text. Client-supplied "system" (or any other) roles are dropped. */
export function sanitizeMessages(messages: unknown): { role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[] {
  if (!Array.isArray(messages)) return [];
  const out: { role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[] = [];
  for (const m of messages.slice(-MAX_MESSAGES) as Incoming[]) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    let text = "";
    if (Array.isArray(m.parts)) {
      text = m.parts
        .map((p) => (p && typeof p === "object" && (p as { type?: unknown }).type === "text" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : ""))
        .join(" ");
    } else if (typeof m.content === "string") {
      text = m.content;
    }
    text = text.trim().slice(0, MAX_PART);
    if (text) out.push({ role: m.role, parts: [{ type: "text", text }] });
  }
  return out;
}

const oneLine = (v: unknown, n: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f`]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
  return s || undefined;
};

/** Whitelist and clean the localStorage visitor profile before it goes into the system prompt. */
export function sanitizeVisitorProfile(p: unknown): Record<string, unknown> | undefined {
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  const r = p as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const name = oneLine(r.name, 60);
  const business = oneLine(r.business, 160);
  const industry = oneLine(r.industry, 60);
  const team = oneLine(r.team_size, 40);
  if (name) out.name = name;
  if (business) out.business = business;
  if (industry) out.industry = industry;
  if (team) out.team_size = team;
  if (Array.isArray(r.pain_points)) {
    const pp = r.pain_points.map((x) => oneLine(x, 120)).filter((x): x is string => !!x).slice(0, 6);
    if (pp.length) out.pain_points = pp;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Page context must look like a site path. Anything else is dropped. */
export function sanitizePageContext(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().split("?")[0].split("#")[0];
  return /^\/[A-Za-z0-9\-_./]{0,100}$/.test(s) ? s : undefined;
}

// ── SSRF-safe fetch ──────────────────────────────────────────────────────────

export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
    return l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe8") || l.startsWith("fe9") || l.startsWith("fea") || l.startsWith("feb");
  }
  return true;
}

/** Throws unless the URL is plain http(s) on a standard port and resolves only to public addresses. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("bad url"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
  if (u.username || u.password) throw new Error("credentials in url");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("bad port");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) throw new Error("blocked host");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("blocked ip");
    return u;
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("blocked ip");
  return u;
}

/** Fetch with manual redirects (max 3), each hop re-checked, 8s timeout, ~400KB cap. */
export async function safeFetchText(raw: string, maxChars = 4000): Promise<{ url: string; text: string }> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(url);
    const res = await fetch(u, {
      redirect: "manual",
      headers: { "User-Agent": "Saabai-Mia/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("bad redirect");
      url = new URL(loc, u).toString();
      continue;
    }
    if (!res.ok) throw new Error(`http ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !/text\/|html|xml|json/i.test(ct)) throw new Error("not text");
    const reader = res.body?.getReader();
    let html = "";
    let bytes = 0;
    if (reader) {
      const dec = new TextDecoder();
      while (bytes < 400_000) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += dec.decode(value, { stream: true });
      }
      reader.cancel().catch(() => {});
    }
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
    return { url: u.toString(), text };
  }
  throw new Error("too many redirects");
}

/** The model may only fetch a URL the visitor actually typed. */
export function urlWasShared(url: string, messages: { role: string; parts: { text: string }[] }[]): boolean {
  const norm = (s: string) => s.replace(/\/+$/, "").toLowerCase();
  const target = norm(url);
  return messages
    .filter((m) => m.role === "user")
    .some((m) => m.parts.some((p) => (p.text.match(/https?:\/\/[^\s<>"')]+/gi) ?? []).some((f) => norm(f.replace(/[.,;!?]+$/, "")) === target)));
}

// ── Global daily cap and kill switch ─────────────────────────────────────────

/**
 * Returns a message to show instead of a reply, or null to proceed.
 * MIA_CHAT_DISABLED=1 is a kill switch. MIA_DAILY_CAP (default 1500) caps chat requests per day, site-wide.
 */
export async function miaGlobalGate(): Promise<string | null> {
  if (process.env.MIA_CHAT_DISABLED === "1") {
    return "I'm offline for a bit. Please try again later, or take the free 3 minute AI score at saabai.ai/score.";
  }
  const cap = Number(process.env.MIA_DAILY_CAP) > 0 ? Number(process.env.MIA_DAILY_CAP) : 1500;
  const redis = getRedis();
  if (!redis) return null;
  try {
    const key = `mia:daily:${new Date().toISOString().slice(0, 10)}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 26 * 3600);
    if (n > cap) {
      return "I've had a very busy day and need a breather. Please come back tomorrow, or take the free 3 minute AI score at saabai.ai/score.";
    }
  } catch {
    /* fail open */
  }
  return null;
}
