/**
 * Client configuration for the Saabai Client Portal.
 *
 * Clients are defined entirely via environment variables — no code changes
 * needed when adding a new client.
 *
 * Required env vars per client (replace N with 1, 2, 3, …):
 *   SAABAI_CLIENT_N_ID          — Unique slug, no spaces (e.g. "plasticonline")
 *   SAABAI_CLIENT_N_NAME        — Display name (e.g. "PlasticOnline")
 *   SAABAI_CLIENT_N_EMAIL       — Login email (e.g. "admin@plasticonline.com.au")
 *   SAABAI_CLIENT_N_PASSWORD    — Plain-text password (store securely in Vercel)
 *   SAABAI_CLIENT_N_DASHBOARD   — Dashboard path (e.g. "/rex-dashboard")
 *
 * Example for PlasticOnline:
 *   SAABAI_CLIENT_1_ID=plasticonline
 *   SAABAI_CLIENT_1_NAME=PlasticOnline
 *   SAABAI_CLIENT_1_EMAIL=admin@plasticonline.com.au
 *   SAABAI_CLIENT_1_PASSWORD=yourpassword
 *   SAABAI_CLIENT_1_DASHBOARD=/rex-dashboard
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

export function findClientByCredentials(
  clients: ClientConfig[],
  email: string,
  password: string
): ClientConfig | null {
  const normalised = email.trim().toLowerCase();
  return (
    clients.find(
      c => c.email.toLowerCase() === normalised && c.password === password
    ) ?? null
  );
}
