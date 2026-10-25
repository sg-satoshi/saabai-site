import { getDirectoryUser, saveDirectoryUser, listDirectoryUsers } from "./user-directory";

/** Stamp lastLoginAt on a directory user after a successful sign-in. Never blocks or fails a login. */
export async function recordLogin(clientId: string): Promise<void> {
  try {
    if (!clientId || clientId.includes(":")) return;
    const u = (await listDirectoryUsers()).find((x) => x.id === clientId);
    if (!u || (u.role !== "admin" && u.role !== "staff")) return;
    const fresh = (await getDirectoryUser(u.email)) ?? u;
    await saveDirectoryUser({ ...fresh, lastLoginAt: new Date().toISOString() });
  } catch { /* never block a login */ }
}
