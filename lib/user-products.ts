/**
 * User Products — determines what products a logged-in user has access to.
 *
 * Product is derived from the user's dashboardUrl plus any additional signals.
 * This is the single source of truth for the SaabaiAppShell sidebar.
 */

export type ProductId = "rex" | "leadgen" | "lex";

export interface ProductInfo {
  id: ProductId;
  label: string;
  icon: string;
  href: string;
  description: string;
}

export const ALL_PRODUCTS: Record<ProductId, ProductInfo> = {
  rex: {
    id: "rex",
    label: "Rex",
    icon: "🤖",
    href: "/rex-dashboard",
    description: "AI chat agent for trade & e-commerce",
  },
  leadgen: {
    id: "leadgen",
    label: "LeadGen",
    icon: "📋",
    href: "/leadgen/portal",
    description: "Lead generation widget",
  },
  lex: {
    id: "lex",
    label: "Lex",
    icon: "⚖️",
    href: "/lex-dashboard",
    description: "Legal AI assistant",
  },
};

/**
 * Derive product(s) from a dashboardUrl.
 * Supports both env-var clients and Redis directory users.
 */
export function productsFromDashboardUrl(dashboardUrl: string): ProductId[] {
  const url = dashboardUrl.toLowerCase();

  if (url.includes("/rex")) return ["rex"];

  // LeadGen has two possible dashboard URLs
  if (url.includes("/leadgen")) return ["leadgen"];

  if (url.includes("/lex")) return ["lex"];

  // Fallback — no specific product detected
  return [];
}

/**
 * Get display info for a list of product IDs.
 * Returns in a consistent order: rex → leadgen → lex
 */
export function getProductInfos(productIds: ProductId[]): ProductInfo[] {
  const order: ProductId[] = ["rex", "leadgen", "lex"];
  return order
    .filter((id) => productIds.includes(id))
    .map((id) => ALL_PRODUCTS[id]);
}
