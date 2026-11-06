/**
 * Lex document allowance counts. Full admins only. Read-only.
 *   GET /api/admin/lex-doc-usage                       -> firm periods that started this Brisbane month
 *   GET /api/admin/lex-doc-usage?month=2026-10         -> periods that started that month
 *   GET /api/admin/lex-doc-usage?email=jo@firm.com.au  -> that user's firm, current period
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { firmKeyForEmail } from "../../../../lib/lex-review-access";
import { brisbaneMonth, docPeriodForUser, docUsage, monthlyDocCounts, FIRM_PLAN_MONTHLY_DOCS } from "../../../../lib/lex-doc-allowance";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  return !!s && (await isAdminSession(s.clientId));
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!getRedis()) return Response.json({ error: "store_unavailable" }, { status: 503 });
  const q = new URL(req.url).searchParams;
  const email = q.get("email")?.trim().toLowerCase();
  if (email && email.includes("@")) {
    const p = await docPeriodForUser(email, firmKeyForEmail(email), new Date(), () => {});
    return Response.json({ planDefault: FIRM_PLAN_MONTHLY_DOCS, scope: p.scope, usage: await docUsage(p) });
  }
  const m = q.get("month");
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : brisbaneMonth();
  return Response.json({ month, planDefault: FIRM_PLAN_MONTHLY_DOCS, periods: await monthlyDocCounts(month) });
}
