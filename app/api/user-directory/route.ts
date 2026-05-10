import { NextRequest } from "next/server";
import { listDirectoryUsers, saveDirectoryUser, deleteDirectoryUser, getDirectoryUser } from "../../../lib/user-directory";
import { loadClients } from "../../../lib/clients";

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
    const { name, email, password, role = "user", dashboardUrl = "/rex-dashboard" } = body;

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
