import { NextResponse, type NextRequest } from "next/server";
import { requireWholesaleAdminApi } from "../../../../lib/wholesale-admin-api";
import { approveWholesaleLead } from "../../../../lib/wholesale-approve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Approve a Wholesale lead from the Wholesale admin (same flow as Saabai admin). */
export async function POST(req: NextRequest) {
  const admin = await requireWholesaleAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await approveWholesaleLead(body ?? {});
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Wholesale approve error:", error);
    return NextResponse.json({ success: false, error: "Failed to approve lead" }, { status: 500 });
  }
}
