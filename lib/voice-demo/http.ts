import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { VOICE_COPY, VOICE_VISITOR_COOKIE, voiceCapMessage } from "./config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function voiceOriginAllowed(req: { headers: { get(name: string): string | null } }): boolean {
  const host = (req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const origin = req.headers.get("origin");
  if (!origin) return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function hashVoiceIp(ip: string, pepper: string): string {
  return createHash("sha256").update(`${ip}|${pepper}`).digest("hex").slice(0, 24);
}

function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0].trim();
  return first || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function cookieValue(req: { headers: { get(name: string): string | null } }, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    try {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function voicePepper(): string {
  return process.env.SAABAI_SESSION_SECRET || process.env.PORTAL_SESSION_SECRET || "saabai-voice-demo";
}

export function voiceRequestContext(req: { headers: { get(name: string): string | null } }): {
  visitorId: string;
  ipHash: string;
  setCookie: boolean;
} {
  const existing = cookieValue(req, VOICE_VISITOR_COOKIE);
  const visitorId = existing && UUID.test(existing) ? existing : randomUUID();
  return {
    visitorId,
    ipHash: hashVoiceIp(clientIp(req), voicePepper()),
    setCookie: visitorId !== existing,
  };
}

export function withVoiceCookie(res: NextResponse, visitorId: string, setCookie: boolean): NextResponse {
  if (!setCookie) return res;
  res.cookies.set({
    name: VOICE_VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}

export function voiceJson(body: Record<string, unknown>, status: number, ctx?: { visitorId: string; setCookie: boolean }): NextResponse {
  const res = NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
  if (ctx) withVoiceCookie(res, ctx.visitorId, ctx.setCookie);
  return res;
}

export function capResponse(reason: "visitor" | "site" | "busy" | "locked", ctx: { visitorId: string; setCookie: boolean }): NextResponse {
  const error = reason === "locked" ? "busy" : reason;
  return voiceJson({ ok: false, error, message: voiceCapMessage(reason) }, 429, ctx);
}

export function unavailableResponse(message: string = VOICE_COPY.unavailable, status = 503): NextResponse {
  return voiceJson({ ok: false, error: "unavailable", message }, status);
}

export async function readJsonBody(req: Request, max = 100_000): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (!text) return {};
  if (text.length > max) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readSessionAuth(body: Record<string, unknown> | null): { sessionId: string; secret: string } | null {
  if (!body) return null;
  const sessionId = body.sessionId;
  const secret = body.secret;
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return null;
  if (typeof secret !== "string" || secret.length < 20 || secret.length > 200) return null;
  return { sessionId, secret };
}
