import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWholesaleAdmin, WH_ADMIN_BASE, type WholesaleAdmin } from "../../../../lib/wholesale-admin-auth";

/** Server-side gate for the Wholesale admin pages. */
export async function requireWholesaleAdmin(): Promise<WholesaleAdmin> {
  const admin = await getWholesaleAdmin(await cookies());
  if (!admin) redirect(`${WH_ADMIN_BASE}/login`);
  return admin;
}
