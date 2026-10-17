/** Cloudflare Turnstile for the public scan. Env: TURNSTILE_SITE_KEY (public) and TURNSTILE_SECRET_KEY (private). Both missing = no bot check (graceful). */
export const turnstileSiteKey = (): string | null => (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null);

type Fetch = typeof fetch;
/** True when the visitor may proceed. If the keys are not set the check is skipped. A set secret with a missing or bad token fails closed. */
export async function verifyTurnstile(token: unknown, ip: string | null, f: Fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.TURNSTILE_SITE_KEY) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await f("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch { return false; }
}
