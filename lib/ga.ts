/**
 * GA4 for saabai.ai only. Client sites (/sites/* and custom client domains)
 * and admin/portal routes must never load or send to this property.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-9KVV3KKZZH";

const SAABAI_HOSTS = new Set(["saabai.ai", "www.saabai.ai"]);
// Vercel previews of this project: tracked in debug mode only (DebugView, not reports).
const PREVIEW_HOST = /^saabai-site-[a-z0-9-]+\.vercel\.app$/;

const EXCLUDED_PATHS = [
  "/sites", "/clients", "/saabai-admin", "/admin", "/pulse", "/client-portal", "/dashboard",
  "/mission-control", "/atlas-memory-control",
  "/leadgen-dashboard", "/login", "/forgot-password", "/reset-password", "/onboarding", "/edge",
  "/ai-agent", "/lex", "/lex-widget", "/leadgen-widget",
];

export function gaHostMode(hostname: string): "prod" | "preview" | null {
  if (SAABAI_HOSTS.has(hostname)) return "prod";
  if (PREVIEW_HOST.test(hostname)) return "preview";
  return null;
}

export function gaPathAllowed(pathname: string): boolean {
  return !EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type Gtag = (...args: unknown[]) => void;

/** Fire a GA4 event. No-op unless GA is loaded and the current page is trackable. */
export function gaEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: Gtag };
  if (!w.gtag) return;
  if (!gaHostMode(window.location.hostname) || !gaPathAllowed(window.location.pathname)) return;
  w.gtag("event", name, params);
}

/** Fire an event at most once per key per browser session (e.g. purchase per transaction). */
export function gaEventOnce(key: string, name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const k = `ga_once:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch { /* storage blocked: still send */ }
  gaEvent(name, params);
}
