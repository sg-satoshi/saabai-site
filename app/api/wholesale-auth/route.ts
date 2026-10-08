import { NextResponse } from "next/server";
import { verifyPassword } from "../../../lib/password";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));

  const validEmail = process.env.WHOLESALE_CLIENT_EMAIL;
  const validPass = process.env.WHOLESALE_CLIENT_PASS;

  if (!validEmail || !validPass) {
    return NextResponse.json({ success: false, error: "Auth not configured" }, { status: 500 });
  }

  // Constant-time check. The env value may be plain text or a scrypt hash
  // (see scripts/hash-password.ts). Always run the password check so a wrong
  // email and a wrong password take the same time.
  const emailOk = typeof email === "string" && email.trim().toLowerCase() === validEmail.toLowerCase();
  const { ok: passOk } = await verifyPassword(typeof password === "string" ? password : "", validPass);
  if (emailOk && passOk) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
}
