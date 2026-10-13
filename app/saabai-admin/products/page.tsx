import { requireAdmin } from "../../../lib/require-admin";
import { getPublishableKey } from "../../../lib/stripe";
import ProductsClient from "./ProductsClient";

export const metadata = { title: "Products — Saabai Admin" };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdmin("/saabai-admin/products");

  return <ProductsClient publishableKey={getPublishableKey()} />;
}
