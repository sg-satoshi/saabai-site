// Temporary debug route
export async function GET() {
  const WOO_URL = process.env.WOOCOMMERCE_URL ?? "MISSING";
  const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY ?? "MISSING";
  const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET ?? "MISSING";
  const auth = "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
  const PLON = "https://www.plasticonline.com.au";

  const steps: Record<string, any> = {
    env: { WOO_URL, key_set: WOO_KEY !== "MISSING", secret_set: WOO_SECRET !== "MISSING" },
  };

  // Step 1: Search
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products?search=acrylic+sheet&per_page=5&status=publish`;
    const searchRes = await fetch(url, { headers: { Authorization: auth } });
    const raw = await searchRes.text();
    steps.search_status = searchRes.status;
    let products: any[];
    try {
      products = JSON.parse(raw);
    } catch {
      steps.search_parse_error = raw.slice(0, 200);
      return Response.json(steps);
    }
    if (!Array.isArray(products)) {
      steps.search_not_array = products;
      return Response.json(steps);
    }
    steps.search_count = products.length;
    steps.search_ids = products.map((p: any) => ({ id: p.id, name: p.name }));

    const p851 = products.find((p: any) => p.id === 851);
    if (!p851) { steps.note = "product 851 not in results"; return Response.json(steps); }

    // Step 2: Variations
    const varRes = await fetch(`${WOO_URL}/wp-json/wc/v3/products/851/variations?per_page=50`, { headers: { Authorization: auth } });
    const vars = await varRes.json() as any[];
    if (!Array.isArray(vars)) { steps.vars_not_array = vars; return Response.json(steps); }
    const target = vars.find((v: any) =>
      Array.isArray(v.attributes) &&
      v.attributes.some((a: any) => a.option === "Clear 000") &&
      v.attributes.some((a: any) => a.option === "6.0mm")
    );
    steps.variation = { found: !!target, id: target?.id, attributes: target?.attributes };

    if (!target) return Response.json(steps);

    // Step 3: Price API
    const qs = new URLSearchParams({ product_id: "851", variation_id: String(target.id), color: "Clear 000", thickness: "6.0mm" });
    const priceRes = await fetch(`${PLON}/wp-json/plon/v1/price?${qs}`);
    const priceJson = await priceRes.json() as any;
    steps.price = { status: priceRes.status, body: priceJson };

    if (priceJson.unit_price) {
      const unit = priceJson.unit_price;
      steps.calculation = { unit_price: unit, total_600x1200: Math.round(unit * 0.6 * 1.2 * 100) / 100 };
    }
  } catch (err) {
    steps.caught_error = String(err);
  }

  return Response.json(steps);
}
