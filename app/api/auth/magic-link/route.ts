/**
 * POST /api/auth/magic-link  { email, redirect? }
 * Emails a one-time sign-in link to an existing CLIENT account.
 * Always responds { ok: true } (same body, same timing) so it can't be used to
 * discover which emails have accounts. The lookup + send runs after the
 * response via next/server `after()`.
 */
import { after } from "next/server";
import { processMagicLinkRequest } from "../../../../lib/client-magic-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let email: unknown = null;
  let redirect: unknown = null;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      email = body?.email;
      redirect = body?.redirect;
    } else {
      const form = await req.formData();
      email = form.get("email")?.toString();
      redirect = form.get("redirect")?.toString();
    }
  } catch {
    /* fall through to the identical response */
  }

  after(() => processMagicLinkRequest(email, redirect));
  return Response.json({ ok: true });
}
