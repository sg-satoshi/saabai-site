import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

// Minimal JWT signer for Google service account — no external deps
async function signJwt(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBuf = Buffer.from(pemBody, "base64");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(signingInput));
  return `${signingInput}.${Buffer.from(sig).toString("base64url")}`;
}

async function getGoogleAccessToken(): Promise<string | null> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;
  try {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }, sa.private_key);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slug, url: explicitUrl } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

    // Resolve URL — use custom domain if mapped
    let targetUrl = explicitUrl;
    if (!targetUrl) {
      const domainMap = await redis.hgetall<Record<string, string>>("saabai:domain-map");
      const customDomain = domainMap
        ? Object.entries(domainMap).find(([, v]) => v === slug)?.[0] ?? null
        : null;
      targetUrl = customDomain
        ? `https://${customDomain}/`
        : `https://www.saabai.ai/sites/${slug}`;
    }

    const token = await getGoogleAccessToken();
    if (!token) {
      return Response.json({
        ok: false,
        error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured",
        needsSetup: true,
      });
    }

    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: targetUrl, type: "URL_UPDATED" }),
    });

    const data = await res.json() as { urlNotificationMetadata?: unknown; error?: { message?: string } };
    if (!res.ok) {
      return Response.json({ ok: false, error: data.error?.message ?? `HTTP ${res.status}` });
    }

    return Response.json({ ok: true, url: targetUrl, result: data });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
