import { NextRequest } from "next/server";
import { runAfterResponse } from "../../../lib/run-after";
import { listDirectoryUsers, saveDirectoryUser, deleteDirectoryUser, getDirectoryUser } from "../../../lib/user-directory";
import { loadClients } from "../../../lib/clients";
import { getRedis } from "../../../lib/redis";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import { sanitizeGrant, type AccessGrant } from "../../../lib/access";
import { hashPassword, generateRandomPassword, validateNewPassword, withoutPassword } from "../../../lib/password";
import { sendWelcomeEmail } from "../../../lib/account-emails";

// Node runtime: password hashing uses Node's crypto.scrypt.
export const runtime = "nodejs";


// Defense-in-depth: middleware already gates /api/user-directory to admins,
// but this directory controls who can log in, so the handler verifies too.
async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session ? isAdminSession(session.clientId) : false;
}

/** Signed-in full-admin id (for lock-out protection), or null. */
async function adminId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session && (await isAdminSession(session.clientId)) ? session.clientId : null;
}

const ROLES = ["admin", "staff", "user"] as const;
type Role = (typeof ROLES)[number];

/**
 * Turn the form's role + access block into stored fields. "admin" stays a legacy-shaped full admin (access only
 * kept when an expiry or disable flag is set). "staff" = restricted: needs a viewer/custom grant.
 */
function resolveRoleAccess(role: Role, rawAccess: unknown): { role: Role; access?: AccessGrant } | { error: string } {
  if (role === "user") return { role };
  const g = sanitizeGrant(role === "staff" ? rawAccess : { ...(rawAccess as object), role: "admin" });
  if (role === "staff") {
    if (!g || g.role === "admin") return { error: "Staff accounts need a viewer or custom access level" };
    return { role, access: g };
  }
  return { role, ...(g && (g.expiresAt || g.disabled) ? { access: { role: "admin" as const, kind: "internal" as const, ...(g.expiresAt ? { expiresAt: g.expiresAt } : {}), ...(g.disabled ? { disabled: true } : {}) } } : {}) };
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
    const { name, email, password, role = "user", dashboardUrl = "/rex-dashboard", products, siteId, sendInvite, access } = body;
    if (!ROLES.includes(role)) return Response.json({ error: "Invalid role" }, { status: 400 });
    const ra = resolveRoleAccess(role, access);
    if ("error" in ra) return Response.json({ error: ra.error }, { status: 400 });

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
      role: ra.role,
      ...(ra.access ? { access: ra.access } : {}),
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
      runAfterResponse(() => sendWelcomeEmail({ name: user.name, email: user.email, mentionMagicLink: user.role === "user" }));
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
    const { originalEmail, name, email, password, role, dashboardUrl, products, siteId, access, disabled } = body;
    if (!originalEmail) return Response.json({ error: "originalEmail required" }, { status: 400 });

    const existing = await getDirectoryUser(originalEmail);
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });

    if (password) {
      const invalid = validateNewPassword(password);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
    }

    const newEmail = (email || originalEmail).toLowerCase();
    // Role / access: recompute only when the caller sent them. "disabled" alone is the one-click enable/disable.
    let nextRole: Role = existing.role;
    let nextAccess: AccessGrant | undefined = existing.access;
    if (role !== undefined || access !== undefined) {
      const r: Role = role ?? existing.role;
      if (!ROLES.includes(r)) return Response.json({ error: "Invalid role" }, { status: 400 });
      const ra = resolveRoleAccess(r, access ?? existing.access);
      if ("error" in ra) return Response.json({ error: ra.error }, { status: 400 });
      nextRole = ra.role;
      nextAccess = ra.access;
    }
    if (typeof disabled === "boolean" && nextRole !== "user") {
      const base: AccessGrant = nextAccess ?? { role: "admin", kind: "internal" };
      const { disabled: _d, ...rest } = base; void _d;
      nextAccess = disabled ? { ...rest, disabled: true } : (rest.role === "admin" && !rest.expiresAt ? undefined : rest);
    }
    // Lock-out protection: you cannot demote, disable or expire your own account.
    const me = await adminId(req);
    if (me && me === existing.id) {
      const stillFull = nextRole === "admin" && !(nextAccess?.disabled) && !nextAccess?.expiresAt;
      if (!stillFull) return Response.json({ error: "You can't demote, disable or expire your own account" }, { status: 400 });
    }
    const updated = {
      ...existing,
      name: name ?? existing.name,
      email: newEmail,
      role: nextRole,
      dashboardUrl: dashboardUrl ?? existing.dashboardUrl,
      ...(Array.isArray(products) ? { products } : {}),
      ...(password ? { password: await hashPassword(password) } : {}),
    } as typeof existing;
    if (nextAccess) updated.access = nextAccess;
    else delete updated.access;
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
    const target = await getDirectoryUser(email);
    const me = await adminId(req);
    if (me && target && target.id === me) return Response.json({ error: "You can't delete your own account" }, { status: 400 });

    await deleteDirectoryUser(email);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
