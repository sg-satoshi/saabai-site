import { searchProducts, calculateCutToSizePrice } from "../../../lib/woo-client";

export const runtime = "nodejs";

export async function GET() {
  const log: string[] = [];

  try {
    log.push("Step 1: Calling searchProducts('acrylic sheet')...");
    const search = await searchProducts("acrylic sheet");

    if ("error" in search) {
      return Response.json({ log, error: `searchProducts failed: ${search.error}` });
    }

    log.push(`searchProducts returned ${search.results?.length ?? 0} results`);

    if (!search.results?.length) {
      return Response.json({ log, error: "No products found" });
    }

    const product = search.results[0];
    log.push(`First product: id=${product.product_id}, name="${product.name}", variations fetched=${product.variations?.length ?? 0}`);

    const normNum = (s: string) => s.replace(/[^0-9.]/g, "").replace(/\.0+$/, "");
    const thickStr = "10"; // 10mm
    const colStr = "clear";

    const isStandardSheet = (attrs: Array<{ name: string; option: string }>) => {
      const sizeAttr = attrs.find(a => a.name === "Size");
      if (!sizeAttr) return false;
      return sizeAttr.option.includes("2440") && sizeAttr.option.includes("1220");
    };

    type VariationRaw = {
      variation_id: number;
      attributes: Array<{ name: string; option: string }>;
      in_stock: boolean;
    };

    const matches: VariationRaw[] = [];

    for (const v of (product.variations as VariationRaw[])) {
      if (!v.in_stock) continue;
      const attrs = v.attributes;
      const thicknessAttr = attrs.find(a => /thickness|gauge/i.test(a.name));
      const colourAttr = attrs.find(a => /colou?r/i.test(a.name));

      if (thicknessAttr) log.push(`  variation ${v.variation_id}: thickness="${thicknessAttr.option}", colour="${colourAttr?.option ?? "none"}"`);

      const tMatch = !thickStr || (thicknessAttr && normNum(thicknessAttr.option) === thickStr);
      const cMatch = !colStr || (colourAttr && (
        colourAttr.option.toLowerCase().includes(colStr) ||
        colStr.includes(colourAttr.option.toLowerCase())
      ));
      if (tMatch && cMatch) {
        matches.push(v);
        log.push(`    → MATCH (tMatch=${tMatch}, cMatch=${cMatch})`);
      }
    }

    log.push(`Found ${matches.length} matching variations`);

    if (!matches.length) {
      return Response.json({ log, error: "No matching variation for 10mm clear" });
    }

    const chosen = matches.find(v => isStandardSheet(v.attributes)) ?? matches[0];
    const chosenAttrs = chosen.attributes;
    const thicknessAttr = chosenAttrs.find(a => /thickness|gauge/i.test(a.name));
    const colourAttr = chosenAttrs.find(a => /colou?r/i.test(a.name));

    log.push(`Chosen variation: id=${chosen.variation_id}, isStandard=${isStandardSheet(chosenAttrs)}`);
    log.push(`  colour="${colourAttr?.option}", thickness="${thicknessAttr?.option}"`);

    log.push("Step 2: Calling calculateCutToSizePrice for 900×900mm...");

    const woo = await calculateCutToSizePrice({
      productId: product.product_id,
      variationId: chosen.variation_id,
      color: colourAttr?.option ?? "",
      thickness: thicknessAttr?.option ?? "",
      widthMm: 900,
      heightMm: 900,
      quantity: 1,
    });

    log.push(`calculateCutToSizePrice result: ${JSON.stringify(woo)}`);

    return Response.json({ log, result: woo });
  } catch (err) {
    log.push(`EXCEPTION: ${String(err)}`);
    return Response.json({ log, error: String(err) }, { status: 500 });
  }
}
