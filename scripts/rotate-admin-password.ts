/**
 * Rotate a directory user's password in Upstash Redis.
 *
 *   npx tsx scripts/rotate-admin-password.ts [email]      (default hello@saabai.ai)
 *
 * The new password is read from a hidden prompt (or piped stdin), stored only as
 * a scrypt hash, and never printed. Reads Upstash creds from the environment or
 * .env.local (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */
import { config } from "dotenv";
import { readPassword } from "./lib/read-password";

config({ path: ".env.local" });

async function main() {
  const email = (process.argv[2] || "hello@saabai.ai").trim().toLowerCase();

  const { getDirectoryUser, saveDirectoryUser } = await import("../lib/user-directory");
  const { hashPassword } = await import("../lib/password");

  const user = await getDirectoryUser(email);
  if (!user) {
    console.error(`No directory user found for ${email}`);
    process.exit(1);
  }

  const password = await readPassword(`New password for ${email}: `);
  if (password.length < 12) {
    console.error("Refusing: choose a password of at least 12 characters.");
    process.exit(1);
  }

  await saveDirectoryUser({
    ...user,
    password: await hashPassword(password),
    ...({ passwordRotatedAt: new Date().toISOString() } as object),
  });
  console.log(`Password rotated for ${email}. Stored as a hash and not printed.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
