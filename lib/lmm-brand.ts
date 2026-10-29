/** Maps icon / manifest / social-image paths on the LMM host to LMM assets (null = not a brand path). */
export function lmmBrandAsset(pathname: string): string | null {
  const p = pathname.toLowerCase();
  if (p === "/favicon.ico") return "favicon.ico";
  if (/^\/(favicon|icon|android-chrome|mstile)[^/]*\.svg$/.test(p)) return "favicon.svg";
  if (/^\/favicon[^/]*\.png$/.test(p)) return "icon-192.png";
  if (/^\/apple-touch-icon[^/]*\.png$/.test(p)) return "apple-touch-icon.png";
  if (p === "/icon-192.png" || /^\/(android-chrome-192|icon-192)[^/]*\.png$/.test(p)) return "icon-192.png";
  if (/^\/(android-chrome|icon|mstile)[^/]*\.(png|ico)$/.test(p)) return "icon-512.png";
  if (/^\/(site\.webmanifest|manifest\.webmanifest|manifest\.json|manifest)$/.test(p)) return "site.webmanifest";
  if (/^\/(og-image|opengraph-image|twitter-image)[^/]*(\.(jpg|jpeg|png))?$/.test(p)) return "og-image.jpg";
  return null;
}

