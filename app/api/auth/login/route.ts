import { type NextRequest } from "next/server";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";
import { authenticateWithPassword } from "../../../../lib/password-auth";
import { safeRedirect } from "../../../../lib/safe-redirect";
import { resolveStaff } from "../../../../lib/auth";
import { recordLogin } from "../../../../lib/login-stamp";
import { getRedis } from "../../../../lib/redis";
import { createHash } from "crypto";
import { isTwoFactorEnabled, isTotpEnrolled, createPendingToken, pendingCookieHeader, TRUST_COOKIE, verifyTrustToken } from "../../../../lib/admin-2fa";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

/** Failed-attempt throttle per email and per IP. Fails open if Redis is down. */
async function tooManyAttempts(email: string, ip: string, bump: boolean): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const keys = [`login:fail:e:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`, `login:fail:ip:${ip}`];
  try {
    if (bump) {
      for (const k of keys) {
        const n = await redis.incr(k);
        if (n === 1) await redis.expire(k, WINDOW_SECONDS);
      }
      return false;
    }
    const counts = await Promise.all(keys.map((k) => redis.get<number>(k)));
    return counts.some((n) => (n ?? 0) >= MAX_ATTEMPTS);
  } catch {
    return false;
  }
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email    = formData.get("email")?.toString()    ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirect = safeRedirect(formData.get("redirect")?.toString(), "");

  // Env-var clients first, then Redis directory users. Legacy plaintext
  // passwords are verified in constant time and upgraded to a hash here.
  // Admin sign-in (/saabai-admin/login) posts admin=1: only admin accounts may
  // get a session through it.
  const adminOnly = formData.get("admin")?.toString() === "1";
  const loginPath = adminOnly ? "/saabai-admin/login" : "/login";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  if (await tooManyAttempts(email, ip, false)) {
    const loginUrl = new URL(loginPath, req.url);
    loginUrl.searchParams.set("error", "locked");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

  let auth = await authenticateWithPassword(email, password);
  const staff = auth ? await resolveStaff(auth.clientId) : null; // null for disabled / expired / non-staff
  if (auth && adminOnly && !staff) auth = null;

  if (!auth) {
    await tooManyAttempts(email, ip, true);
    const loginUrl = new URL(loginPath, req.url);
    loginUrl.searchParams.set("error", "invalid");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

  // Admins with 2FA get a code step unless this browser is trusted for 30 days.
  // Restricted staff: the code step is mandatory once enrolled (no trusted-device skip, no env break-glass).
  // Unenrolled restricted staff still get a session, but proxy.ts confines it to the enrol page.
  if (staff) {
    const restricted = staff.grant.role !== "admin";
    const needsCode = restricted ? await isTotpEnrolled(auth.clientId) : await isTwoFactorEnabled(auth.clientId);
    if (needsCode) {
      const trusted = !restricted && verifyTrustToken(req.cookies.get(TRUST_COOKIE)?.value, auth.clientId);
      if (!trusted) {
        const verifyUrl = new URL("/saabai-admin/login/verify", req.url);
        return new Response(null, {
          status: 303,
          headers: {
            Location: verifyUrl.toString(),
            "Set-Cookie": pendingCookieHeader(createPendingToken(auth.clientId, redirect || "/saabai-admin")),
          },
        });
      }
    }
  }

  await recordLogin(auth.clientId);
  const token = await createSessionToken(auth.clientId);

  // If there's an explicit redirect (user came from a protected page), honour it.
  // Otherwise send to the unified /dashboard hub.
  const destination = redirect || "/dashboard";
  const destUrl     = new URL(destination, req.url).toString();

  return new Response(null, {
    status: 303,
    headers: {
      Location:    destUrl,
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}
