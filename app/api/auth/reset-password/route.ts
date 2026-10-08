import { type NextRequest } from "next/server";
import { getDirectoryUser, saveDirectoryUser } from "../../../../lib/user-directory";
import { consumePasswordToken } from "../../../../lib/password-tokens";
import { hashPassword, validateNewPassword } from "../../../../lib/password";

export const runtime = "nodejs";

/**
 * Set a new password from a single-use emailed link (reset or welcome).
 * The token is consumed atomically, so it can only be used once.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    const invalid = validateNewPassword(password);
    if (!token || invalid) {
      return Response.json({ error: invalid ?? "Invalid or expired link." }, { status: 400 });
    }

    const record = await consumePasswordToken(token);
    if (!record) {
      return Response.json({ error: "This link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const dirUser = await getDirectoryUser(record.email);
    if (!dirUser) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    await saveDirectoryUser({ ...dirUser, password: await hashPassword(password) });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
