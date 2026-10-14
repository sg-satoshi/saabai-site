/**
 * Classify Stripe subscriptions created from Saabai admin payments.
 *
 * Prefer explicit metadata.productType. Fall back to description heuristics
 * so website/care plans are never counted as Lex.
 */

export type SubscriptionProductType = "lex" | "website_care" | "other";

export type SubscriptionMeta = {
  productType?: string | null;
  product?: string | null;
  kind?: string | null;
  description?: string | null;
  source?: string | null;
  siteId?: string | null;
};

const WEB_CARE_RE =
  /\b(website|web\s*site|care\s*plan|hosting|site\s*rebuild|growth\s*site|\.com(?:\.au)?|site\s*factory)\b/i;
const LEX_RE = /\b(lex(\s+agent)?|legal\s+ai|law\s+firm\s+agent)\b/i;

export function classifySubscription(
  meta: SubscriptionMeta | null | undefined,
  fallbackDescription?: string | null,
): SubscriptionProductType {
  const explicit = String(meta?.productType || meta?.product || meta?.kind || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (explicit === "lex" || explicit === "lex_subscription") return "lex";
  if (
    explicit === "website" ||
    explicit === "care" ||
    explicit === "website_care" ||
    explicit === "web" ||
    explicit === "web_care" ||
    explicit === "care_plan"
  ) {
    return "website_care";
  }

  const desc = `${meta?.description || ""} ${fallbackDescription || ""}`.trim();
  if (desc && WEB_CARE_RE.test(desc)) return "website_care";
  if (desc && LEX_RE.test(desc)) return "lex";

  // Historical admin subscriptions with no signal were treated as Lex.
  // Keep that only when the description clearly is not a website/care plan.
  if (meta?.source === "saabai-admin-subscription" && !desc) return "lex";
  return "other";
}

export function subscriptionProjectLabel(type: SubscriptionProductType): string {
  if (type === "lex") return "Lex";
  if (type === "website_care") return "Web/Care";
  return "Subscription";
}

export function subscriptionOrderKind(
  type: SubscriptionProductType,
): "lex_subscription" | "website_care" | "subscription" {
  if (type === "website_care") return "website_care";
  if (type === "lex") return "lex_subscription";
  // Unclassified subscriptions are never shown as Lex.
  return "subscription";
}

export function subscriptionProductLabel(
  type: SubscriptionProductType,
  plan?: string | null,
): string {
  if (type === "website_care") return "Website care plan";
  if (type === "lex") return plan ? `Lex ${plan}` : "Lex subscription";
  return plan ? `Subscription (${plan})` : "Subscription";
}
