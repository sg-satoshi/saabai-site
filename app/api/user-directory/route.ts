import { NextRequest } from "next/server";
import { runAfterResponse } from "../../../lib/run-after";
import { listDirectoryUsers, saveDirectoryUser, deleteDirectoryUser, getDirectoryUser } from "../../../lib/user-directory";
import { loadClients } from "../../../lib/clients";
import { getRedis } from "../../../lib/redis";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import { hashPassword, generateRandomPassword, validateNewPassword, withoutPassword } from "../../../lib/password";
import { sendWelcomeEmail } from "../../../lib/account-emails";

// Node runtime: password hashing uses Node's crypto.scrypt.
export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

// Defense-in-depth: middleware already gates /api/user-directory to admins,
// but this directory controls who can log in, so the handler verifies too.
async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session?.clientId === ADMIN_ID;
}

const FORBIDDEN = () => Response.json({ error: "Forbidden" }, { status: 403 });

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return FORBIDDEN();
  try {
    const redisUsers = await listDirectoryUsers();
    // Never expose stored passwords in the directory listing.
    const safeUsers = redisUsers.map((u) => withoutPassword(u));
    const envClients = loadClients().map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: "user",
      source: "env",
      dashboardUrl: c.dashboardUrl,
    }));

    return Response.json({ success: true, users: [...safeUsers, ...envClients] });
  } catch (error) {
    console.error("List users error:", error);
    return Response.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return FORBIDDEN();
  try {
    const body = await req.json();
    const { name, email, password, role = "user", dashboardUrl = "/rex-dashboard", products, siteId, sendInvite } = body;

    if (!name || !email || typeof email !== "string") {
      return Response.json({ error: "Name and email required" }, { status: 400 });
    }
    // Password is optional: leave it blank and the welcome email lets the user
    // choose their own via a single-use set-password link.
    if (password) {
      const invalid = validateNewPassword(password);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
    }

    const existing = await getDirectoryUser(email);
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const user = {
      id: email.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name,
      email: email.toLowerCase(),
      password: await hashPassword(password || generateRandomPassword()),
      role,
      dashboardUrl,
      ...(Array.isArray(products) ? { products } : {}),
      ...(typeof siteId === "string" && siteId ? { siteId: siteId.slice(0, 100) } : {}),
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDirectoryUser(user);

    // Welcome email never contains a password, only a set-password link.
    const inviteQueued = sendInvite === true || !password;
    if (inviteQueued) {
      runAfterResponse(() => sendWelcomeEmail({ name: user.name, email: user.email, mentionMagicLink: user.role !== "admin" }));
    }
    return Response.json({ success: true, inviteQueued, user: withoutPassword(user) });
  } catch (error) {
    console.error("Create user error:", error);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return FORBIDDEN();
  try {
    const body = await req.json();
    const { originalEmail, name, email, password, role, dashboardUrl, products, siteId } = body;
    if (!originalEmail) return Response.json({ error: "originalEmail required" }, { status: 400 });

    const existing = await getDirectoryUser(originalEmail);
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });

    if (password) {
      const invalid = validateNewPassword(password);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
    }

    const newEmail = (email || originalEmail).toLowerCase();
    const updated = {
      ...existing,
      name: name ?? existing.name,
      email: newEmail,
      role: role ?? existing.role,
      dashboardUrl: dashboardUrl ?? existing.dashboardUrl,
      ...(Array.isArray(products) ? { products } : {}),
      ...(password ? { password: await hashPassword(password) } : {}),
    };
    // siteId: string links the client to a website; "" unlinks; undefined leaves it.
    if (typeof siteId === "string") {
      if (siteId) updated.siteId = siteId.slice(0, 100);
      else delete updated.siteId;
    }

    // If email changed, delete old key first
    if (newEmail !== originalEmail.toLowerCase()) {
      const redis = getRedis();
      if (redis) await redis.hdel("saabai:users", originalEmail.toLowerCase());
    }

    await saveDirectoryUser(updated);
    return Response.json({ success: true, user: withoutPassword(updated) });
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return FORBIDDEN();
  try {
    const { email } = await req.json();
    if (!email) return Response.json({ error: "Email required" }, { status: 400 });

    await deleteDirectoryUser(email);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
