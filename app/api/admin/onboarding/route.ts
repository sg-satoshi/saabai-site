/**
 * GET /api/admin/onboarding
 * Per-client onboarding step and status. Full admin only.
 */
import { NextRequest } from "next/server";
import { COOKIE_NAME, isAdminSession, verifySessionToken } from "../../../../lib/auth";
import { listOnboardingProgress } from "../../../../lib/portal-onboarding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session ? isAdminSession(session.clientId) : false;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const clients = await listOnboardingProgress();
    return Response.json({ clients });
  } catch (err) {
    console.error("[admin/onboarding]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not load onboarding progress." }, { status: 500 });
  }
}
