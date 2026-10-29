/**
 * Which LeadGen client a signed-in Saabai session owns. Same mapping as app/leadgen/portal/page.tsx:
 * a `leadgen_<id>` session owns <id>; a directory user owns the LeadGen client with the same email.
 * Admins may act on any client.
 */
import { cookies } from "next/headers";
import { COOKIE_NAME, isAdminSession, verifySessionToken } from "./auth";
import { listClients } from "./leadgen-config";
import { listDirectoryUsers } from "./user-directory";

const LEADGEN_PREFIX = "leadgen_";

import { mayActOnLeadGenClient, type LeadGenAccess } from "./leadgen-owner-rule";
export { mayActOnLeadGenClient, type LeadGenAccess };

export async function leadGenAccessFromCookies(): Promise<LeadGenAccess> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const { clientId } = session;
  if (await isAdminSession(clientId)) return { kind: "admin" };
  if (clientId.startsWith(LEADGEN_PREFIX)) return { kind: "owner", clientId: clientId.slice(LEADGEN_PREFIX.length) };
  const dirUser = (await listDirectoryUsers()).find((u) => u.id === clientId);
  if (!dirUser?.email) return null;
  const match = (await listClients()).find((c) => (c.email || "").toLowerCase() === dirUser.email.toLowerCase());
  return match ? { kind: "owner", clientId: match.id } : null;
}
