import { requireAdmin } from "../../../lib/require-admin";
import { getPublishableKey } from "../../../lib/stripe";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";
import { isSalePricingEnabled } from "../../../lib/sale-price";

export const metadata = { title: "Products — Saabai Admin" };

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin("/saabai-admin/products");
  // Coupons moved to Marketing > Offers & Coupons.
  if ((await searchParams).tab === "coupons") redirect("/saabai-admin/marketing/offers");

  return <ProductsClient publishableKey={getPublishableKey()} saleEnabled={isSalePricingEnabled()} />;
}
