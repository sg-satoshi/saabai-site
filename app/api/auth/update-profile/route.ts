import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { loadClients } from "../../../../lib/clients";
import { listDirectoryUsers, saveDirectoryUser } from "../../../../lib/user-directory";

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
    const { name } = await req.json();

    if (!name || name.trim().length < 1) {
      return Response.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    // Env-var clients can't be updated via the API
    const envClient = loadClients().find((c) => c.id === clientId);
    if (envClient) {
      return Response.json(
        { error: "Your profile is managed through environment variables. Contact hello@saabai.ai to make changes." },
        { status: 400 }
      );
    }

    // Find the user in Redis directory
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (!dirUser) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    dirUser.name = name.trim();
    await saveDirectoryUser(dirUser);

    return Response.json({ ok: true, name: dirUser.name });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
