/**
 * Wholesale Homes URL helpers. No dependencies, safe in client components.
 *
 * On wholesalehomes.com.au the site is served at the root (proxy.ts rewrites
 * to /sites/wholesale-homes); on saabai.ai, previews and localhost it lives
 * under /sites/wholesale-homes.
 */
export const WH_SITE_PREFIX = "/sites/wholesale-homes";
/** The Wholesale admin always lives here (on wholesalehomes.com.au, /admin is Saabai's). */
export const WH_ADMIN_BASE = "/sites/wholesale-homes/admin";

export function wholesaleBasePath(host: string | null | undefined): string {
  const h = (host || "").split(":")[0].toLowerCase();
  const isSaabaiHost = h === "saabai.ai" || h.endsWith(".saabai.ai") || h.endsWith(".vercel.app") || h === "localhost" || h.startsWith("127.");
  return isSaabaiHost ? WH_SITE_PREFIX : "";
}
