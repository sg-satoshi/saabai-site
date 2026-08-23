/**
 * GET /api/admin/customers
 * Unified customer directory — aggregates Lex, Site Factory, Stripe, LeadGen,
 * Portal, and AI Audit clients via lib/customers.ts.
 * Admin-only — requires valid saabai_session cookie.
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { listUnifiedCustomers } from "../../../../lib/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const customers = await listUnifiedCustomers();
  return Response.json({ customers, total: customers.length });
}
