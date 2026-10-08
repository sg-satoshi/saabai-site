import { saveDirectoryUser, getDirectoryUser } from "../../../../lib/user-directory";
import { hashPassword, generateRandomPassword } from "../../../../lib/password";
import { sendWelcomeEmail } from "../../../../lib/account-emails";

// Node runtime: password hashing uses Node's crypto.scrypt.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, email, phone, buyer_type } = await req.json();

    if (!name || !email) {
      return Response.json({ error: "Name and email required" }, { status: 400 });
    }

    // Check if already exists
    const existing = await getDirectoryUser(email);
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    // Create user. The random password is hashed and never sent; the welcome
    // email carries a single-use set-password link instead.
    const user = {
      id: email.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name,
      email: email.toLowerCase(),
      password: await hashPassword(generateRandomPassword()),
      role: "user" as const,
      dashboardUrl: "/sites/wholesale-homes/client/dashboard",
      siteId: "wholesale-homes",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDirectoryUser(user);

    // Send welcome email (set-password link, never a password)
    await sendWelcomeEmail({
      name,
      email: user.email,
      brand: "wholesale-homes",
      subject: "Welcome to Wholesale Homes, your portal is ready",
      intro: "Your application has been approved. You now have access to browse our full inventory of pre-market house and land packages at wholesale pricing.",
    });

    return Response.json({
      success: true,
      message: `User created. Welcome email sent to ${email}.`,
    });
  } catch (error) {
    console.error("Approve lead error:", error);
    return Response.json({ error: "Failed to approve lead" }, { status: 500 });
  }
}
