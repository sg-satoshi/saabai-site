/**
 * Rex Knowledge Base — PlasticOnline (PLON)
 *
 * Architecture: sectioned modules, full-context injection
 *
 * The KB is split into 7 topic modules for maintainability and future RAG readiness.
 * At current scale (~5k tokens), full-context injection with Anthropic prompt caching
 * is faster than tool-based retrieval — cached tokens are read nearly instantly,
 * while each getKnowledge tool call adds ~0.5–1s of round-trip latency.
 *
 * When the KB grows beyond ~15k tokens, flip to sectioned retrieval:
 *   1. Replace REX_KNOWLEDGE with KB_INDEX in the system prompt
 *   2. Register the getKnowledge tool in pete-chat/route.ts
 *   3. The getKnowledgeSection() function and KB_INDEX export are already ready
 *
 * Sections: company | products | materials_clear | materials_engineering | materials_signage | selection | faqs
 */

// ── Sections ──────────────────────────────────────────────────────────────────

const COMPANY = `
## COMPANY

**PlasticOnline** — Australia's largest online range of cut-to-size plastic sheets, rods, and tubes. Gold Coast based, shipping nationally since 1988. Queensland authorised reseller of Perspex® acrylic.

### Locations & Contact

**Molendinar (Head Facility)**
13 Distribution Avenue, Molendinar QLD 4214 · (07) 5564 6744 · Mon–Fri 7:30am–4:00pm

**Burleigh Heads**
9 Leda Drive, Burleigh Heads QLD 4220 · (07) 5535 7544 · Mon–Fri 7:30am–4:00pm

**Online:** sales@hollandplastics.com.au · plasticonline.com.au

### Ordering & Service

- Minimum order: AUD $50 Ex GST. Orders under $50 incur a $30 cutting fee.
- Up to 10 cuts included with every order — no setup fees.
- 5% bulk discount on 5+ sheets of the same product.
- Freight calculator on site; ships nationwide. Typical lead time: a few business days.
- Payment online via standard methods. Pick-up available at both locations.

### Fabrication Capabilities

**Cutting:** CNC Laser (acrylic up to 25mm, steel up to 10mm), CNC Router, Water Jet, Panel Saws
**Forming:** CNC Vacuum Forming, Thermoforming (acrylic up to 2500×1830mm), Twin-Skin Vacuum Forming (HIA, ABS, ASA, HIPS, PP, HDPE), Line Bending
**Fabrication:** Hot air welding, solvent cement bonding, assembly, drilling, diamond polishing
**Engraving/Signage:** 2D/3D Laser Engraving, 3D Router Cutting, Custom Signs & Lettering
**Design:** In-house design service

### Industries Served

Signage, Marine, Industrial/Mining, Engineering/Electrical/Plumbing/Civil, Retail/Shop Fitting, Building/Architecture, Food Industry, Healthcare, DIY/Trade
`;

const PRODUCTS = `
## PRODUCTS

### What We Stock

**Sheets:** Acrylic (Perspex), Polycarbonate, HDPE, Seaboard HDPE Marine, Playground HDPE, Nylon, Acetal (POM-C), Polypropylene, PTFE (Teflon), UHMWPE, PETG, HIPS, ABS, PVC Rigid, Foam PVC, Corflute, ACM/ACP Panel, Acrylic Mirror, EuroMir

**Rods:** Acrylic, Acetal (POM-C), Nylon, HDPE, UHMWPE, Polypropylene, PVC, PTFE (Teflon), PEEK

**Tubes:** Acrylic (clear, opal, square), Polycarbonate

### Accessories & Adhesives

**Adhesives:** Quick Bond 5 (water-thin, acrylic/PC/ABS), Quick Bond 10 (thickened, acrylic/PVC), Quick Bond 20 (fast-cure, ABS/HIPS/PVC/PETG), Quick Bond 25 (thickened, acrylic/PC/HIPS/ABS/PVC)

**Extrusions:** J Bar, H Mould, W-Bar, Step-Strip, Slatwall Extrusion, Triangle Rod, Square Rods

**Hinges/Fasteners:** Plastic Hinges (38×45mm, clear/white/black), Piano Hinge, Flex Fold Hinge, Hasp & Staple, Door Catch

**Display:** Taymar & Expanda Stand holders, sneeze guards, Construct-IT 35mm tubing system

### Perspex® Brand

We are the authorised Queensland reseller of the full Perspex® range: Fluorescent, Spectrum, Frost, Royals, Naturals, Pearlescent, Tints, Opals, Sweet Pastels, VE Gallery Grade (premium optical). 100+ colours including Clear, Magenta 100, Blues 324/327/835, Ivory 801, Grey 504, Orange 266, Reds 115/128/136, Green 617, Yellow 235, Opal grades, Frosted, Mirror (Silver & Gold).

### Lighting & Diffuser Products

Prismatic Diffuser Sheet (Y12, Y15, Y19), Skylight Diffuser panels, Eggcrate Louvres, Slumped Acrylic panels, Acryplex Architectural Sheet
`;

const MATERIALS_CLEAR = `
## MATERIALS — TRANSPARENT (Acrylic, Polycarbonate, PETG)

### ACRYLIC (PMMA)
Also known as: Perspex, Plexiglass, Oroglas

**Properties:** 92% light transmission (higher than glass); 17× stronger than glass; lighter; weathers well outdoors.

**Cast vs Extruded:**
- Cast = superior optical quality, harder, more scratch-resistant, better solvent bonding, available up to 50mm+. Use for signage, aquariums, display work.
- Extruded = tighter thickness tolerance, lower cost, lower forming temp (~100°C vs 120°C). Use for thermoforming.

**LASER CUTTING:** Cast gives flame-polished edge + bright white engraving — preferred for signage. Extruded engraves smoky, less defined.

**AQUARIUMS:** Cast acrylic only — extruded is craze-prone with solvent cement and not suitable for water pressure. Never use PC as primary panels.

**BONDING (solvent cement):** Hold parts in tight contact → apply Quick Bond 5 to joint with needle syringe → capillary action draws it in → hold 60s → don't stress-load for 10 minutes → full cure 24hrs. Do NOT use acetone — it crazes acrylic instead of bonding it.

**UV:** Inherently UV resistant, no yellowing for 10+ years outdoors. Best outdoor clear plastic.

**Other grades:** Impact-modified HIA (toughened, thermoforming/sneeze guards), Opal/diffusion (light panels), Frosted/satin (decorative), Mirror (85%+ reflectivity, 5–10× more impact-resistant than glass mirror).

**Applications:** Signage, retail displays, glazing, aquariums, light fittings, sneeze guards, boat windscreens, machine covers.

**ACRYLIC MIRROR PRICING — April 2026 (ex GST)**

All 3mm, sheet size 2440×1220mm. CTS = cut-to-size ($/m²). Orders under $50 charged a $35 cutting fee. Where CTS total exceeds full sheet price, charge full sheet price + cutting fee instead.

| Colour | CTS ($/m²) | Full Sheet |
|--------|-----------|------------|
| Silver | $198.87 | $296 |
| Gold | $237.84 | $354 |
| Rose Gold | $237.84 | $354 |
| Amber | $272.41 | $405 |
| Grey | $272.41 | $405 |
| Red | $272.41 | $405 |

Note: Silver/Gold/Rose Gold supplied by Plastral (cheapest). Amber/Grey/Red supplied by Dotmar.

---

### POLYCARBONATE (PC)
Also known as: Lexan, Makrolon, Tuffak

**Properties:** ~30× stronger than acrylic; 88–90% light transmission; virtually unbreakable; cold-bends without heating; service temp up to ~120°C.

**UV YELLOWING — critical for QLD:** Without UV protection: visible within 6–12 months, significant by 3–5 years. QLD UV index (10–13) accelerates this 30–50% vs southern states. ALWAYS specify UV co-extruded grade for outdoor use — blocks 98–99% UV below 385nm.

**SCRATCH RESISTANCE:** PC scratches easily despite impact strength. Acrylic is preferred for display cases and anywhere appearance matters.

**STRESS CRACKING — critical:** IPA (isopropyl alcohol), acetone, and aromatic solvents cause severe stress cracking even at low residual stress. NEVER clean PC with IPA. Use mild soap and water only.

**BONDING:** Does NOT bond with standard solvent cement — use PC-specific adhesives.

**Grades:** UV co-extruded (outdoor standard), Sign Grade (optimised for ink adhesion), Opal/tinted (skylights, glare control).

**Applications:** Machine guards, safety barriers, skylights, greenhouse panels, boat windows, security glazing, roofing, industrial enclosures.

**POLYCARBONATE LIGHT DIFFUSER PRICING — April 2026 (ex GST)**

| Thickness | Type | Size | CTS ($/m²) | Full Sheet |
|-----------|------|------|-----------|------------|
| 3mm | Clear Seadrift Embossed | 2440×1250 | $136.18 | $208 |

---

### PRISMATIC ACRYLIC & EGGCRATE LOUVRE

**PRISMATIC ACRYLIC PRICING — April 2026 (ex GST, supplier: AST)**

Prismatic diffuser sheets for lighting applications. CTS = cut-to-size ($/m²). Orders under $50 charged a $35 cutting fee. Where CTS total exceeds full sheet price, charge full sheet price + cutting fee.

| Thickness | Type | Size | CTS ($/m²) | Full Sheet |
|-----------|------|------|-----------|------------|
| 3mm | Clear Y12 | 2440×1220 | $114.22 | $170 |
| 4.5mm | Clear Y15 | 2440×1220 | $159.18 | $237 |
| 4mm | Clear Y25 | 1600×620 | $253.83 | $126 |

**EGG CRATE LOUVRE PRICING — April 2026 (ex GST, supplier: AST)**

| Thickness | Colour | Cell Size | Sheet Size | CTS ($/m²) | Full Sheet |
|-----------|--------|-----------|------------|-----------|------------|
| 8mm | Opal | 16×16mm | 1210×600 | $66.00 | $69 |
| 16mm | Silver | 16×16mm | 1213×603 | $143.55 | $54 |

Note: For the 16mm Silver eggcrate, the CTS rate exceeds the full sheet price — charge full sheet price ($54) + cutting fee instead.

---

### PETG (Polyethylene Terephthalate Glycol-Modified)

**Properties:** Excellent optical clarity (comparable to acrylic); 2–3× more impact resistant than acrylic in formed parts; food-safe (FDA); thermoforms at 140–160°C with no pre-drying.

**NOT the same as PET or CPET** — glycol-modified to stay amorphous, which is why it thermoforms cleanly. CPET crystallises and can't form to complex shapes.

**UV LIMITATION:** Yellows and becomes brittle within 1–2 years outdoors — indoor use only without UV treatment.

**PETG vs Acrylic:** PETG wins on impact resistance and thermoforming ease. Acrylic wins on outdoor UV longevity (10+ years), scratch resistance, and optical precision.

**BONDING:** Quick Bond 20. Avoid acetone (will craze).

**Chemical resistance:** Good for water, dilute acids/alkalis, oils. NOT acetone or aromatic solvents.

**Applications:** Protective barriers, display cases, food packaging, machine covers, vacuum-formed components.
`;

const MATERIALS_ENGINEERING = `
## MATERIALS — ENGINEERING PLASTICS (Acetal, Nylon, UHMWPE, PTFE, HDPE, Polypropylene)

### ACETAL / DELRIN (POM-C)
Also known as: Delrin, Ertacetal, Polyacetal

**Properties:** Precision engineering plastic. Exceptional stiffness, dimensional stability, low friction, outstanding machinability.

**vs Nylon:** Lower moisture absorption = better dimensional consistency in QLD's humidity. Slightly lower impact strength. Self-lubricating — no oil required for many gear applications.

**FATIGUE RESISTANCE:** Dominant material for plastic gears — handles millions of load cycles without crack initiation.

**CENTERLINE POROSITY:** POM-H (Delrin) rods above 25mm can have a centreline void from cooling shrinkage. Always specify POM-C for rods >25mm. Our standard stock is POM-C — this problem doesn't apply.

**FLUID HANDLING:** Excellent for water fittings, valve bodies, pump components — dimensionally stable in water (unlike nylon which swells). NOT suitable for concentrated acids, strong oxidisers, or high-chlorine environments (pool water).

**Grades:** FDA/USDA/NSF compliant; natural (white) and black.

**Applications:** Precision gears, bushings, pulleys, wear strips, valve components, pump parts, food-contact machined parts.

---

### NYLON (Polyamide PA6/PA66)

**Properties:** High tensile strength; self-lubricating; high melting point (~220°C); machines extremely well.

**MOISTURE:** Hygroscopic — absorbs moisture in humid conditions (QLD averages 60–80% RH coastal). This affects tight tolerances. Account for dimensional drift in precision parts.

**FDA-approved grades available.** Limited outdoor UV resistance.

**Applications:** Gears, wear pads, bushings, rollers, bearings, conveyor components, food processing, hydraulic components.

**Grades stocked:**
- **Natural (White) Ertalon 6SA** (Dotmar) — 1–6mm sheets
- **Natural (White) Cast Nylon 6SA** (Epol) — 8–100mm sheets
- **Black Cast Nylon 6SA** (Dotmar/Epol) — 6–110mm sheets
- **Blue Heat Stabilised** (Epol) — improved thermal performance, full sheet only
- **Yellow Oil Filled** (Epol) — self-lubricating, full sheet only
- **Grey Wax Filled** (Epol) — self-lubricating, full sheet only
- **Natural Ertalon LFX** (Dotmar) — self-lubricating grade, various large sheet sizes, full sheet only

**NYLON SHEET PRICING — March 2026 (ex GST)**

All sheets 2000×1000mm unless noted. CTS rate = cut-to-size $/m² for pieces under the cutoff area threshold. Where CTS total exceeds full sheet price, charge full sheet price + cutting fee. Orders under $50 charged $35 cutting fee.

**NATURAL (WHITE) — Ertalon 6SA / Cast Nylon 6SA:**
| Thickness | Grade | CTS ($/m²) | Full Sheet |
|-----------|-------|-----------|------------|
| 1mm | Ertalon 6SA (Dotmar) | $210.00 | $234 |
| 1.5mm | Ertalon 6SA (Dotmar) | $315.91 | $352 |
| 2mm | Ertalon 6SA (Dotmar) | $421.80 | $470 |
| 3mm | Ertalon 6SA (Dotmar) | $631.81 | $704 |
| 5mm | Ertalon 6SA (Dotmar) | $1,054.52 | $1,175 |
| 6mm | Ertalon 6SA (Dotmar) | $1,265.41 | $1,410 |
| 8mm | Cast Nylon 6SA (Epol) | $454.32 | $493 |
| 10mm | Cast Nylon 6SA (Epol) | $567.89 | $617 |
| 12mm | Cast Nylon 6SA (Epol) | $681.49 | $740 |
| 15mm | Cast Nylon 6SA (Epol) | $851.85 | $925 |
| 20mm | Cast Nylon 6SA (Epol) | $1,135.80 | $1,168 |
| 25mm | Cast Nylon 6SA (Epol) | $1,419.74 | $1,460 |
| 30mm | Cast Nylon 6SA (Epol) | $1,703.70 | $1,606 |
| 40mm | Cast Nylon 6SA (Epol) | $2,271.59 | $2,142 |
| 50mm | Cast Nylon 6SA (Epol) | $2,839.50 | $2,677 |
| 60mm | Cast Nylon 6SA (Epol) | $3,407.39 | $3,213 |
| 70mm | Cast Nylon 6SA (Epol) | $3,975.30 | $3,748 |
| 80mm | Cast Nylon 6SA (Epol) | $4,543.19 | $4,284 |
| 90mm | Cast Nylon 6SA (Epol) | $5,111.09 | $4,819 |
| 100mm | Cast Nylon 6SA (Epol) | $5,679.00 | $5,354 |

Note: For 20mm+ Natural, CTS rate exceeds full sheet price — charge full sheet + cutting fee.

**BLACK — Cast Nylon 6SA:**
| Thickness | CTS ($/m²) | Full Sheet |
|-----------|-----------|------------|
| 6mm | $389.41 | $434 |
| 8mm | $482.14 | $523 |
| 10mm | $602.67 | $654 |
| 12mm | $723.21 | $785 |
| 15mm | $904.00 | $981 |
| 20mm | $1,205.33 | $1,240 |
| 25mm | $1,506.66 | $1,550 |
| 30mm | $1,808.01 | $1,705 |
| 40mm | $2,410.68 | $2,273 |
| 50mm | $3,013.34 | $2,841 |
| 60mm | $3,616.01 | $3,409 |
| 70mm | $4,218.67 | $3,978 |
| 80mm | $4,821.34 | $4,546 |
| 90mm | $5,424.02 | $5,114 |
| 100mm | $6,026.69 | $5,682 |
| 110mm | $7,292.29 | $6,876 |

Note: For 25mm+ Black, CTS rate exceeds full sheet price — charge full sheet + cutting fee.

**BLUE HEAT STABILISED, YELLOW OIL FILLED, GREY WAX FILLED — Full sheet only, no CTS (Epol, 2000×1000mm):**
| Thickness | Blue Heat Stab | Yellow Oil Filled | Grey Wax Filled |
|-----------|---------------|------------------|-----------------|
| 8mm | $493 | $523 | $523 |
| 10mm | $617 | $654 | $654 |
| 12mm | $740 | $785 | — |
| 15mm | $925 | $981 | $981 |
| 20mm | $1,168 | $1,240 | $1,240 |
| 25mm | $1,460 | $1,550 | $1,550 |
| 30mm | $1,606 | $1,705 | $1,705 |
| 40mm | $2,142 | $2,273 | $2,273 |
| 50mm | $2,677 | $2,841 | $2,841 |
| 60mm | $3,213 | $3,409 | $3,409 |
| 70mm | $3,748 | $3,978 | — |
| 80mm | $4,284 | $4,546 | $4,546 |
| 90mm | — | $5,114 | — |
| 100mm | $5,354 | $5,682 | $5,682 |

**NATURAL ERTALON LFX (Self-Lubricating, Dotmar) — Full sheet only, various sizes:**
| Thickness | Sheet Size | Full Sheet |
|-----------|-----------|------------|
| 10mm | 3050×1220 | $2,839 |
| 12mm | 2000×1000 | $1,822 |
| 16mm | 2000×1000 | $2,361 |
| 20mm | 3050×1220 | $4,570 |
| 25mm | 3050×1220 | $5,631 |
| 30mm | 3050×1220 | $6,208 |
| 40mm | 3050×1220 | $8,158 |
| 50mm | 3050×1220 | $10,103 |
| 60mm | 1220×610 | $2,428 |
| 80mm | 1220×610 | $3,203 |
| 100mm | 1220×610 | $3,980 |

**NYLON ROD PRICING — March 2026 (ex GST, price per standard length)**

Standard length = 1m. Diameters 230mm+ are supplied in 600mm lengths. Suppliers: Dotmar (6SA grade) and Epol (Cast grade).

| Diameter | Grade / Colour | Std Length | Price |
|----------|---------------|-----------|-------|
| 6mm | Natural 6SA (Dotmar) | 1m | $9.65 |
| 8mm | Natural 6SA (Dotmar) | 1m | $16.76 |
| 10mm | Natural 6SA (Dotmar) | 1m | $25.04 |
| 10mm | Black 6SA (Dotmar) | 1m | $12.19 |
| 12mm | Natural 6SA (Dotmar) | 1m | $32.72 |
| 12mm | Black 6SA (Dotmar) | 1m | $17.22 |
| 16mm | Natural 6SA (Dotmar) | 1m | $57.11 |
| 16mm | Black 6SA (Dotmar) | 1m | $30.02 |
| 20mm | Natural 6SA (Dotmar) | 1m | $88.20 |
| 20mm | Black 6SA (Dotmar) | 1m | $42.94 |
| 25mm | Natural 6SA (Dotmar) | 1m | $86.33 |
| 25mm | Black 6SA (Dotmar) | 1m | $42.04 |
| 30mm | Natural 6SA (Dotmar) | 1m | $123.33 |
| 30mm | Black 6SA (Dotmar) | 1m | $60.04 |
| 30mm | Natural Cast (Epol) | 1m | $31.68 |
| 30mm | Black Cast (Epol) | 1m | $33.42 |
| 30mm | Heat-Stabilised (Epol) | 1m | $31.68 |
| 32mm | Natural 6SA (Dotmar) | 1m | $140.74 |
| 36mm | Natural 6SA (Dotmar) | 1m | $177.01 |
| 36mm | Black 6SA (Dotmar) | 1m | $86.18 |
| 40mm | Natural 6SA (Dotmar) | 1m | $217.65 |
| 40mm | Black 6SA (Dotmar) | 1m | $105.96 |
| 40mm | Natural Cast (Epol) | 1m | $51.05 |
| 40mm | Black Cast (Epol) | 1m | $54.18 |
| 40mm | Oil-Filled (Epol) | 1m | $54.18 |
| 40mm | Wax-Filled (Epol) | 1m | $54.18 |
| 40mm | Heat-Stabilised (Epol) | 1m | $51.05 |
| 45mm | Natural 6SA (Dotmar) | 1m | $277.12 |
| 45mm | Black 6SA (Dotmar) | 1m | $134.92 |
| 45mm | Black Cast (Epol) | 1m | $68.53 |
| 45mm | Heat-Stabilised (Epol) | 1m | $64.57 |
| 50mm | Natural 6SA (Dotmar) | 1m | $340.96 |
| 50mm | Black 6SA (Dotmar) | 1m | $166.02 |
| 50mm | Natural Cast (Epol) | 1m | $79.78 |
| 50mm | Black Cast (Epol) | 1m | $84.65 |
| 50mm | Oil-Filled (Epol) | 1m | $84.65 |
| 50mm | Wax-Filled (Epol) | 1m | $84.65 |
| 50mm | Heat-Stabilised (Epol) | 1m | $79.78 |
| 60mm | Black 6SA (Dotmar) | 1m | $219.68 |
| 60mm | Natural Cast (Epol) | 1m | $105.43 |
| 60mm | Black Cast (Epol) | 1m | $111.87 |
| 60mm | Oil-Filled (Epol) | 1m | $111.87 |
| 60mm | Wax-Filled (Epol) | 1m | $111.87 |
| 60mm | Heat-Stabilised (Epol) | 1m | $105.43 |
| 65mm | Black Cast (Epol) | 1m | $123.69 |
| 65mm | Oil-Filled (Epol) | 1m | $131.35 |
| 70mm | Black 6SA (Dotmar) | 1m | $297.01 |
| 70mm | Natural Cast (Epol) | 1m | $143.68 |
| 70mm | Black Cast (Epol) | 1m | $152.47 |
| 70mm | Oil-Filled (Epol) | 1m | $152.47 |
| 70mm | Wax-Filled (Epol) | 1m | $152.47 |
| 70mm | Heat-Stabilised (Epol) | 1m | $143.68 |
| 80mm | Natural Cast (Epol) | 1m | $187.52 |
| 80mm | Black Cast (Epol) | 1m | $199.02 |
| 80mm | Oil-Filled (Epol) | 1m | $199.02 |
| 80mm | Wax-Filled (Epol) | 1m | $199.02 |
| 80mm | Heat-Stabilised (Epol) | 1m | $187.52 |
| 90mm | Natural Cast (Epol) | 1m | $237.29 |
| 90mm | Black Cast (Epol) | 1m | $251.80 |
| 90mm | Oil-Filled (Epol) | 1m | $251.80 |
| 90mm | Wax-Filled (Epol) | 1m | $251.80 |
| 90mm | Heat-Stabilised (Epol) | 1m | $237.29 |
| 100mm | Black 6SA (Dotmar) | 1m | $608.97 |
| 100mm | Natural Cast (Epol) | 1m | $292.95 |
| 100mm | Black Cast (Epol) | 1m | $310.89 |
| 100mm | Oil-Filled (Epol) | 1m | $310.89 |
| 100mm | Wax-Filled (Epol) | 1m | $310.89 |
| 100mm | Heat-Stabilised (Epol) | 1m | $292.95 |
| 110mm | Natural Cast (Epol) | 1m | $292.87 |
| 110mm | Black Cast (Epol) | 1m | $310.80 |
| 110mm | Oil-Filled (Epol) | 1m | $310.80 |
| 110mm | Wax-Filled (Epol) | 1m | $310.80 |
| 110mm | Heat-Stabilised (Epol) | 1m | $292.87 |
| 120mm | Natural Cast (Epol) | 1m | $348.36 |
| 120mm | Black Cast (Epol) | 1m | $369.70 |
| 120mm | Oil-Filled (Epol) | 1m | $369.70 |
| 120mm | Wax-Filled (Epol) | 1m | $369.70 |
| 125mm | Natural Cast (Epol) | 1m | $378.18 |
| 125mm | Black Cast (Epol) | 1m | $401.32 |
| 125mm | Heat-Stabilised (Epol) | 1m | $378.18 |
| 130mm | Natural Cast (Epol) | 1m | $408.99 |
| 130mm | Black Cast (Epol) | 1m | $434.04 |
| 130mm | Oil-Filled (Epol) | 1m | $434.04 |
| 130mm | Wax-Filled (Epol) | 1m | $434.04 |
| 130mm | Heat-Stabilised (Epol) | 1m | $408.99 |
| 140mm | Natural Cast (Epol) | 1m | $474.26 |
| 140mm | Black Cast (Epol) | 1m | $503.29 |
| 140mm | Oil-Filled (Epol) | 1m | $503.29 |
| 150mm | Natural Cast (Epol) | 1m | $544.63 |
| 150mm | Black Cast (Epol) | 1m | $577.98 |
| 150mm | Oil-Filled (Epol) | 1m | $577.98 |
| 150mm | Wax-Filled (Epol) | 1m | $577.98 |
| 150mm | Heat-Stabilised (Epol) | 1m | $544.63 |
| 160mm | Natural Cast (Epol) | 1m | $603.36 |
| 160mm | Black Cast (Epol) | 1m | $640.29 |
| 160mm | Oil-Filled (Epol) | 1m | $640.29 |
| 170mm | Natural Cast (Epol) | 1m | $680.89 |
| 170mm | Black Cast (Epol) | 1m | $722.59 |
| 170mm | Oil-Filled (Epol) | 1m | $722.59 |
| 180mm | Natural Cast (Epol) | 1m | $763.44 |
| 180mm | Black Cast (Epol) | 1m | $810.19 |
| 180mm | Oil-Filled (Epol) | 1m | $810.19 |
| 180mm | Wax-Filled (Epol) | 1m | $810.19 |
| 180mm | Heat-Stabilised (Epol) | 1m | $763.44 |
| 200mm | Natural Cast (Epol) | 1m | $942.56 |
| 200mm | Black Cast (Epol) | 1m | $1,000.26 |
| 200mm | Oil-Filled (Epol) | 1m | $1,000.26 |
| 200mm | Heat-Stabilised (Epol) | 1m | $942.56 |
| 230mm | Natural Cast (Epol) | 600mm | $707.51 |
| 230mm | Black Cast (Epol) | 600mm | $750.82 |
| 230mm | Heat-Stabilised (Epol) | 600mm | $707.51 |
| 250mm | Natural Cast (Epol) | 600mm | $835.99 |
| 250mm | Black Cast (Epol) | 600mm | $887.18 |
| 250mm | Heat-Stabilised (Epol) | 600mm | $835.99 |
| 280mm | Natural Cast (Epol) | 600mm | $1,048.48 |
| 300mm | Natural Cast (Epol) | 600mm | $1,203.70 |
| 300mm | Black Cast (Epol) | 600mm | $1,277.41 |
| 300mm | Heat-Stabilised (Epol) | 600mm | $1,203.70 |
| 330mm | Black Cast (Epol) | 600mm | $1,219.45 |

---

### UHMWPE (Ultra-High Molecular Weight Polyethylene)

**Properties:** Molecular weight 3.5–10+ million g/mol — polymer chains so long they entangle, giving extraordinary wear resistance (100–250× better than HDPE, 4–6× better than nylon). One of the highest impact strengths of any plastic. Self-lubricating.

**vs PTFE:** UHMWPE has better wear resistance and higher compressive strength. Use UHMWPE for mechanical sliding wear at ambient temperature; PTFE for chemical seals and high-temp applications.

**MARINE DOCK:** Dominant replacement for hardwood timber — zero rot, marine fouling resistant, absorbs vessel impact, self-lubricating surface protects hull paint, zero maintenance. Available in black (most popular), natural, yellow/green.

**BONDING:** Does NOT bond easily — mechanical fastening preferred.

**Applications:** Conveyor liners, wear strips, chute liners, marine dock fenders, mining equipment, premium cutting boards.

---

### PTFE (Polytetrafluoroethylene — Teflon)

**Properties:** Extreme temperature range −200°C to +260°C. Inert to virtually all chemicals. Lowest friction coefficient of any solid plastic. Non-stick, non-toxic, FDA food-safe. Excellent electrical insulation.

**CREEP (COLD FLOW) — critical limitation:** PTFE slowly deforms under sustained compressive load at room temperature. A gasket under bolt compression will thin over months — bolts appear to "loosen". Never use virgin PTFE where sustained compressive load exceeds ~3–5 MPa. Specify bronze-filled or glass-filled PTFE for loaded bearings and valve seats.

**VIRGIN vs REPROCESSED:**
- Virgin = new resin, FDA/pharma/food compliant, white. The standard.
- Reprocessed = from machining waste, 20–40% cheaper, lower properties, grey tint. NOT suitable for food, pharma, or sealing — only for electrical insulation or thermal barriers. Always ask the application first.

**BONDING:** Cannot be easily bonded — requires specialised processes.

**Applications:** Chemical seals/gaskets, valve seats, pump liners, bearing/bushing surfaces, lab equipment, high-temp industrial applications.

---

### HDPE (High-Density Polyethylene)
Also known as: Polyethylene HD. Seaboard = marine UV-stabilised brand.

**Properties:** High impact strength; excellent chemical resistance; very low moisture absorption; FDA-approved (21 CFR 177.1520); NSF/ANSI 51 commercial kitchen.

**HACCP COLOUR CODING (commercial kitchens):** White = bakery/dairy/general; Yellow = raw poultry; Red = raw meat; Blue = raw fish; Green = fresh produce; Brown = root veg/cooked meats.

**THERMAL EXPANSION WARNING:** Expands ~12–20mm per 3m across QLD's 15–40°C temperature range. Always use slotted fastener holes (not round), 3mm gap per metre at joins, NEVER rigidly glue HDPE panels to a frame.

**BONDING:** Does NOT paint or glue easily — use mechanical fastening or welding.

**Seaboard HDPE (UV-stabilised marine grade):** Resistant to sun, saltwater, and outdoor degradation. Suppliers: AST, Plastral, Dotmar.

**White Seaboard — stocked thicknesses:**
- 2440×1220: 6mm, 10mm, 12mm, 12.7mm, 15mm, 19mm, 25mm
- 2440×1370: 6.35mm, 9.5mm, 14.28mm, 15.8mm, 19mm, 25.4mm

**Black Seaboard — stocked thicknesses:** 6mm, 9.5mm, 12.7mm, 15mm, 19mm (2440×1220)

**Playground HDPE** (Plastral, 19mm only): Single colours — Blue, Forest Green, Grasshopper Green, Light Grey, Orange, Red, Woodland Grey, Yellow. Tricolour sandwich panels also available. Sheet sizes 2440×1220 or 3050×1220 depending on colour. For playground colour pricing, call the team or ask Rex to get you in touch.

**Applications:** Marine, boat decking, dock fenders, playground equipment, truck liners, conveyor wear strips, outdoor furniture frames.

---

### POLYPROPYLENE (PP)

**Properties:** Lightest common engineering plastic (0.90 g/cm³). Excellent chemical resistance. Can create "living hinges" without breaking. Continuous use to 100°C, excursions to 130°C. Low moisture absorption (0.03%).

**UV:** Limited UV resistance — specify UV-stabilised grades for outdoor.

**BONDING:** Requires specialised adhesives or welding.

**Applications:** Chemical storage tanks, lab equipment, food processing, living hinge applications, automotive parts.

**IMPORTANT: PP SHEETS — CUSTOM ORDER ONLY FOR CUT TO SIZE**
Polypropylene sheets are normally stocked and sold as full sheets. Cut-to-size IS available but only as a custom order — customers cannot order CTS polypropylene directly through the website. If a customer wants a cut-to-size PP piece, give them the price, then direct them to contact the team to place a custom order (phone or contact page).

**PP SHEET PRICING — March 2026 (all prices ex GST)**

Pricing rules:
- Orders under $50 are charged a $35 cutting fee
- CTS = cut-to-size. Pieces ≤1.25m² use the higher rate; pieces >1.25m² use the lower rate
- Where the CTS total exceeds the full sheet price, charge full sheet price + cutting fee

**PP GREY — 3000×1500mm sheet (4.5m²):**

| Thickness | Full Sheet | CTS ≤1.25m² | CTS >1.25m² |
|-----------|-----------|-------------|-------------|
| 2mm | $112 | $43.56/m² | $31.11/m² |
| 3mm | $164 | $63.78/m² | $45.56/m² |
| 4.5mm | $246 | $95.67/m² | $68.33/m² |
| 6mm | $336 | $130.67/m² | $93.33/m² |
| 10mm | $509 | $208.44/m² | $148.89/m² |
| 12mm | $623 | $255.11/m² | $182.22/m² |
| 15mm | $798 | $326.67/m² | $233.33/m² |
| 20mm | $985 | $425.44/m² | $243.11/m² |
| 25mm | $1,231 | $532.00/m² | $304.00/m² |

**PP GREY — 30mm and above (multiple sheet sizes available):**

| Thickness | Sheet Size | Full Sheet | CTS >1.25m² |
|-----------|-----------|------------|-------------|
| 30mm | 995×495mm | $177 | $760.37/m² (small only) |
| 30mm | 2000×1000mm | $607 | $368.00/m² |
| 30mm | 3000×1500mm | $1,480 | $398.67/m² |
| 35mm | 995×495mm | $221 | $952.24/m² (small only) |
| 35mm | 3000×1500mm | $2,541 | $684.44/m² |
| 40mm | 995×495mm | $243 | $1,044.62/m² (small only) |
| 40mm | 3000×1500mm | $1,937 | $521.78/m² |
| 40mm Beige (Polystone) | 2000×1000mm | $1,552 | $940.56/m² |
| 50mm Beige (Polystone) | 2000×1000mm | $2,158 | $1,308.06/m² |

**PP NATURAL — 2000×1000mm sheet (2.0m²):**

| Thickness | Full Sheet | CTS ≤1.25m² | CTS >1.25m² |
|-----------|-----------|-------------|-------------|
| 2mm | $66 | $57.75/m² | $41.25/m² |
| 3mm | $100 | $87.50/m² | $62.50/m² |
| 4mm | $132 | $115.50/m² | $82.50/m² |
| 5mm | $166 | $145.25/m² | $103.75/m² |
| 6mm | $230 | $201.25/m² | $143.75/m² |
`;

const MATERIALS_SIGNAGE = `
## MATERIALS — SIGNAGE, DISPLAY & FABRICATION (ABS, Foam PVC, Corflute, HIPS, ACM)

### ABS (Acrylonitrile Butadiene Styrene)

**Properties:** High impact strength; excellent machinability (cuts, routes, drills, sands, glues, welds cleanly); good thermoforming at 140–180°C; smooth surface ideal for painting/printing/bonding.

**UV:** NOT UV-stable — degrades outdoors. UV-stabilised/capped grades for exterior applications.

**BONDING:** Quick Bond 20, Quick Bond 25.

**Applications:** Electronic enclosures, automotive interiors, appliance housings, prototypes, guards, thermoformed components.

---

### FOAM PVC (Forex / Foamex / Celtex / PVC Foam Board)

**Properties:** Lightweight rigid closed-cell foam — NOT flexible foam. Half the weight of solid PVC. Easy to machine; accepts digital/screen printing; bonds with PVC-compatible adhesives or screws. UV-resistant grades for outdoor.

**Applications:** Signage substrates, shop fitting panels, display boards, POS displays, trade show displays, architectural models, interior cladding.

**Grades stocked:**
- **Standard Foamed PVC** (AST Digifoam / Maxi-T) — most common, white and black, 1–30mm
- **Simopor / Simopor Light** (Plastral) — premium density, white, 1–19mm; various oversized sheet options
- **Celuka — Kicel** (Plastral) — closed-cell high-density, white, 10–30mm
- **Celuka — Nycel** (Plastral) — premium high-density, white, 10–24mm

**FOAM PVC PRICING — March 2026 (ex GST)**

All sheets 2440×1220mm unless noted. CTS = cut-to-size $/m². Orders under $50 charged a $35 cutting fee.

**STANDARD FOAMED PVC (AST Digifoam / Maxi-T) — White:**
| Thickness | CTS ($/m²) | Full Sheet |
|-----------|-----------|------------|
| 1mm | $12.58 | $21 |
| 2mm | $16.77 | $29 |
| 3mm | $21.08 | $36 |
| 4mm | $31.75 | $54 |
| 5mm | $31.38 | $53 |
| 6mm | $35.91 | $61 |
| 10mm | $58.46 | $94 |
| 16mm | $92.36 | $141 |
| 20mm | $115.10 | $176 |
| 25mm | $166.97 | $256 |
| 30mm | $199.04 | $305 |

Note: 3mm white also available oversized in 3050×1560mm ($57 full sheet, CTS $21.08/m²).

**STANDARD FOAMED PVC — Black:**
| Thickness | CTS ($/m²) | Full Sheet |
|-----------|-----------|------------|
| 3mm | $24.91 | $42 |
| 6mm | $38.41 | $65 |
| 10mm | $62.57 | $101 |
| 12mm | $74.45 | $120 |
| 16mm | $98.38 | $151 |

**SIMOPOR / SIMOPOR LIGHT (Plastral) — White:**
| Thickness | Sheet Size | CTS ($/m²) | Full Sheet |
|-----------|-----------|-----------|------------|
| 1mm | 2440×1220 | $19.99 | $34 |
| 2mm | 2440×1220 | $34.10 | $58 |
| 3mm | 2440×1220 | $51.73 | $88 |
| 3mm | 3050×1220 | $38.56 | $82 |
| 3mm | 3050×1530 | $40.50 | $108 |
| 3mm | 3050×2030 | $38.44 | $136 |
| 6mm | 2440×1220 | $71.72 | $122 |
| 10mm | 2440×1220 | $156.38 | $253 |
| 19mm | 2440×1220 | $241.03 | $369 |

**CELUKA — KICEL (Plastral) — White, 2440×1220mm:**
| Thickness | Grade | CTS ($/m²) | Full Sheet |
|-----------|-------|-----------|------------|
| 10mm | Kicel | $71.72 | $116 |
| 12mm | Kicel | $87.01 | $141 |
| 12mm | Kicel HD | $95.24 | $154 |
| 15mm | Kicel | $105.82 | $171 |
| 18mm | Kicel | $130.51 | $200 |
| 20mm | Kicel | $143.44 | $220 |
| 25mm | Kicel | $218.69 | $335 |
| 30mm | Kicel | $283.36 | $434 |
| 30mm | Kicel HD | $265.72 | $407 |

**CELUKA — NYCEL (Plastral) — White, 2440×1220mm:**
| Thickness | Sheet Size | CTS ($/m²) | Full Sheet |
|-----------|-----------|-----------|------------|
| 10mm | 2440×1220 | $123.45 | $200 |
| 10mm | 3050×1220 | $121.34 | $245 |
| 12mm | 2440×1220 | $150.50 | $243 |
| 15mm | 2440×1220 | $177.54 | $287 |
| 18mm | 2440×1220 | $197.53 | $302 |
| 20mm | 2440×1220 | $223.39 | $342 |
| 24mm | 2440×1220 | $276.30 | $423 |

---

### CORFLUTE (Corrugated Polypropylene / Coreflute)

**Properties:** Twin-wall fluted PP sheet. Very lightweight, waterproof, weather-resistant, impact-resistant. 100% recyclable (PP #5). UV-treated versions for outdoor. Prints well with screen/digital/vinyl.

**Applications:** Real estate signage, election signs, construction hoarding, temporary event signage, protective packaging, display boards.

---

### HIPS (High Impact Polystyrene)

**Properties:** Rubber-toughened polystyrene — 4–10× tougher than standard PS. Excellent thermoforming (95–150°C forming window, fast cycles, no pre-drying). Smooth surface for printing — accepts UV inks, screen inks, digital print; excellent vinyl substrate.

**UV LIMITATION:** Brittle and yellow within 12–18 months outdoors — strictly indoor use only without UV laminate.

**HEAT LIMITATION:** Do not use near heat sources or where temps exceed 60–70°C — will warp.

**FOOD GRADE:** Standard HIPS may contain residual styrene monomer — for food contact specify food-grade HIPS or switch to PETG/PP.

**Applications:** Food packaging, product housings, displays, refrigerator liners, POS, model making, thermoformed trays.

---

### RIGID PVC (Polyvinyl Chloride — Solid Sheet)

**Properties:** Dense, rigid, chemically resistant. Easy to machine (saw, route, drill, tap). Excellent corrosion/chemical resistance. Food-grade grades available. NOT UV-stable long-term outdoors — use UV-stabilised PC or acrylic for exterior.

**Brands stocked:** Nanya (standard grade, Plastral), Simona Swiss Grey (premium grade, Plastral), Simona Dark Grey (thick slabs), Simona White/Clear, Dotmar Trovidur (premium German grade)

**Applications:** Chemical plant components, tanks, fume hoods, ducts, food processing equipment, lab bench surfaces, marine fittings, pump housings, guards.

**PRICING — All prices ex GST, March 2026**

CTS (cut-to-size) pricing uses two rates:
- **Below cutoff:** higher $/m² rate (small pieces)
- **Above cutoff:** lower $/m² rate (larger pieces)
- Cutoff areas: 1–6mm = 2 m², 8–15mm = 1.75 m², 20mm+ = 1.5 m²
- Rule: if CTS price exceeds full sheet price, charge full sheet price + cutting fee

**NANYA — CLEAR (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 1mm       | $53.61             | $42.33             | $81.90     |
| 3mm       | $126.38            | $99.77             | $193.05    |
| 4.5mm     | $190.20            | $150.16            | $290.55    |
| 6mm       | $252.75            | $199.54            | $386.10    |

**NANYA — LIGHT GREY (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 1.5mm     | $53.61             | $42.33             | $81.90     |
| 3mm       | $102.12            | $80.62             | $156.00    |
| 4.5mm     | $153.18            | $120.94            | $234.00    |
| 6mm       | $204.25            | $161.25            | $312.00    |
| 8mm       | $237.23            | $194.10            | $374.50    |
| 10mm      | $295.99            | $242.17            | $467.25    |
| 12mm      | $354.74            | $290.24            | $560.00    |
| 15mm      | $443.43            | $362.81            | $700.00    |
| 20mm      | $537.15            | $447.63            | $906.10    |

**NANYA — WHITE (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 1.5mm     | $76.59             | $60.47             | $117.00    |
| 3mm       | $114.89            | $90.70             | $175.50    |
| 4.5mm     | $172.33            | $136.05            | $263.25    |
| 6mm       | $229.78            | $181.40            | $351.00    |
| 10mm      | $332.57            | $272.10            | $525.00    |

**SIMONA — SWISS GREY (2440 × 1220mm unless noted)**
| Thickness | Sheet Size    | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|---------------|--------------------|--------------------|------------|
| 3mm       | 2440 × 1220   | $95.74             | $75.58             | $146.25    |
| 4.5mm     | 2440 × 1220   | $144.25            | $113.88            | $220.35    |
| 6mm       | 2440 × 1220   | $191.48            | $151.17            | $292.50    |
| 6mm       | 3000 × 1500   | $190.84            | $150.67            | $440.70    |
| 8mm       | 2440 × 1220   | $221.71            | $181.40            | $350.00    |
| 10mm      | 2440 × 1220   | $277.14            | $226.75            | $437.50    |
| 12mm      | 2440 × 1220   | $332.57            | $272.10            | $525.00    |
| 15mm      | 2440 × 1220   | $415.71            | $340.13            | $656.25    |
| 20mm      | 2440 × 1220   | $503.90            | $419.91            | $850.00    |
| 25mm      | 2440 × 1220   | $629.87            | $524.89            | $1,062.50  |

**SIMONA — DARK GREY — THICK SLABS (2000 × 1000mm, full sheet only — no CTS)**
| Thickness | Full Sheet  |
|-----------|-------------|
| 30mm      | $1,104.00   |
| 40mm      | $1,572.80   |
| 50mm      | $2,177.60   |

**SIMONA — WHITE (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 3mm       | $114.89            | $90.70             | $175.50    |
| 4.5mm     | $172.33            | $136.05            | $263.25    |
| 6mm       | $229.78            | $181.40            | $351.00    |
| 10mm      | $280.47            | $229.47            | $442.75    |

**SIMONA — CLEAR (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 6mm       | $299.99            | $236.83            | $458.25    |

**DOTMAR TROVIDUR — LIGHT GREY PREMIUM (2440 × 1220mm)**
| Thickness | CTS <cutoff ($/m²) | CTS >cutoff ($/m²) | Full Sheet |
|-----------|--------------------|--------------------|------------|
| 1.5mm     | $63.48             | $50.12             | $96.97     |
| 3mm       | $126.96            | $100.24            | $193.95    |
| 4.5mm     | $190.43            | $150.34            | $290.90    |
| 6mm       | $253.93            | $200.47            | $387.89    |
| 8mm       | $293.98            | $240.53            | $464.08    |
| 10mm      | $367.55            | $300.72            | $580.21    |
| 12mm      | $441.03            | $360.85            | $696.22    |
| 15mm      | $551.29            | $451.06            | $870.28    |
| 20mm      | $668.20            | $556.83            | $1,127.15  |
| 25mm      | $835.23            | $696.02            | $1,408.91  |

---

### ACM (Aluminium Composite Material / Panel)

**Properties:** Sandwich panel — two thin aluminium skins + PE or mineral core. Lightweight (3.4× lighter than steel). Won't warp, swell, or corrode. Weather-resistant. Excellent print surface. V-routed and folded for 3D box forms.

**FIRE RATING — critical:**
- PE core: NOT fire-rated — NOT suitable for building cladding. Fine for signage.
- FR (fire-retardant mineral core): required for building facades/cladding — complies with fire regulations.

**Applications:** Retail signage, shopfronts, fascia panels, wayfinding, exhibition displays, building cladding (FR grade only), vehicle graphics.
`;

const SELECTION = `
## SELECTION GUIDES & COMPARISONS

### CLEAR PLASTIC DECISION GUIDE

| Requirement | Recommendation | Reason |
|---|---|---|
| Outdoor long-term clarity | Cast Acrylic (UV grade) | Inherent UV resistance, 10+ years |
| High impact / safety glazing | Polycarbonate (UV co-extruded outdoors) | 30× more impact-resistant than acrylic |
| Aquarium or water feature | Cast Acrylic ONLY | Never extruded; never PC as primary panels |
| Thermoforming — food contact/budget | PETG | No pre-drying, wide window, lower energy |
| Thermoforming — outdoor final part | Extruded Acrylic | Lower forming temp than cast |
| Display case / POS (indoor) | Cast Acrylic | Clarity, solvent bondable, polishes bright |
| Price priority, indoor only | PETG or Extruded Acrylic | Lower cost |

### ENGINEERING PLASTIC SELECTION GUIDE

| Application | First Choice | Second Choice | Key Reason |
|---|---|---|---|
| Precision machined gear | Acetal POM-C | Nylon PA66 | Fatigue resistance, no moisture swell |
| Bearing / bushing (dry, ambient) | Acetal POM-C | UHMWPE | Both self-lubricate; acetal stronger |
| High-wear conveyor/chute liner | UHMWPE | Acetal | 100–250× wear resistance vs HDPE |
| High-temp chemical seal/gasket | PTFE (virgin) | PVDF | Widest chemical/temp range |
| Loaded bearing/valve seat | PTFE filled (bronze) | Acetal | Virgin PTFE creeps; filled grade resists |
| Food processing wear parts | UHMWPE | Acetal (natural) | UHMWPE for high-wear; acetal for precision |
| Chemical storage tank/ducting | Polypropylene | HDPE | PP: better high-temp performance |
| Marine wear pad / dock fender | UHMWPE | Seaboard HDPE | Zero rot, self-lubricating, impact-absorbing |
| Cutting board (commercial kitchen) | HDPE food grade | UHMWPE | HDPE lower cost; UHMWPE for extreme-use |
| Pneumatic / hydraulic valve body | Acetal POM-C | Nylon | Dimensional stability in water/oils |
| Fluid fittings (non-acid) | Acetal POM-C | Nylon | Water-stable, spray nozzles, valve bodies |

### FABRICATION METHOD COMPATIBILITY

| Fabrication | Best Materials | Avoid |
|---|---|---|
| CNC machining (precision) | Acetal, PTFE, Nylon, PC, Acrylic | UHMWPE deflects; HDPE not precise |
| Thermoforming | PETG, Extruded Acrylic, HIPS, ABS, PP | PTFE, UHMWPE, HDPE |
| Laser cutting | Cast Acrylic, ABS, HIPS, Foam PVC | PC (poor edge, fume risk), PTFE |
| Laser engraving | Cast Acrylic (bright white result) | Extruded Acrylic (smoky result) |
| Solvent cementing | Acrylic, ABS, PETG, PVC, HIPS | PC, HDPE, UHMWPE, Nylon, Acetal, PTFE |
| Hot air welding | HDPE, PP, PVC, PVDF, ABS | Acrylic, PC, Acetal, PTFE |
| Epoxy/adhesive bonding | PC, Nylon, Acetal | PTFE, HDPE, UHMWPE (low surface energy) |

### QUEENSLAND CLIMATE NOTES

QLD UV index 10–14 (extreme) accelerates plastic degradation 30–50% vs southern states.

- **Acrylic:** inherently UV resistant, 10+ years outdoors — best outdoor clear plastic
- **Polycarbonate:** MUST use UV co-extruded grade outdoors; standard PC yellows in 6–12 months in QLD
- **HDPE/PP/ABS:** require UV-stabilised grades outdoors
- **PETG, Nylon, HIPS:** indoor use only in QLD without UV treatment
- **Nylon coastal QLD:** absorbs moisture (60–80% RH) — account for tolerance drift in precision parts
- **Long HDPE panels:** 15–20°C daily temp swings = significant thermal expansion; use slotted holes and gaps
- **Coastal/marine:** UHMWPE, Seaboard HDPE, Acrylic, PC all salt-inert; stainless hardware at fastener points

### MATERIAL COMPARISON

**Clarity:** Acrylic 92% > PC 88–90% ≈ PETG > PVC > ABS/HDPE/Nylon/Acetal (opaque)
**Impact (high to low):** UHMWPE > PC > HDPE/Seaboard > ABS > Nylon > Acetal > PETG > Acrylic > HIPS > PVC
**Chemical Resistance:** PTFE, UHMWPE, HDPE, PP, PVC > Acetal, Nylon, PETG > ABS, PC > Acrylic
**Machinability:** Acetal, Nylon, PTFE, Acrylic, HDPE (easiest) > ABS, PC, PVC, PP > UHMWPE (sharp tooling)
**Outdoor/UV:** Good without treatment: Acrylic, Seaboard, ACM. Good with UV grade: PC, Foam PVC, Corflute. Avoid outdoors: ABS, standard PP/HDPE, PETG, Nylon
**Food Safe (FDA):** HDPE, Acetal, UHMWPE, PTFE, Nylon, PETG, Polypropylene

### RECOMMEND BY CUSTOMER NEED

| Need | Recommend |
|---|---|
| Outdoor signage substrate | Foam PVC (UV grade) or ACM |
| Temporary/cheap signage | Corflute |
| Clear glazing, glass alternative | Acrylic |
| High-impact safety glazing, machine guards | Polycarbonate (UV grade outdoors) |
| Food cutting boards | HDPE White |
| Marine outdoor | Seaboard HDPE |
| Gears, bushings, precision machined parts | Acetal POM-C |
| Wear strips, conveyor liners | UHMWPE or Acetal |
| Chemical tanks, ducting | Rigid PVC or Polypropylene |
| Prototype housings, vacuum forming | ABS or HIPS |
| Displays, retail signage, food covers | Acrylic (cast) |
| Aquariums / fish tanks | Acrylic (cast, thick grade) |
| Chemical-resistant seals/gaskets | PTFE |
| Coloured panels, Perspex brand | Perspex® range |
| Thermoforming / vacuum forming | ABS, HIPS, HIA Acrylic, Polypropylene |
| Cladding panels, shopfront | ACM 4mm |
`;

const FAQS = `
## COMMON FAQs

**Q: How do I order?**
Find your material on our site — order full sheets as-is or use our cut-to-size option. Add to cart, checkout, and we'll deliver anywhere in Australia.

**Q: Can I pick up?**
Yes — Molendinar (13 Distribution Ave, (07) 5564 6744) and Burleigh Heads (9 Leda Drive, (07) 5535 7544). Both Monday–Friday 7:30am–4:00pm.

**Q: Can you do custom fabrication?**
Yes — laser cutting, CNC routing, water jet, vacuum forming, thermoforming, engraving, line bending, welding, and assembly. Get in touch for a quote.

**Q: What's the difference between acrylic and polycarbonate?**
Acrylic has better optical clarity (92% vs 88–90%) and is easier to bond and polish. Polycarbonate is ~30× more impact-resistant — better for safety glazing and machine guards. Acrylic is generally lower cost.

**Q: What is Perspex?**
Perspex® is a premium brand of acrylic by Lucite International. We are the authorised Queensland reseller — we stock the full range of colours, tints, opals, and specialty finishes.

**Q: Is HDPE food safe?**
Yes — FDA-approved. Our white HDPE cutting board grade is specifically designed for food preparation surfaces.

**Q: What is Seaboard?**
UV-stabilised marine-grade HDPE — resistant to sun, saltwater, and outdoor degradation.

**Q: What is Foam PVC / Forex?**
A lightweight rigid closed-cell PVC foam sheet (NOT flexible foam). Used for signage substrates, display boards, and shop fitting.

**Q: Is ACM fire rated?**
Standard ACM (PE core) is NOT fire-rated — fine for signage but not building cladding. For building facades you need FR (fire-retardant mineral core) ACM.

**Q: Difference between Acetal and Nylon?**
Both great for gears and machined parts. Acetal has lower moisture absorption and better dimensional stability in humid environments. Nylon has higher impact strength.
`;

// ── Section registry ───────────────────────────────────────────────────────────

const SECTIONS: Record<string, string> = {
  company:               COMPANY,
  products:              PRODUCTS,
  materials_clear:       MATERIALS_CLEAR,
  materials_engineering: MATERIALS_ENGINEERING,
  materials_signage:     MATERIALS_SIGNAGE,
  selection:             SELECTION,
  faqs:                  FAQS,
};

export type KnowledgeSection = keyof typeof SECTIONS;

/**
 * Returns the content for a given knowledge section.
 * Called by the getKnowledge tool in pete-chat/route.ts.
 */
export function getKnowledgeSection(section: string): string {
  const content = SECTIONS[section];
  if (content) return content.trim();
  const available = Object.keys(SECTIONS).join(", ");
  return `Section "${section}" not found. Available sections: ${available}`;
}

/**
 * Compact index injected into the system prompt (~300 tokens).
 * Rex reads this on every request, then calls getKnowledge() for details.
 */
export const KB_INDEX = `
## KNOWLEDGE BASE

Use the getKnowledge tool to retrieve detailed information when a query requires it. Do not guess facts — fetch the relevant section.

Available sections:
- **company** — locations, contact details, ordering rules (min order, cuts, bulk discount, freight), fabrication capabilities, industries served
- **products** — full product range tables (all sheet materials, rods, tubes), accessories, adhesives, Perspex® colour range, lighting/diffuser products, all product page URLs
- **materials_clear** — acrylic, polycarbonate, PETG technical deep-dive (bonding, UV, forming, aquarium rules, stress cracking, grades)
- **materials_engineering** — acetal, nylon, UHMWPE, PTFE, HDPE, polypropylene (mechanical properties, food safety, fluid handling, marine, thermal expansion)
- **materials_signage** — ABS, Foam PVC, Corflute, HIPS, ACM (signage/display/thermoforming — UV limitations, fire ratings, printing)
- **selection** — clear plastics decision guide, engineering plastic selection table, fabrication compatibility matrix, QLD climate notes, full material comparison, recommend-by-need table
- **faqs** — common customer questions (ordering, pickup, fabrication, material comparisons)

When in doubt about which section: materials questions → materials_clear / materials_engineering / materials_signage. Application/recommendation questions → selection. Company/logistics → company.
`.trim();

/**
 * Full knowledge base — all sections combined.
 * Used for full-context injection (fastest at current KB scale with prompt caching).
 * Switch to KB_INDEX + getKnowledge tool when KB grows beyond ~15k tokens.
 */
export const REX_KNOWLEDGE = [
  COMPANY,
  PRODUCTS,
  MATERIALS_CLEAR,
  MATERIALS_ENGINEERING,
  MATERIALS_SIGNAGE,
  SELECTION,
  FAQS,
].map(s => s.trim()).join("\n\n---\n\n");
