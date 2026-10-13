import { list } from "@vercel/blob";

/** Saabai brand favicon, used whenever a Site Factory site has none of its own. */
export const SAABAI_FAVICON = "https://www.saabai.ai/favicon.ico";

const FAVICON_RE = /^sites\/[^/]+\/favicon\.(png|ico|svg)$/;
const ICON_LINK_RE = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i;

/** URL of the favicon uploaded for this site in Site Factory, or null. */
export async function findSiteFavicon(slug: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: `sites/${slug}/favicon` });
    return blobs.find((b) => FAVICON_RE.test(b.pathname))?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Make sure served site HTML has a favicon: keep the site's own <link rel="icon">,
 * otherwise point at its uploaded Site Factory favicon, falling back to Saabai's.
 */
export async function ensureFavicon(slug: string, html: string): Promise<string> {
  if (ICON_LINK_RE.test(html) || !html.includes("</head>")) return html;
  const href = (await findSiteFavicon(slug)) ?? SAABAI_FAVICON;
  return html.replace("</head>", `<link rel="icon" href="${href}">\n</head>`);
}
