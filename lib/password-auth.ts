/**
 * Email + password authentication for Saabai accounts (Node runtime only).
 *
 * Order matches the original login route: env-var clients first, then Redis
 * directory users. Directory users whose password is still stored as plain
 * text are transparently upgraded to a scrypt hash on their next successful
 * login. A failure to save the upgrade never blocks the login.
 */
import { loadClients } from "./clients";
import { getDirectoryUser, saveDirectoryUser } from "./user-directory";
import { hashPassword, verifyPassword } from "./password";

export interface AuthResult {
  clientId: string;
  dashboardUrl: string;
  source: "env" | "directory";
  /** True when a legacy plaintext password was re-hashed during this login. */
  upgraded: boolean;
}

export async function authenticateWithPassword(rawEmail: string, password: string): Promise<AuthResult | null> {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email || !password) {
    await verifyPassword("x", undefined); // keep timing consistent
    return null;
  }

  // 1. Env-var clients (read-only; value may be plaintext or a scrypt hash).
  const envClient = loadClients().find((c) => c.email.toLowerCase() === email);
  if (envClient) {
    const res = await verifyPassword(password, envClient.password);
    if (res.ok) {
      return { clientId: envClient.id, dashboardUrl: envClient.dashboardUrl, source: "env", upgraded: false };
    }
  }

  // 2. Redis directory users.
  const dirUser = await getDirectoryUser(email);
  const res = await verifyPassword(password, dirUser?.password);
  if (!dirUser || !res.ok) return null;

  let upgraded = false;
  if (res.needsRehash) {
    upgraded = await upgradeStoredPassword(email, dirUser.password, password);
  }
  return {
    clientId: dirUser.id,
    dashboardUrl: dirUser.dashboardUrl || "/rex-dashboard",
    source: "directory",
    upgraded,
  };
}

/**
 * Replace a legacy stored value with a fresh hash. Re-reads the user first and
 * only writes if the stored value is unchanged, so a concurrent password change
 * is never overwritten. Never throws.
 */
async function upgradeStoredPassword(email: string, previousStored: string, password: string): Promise<boolean> {
  try {
    const hashed = await hashPassword(password);
    const fresh = await getDirectoryUser(email);
    if (!fresh || fresh.password !== previousStored) return false;
    await saveDirectoryUser({ ...fresh, password: hashed });
    return true;
  } catch (err) {
    // Don't log err.message: Redis client errors echo the command, which would
    // include the new hash.
    console.error("[password-auth] could not upgrade stored password for a directory user", err instanceof Error ? err.name : "unknown error");
    return false;
  }
}
