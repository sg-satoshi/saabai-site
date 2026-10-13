/**
 * POST /api/admin/portal-invite
 * Admin-only: send a branded "Your Saabai portal is ready" email with a fresh
 * magic link to a customer. Never emails the client unless an admin asks.
 */
import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import {
  createMagicLink,
  findEligibleClient,
} from "../../../../lib/client-magic-link";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../lib/email/branded-layout";
import { portalWelcomeInviteEmail } from "../../../../lib/email/templates";
import { savePortalUser, getPortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session?.clientId === ADMIN_ID;
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const business = typeof body.business === "string" ? body.business.trim() : "";

  if (!email.includes("@") || email.length > 254) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  // Hard block: never send a portal invite to Stu from this endpoint by accident
  // in local QA. Production still sends when an admin explicitly asks, except
  // we leave the guard as a soft check on the well-known Stu address when
  // PORTAL_INVITE_BLOCK_STU=true (set in preview scripts only).
  if (
    process.env.PORTAL_INVITE_BLOCK_STU === "true" &&
    email === "stuscyclerepairs@gmail.com"
  ) {
    return Response.json({ error: "Invite to Stu is blocked for this environment." }, { status: 403 });
  }

  let client = await findEligibleClient(email);
  if (!client) {
    // Ensure they can sign in: create a portal user if admin is inviting them.
    const existingDir = await getDirectoryUser(email);
    const existingPortal = await getPortalUser(email);
    if (!existingDir && !existingPortal) {
      await savePortalUser({
        id: `invite-${email.replace(/[^a-z0-9]/g, "-").slice(0, 40)}`,
        name: name || email.split("@")[0],
        email,
        password: "",
        dashboardUrl: "/client-portal",
        approvedAt: new Date().toISOString(),
      });
    }
    client = await findEligibleClient(email);
  }

  if (!client) {
    return Response.json(
      { error: "Could not resolve a portal account for that email." },
      { status: 400 },
    );
  }

  const token = await createMagicLink(client, "/client-portal");
  if (!token) {
    return Response.json({ error: "Could not create magic link (Redis unavailable)." }, { status: 503 });
  }

  const link = `${baseUrl()}/client-portal/auth?token=${encodeURIComponent(token)}`;
  const emailPayload = portalWelcomeInviteEmail({
    name: name || client.name || client.email,
    business: business || undefined,
    link,
  });

  const sent = await sendBrandedEmail({
    to: client.email,
    email: emailPayload,
    from: EMAIL_BRAND.fromPortal,
  });

  if (!sent) {
    return Response.json({ error: "Email could not be sent (check RESEND_API_KEY)." }, { status: 502 });
  }

  return Response.json({
    ok: true,
    to: client.email,
    subject: emailPayload.subject,
  });
}
