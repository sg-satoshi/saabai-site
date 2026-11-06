#!/usr/bin/env node
/**
 * Prepare InkFX Printing blob HTML maps pack.
 * Default: dry-run (writes patched copy under scripts/maps-pack/out only).
 * Does NOT upload to Vercel Blob. Pass --apply-local to also write a local out file.
 *
 * Usage:
 *   node scripts/maps-pack/patch-blob-inkfx.mjs [--input path/to/index.html]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "out");
mkdirSync(outDir, { recursive: true });
mkdirSync(join(__dirname, "backups"), { recursive: true });

const inputArg = process.argv.find((a) => a.startsWith("--input="))?.slice(8);
const inputPath = inputArg || join(__dirname, "fixtures", "inkfx-printing.index.html");

if (!existsSync(inputPath)) {
  console.error("Missing input HTML. Download blob sites/inkfx-printing/index.html first:");
  console.error("  place it at", inputPath);
  console.error("Or pass --input=/path/to/index.html");
  console.error("This script never uploads.");
  process.exit(2);
}

const html = readFileSync(inputPath, "utf8");
writeFileSync(join(__dirname, "backups", `inkfx-printing.index.${Date.now()}.html`), html);

const address = {
  "@type": "PostalAddress",
  streetAddress: "3/17 Indy Court",
  addressLocality: "Carrara",
  addressRegion: "QLD",
  postalCode: "4211",
  addressCountry: "AU",
};

const schema = {
  "@context": "https://schema.org",
  "@type": "PrintShop",
  name: "InkFX Printing",
  description: "Multi-award winning photographic printing on the Gold Coast",
  url: "https://www.inkfxprinting.com",
  telephone: "+611300903065",
  email: "info@inkfx.com.au",
  address,
  geo: { "@type": "GeoCoordinates", latitude: -28.012169, longitude: 153.347325 },
  areaServed: { "@type": "Country", name: "Australia" },
  hasMap:
    "https://www.google.com/maps/search/?api=1&query=InkFX+Printing%2C+3%2F17+Indy+Court%2C+Carrara+QLD+4211",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/inkfxprinting",
    "https://www.facebook.com/inkfxprinting",
  ],
};

const embed =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("InkFX Printing, 3/17 Indy Court, Carrara QLD 4211, Australia") +
  "&output=embed";

const pack = `
<section id="maps-pack" class="maps-pack" aria-label="InkFX Printing on Google Maps" data-maps-slug="inkfx-printing" data-maps-mode="shopfront" data-maps-embed="keyless" style="margin:2rem 0">
  <div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:12px;overflow:hidden;background:#0f172a">
    <iframe title="InkFX Printing location map" src="${embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
    <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("InkFX Printing, 3/17 Indy Court, Carrara QLD 4211, Australia")}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;background:#1a73e8;color:#fff">Get directions</a>
  </div>
  <p style="margin:8px 0 0;font-size:11px;opacity:.55">Map uses a keyless Google embed. Add NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY for the official Maps Embed API. Place ID TODO: Review us button waits on verified ChIJ id.</p>
</section>
`;

let out = html;
const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i;
if (ldRe.test(out)) {
  out = out.replace(
    ldRe,
    `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
  );
} else {
  out = out.replace(/<\/head>/i, `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
}

if (!/id=["']maps-pack["']/.test(out)) {
  if (/id=["']contact["']/.test(out)) {
    out = out.replace(/id=["']contact["'][^>]*>/i, (m) => m + pack);
  } else if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${pack}\n</body>`);
  } else {
    out += pack;
  }
}

if (/\u2014/.test(out)) {
  console.error("Refusing to write: em dash detected in output");
  process.exit(1);
}

const outPath = join(outDir, "inkfx-printing.index.patched.html");
writeFileSync(outPath, out);
console.log("Wrote", outPath);
console.log("Dry-run only. Do not upload to Vercel Blob until Shane approves.");
console.log("TODO: Place ID for Review us button.");
