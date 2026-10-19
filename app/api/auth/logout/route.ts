/**
 * Logout — clears the session cookie and redirects to the right login page.
 * POST only (a GET logout would be a CSRF/prefetch hazard).
 * Pass a form field `next=admin` to land on /saabai-admin/login; anything else goes to /login.
 */
import { clearSessionCookieHeader } from "../../../../lib/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  let admin = false;
  try {
    const form = await req.formData();
    admin = form.get("next") === "admin";
  } catch { /* no form body: default to /login */ }

  const headers = new Headers();
  const clear = clearSessionCookieHeader();
  // Host-only cookie for whichever host served this request (saabai.ai or www.saabai.ai)
  headers.append("Set-Cookie", clear);
  // Also clear any domain-wide copy so both saabai.ai and www.saabai.ai are signed out
  const host = (req.headers.get("host") || "").split(":")[0];
  if (host === "saabai.ai" || host.endsWith(".saabai.ai")) {
    headers.append("Set-Cookie", `${clear}; Domain=saabai.ai`);
  }
  headers.append("Cache-Control", "no-store");
  headers.append("Location", admin ? "/saabai-admin/login" : "/login");
  return new Response(null, { status: 303, headers });
}
