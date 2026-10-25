import { sendCapiEvent, type CapiEventName } from "@/lib/marketing/capi";
import { marketingHostMode } from "@/lib/marketing/public";

export const runtime = "nodejs";

const BROWSER_EVENTS = new Set<CapiEventName>(["PageView", "ViewContent", "Lead", "Schedule", "Contact", "LachieDemoStart"]);

const hits = new Map<string, { n: number; exp: number }>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

function limited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.exp < now) {
    hits.set(ip, { n: 1, exp: now + 60_000 });
    if (hits.size > 5000) for (const [key, value] of hits) if (value.exp < now) hits.delete(key);
    return false;
  }
  cur.n += 1;
  return cur.n > 60;
}

function originHost(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return;
  return trimmed;
}

function sourceUrl(value: unknown): string | undefined {
  const raw = str(value, 500);
  if (!raw) return;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    if (!marketingHostMode(url.hostname)) return;
    return url.toString();
  } catch {
    return;
  }
}

/**
 * Browser half of Meta dedup. Purchase is not accepted here: Stripe webhooks send that.
 * No-ops when the pixel id or access token is unset. Does not log the body.
 */
export async function POST(req: Request) {
  const host = originHost(req);
  if (!host || !marketingHostMode(host)) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const ip = clientIp(req);
  if (limited(ip)) return Response.json({ ok: true, sent: false });

  const raw = await req.text();
  if (raw.length > 8000) return Response.json({ ok: false }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("bad");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const eventName = body.eventName;
  if (typeof eventName !== "string" || !BROWSER_EVENTS.has(eventName as CapiEventName)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const eventId = str(body.eventId, 120);
  if (!eventId) return Response.json({ ok: false }, { status: 400 });

  const contentIds = Array.isArray(body.contentIds)
    ? body.contentIds.filter((id): id is string => typeof id === "string").slice(0, 8)
    : undefined;
  const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : undefined;

  const result = await sendCapiEvent({
    eventName: eventName as CapiEventName,
    eventId,
    eventSourceUrl: sourceUrl(body.eventSourceUrl),
    email: str(body.email, 254),
    phone: str(body.phone, 32),
    fbp: str(body.fbp, 200),
    fbc: str(body.fbc, 220),
    clientIp: ip,
    userAgent: req.headers.get("user-agent") || undefined,
    value,
    currency: value !== undefined ? "AUD" : undefined,
    contentName: str(body.contentName, 120),
    contentCategory: str(body.contentCategory, 40),
    contentIds,
    contentType: str(body.contentType, 40),
  });

  return Response.json({ ok: true, sent: result.sent });
}
