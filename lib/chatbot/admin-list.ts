/**
 * Loads the chatbot admin list: one canonical site per client, display only.
 * Does not delete records and does not call the sites-dedupe apply endpoint.
 */
import { APP_ROUTER_SITES, listRedisSites, type SiteConfig } from "../site-registry";
import type { SiteLinks } from "../site-dedupe";
import { listDirectoryUsers } from "../user-directory";
import { listSiteBilling } from "../billing/store";
import { chatbotCanonicalRows, type ChatbotCanonical } from "./canonical-rows";

export async function listChatbotCanonical(): Promise<ChatbotCanonical[]> {
  let redisSites: SiteConfig[] = [];
  try { redisSites = await listRedisSites(); } catch { redisSites = []; }
  const ids = new Set(redisSites.map((s) => s.id));
  const hard = APP_ROUTER_SITES.filter((s) => !ids.has(s.id));
  const users = await listDirectoryUsers().catch(() => []);
  const billed = new Set((await listSiteBilling().catch(() => [])).map((b) => b.siteId));
  const links = (id: string): SiteLinks => ({ users: users.filter((u) => u.siteId === id).map((u) => u.id), billing: billed.has(id) });
  return chatbotCanonicalRows([...redisSites, ...hard], links, new Set(hard.map((s) => s.id)));
}
