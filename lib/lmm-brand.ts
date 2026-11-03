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


/** LMM calculator pages: friendly path on the LMM host -> static file under public/clients/lmm-site/calculators. */
export const LMM_CALCULATORS = ["borrowing-power", "serviceability", "repayments"] as const;
export function lmmCalculatorPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "");
  if (p === "/calculators") return "/clients/lmm-site/calculators/borrowing-power.html";
  const m = /^\/calculators\/([a-z-]+)$/.exec(p);
  if (m && (LMM_CALCULATORS as readonly string[]).includes(m[1])) return `/clients/lmm-site/calculators/${m[1]}.html`;
  return null;
}
