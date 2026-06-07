/**
 * Logout — Clears session cookie and redirects to /login
 */
import { redirect } from "next/navigation";
import { clearSessionCookieHeader } from "../../../../lib/auth";

export const runtime = "edge";

export async function POST() {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookieHeader());
  headers.append("Location", "/login");
  return new Response(null, { status: 303, headers });
}
