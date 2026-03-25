const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
const PLON_ORIGIN = "https://www.plasticonline.com.au";

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

const AJAX_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Origin": PLON_ORIGIN,
  "Referer": `${PLON_ORIGIN}/pricing-calculator/`,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/javascript, */*; q=0.01",
};

// Try to call cpc_get_unit_price — first without nonce (some plugins skip nonce for read ops),
// then with a nonce scraped from the page HTML
async function callPriceAjax(params: {
  productId: number;
  variationId: number;
  color: string;
  thickness: string;
}): Promise<{ unit_price: number; constraints: any } | { error: string }> {
  const buildBody = (nonce?: string) => {
    const p: Record<string, string> = {
      action: "cpc_get_unit_price",
      product_id: String(params.productId),
      color: params.color,
      thickness: params.thickness,
      variation_id: String(params.variationId),
    };
    if (nonce) p.nonce = nonce;
    return new URLSearchParams(p).toString();
  };

  // Attempt 1: no nonce
  try {
    const res = await fetch(`${PLON_ORIGIN}/wp-admin/admin-ajax.php`, {
      method: "POST",
      headers: AJAX_HEADERS,
      body: buildBody(),
    });
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && json.data?.unit_price) return json.data;
    }
  } catch { /* fall through */ }

  // Attempt 2: scrape nonce from page
  try {
    const pageRes = await fetch(`${PLON_ORIGIN}/pricing-calculator/`, {
      headers: {
        "User-Agent": AJAX_HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/["']nonce["']\s*:\s*["']([a-f0-9]{8,12})["']/);
      const nonce = match?.[1];
      if (nonce) {
        const res = await fetch(`${PLON_ORIGIN}/wp-admin/admin-ajax.php`, {
          method: "POST",
          headers: AJAX_HEADERS,
          body: buildBody(nonce),
        });
        if (res.ok) {
          const json = await res.json() as any;
          if (json.success && json.data?.unit_price) return json.data;
          return { error: `Calculator rejected request: ${JSON.stringify(json)}` };
        }
      }
    }
  } catch (err) {
    return { error: `Page scrape failed: ${String(err)}` };
  }

  return { error: "Could not reach the pricing calculator — try again in a moment." };
}

async function fetchVariations(productId: number) {
  try {
    const url = `${WOO_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=50`;
    const res = await fetch(url, { headers: { Authorization: auth() } });
    if (!res.ok) return [];
    const vars = await res.json() as any[];
    return vars.map((v) => {
      // Extract CPC unit price from meta_data if present
      const meta: Record<string, any> = {};
      if (Array.isArray(v.meta_data)) {
        for (const m of v.meta_data) {
          meta[m.key] = m.value;
        }
      }
      return {
        variation_id: v.id,
        attributes: (v.attributes as any[]).map((a) => ({ name: a.name, option: a.option })),
        in_stock: v.stock_status === "instock",
        meta,
      };
    });
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
  const result = await callPriceAjax(params);
  if ("error" in result) return result;

  const { unit_price, constraints } = result;
  const qty = params.quantity ?? 1;

  // Validate dimensions
  const maxW = constraints?.max_width ?? 9999;
  const maxH = constraints?.max_height ?? 9999;
  if (params.widthMm > maxW || params.heightMm > maxH) {
    return {
      error: `That exceeds our max sheet size of ${maxW} by ${maxH}mm — our team can quote for larger cuts.`,
    };
  }

  const areaSqm = (params.widthMm / 1000) * (params.heightMm / 1000);
  const unitTotal = unit_price * areaSqm;
  const total = Math.round(unitTotal * qty * 100) / 100;

  return {
    price_per_sqm: `AUD $${unit_price.toFixed(2)}`,
    dimensions: `${params.widthMm} by ${params.heightMm}mm`,
    area_sqm: Math.round(areaSqm * 1000) / 1000,
    quantity: qty,
    unit_total: `AUD $${unitTotal.toFixed(2)}`,
    total: `AUD $${total.toFixed(2)}`,
    note: "Ex-GST. GST added at checkout.",
    product_url: `${PLON_ORIGIN}/?p=${params.productId}`,
  };
}
