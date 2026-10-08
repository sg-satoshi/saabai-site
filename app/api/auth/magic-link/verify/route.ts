/**
 * POST /api/auth/magic-link/verify  (form field: token)
 * Consumes a one-time sign-in token and sets the normal client session cookie.
 *
 * This is a POST from the /login/magic confirm page (not a GET on the emailed
 * link) so email link scanners that pre-fetch URLs can't burn the token.
 */
import { createSessionToken, sessionCookieHeader } from "../../../../../lib/auth";
import { consumeMagicLink } from "../../../../../lib/client-magic-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let token: unknown = null;
  try {
    const form = await req.formData();
    token = form.get("token")?.toString();
  } catch {
    /* invalid body */
  }

  const record = await consumeMagicLink(token);
  if (!record) {
    return new Response(null, {
      status: 303,
      headers: { Location: new URL("/login?error=link", req.url).toString(), "Cache-Control": "no-store" },
    });
  }

  const session = await createSessionToken(record.clientId);
  return new Response(null, {
    status: 303,
    headers: {
      // record.redirect is already validated to a same-origin relative path
      Location: new URL(record.redirect, req.url).toString(),
      "Set-Cookie": sessionCookieHeader(session),
      "Cache-Control": "no-store",
    },
  });
}
