import { NextResponse, type NextRequest } from "next/server";
import { requireWholesaleAdminApi } from "../../../../lib/wholesale-admin-api";
import { listSiteLeads } from "../../../../lib/site-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wholesale Homes leads, for the Wholesale admin only. */
export async function GET(req: NextRequest) {
  const admin = await requireWholesaleAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  try {
    const leads = await listSiteLeads("wholesale-homes");
    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error("Wholesale leads fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leads" }, { status: 500 });
  }
}
