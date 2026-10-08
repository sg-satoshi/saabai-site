import { type NextRequest } from "next/server";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";
import { authenticateWithPassword } from "../../../../lib/password-auth";
import { safeRedirect } from "../../../../lib/safe-redirect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email    = formData.get("email")?.toString()    ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirect = safeRedirect(formData.get("redirect")?.toString(), "");

  // Env-var clients first, then Redis directory users. Legacy plaintext
  // passwords are verified in constant time and upgraded to a hash here.
  const auth = await authenticateWithPassword(email, password);

  if (!auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

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
