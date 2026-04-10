// Diagnostic: check what PLON's price API returns for Seaboard (HDPE)
const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
const PLON_PRICE_API = "https://www.plasticonline.com.au/wp-json/plon/v1/price";

export const runtime = "nodejs";

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

export async function GET() {
  const log: string[] = [];

  try {
    // Search WooCommerce for Seaboard
    log.push("Step 1: searchProducts('seaboard')...");
    const res = await fetch(`${WOO_URL}/wp-json/wc/v3/products?search=seaboard&per_page=3&status=publish`, {
      headers: { Authorization: auth() },
    });
    const products = await res.json() as any[];
    log.push(`Found ${products.length} products: ${products.map((p: any) => `${p.id}="${p.name}"`).join(", ")}`);

    if (!products.length) return Response.json({ log, error: "No Seaboard product found" });

    const product = products[0];

    // Fetch first page of variations
    const vRes = await fetch(`${WOO_URL}/wp-json/wc/v3/products/${product.id}/variations?per_page=100&page=1`, {
      headers: { Authorization: auth() },
    });
    const vars = await vRes.json() as any[];
    log.push(`Fetched ${vars.length} variations for product ${product.id}`);

    // Find 10mm variation
    const match = vars.find((v: any) => {
      const attrs: any[] = v.attributes ?? [];
      const thick = attrs.find((a: any) => /thickness|gauge/i.test(a.name));
      const col = attrs.find((a: any) => /colou?r/i.test(a.name));
      return thick && thick.option.replace(/[^0-9.]/g, "").replace(/\.0+$/, "") === "10" && col;
    });

    if (!match) {
      const summary = vars.map((v: any) => {
        const attrs: any[] = v.attributes ?? [];
        const t = attrs.find((a: any) => /thickness|gauge/i.test(a.name));
        const c = attrs.find((a: any) => /colou?r/i.test(a.name));
        return `${v.id}: ${t?.option ?? "?"}/${c?.option ?? "?"}`;
      });
      return Response.json({ log, error: "No 10mm variation found", variations: summary });
    }

    const attrs: any[] = match.attributes ?? [];
    const thick = attrs.find((a: any) => /thickness|gauge/i.test(a.name));
    const col = attrs.find((a: any) => /colou?r/i.test(a.name));
    log.push(`Using variation ${match.id}: thickness="${thick?.option}", colour="${col?.option}"`);

    // Call PLON price API directly
    const qs = new URLSearchParams({
      product_id: String(product.id),
      variation_id: String(match.id),
      color: col?.option ?? "",
      thickness: thick?.option ?? "",
    });
    log.push(`Step 2: Calling price API: ${PLON_PRICE_API}?${qs}`);
    const priceRes = await fetch(`${PLON_PRICE_API}?${qs}`);
    const priceJson = await priceRes.json();
    log.push(`Price API response: ${JSON.stringify(priceJson)}`);

    // Calculate manually for 600x420mm
    const { unit_price, custom_multiplier } = priceJson;
    const area = (600 / 1000) * (420 / 1000);
    const withMultiplier = unit_price * (custom_multiplier ?? 1) * area;
    const withoutMultiplier = unit_price * area;
    log.push(`Area: ${area} m²`);
    log.push(`unit_price × area = $${withoutMultiplier.toFixed(2)} (no multiplier)`);
    log.push(`unit_price × ${custom_multiplier} × area = $${withMultiplier.toFixed(2)} (with multiplier)`);
    log.push(`PLON calculator shows: $71.62`);

    return Response.json({ log, priceJson });
  } catch (err) {
    log.push(`EXCEPTION: ${String(err)}`);
    return Response.json({ log, error: String(err) }, { status: 500 });
  }
}
