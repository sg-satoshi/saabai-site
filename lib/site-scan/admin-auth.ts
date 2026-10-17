import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "@/lib/auth";

export async function isAdminRequest(): Promise<boolean> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    return session ? await isAdminSession(session.clientId) : false;
  } catch { return false; }
}
