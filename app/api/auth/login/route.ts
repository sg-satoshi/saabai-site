import { type NextRequest } from "next/server";
import { loadClients, findClientByCredentials } from "../../../../lib/clients";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";
import { getDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email    = formData.get("email")?.toString()    ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirect = formData.get("redirect")?.toString() ?? "";

  // Check env-var clients first, then Redis-backed users
  const clients     = loadClients();
  const envClient   = findClientByCredentials(clients, email, password);
  const dirUser     = await getDirectoryUser(email);
  const isDirAuth   = !envClient && dirUser?.password === password;

  if (!envClient && !isDirAuth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid");
    if (redirect) loginUrl.searchParams.set("redirect", redirect);
    return Response.redirect(loginUrl.toString(), 303);
  }

  const clientId    = envClient ? envClient.id : dirUser!.id;
  const dashboardUrl = envClient ? envClient.dashboardUrl : (dirUser!.dashboardUrl || "/rex-dashboard");

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
