/**
 * Resolve the currently logged-in CLIENT (dashboard user) from the session
 * cookie to their name + email. Mirrors the resolution in app/dashboard/page.tsx.
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "./auth";
import { loadClients } from "./clients";
import { listDirectoryUsers } from "./user-directory";

export interface ClientSession {
  clientId: string;
  name: string;
  email: string;
}

export async function getClientSession(): Promise<ClientSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  const envClient = loadClients().find((c) => c.id === session.clientId);
  if (envClient) return { clientId: session.clientId, name: envClient.name, email: envClient.email };

  const users = await listDirectoryUsers();
  const u = users.find((x) => x.id === session.clientId);
  if (u) return { clientId: session.clientId, name: u.name, email: u.email };

  return { clientId: session.clientId, name: "", email: "" };
}
