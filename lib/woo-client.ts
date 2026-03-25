const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
const PLON_ORIGIN = "https://www.plasticonline.com.au";

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

// Fetch a fresh nonce from the calculator page (valid ~12h in WordPress)
async function fetchNonce(): Promise<string | null> {
  try {
    const res = await fetch(`${PLON_ORIGIN}/pricing-calculator/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();
    const match = html.match(/["']nonce["']\s*:\s*["']([a-f0-9]+)["']/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchVariations(productId: number) {
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=50`;
    const res = await fetch(url, { headers: { Authorization: auth() } });
    if (!res.ok) return [];
    const vars = await res.json() as any[];
    return vars.map((v) => ({
      variation_id: v.id,
      attributes: (v.attributes as any[]).map((a) => ({ name: a.name, option: a.option })),
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
        product_id: p.id,
        name: p.name,
        type: p.type,
        in_stock: p.stock_status === "instock",
        url: p.permalink,
        categories: (p.categories as any[])?.map((c) => c.name).join(", ") ?? "",
        // Each variation includes variation_id + attributes (color, thickness etc.)
        variations: variations.slice(0, 20),
      };
    }));

    return { results };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function calculateCutToSizePrice(params: {
  productId: number;
  variationId: number;
  color: string;
  thickness: string;
  widthMm: number;
  heightMm: number;
  quantity?: number;
}) {
  try {
    const nonce = await fetchNonce();
    if (!nonce) return { error: "Could not fetch pricing nonce from site" };

    const qty = params.quantity ?? 1;

    const body = new URLSearchParams({
      action: "cpc_get_unit_price",
      nonce,
      product_id: String(params.productId),
      color: params.color,
      thickness: params.thickness,
      variation_id: String(params.variationId),
    });

    const res = await fetch(`${PLON_ORIGIN}/wp-admin/admin-ajax.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": PLON_ORIGIN,
        "Referer": `${PLON_ORIGIN}/pricing-calculator/`,
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
    });

    if (!res.ok) return { error: `Calculator error ${res.status}` };

    const json = await res.json() as any;
    if (!json.success) return { error: "Calculator returned an error" };

    const { unit_price, constraints } = json.data;

    // Validate dimensions against sheet constraints
    const maxW = constraints?.max_width ?? 9999;
    const maxH = constraints?.max_height ?? 9999;
    if (params.widthMm > maxW || params.heightMm > maxH) {
      return {
        error: `Dimensions exceed maximum sheet size (${maxW}mm × ${maxH}mm). Our team can quote for larger cuts.`,
      };
    }

    const areaSqm = (params.widthMm / 1000) * (params.heightMm / 1000);
    const unitTotal = unit_price * areaSqm;
    const total = Math.round(unitTotal * qty * 100) / 100;

    return {
      price_per_sqm: `AUD $${unit_price.toFixed(2)}`,
      area_sqm: Math.round(areaSqm * 1000) / 1000,
      quantity: qty,
      unit_total: `AUD $${unitTotal.toFixed(2)}`,
      total: `AUD $${total.toFixed(2)}`,
      note: "Pricing is ex-GST. GST will be added at checkout.",
      product_url: `${PLON_ORIGIN}/?p=${params.productId}`,
    };
  } catch (err) {
    return { error: String(err) };
  }
}
