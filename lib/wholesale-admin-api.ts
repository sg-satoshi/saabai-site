import { NextResponse, type NextRequest } from "next/server";
import { getWholesaleAdmin, type WholesaleAdmin } from "./wholesale-admin-auth";

/**
 * Guard for /api/wholesale-admin/*. These routes are public in proxy.ts (so
 * they work on wholesalehomes.com.au, where there's no Saabai session) and
 * check the Wholesale admin session here instead.
 */
export async function requireWholesaleAdminApi(req: NextRequest): Promise<WholesaleAdmin | NextResponse> {
  const admin = await getWholesaleAdmin(req.cookies);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  return admin;
}
