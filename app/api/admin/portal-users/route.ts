import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import {
  listPendingRequests,
  deletePendingRequest,
} from "../../../../lib/portal-users";
import { getDirectoryUser, saveDirectoryUser } from "../../../../lib/user-directory";
import { hashPassword, generateRandomPassword, validateNewPassword } from "../../../../lib/password";
import { sendWelcomeEmail } from "../../../../lib/account-emails";
import { safeRedirect } from "../../../../lib/safe-redirect";

export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session?.clientId === ADMIN_ID;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await listPendingRequests();
  return Response.json({ pending });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
    const email = (body.email || "").trim().toLowerCase();
    const { name = "", password } = body;
    if (!email || !email.includes("@")) return Response.json({ error: "Email required" }, { status: 400 });
    const dashboardUrl = safeRedirect(body.dashboardUrl, "/dashboard");

    // Password is optional: blank means they choose their own from the
    // welcome email's single-use set-password link.
    if (password) {
      const invalid = validateNewPassword(password);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
    }

    if (await getDirectoryUser(email)) {
      await deletePendingRequest(email);
      return Response.json({ error: "This email already has an account. Request cleared." }, { status: 409 });
    }

    // Approved people go into the same user store /login reads, with a hashed
    // password, so they can actually sign in.
    const now = new Date().toISOString();
    await saveDirectoryUser({
      id: email.replace(/[^a-z0-9]/g, "-"),
      name: name || email,
      email,
      password: await hashPassword(password || generateRandomPassword()),
      role: "user",
      dashboardUrl,
      approvedAt: now,
      createdAt: now,
    });
    await deletePendingRequest(email);

    await sendWelcomeEmail({
      name: name || "there",
      email,
      subject: "Your Saabai portal access is ready",
      intro: "Your access request has been approved.",
    });

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
