import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { test } from "node:test";
import type { Sql } from "../src/lib/db";
import { settleOrder, settleStripeSession } from "../src/lib/checkout/settle.server";
import { flushOrderEmails } from "../src/lib/checkout/notify.server";
import {
  createSubscriptionCheckoutServer,
  type SubscriptionInput,
} from "../src/lib/subscriptions.server";
import {
  dispatchStripeEvent,
  enqueueStripeEvent,
} from "../src/lib/stripe-events.server";

function sqlFor(client: pg.ClientBase): Sql {
  const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
      text += `$${index + 1}${strings[index + 1] ?? ""}`;
    }
    const result = await client.query(text, values);
    return result.rows as T[];
  }) as Sql;
  sql.query = async <T>(text: string, params: unknown[] = []) =>
    (await client.query(text, params)).rows as T[];
  return sql;
}

function skipInProduction(context: { skip: (reason?: string) => void }) {
  if (!process.env.DATABASE_URL) {
    context.skip("requires a development DATABASE_URL");
    return true;
  }
  if (
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_ENVIRONMENT === "production"
  ) {
    context.skip("database-backed payment tests refuse production environments");
    return true;
  }
  return false;
}

async function withDatabase(
  context: { skip: (reason?: string) => void },
  callback: (client: pg.PoolClient, sql: Sql, marker: string) => Promise<void>,
) {
  if (skipInProduction(context)) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();
  const marker = `payment-integrity-${randomUUID()}`;
  try {
    await callback(client, sqlFor(client), marker);
  } finally {
    await client.query(
      `delete from payment_adjustments
       where event_id like $1
          or object_id like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from stripe_event_ledger where id like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from store_order_emails
       where order_id in (select id from store_orders where id like $1)`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from store_order_events
       where order_id like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from store_events where meta like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from store_orders where id like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    await client.query(
      `delete from store_subscriptions where id like $1`,
      [`${marker}%`],
    ).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

async function insertOrder(
  client: pg.PoolClient,
  id: string,
  options: {
    total?: number;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    accessKeyExpiresAt?: string;
  } = {},
) {
  await client.query(
    `insert into store_orders (
       id, reference, access_key, email, first_name, last_name, address, city,
       postal, country, subtotal, shipping, total, items, status,
       payment_method, payment_status, access_key_expires_at
     ) values (
       $1, $2, $3, $4, 'Payment', 'Test', '1 Test Way', 'Test City',
       '00000', 'United States', $5, 0, $5, '[]', $6, $7, $8, $9
     )`,
    [
      id,
      `VS-${id.slice(-6).toUpperCase()}`,
      `${id}-access`,
      `${id}@example.test`,
      options.total ?? 12.34,
      options.status ?? "pending_payment",
      options.paymentMethod ?? "stripe",
      options.paymentStatus ?? "unpaid",
      options.accessKeyExpiresAt ?? "2000-01-01T00:00:00.000Z",
    ],
  );
}

test("Stripe replay settles once and preserves the first payment ledger identity", async (context) => {
  await withDatabase(context, async (client, sql, marker) => {
    const orderId = `${marker}-order`;
    const eventId = `${marker}-event`;
    const objectId = `${marker}-checkout`;
    await insertOrder(client, orderId);

    const event = {
      id: eventId,
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: { id: objectId } },
    } as never;

    assert.equal(await enqueueStripeEvent(sql, event), true);
    assert.equal(await enqueueStripeEvent(sql, event), false);

    const ledger = await client.query(
      `select id, object_id from stripe_event_ledger where id = $1`,
      [eventId],
    );
    assert.deepEqual(ledger.rows, [{ id: eventId, object_id: objectId }]);

    const noOpNotify = async () => undefined;
    const first = await settleOrder(
      orderId,
      { paymentRef: `${marker}-payment-intent` },
      { notifyOrder: noOpNotify },
    );
    const replay = await settleOrder(
      orderId,
      { paymentRef: `${marker}-replay-ref` },
      { notifyOrder: noOpNotify },
    );
    assert.equal(first.alreadyPaid, false);
    assert.equal(replay.alreadyPaid, true);

    const order = await client.query(
      `select payment_status, payment_ref from store_orders where id = $1`,
      [orderId],
    );
    assert.deepEqual(order.rows, [{
      payment_status: "paid",
      payment_ref: `${marker}-payment-intent`,
    }]);

    const paidEvents = await client.query(
      `select count(*)::int as count from store_order_events
       where order_id = $1 and kind = 'paid'`,
      [orderId],
    );
    const outbox = await client.query(
      `select count(*)::int as count from store_order_emails where order_id = $1`,
      [orderId],
    );
    assert.equal(paidEvents.rows[0].count, 1);
    assert.equal(outbox.rows[0].count, 3);
  });
});

test("invoice customer, currency, and amount mismatches leave the subscription cycle untouched", async (context) => {
  await withDatabase(context, async (client, sql, marker) => {
    const subscriptionId = `${marker}-subscription`;
    await client.query(
      `insert into store_subscriptions (
         id, email, first_name, last_name, address, city, postal, country,
         product_id, dose, qty, cadence, items, subtotal, shipping, total,
         status, stripe_subscription_id, stripe_customer_id, next_cycle
       ) values (
         $1, $2, 'Payment', 'Test', '1 Test Way', 'Test City', '00000',
         'United States', 'vial-compounds__semaglutide', '5mg', 1, 'monthly',
         '[]'::jsonb, 10, 2.34, 12.34, 'active', $3, $4, 1
       )`,
      [
        subscriptionId,
        `${subscriptionId}@example.test`,
        `${marker}-stripe-subscription`,
        `${marker}-stripe-customer`,
      ],
    );

    const invoices = new Map<string, Record<string, unknown>>();
    const stripe = {
      invoices: {
        retrieve: async (id: string) => invoices.get(id),
      },
    } as never;

    const cases = [
      {
        name: "customer",
        invoice: {
          customer: `${marker}-wrong-customer`,
          currency: "usd",
          amount_paid: 1234,
        },
        message: /Invoice customer does not match/,
      },
      {
        name: "currency",
        invoice: {
          customer: `${marker}-stripe-customer`,
          currency: "eur",
          amount_paid: 1234,
        },
        message: /Invoice amount or currency does not match/,
      },
      {
        name: "amount",
        invoice: {
          customer: `${marker}-stripe-customer`,
          currency: "usd",
          amount_paid: 1235,
        },
        message: /Invoice amount or currency does not match/,
      },
    ] as const;

    for (const scenario of cases) {
      const invoiceId = `${marker}-invoice-${scenario.name}`;
      invoices.set(invoiceId, {
        id: invoiceId,
        status: "paid",
        paid: true,
        subscription: `${marker}-stripe-subscription`,
        ...scenario.invoice,
      });
      await assert.rejects(
        dispatchStripeEvent(sql, `${marker}-ledger-${scenario.name}`, "invoice.paid", invoiceId, null, stripe),
        scenario.message,
      );
    }

    const subscription = await client.query(
      `select status, next_cycle, stripe_subscription_id from store_subscriptions where id = $1`,
      [subscriptionId],
    );
    const orders = await client.query(
      `select count(*)::int as count from store_orders where subscription_id = $1`,
      [subscriptionId],
    );
    assert.deepEqual(subscription.rows, [{
      status: "active",
      next_cycle: 1,
      stripe_subscription_id: `${marker}-stripe-subscription`,
    }]);
    assert.equal(orders.rows[0].count, 0);
  });
});

test("subscription checkout retries reuse the durable record and Stripe request key", async (context) => {
  await withDatabase(context, async (client, _sql, marker) => {
    const idempotencyKey = `${marker}-request`;
    const created: Array<{ idempotencyKey?: string }> = [];
    let retrieved = 0;
    const stripe = {
      checkout: {
        sessions: {
          create: async (_params: unknown, options: { idempotencyKey?: string }) => {
            created.push(options);
            return { id: `${marker}-session`, url: `https://checkout.stripe.test/${marker}` };
          },
          retrieve: async () => {
            retrieved += 1;
            return { id: `${marker}-session`, url: `https://checkout.stripe.test/${marker}` };
          },
        },
      },
    } as never;
    const input: SubscriptionInput = {
      productId: "vial-compounds__semaglutide",
      dose: "5mg",
      qty: 1,
      cadence: "monthly",
      email: `${marker}@example.test`,
      firstName: "Payment",
      lastName: "Test",
      address: "1 Test Way",
      city: "Test City",
      region: "CA",
      postal: "00000",
      country: "United States",
      origin: "https://vitalitychems.com",
      idempotencyKey,
      researchAttestation: true,
    };

    const first = await createSubscriptionCheckoutServer(input, { stripe });
    const second = await createSubscriptionCheckoutServer(input, { stripe });

    assert.equal(first.id, second.id);
    assert.equal(first.url, second.url);
    assert.equal(created.length, 1);
    assert.deepEqual(created[0], {
      idempotencyKey: `subscription-checkout-${idempotencyKey}`,
    });
    assert.equal(retrieved, 1);

    const rows = await client.query(
      `select id, client_idempotency_key, stripe_session_id
       from store_subscriptions where client_idempotency_key = $1`,
      [idempotencyKey],
    );
    assert.deepEqual(rows.rows, [{
      id: first.id,
      client_idempotency_key: idempotencyKey,
      stripe_session_id: `${marker}-session`,
    }]);
  });
});

test("expired order links and dead outbox rows never send mail", async (context) => {
  await withDatabase(context, async (client, sql, marker) => {
    const orderId = `${marker}-order`;
    await insertOrder(client, orderId, { accessKeyExpiresAt: "2000-01-01T00:00:00.000Z" });
    const inserted = await client.query(
      `insert into store_order_emails (order_id, kind, status, attempts)
       values ($1, 'pending', 'queued', 0), ($1, 'paid', 'dead', 8)
       returning id, kind`,
      [orderId],
    );
    const sent: unknown[] = [];
    const result = await flushOrderEmails(
      sql,
      { limit: 10, orderId },
      {
        emailConfigured: async () => true,
        sendEmail: async (message) => {
          sent.push(message);
        },
      },
    );

    assert.equal(result.sent, 0);
    assert.equal(result.failed, 0);
    assert.equal(result.skipped, 1);
    assert.equal(sent.length, 0);

    const rows = await client.query(
      `select kind, status, sent_at is not null as has_sent_at
       from store_order_emails where order_id = $1 order by kind`,
      [orderId],
    );
    assert.deepEqual(rows.rows, [
      { kind: "paid", status: "dead", has_sent_at: false },
      { kind: "pending", status: "skipped", has_sent_at: true },
    ]);
    assert.equal(inserted.rows.length, 2);
  });
});