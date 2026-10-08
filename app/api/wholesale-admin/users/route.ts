import { NextResponse, type NextRequest } from "next/server";
import { requireWholesaleAdminApi } from "../../../../lib/wholesale-admin-api";
import { listDirectoryUsers } from "../../../../lib/user-directory";
import { isWholesaleAccount } from "../../../../lib/wholesale-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wholesale Homes client accounts only (never other Saabai clients), no passwords. */
export async function GET(req: NextRequest) {
  const admin = await requireWholesaleAdminApi(req);
  if (admin instanceof NextResponse) return admin;
  try {
    const users = (await listDirectoryUsers())
      .filter((u) => isWholesaleAccount(u))
      .map((u) => ({ name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, approvedAt: u.approvedAt }));
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Wholesale users fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
