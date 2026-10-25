/**
 * Mint an xAI ephemeral client secret. The API key never leaves the server.
 * POST https://api.x.ai/v1/realtime/client_secrets
 * https://docs.x.ai/developers/model-capabilities/audio/ephemeral-tokens
 * The endpoint does not accept a session object, so voice and instructions
 * are applied by the browser in session.update after it connects.
 */

const TOKEN_URL = "https://api.x.ai/v1/realtime/client_secrets";

export type MintedToken = { ok: true; token: string; expiresAtMs: number | null };
export type MintFailed = { ok: false; status: number };

export function readEphemeralToken(body: unknown): { token: string; expiresAtMs: number | null } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested = record.client_secret && typeof record.client_secret === "object"
    ? (record.client_secret as Record<string, unknown>)
    : null;
  const candidates = [record.value, record.token, record.secret, nested?.value, nested?.token];
  if (typeof record.client_secret === "string") candidates.unshift(record.client_secret);
  const token = candidates.find((value) => typeof value === "string" && value.length >= 12 && !value.includes(" "));
  if (typeof token !== "string") return null;
  const expRaw = record.expires_at ?? nested?.expires_at;
  let expiresAtMs: number | null = null;
  if (typeof expRaw === "number" && Number.isFinite(expRaw)) {
    expiresAtMs = expRaw > 1e12 ? expRaw : expRaw * 1000;
  }
  return { token, expiresAtMs };
}

export async function mintVoiceToken(opts: {
  apiKey: string;
  ttlSeconds: number;
  fetchImpl?: typeof fetch;
}): Promise<MintedToken | MintFailed> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_after: { seconds: opts.ttlSeconds } }),
    });
  } catch {
    return { ok: false, status: 0 };
  }

  if (!response.ok) return { ok: false, status: response.status };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: response.status };
  }
  const parsed = readEphemeralToken(body);
  if (!parsed) return { ok: false, status: response.status };
  return { ok: true, token: parsed.token, expiresAtMs: parsed.expiresAtMs };
}
