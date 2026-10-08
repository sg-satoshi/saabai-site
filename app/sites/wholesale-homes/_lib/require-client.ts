import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getWholesaleSession, wholesaleBasePath, WH_COOKIE, type WholesaleSession } from "../../../../lib/wholesale-auth";

/**
 * Server-side gate for the Wholesale Homes members area. Call from a server
 * layout; redirects to the client login when there's no valid session.
 */
export async function requireWholesaleClient(): Promise<WholesaleSession> {
  const session = await getWholesaleSession((await cookies()).get(WH_COOKIE)?.value);
  if (!session) {
    const base = wholesaleBasePath((await headers()).get("host"));
    redirect(`${base}/client-login`);
  }
  return session;
}
