/**
 * Client configuration for the Saabai Client Portal.
 *
 * Clients are defined entirely via environment variables — no code changes
 * needed when adding a new client.
 *
 * Required env vars per client (replace N with 1, 2, 3, …):
 *   SAABAI_CLIENT_N_ID          — Unique slug, no spaces (e.g. "acme")
 *   SAABAI_CLIENT_N_NAME        — Display name (e.g. "Acme")
 *   SAABAI_CLIENT_N_EMAIL       — Login email (e.g. "admin@acme.example")
 *   SAABAI_CLIENT_N_PASSWORD    — Password. Plain text or (preferred) a scrypt hash
 *                                 from `npx tsx scripts/hash-password.ts`. Verified
 *                                 in constant time by lib/password-auth.ts.
 *   SAABAI_CLIENT_N_DASHBOARD   — Dashboard path (e.g. "/dashboard")
 *
 * Example:
 *   SAABAI_CLIENT_1_ID=acme
 *   SAABAI_CLIENT_1_NAME=Acme
 *   SAABAI_CLIENT_1_EMAIL=admin@acme.example
 *   SAABAI_CLIENT_1_PASSWORD=yourpassword
 *   SAABAI_CLIENT_1_DASHBOARD=/dashboard
 */

export interface ClientConfig {
  id: string;
  name: string;
  email: string;
  password: string;
  dashboardUrl: string;
}

export function loadClients(): ClientConfig[] {
  const clients: ClientConfig[] = [];
  let i = 1;

  while (true) {
    const id = process.env[`SAABAI_CLIENT_${i}_ID`];
    if (!id) break;

    const email    = process.env[`SAABAI_CLIENT_${i}_EMAIL`]    ?? "";
    const password = process.env[`SAABAI_CLIENT_${i}_PASSWORD`] ?? "";
    const dashboard = process.env[`SAABAI_CLIENT_${i}_DASHBOARD`] ?? "/";
    const name     = process.env[`SAABAI_CLIENT_${i}_NAME`]     ?? id;

    if (email && password) {
      clients.push({ id, name, email, password, dashboardUrl: dashboard });
    }
    i++;
  }

  return clients;
}
