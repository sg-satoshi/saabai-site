import { type NextRequest } from "next/server";
import { runAfterResponse } from "../../../../lib/run-after";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { underResetRateLimit } from "../../../../lib/password-tokens";
import { sendPasswordResetEmail } from "../../../../lib/account-emails";
import { isWholesaleAccount } from "../../../../lib/wholesale-auth";

export const runtime = "nodejs";

/**
 * Request a password reset. The link is only ever sent by email (never returned
 * in the response), and the response is identical whether or not the account
 * exists. Work happens after the response is sent so timing doesn't leak either.
 *
 * Only Redis directory accounts can reset here. Env-var accounts are managed in
 * Vercel, and anyone can use "Email me a sign-in link" instead.
 */
export async function POST(req: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }
  if (!email || typeof email !== "string" || email.length > 254) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  runAfterResponse(async () => {
    try {
      const dirUser = await getDirectoryUser(normalized);
      if (!dirUser) return;
      if (!(await underResetRateLimit(normalized))) return;
      await sendPasswordResetEmail({
        name: dirUser.name,
        email: dirUser.email,
        // Wholesale Homes clients get a Wholesale-branded email and page.
        brand: isWholesaleAccount(dirUser) ? "wholesale-homes" : "saabai",
      });
    } catch (err) {
      console.error("[forgot-password] failed", err instanceof Error ? err.message : err);
    }
  });

  return Response.json({ ok: true });
}
