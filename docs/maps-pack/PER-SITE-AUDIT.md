# Maps pack per-site audit (5 Nov 2026 Brisbane)

Confidence tags: Certain / Likely / Guessing.

| Site | Mode | Added in this PR | Values used | Sources | TODOs |
|---|---|---|---|---|---|
| Saabai (saabai.ai) | service-area | Comment that GBP sameAs must stay off; locality NAP unchanged | Merrimac QLD 4226, LinkedIn sameAs only | `lib/seo-entity.ts`; GBP suspended 15 Oct 2026 (Certain) | Reinstate GBP before Maps sameAs / placeId / embed |
| Stu's Cycle Repairs | service-area | `hasMap`, verified `placeId`, MapsPack Review us on /contact | Place ID `ChIJMTybEAUCkWsRN6_ET-Nqjus`; existing GBP search URL | Feature id in reviews.ts + Maps title check (Certain) | None for pin (mobile by design) |
| LMM | service-area | Backup only; no street invented | Phone/email/areaServed already live | Live JSON-LD (Certain). Pulteney St on directories only (Likely) | Confirm Place ID + whether Pulteney St is public GBP pin before embed/Review us/hours |
| Wholesale Homes | service-area | Profile documented; schema already areaServed AU | Phone +61 488 165 908 | Live schema (Certain). GBP not created (Certain memory) | Create GBP safely later; then placeId |
| BO Consulting | service-area | `openingHoursSpecification` Mon-Fri 09:00-17:00, `@id` | Hours from live copy | Live site (Certain) | Public address + Place ID unknown |
| Tributum Law v2 | shopfront | Hours spec, `hasMap` search URL, MapsPack embed + Get directions | Level 1, 195 Victoria Square, Adelaide SA 5000; hours 09:00-18:00 weekdays | Live schema + page (Certain) | Paste Place ID for Review us |
| SUNDER | service-area | `@id` on Organization schema | areaServed Australia | Live schema (Certain). No GBP yet (Certain) | Safe GBP setup later; no pin |
| Nico Moretti | service-area | Profile corrected to Adelaide SA; backup taken | areaServed Adelaide / SA / AU | Live JSON-LD (Certain) | GBP / placeId unknown |
| InkFX Printing | shopfront | Blob patch script + patched out file (not uploaded) | 3/17 Indy Court, Carrara QLD 4211; hours 09:00-17:00; geo Likely | inkfxprinting.com contact/FAQ (Certain); coords Likely | Place ID; confirm GBP pin is Indy Court not old Worongary; **upload needs Shane yes** |
| Blue Sky Plumbing | blocked | No-op script | Placeholder phone on live page | Live HTML (Certain) | Real NAP from client |
| Heaven Thai | excluded | None | - | Shane: no work until she pays (Certain) | Wait for payment |

## Env / key

- Embeds use keyless fallback until `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` is set.
- Console links: see `GOOGLE-MAPS-EMBED-KEY.md`.
