import type Stripe from "stripe";
import type { Sql } from "@/lib/db";
import {
  activateSubscriptionFromSession,
  createSubscriptionCycleOrder,
  markSubscriptionStatus,
} from "@/lib/subscriptions.server";
import { settleStripeSession } from "@/lib/checkout/settle.server";

const LEASE_MINUTES = 10;
const MAX_ATTEMPTS = 8;

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

function objectId(event: Stripe.Event) {
  const object = event.data.object as { id?: unknown };
  return typeof object.id === "string" ? object.id : null;
}

export async function enqueueStripeEvent(sql: Sql, event: Stripe.Event) {
  const rows = await sql<{ id: string }>`
    insert into stripe_event_ledger
      (id, type, object_id, stripe_created_at, livemode, status)
    values (
      ${event.id}, ${event.type}, ${objectId(event)},
      to_timestamp(${event.created}), ${event.livemode}, 'queued'
    )
    on conflict (id) do nothing
    returning id
  `;
  return Boolean(rows[0]);
}

export async function stripeEventSnapshot(sql: Sql) {
  const rows = await sql<{
    queued: number;
    processing: number;
    retry: number;
    dead: number;
    processed: number;
    oldest_pending: string | null;
    last_error: string | null;
  }>`
    select
      count(*) filter (where status = 'queued')::int as queued,
      count(*) filter (where status = 'processing')::int as processing,
      count(*) filter (where status = 'retry')::int as retry,
      count(*) filter (where status = 'dead')::int as dead,
      count(*) filter (where status = 'processed')::int as processed,
      min(created_at) filter (where status in ('queued', 'retry', 'processing')) as oldest_pending,
      max(last_error) filter (where status in ('retry', 'dead')) as last_error
    from stripe_event_ledger
  `;
  const row = rows[0];
  return {
    queued: Number(row?.queued ?? 0),
    processing: Number(row?.processing ?? 0),
    retry: Number(row?.retry ?? 0),
    dead: Number(row?.dead ?? 0),
    processed: Number(row?.processed ?? 0),
    oldestPending: row?.oldest_pending ?? null,
    lastError: row?.last_error ?? null,
  };
}

export async function retryStripeEvent(sql: Sql, id: string) {
  await sql`
    update stripe_event_ledger
    set status = 'queued', attempts = 0, next_attempt_at = null,
      lease_expires_at = null, last_error = null, updated_at = now()
    where id = ${id} and status in ('retry', 'dead')
  `;
}

export async function processStripeEvents(sql: Sql, limit = 25, stripeClient?: Stripe) {
  const jobs = await sql<{ id: string }>`
    update stripe_event_ledger
    set status = 'processing',
      attempts = attempts + 1,
      lease_expires_at = now() + (${LEASE_MINUTES} * interval '1 minute'),
      updated_at = now()
    where id in (
      select id
      from stripe_event_ledger
      where (
        status in ('queued', 'retry')
        and (next_attempt_at is null or next_attempt_at <= now())
      )
      or (
        status = 'processing'
        and lease_expires_at is not null
        and lease_expires_at <= now()
      )
      order by created_at
      for update skip locked
      limit ${limit}
    )
    returning id
  `;
  let processed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const eventRows = await sql<{ id: string; type: string; object_id: string | null; stripe_created_at: string | null }>`
        select id, type, object_id, stripe_created_at from stripe_event_ledger where id = ${job.id}
      `;
      const event = eventRows[0];
      if (!event) throw new Error(`Stripe event ${job.id} disappeared before processing.`);
      // The verified Stripe payload is intentionally not stored because it can
      // contain customer and payment data. The worker retrieves the current
      // object from Stripe using the verified object id.
      await dispatchStripeEvent(sql, event.id, event.type, event.object_id, event.stripe_created_at, stripeClient);
      await sql`
        update stripe_event_ledger
        set status = 'processed', processed_at = now(),
          lease_expires_at = null, next_attempt_at = null,
          last_error = null, updated_at = now()
        where id = ${job.id}
      `;
      processed += 1;
    } catch (error) {
      failed += 1;
      const reason = errorMessage(error);
      await sql`
        update stripe_event_ledger
        set status = case when attempts >= ${MAX_ATTEMPTS} then 'dead' else 'retry' end,
          last_error = ${reason}, lease_expires_at = null,
          next_attempt_at = case
            when attempts >= ${MAX_ATTEMPTS} then null
            else now() + (least(21600, 60 * power(2, greatest(0, attempts - 1))) * interval '1 second')
          end,
          updated_at = now()
        where id = ${job.id}
      `;
      console.error("[stripe-events] processing failed", { eventId: job.id, reason });
    }
  }
  return { processed, failed, claimed: jobs.length };
}

export async function dispatchStripeEvent(
  sql: Sql,
  eventId: string,
  type: string,
  objectId: string | null,
  createdAt: string | null,
  stripeClient?: Stripe,
) {
  if (!objectId) return;
  const stripe = stripeClient ?? await (await import("@/lib/payments/stripe.server")).getUncachableStripeClient();
  const created = createdAt ? new Date(createdAt) : new Date();
  let object: Stripe.Event["data"]["object"];
  if (type.startsWith("checkout.session.")) {
    object = await stripe.checkout.sessions.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("invoice.")) {
    object = await stripe.invoices.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("customer.subscription.")) {
    object = await stripe.subscriptions.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("charge.dispute.")) {
    object = await stripe.disputes.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("charge.")) {
    object = await stripe.charges.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("refund.")) {
    object = await stripe.refunds.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else if (type.startsWith("customer.")) {
    object = await stripe.customers.retrieve(objectId) as unknown as Stripe.Event["data"]["object"];
  } else {
    return;
  }

  if (
    type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded"
  ) {
    const session = object as Stripe.Checkout.Session;
    const outcome = session.mode === "subscription"
      ? await activateSubscriptionFromSession(sql, session)
      : await settleStripeSession(sql, session);
    if (outcome === "mismatch") throw new Error("Stripe checkout amount or session mismatch requires review.");
    return;
  }
  if (type === "invoice.paid") {
    const invoice = object as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      paid?: boolean;
    };
    if (invoice.paid !== true && invoice.status !== "paid") {
      throw new Error("Invoice is not paid.");
    }
    const subscription = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
    if (subscription) {
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
      const local = await sql<{ total: string | number; stripe_customer_id: string | null }>`
        select total, stripe_customer_id
        from store_subscriptions
        where stripe_subscription_id = ${subscription}
        limit 1
      `;
      if (!local[0]) throw new Error("Invoice subscription is not mapped locally.");
      if (local[0].stripe_customer_id && customer && local[0].stripe_customer_id !== customer) {
        throw new Error("Invoice customer does not match the mapped subscription.");
      }
      const expectedCents = Math.round(Number(local[0].total) * 100);
      const paidCents = Number(invoice.amount_paid ?? invoice.total ?? 0);
      if (!Number.isSafeInteger(paidCents) || paidCents !== expectedCents || invoice.currency !== "usd") {
        throw new Error("Invoice amount or currency does not match the subscription snapshot.");
      }
      const paymentIntentValue = (invoice as unknown as {
        payment_intent?: string | { id: string } | null;
      }).payment_intent;
      const paymentIntent = typeof paymentIntentValue === "string"
        ? paymentIntentValue
        : paymentIntentValue?.id ?? invoice.id;
      await createSubscriptionCycleOrder(sql, subscription, paymentIntent, invoice.id);
    }
    return;
  }
  if (
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted"
  ) {
    const subscription = object as Stripe.Subscription;
    await markSubscriptionStatus(
      sql,
      subscription.id,
      type === "customer.subscription.deleted"
        ? "cancelled"
        : subscription.status === "past_due" ? "past_due" : "active",
      created,
    );
    return;
  }
  if (type === "invoice.payment_failed") {
    const invoice = object as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
    };
    const subscription = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
    if (subscription) await markSubscriptionStatus(sql, subscription, "past_due", created);
    return;
  }
  if (type === "charge.refunded" || type === "charge.dispute.created" || type === "charge.dispute.closed") {
    await recordPaymentAdjustment(sql, eventId, type, object, objectId);
  }
}

async function recordPaymentAdjustment(sql: Sql, eventId: string, type: string, object: Stripe.Event["data"]["object"], objectIdValue: string) {
  const stripe = await (await import("@/lib/payments/stripe.server")).getUncachableStripeClient();
  const dispute = type.startsWith("charge.dispute.") ? object as unknown as Stripe.Dispute : null;
  const chargeId = dispute && typeof dispute.charge === "string" ? dispute.charge : null;
  const charge = chargeId
    ? await stripe.charges.retrieve(chargeId)
    : object as unknown as Stripe.Charge;
  const paymentIntent = "payment_intent" in charge && typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : null;
  const invoiceId = "invoice" in charge
    ? typeof (charge as unknown as { invoice?: string | { id: string } | null }).invoice === "string"
      ? (charge as unknown as { invoice: string }).invoice
      : (charge as unknown as { invoice?: { id: string } | null }).invoice?.id ?? null
    : null;
  const order = paymentIntent || invoiceId
    ? (await sql<{ id: string; total: string | number }>`
        select id, total from store_orders
        where payment_ref = ${paymentIntent} or stripe_invoice_id = ${invoiceId}
        limit 1
      `)[0]
    : null;
  const amount = "amount_refunded" in charge
    ? Number(charge.amount_refunded ?? 0) / 100
    : Number((charge as unknown as { amount?: number }).amount ?? 0) / 100;
  const kind = type.startsWith("charge.refund") ? "refund" : "dispute";
  await sql`
    insert into payment_adjustments
      (event_id, object_id, order_id, kind, amount, currency, status)
    values (
      ${eventId}, ${objectIdValue}, ${order?.id ?? null}, ${kind},
      ${Number.isFinite(amount) ? amount : 0},
      ${"currency" in charge ? String(charge.currency ?? "usd") : "usd"},
      ${type === "charge.dispute.closed" ? "closed" : "open"}
    )
    on conflict (kind, object_id) do update set
      status = excluded.status,
      amount = excluded.amount,
      currency = excluded.currency
  `;
  if (order?.id) {
    await sql`
      update store_orders
      set payment_hold = true,
        refund_total = case when ${kind} = 'refund'
          then coalesce((select sum(amount) from payment_adjustments where order_id = ${order.id} and kind = 'refund'), 0)
          else refund_total end,
        dispute_status = case when ${kind} = 'dispute' then ${type === "charge.dispute.closed" ? "closed" : "open"} else dispute_status end,
        updated_at = now()
      where id = ${order.id}
    `;
    await sql`
      insert into store_order_events (order_id, kind, note)
      select ${order.id}, ${`stripe_${kind}`}, ${`Payment ${kind} requires review (${objectIdValue}).`}
      where not exists (
        select 1 from store_order_events
        where order_id = ${order.id}
          and kind = ${`stripe_${kind}`}
          and note = ${`Payment ${kind} requires review (${objectIdValue}).`}
      )
    `;
  }
}

export async function heartbeatWorker(sql: Sql, worker: string, success = true, error?: string, count = 0) {
  await sql`
    insert into worker_heartbeats (worker, last_seen_at, last_success_at, last_error, processed_count)
    values (${worker}, now(), ${success ? new Date() : null}, ${error?.slice(0, 500) ?? null}, ${count})
    on conflict (worker) do update set
      last_seen_at = now(),
      last_success_at = case when ${success} then now() else worker_heartbeats.last_success_at end,
      last_error = ${error?.slice(0, 500) ?? null},
      processed_count = worker_heartbeats.processed_count + ${count}
  `;
}