/**
 * Print a scrypt hash for a password, e.g. to use as a SAABAI_CLIENT_N_PASSWORD
 * or WHOLESALE_*_PASS value instead of plain text.
 *
 *   npx tsx scripts/hash-password.ts            (prompts, input hidden)
 *   printf '%s' "$PW" | npx tsx scripts/hash-password.ts
 *
 * Only the hash is printed. The password itself is never echoed or logged.
 */
import { hashPassword } from "../lib/password";
import { readPassword } from "./lib/read-password";

async function main() {
  const pw = await readPassword("Password to hash: ");
  if (!pw) {
    console.error("No password given.");
    process.exit(1);
  }
  console.log(await hashPassword(pw));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
