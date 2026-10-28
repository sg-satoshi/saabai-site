/**
 * Handler-side helpers for the access model (route handlers and server components only; never import in proxy.ts).
 */
import { cookies, headers } from "next/headers";
import { ACL_HEADER, aclHeaderValue, safeEq } from "./access";
import { COOKIE_NAME, isAdminSession, resolveStaff, verifySessionToken } from "./auth";

/**
 * Full admin, OR restricted staff whose request proxy.ts already approved for this exact method and path
 * (HMAC header only the server can mint). Replace isAdminSession with this ONLY in handlers whose area is
 * grantable (see lib/access.ts). Handlers that keep isAdminSession stay admin-only.
 */
export async function isAdminOrGranted(clientId: string): Promise<boolean> {
  if (await isAdminSession(clientId)) return true;
  try {
    const got = (await headers()).get(ACL_HEADER);
    if (!got) return false;
    if (!safeEq(got, await aclHeaderValue(clientId))) return false;
    return !!(await resolveStaff(clientId)); // still active right now
  } catch {
    return false;
  }
}

/** Signed-in staff identity for audit stamping (id, email, name). Never trusts request body. */
export async function currentActor(): Promise<{ id: string; email?: string; name?: string; role: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  if (!s) return null;
  const st = await resolveStaff(s.clientId);
  return st ? { id: st.id, email: st.email, name: st.name, role: st.grant.role } : null;
}

/** Display label for audit entries such as authorName: "Name <email>" or the account id. */
export async function actorLabel(fallback = "Admin"): Promise<string> {
  const a = await currentActor();
  if (!a) return fallback;
  return a.email ? `${a.name || a.id} <${a.email}>`.slice(0, 160) : a.id.slice(0, 160);
}

/** Name a client may see. Never includes an email address. */
export async function actorDisplayName(fallback = "Saabai"): Promise<string> {
  const a = await currentActor();
  if (!a) return fallback;
  const name = (a.name || "").replace(/\s*<[^>]*>/g, "").replace(/[^\s<>]+@[^\s<>]+/g, "").trim();
  return (name || fallback).slice(0, 80);
}
