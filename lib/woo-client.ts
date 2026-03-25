const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

export async function searchProducts(query: string) {
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=6&status=publish`;
    const res = await fetch(url, { headers: { Authorization: auth() } });
    if (!res.ok) return { error: `WooCommerce ${res.status}` };

    const products = await res.json() as any[];
    if (!products.length) return { results: [], message: "No products found for that search." };

    return {
      results: products.map((p) => ({
        name: p.name,
        price: p.price ? `AUD $${p.price}` : null,
        regular_price: p.regular_price ? `AUD $${p.regular_price}` : null,
        sale_price: p.on_sale && p.sale_price ? `AUD $${p.sale_price}` : null,
        on_sale: p.on_sale ?? false,
        in_stock: p.stock_status === "instock",
        url: p.permalink,
        categories: (p.categories as any[])?.map((c) => c.name).join(", ") ?? "",
        description: p.short_description
          ? p.short_description.replace(/<[^>]+>/g, "").slice(0, 200)
          : null,
      })),
    };
  } catch (err) {
    return { error: String(err) };
  }
}
