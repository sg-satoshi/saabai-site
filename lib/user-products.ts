/**
 * User Products — determines what products a logged-in user has access to.
 *
 * Products are stored per-user in the Redis directory (products[] field).
 * This is the single source of truth — no env vars, no code-level derivation.
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
    href: "/lex",
    description: "Legal AI assistant",
  },
};

export const PRODUCT_IDS: ProductId[] = ["rex", "leadgen", "lex"];

export const PRODUCT_LABELS: Record<ProductId, string> = {
  rex: "Rex",
  leadgen: "LeadGen",
  lex: "Lex",
};

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

/**
 * Derive product(s) from a DirectoryUser.
 * Checks the user's explicit `products` array first, then falls back
 * to deriving from dashboardUrl for backward compatibility.
 */
export function userProducts(user: {
  products?: string[];
  dashboardUrl?: string;
}): ProductId[] {
  // Explicit product assignments take priority
  if (user.products && user.products.length > 0) {
    return user.products.filter((p): p is ProductId =>
      PRODUCT_IDS.includes(p as ProductId)
    );
  }

  // Fallback: derive from dashboardUrl
  return productsFromDashboardUrl(user.dashboardUrl || "");
}

/**
 * Derive product(s) from a dashboardUrl string.
 * Used as fallback for users without explicit product assignments.
 */
export function productsFromDashboardUrl(dashboardUrl: string): ProductId[] {
  const url = dashboardUrl.toLowerCase();

  if (url.includes("/rex")) return ["rex"];
  if (url.includes("/leadgen")) return ["leadgen"];
  if (url.includes("/lex")) return ["lex"];

  return [];
}
