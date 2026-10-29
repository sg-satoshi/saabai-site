/**
 * Who may call /api/leadgen/config. Mirrors the /leadgen/portal page's client lookup so the
 * portal's own-record PATCH keeps working, while list and create stay full-admin only.
 */
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isAdminSession, verifySessionToken } from "./auth";

export type LeadgenConfigAccess =
  | { kind: "anon" }
  | { kind: "admin" }
  | { kind: "client"; leadgenId: string }
  | { kind: "none" };

const LEADGEN_PREFIX = "leadgen_";

export async function leadgenConfigAccess(req: NextRequest): Promise<LeadgenConfigAccess> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return { kind: "anon" };
  const { clientId } = session;
  if (await isAdminSession(clientId)) return { kind: "admin" };
  try {
    if (clientId.startsWith(LEADGEN_PREFIX)) return { kind: "client", leadgenId: clientId.slice(LEADGEN_PREFIX.length) };
    const { listDirectoryUsers } = await import("./user-directory");
    const user = (await listDirectoryUsers()).find((u) => u.id === clientId);
    if (user?.email) {
      const { listClients } = await import("./leadgen-config");
      const mine = (await listClients()).find((c) => (c.email || "").toLowerCase() === user.email.toLowerCase());
      if (mine) return { kind: "client", leadgenId: mine.id };
    }
  } catch {
    /* fail closed */
  }
  return { kind: "none" };
}
