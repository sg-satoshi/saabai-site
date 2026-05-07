import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { Resend } from "resend";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import {
  listPendingRequests,
  deletePendingRequest,
  savePortalUser,
} from "../../../../lib/portal-users";

export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session?.clientId === ADMIN_ID;
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await listPendingRequests();
  return Response.json({ pending });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    action: "approve" | "deny";
    email: string;
    name?: string;
    password?: string;
    dashboardUrl?: string;
  };

  if (body.action === "deny") {
    await deletePendingRequest(body.email);
    return Response.json({ ok: true });
  }

  if (body.action === "approve") {
    const { email, name = "", password, dashboardUrl = "/rex-dashboard" } = body;

    if (!password) return Response.json({ error: "Password required" }, { status: 400 });

    await savePortalUser({
      id:           email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      name, email, password, dashboardUrl,
      approvedAt:   new Date().toISOString(),
    });
    await deletePendingRequest(email);

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Saabai Portal <noreply@saabai.ai>",
        to:   email,
        subject: "Your Saabai portal access is ready",
        html: `<p>Hi ${name},</p><p>Your access has been approved. Log in at <a href="https://saabai.ai/login">saabai.ai/login</a> with this email address and the password provided to you.</p><p>Questions? Reply to this email.</p>`,
      }).catch(() => {});
    }

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
