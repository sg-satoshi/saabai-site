const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

async function fetchVariations(productId: number) {
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=20`;
    const res = await fetch(url, { headers: { Authorization: auth() } });
    if (!res.ok) return [];
    const vars = await res.json() as any[];
    return vars.map((v) => ({
      attributes: (v.attributes as any[]).map((a) => `${a.name}: ${a.option}`).join(", "),
      price: v.price ? `AUD $${v.price}` : null,
      regular_price: v.regular_price ? `AUD $${v.regular_price}` : null,
      sale_price: v.on_sale && v.sale_price ? `AUD $${v.sale_price}` : null,
      in_stock: v.stock_status === "instock",
    }));
  } catch {
    return [];
  }
}

export async function searchProducts(query: string) {
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=5&status=publish`;
    const res = await fetch(url, { headers: { Authorization: auth() } });
    if (!res.ok) return { error: `WooCommerce ${res.status}` };

    const products = await res.json() as any[];
    if (!products.length) return { results: [], message: "No products found for that search." };

    const results = await Promise.all(products.map(async (p) => {
      const isVariable = p.type === "variable";
      const variations = isVariable ? await fetchVariations(p.id) : [];

      return {
        name: p.name,
        type: p.type,
        price: p.price ? `AUD $${p.price}` : null,
        price_range: p.price_html
          ? p.price_html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60)
          : null,
        on_sale: p.on_sale ?? false,
        in_stock: p.stock_status === "instock",
        url: p.permalink,
        categories: (p.categories as any[])?.map((c) => c.name).join(", ") ?? "",
        variations: variations.slice(0, 10), // top 10 variations
      };
    }));

    return { results };
  } catch (err) {
    return { error: String(err) };
  }
}
