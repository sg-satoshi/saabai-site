import { saveDirectoryUser, getDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "edge";

export async function POST() {
  try {
    // Check if any users exist
    const existing = await getDirectoryUser("shane@saabai.ai");
    if (existing) {
      return Response.json({ success: true, message: "Admin already exists" });
    }

    const user = {
      id: "shane-goldberg",
      name: "Shane Goldberg",
      email: "shane@saabai.ai",
      password: "Saabai2026!",
      role: "admin" as const,
      dashboardUrl: "/saabai-admin",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDirectoryUser(user);
    return Response.json({ success: true, message: "Admin user created" });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json({ error: "Setup failed" }, { status: 500 });
  }
}
