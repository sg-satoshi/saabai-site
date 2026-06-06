/**
 * Create Stripe Products + Prices for LeadGen
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-leadgen-stripe-products.js
 */

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

async function main() {
  console.log("Creating LeadGen products...\n");

  // Starter
  const starterProduct = await stripe.products.create({
    name: "Saabai LeadGen - Starter",
    description: "AI lead capture widget for sole traders",
  });

  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 29900, // $299 AUD
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "starter" },
  });

  console.log("Starter:");
  console.log(`  Product ID: ${starterProduct.id}`);
  console.log(`  Price ID:   ${starterPrice.id}\n`);

  // Pro
  const proProduct = await stripe.products.create({
    name: "Saabai LeadGen - Pro",
    description: "AI lead capture widget for growing teams",
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 44900, // $449 AUD
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "pro" },
  });

  console.log("Pro:");
  console.log(`  Product ID: ${proProduct.id}`);
  console.log(`  Price ID:   ${proPrice.id}\n`);

  // Enterprise
  const enterpriseProduct = await stripe.products.create({
    name: "Saabai LeadGen - Enterprise",
    description: "AI lead capture widget for multi-location businesses",
  });

  const enterprisePrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 79900, // $799 AUD
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "enterprise" },
  });

  console.log("Enterprise:");
  console.log(`  Product ID: ${enterpriseProduct.id}`);
  console.log(`  Price ID:   ${enterprisePrice.id}\n`);

  console.log("✅ All products and prices created successfully.");
  console.log("\nAdd these to your Vercel environment variables:");
  console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`);
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
  console.log(`STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}`);
}

main().catch(console.error);
