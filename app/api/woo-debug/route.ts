// Temporary debug route — remove after confirming CPC meta keys
export async function GET() {
  const WOO_URL = process.env.WOOCOMMERCE_URL!;
  const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
  const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
  const auth = "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");

  // Fetch the known variation (product 851, variation 31024 — 6mm clear acrylic)
  const res = await fetch(`${WOO_URL}/wp-json/wc/v3/products/851/variations/31024`, {
    headers: { Authorization: auth },
  });
  const data = await res.json();

  return Response.json({
    id: data.id,
    price: data.price,
    regular_price: data.regular_price,
    attributes: data.attributes,
    meta_data: data.meta_data,
  });
}
