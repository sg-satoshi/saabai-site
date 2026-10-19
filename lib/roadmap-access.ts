/** Server-only: may the signed-in staff member edit the roadmap? (UI hint; the proxy and handlers enforce for real.) */
import { cookies } from "next/headers";
import { levelFor } from "./access";
import { COOKIE_NAME, resolveStaff, verifySessionToken } from "./auth";

export async function canWriteRoadmap(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  if (!s) return false;
  const st = await resolveStaff(s.clientId);
  return !!st && levelFor(st.grant, "roadmap") === "write";
}
