/**
 * Admin-only gate for money routes (payments, invoices, subscriptions, sell, billing clients).
 * Full admins only: restricted staff with a "billing" grant are refused, even though proxy.ts lets them
 * reach the area. Returns the acting admin id (for the audit log) or null.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, resolveStaff, verifySessionToken } from "../auth";

export async function moneyAdmin(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const staff = await resolveStaff(session.clientId).catch(() => null);
  if (staff?.grant.role !== "admin") return null;
  return staff.email || session.clientId;
}

/** Refusal for a money route: 401 when there is no valid session, 403 when signed in but not a full admin. */
export async function moneyDeny(): Promise<NextResponse> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token).catch(() => null) : null;
  return session
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
