/**
 * Approve a Wholesale Homes lead: create their per-user portal account and
 * email them a single-use set-password link. Shared by the Saabai admin
 * (/api/site-factory/approve-lead) and the Wholesale admin
 * (/api/wholesale-admin/approve-lead). Node runtime only (scrypt).
 */
import { saveDirectoryUser, getDirectoryUser } from "./user-directory";
import { hashPassword, generateRandomPassword } from "./password";
import { sendWelcomeEmail } from "./account-emails";

export type ApproveResult =
  | { ok: true; status: 200; message: string }
  | { ok: false; status: 400 | 409; error: string };

export async function approveWholesaleLead(input: { name?: unknown; email?: unknown }): Promise<ApproveResult> {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 200) : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!name || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "Name and email required" };
  }

  if (await getDirectoryUser(email)) {
    return { ok: false, status: 409, error: "User already exists" };
  }

  // The random password is hashed and never sent; the welcome email carries
  // a single-use set-password link instead.
  const now = new Date().toISOString();
  await saveDirectoryUser({
    id: email.replace(/[^a-z0-9]/g, "-"),
    name,
    email,
    password: await hashPassword(generateRandomPassword()),
    role: "user",
    dashboardUrl: "/sites/wholesale-homes/client/dashboard",
    siteId: "wholesale-homes",
    approvedAt: now,
    createdAt: now,
  });

  await sendWelcomeEmail({
    name,
    email,
    brand: "wholesale-homes",
    subject: "Welcome to Wholesale Homes, your portal is ready",
    intro: "Your application has been approved. You now have access to browse our full inventory of pre-market house and land packages at wholesale pricing.",
  });

  return { ok: true, status: 200, message: `User created. Welcome email sent to ${email}.` };
}
