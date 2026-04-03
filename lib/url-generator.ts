/**
 * Product URL Generator for PlasticOnline
 * 
 * Dynamically generates product page URLs instead of storing them in the knowledge base.
 * Reduces KB token usage by ~500 tokens.
 */

const PRODUCT_URL_MAP: Record<string, string> = {
  // Sheets
  "acrylic": "acrylic-sheet",
  "acrylic sheet": "acrylic-sheet",
  "perspex": "acrylic-sheet",
  "polycarbonate": "polycarbonate-sheet",
  "polycarbonate sheet": "polycarbonate-sheet",
  "pc": "polycarbonate-sheet",
  "hdpe": "hdpe-polyethylene-cutting-board",
  "hdpe sheet": "hdpe-polyethylene-cutting-board",
  "polyethylene": "hdpe-polyethylene-cutting-board",
  "seaboard": "seaboard-hdpe-marine-grade",
  "seaboard hdpe": "seaboard-hdpe-marine-grade",
  "playground hdpe": "hdpe-playground-board",
  "nylon": "nylon-sheet",
  "nylon sheet": "nylon-sheet",
  "acetal": "acetal-pom-c-plastic-sheet",
  "acetal sheet": "acetal-pom-c-plastic-sheet",
  "pom-c": "acetal-pom-c-plastic-sheet",
  "polypropylene": "polypropylene",
  "polypropylene sheet": "polypropylene",
  "pp": "polypropylene",
  "ptfe": "ptfe-teflon-sheet",
  "ptfe sheet": "ptfe-teflon-sheet",
  "teflon": "ptfe-teflon-sheet",
  "uhmwpe": "uhmwpe-sheet",
  "uhmwpe sheet": "uhmwpe-sheet",
  "petg": "petg-polyethylene-terephthalate-glycol-modified-sheet",
  "petg sheet": "petg-polyethylene-terephthalate-glycol-modified-sheet",
  "hips": "hips-sheet",
  "hips sheet": "hips-sheet",
  "abs": "abs-sheet",
  "abs sheet": "abs-sheet",
  "pvc": "pvc-sheet",
  "pvc sheet": "pvc-sheet",
  "rigid pvc": "pvc-sheet",
  "foam pvc": "foam-pvc",
  "corflute": "corflute-corragatted-flute-board",
  "acp": "acm",
  "acm": "acm",
  "acm panel": "acm",
  "acrylic mirror": "silver-gold-commercial-acrylic-mirror",
  "mirror": "silver-gold-commercial-acrylic-mirror",
  "euromir": "euromir-acrylic-mirror",
  "peek": "peek-polyether-ether-ketone-sheet",
  "peek sheet": "peek-polyether-ether-ketone-sheet",
  
  // Rods
  "acrylic rod": "acrylic-clear-rod",
  "acetal rod": "acetal-rod",
  "nylon rod": "nylon-rod",
  "hdpe rod": "hdpe-high-density-polyethylene-rod",
  "uhmwpe rod": "uhmwpe-rod-natural-only-white",
  "pp rod": "polypropylene-pp-rod",
  "polypropylene rod": "polypropylene-pp-rod",
  "pvc rod": "grey-pvc-rod",
  "ptfe rod": "ptfe-teflon-virgin-rod",
  "teflon rod": "ptfe-teflon-virgin-rod",
  "peek rod": "peek-rod",
  
  // Tubes
  "acrylic tube": "acrylic-clear-tubes",
  "acrylic clear tube": "acrylic-clear-tubes",
  "acrylic square tube": "acrylic-square-tubes",
  "acrylic opal tube": "acrylic-opal-tube",
  "polycarbonate tube": "polycarbonate-tube",
  "pc tube": "polycarbonate-tube",
};

/**
 * Generate a PlasticOnline product page URL from a material name.
 * 
 * @param material - Material name (e.g. "acrylic", "polycarbonate", "nylon rod")
 * @returns Full product page URL or shop fallback
 */
export function getProductUrl(material: string): string {
  const normalized = material.toLowerCase().trim();
  const slug = PRODUCT_URL_MAP[normalized];
  
  if (!slug) {
    // Fallback to shop page if material not found
    return "https://www.plasticonline.com.au/shop/";
  }
  
  return `https://www.plasticonline.com.au/product/${slug}/`;
}

/**
 * Generate a cart URL with pre-filled product for WooCommerce.
 * 
 * @param productId - WooCommerce product ID
 * @param variationId - WooCommerce variation ID (if applicable)
 * @param quantity - Quantity to add
 * @returns Cart URL
 */
export function getCartUrl(productId: number, variationId?: number, quantity: number = 1): string {
  const base = "https://www.plasticonline.com.au/cart/";
  const params = new URLSearchParams({
    "add-to-cart": String(productId),
    quantity: String(quantity),
  });
  
  if (variationId) {
    params.append("variation_id", String(variationId));
  }
  
  return `${base}?${params.toString()}`;
}

export interface CheckoutData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  deliveryMethod?: "pickup" | "delivery";
}

/**
 * Generate a pre-filled checkout URL for one-click purchase.
 * Customer data from Rex quote form is passed through so WooCommerce checkout is pre-populated.
 * 
 * @param productId - WooCommerce product ID
 * @param variationId - WooCommerce variation ID (if applicable)
 * @param quantity - Quantity to add
 * @param checkoutData - Customer details from quote form
 * @returns Checkout URL with pre-filled fields
 */
export function getCheckoutUrl(
  productId: number,
  variationId: number | undefined,
  quantity: number,
  checkoutData: CheckoutData
): string {
  const params = new URLSearchParams({
    "add-to-cart": String(productId),
    quantity: String(quantity),
  });
  
  if (variationId) {
    params.append("variation_id", String(variationId));
  }
  
  // Parse name into first/last if provided
  if (checkoutData.name) {
    const parts = checkoutData.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    if (firstName) params.append("billing_first_name", firstName);
    if (lastName) params.append("billing_last_name", lastName);
  }
  
  if (checkoutData.email) {
    params.append("billing_email", checkoutData.email);
  }
  
  if (checkoutData.phone) {
    params.append("billing_phone", checkoutData.phone);
  }
  
  // Parse address string if provided (format: "123 Main St, Brisbane, QLD, 4000")
  if (checkoutData.address) {
    const addressParts = checkoutData.address.split(",").map(s => s.trim());
    if (addressParts.length >= 1) params.append("billing_address_1", addressParts[0]);
    if (addressParts.length >= 2) params.append("billing_city", checkoutData.city || addressParts[1]);
    if (addressParts.length >= 3) params.append("billing_state", checkoutData.state || addressParts[2]);
    if (addressParts.length >= 4) params.append("billing_postcode", checkoutData.postcode || addressParts[3]);
  }
  
  // Set shipping method based on delivery preference
  if (checkoutData.deliveryMethod === "pickup") {
    params.append("shipping_method", "local_pickup");
  } else if (checkoutData.deliveryMethod === "delivery") {
    params.append("shipping_method", "flat_rate");
  }
  
  return `https://www.plasticonline.com.au/checkout/?${params.toString()}`;
}
