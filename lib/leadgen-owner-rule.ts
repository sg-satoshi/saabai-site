/** Pure ownership rule for LeadGen client settings (no I/O, unit tested). */
export type LeadGenAccess = { kind: "admin" } | { kind: "owner"; clientId: string } | null;

/** Pure decision: may this session act on targetClientId? */
export function mayActOnLeadGenClient(access: LeadGenAccess, targetClientId: string): boolean {
  if (!access || !targetClientId) return false;
  if (access.kind === "admin") return true;
  return access.clientId === targetClientId;
}

