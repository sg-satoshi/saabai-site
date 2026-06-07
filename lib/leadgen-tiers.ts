/**
 * LeadGen Tier Configuration
 *
 * Defines what each plan tier includes for notifications.
 * These limits reset monthly per client.
 */
export interface NotificationLimits {
  email: "unlimited";       // Email is always unlimited
  sms: number;               // Monthly SMS allowance
  whatsapp: number;          // Monthly WhatsApp allowance
}

export type PlanTier = "starter" | "pro" | "enterprise";

export const TIER_LIMITS: Record<PlanTier, NotificationLimits> = {
  starter: {
    email: "unlimited",
    sms: 10,
    whatsapp: 10,
  },
  pro: {
    email: "unlimited",
    sms: 50,
    whatsapp: 50,
  },
  enterprise: {
    email: "unlimited",
    sms: 500,
    whatsapp: 500,
  },
};

/**
 * Usage counters stored per-client in Redis.
 * Key format: leadgen:usage:{clientId}:{period}
 * Period format: YYYY-MM (e.g. "2026-07")
 */
export function getUsageKey(clientId: string): string {
  const now = new Date();
  // Brisbane timezone offset for correct month boundaries
  const bne = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const period = bne.toISOString().slice(0, 7); // "2026-07"
  return `leadgen:usage:${clientId}:${period}`;
}

/**
 * Stripe price IDs per tier (for checkout metadata).
 */
export const TIER_METADATA: Record<PlanTier, {
  label: string;
  monthlyPrice: number;
  sms: number;
  whatsapp: number;
}> = {
  starter: {
    label: "Starter",
    monthlyPrice: 29,
    sms: 10,
    whatsapp: 10,
  },
  pro: {
    label: "Pro",
    monthlyPrice: 79,
    sms: 50,
    whatsapp: 50,
  },
  enterprise: {
    label: "Enterprise",
    monthlyPrice: 199,
    sms: 500,
    whatsapp: 500,
  },
};
