import Stripe from "stripe";
import { StripeSync, runMigrations } from "stripe-replit-sync";

let configuredCache: { value: boolean; until: number } | undefined;

const globalRef = globalThis as typeof globalThis & { __vsStripeReady__?: Promise<void> };

export async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !token) {
    throw new Error("Stripe is not connected. Connect it in the Replit Integrations tab.");
  }
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: token },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Stripe credential request failed (${response.status}).`);
  const data = await response.json() as {
    items?: Array<{
      environment?: string;
      // Replit-provisioned sandboxes expose `secret`/`publishable`; older connections use `secret_key`.
      settings?: { secret_key?: string; secret?: string; webhook_secret?: string };
    }>;
  };
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  const settings = (
    data.items?.find((item) => item.environment === environment) ?? data.items?.[0]
  )?.settings;
  const secretKey = settings?.secret_key ?? settings?.secret;
  if (!secretKey) {
    throw new Error("Stripe is not connected. Connect it in the Replit Integrations tab.");
  }
  // A public storefront must never expose a hosted test checkout. Replit's
  // provisioned sandbox remains available in development, but production card
  // checkout stays disabled until the owner claims/connects a live Stripe
  // account from Publishing. Do not weaken this check to make a publish look
  // successful: test sessions cannot collect real customer payments.
  if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
    throw new Error(
      "Stripe card checkout is not live. Claim or connect the live Stripe account in Publishing before accepting card payments.",
    );
  }
  if (process.env.NODE_ENV !== "production" && !secretKey.startsWith("sk_test_")) {
    throw new Error(
      "Stripe development checkout requires a test-mode connection. Connect the Replit Stripe sandbox before testing card payments.",
    );
  }
  // When the connection carries no webhook secret, stripe-replit-sync falls back to the
  // managed webhook it registered (stored in stripe._managed_webhooks).
  return { secretKey, webhookSecret: settings?.webhook_secret };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for Stripe sync.");
  const credentials = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL },
    stripeSecretKey: credentials.secretKey,
    stripeWebhookSecret: credentials.webhookSecret ?? "",
  });
}

/**
 * One-time per-process Stripe bootstrap, in the order stripe-replit-sync requires:
 * create the `stripe` schema, register this deployment's managed webhook
 * (REPLIT_DOMAINS resolves to the production domain when published and the
 * dev domain in the workspace), then backfill existing Stripe data so
 * `stripe.prices` is queryable. Memoized on globalThis; a failure is not cached
 * so the next caller retries.
 */
export function ensureStripeReady(): Promise<void> {
  globalRef.__vsStripeReady__ ??= (async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for Stripe sync.");
    await runMigrations({ databaseUrl });
    const sync = await getStripeSync();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (!domain) {
      throw new Error("Stripe webhook setup requires REPLIT_DOMAINS to be configured.");
    }
    await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
    // Without an explicit object the library syncs nothing (its default is not a valid object name).
    await sync.syncBackfill({ object: "all" });
    console.log("[stripe] schema migrated, webhook registered, catalog synced");
  })().catch((error) => {
    globalRef.__vsStripeReady__ = undefined;
    throw error;
  });
  return globalRef.__vsStripeReady__;
}

export async function stripeConfigured() {
  if (configuredCache && configuredCache.until > Date.now()) return configuredCache.value;
  try {
    await getStripeCredentials();
    // Do not advertise card checkout until the managed webhook and synced
    // Stripe schema are ready. createOrder also awaits this memoized bootstrap,
    // so a transient first-request race cannot produce a misleading card CTA.
    await ensureStripeReady();
    configuredCache = { value: true, until: Date.now() + 60_000 };
  } catch (error) {
    console.error("[stripe] readiness check failed:", error instanceof Error ? error.message : error);
    configuredCache = { value: false, until: Date.now() + 60_000 };
  }
  return configuredCache.value;
}