/**
 * Customer order notifications through a durable outbox (store_order_emails).
 *
 * `notifyOrder` records one row per (order, kind) and tries to deliver it right away;
 * a mail failure, an unverified sender domain, or a Resend outage leaves the row queued
 * and never fails the checkout / settlement / shipping action that triggered it.
 * `flushOrderEmails` retries queued rows (called when staff open Orders, press
 * "Send queued emails", or a sender domain becomes verified). Each row is claimed
 * atomically before sending and the order's current state is re-checked, so a late
 * "pending" email is dropped once the order is paid or cancelled and nothing sends twice.
 */
import type { Sql } from "@/lib/db";
import type { OutboundEmail } from "@/lib/newsletter/email.server";
import { serverSiteUrl } from "@/lib/site-url";
import {
  orderPaidTemplate, orderPendingTemplate, orderShippedTemplate,
  ownerProfitTemplate, researchFollowupTemplate, supplierOrderTemplate,
  type FollowupRecommendation, type ManualPaymentInstructions, type OrderEmailOrder,
  type ProfitEmailLine, type SupplierEmailLine,
} from "./order-emails";
import { findProduct, PRODUCTS } from "@/lib/catalog";
import { supplierStandardCost } from "@/lib/supplier-sheet";

export type OrderNotification = "pending" | "paid" | "shipped" | "supplier" | "owner" | "research_followup";
const KINDS: OrderNotification[] = ["pending", "paid", "shipped", "supplier", "owner", "research_followup"];
const LEASE_MINUTES = 10;
const MAX_BACKOFF_SECONDS = 6 * 60 * 60;
const MAX_ATTEMPTS = 8;

export type OrderEmailDeliveryDependencies = {
  emailConfigured?: () => Promise<boolean>;
  sendEmail?: (message: OutboundEmail) => Promise<void>;
};

type OrderRow = {
  id: string; reference: string; access_key: string; email: string; first_name: string;
  status: string; payment_status: string;
  items: string | unknown[]; subtotal: string | number; shipping: string | number;
  sales_tax: string | number; tax_rate: string | number; discount: string | number;
  credit_applied: string | number; credit_earned: string | number; total: string | number;
  payment_method: string; tracking: string | null;
  last_name: string; lab: string | null; phone: string | null;
  address: string; city: string; region: string | null; postal: string; country: string;
  paid_at: string | null;
  affiliate_commission: string | number | null;
  btc_address: string | null; btc_amount: string | number | null; btc_quote_expires_at: string | null;
  access_key_expires_at: string | null; access_key_revoked_at: string | null;
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Queue a notification (idempotent per order + kind). The outbox insert is awaited so
 * the intent is durable before the caller responds; delivery itself runs detached.
 */
export async function notifyOrder(kind: OrderNotification, orderId: string) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into store_order_emails (order_id, kind) values (${orderId}, ${kind})
      on conflict (order_id, kind) do nothing
      returning id
    `;
    const outboxId = rows[0]?.id ?? (await sql<{ id: number }>`
      select id from store_order_emails
      where order_id = ${orderId} and kind = ${kind} and sent_at is null
      limit 1
    `)[0]?.id;
    if (!outboxId) return;
    void deliver(sql, outboxId).catch((error: unknown) =>
      console.error(`[email] ${kind} delivery crashed for order ${orderId}:`, messageOf(error)));
  } catch (error) {
    console.error(`[email] could not queue ${kind} notification for order ${orderId}:`, messageOf(error));
  }
}

/** Retry queued notifications. Returns counts so admin actions can report progress. */
export async function flushOrderEmails(
  sql: Sql,
  options: { limit?: number; force?: boolean; orderId?: string } = {},
  dependencies: OrderEmailDeliveryDependencies = {},
) {
  const limit = options.limit ?? 25;
  const { emailConfigured } = await import("@/lib/newsletter/email.server");
  const pending = await sql<{ id: number }>`
    select id from store_order_emails
    where sent_at is null
      and coalesce(status, 'queued') not in ('dead', 'skipped', 'sent')
      and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
      and (${options.force ? true : false} or next_attempt_at is null or next_attempt_at <= now())
      and (${options.orderId ?? null}::text is null or order_id = ${options.orderId ?? null})
    order by created_at limit ${limit}
  `;
  const configured = dependencies.emailConfigured ?? emailConfigured;
  if (pending.length === 0 || !(await configured())) return { sent: 0, failed: 0, skipped: 0, queued: pending.length };
  const result = { sent: 0, failed: 0, skipped: 0, queued: 0 };
  for (const row of pending) {
    const outcome = await deliver(sql, row.id, { force: options.force }, dependencies);
    if (outcome === "sent") result.sent++;
    else if (outcome === "failed") result.failed++;
    else if (outcome === "skipped") result.skipped++;
  }
  return result;
}

export async function queuedOrderEmailCount(sql: Sql) {
  return (await orderEmailQueueSnapshot(sql)).queued;
}

export async function orderEmailQueueSnapshot(sql: Sql) {
  const rows = await sql<{
    queued: number;
    failed: number;
    oldest_created_at: string | null;
  }>`
    select
      count(*) filter (where sent_at is null and coalesce(status, 'queued') not in ('sent', 'skipped'))::int as queued,
      count(*) filter (where sent_at is null and status = 'failed')::int as failed,
      min(created_at) filter (where sent_at is null and coalesce(status, 'queued') not in ('sent', 'skipped')) as oldest_created_at
    from store_order_emails
  `;
  return {
    queued: rows[0]?.queued ?? 0,
    failed: rows[0]?.failed ?? 0,
    oldestCreatedAt: rows[0]?.oldest_created_at ?? null,
  };
}

type DeliveryOutcome = "sent" | "failed" | "skipped" | "busy" | "not_ready";

async function deliver(
  sql: Sql,
  outboxId: number,
  options: { force?: boolean } = {},
  dependencies: OrderEmailDeliveryDependencies = {},
): Promise<DeliveryOutcome> {
  const { emailConfigured, sendEmail } = await import("@/lib/newsletter/email.server");
  const configured = dependencies.emailConfigured ?? emailConfigured;
  const send = dependencies.sendEmail ?? sendEmail;
  if (!(await configured())) return "not_ready";

  // Claim the row: only one worker may attempt a given notification at a time.
  const claimed = await sql<{ id: number; order_id: string; kind: string }>`
    update store_order_emails
    set status = 'sending',
      attempts = attempts + 1,
      last_attempt_at = now(),
      lease_expires_at = now() + (${LEASE_MINUTES} * interval '1 minute'),
      updated_at = now()
    where id = ${outboxId}
      and sent_at is null
      and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
      and (${options.force ? true : false} or next_attempt_at is null or next_attempt_at <= now())
    returning id, order_id, kind
  `;
  const job = claimed[0];
  if (!job || !KINDS.includes(job.kind as OrderNotification)) return "busy";
  const kind = job.kind as OrderNotification;

  try {
    const orderRows = await sql<OrderRow>`
      select id, reference, access_key, email, first_name, last_name, lab, phone,
        address, city, region, postal, country, status, payment_status, items, subtotal,
        shipping, sales_tax, tax_rate, discount, credit_applied, credit_earned, total,
        paid_at, payment_method, tracking, affiliate_commission,
        btc_address, btc_amount, btc_quote_expires_at,
        access_key_expires_at, access_key_revoked_at
      from store_orders where id = ${job.order_id} limit 1
    `;
    const row = orderRows[0];
    const message = row ? await buildMessage(sql, kind, row) : null;
    if (!message) {
      // Order state moved on (paid/cancelled before the pending mail went out, etc.):
      // resolve the row so it is never retried.
      await sql`
        update store_order_emails set status = 'skipped', sent_at = now(),
          lease_expires_at = null, next_attempt_at = null,
          last_error = ${row ? `order state ${row.status}/${row.payment_status} no longer needs a ${kind} email` : "order not found"},
          updated_at = now()
        where id = ${job.id}
      `;
      return "skipped";
    }
    await send(message);
    await sql`
      update store_order_emails set status = 'sent', sent_at = now(), lease_expires_at = null,
        next_attempt_at = null, last_error = null, updated_at = now()
      where id = ${job.id}
    `;
    await sql`insert into store_order_events (order_id, kind, note) values (${job.order_id}, ${`email_${kind}`}, ${"notification sent"})`;
    return "sent";
  } catch (error) {
    const reason = messageOf(error).slice(0, 500);
    console.error(`[email] ${kind} notification failed for order ${job.order_id}:`, reason);
    // The attempt count is incremented by the claim. Read it only for the
    // backoff calculation so a failed row remains eligible indefinitely.
    const attempts = await sql<{ attempts: number }>`
      select attempts from store_order_emails where id = ${job.id}
    `.catch(() => []);
    const delay = Math.min(
      MAX_BACKOFF_SECONDS,
      60 * Math.pow(2, Math.max(0, Number(attempts[0]?.attempts ?? 1) - 1)),
    );
    await sql`
      update store_order_emails set status = case when attempts >= ${MAX_ATTEMPTS} then 'dead' else 'failed' end,
        last_error = ${reason},
        lease_expires_at = null,
        next_attempt_at = case when attempts >= ${MAX_ATTEMPTS} then null else now() + (${delay} * interval '1 second') end,
        updated_at = now()
      where id = ${job.id}
    `.catch(() => undefined);
    return "failed";
  }
}

async function buildMessage(sql: Sql, kind: OrderNotification, row: OrderRow) {
  if (row.status === "cancelled") return null;
  if (kind === "pending" && row.payment_status === "paid") return null;
  if (["paid", "supplier", "owner", "research_followup"].includes(kind) && row.payment_status !== "paid") return null;
  if (kind === "shipped" && row.status !== "shipped") return null;
  if (kind === "supplier" || kind === "owner") {
    // These are internal fulfillment/accounting notices and are sent only once
    // Stripe/manual settlement has committed.
    if (row.payment_status !== "paid") return null;
  }

  const items = parseLines(row.items);
  if (!row.access_key_expires_at || row.access_key_revoked_at || Date.parse(row.access_key_expires_at) <= Date.now()) {
    return null;
  }
  const order: OrderEmailOrder = {
    reference: row.reference,
    firstName: row.first_name || "there",
    lastName: row.last_name,
    lab: row.lab,
    phone: row.phone,
    address: row.address,
    city: row.city,
    region: row.region,
    postal: row.postal,
    country: row.country,
    url: `${serverSiteUrl()}/order/${row.id}?k=${row.access_key}`,
    lines: items,
    subtotal: num(row.subtotal), shipping: num(row.shipping), discount: num(row.discount),
    salesTax: num(row.sales_tax), taxRate: num(row.tax_rate),
    creditApplied: num(row.credit_applied), creditEarned: num(row.credit_earned),
    affiliateCommission: num(row.affiliate_commission), total: num(row.total),
    paymentMethod: row.payment_method,
  };
  if (kind === "pending") {
    const instructions = await manualInstructions(sql, row);
    return instructions ? { to: row.email, ...orderPendingTemplate(order, instructions) } : null;
  }
  if (kind === "paid") return { to: row.email, ...orderPaidTemplate(order) };
  if (kind === "shipped") return { to: row.email, ...orderShippedTemplate(order, row.tracking) };
  if (kind === "supplier") {
    const settings = await notificationSettings(sql);
    const lines = supplierLines(order);
    return { to: settings.supplierEmail, ...supplierOrderTemplate(order, lines, settings.supplierEmail) };
  }
  if (kind === "owner") {
    const settings = await notificationSettings(sql);
    const lines = profitLines(order);
    return { to: settings.ownerEmail, ...ownerProfitTemplate(order, lines, settings.incomeTaxReservePercent, settings.ownerEmail) };
  }
  const subscriber = await sql<{ unsubscribe_token: string }>`
    select unsubscribe_token
    from store_subscribers
    where lower(email) = lower(${row.email})
      and confirmed_at is not null
      and unsubscribed_at is null
    order by created_at desc limit 1
  `;
  if (!subscriber[0] || !row.paid_at || Date.parse(row.paid_at) > Date.now() - 28 * 24 * 60 * 60 * 1000) return null;
  const recommendations = await coPurchaseRecommendations(sql, items);
  const unsubscribeUrl = `${serverSiteUrl()}/unsubscribe?token=${encodeURIComponent(subscriber[0].unsubscribe_token)}`;
  return { to: row.email, ...researchFollowupTemplate(order, recommendations, unsubscribeUrl) };
}

function parseLines(value: string | unknown[]): OrderEmailOrder["lines"] {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Record<string, unknown>;
    const name = String(line.name ?? "").trim();
    const dose = String(line.dose ?? "").trim();
    const productId = String(line.productId ?? "").trim() || undefined;
    const qty = Math.trunc(Number(line.qty));
    const lineCents = Math.round(Number(line.lineCents));
    return name && dose && Number.isSafeInteger(qty) && qty > 0 && Number.isFinite(lineCents)
      ? [{ productId, name, dose, qty, lineCents }]
      : [];
  });
}

function supplierLines(order: OrderEmailOrder): SupplierEmailLine[] {
  return order.lines.map((line) => {
    const product = findProductByName(line.name);
    const unit = product ? supplierStandardCost(product.name, line.dose) : null;
    const unitCostCents = unit == null ? null : Math.round(unit * 100);
    return { ...line, unitCostCents, totalCostCents: unitCostCents == null ? null : unitCostCents * line.qty };
  });
}

function profitLines(order: OrderEmailOrder): ProfitEmailLine[] {
  const supplier = supplierLines(order);
  const subtotalCents = Math.max(0, Math.round(order.subtotal * 100));
  const merchandiseCents = Math.max(0, Math.round((order.subtotal - order.discount) * 100));
  const creditCents = Math.max(0, Math.round(order.creditApplied * 100));
  let allocated = 0;
  return supplier.map((line, index) => {
    const isLast = index === supplier.length - 1;
    const proportional = isLast
      ? Math.max(0, merchandiseCents - allocated)
      : subtotalCents > 0
        ? Math.round(line.lineCents / subtotalCents * merchandiseCents)
        : 0;
    allocated += proportional;
    const credit = isLast
      ? Math.max(0, creditCents - Math.min(creditCents, Math.max(0, allocated - proportional)))
      : subtotalCents > 0 ? Math.round(line.lineCents / subtotalCents * creditCents) : 0;
    const revenueCents = Math.max(0, proportional - credit);
    return {
      ...line,
      revenueCents,
      profitCents: line.totalCostCents == null ? null : revenueCents - line.totalCostCents,
    };
  });
}

function findProductByName(name: string) {
  return PRODUCTS.find((product) => product.name === name) ??
    PRODUCTS.find((product) => product.name.toLowerCase() === name.toLowerCase()) ??
    findProduct(name);
}

async function notificationSettings(sql: Sql) {
  const rows = await sql<{ key: string; value: string }>`
    select key, value from store_settings
    where key in ('supplier_email', 'owner_notification_email', 'income_tax_reserve_percent')
  `;
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    supplierEmail: values.supplier_email?.trim() || "Apex.nutrition2021@gmail.com",
    ownerEmail: values.owner_notification_email?.trim() || "vitalitychems@gmail.com",
    incomeTaxReservePercent: Number.isFinite(Number(values.income_tax_reserve_percent))
      ? Math.max(0, Math.min(100, Number(values.income_tax_reserve_percent)))
      : null,
  };
}

async function coPurchaseRecommendations(sql: Sql, lines: OrderEmailOrder["lines"]): Promise<FollowupRecommendation[]> {
  const productNames = lines.map((line) => line.name);
  if (!productNames.length) return [];
  const rows = await sql<{ product_name: string; count: number }>`
    select coalesce(e2.product_name, e2.product_id) as product_name,
      count(distinct e2.meta)::int as count
    from store_events e1
    join store_events e2 on e2.meta = e1.meta
    where e1.event = 'purchase' and e2.event = 'purchase'
      and e1.product_name = any(${productNames})
      and e2.product_name is not null
      and not (e2.product_name = any(${productNames}))
      and e1.meta is not null
      and e2.meta is not null
    group by e2.product_name, e2.product_id
    having count(distinct e2.meta) >= 3
    order by count(distinct e2.meta) desc
    limit 5
  `;
  return rows.map((row, index) => ({
    name: row.product_name,
    count: Number(row.count),
    kind: index === 0 ? "co-purchase" : index === 1 ? "bundle" : "deal",
  }));
}

/**
 * Create four-week follow-up rows only once the message is due and only for
 * confirmed, subscribed customers. Marketing is never sent to a buyer merely
 * because they placed an order.
 */
export async function enqueueDueResearchFollowups(sql: Sql, limit = 100) {
  const rows = await sql<{ id: string }>`
    select o.id
    from store_orders o
    join store_subscribers s on lower(s.email) = lower(o.email)
      and s.confirmed_at is not null and s.unsubscribed_at is null
    where o.payment_status = 'paid'
      and o.status <> 'cancelled'
      and o.paid_at <= now() - interval '28 days'
      and not exists (
        select 1 from store_order_emails e
        where e.order_id = o.id and e.kind = 'research_followup'
      )
    order by o.paid_at
    limit ${limit}
  `;
  for (const row of rows) {
    await sql`
      insert into store_order_emails (order_id, kind)
      values (${row.id}, 'research_followup')
      on conflict (order_id, kind) do nothing
    `;
  }
  return rows.length;
}

async function manualInstructions(sql: Sql, row: OrderRow): Promise<ManualPaymentInstructions | null> {
  if (row.payment_method === "bitcoin" || row.payment_method === "ethereum") {
    return row.btc_address && row.btc_amount != null
      ? { method: row.payment_method, address: row.btc_address, amount: String(row.btc_amount), expiresAt: row.btc_quote_expires_at }
      : null;
  }
  if (row.payment_method !== "zelle") return null;
  const settings = await sql<{ key: string; value: string }>`
    select key, value from store_settings where key in ('zelle_recipient', 'zelle_display_name')
  `;
  const values = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return values.zelle_recipient
    ? { method: "zelle", recipient: values.zelle_recipient, displayName: values.zelle_display_name ?? null }
    : null;
}
