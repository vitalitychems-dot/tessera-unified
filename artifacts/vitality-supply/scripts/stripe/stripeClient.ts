import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function credentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!hostname || !token) throw new Error("Connect Stripe in Replit Integrations first.");
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`Stripe credential request failed (${response.status}).`);
  const body = await response.json() as {
    items?: Array<{
      environment?: string;
      settings?: { secret_key?: string; secret?: string; webhook_secret?: string };
    }>;
  };
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  const settings = (
    body.items?.find((item) => item.environment === environment) ?? body.items?.[0]
  )?.settings;
  const secretKey = settings?.secret_key ?? settings?.secret;
  if (!secretKey) throw new Error("Stripe connection has no secret key.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed Stripe products in production. Use the development sandbox.");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe product seeding requires a test-mode connection.");
  }
  return { secret_key: secretKey, webhook_secret: settings?.webhook_secret };
}

export async function getUncachableStripeClient() {
  return new Stripe((await credentials()).secret_key);
}

export async function getStripeSync() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const value = await credentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL },
    stripeSecretKey: value.secret_key!,
    stripeWebhookSecret: value.webhook_secret ?? "",
  });
}