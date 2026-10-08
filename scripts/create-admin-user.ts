/**
 * Create (or with --force, replace) an ADMIN directory user in Upstash Redis.
 *
 *   npx tsx scripts/create-admin-user.ts <email> "<Full Name>" [--force]
 *
 * The password is read from a hidden prompt (or piped stdin), stored only as a
 * scrypt hash, and never printed. Reads Upstash creds from the environment or
 * .env.local (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */
import { config } from "dotenv";
import { readPassword } from "./lib/read-password";

config({ path: ".env.local" });

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--force");
  const force = process.argv.includes("--force");
  const email = (args[0] || "").trim().toLowerCase();
  const name = (args[1] || "").trim() || email;
  if (!email || !email.includes("@")) {
    console.error('Usage: npx tsx scripts/create-admin-user.ts <email> "<Full Name>" [--force]');
    process.exit(1);
  }

  const { getDirectoryUser, saveDirectoryUser } = await import("../lib/user-directory");
  const { hashPassword, validateNewPassword } = await import("../lib/password");

  const existing = await getDirectoryUser(email);
  if (existing && !force) {
    console.error(`A directory user already exists for ${email}. Use scripts/rotate-admin-password.ts to change the password, or pass --force to replace the record.`);
    process.exit(1);
  }

  const password = await readPassword(`New password for ${email}: `);
  const invalid = validateNewPassword(password);
  if (invalid || password.length < 12) {
    console.error("Refusing: choose a password of at least 12 characters.");
    process.exit(1);
  }

  const now = new Date().toISOString();
  await saveDirectoryUser({
    id: existing?.id ?? email.replace(/[^a-z0-9]/g, "-"),
    name,
    email,
    password: await hashPassword(password),
    role: "admin",
    dashboardUrl: "/saabai-admin",
    approvedAt: existing?.approvedAt ?? now,
    createdAt: existing?.createdAt ?? now,
  });
  console.log(`Admin user saved for ${email}. Password stored as a hash and not printed.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
