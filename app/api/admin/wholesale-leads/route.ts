import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { deleteWholesaleRegistrations } from "../../../../lib/site-leads";

// Node runtime: session checks use WebCrypto, same as the other admin handlers.
// /api/admin is admin-gated in proxy.ts (full admins only; this path is not
// in a grantable area). The handler checks again so a direct call cannot skip it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function gate(req: NextRequest): Promise<Response | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminSession(session.clientId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function DELETE(req: NextRequest) {
  const denied = await gate(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const leads = body && typeof body === "object" ? (body as { leads?: unknown }).leads : undefined;
  if (!Array.isArray(leads) || leads.length === 0 || leads.length > 100) {
    return Response.json({ error: "Choose between 1 and 100 registrations" }, { status: 400 });
  }

  const targets: { email: string; createdAt: number }[] = [];
  for (const item of leads) {
    if (!item || typeof item !== "object") {
      return Response.json({ error: "Each registration needs an email and a time" }, { status: 400 });
    }
    const rawEmail = (item as { email?: unknown }).email;
    const createdAt = (item as { createdAt?: unknown }).createdAt;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !EMAIL.test(email) || typeof createdAt !== "number" || !Number.isFinite(createdAt)) {
      return Response.json({ error: "Each registration needs an email and a time" }, { status: 400 });
    }
    targets.push({ email, createdAt });
  }

  try {
    const deleted = await deleteWholesaleRegistrations(targets);
    if (deleted === 0) return Response.json({ error: "Registration not found" }, { status: 404 });
    return Response.json({ success: true, deleted });
  } catch (error) {
    console.error("Wholesale registration delete error:", error);
    return Response.json({ error: "Failed to delete registration" }, { status: 500 });
  }
}
