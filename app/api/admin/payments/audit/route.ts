/** GET /api/admin/payments/audit  money action audit log, newest first. Full admins only. */
import { NextRequest, NextResponse } from "next/server";
import { moneyAdmin } from "../../../../../lib/billing/money-auth";
import { listMoneyAudit } from "../../../../../lib/billing/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await moneyAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "200", 10) || 200));
  return NextResponse.json({ entries: await listMoneyAudit(limit) });
}
