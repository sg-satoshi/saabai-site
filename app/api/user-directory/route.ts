import { NextRequest } from "next/server";
import { listDirectoryUsers, saveDirectoryUser, deleteDirectoryUser, getDirectoryUser } from "../../../lib/user-directory";
import { loadClients } from "../../../lib/clients";
import { getRedis } from "../../../lib/redis";

export const runtime = "edge";

export async function GET() {
  try {
    const redisUsers = await listDirectoryUsers();
    const envClients = loadClients().map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: "user",
      source: "env",
      dashboardUrl: c.dashboardUrl,
    }));

    return Response.json({ success: true, users: [...redisUsers, ...envClients] });
  } catch (error) {
    console.error("List users error:", error);
    return Response.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role = "user", dashboardUrl = "/rex-dashboard", products } = body;

    if (!name || !email || !password) {
      return Response.json({ error: "Name, email, and password required" }, { status: 400 });
    }

    const existing = await getDirectoryUser(email);
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const user = {
      id: email.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name,
      email: email.toLowerCase(),
      password,
      role,
      dashboardUrl,
      ...(Array.isArray(products) ? { products } : {}),
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDirectoryUser(user);
    return Response.json({ success: true, user });
  } catch (error) {
    console.error("Create user error:", error);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalEmail, name, email, password, role, dashboardUrl, products } = body;
    if (!originalEmail) return Response.json({ error: "originalEmail required" }, { status: 400 });

    const existing = await getDirectoryUser(originalEmail);
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });

    const newEmail = (email || originalEmail).toLowerCase();
    const updated = {
      ...existing,
      name: name ?? existing.name,
      email: newEmail,
      role: role ?? existing.role,
      dashboardUrl: dashboardUrl ?? existing.dashboardUrl,
      ...(Array.isArray(products) ? { products } : {}),
      ...(password ? { password } : {}),
    };

    // If email changed, delete old key first
    if (newEmail !== originalEmail.toLowerCase()) {
      const redis = getRedis();
      if (redis) await redis.hdel("saabai:users", originalEmail.toLowerCase());
    }

    await saveDirectoryUser(updated);
    return Response.json({ success: true, user: { ...updated, password: undefined } });
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
