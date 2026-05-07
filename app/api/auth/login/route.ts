import { type NextRequest } from "next/server";
import { loadClients, findClientByCredentials } from "../../../../lib/clients";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";
import { getPortalUser } from "../../../../lib/portal-users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email    = formData.get("email")?.toString()    ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirect = formData.get("redirect")?.toString() ?? "";

  // Check env-var clients first, then Redis-backed portal users
  const clients     = loadClients();
  const envClient   = findClientByCredentials(clients, email, password);
  const redisUser   = envClient ? null : await getPortalUser(email);
  const isRedisAuth = !envClient && redisUser?.password === password;

  if (!envClient && !isRedisAuth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

  const clientId    = envClient ? envClient.id : redisUser!.id;
  const dashboardUrl = envClient ? envClient.dashboardUrl : redisUser!.dashboardUrl;

  const token       = await createSessionToken(clientId);
  const destination = redirect && redirect.startsWith("/") ? redirect : dashboardUrl;
  const destUrl     = new URL(destination, req.url).toString();

  return new Response(null, {
    status: 303,
    headers: {
      Location:    destUrl,
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}
