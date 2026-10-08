import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getWholesaleSession, wholesaleBasePath, WH_COOKIE, type WholesaleSession } from "../../../../lib/wholesale-auth";
import { getWholesaleAdmin } from "../../../../lib/wholesale-admin-auth";

/**
 * Server-side gate for the Wholesale Homes members area. Call from a server
 * layout. Lets in a signed-in Wholesale client, or (read-only preview) a
 * Wholesale admin or Saabai admin; everyone else goes to the client login.
 */
export async function requireWholesaleClient(): Promise<WholesaleSession> {
  const jar = await cookies();
  const session = await getWholesaleSession(jar.get(WH_COOKIE)?.value);
  if (session) return session;

  const admin = await getWholesaleAdmin(jar);
  if (admin) return { email: admin.email, name: "Admin preview", source: "admin-preview" };

  const base = wholesaleBasePath((await headers()).get("host"));
  redirect(`${base}/client-login`);
}
