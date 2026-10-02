import type { Sql } from "@/lib/db";
import { canonicalReferralEmail, isEmail } from "./validation";

export const STALE_STRIPE_CHECKOUT_AGE_MS = 24 * 60 * 60 * 1000;

export type StaleStripeAction = "ignore" | "settle" | "expire" | "cancel";

/**
 * Decide the only safe stale-checkout action. Manual payment methods never
 * expire from age because a transfer can be in flight outside our system.
 */
export function staleStripeAction(input: {
  paymentMethod: string;
  sessionStatus: string;
  createdAt: string | number | Date;
  now?: number;
}): StaleStripeAction {
  if (input.paymentMethod !== "stripe") return "ignore";
  if (new Date(input.createdAt).getTime() > (input.now ?? Date.now()) - STALE_STRIPE_CHECKOUT_AGE_MS) {
    return "ignore";
  }
  if (input.sessionStatus === "complete") return "settle";
  if (input.sessionStatus === "expired") return "cancel";
  if (input.sessionStatus === "open") return "expire";
  return "ignore";
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type PaidOrder = {
  id: string; reference: string; email: string; user_id: string | null;
  credit_earned: string | number; promo_code: string | null; total: string | number;
  subtotal: string | number; discount: string | number;
  affiliate_owner_id: string | null; affiliate_commission_rate: string | number;
  affiliate_commission: string | number;
  items: unknown; analytics_session_id: string | null;
};

/** Bounded printable text (no control characters, which Postgres text rejects). */
function printable(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function normalizedManualReference(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase().slice(0, 200);
}

/** Order lines as stored at checkout (`quote.lines` JSON); tolerant of bad rows. */
function paidLines(items: unknown): { productId: string; name: string }[] {
  let raw: unknown = items;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const lines: { productId: string; name: string }[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const productId = printable((entry as { productId?: unknown }).productId, 120);
    const name = printable((entry as { name?: unknown }).name, 120);
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    lines.push({ productId, name: name || productId });
  }
  return lines;
}

/**
 * Mark an order paid and apply every financial side effect (reward credit, promo
 * redemption, affiliate commission, paid event) in ONE transaction.
 *
 * Idempotent under concurrency: the `update ... where payment_status <> 'paid'` row lock
 * serialises callers; whoever loses sees zero rows and returns `alreadyPaid` without
 * touching credits. Unique indexes (migration 0011) back this up at the database level.
 */
export type SettlementDependencies = {
  notifyOrder?: (kind: "paid" | "supplier" | "owner", orderId: string) => Promise<void>;
};

export async function settleOrder(
  orderId: string,
  input: { paymentRef?: string | null } = {},
  dependencies: SettlementDependencies = {},
) {
  const { withTransaction } = await import("@/lib/db");
  const settled = await withTransaction(async (tx) => {
    // Checkout referral eligibility locks the canonical Better Auth user row
    // before it checks paid history. Settlement takes the same lock first so a
    // payment racing a first referral checkout cannot become invisible until
    // after that checkout reserves its identity.
    const currentRows = await tx<{ user_id: string | null; payment_method: string }>`
      select user_id, payment_method from store_orders where id = ${orderId} limit 1
    `;
    const current = currentRows[0];
    if (!current) throw new Error("Order not found.");
    if (current.user_id) {
      await tx`select id from "user" where id = ${current.user_id} for update`;
    }
    const manualMethod = ["zelle", "bitcoin", "ethereum"].includes(current.payment_method);
    const paymentRef = input.paymentRef
      ? manualMethod
        ? normalizedManualReference(input.paymentRef)
        : input.paymentRef.trim()
      : null;
    if (paymentRef && manualMethod) {
      const reused = await tx<{ id: string }>`
        select id from store_orders
        where id <> ${orderId}
          and payment_status = 'paid'
          and payment_method in ('zelle', 'bitcoin', 'ethereum')
          and lower(regexp_replace(payment_ref, '\\s+', '', 'g')) = ${paymentRef}
        limit 1
      `;
      if (reused[0]) throw new Error("That payment reference has already been used for a paid order.");
    }
    const paid = await tx<PaidOrder>`
      update store_orders set
        payment_status = 'paid', status = 'paid', paid_at = now(), updated_at = now(),
        payment_ref = coalesce(${paymentRef}, payment_ref)
      where id = ${orderId} and payment_status <> 'paid' and status <> 'cancelled'
      returning id, reference, email, user_id, credit_earned, promo_code, total, subtotal, discount,
        affiliate_owner_id, affiliate_commission_rate, affiliate_commission,
        items, analytics_session_id
    `;
    const order = paid[0];
    if (!order) {
      const exists = await tx<{ status: string; payment_status: string }>`
        select status, payment_status from store_orders where id = ${orderId} limit 1
      `;
      if (!exists[0]) throw new Error("Order not found.");
      if (exists[0].payment_status !== "paid") {
        throw new Error("This order was cancelled and cannot be marked paid. Create a new order instead.");
      }
      return null;
    }
    if (order.user_id && n(order.credit_earned) > 0) {
      await addCreditOnce(tx, order.user_id, order.email, order.id, n(order.credit_earned), "Order reward");
    }
    if (order.promo_code) {
      const promos = await tx<{
        first_order_only: boolean;
      }>`
        select first_order_only
        from promo_codes where code = ${order.promo_code} limit 1
      `;
      const promo = promos[0];
      const merchandise = Math.max(0, n(order.subtotal) - n(order.discount));
      // Affiliate owner, rate, and commission are immutable order snapshots
      // captured at checkout. Never re-read mutable promo economics here.
      const commissionRate = n(order.affiliate_commission_rate);
      const commission = order.affiliate_owner_id && commissionRate > 0 ? n(order.affiliate_commission) : 0;
      const affiliateOwner = order.affiliate_owner_id
        ? (await tx<{ email: string | null }>`
            select email from "user" where id = ${order.affiliate_owner_id}
          `)[0]
        : null;
      const isSelfAffiliate = Boolean(
        order.affiliate_owner_id &&
        (order.affiliate_owner_id === order.user_id ||
          (affiliateOwner?.email && isEmail(affiliateOwner.email.trim().toLowerCase()) &&
            isEmail(order.email.trim().toLowerCase()) &&
            canonicalReferralEmail(affiliateOwner.email) === canonicalReferralEmail(order.email))),
      );
      const payableCommission = isSelfAffiliate ? 0 : commission;
      const reservation = promo?.first_order_only
        ? await tx<{ customer_identity: string }>`
            update store_promo_reservations
            set status = 'settled', settled_at = now()
            where order_id = ${order.id} and code = ${order.promo_code} and status = 'pending'
            returning customer_identity
          `
        : [];
      const inserted = await tx<{ id: number }>`
        insert into promo_redemptions
          (code, order_id, email, amount, order_total, merch, commission, first_order_identity)
        values (${order.promo_code}, ${order.id}, ${order.email}, ${n(order.discount)},
          ${n(order.total)}, ${merchandise}, ${payableCommission},
          ${reservation[0]?.customer_identity ?? null})
        on conflict (order_id) do nothing
        returning id
      `;
      if (inserted[0] && order.affiliate_owner_id && payableCommission > 0) {
        await addCreditOnce(tx, order.affiliate_owner_id, null, order.id, payableCommission, "Affiliate commission");
      }
    }
    const referralRows = await tx<{
      referrer_id: string;
      reward: string | number;
    }>`
      update store_referral_rewards
      set status = 'settled', settled_at = now()
      where order_id = ${order.id} and status = 'pending'
      returning referrer_id, reward
    `;
    const referral = referralRows[0];
    if (referral && n(referral.reward) > 0) {
      await addCreditOnce(
        tx,
        referral.referrer_id,
        null,
        order.id,
        n(referral.reward),
        "Customer referral reward",
      );
    }
    await tx`
      insert into store_order_events (order_id, kind, note)
      values (${order.id}, 'paid', ${input.paymentRef ?? null})
      on conflict (order_id) where kind = 'paid' do nothing
    `;
    await tx`
      insert into store_order_emails (order_id, kind)
      values
        (${order.id}, 'paid'),
        (${order.id}, 'supplier'),
        (${order.id}, 'owner')
      on conflict (order_id, kind) do nothing
    `;
    return order;
  });
  if (!settled) return { ok: true as const, alreadyPaid: true };
  // Analytics run AFTER the money has committed: a failed funnel insert must
  // never roll back a paid order. Only the winning settlement reaches this
  // point, and the unique purchase index keeps any retry idempotent.
  await recordPurchaseEvents(settled).catch((error) => {
    console.error(`[settle] purchase analytics failed for order ${settled.id}:`, error);
  });
  const notifyOrder = dependencies.notifyOrder
    ?? (await import("@/lib/checkout/notify.server")).notifyOrder;
  await notifyOrder("paid", settled.id);
  // Fulfillment and internal margin notices are separate idempotent outbox
  // rows, so a provider failure never rolls back a committed payment.
  await notifyOrder("supplier", settled.id);
  await notifyOrder("owner", settled.id);
  return { ok: true as const, alreadyPaid: false };
}

/**
 * One `purchase` funnel event per distinct compound on a paid order, attributed
 * to the browsing session that placed it. Settlement is the only writer of
 * `purchase` events; the public tracker rejects that event name.
 */
async function recordPurchaseEvents(order: PaidOrder) {
  const lines = paidLines(order.items);
  if (!lines.length) return;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const sessionId = order.analytics_session_id ?? "anon";
  for (const line of lines) {
    await sql`
      insert into store_events (session_id, event, path, product_id, product_name, meta, provenance)
      values (${sessionId}, 'purchase', ${`/order/${order.id}`}, ${line.productId}, ${line.name}, ${order.id},
        ${process.env.NODE_ENV === "production" ? "live" : "test"})
      on conflict (meta, product_id) where event = 'purchase' do nothing
    `;
  }
}

async function addCreditOnce(
  sql: Sql, userId: string, email: string | null, orderId: string, amount: number, reason: string,
) {
  const inserted = await sql<{ id: number }>`
    insert into store_credit_ledger (user_id, order_id, delta, reason)
    values (${userId}, ${orderId}, ${amount}, ${reason})
    on conflict (order_id, user_id, reason) where order_id is not null do nothing
    returning id
  `;
  if (!inserted[0]) return;
  await sql`
    insert into store_credits (user_id, email, balance)
    values (${userId}, ${email}, ${amount})
    on conflict (user_id) do update set
      balance = store_credits.balance + excluded.balance, updated_at = now()
  `;
}

export type StripeSettlement = "settled" | "already_paid" | "unpaid" | "mismatch";

/**
 * Settle an order from a Stripe Checkout Session, but only when the session really
 * belongs to the order and Stripe collected exactly what we recorded. A mismatch is
 * logged as a `payment_mismatch` event for staff instead of silently settling.
 */
export async function settleStripeSession(
  sql: Sql,
  session: {
    id: string; payment_status: string; currency: string | null; amount_total: number | null;
    payment_intent: string | { id: string } | null; metadata: Record<string, string> | null;
  },
): Promise<StripeSettlement> {
  if (session.payment_status !== "paid") return "unpaid";
  const orderId = session.metadata?.orderId;
  if (!orderId) throw new Error(`Stripe session ${session.id} has no orderId metadata.`);
  const rows = await sql<{ id: string; total: string | number; stripe_session_id: string | null; payment_status: string; status: string }>`
    select id, total, stripe_session_id, payment_status, status from store_orders where id = ${orderId} limit 1
  `;
  const order = rows[0];
  if (!order) throw new Error(`Stripe session ${session.id} references unknown order ${orderId}.`);
  if (order.payment_status === "paid") return "already_paid";
  const expectedCents = Math.round(n(order.total) * 100);
  const problems: string[] = [];
  if (order.status === "cancelled") problems.push("the order was already cancelled (refund this payment in Stripe)");
  if (order.stripe_session_id !== session.id) problems.push(`session ${session.id} is not the order's session`);
  if (session.currency?.toLowerCase() !== "usd") problems.push(`currency ${session.currency ?? "unknown"}`);
  if (session.amount_total !== expectedCents) problems.push(`Stripe collected ${session.amount_total ?? "unknown"} cents, order total is ${expectedCents}`);
  if (problems.length) {
    const note = `Stripe payment did not match this order: ${problems.join("; ")}. Review in the Stripe dashboard before fulfilling.`;
    console.error(`[checkout] payment mismatch for order ${orderId}: ${note}`);
    await sql`
      insert into store_order_events (order_id, kind, note) values (${orderId}, 'payment_mismatch', ${note})
      on conflict (order_id) where kind = 'payment_mismatch' do nothing
    `;
    return "mismatch";
  }
  const paymentRef = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? session.id;
  const result = await settleOrder(orderId, { paymentRef });
  return result.alreadyPaid ? "already_paid" : "settled";
}

/**
 * Safety net for card orders whose webhook never arrived and whose customer never came
 * back to the order page: ask Stripe about recent unpaid Checkout Sessions and settle the
 * ones that were paid. Called when staff open the Orders tab. Failures are logged, never
 * thrown, so a Stripe outage cannot take the admin console down.
 */
export async function reconcileUnpaidStripeOrders(sql: Sql, limit = 20) {
  const pending = await sql<{ id: string; stripe_session_id: string }>`
    select id, stripe_session_id from store_orders
    where payment_method = 'stripe' and payment_status = 'unpaid' and status <> 'cancelled'
      and stripe_session_id is not null and created_at > now() - interval '48 hours'
    order by created_at desc limit ${limit}
  `;
  if (!pending.length) return 0;
  let settled = 0;
  try {
    const { getUncachableStripeClient } = await import("@/lib/payments/stripe.server");
    const stripe = await getUncachableStripeClient();
    for (const order of pending) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if ((await settleStripeSession(sql, session)) === "settled") settled += 1;
    }
  } catch (error) {
    console.error("[orders] Stripe reconciliation failed:", error instanceof Error ? error.message : error);
  }
  return settled;
}
