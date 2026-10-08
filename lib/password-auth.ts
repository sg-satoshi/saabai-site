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
import { getPortalUser } from "./portal-users";

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
  if (!dirUser && !envClient) {
    // 3. Legacy portal approvals (portal:users) that were never written to the
    //    directory, so these people could not sign in. Migrate on success.
    const migrated = await tryLegacyPortalUser(email, password);
    if (migrated) return migrated;
  }
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
export async function upgradeStoredPassword(email: string, previousStored: string, password: string): Promise<boolean> {
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

/**
 * Older portal-access approvals were saved to portal:users, which login never
 * read. If this email only exists there and the password matches, move the
 * person into the directory (hashed) and sign them in. Never throws.
 */
async function tryLegacyPortalUser(email: string, password: string): Promise<AuthResult | null> {
  try {
    const legacy = await getPortalUser(email);
    if (!legacy?.password) return null;
    const res = await verifyPassword(password, legacy.password);
    if (!res.ok) return null;
    const now = new Date().toISOString();
    const user = {
      id: email.replace(/[^a-z0-9]/g, "-"),
      name: legacy.name || email,
      email,
      password: await hashPassword(password),
      role: "user" as const,
      dashboardUrl: legacy.dashboardUrl || "/dashboard",
      approvedAt: legacy.approvedAt || now,
      createdAt: now,
    };
    await saveDirectoryUser(user);
    return { clientId: user.id, dashboardUrl: user.dashboardUrl, source: "directory", upgraded: true };
  } catch (err) {
    console.error("[password-auth] legacy portal user check failed", err instanceof Error ? err.name : "unknown error");
    return null;
  }
}
