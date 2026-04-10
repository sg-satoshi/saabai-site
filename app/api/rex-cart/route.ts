/**
 * Rex Cart Redirect
 *
 * Resolves a cut-to-size quote (material + colour + thickness) to a WooCommerce
 * product page URL, with dimensions passed as rex_width / rex_height URL params.
 *
 * A small functions.php snippet on PLON's WordPress site reads those params on
 * page load and pre-fills the cut-to-size dimension inputs automatically.
 *
 * Flow:
 *   Rex quote → /api/rex-cart?material=seaboard&colour=white&thickness=10&width=420&height=300
 *   → searchProducts resolves product page URL + variation attributes
 *   → redirect to https://plasticonline.com.au/product/seaboard-hdpe-marine-grade/
 *       ?rex_width=420&rex_height=300&rex_colour=white&rex_thickness=10
 *   → functions.php JS snippet pre-fills the form inputs on page load
 */

import { searchProducts } from "../../../lib/woo-client";

export const runtime = "nodejs";

const SHOP_FALLBACK = "https://www.plasticonline.com.au/shop/";

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
  const material  = searchParams.get("material")  ?? "";
  const colour    = searchParams.get("colour")    ?? "";
  const thickness = searchParams.get("thickness") ?? "";
  const width     = searchParams.get("width")     ?? "";
  const height    = searchParams.get("height")    ?? "";
  const qty       = Math.max(1, parseInt(searchParams.get("qty") ?? "1"));

  if (!material) return Response.redirect(SHOP_FALLBACK, 302);

  try {
    // Always search for sheets — rex-cart is only used for cut-to-size sheet products
    const result = await searchProducts(`${material} sheet`);
    if ("error" in result || !result.results?.length) {
      return Response.redirect(SHOP_FALLBACK, 302);
    }

    // Find the best-matching product + variation
    let productUrl: string | undefined;
    let matchedVariation: { variation_id: number; attributes: Array<{ name: string; option: string }> } | undefined;

    outer:
    for (const product of result.results) {
      productUrl = product.url;
      for (const variation of (product.variations as Array<{
        variation_id: number;
        attributes: Array<{ name: string; option: string }>;
        in_stock: boolean;
      }>)) {
        if (!variation.in_stock) continue;
        const attrs = variation.attributes;
        const thicknessAttr = attrs.find(a => /thickness|size|gauge/i.test(a.name));
        const colourAttr    = attrs.find(a => /colou?r/i.test(a.name));

        const tMatch = !thickness || (thicknessAttr && thicknessMatches(thicknessAttr.option, thickness));
        const cMatch = !colour    || (colourAttr    && colourMatches(colourAttr.option, colour));

        if (tMatch && cMatch) {
          matchedVariation = variation;
          break outer;
        }
      }
    }

    // Build redirect URL — always go to the product page (not add-to-cart)
    // so the cut-to-size form is visible and can be pre-filled by functions.php
    const dest = new URL(productUrl ?? SHOP_FALLBACK);

    // Dimension params read by the functions.php snippet to pre-fill the form
    if (width)  dest.searchParams.set("rex_width",  width);
    if (height) dest.searchParams.set("rex_height", height);
    if (colour) dest.searchParams.set("rex_colour", colour);
    if (thickness) dest.searchParams.set("rex_thickness", thickness);
    if (qty > 1)   dest.searchParams.set("rex_qty", String(qty));

    // Pre-select the variation via standard WooCommerce attribute URL params
    // (works with most themes — the JS on the product page reads these)
    if (matchedVariation) {
      for (const attr of matchedVariation.attributes) {
        const slug = "attribute_" + attr.name.toLowerCase().replace(/\s+/g, "_");
        dest.searchParams.set(slug, attr.option);
      }
    }

    return Response.redirect(dest.toString(), 302);

  } catch {
    return Response.redirect(SHOP_FALLBACK, 302);
  }
}
