/**
 * Resolve the signed-in client plus the website (Site Factory site) linked to
 * their account. Used by the client portal requests + billing routes.
 */
import { getClientSession } from "./client-session";
import { listDirectoryUsers } from "./user-directory";
import { listSites, type SiteConfig } from "./site-registry";

export interface ClientContext {
  clientId: string;
  name: string;
  email: string;
  siteId?: string;
  site?: SiteConfig;
}

export async function getClientContext(): Promise<ClientContext | null> {
  const session = await getClientSession();
  if (!session) return null;
  const ctx: ClientContext = { clientId: session.clientId, name: session.name, email: session.email };

  try {
    const users = await listDirectoryUsers();
    const u = users.find((x) => x.id === session.clientId);
    if (u?.siteId) {
      ctx.siteId = u.siteId;
      const sites = await listSites();
      ctx.site = sites.find((s) => s.id === u.siteId);
    }
  } catch {
    /* site link is optional */
  }
  return ctx;
}
