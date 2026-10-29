/**
 * Feature flag for the Blueprint client portal (Stage 1). OFF by default.
 *
 *   BLUEPRINT_PORTAL_MODE = "off" (default) | "allowlist" | "on"
 *   BLUEPRINT_PORTAL_ALLOW = comma list of emails or @domains (allowlist mode)
 *
 * With the flag off, every /portal page and /api/portal/blueprint route
 * answers 404, the Stripe email keeps the old fact-find link and the
 * post-payment page is unchanged.
 */
export type PortalMode = "off" | "allowlist" | "on";

export function portalMode(env: NodeJS.ProcessEnv = process.env): PortalMode {
  const v = (env.BLUEPRINT_PORTAL_MODE || "").trim().toLowerCase();
  if (v === "on" || v === "true") return "on";
  if (v === "allowlist") return "allowlist";
  return "off";
}

export function portalEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return portalMode(env) !== "off";
}

/** Is the portal available for this buyer email under the current mode? */
export function portalAllowed(email: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const mode = portalMode(env);
  if (mode === "off") return false;
  if (mode === "on") return true;
  const e = email.trim().toLowerCase();
  if (!e) return false;
  const list = (env.BLUEPRINT_PORTAL_ALLOW || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return list.some((entry) => (entry.startsWith("@") ? e.endsWith(entry) : e === entry));
}
