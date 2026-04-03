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
