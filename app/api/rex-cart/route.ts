/**
 * Rex Cart Redirect
 *
 * Resolves a cut-to-size quote (material + colour + thickness) to a real WooCommerce
 * variation_id via searchProducts, then redirects to PLON's add-to-cart URL.
 *
 * Why server-side: the variation_id lookup requires WooCommerce API credentials.
 * Why redirect (not API response): cart must be added in the customer's browser session.
 *
 * Usage: /api/rex-cart?material=seaboard&colour=white&thickness=10&qty=1
 */

import { searchProducts } from "../../../lib/woo-client";

export const runtime = "nodejs";

const PLON = "https://www.plasticonline.com.au";
const SHOP_FALLBACK = `${PLON}/shop/`;

function normNum(s: string): string {
  return s.replace(/[^0-9.]/g, "").replace(/\.0+$/, "");
}

function thicknessMatches(option: string, target: string): boolean {
  return normNum(option) === normNum(target);
}

function colourMatches(option: string, target: string): boolean {
  if (!target) return true;
  return option.toLowerCase().includes(target.toLowerCase()) ||
         target.toLowerCase().includes(option.toLowerCase());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const material   = searchParams.get("material")   ?? "";
  const colour     = searchParams.get("colour")     ?? "";
  const thickness  = searchParams.get("thickness")  ?? "";
  const qty        = Math.max(1, parseInt(searchParams.get("qty") ?? "1"));

  if (!material) {
    return Response.redirect(SHOP_FALLBACK, 302);
  }

  try {
    const result = await searchProducts(material);

    if ("error" in result || !result.results?.length) {
      return Response.redirect(SHOP_FALLBACK, 302);
    }

    for (const product of result.results) {
      for (const variation of (product.variations as Array<{
        variation_id: number;
        attributes: Array<{ name: string; option: string }>;
        in_stock: boolean;
      }>)) {
        if (!variation.in_stock) continue;

        const attrs = variation.attributes;
        const thicknessAttr = attrs.find(a =>
          /thickness|size|gauge/i.test(a.name)
        );
        const colourAttr = attrs.find(a =>
          /colou?r|colour/i.test(a.name)
        );

        const tMatch = !thickness || (thicknessAttr && thicknessMatches(thicknessAttr.option, thickness));
        const cMatch = !colour    || (colourAttr    && colourMatches(colourAttr.option, colour));

        if (tMatch && cMatch) {
          const url = `${PLON}/?add-to-cart=${product.product_id}&variation_id=${variation.variation_id}&quantity=${qty}`;
          return Response.redirect(url, 302);
        }
      }
    }

    // Variation not found — fall back to product page if we know the slug
    const productUrl = result.results[0]?.url;
    return Response.redirect(productUrl ?? SHOP_FALLBACK, 302);

  } catch {
    return Response.redirect(SHOP_FALLBACK, 302);
  }
}
