/**
 * JSON-LD for saabai.ai must parse, use published facts only, and stay
 * consistent with the visible NAP. Run: npx tsx --test tests/json-ld.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AREA_SERVED,
  NAP,
  POSTAL_ADDRESS,
  SAME_AS,
  SITE_URL,
  lawFirmChatbotServiceNode,
  lexServiceSchema,
  locationServiceSchema,
  miaServiceSchema,
  organizationSchema,
  receptionistServiceNode,
  websitesServiceNode,
} from "../lib/seo-entity";
import { faqSchema } from "../lib/seo-meta";
import { publicPageMeta } from "../lib/seo-pages";
import { BRISBANE, GOLD_COAST } from "../lib/location-data";

const PUBLISHED_PRICES = new Set(["0", "100", "200", "299", "300", "497", "1497", "2000", "3500"]);

function parseLd(data: unknown) {
  const raw = JSON.stringify(data).replace(/</g, "\\u003c");
  return JSON.parse(raw) as Record<string, unknown>;
}

function walk(node: unknown, visit: (o: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    visit(obj);
    for (const value of Object.values(obj)) walk(value, visit);
  }
}

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

test("organization JSON-LD parses and carries the published entity facts", () => {
  const data = parseLd(organizationSchema);
  assert.equal(data["@context"], "https://schema.org");
  const graph = data["@graph"] as Record<string, unknown>[];
  const org = graph.find((node) => {
    const type = node["@type"];
    return Array.isArray(type) && type.includes("Organization") && type.includes("ProfessionalService");
  });
  assert.ok(org, "home and sitewide graph includes Organization + ProfessionalService");
  assert.equal(org.name, "Saabai");
  assert.equal(org.url, "https://www.saabai.ai");
  assert.equal(org.logo, `${SITE_URL}/brand/saabai-logo.png`);
  assert.equal(org.email, NAP.email);
  assert.equal(org.taxID, "ABN 71 889 082 572");
  assert.deepEqual(org.sameAs, [...SAME_AS]);
  assert.equal(org.telephone, undefined);
  assert.deepEqual(org.address, POSTAL_ADDRESS);
  assert.equal((org.address as Record<string, unknown>).streetAddress, undefined);
  assert.deepEqual(
    (org.areaServed as { name: string }[]).map((area) => area.name),
    ["Gold Coast", "Brisbane", "Queensland", "Australia"],
  );
  assert.deepEqual(AREA_SERVED.map((area) => area.name), ["Gold Coast", "Brisbane", "Queensland", "Australia"]);
});

test("service and FAQ JSON-LD parses, with no ratings, reviews or unpublished prices", () => {
  const blocks = [
    organizationSchema,
    miaServiceSchema,
    lexServiceSchema,
    websitesServiceNode,
    receptionistServiceNode,
    lawFirmChatbotServiceNode,
    locationServiceSchema("Gold Coast", `${SITE_URL}/gold-coast`, GOLD_COAST.seo.description),
    locationServiceSchema("Brisbane", `${SITE_URL}/brisbane`, BRISBANE.seo.description),
    faqSchema([{ q: "What is an AI receptionist?", a: "It is an AI assistant that answers your website visitors." }]),
  ];
  const blob = blocks.map((block) => JSON.stringify(parseLd(block))).join("\n");
  assert.doesNotMatch(blob, /aggregateRating|reviewCount|ratingValue|"@type":"Review"/);

  const prices: string[] = [];
  for (const block of blocks) {
    walk(parseLd(block), (node) => {
      if (node["@type"] === "Offer" && node.price !== undefined) prices.push(String(node.price));
      assert.equal(node.streetAddress, undefined);
      assert.equal(node.aggregateRating, undefined);
    });
  }
  for (const price of prices) assert.ok(PUBLISHED_PRICES.has(price), `unpublished price ${price}`);

  const mia = parseLd(miaServiceSchema);
  assert.equal(mia["@type"], "Service");
  assert.equal(mia.name, "Mia");
  assert.equal(mia.offers, undefined);

  const lex = parseLd(lexServiceSchema);
  assert.equal(lex["@type"], "Service");
  assert.equal(lex.name, "Lex");
  assert.equal((lex.offers as { price: string }).price, "299");

  const sites = parseLd(websitesServiceNode);
  assert.equal(sites.name, "Saabai website care plans");
  assert.deepEqual((sites.offers as { price: string }[]).map((offer) => offer.price), ["100", "200", "300"]);

  const receptionist = parseLd(receptionistServiceNode);
  assert.equal(receptionist.name, "AI receptionist for Gold Coast businesses");
  assert.equal(receptionist.offers, undefined);
  assert.ok((receptionist.areaServed as { name: string }[]).some((area) => area.name === "Gold Coast"));
  assert.ok((receptionist.areaServed as { name: string }[]).some((area) => area.name === "Brisbane"));
});

test("schema prices are copied from the pages that publish them", () => {
  const legal = readFileSync("app/legal/page.tsx", "utf8");
  const websites = readFileSync("app/websites/page.tsx", "utf8");
  const blueprint = readFileSync("lib/blueprint.ts", "utf8");
  const blueprintPage = readFileSync("app/blueprint/page.tsx", "utf8");
  assert.match(legal, /\$299/);
  assert.match(websites, /Presence is \$100 a month/);
  assert.match(websites, /Growth is \$200 a month/);
  assert.match(websites, /Signature is \$300 a month/);
  assert.match(websites, /\$2,000/);
  assert.match(blueprintPage, /priceLabel/);
  assert.match(blueprint, /price: 497/);
  assert.match(blueprint, /priceLabel: "\$1,497"/);
  assert.match(blueprint, /price: 3500/);
});

test("product pages render the shared Service and FAQ schema", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const legal = readFileSync("app/legal/page.tsx", "utf8");
  const websites = readFileSync("app/websites/page.tsx", "utf8");
  const receptionist = readFileSync("app/ai-receptionist-gold-coast/page.tsx", "utf8");
  const faq = readFileSync("app/faq/page.tsx", "utf8");
  const layout = readFileSync("app/components/SaabaiJsonLd.tsx", "utf8");
  const location = readFileSync("app/components/LocationPage.tsx", "utf8");
  assert.match(home, /miaServiceSchema/);
  assert.match(home, /faqSchema\(FAQS\)/);
  assert.match(legal, /lexServiceSchema/);
  assert.match(legal, /faqSchema\(LEX_FAQS\)/);
  assert.match(websites, /websitesServiceNode/);
  assert.match(websites, /faqNode\(faqs\)/);
  assert.match(receptionist, /receptionistServiceNode/);
  assert.match(receptionist, /faqNode\(/);
  assert.match(faq, /faqSchema\(faqs\.flatMap/);
  assert.match(layout, /organizationSchema/);
  assert.match(location, /locationServiceSchema/);
  assert.doesNotMatch(location, /#business/);
  assert.doesNotMatch(location, /addressLocality: "Gold Coast"/);
});

test("public titles and descriptions are unique, local, and free of em dashes", () => {
  const metas = Object.values(publicPageMeta);
  const titles = metas.map((meta) => {
    const title = meta.title as { absolute?: string };
    assert.equal(typeof title.absolute, "string");
    return title.absolute as string;
  });
  const descriptions = metas.map((meta) => {
    assert.equal(typeof meta.description, "string");
    return meta.description as string;
  });
  assert.equal(new Set(titles).size, titles.length, "duplicate title");
  assert.equal(new Set(descriptions).size, descriptions.length, "duplicate description");
  for (const text of [...titles, ...descriptions]) {
    assert.doesNotMatch(text, /[\u2012-\u2015]/, text);
  }
  for (const description of descriptions) {
    const count = sentences(description).length;
    assert.ok(count >= 1 && count <= 2, `${count} sentences: ${description}`);
    assert.match(description, /Gold Coast|Brisbane|Merrimac|Australia/);
  }
  assert.equal(GOLD_COAST.seo.description, publicPageMeta.goldCoast.description);
  assert.equal(BRISBANE.seo.description, publicPageMeta.brisbane.description);
});

test("footer, contact, terms, privacy and about share one NAP and publish no phone or street", () => {
  const files = [
    "app/components/sb/SbFooter.tsx",
    "app/contact/page.tsx",
    "app/terms/page.tsx",
    "app/privacy/page.tsx",
    "app/about/page.tsx",
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.match(src, /NAP/, `${file} should use the shared NAP`);
    assert.doesNotMatch(src, /Bourton|head office|Head office|tel:/i, file);
    assert.doesNotMatch(src, /04\d{2}\s?\d{3}\s?\d{3}/, file);
  }
  assert.equal(NAP.name, "Saabai");
  assert.equal(NAP.email, "hello@saabai.ai");
  assert.equal(NAP.abn, "71 889 082 572");
  assert.equal(NAP.addressLine, "Merrimac QLD 4226, Australia");
  assert.equal(POSTAL_ADDRESS.addressLocality, "Merrimac");
  assert.equal(POSTAL_ADDRESS.addressRegion, "QLD");
  assert.equal(POSTAL_ADDRESS.postalCode, "4226");
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /Merrimac on the Gold Coast/);
  assert.match(layout, /siteName: "Saabai"/);
});
