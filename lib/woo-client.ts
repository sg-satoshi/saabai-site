const WOO_URL = process.env.WOOCOMMERCE_URL!;
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
const PLON_ORIGIN = "https://www.plasticonline.com.au";
const PLON_PRICE_API = `${PLON_ORIGIN}/wp-json/plon/v1/price`;

function auth() {
  return "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
}

async function callPriceApi(params: {
  productId: number;
  variationId: number;
  color: string;
  thickness: string;
}): Promise<{ unit_price: number; custom_multiplier: number; constraints: any } | { error: string }> {
  try {
    const qs = new URLSearchParams({
      product_id: String(params.productId),
      variation_id: String(params.variationId),
      color: params.color,
      thickness: params.thickness,
    });
    const res = await fetch(`${PLON_PRICE_API}?${qs}`);
    if (!res.ok) return { error: `Price API returned ${res.status}` };
    const json = await res.json() as any;
    if (json.unit_price) return { unit_price: json.unit_price, custom_multiplier: json.custom_multiplier ?? 1, constraints: json.constraints };
    return { error: `Unexpected response: ${JSON.stringify(json)}` };
  } catch (err) {
    return { error: `Price API call failed: ${String(err)}` };
  }
}

async function fetchVariations(productId: number) {
  try {
    const allVars: any[] = [];
    const pageSize = 100;
    let page = 1;

    // Paginate until all variations are fetched (products like acrylic have 100+)
    while (true) {
      const url = `${WOO_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=${pageSize}&page=${page}`;
      const res = await fetch(url, { headers: { Authorization: auth() } });
      if (!res.ok) break;
      const vars = await res.json() as any[];
      if (!vars.length) break;
      allVars.push(...vars);
      if (vars.length < pageSize) break; // last page
      page++;
    }

    return allVars.map((v) => {
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

export interface WooOrder {
  id: number;
  number: string;        // formatted order number e.g. "PLON-48376"
  date_created: string;
  status: string;
  total: string;
  currency: string;
  customer_id: number;  // 0 for guest checkout
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{ name: string; quantity: number; total: string }>;
  meta_data: Array<{ key: string; value: unknown }>;
}

// Tags a WooCommerce customer with their Rex conversation date.
// Called fire-and-forget at lead capture time so attribution survives Redis flushes.
// Returns the WooCommerce customer_id if found and tagged, null otherwise.
// Safe to call multiple times — first Rex contact wins (existing tag is not overwritten).
export async function tagRexLead(email: string, leadTimestamp: string): Promise<number | null> {
  try {
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) return null;
    const searchRes = await fetch(
      `${WOO_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
      { headers: { Authorization: auth() } }
    );
    if (!searchRes.ok) return null;
    const customers = await searchRes.json() as any[];
    const customer = customers[0];
    if (!customer?.id) return null; // no WooCommerce account for this email yet
    // Don't overwrite an existing tag — first Rex contact wins
    const alreadyTagged = (customer.meta_data ?? []).some((m: any) => m.key === "_rex_lead_date");
    if (alreadyTagged) return customer.id as number;
    // Write the tag
    const updateRes = await fetch(`${WOO_URL}/wp-json/wc/v3/customers/${customer.id}`, {
      method: "PUT",
      headers: { Authorization: auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ meta_data: [{ key: "_rex_lead_date", value: leadTimestamp }] }),
    });
    return updateRes.ok ? customer.id as number : null;
  } catch {
    return null;
  }
}

export async function fetchRecentOrders(days = 60): Promise<WooOrder[]> {
  try {
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) return [];
    const after = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const allOrders: WooOrder[] = [];
    const pageSize = 100;
    let page = 1;
    while (true) {
      const url = `${WOO_URL}/wp-json/wc/v3/orders?per_page=${pageSize}&page=${page}&after=${encodeURIComponent(after)}&status=processing,completed&orderby=date&order=desc`;
      const res = await fetch(url, { headers: { Authorization: auth() } });
      if (!res.ok) break;
      const orders = await res.json() as WooOrder[];
      if (!orders.length) break;
      allOrders.push(...orders);
      if (orders.length < pageSize) break;
      page++;
    }
    return allOrders;
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
        imageUrl: (p.images as any[])?.[0]?.src ?? "",
        categories: (p.categories as any[])?.map((c) => c.name).join(", ") ?? "",
        variations,
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
  applyMultiplier?: boolean; // true for acrylic/polycarbonate; other materials have it baked into unit_price
}) {
  const result = await callPriceApi(params);
  if ("error" in result) return result;

  const { unit_price, custom_multiplier, constraints } = result;
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
  // PLON's price API returns custom_multiplier for all products, but only acrylic/polycarbonate
  // actually apply it in their CTS calculator — other materials have the CTS rate baked into unit_price.
  const multiplier = (params.applyMultiplier ?? false) ? (custom_multiplier ?? 1) : 1;
  const unitTotal = unit_price * multiplier * areaSqm;
  const total = Math.round(unitTotal * qty * 100) / 100;

  return {
    price_per_sqm: `AUD $${unit_price.toFixed(2)} /m²`,
    dimensions: `${params.widthMm}mm by ${params.heightMm}mm`,
    area_sqm: Math.round(areaSqm * 1000) / 1000,
    quantity: qty,
    unit_total: `AUD $${unitTotal.toFixed(2)} Ex GST`,
    total: `AUD $${total.toFixed(2)} Ex GST`,
    note: "GST added at checkout.",
    product_url: `${PLON_ORIGIN}/?p=${params.productId}`,
    add_to_cart_url: `${PLON_ORIGIN}/?add-to-cart=${params.variationId}`,
  };
}
