/**
 * Reads the signed-in client's existing record and builds the onboarding view.
 * Does not create an account and does not call Stripe.
 */
import { getLexClients } from "./lex-config";
import { listEngagements } from "./audit-store";
import { getDirectoryUser } from "./user-directory";
import { getPortalUser, listPendingRequests } from "./portal-users";
import { clientIsLex } from "./portal-onboarding-lex";
import {
  type PortalTier,
  clampStep,
  nextStepCopy,
  portalOnboardingAllowed,
  presentSteps,
  resolveTier,
  toClientState,
} from "./portal-onboarding";
import { readStoredOnboarding } from "./portal-onboarding-store";

export interface OnboardingPrefill {
  businessName: string;
  primaryContact: string;
  contactEmail: string;
  phone: string;
  industry: string;
  practiceAreas: string;
}

export type OnboardingView =
  | { enabled: false }
  | {
      enabled: true;
      isLex: boolean;
      tier: PortalTier;
      hasBlueprint: boolean;
      hasWebsite: boolean;
      clientId: string;
      name: string;
      email: string;
      steps: ReturnType<typeof presentSteps>;
      nextCopy: string[];
      prefill: OnboardingPrefill;
      state: ReturnType<typeof toClientState>;
    };

async function lookupSite(email: string): Promise<{ name: string; found: boolean }> {
  try {
    const { listSites } = await import("./site-registry");
    const sites = await listSites();
    const site = sites.find((s) => (s.business?.email || "").toLowerCase() === email);
    if (!site) return { name: "", found: false };
    return { name: site.business?.name || site.name || "", found: true };
  } catch {
    return { name: "", found: false };
  }
}

export async function buildOnboardingView(rawEmail: string, env: NodeJS.ProcessEnv = process.env): Promise<OnboardingView> {
  const email = rawEmail.trim().toLowerCase();
  if (!portalOnboardingAllowed(email, env)) return { enabled: false };

  const [dir, portal, pendingList, site, engagements] = await Promise.all([
    getDirectoryUser(email),
    getPortalUser(email),
    listPendingRequests().catch(() => []),
    lookupSite(email),
    listEngagements().catch(() => []),
  ]);
  const pending = pendingList.find((r) => r.email.trim().toLowerCase() === email);
  const isLex = clientIsLex(email, dir?.products);
  const lexFirm = isLex ? getLexClients().find((c) => c.email.teamEmail.trim().toLowerCase() === email) : undefined;
  const hasBlueprint = engagements.some((e) => (e.contactEmail || "").toLowerCase() === email);

  const tier = resolveTier({
    isLex,
    hasBlueprint,
    hasWebsite: site.found,
    hasCare: false,
  });
  const clientId = lexFirm?.id || dir?.id || portal?.id || email;
  const name = dir?.name || portal?.name || email;
  const stored = await readStoredOnboarding(email);
  const state = stored
    ? { ...stored, step: clampStep(stored.step, isLex), tier: stored.tier || tier }
    : {
        clientId,
        email,
        step: "business" as const,
        status: "not_started" as const,
        tier,
        payload: {},
        skipped: [],
        updatedAt: new Date(0).toISOString(),
      };

  const prefill: OnboardingPrefill = {
    businessName: dir?.profile?.businessName || pending?.company || site.name || lexFirm?.firmName || "",
    primaryContact: dir?.name || portal?.name || "",
    contactEmail: email,
    phone: dir?.profile?.phone || dir?.profile?.mobile || "",
    industry: dir?.profile?.businessType || "",
    practiceAreas: isLex && lexFirm?.practiceAreas?.length ? lexFirm.practiceAreas.join(", ") : "",
  };

  return {
    enabled: true,
    isLex,
    tier,
    hasBlueprint,
    hasWebsite: site.found,
    clientId,
    name,
    email,
    steps: presentSteps(isLex),
    nextCopy: nextStepCopy({ tier, hasBlueprint, hasWebsite: site.found }),
    prefill,
    state: toClientState(state),
  };
}
