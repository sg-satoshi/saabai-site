/**
 * Who counts as a Lex client for the extra onboarding step.
 * Matches the portal: a Lex registry team email, or a directory user
 * with the lex product. Other tiers never receive the fifth step.
 */
import { getLexClients } from "./lex-config";

export function clientIsLex(email: string, products?: string[] | null): boolean {
  const norm = email.trim().toLowerCase();
  if (!norm) return false;
  if (getLexClients().some((c) => c.email.teamEmail.trim().toLowerCase() === norm)) return true;
  return !!products?.includes("lex");
}
