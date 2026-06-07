import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { loadClients } from "../../../../lib/clients";
import { getDirectoryUser, saveDirectoryUser, listDirectoryUsers } from "../../../../lib/user-directory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const { clientId } = session;
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check env-var clients first
    const envClient = loadClients().find((c) => c.id === clientId);
    if (envClient) {
      if (envClient.password !== currentPassword) {
        return Response.json({ error: "Current password is incorrect." }, { status: 403 });
      }
      // Env-var clients can't be updated via the API — they need Vercel env var changes
      return Response.json(
        { error: "Your password is managed through environment variables. Contact hello@saabai.ai to change it." },
        { status: 400 }
      );
    }

    // Check Redis user directory
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (!dirUser) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    if (dirUser.password !== currentPassword) {
      return Response.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    dirUser.password = newPassword;
    await saveDirectoryUser(dirUser);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
