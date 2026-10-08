/**
 * Create a client login on purchase and email them access. Reuses the
 * directory user store.
 *
 * The account gets a random password that is hashed and never sent anywhere.
 * The welcome email contains a single-use "set your password" link instead,
 * and reminds them they can always use "Email me a sign-in link".
 */
import { saveDirectoryUser, getDirectoryUser, type DirectoryUser } from "./user-directory";
import { hashPassword, generateRandomPassword } from "./password";
import { sendWelcomeEmail } from "./account-emails";

/** Create the client login if it does not exist yet, and email their access. Idempotent. */
export async function ensureClientAccount(opts: { name: string; email: string; productName: string }): Promise<{ created: boolean; user: DirectoryUser }> {
  const email = opts.email.toLowerCase();
  const existing = await getDirectoryUser(email);
  if (existing) return { created: false, user: existing };

  const user: DirectoryUser = {
    id: email.replace(/[^a-z0-9]/g, "-"),
    name: opts.name || email,
    email,
    password: await hashPassword(generateRandomPassword()),
    role: "user",
    dashboardUrl: "/dashboard",
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await saveDirectoryUser(user);

  await sendWelcomeEmail({
    name: opts.name || "there",
    email,
    subject: "Your Saabai account is ready",
    intro: `Thanks for signing up for ${opts.productName}. Your client account is ready, so you can sign in any time to view your billing, invoices and requests.`,
  });

  return { created: true, user };
}
