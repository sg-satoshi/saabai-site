/**
 * Rex Checkout
 *
 * Accepts one or more cut-to-size items, creates a single WooCommerce pending
 * order with full CTS meta (_calculator_raw_data), and returns the order's
 * checkout_payment_url so Rex can send a Pay button in chat.
 *
 * Supports both formats:
 *   Single item (legacy): { material, colour, thicknessMm, widthMm, heightMm, qty, priceExGst, ... }
 *   Multi item:           { items: [...], customerName, customerEmail }
 */

import { searchProducts } from "../../../lib/woo-client";

export const runtime = "nodejs";

const WC_URL = "https://www.plasticonline.com.au";

function getAuth() {
  const key    = process.env.WC_CONSUMER_KEY    ?? "";
  const secret = process.env.WC_CONSUMER_SECRET ?? "";
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

function normNum(s: string): string {
  return s.replace(/[^0-9.]/g, "").replace(/\.0+$/, "");
}

function thicknessMatches(option: string, target: string): boolean {
  return normNum(option) === normNum(target);
}

function colourMatches(option: string, target: string): boolean {
  if (!target) return true;
  const opt = option.toLowerCase();
  const tgt = target.toLowerCase();
  if (!tgt.includes("satin") && opt.includes("satin")) return false;
  return opt.includes(tgt) || tgt.includes(opt);
}

interface CheckoutItem {
  material:     string;
  colour?:      string;
  thicknessMm:  number;
  widthMm:      number;
  heightMm:     number;
  qty?:         number;
  priceExGst:   number;   // per piece, ex GST
  productName?: string;
}

interface ResolvedLineItem {
  wcLineItem:   object;
  lineExGst:    number;
  description:  string;
  qty:          number;
}

async function resolveLineItem(item: CheckoutItem): Promise<ResolvedLineItem | { error: string }> {
  const {
    material,
    colour      = "",
    thicknessMm,
    widthMm,
    heightMm,
    qty         = 1,
    priceExGst,
    productName = "",
  } = item;

  // ── Find product + variation ────────────────────────────────────────────────
  const search = await searchProducts(`${material} sheet`);
  if ("error" in search || !search.results?.length) {
    return { error: `Product not found: ${material}` };
  }

  let productId: number | undefined;
  let variationId: number | undefined;
  let resolvedProductName = productName;
  let sheetSize = "2440 X 1220";

  const isStandardSheet = (attrs: Array<{ name: string; option: string }>) => {
    const sizeAttr = attrs.find(a => a.name === "Size");
    if (!sizeAttr) return true;
    return sizeAttr.option.includes("2440") && sizeAttr.option.includes("1220");
  };

  type Variation = { variation_id: number; attributes: Array<{ name: string; option: string }>; in_stock: boolean };

  outer:
  for (const product of search.results) {
    productId = product.product_id as number;
    resolvedProductName = resolvedProductName || product.name;
    const candidates: Variation[] = [];
    for (const variation of (product.variations as Variation[])) {
      if (!variation.in_stock) continue;
      const attrs = variation.attributes;
      const thicknessAttr = attrs.find(a => /thickness|gauge/i.test(a.name));
      const colourAttr    = attrs.find(a => /colou?r/i.test(a.name));
      const tMatch = !thicknessMm || (thicknessAttr && thicknessMatches(thicknessAttr.option, String(thicknessMm)));
      const cMatch = !colour      || (colourAttr    && colourMatches(colourAttr.option, colour));
      if (tMatch && cMatch) candidates.push(variation);
    }
    if (candidates.length) {
      const match = candidates.find(v => isStandardSheet(v.attributes)) ?? candidates[0];
      variationId = match.variation_id;
      const sizeAttr = match.attributes.find(a => a.name === "Size");
      if (sizeAttr) sheetSize = sizeAttr.option;
      break outer;
    }
  }

  if (!productId) {
    return { error: `No matching variation found for ${material} ${colour} ${thicknessMm}mm` };
  }

  // ── Build pricing ───────────────────────────────────────────────────────────
  const area       = (widthMm * heightMm) / 1_000_000;
  const unitPrice  = area > 0 ? priceExGst / area : 0;
  const lineExGst  = Math.round(priceExGst * qty * 100) / 100;

  // ── Build _calculator_raw_data ──────────────────────────────────────────────
  const calculatorRawData = {
    shape:                "rectangle",
    product_name:         resolvedProductName,
    color:                colour,
    thickness:            `${thicknessMm}mm`,
    height:               heightMm,
    width:                widthMm,
    diameter:             0,
    area:                 Math.round(area * 10000) / 10000,
    unit_price:           Math.round(unitPrice * 100) / 100,
    addons_data:          [],
    addon_price:          0,
    addon_details:        "",
    additional_info:      "",
    base_price:           priceExGst,
    subtotal:             priceExGst,
    total_price:          lineExGst,
    one_time_base_price:  0,
    per_item_cost:        priceExGst,
    has_one_time_base_price: 0,
    original_quantity:    qty,
    uploaded_file:        "",
    preview_image:        "",
  };

  const wcLineItem = {
    product_id:   productId,
    ...(variationId ? { variation_id: variationId } : {}),
    quantity:     qty,
    subtotal:     lineExGst.toFixed(2),
    total:        lineExGst.toFixed(2),
    meta_data: [
      { key: "colour-and-features", value: colour },
      { key: "thickness",           value: `${thicknessMm}mm` },
      { key: "size",                value: sheetSize },
      { key: "Product Type",        value: resolvedProductName },
      { key: "Shape",               value: "Rectangle" },
      { key: "Color",               value: colour },
      { key: "Thickness",           value: `${thicknessMm}mm` },
      { key: "Dimensions",          value: `${widthMm}mm x ${heightMm}mm` },
      { key: "Area",                value: `${(Math.round(area * 10000) / 10000).toFixed(4)} m\u00b2` },
      { key: "_calculator_raw_data", value: JSON.stringify(calculatorRawData) },
    ],
  };

  return {
    wcLineItem,
    lineExGst,
    qty,
    description: `${colour} ${resolvedProductName || material} ${thicknessMm}mm — ${widthMm}×${heightMm}mm`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both array format { items: [...] } and legacy single-item flat format
    const rawItems: CheckoutItem[] = body.items ?? [{
      material:    body.material,
      colour:      body.colour      ?? "",
      thicknessMm: body.thicknessMm,
      widthMm:     body.widthMm,
      heightMm:    body.heightMm,
      qty:         body.qty         ?? 1,
      priceExGst:  body.priceExGst,
      productName: body.productName ?? "",
    }];

    const customerName  = (body.customerName  ?? "").trim();
    const customerEmail =  body.customerEmail ?? "";

    // Validate all items up front
    for (const item of rawItems) {
      if (!item.material || !item.thicknessMm || !item.widthMm || !item.heightMm || !item.priceExGst) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
    }

    // Resolve each item to a WooCommerce line item
    const resolved: ResolvedLineItem[] = [];
    for (const item of rawItems) {
      const result = await resolveLineItem(item);
      if ("error" in result) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      resolved.push(result);
    }

    // Aggregate totals
    const lineExGst   = Math.round(resolved.reduce((s, r) => s + r.lineExGst, 0) * 100) / 100;
    const gst         = Math.round(lineExGst * 0.1 * 100) / 100;
    const totalIncGst = Math.round((lineExGst + gst) * 100) / 100;

    // Create WooCommerce order
    const [firstName, ...rest] = customerName.split(" ");
    const lastName = rest.join(" ");

    const orderBody = {
      status: "pending",
      billing: {
        first_name: firstName ?? "",
        last_name:  lastName  ?? "",
        email:      customerEmail,
        country:    "AU",
      },
      line_items: resolved.map(r => r.wcLineItem),
    };

    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
      method:  "POST",
      headers: { Authorization: getAuth(), "Content-Type": "application/json" },
      body:    JSON.stringify(orderBody),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[rex-checkout] WC order creation failed:", err);
      return Response.json({ error: "Order creation failed", detail: err }, { status: 502 });
    }

    const order = await res.json();

    return Response.json({
      orderId:        order.id,
      orderNumber:    order.number,
      checkoutUrl:    order.checkout_payment_url,
      totalIncGst,
      totalFormatted: `$${totalIncGst.toFixed(2)}`,
      lineExGst,
      gst,
      items: resolved.map(r => ({
        description: r.description,
        qty:         r.qty,
        lineExGst:   r.lineExGst,
      })),
    });

  } catch (err) {
    console.error("[rex-checkout]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
