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

**Online:** enquiries@plasticonline.com.au · plasticonline.com.au

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

### Sheet Range

| Material | Standard Sheet Size | Thicknesses | Colours | Price Range |
|---|---|---|---|---|
| Acrylic (Perspex) | 2030×3050mm | 1–50mm (115 options) | Clear, opals, tints, frosted, mirrors, colours, fluorescent | $60–$2,358 |
| Polycarbonate UV | 1220×2440mm | 1–12.5mm (39 options) | Clear, opal, tint | $101–$1,125 |
| ABS Sheet | 1350×3050mm | 1–12mm (13 options) | Black, white, grey | $95–$340 |
| PVC Rigid | 1220×2440mm | Multiple (20 options) | Clear, white, grey | $82–$2,178 |
| HDPE (Black/Natural) | 2000×1000mm thin / 3000×1500mm std | 1–150mm | Black UV, Natural, Yellow UV | $46–$6,076 |
| Seaboard HDPE Marine | 1220×2440mm | 15mm+ (7 options) | Natural/White | $351–$1,029 |
| Nylon Sheet | 1220×3050mm | Multiple (27 options) | Black, natural | $234–$3,978 |
| Polypropylene | 1500×3000mm | 2–50mm (18 options) | Natural, grey, black, white | $1–$2,692 |
| Foam PVC | 1220×3050mm | Multiple (22 options) | Black, white | $22–$455 |
| PETG | Various | 0.5–2mm+ (7 options) | Clear | $54–$361 |
| PTFE (Teflon) | 600×600 or 1200×1200mm | 1–50mm (12 options) | White/natural | $178–$18,141 |
| HIPS | 1500×3000mm | 3mm+ | Multiple | $9–$143 |
| Acrylic Mirror | 1350×2540mm | 2mm, 3mm | Silver, Gold | $290–$329 |
| ACM Panel | 2000×3050mm | 4mm standard (37 options) | Multiple colours | $100–$433 |
| Corflute | 1830×3000mm | 3mm, 5mm, 8mm | White, black | $14–$36 |

### Rods & Tubes

| Material | Diameter Range | Lengths | Price Range |
|---|---|---|---|
| Acetal Rod (POM-C) | Small–250mm | 3000mm | $4–$2,361 |
| UHMWPE Rod | To 200mm | 2000mm | $13–$4,698 |
| PTFE Rod | 3–300mm | 1m or 2m | $5–$3,879 |
| Polycarbonate Tube | Various | 2000mm | $0–$737 |
| PVC Rod, Acrylic Rod/Tube, Nylon Rod | Various | Various | — |

### Accessories & Adhesives

**Adhesives:** Quick Bond 5 (water-thin, acrylic/PC/ABS), Quick Bond 10 (thickened, acrylic/PVC), Quick Bond 20 (fast-cure, ABS/HIPS/PVC/PETG), Quick Bond 25 (thickened, acrylic/PC/HIPS/ABS/PVC)

**Extrusions:** J Bar, H Mould, W-Bar, Step-Strip, Slatwall Extrusion, Triangle Rod, Square Rods

**Hinges/Fasteners:** Plastic Hinges (38×45mm, clear/white/black), Piano Hinge, Flex Fold Hinge, Hasp & Staple, Door Catch

**Display:** Taymar & Expanda Stand holders, sneeze guards, Construct-IT 35mm tubing system

### Perspex® Brand

We are the authorised Queensland reseller of the full Perspex® range: Fluorescent, Spectrum, Frost, Royals, Naturals, Pearlescent, Tints, Opals, Sweet Pastels, VE Gallery Grade (premium optical). 100+ colours including Clear, Magenta 100, Blues 324/327/835, Ivory 801, Grey 504, Orange 266, Reds 115/128/136, Green 617, Yellow 235, Opal grades, Frosted, Mirror (Silver & Gold).

### Lighting & Diffuser Products

Prismatic Diffuser Sheet (Y12, Y15, Y19), Skylight Diffuser panels, Eggcrate Louvres, Slumped Acrylic panels, Acryplex Architectural Sheet

### Product Page URLs

**Sheets:** Acrylic https://www.plasticonline.com.au/product/acrylic-sheet/ · Polycarbonate https://www.plasticonline.com.au/product/polycarbonate-sheet/ · HDPE https://www.plasticonline.com.au/product/hdpe-polyethylene-cutting-board/ · PVC https://www.plasticonline.com.au/product/pvc-sheet/ · Nylon https://www.plasticonline.com.au/product/nylon-sheet/ · Acetal https://www.plasticonline.com.au/product/acetal-pom-c-plastic-sheet/ · Polypropylene https://www.plasticonline.com.au/product/polypropylene/ · Corflute https://www.plasticonline.com.au/product/corflute-corragatted-flute-board/ · ACP/ACM https://www.plasticonline.com.au/product/acm/ · PTFE https://www.plasticonline.com.au/product/ptfe-teflon-sheet/ · UHMWPE https://www.plasticonline.com.au/product/uhmwpe-sheet/ · PETG https://www.plasticonline.com.au/product/petg-polyethylene-terephthalate-glycol-modified-sheet/ · ABS https://www.plasticonline.com.au/product/abs-sheet/ · Foam PVC https://www.plasticonline.com.au/product/foam-pvc/ · PEEK https://www.plasticonline.com.au/product/peek-polyether-ether-ketone-sheet/ · HIPS https://www.plasticonline.com.au/product/hips-sheet/ · Playground HDPE https://www.plasticonline.com.au/product/hdpe-playground-board/ · Seaboard https://www.plasticonline.com.au/product/seaboard-hdpe-marine-grade/ · Acrylic Mirror https://www.plasticonline.com.au/product/silver-gold-commercial-acrylic-mirror/ · EuroMir https://www.plasticonline.com.au/product/euromir-acrylic-mirror/

**Rods:** Acrylic https://www.plasticonline.com.au/product/acrylic-clear-rod/ · Acetal https://www.plasticonline.com.au/product/acetal-rod/ · Nylon https://www.plasticonline.com.au/product/nylon-rod/ · HDPE https://www.plasticonline.com.au/product/hdpe-high-density-polyethylene-rod/ · UHMWPE https://www.plasticonline.com.au/product/uhmwpe-rod-natural-only-white/ · PP https://www.plasticonline.com.au/product/polypropylene-pp-rod/ · PVC https://www.plasticonline.com.au/product/grey-pvc-rod/ · PTFE https://www.plasticonline.com.au/product/ptfe-teflon-virgin-rod/ · PEEK https://www.plasticonline.com.au/product/peek-rod/

**Tubes:** Acrylic Clear https://www.plasticonline.com.au/product/acrylic-clear-tubes/ · Acrylic Square https://www.plasticonline.com.au/product/acrylic-square-tubes/ · Acrylic Opal https://www.plasticonline.com.au/product/acrylic-opal-tube/ · Polycarbonate https://www.plasticonline.com.au/product/polycarbonate-tube/
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

**Seaboard:** UV-stabilised, sun/saltwater/marine resistant.

**Applications:** Food cutting boards, marine, conveyor wear strips, truck liners, playground equipment, dock fenders.

---

### POLYPROPYLENE (PP)

**Properties:** Lightest common engineering plastic (0.90 g/cm³). Excellent chemical resistance. Can create "living hinges" without breaking. Continuous use to 100°C, excursions to 130°C. Low moisture absorption (0.03%).

**UV:** Limited UV resistance — specify UV-stabilised grades for outdoor.

**BONDING:** Requires specialised adhesives or welding.

**Applications:** Chemical storage tanks, lab equipment, food processing, living hinge applications, automotive parts.
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
