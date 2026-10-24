import type { Metadata } from "next";
import { headers } from "next/headers";
import { clientSiteRobots } from "@/lib/client-site-surface";

/**
 * Every App Router client site. Indexing follows the host: the client's own
 * domain is index, follow; saabai.ai and preview hosts are noindex, nofollow.
 * New sites pick this up by being registered. Do not export an indexable
 * robots object from a site layout, or it will override this on previews.
 */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-host");
  const host = h.get("host");
  const directive = h.get("x-saabai-robots");
  const onClientHost = clientSiteRobots(forwarded, null).index || clientSiteRobots(host, null).index;
  if (onClientHost && !directive?.includes("noindex")) return { robots: { index: true, follow: true } };
  return { robots: clientSiteRobots(forwarded || host, directive) };
}

export default function ClientSitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
