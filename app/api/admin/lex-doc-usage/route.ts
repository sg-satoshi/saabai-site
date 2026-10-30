/**
 * Lex document allowance per firm per Brisbane calendar month. Full admins only. Read-only.
 *   GET /api/admin/lex-doc-usage                     -> this month, every firm that drafted
 *   GET /api/admin/lex-doc-usage?month=2026-10       -> that month
 *   GET /api/admin/lex-doc-usage?firm=example.com.au -> that firm this month (or ?month=)
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { firmKeyForEmail } from "../../../../lib/lex-review-access";
import { brisbaneMonth, docCapForFirm, monthlyDocCounts, usedKey, FIRM_PLAN_MONTHLY_DOCS } from "../../../../lib/lex-doc-allowance";
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
  const q = new URL(req.url).searchParams;
  const m = q.get("month");
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : brisbaneMonth();
  const redis = getRedis();
  if (!redis) return Response.json({ error: "store_unavailable" }, { status: 503 });
  const f = q.get("firm");
  if (f) {
    const firm = firmKeyForEmail(f.includes("@") ? f : `x@${f}`);
    const used = Number((await redis.get<number | string>(usedKey(firm, month))) ?? 0) || 0;
    return Response.json({ month, planDefault: FIRM_PLAN_MONTHLY_DOCS, firms: [{ firm, used, cap: await docCapForFirm(firm) }] });
  }
  return Response.json({ month, planDefault: FIRM_PLAN_MONTHLY_DOCS, firms: await monthlyDocCounts(month) });
}
