import { type NextRequest } from "next/server";
import { loadClients, findClientByCredentials } from "../../../../lib/clients";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email    = formData.get("email")?.toString()    ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirect = formData.get("redirect")?.toString() ?? "";

  const clients = loadClients();
  const client  = findClientByCredentials(clients, email, password);

  if (!client) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

  const token       = await createSessionToken(client.id);
  const destination = redirect && redirect.startsWith("/") ? redirect : client.dashboardUrl;
  const destUrl     = new URL(destination, req.url).toString();

  return new Response(null, {
    status: 303,
    headers: {
      Location:   destUrl,
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}
