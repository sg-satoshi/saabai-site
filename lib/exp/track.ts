import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { EXP_COOKIE, isBot, parseExpCookie, privacySignal, type EventType } from "./core";
import { getExperiments } from "./config";

/** Server-only. Service role key never leaves the server; RLS has no anon policies. */
function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function recordEvent(experimentId: string, variantId: string, visitorId: string, type: EventType): Promise<boolean> {
  try {
    const c = db();
    if (!c) return false;
    const { error } = await c.rpc("exp_record_event", { p_experiment: experimentId, p_variant: variantId, p_visitor: visitorId, p_type: type });
    return !error;
  } catch { return false; }
}

export function cookieFromRequest(req: Request) {
  const raw = (req.headers.get("cookie") ?? "").split(/;\s*/).find((p) => p.startsWith(EXP_COOKIE + "="));
  return parseExpCookie(raw ? raw.slice(EXP_COOKIE.length + 1) : null);
}

/** Records a server-side conversion (form_submit) for every running experiment the visitor was assigned to. Never throws. */
export async function recordConversion(req: Request, type: EventType = "form_submit", siteKey = "saabai"): Promise<void> {
  try {
    if (isBot(req.headers.get("user-agent")) || privacySignal(req.headers)) return;
    const ck = cookieFromRequest(req);
    if (!ck) return;
    const exps = await getExperiments(siteKey);
    for (const e of exps) {
      const vid = ck.a[e.id];
      if (e.status === "running" && vid && e.variants.some((v) => v.id === vid)) await recordEvent(e.id, vid, ck.v, type);
    }
  } catch { /* tracking must never break a lead */ }
}

/** Per-IP-hash minute rate limit. Fails open. */
export async function rateLimited(req: Request, limit = 60): Promise<boolean> {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const h = createHash("sha256").update(ip + (process.env.SAABAI_SESSION_SECRET ?? "")).digest("hex").slice(0, 16);
    const r = Redis.fromEnv();
    const k = `saabai:exp:rl:${h}:${Math.floor(Date.now() / 60000)}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, 90);
    return n > limit;
  } catch { return false; }
}
