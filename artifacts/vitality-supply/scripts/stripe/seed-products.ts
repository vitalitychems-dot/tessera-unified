import { PRODUCTS } from "../../src/lib/catalog.ts";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient.ts";
import { runMigrations } from "stripe-replit-sync";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed Stripe products in production. Use the development sandbox.");
  }
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) throw new Error("REPLIT_DOMAINS is required to register the sandbox webhook.");
  await runMigrations({ databaseUrl: process.env.DATABASE_URL });
  const stripe = await getUncachableStripeClient();
  for (const product of PRODUCTS) {
    const found = await stripe.products.search({ query: `metadata['productId']:'${product.id}'`, limit: 1 });
    const stripeProduct = found.data[0] ?? await stripe.products.create({
      name: product.name,
      metadata: { productId: product.id },
    });
    for (const variant of product.variants) {
      const prices = await stripe.prices.list({ product: stripeProduct.id, active: true, limit: 100 });
      const cents = Math.round(variant.price * 100);
      const existing = prices.data.find((price) =>
        price.metadata.productId === product.id &&
        price.metadata.dose === variant.dose &&
        price.unit_amount === cents,
      );
      if (!existing) {
        await stripe.prices.create({
          product: stripeProduct.id, unit_amount: cents, currency: "usd",
          metadata: { productId: product.id, dose: variant.dose },
        });
        console.log(`Created ${product.id} / ${variant.dose} at ${cents} cents`);
      }
    }
  }
  const sync = await getStripeSync();
  await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
  // Without an explicit object the library syncs nothing (its default is not a valid object name).
  await sync.syncBackfill({ object: "all" });
  console.log("Stripe products seeded and synced.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});