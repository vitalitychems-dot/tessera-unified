import type Stripe from "stripe";
import { quoteCheckout } from "@/lib/checkout/quote";
import { settings, validateContact, type Contact } from "@/lib/checkout/api";
import { findProduct } from "@/lib/catalog";
import { serverSiteUrl } from "@/lib/site-url";
import { consumePublicBudget } from "@/lib/public-abuse.server";

const SUBSCRIPTION_DISCOUNT_PERCENT = 5;
export type SubscriptionInput = {
  productId: string;
  dose: string;
  qty: number;
  cadence: "monthly" | "quarterly";
  email: string;
  firstName: string;
  lastName: string;
  lab?: string;
  phone?: string;
  address: string;
  city: string;
  region?: string;
  postal: string;
  country: string;
  origin?: string;
  idempotencyKey: string;
  researchAttestation: boolean;
};

export type SubscriptionCheckoutDependencies = {
  stripe?: Stripe;
};

function dollars(cents: number) {
  return cents / 100;
}

function safeOrigin(value: string) {
  try {
    const candidate = new URL(value);
    if (candidate.protocol !== "https:") return serverSiteUrl();
    const allowed = new Set([
      "vitalitychems.com",
      "www.vitalitychems.com",
      ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
    ]);
    return allowed.has(candidate.hostname) ? candidate.origin : serverSiteUrl();
  } catch {
    return serverSiteUrl();
  }
}

export async function createSubscriptionCheckoutServer(
  data: SubscriptionInput,
  dependencies: SubscriptionCheckoutDependencies = {},
) {
    const idempotencyKey = String(data.idempotencyKey ?? "").trim();
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(idempotencyKey)) {
      throw new Error("Refresh the subscription form and try again.");
    }
    if (data.researchAttestation !== true) {
      throw new Error("Confirm the research-use-only attestation before starting a subscription.");
    }
    const product = findProduct(String(data.productId));
    const variant = product?.variants.find((item) => item.dose === String(data.dose));
    const qty = Math.trunc(Number(data.qty));
    if (!product?.inStock || !variant || !Number.isSafeInteger(qty) || qty < 1 || qty > 100) {
      throw new Error("Choose an available catalog vial and a quantity from 1 to 100.");
    }
    if (data.cadence !== "monthly" && data.cadence !== "quarterly") {
      throw new Error("Choose a monthly or quarterly cadence.");
    }
    const contact = await validateContact(data as Contact);
    const { getSql, withTransaction } = await import("@/lib/db");
    const sql = await getSql();
    if (!await consumePublicBudget(sql, "subscription", 30)) {
      throw new Error("Too many subscription attempts. Please wait before trying again.");
    }
    const values = await settings();
    const quote = quoteCheckout({
      lines: [{ productId: product.id, dose: variant.dose, qty }],
      promo: { code: "SUBSCRIPTION5", type: "percent", percent: SUBSCRIPTION_DISCOUNT_PERCENT, label: "Recurring research supply incentive" },
      signedIn: false,
      calculateShipping: true,
      salesTaxRatePercent: Number(values.sales_tax_rate_percent) || 0,
      taxJurisdiction: { country: contact.country, region: contact.region },
    });
    const existing = await sql<{ id: string; stripe_session_id: string | null; status: string }>`
      select id, stripe_session_id, status
      from store_subscriptions
      where client_idempotency_key = ${idempotencyKey}
      limit 1
    `;
    if (existing[0]?.stripe_session_id) {
      const stripe = dependencies.stripe
        ?? await (await import("@/lib/payments/stripe.server")).getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(existing[0].stripe_session_id);
      if (!session.url) throw new Error("The existing subscription checkout has no payment URL.");
      return { ok: true as const, id: existing[0].id, url: session.url };
    }
    if (existing[0] && existing[0].status !== "pending") {
      throw new Error("That subscription attempt cannot be resumed. Refresh and try again.");
    }
    const subscriptionId = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) await withTransaction(async (tx) => {
      await tx`
        insert into store_subscriptions (
          id, email, first_name, last_name, lab, phone, address, city, region, postal, country,
          product_id, dose, qty, cadence, items, subtotal, shipping, sales_tax, tax_rate,
          discount, credit_applied, total, status, first_order_review_required, client_idempotency_key
        ) values (
          ${subscriptionId}, ${contact.email}, ${contact.firstName}, ${contact.lastName},
          ${contact.lab || null}, ${contact.phone || null}, ${contact.address}, ${contact.city},
          ${contact.region || null}, ${contact.postal}, ${contact.country}, ${product.id},
          ${variant.dose}, ${qty}, ${data.cadence}, ${JSON.stringify(quote.lines)},
          ${dollars(quote.subtotalCents)}, ${dollars(quote.shippingCents)}, ${dollars(quote.salesTaxCents)},
          ${quote.taxRatePercent}, ${dollars(quote.savings.bulkCents + quote.savings.promoCents)},
          ${dollars(quote.creditAppliedCents)}, ${dollars(quote.totalCents)}, 'pending', true, ${idempotencyKey}
        )
      `;
    });
    try {
      const stripe = dependencies.stripe
        ?? await (await import("@/lib/payments/stripe.server")).getUncachableStripeClient();
      const origin = safeOrigin(String(data.origin));
      const interval = data.cadence === "monthly"
        ? { interval: "month" as const }
        : { interval: "month" as const, interval_count: 3 };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: quote.totalCents,
            recurring: interval,
            product_data: { name: `${product.name} · research restock` },
          },
          quantity: 1,
        }],
        customer_email: contact.email,
        billing_address_collection: "required",
        metadata: { subscriptionRequestId: subscriptionId },
        subscription_data: { metadata: { subscriptionRequestId: subscriptionId } },
        success_url: `${origin}/subscriptions?subscription=${subscriptionId}&success=1`,
        cancel_url: `${origin}/subscriptions`,
      }, { idempotencyKey: `subscription-checkout-${idempotencyKey}` });
      await sql`
        update store_subscriptions
        set stripe_session_id = ${session.id}, updated_at = now()
        where id = ${subscriptionId} and status = 'pending'
      `;
      return { ok: true as const, id: subscriptionId, url: session.url };
    } catch (error) {
      // Keep a pending row resumable when Stripe is temporarily unavailable.
      // The same idempotency key is passed to Stripe, so a retry cannot create
      // a second Checkout Session after an ambiguous network failure.
      throw error;
    }
}

export async function quoteSubscriptionServer(data: Omit<SubscriptionInput, "origin" | "idempotencyKey">) {
    if (data.researchAttestation !== true) throw new Error("Confirm the research-use-only attestation.");
    const product = findProduct(String(data.productId));
    const variant = product?.variants.find((item) => item.dose === String(data.dose));
    const qty = Math.trunc(Number(data.qty));
    if (!product?.inStock || !variant || !Number.isSafeInteger(qty) || qty < 1 || qty > 100) {
      throw new Error("Choose an available catalog vial and a quantity from 1 to 100.");
    }
    const contact = await validateContact(data as Contact);
    const values = await settings();
    const quote = quoteCheckout({
      lines: [{ productId: product.id, dose: variant.dose, qty }],
      promo: { code: "SUBSCRIPTION5", type: "percent", percent: SUBSCRIPTION_DISCOUNT_PERCENT },
      signedIn: false,
      calculateShipping: true,
      salesTaxRatePercent: Number(values.sales_tax_rate_percent) || 0,
      taxJurisdiction: { country: contact.country, region: contact.region },
    });
    return {
      subtotalCents: quote.subtotalCents,
      discountCents: quote.savings.bulkCents + quote.savings.promoCents,
      shippingCents: quote.shippingCents,
      salesTaxCents: quote.salesTaxCents,
      taxRatePercent: quote.taxRatePercent,
      totalCents: quote.totalCents,
      cadence: data.cadence,
      incentivePercent: SUBSCRIPTION_DISCOUNT_PERCENT,
    };
}

type SubscriptionRow = {
  id: string; stripe_subscription_id: string | null; stripe_customer_id: string | null;
  email: string; first_name: string; last_name: string; lab: string | null; phone: string | null;
  address: string; city: string; region: string | null; postal: string; country: string;
  items: unknown; subtotal: string | number; shipping: string | number; sales_tax: string | number;
  tax_rate: string | number; discount: string | number; credit_applied: string | number;
  total: string | number; next_cycle: number; first_order_review_required: boolean; status: string;
};

function n(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

/**
 * Create one local order for a paid subscription invoice, then route it through
 * the normal idempotent settlement path. The first cycle keeps the same review
 * hold as one-time orders; later cycles can fulfill automatically.
 */
export async function createSubscriptionCycleOrder(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  stripeSubscriptionId: string,
  paymentRef: string,
  invoiceId?: string,
) {
  const { withTransaction } = await import("@/lib/db");
  const orderId = await withTransaction(async (tx) => {
    const rows = await tx<SubscriptionRow>`
      select * from store_subscriptions
      where stripe_subscription_id = ${stripeSubscriptionId}
        and status in ('active', 'past_due')
      for update
    `;
    const subscription = rows[0];
    if (!subscription) return null;
    const cycle = Number(subscription.next_cycle);
    const id = crypto.randomUUID();
    const accessKey = crypto.randomUUID().replaceAll("-", "");
    const reference = `VS-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const firstOrder = cycle === 1 && subscription.first_order_review_required;
    const inserted = await tx<{ id: string }>`
      insert into store_orders (
        id, reference, access_key, user_id, email, first_name, last_name, lab, phone,
        address, city, region, postal, country, subtotal, shipping, sales_tax, tax_rate,
        discount, total, items, status, payment_method, payment_status, credit_applied,
        credit_earned, research_attested_at, first_order_review_required, first_order_review_status,
        client_idempotency_key, subscription_id, subscription_cycle, stripe_invoice_id
      ) values (
        ${id}, ${reference}, ${accessKey}, null, ${subscription.email}, ${subscription.first_name},
        ${subscription.last_name}, ${subscription.lab}, ${subscription.phone}, ${subscription.address},
        ${subscription.city}, ${subscription.region}, ${subscription.postal}, ${subscription.country},
        ${subscription.subtotal}, ${subscription.shipping}, ${subscription.sales_tax}, ${subscription.tax_rate},
        ${subscription.discount}, ${subscription.total}, ${JSON.stringify(subscription.items)},
        'pending_payment', 'stripe', 'unpaid', ${subscription.credit_applied}, 0, now(),
        ${firstOrder}, ${firstOrder ? "pending" : "not_required"},
        ${`subscription:${subscription.id}:${cycle}`}, ${subscription.id}, ${cycle}, ${invoiceId ?? null}
      )
      on conflict (subscription_id, subscription_cycle) do nothing
      returning id
    `;
    const createdId = inserted[0]?.id;
    if (!createdId) {
      const existing = await tx<{ id: string }>`
        select id from store_orders
        where subscription_id = ${subscription.id} and subscription_cycle = ${cycle}
        limit 1
      `;
      return existing[0]?.id ?? null;
    }
    await tx`
      update store_subscriptions
      set next_cycle = next_cycle + 1, updated_at = now()
      where id = ${subscription.id}
    `;
    return createdId;
  });
  if (orderId) {
    const { settleOrder } = await import("@/lib/checkout/settle.server");
    await settleOrder(orderId, { paymentRef });
  }
  return orderId;
}

export async function activateSubscriptionFromSession(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  session: {
    id: string;
    payment_status: string;
    payment_intent: string | { id: string } | null;
    subscription: string | { id: string } | null;
    customer: string | { id: string } | null;
    metadata: Record<string, string> | null;
  },
) {
  const requestId = session.metadata?.subscriptionRequestId;
  if (!requestId || session.payment_status !== "paid") return "unpaid" as const;
  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;
  if (!stripeSubscriptionId) throw new Error("Stripe subscription is missing from the completed checkout.");
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const rows = await sql<{ id: string }>`
    update store_subscriptions
    set status = 'active', stripe_subscription_id = ${stripeSubscriptionId},
      stripe_customer_id = ${stripeCustomerId}, stripe_session_id = ${session.id}, updated_at = now()
    where id = ${requestId} and status = 'pending'
    returning id
  `;
  if (!rows[0]) return "already_active" as const;
  const paymentRef = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? session.id;
  await createSubscriptionCycleOrder(sql, stripeSubscriptionId, paymentRef);
  return "activated" as const;
}

export async function markSubscriptionStatus(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  stripeSubscriptionId: string,
  status: "active" | "past_due" | "cancelled",
  observedAt = new Date(),
) {
  await sql`
    update store_subscriptions set status = ${status},
      cancelled_at = case when ${status} = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      stripe_status_at = ${observedAt},
      updated_at = now()
    where stripe_subscription_id = ${stripeSubscriptionId}
      and (stripe_status_at is null or stripe_status_at <= ${observedAt})
  `;
}
