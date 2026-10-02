import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "./optional-auth";
import { quoteCheckout, type PromoDescriptor, type QuoteLineInput } from "./quote";
import { settleOrder, staleStripeAction } from "./settle.server";
import { canonicalReferralEmail, isEmail, normaliseBusinessEmail, normaliseEin } from "./validation";

type PaymentMethod = "stripe" | "zelle" | "bitcoin" | "ethereum";
export type Contact = {
  email: string; firstName: string; lastName: string; lab?: string; phone?: string;
  address: string; city: string; region?: string; postal: string; country: string;
  businessEmail?: string; ein?: string;
};

const clean = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
const dollars = (cents: number) => cents / 100;
const number = (value: unknown) => Number(value) || 0;
const MAX_RECENT_UNPAID_ATTEMPTS = 3;

function maskedEmail(value: string) {
  const [local, domain] = value.split("@");
  return domain ? `${local.slice(0, 1)}••••@${domain}` : "Private";
}

async function promoFor(code?: string | null, options: { referral?: boolean; userId?: string | null } = {}): Promise<PromoDescriptor | null> {
  const normalized = clean(code, 20).toUpperCase();
  if (!normalized) return null;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{
    code: string;
    percent: string | number;
    kind: string;
    label: string | null;
    owner_id: string | null;
    commission: string | number | null;
    owner_email_verified: boolean | null;
    first_order_only: boolean;
  }>`
    select c.code, c.percent, c.kind, c.label, c.owner_id, c.commission,
      c.first_order_only,
      u."emailVerified" as owner_email_verified
    from promo_codes c
    left join "user" u on u.id = c.owner_id
    where c.code = ${normalized} and c.active = true limit 1
  `;
  if (!rows[0]) throw new Error("Promo code is no longer valid.");
  const row = rows[0];
  if (options.referral !== (row.kind === "referral")) {
    throw new Error(row.kind === "referral"
      ? "Enter a customer referral code in the referral field."
      : "That code is not a customer referral code.");
  }
  if (options.referral && options.userId && row.owner_id === options.userId) {
    throw new Error("You cannot use your own referral code.");
  }
  if (row.kind === "affiliate" && options.userId && row.owner_id === options.userId) {
    throw new Error("You cannot use your own affiliate code.");
  }
  if (options.referral && !row.owner_id) {
    throw new Error("This referral code is not currently available.");
  }
  if (options.referral && row.owner_id && row.owner_email_verified !== true) {
    throw new Error("This referral code is not currently available.");
  }
  return {
    code: row.code,
    percent: number(row.percent),
    kind: row.kind,
    label: row.label ?? undefined,
    ownerId: row.owner_id,
    commission: number(row.commission),
    firstOrderOnly: row.first_order_only === true,
  };
}

async function balanceCents(userId: string | null) {
  if (!userId) return 0;
  const { getSql } = await import("@/lib/db");
  const rows = await (await getSql())<{ balance: string | number }>`
    select balance from store_credits where user_id = ${userId} limit 1
  `;
  return Math.round(number(rows[0]?.balance) * 100);
}

/**
 * Stripe's Checkout Sessions expire after at most 24 hours. We use the same
 * application expiry, but never cancel an open session before explicitly
 * expiring it with Stripe. Manual transfers do not have a provider-side final
 * state we can query, so age alone must never cancel those orders.
 */
async function releaseStaleCheckoutReservations() {
  const { getSql, withTransaction } = await import("@/lib/db");
  const sql = await getSql();
  const stale = await sql<{
    id: string;
    user_id: string | null;
    credit_applied: string | number;
    payment_method: string;
    stripe_session_id: string | null;
    created_at: string;
  }>`
    select id, user_id, credit_applied, payment_method, stripe_session_id, created_at
    from store_orders
    where payment_status = 'unpaid'
      and status <> 'cancelled'
      and payment_method = 'stripe'
      and stripe_session_id is not null
      and created_at < now() - interval '24 hours'
    order by created_at
    limit 100
  `;
  if (stale.length > 0) {
    let stripe: Awaited<ReturnType<(typeof import("@/lib/payments/stripe.server"))["getUncachableStripeClient"]>> | null = null;
    try {
      const stripeModule = await import("@/lib/payments/stripe.server");
      stripe = await stripeModule.getUncachableStripeClient();
    } catch (error) {
      // A Stripe outage must not cancel an order whose payment state we cannot
      // verify. The next checkout/admin reconciliation will retry this.
      console.error("[checkout] stale Stripe cleanup unavailable:", error instanceof Error ? error.message : error);
    }
    if (stripe) {
      const { settleStripeSession } = await import("@/lib/checkout/settle.server");
      for (const order of stale) {
        try {
          let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id!);
          const action = staleStripeAction({
            paymentMethod: order.payment_method,
            sessionStatus: session.status ?? "unknown",
            createdAt: order.created_at,
          });
          if (action === "settle") {
            // If a payment won the race with this cleanup, settle it before
            // considering cancellation. This is the same idempotent path used
            // by the webhook and order-page reconciliation.
            await settleStripeSession(sql, session);
            continue;
          }
          let expired = action === "cancel";
          if (action === "expire") {
            session = await stripe.checkout.sessions.expire(session.id);
            expired = session.status === "expired";
          }
          if (!expired) continue;
          await cancelAndRefund(
            sql,
            order.id,
            order.user_id,
            Math.round(number(order.credit_applied) * 100),
            "Expired Stripe checkout",
            true,
          );
        } catch (error) {
          // Retrieval/expiry failures leave the order and reservations intact.
          console.error(`[checkout] stale Stripe session ${order.stripe_session_id} was not released:`, error instanceof Error ? error.message : error);
        }
      }
    }
  }

  // Repair reservations left by an older cancellation path. This only touches
  // orders already marked cancelled; active unpaid/manual orders are untouched.
  await withTransaction(async (tx) => {
    await tx`
      update store_referral_rewards r
      set status = 'cancelled', cancelled_at = now()
      from store_orders o
      where r.order_id = o.id and r.status = 'pending' and o.status = 'cancelled'
    `;
    await tx`
      update store_promo_reservations r
      set status = 'cancelled', cancelled_at = now()
      from store_orders o
      where r.order_id = o.id and r.status = 'pending' and o.status = 'cancelled'
    `;
  });
}

export const quoteCart = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: {
    lines: QuoteLineInput[];
    promoCode?: string;
    referralCode?: string;
    paymentMethod?: PaymentMethod;
    applyCredit?: boolean;
    country?: string;
    region?: string;
  }) => data)
  .handler(async ({ context, data }) => {
    if (context.userId) {
      const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
      await requireVerifiedUser(context.userId);
    }
    const values = await settings();
    return quoteCheckout({
      lines: data.lines,
      promo: await resolveCheckoutPromo(data.promoCode, data.referralCode, context.userId),
      paymentMethod: data.paymentMethod,
      applyCredit: Boolean(data.applyCredit),
      signedIn: Boolean(context.userId),
      creditBalanceCents: await balanceCents(context.userId),
      cryptoRewardPercent: Number(values.crypto_reward_percent) || 0,
      calculateShipping: true,
      salesTaxRatePercent: Number(values.sales_tax_rate_percent) || 0,
      taxJurisdiction: { country: data.country, region: data.region },
    });
  });

async function resolveCheckoutPromo(
  promoCode: string | null | undefined,
  referralCode: string | null | undefined,
  userId: string | null,
  referralIdentity?: VerifiedReferralIdentity | null,
) {
  if (clean(promoCode, 20) && clean(referralCode, 20)) {
    throw new Error("Use either a promo code or a customer referral code, not both.");
  }
  if (clean(referralCode, 20)) {
    await (referralIdentity ?? requireVerifiedReferralIdentity(userId));
    return promoFor(referralCode, { referral: true, userId });
  }
  return promoFor(promoCode, { referral: false, userId });
}

export async function settings() {
  const { getSql } = await import("@/lib/db");
  const rows = await (await getSql())<{ key: string; value: string }>`
    select key, value from store_settings
     where key in ('zelle_recipient','zelle_display_name','btc_address','eth_address','crypto_reward_percent','payment_notice','sales_tax_rate_percent','tax_nexus_region')
  `;
  const environmentDefaults: Record<string, string> = {
    zelle_recipient: process.env.ZELLE_RECIPIENT?.trim() ?? "",
    zelle_display_name: process.env.ZELLE_DISPLAY_NAME?.trim() ?? "",
    btc_address: process.env.BTC_ADDRESS?.trim() ?? "",
    eth_address: process.env.ETH_ADDRESS?.trim() ?? "",
    crypto_reward_percent: process.env.CRYPTO_REWARD_PERCENT?.trim() ?? "",
    payment_notice: process.env.PAYMENT_NOTICE?.trim() ?? "",
    sales_tax_rate_percent: process.env.SALES_TAX_RATE_PERCENT?.trim() ?? "",
    tax_nexus_region: "Illinois — configure before collecting tax",
  };
  return {
    ...environmentDefaults,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value])),
  };
}

export const loadPaymentOptions = createServerFn({ method: "GET" }).handler(async () => {
  const [{ stripeConfigured }, values] = await Promise.all([
    import("@/lib/payments/stripe.server"),
    settings(),
  ]);
  return {
    stripe: await stripeConfigured(),
    zelle: Boolean(values.zelle_recipient),
    bitcoin: Boolean(values.btc_address),
    ethereum: Boolean(values.eth_address),
    cryptoRewardPercent: Number(values.crypto_reward_percent) || 0,
    notice: values.payment_notice ?? "",
  };
});

type ValidatedContact = Omit<Contact, "ein"> & {
  businessEmail: string;
  einFingerprint: string | null;
};

async function fingerprintEin(ein: string) {
  if (!ein) return null;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("EIN storage is not configured. Leave EIN blank or contact support.");
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(`v1:${ein}`).digest("hex");
}

async function fingerprintReferralIdentity(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("Referral storage is not configured. Try again later.");
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(`referral-v1:${value}`).digest("hex");
}

type VerifiedReferralIdentity = { id: string; email: string };

async function requireVerifiedReferralIdentity(userId: string | null): Promise<VerifiedReferralIdentity> {
  if (!userId) {
    throw new Error("Sign in with a verified email address to redeem a customer referral code.");
  }
  const { getSql } = await import("@/lib/db");
  const rows = await (await getSql())<{ id: string; email: string; emailVerified: boolean }>`
    select id, email, "emailVerified" from "user" where id = ${userId} limit 1
  `;
  const email = rows[0]?.email?.trim().toLowerCase() ?? "";
  if (!rows[0] || rows[0].emailVerified !== true || !isEmail(email)) {
    throw new Error("Verify your account email before redeeming a customer referral code.");
  }
  return { id: rows[0].id, email: canonicalReferralEmail(email) };
}

export async function validateContact(raw: Contact): Promise<ValidatedContact> {
  const input = raw && typeof raw === "object" ? raw : ({} as Contact);
  const field = (value: unknown, max: number) => {
    if (typeof value !== "string") return "";
    const text = value.trim();
    if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      throw new Error("One or more checkout fields are too long or contain invalid characters.");
    }
    return text;
  };
  const contact = {
    email: field(input.email, 254).toLowerCase(), firstName: field(input.firstName, 80),
    lastName: field(input.lastName, 80), lab: field(input.lab, 160), phone: field(input.phone, 40),
    address: field(input.address, 240), city: field(input.city, 100), region: field(input.region, 100),
    postal: field(input.postal, 30), country: field(input.country, 80),
    businessEmail: normaliseBusinessEmail(input.businessEmail),
    ein: normaliseEin(input.ein),
  };
  if (!contact.email.includes("@") || !contact.firstName || !contact.lastName ||
      !contact.address || !contact.city || !contact.postal || !contact.country) {
    throw new Error("Complete all required contact and shipping fields.");
  }
  if (!isEmail(contact.email)) throw new Error("Enter a valid email address.");
  const { ein: _ein, ...safeContact } = contact;
  return { ...safeContact, einFingerprint: await fingerprintEin(contact.ein) };
}

async function cryptoQuote(totalCents: number, asset: "BTC" | "ETH") {
  const response = await fetch(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`, {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error(`${asset} rate is unavailable. No order was created; please try again.`);
  const body = await response.json() as { data?: { amount?: string } };
  const rate = Number(body.data?.amount);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Coinbase returned an invalid ${asset} rate. No order was created.`);
  const amount = Math.ceil((totalCents / 100 / rate) * 1e8) / 1e8;
  return { rate, amount };
}

export const createOrder = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: {
    lines: QuoteLineInput[]; promoCode?: string; paymentMethod: PaymentMethod;
    referralCode?: string;
    applyCredit?: boolean; contact: Contact; origin: string;
    researchAttestation: boolean;
    idempotencyKey?: string;
    analyticsSessionId?: string;
  }) => data)
  .handler(async ({ context, data }) => {
    if (context.userId) {
      const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
      await requireVerifiedUser(context.userId);
    }
    // Same first-party session id the analytics tracker uses, so the paid
    // order can be attributed to the session that browsed and added to cart.
    const analyticsSessionId = /^[A-Za-z0-9_-]{1,80}$/.test(clean(data.analyticsSessionId, 80))
      ? clean(data.analyticsSessionId, 80)
      : null;
    if (!(["stripe", "zelle", "bitcoin", "ethereum"] as string[]).includes(data.paymentMethod)) {
      throw new Error("Choose a valid payment method.");
    }
    const { getSql, withTransaction } = await import("@/lib/db");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    const idempotencyKey = clean(data.idempotencyKey, 120);
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(idempotencyKey)) {
      throw new Error("Refresh checkout and try again with a checkout idempotency key.");
    }
    const referralIdentity = clean(data.referralCode, 20)
      ? await requireVerifiedReferralIdentity(context.userId)
      : null;
    // Never trust the email field submitted by an authenticated browser. The
    // Better Auth user record is the canonical customer identity for orders,
    // promotions, abuse limits, and notifications.
    let checkoutContact = data.contact;
    if (context.userId) {
      const users = await sql<{ email: string; emailVerified: boolean }>`
        select email, "emailVerified" from "user" where id = ${context.userId} limit 1
      `;
      const accountEmail = users[0]?.email?.trim().toLowerCase() ?? "";
      if (!users[0] || !isEmail(accountEmail)) throw new Error("Your account could not be found. Sign in again.");
      checkoutContact = { ...data.contact, email: accountEmail };
    }
    const contact = await validateContact(checkoutContact);
    const existing = await sql<{
      id: string; reference: string; access_key: string; user_id: string | null;
       email: string; payment_method: string; status: string; stripe_checkout_url: string | null;
       credit_applied: string | number;
       stripe_session_state: string | null; updated_at: string;
    }>`
      select id, reference, access_key, user_id, email, payment_method, status, stripe_checkout_url,
        credit_applied,
        stripe_session_state, updated_at
      from store_orders where client_idempotency_key = ${idempotencyKey} limit 1
    `;
    if (existing[0]) {
      if (existing[0].user_id !== context.userId || existing[0].email !== contact.email) {
        throw new Error("That checkout idempotency key is already in use.");
      }
      if (existing[0].status === "cancelled") throw new Error("That checkout was cancelled. Start a new checkout.");
      if (
        existing[0].payment_method === "stripe" &&
        existing[0].stripe_session_state === "creating" &&
        Date.parse(existing[0].updated_at) < Date.now() - 10 * 60_000
      ) {
        await cancelAndRefund(
          sql,
          existing[0].id,
          existing[0].user_id,
          Math.round(number(existing[0].credit_applied) * 100),
          "Expired Stripe checkout preparation",
          true,
        );
        throw new Error("This checkout expired while preparing payment. Refresh checkout and try again.");
      }
      if (existing[0].payment_method === "stripe" && !existing[0].stripe_checkout_url) {
        throw new Error("Checkout is still being prepared. Retry shortly.");
      }
      return {
        ok: true as const, id: existing[0].id, reference: existing[0].reference,
        accessKey: existing[0].access_key,
        url: existing[0].stripe_checkout_url,
      };
    }
    if (!await consumePublicBudget(sql, "checkout", 120)) {
      throw new Error("Too many checkout attempts. Please wait before trying again.");
    }
    await releaseStaleCheckoutReservations();
    const [values, promo, stripeModule] = await Promise.all([
      settings(),
      resolveCheckoutPromo(data.promoCode, data.referralCode, context.userId, referralIdentity),
      import("@/lib/payments/stripe.server"),
    ]);
    if (data.paymentMethod === "zelle" && !values.zelle_recipient) throw new Error("Zelle is not enabled.");
    if (data.paymentMethod === "bitcoin" && !values.btc_address) throw new Error("Bitcoin is not enabled.");
    if (data.paymentMethod === "ethereum" && !values.eth_address) throw new Error("Ethereum is not enabled.");
    if (data.researchAttestation !== true) {
      throw new Error("Confirm the research-use-only attestation before placing your order.");
    }
    const quote = quoteCheckout({
      lines: data.lines, promo, paymentMethod: data.paymentMethod,
      applyCredit: Boolean(data.applyCredit), signedIn: Boolean(context.userId),
      creditBalanceCents: await balanceCents(context.userId),
      cryptoRewardPercent: Number(values.crypto_reward_percent) || 0,
      calculateShipping: true,
      salesTaxRatePercent: Number(values.sales_tax_rate_percent) || 0,
      taxJurisdiction: { country: contact.country, region: contact.region },
    });
    const id = crypto.randomUUID();
    const accessKey = crypto.randomUUID().replaceAll("-", "");
    const reference = `VS-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const referralOwnerId = promo?.kind === "referral" ? promo.ownerId ?? null : null;
    const affiliateOwnerId = promo?.kind === "affiliate" ? promo.ownerId ?? null : null;
    const affiliateCommissionRate = affiliateOwnerId
      ? Math.max(0, Math.min(100, Number(promo?.commission) || 0))
      : 0;
    if (referralOwnerId) {
      const ownerRows = await sql<{ email: string | null }>`
        select email from "user" where id = ${referralOwnerId} limit 1
      `;
      if (ownerRows[0]?.email && referralIdentity &&
          canonicalReferralEmail(ownerRows[0].email) === referralIdentity.email) {
        throw new Error("You cannot use your own referral code.");
      }
    }
    const referralCode = referralOwnerId ? promo?.code ?? null : null;
    const referralReward = referralOwnerId
      ? dollars(Math.round(quote.merchandiseCents * Math.max(0, promo?.commission ?? 0) / 100))
      : 0;
    const affiliateCommission = affiliateOwnerId
      ? dollars(Math.round(quote.merchandiseCents * affiliateCommissionRate / 100))
      : 0;
    let firstOrderReviewRequired = false;
    let firstOrderReviewStatus: "pending" | "not_required" = "not_required";
    let referralKeyHash: string | null = null;
    let firstOrderIdentity = canonicalReferralEmail(contact.email);
    // Order row, credit debit and the created event commit together: a failure anywhere
    // leaves no order and no missing credit.
    try {
      await withTransaction(async (tx) => {
      let identityEmail = contact.email;
      // Lock both identities in a deterministic order. This makes owner checks
      // race-safe and avoids deadlocks if two code owners redeem one another's
      // codes at once.
      const promoOwnerId = referralOwnerId ?? affiliateOwnerId;
      if (context.userId && promoOwnerId) {
        await tx`
          select id from "user"
          where id in (${context.userId}, ${promoOwnerId})
          order by id
          for update
        `;
      }
      if (context.userId) {
        const lockedUsers = await tx<{ email: string; emailVerified: boolean }>`
          select email, "emailVerified" from "user" where id = ${context.userId} for update
        `;
        const lockedUser = lockedUsers[0];
        if (!lockedUser) throw new Error("Your account could not be found. Sign in again.");
        if (referralOwnerId && lockedUser.emailVerified !== true) {
          throw new Error("Verify your account email before redeeming a customer referral code.");
        }
        identityEmail = lockedUser.email.trim().toLowerCase();
        Object.assign(contact, { email: identityEmail });
        firstOrderIdentity = canonicalReferralEmail(identityEmail);
        if (referralOwnerId) identityEmail = canonicalReferralEmail(identityEmail);
        if (referralOwnerId && referralIdentity && identityEmail !== referralIdentity.email) {
          throw new Error("Your account email changed. Refresh checkout and try again.");
        }
      } else {
        await tx`select pg_advisory_xact_lock(hashtextextended(${firstOrderIdentity}, 0))`;
      }
      if (referralOwnerId) {
        const ownerRows = await tx<{ id: string; email: string | null; emailVerified: boolean }>`
          select id, email, "emailVerified"
          from "user"
          where id = ${referralOwnerId}
          for update
        `;
        const owner = ownerRows[0];
        const ownerEmail = owner?.email?.trim().toLowerCase() ?? "";
        if (
          !owner ||
          owner.emailVerified !== true ||
          owner.id === context.userId ||
          (identityEmail && ownerEmail && canonicalReferralEmail(ownerEmail) === canonicalReferralEmail(identityEmail))
        ) {
          throw new Error("You cannot use your own referral code.");
        }
      }
      if (affiliateOwnerId) {
        const ownerRows = await tx<{ id: string; email: string | null }>`
          select id, email from "user" where id = ${affiliateOwnerId} for update
        `;
        const owner = ownerRows[0];
        const ownerEmail = owner?.email?.trim().toLowerCase() ?? "";
        if (
          !owner ||
          owner.id === context.userId ||
          (ownerEmail && canonicalReferralEmail(ownerEmail) === canonicalReferralEmail(contact.email))
        ) {
          throw new Error("You cannot use your own affiliate code.");
        }
      }
      const recentAttempts = await tx<{ count: string }>`
        select count(*)::text as count from store_orders
        where lower(regexp_replace(email, '\\+[^@]*@', '@')) = ${firstOrderIdentity}
          and payment_status <> 'paid' and status <> 'cancelled'
          and created_at > now() - interval '1 hour'
      `;
      if (Number(recentAttempts[0]?.count ?? 0) >= MAX_RECENT_UNPAID_ATTEMPTS) {
        throw new Error("Too many recent unpaid checkout attempts. Complete or wait before trying again.");
      }
      const priorOrders = context.userId
        ? await tx<{ id: string }>`
            select id from store_orders
            where payment_status = 'paid'
              and (
                user_id = ${context.userId}
                or lower(regexp_replace(email, '\\+[^@]*@', '@')) = ${firstOrderIdentity}
              )
            limit 1
          `
        : await tx<{ id: string }>`
            select id from store_orders
            where lower(regexp_replace(email, '\\+[^@]*@', '@')) = ${firstOrderIdentity}
              and payment_status = 'paid'
            limit 1
          `;
      if (referralOwnerId && priorOrders.length > 0) {
        throw new Error("Customer referral codes are only valid on a customer's first paid order.");
      }
      if (promo?.firstOrderOnly && priorOrders.length > 0) {
        throw new Error("This promotion is only valid on a customer's first paid order.");
      }
      firstOrderReviewRequired = priorOrders.length === 0;
      firstOrderReviewStatus = firstOrderReviewRequired ? "pending" : "not_required";
      if (referralOwnerId) {
        referralKeyHash = await fingerprintReferralIdentity(`email:${canonicalReferralEmail(identityEmail)}`);
        // Orders created by the previous user-id keyed implementation must also
        // reserve the same account, otherwise changing the checkout email could
        // bypass the one-referral rule.
        if (context.userId) {
          const legacyKeyHash = await fingerprintReferralIdentity(`user:${context.userId}`);
          if (legacyKeyHash !== referralKeyHash) {
            const legacyRows = await tx<{ id: number }>`
              select id from store_referral_rewards
              where referred_key_hash = ${legacyKeyHash}
                and status in ('pending', 'settled')
              limit 1
            `;
            if (legacyRows[0]) {
              throw new Error("This referral code has already been used for this customer.");
            }
          }
        }
      }
      await tx`
        insert into store_orders (
          id, reference, access_key, user_id, email, first_name, last_name, lab, phone,
           address, city, region, postal, country, subtotal, shipping, sales_tax, tax_rate, discount, total, items,
          status, payment_method, payment_status, promo_code, credit_applied, credit_earned,
          btc_address, btc_amount, btc_rate, btc_quote_expires_at, business_email,
          ein_fingerprint, research_attested_at, first_order_review_required, first_order_review_status,
          referral_code,
           referral_owner_id, referral_reward, affiliate_owner_id, affiliate_commission_rate,
           affiliate_commission, client_idempotency_key, stripe_session_state,
           analytics_session_id, access_key_expires_at
        ) values (
          ${id}, ${reference}, ${accessKey}, ${context.userId}, ${contact.email}, ${contact.firstName},
          ${contact.lastName}, ${contact.lab || null}, ${contact.phone || null}, ${contact.address},
          ${contact.city}, ${contact.region || null}, ${contact.postal}, ${contact.country},
          ${dollars(quote.subtotalCents)}, ${dollars(quote.shippingCents)},
          ${dollars(quote.savings.bulkCents + quote.savings.promoCents + quote.savings.cryptoCents)},
           ${dollars(quote.salesTaxCents)}, ${quote.taxRatePercent}, ${dollars(quote.totalCents)}, ${JSON.stringify(quote.lines)}, 'pending_payment',
          ${data.paymentMethod}, 'unpaid', ${promo?.code ?? null}, ${dollars(quote.creditAppliedCents)},
          ${dollars(context.userId ? quote.creditEarnedCents : 0)}, ${
            data.paymentMethod === "bitcoin" ? values.btc_address
              : data.paymentMethod === "ethereum" ? values.eth_address
              : null
          },
          ${null}, ${null}, ${null},
          ${contact.businessEmail || null}, ${contact.einFingerprint}, now(), ${firstOrderReviewRequired},
          ${firstOrderReviewStatus},
           ${referralCode}, ${referralOwnerId}, ${referralReward}, ${affiliateOwnerId},
           ${affiliateCommissionRate}, ${affiliateCommission}, ${idempotencyKey},
          ${data.paymentMethod === "stripe" ? "not_started" : "not_applicable"},
           ${analyticsSessionId}, now() + interval '365 days'
        )
      `;
      if (promo?.firstOrderOnly) {
        const reservation = await tx<{ id: number }>`
          insert into store_promo_reservations (code, order_id, customer_identity)
          values (${promo.code}, ${id}, ${firstOrderIdentity})
          on conflict (code, customer_identity) where status in ('pending', 'settled') do nothing
          returning id
        `;
        if (!reservation[0]) throw new Error("This promotion has already been used for this customer.");
      }
      if (context.userId) {
        await tx`
          insert into store_customer_profiles (
            user_id, business_email, ein_fingerprint, research_attested_at, updated_at
          ) values (
            ${context.userId}, ${contact.businessEmail || null}, ${contact.einFingerprint}, now(), now()
          )
          on conflict (user_id) do update set
            business_email = coalesce(excluded.business_email, store_customer_profiles.business_email),
            ein_fingerprint = coalesce(excluded.ein_fingerprint, store_customer_profiles.ein_fingerprint),
            research_attested_at = excluded.research_attested_at,
            updated_at = now()
        `;
      }
      if (referralOwnerId && referralCode && referralKeyHash) {
        const referral = await tx<{ id: number }>`
          insert into store_referral_rewards (
            order_id, referral_code, referrer_id, referred_key_hash, reward
          ) values (
            ${id}, ${referralCode}, ${referralOwnerId}, ${referralKeyHash}, ${referralReward}
          )
          on conflict (referred_key_hash)
            where status in ('pending', 'settled') do nothing
          returning id
        `;
        if (!referral[0]) {
          throw new Error("This referral code has already been used for this customer.");
        }
      }
      if (context.userId && quote.creditAppliedCents > 0) {
        const applied = await tx<{ id: number }>`
          with updated as (
            update store_credits set balance = balance - ${dollars(quote.creditAppliedCents)}, updated_at = now()
            where user_id = ${context.userId} and balance >= ${dollars(quote.creditAppliedCents)}
            returning user_id
          )
          insert into store_credit_ledger (user_id, order_id, delta, reason)
          select user_id, ${id}, ${-dollars(quote.creditAppliedCents)}, 'Applied to order' from updated
          returning id
        `;
        if (!applied[0]) throw new Error("Your credit balance changed. Refresh the quote and try again.");
      }
      await tx`insert into store_order_events (order_id, kind, note) values (${id}, 'created', ${data.paymentMethod})`;
      });
    } catch (error) {
      // Two first attempts with the same client key can race before either
      // transaction commits. The unique index turns the loser into a safe
      // retry rather than a second order or an opaque database error.
      const retry = await sql<{
        id: string; reference: string; access_key: string; user_id: string | null;
        email: string; status: string; payment_method: string; stripe_checkout_url: string | null;
      }>`
        select id, reference, access_key, user_id, email, status, payment_method, stripe_checkout_url
        from store_orders where client_idempotency_key = ${idempotencyKey} limit 1
      `;
      if (retry[0] && retry[0].user_id === context.userId && retry[0].email === contact.email) {
        if (retry[0].status === "cancelled") throw new Error("That checkout was cancelled. Start a new checkout.");
        if (retry[0].payment_method === "stripe" && !retry[0].stripe_checkout_url) {
          throw new Error("Checkout is still being prepared. Retry shortly.");
        }
        return { ok: true as const, id: retry[0].id, reference: retry[0].reference,
          accessKey: retry[0].access_key, url: retry[0].stripe_checkout_url };
      }
      throw error;
    }
    if (data.paymentMethod === "bitcoin" || data.paymentMethod === "ethereum") {
      try {
        const crypto = await cryptoQuote(quote.totalCents, data.paymentMethod === "bitcoin" ? "BTC" : "ETH");
        await sql`
          update store_orders
          set btc_amount = ${crypto.amount}, btc_rate = ${crypto.rate},
              btc_quote_expires_at = ${new Date(Date.now() + 30 * 60_000).toISOString()},
              updated_at = now()
          where id = ${id} and status <> 'cancelled'
        `;
      } catch (error) {
        await cancelAndRefund(sql, id, context.userId, quote.creditAppliedCents, "Crypto quote creation failed", true);
        throw error;
      }
    }
    if (data.paymentMethod !== "stripe") {
      const { notifyOrder } = await import("@/lib/checkout/notify.server");
      await notifyOrder("pending", id);
      return { ok: true as const, id, reference, accessKey, url: null };
    }
    try {
      if (!(await stripeModule.stripeConfigured())) {
        throw new Error("Card payments are being activated. Choose another payment method.");
      }
      const markedCreating = await sql<{ id: string }>`
        update store_orders
        set stripe_session_state = 'creating', updated_at = now()
        where id = ${id} and status <> 'cancelled' and payment_status = 'unpaid'
          and stripe_session_state = 'not_started'
        returning id
      `;
      if (!markedCreating[0]) throw new Error("This checkout is no longer available.");
      // Webhook must exist before we take a payment, and prices come from the synced table.
      await stripeModule.ensureStripeReady();
      const stripe = await stripeModule.getUncachableStripeClient();
      const lineItems = [];
      for (const line of quote.lines) {
        // The synced Stripe price must charge exactly what the server quote says; otherwise
        // the catalogs have drifted and we stop before the customer is charged.
        const prices = await sql<{ id: string; unit_amount: number | string | null; currency: string; type: string }>`
          select id, unit_amount, currency, type from stripe.prices
          where active = true and metadata ->> 'productId' = ${line.productId}
            and metadata ->> 'dose' = ${line.dose}
          order by created desc limit 1
        `;
        const price = prices[0];
        if (!price) throw new Error(`Missing Stripe price for ${line.productId} / ${line.dose}. Run the Stripe seed and sync.`);
        if (Number(price.unit_amount) !== line.unitCents || price.currency !== "usd" || price.type !== "one_time") {
          throw new Error(`Stripe price for ${line.name} (${line.dose}) is out of date. Run the Stripe seed and sync before taking card payments.`);
        }
        lineItems.push({ price: price.id, quantity: line.qty });
      }
      if (quote.salesTaxCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: quote.salesTaxCents,
            product_data: { name: "Illinois sales tax" },
          },
          quantity: 1,
        });
      }
      const discountCents = quote.savings.bulkCents + quote.savings.promoCents + quote.creditAppliedCents;
      const coupon = discountCents > 0
        ? await stripe.coupons.create(
            { amount_off: discountCents, currency: "usd", duration: "once" },
            { idempotencyKey: `vitality-order-${id}-coupon-v1` },
          )
        : null;
      const origin = resolveCheckoutOrigin(clean(data.origin, 300));
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment", line_items: lineItems,
          discounts: coupon ? [{ coupon: coupon.id }] : undefined,
          shipping_options: quote.shippingCents > 0 ? [{
            shipping_rate_data: {
              type: "fixed_amount", fixed_amount: { amount: quote.shippingCents, currency: "usd" },
              display_name: "Standard shipping",
            },
          }] : undefined,
          metadata: { orderId: id, reference }, client_reference_id: id, customer_email: contact.email,
          success_url: `${origin}/order/${id}?k=${accessKey}&paid=1`, cancel_url: `${origin}/checkout`,
        },
        { idempotencyKey: `vitality-order-${id}-session-v1` },
      );
      if (session.amount_total !== quote.totalCents || session.currency !== "usd") {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        throw new Error(`Stripe total (${session.amount_total}) does not match the order total (${quote.totalCents}). Checkout was not started.`);
      }
      const attached = await sql<{ id: string }>`
        update store_orders
        set stripe_session_id = ${session.id}, stripe_checkout_url = ${session.url},
            stripe_session_state = 'created', updated_at = now()
        where id = ${id} and status <> 'cancelled' and payment_status = 'unpaid'
          and stripe_session_state = 'creating'
        returning id
      `;
      if (!attached[0]) {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        throw new Error("This order was cancelled while checkout was being prepared.");
      }
      return { ok: true as const, id, reference, accessKey, url: session.url };
    } catch (error) {
      await cancelAndRefund(sql, id, context.userId, quote.creditAppliedCents, "Stripe checkout creation failed", true);
      throw error;
    }
  });

export const loadOrder = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: { id: string; accessKey?: string; paid?: boolean }) => data)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    type OrderRow = {
      id: string; reference: string; access_key: string; user_id: string | null; email: string;
      first_name: string; last_name: string; address: string; city: string; region: string | null;
      postal: string; country: string; subtotal: string | number; shipping: string | number;
      discount: string | number; total: string | number; items: string; status: string;
      payment_method: string; payment_status: string; payment_ref: string | null;
      stripe_session_id: string | null; btc_address: string | null; btc_amount: string | number | null;
      btc_rate: string | number | null; btc_quote_expires_at: string | null; claimed_at: string | null;
      paid_at: string | null; shipped_at: string | null; tracking: string | null;
      credit_applied: string | number; credit_earned: string | number; created_at: string;
      first_order_review_required: boolean; referral_code: string | null;
    };
    let rows = await sql<OrderRow>`
      select * from store_orders where id = ${clean(data.id, 80)}
        and (
          user_id = ${context.userId}
          or (
            access_key = ${clean(data.accessKey, 100)}
            and access_key_revoked_at is null
            and coalesce(access_key_expires_at, created_at + interval '365 days') > now()
          )
        ) limit 1
    `;
    let order = rows[0];
    if (!order) throw new Error("Order not found.");
    // Card orders: ask Stripe directly while the order is unpaid so the page settles even
    // if the webhook is delayed or the customer never landed on the success URL.
    if (order.status !== "cancelled" && order.payment_method === "stripe" &&
        order.payment_status === "unpaid" && order.stripe_session_id) {
      try {
        const { getUncachableStripeClient } = await import("@/lib/payments/stripe.server");
        const { settleStripeSession } = await import("@/lib/checkout/settle.server");
        const session = await (await getUncachableStripeClient()).checkout.sessions.retrieve(String(order.stripe_session_id));
        if ((await settleStripeSession(sql, session)) === "settled") {
          rows = await sql<OrderRow>`select * from store_orders where id = ${data.id} limit 1`;
          order = rows[0];
        }
      } catch (error) {
        // Stripe being unreachable must not hide the order; the webhook or next poll will settle it.
        console.error("[order] Stripe status check failed:", error instanceof Error ? error.message : error);
      }
    }
    const events = await sql<{ kind: string; note: string | null; created_at: string }>`select kind, note, created_at from store_order_events where order_id = ${data.id} order by created_at`;
    const values = await settings();
    // Deliberately construct the customer-facing shape. In particular, never
    // spread store_orders here: ein_fingerprint and future sensitive columns
    // must not cross the public order boundary.
    return {
      id: order.id,
      reference: order.reference,
      email: order.email,
      first_name: order.first_name,
      last_name: order.last_name,
      address: order.address,
      city: order.city,
      region: order.region,
      postal: order.postal,
      country: order.country,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      items: JSON.parse(String(order.items)),
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_ref: order.payment_ref,
      btc_address: order.btc_address,
      eth_address: order.payment_method === "ethereum" ? order.btc_address : null,
      crypto_amount: order.btc_amount,
      crypto_rate: order.btc_rate,
      crypto_quote_expires_at: order.btc_quote_expires_at,
      btc_amount: order.btc_amount,
      btc_rate: order.btc_rate,
      btc_quote_expires_at: order.btc_quote_expires_at,
      claimed_at: order.claimed_at,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      tracking: order.tracking,
      credit_applied: order.credit_applied,
      credit_earned: order.credit_earned,
      created_at: order.created_at,
      first_order_review_required: order.first_order_review_required,
      referral_code: order.referral_code,
      events,
      zelleRecipient: values.zelle_recipient ?? null,
      zelleDisplayName: values.zelle_display_name ?? null,
      paymentNotice: values.payment_notice ?? null,
    };
  });

/**
 * Associate historical guest orders with the currently signed-in account.
 *
 * An email address in a checkout is not proof of ownership: anyone could
 * submit someone else's address.  Claiming therefore has its own authenticated
 * operation and requires Better Auth's email verification flag.  Locking the
 * account row makes the identity check and all matching order updates one
 * transaction, while the `user_id is null` predicate prevents stealing an
 * order which another account has already claimed.
 */
export const claimGuestOrders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { confirm: boolean }) => data)
  .handler(async ({ context, data }) => {
    if (data.confirm !== true) {
      throw new Error("Confirm your verified email before claiming guest orders.");
    }
    const { withTransaction } = await import("@/lib/db");
    return withTransaction(async (tx) => {
      const users = await tx<{ email: string | null; emailVerified: boolean }>`
        select email, "emailVerified"
        from "user"
        where id = ${context.userId}
        for update
      `;
      const user = users[0];
      const email = user?.email?.trim().toLowerCase() ?? "";
      if (!user || user.emailVerified !== true || !isEmail(email)) {
        throw new Error("Verify your account email before claiming guest orders.");
      }
      const claimed = await tx<{ id: string }>`
        update store_orders
        set user_id = ${context.userId}, updated_at = now()
        where user_id is null and lower(email) = ${email}
        returning id
      `;
      return { ok: true as const, claimed: claimed.length };
    });
  });

export const claimPayment = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: { id: string; accessKey?: string }) => data)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update store_orders set payment_status = 'claimed', claimed_at = now(), updated_at = now()
      where id = ${data.id} and (
        user_id = ${context.userId}
        or (
          access_key = ${clean(data.accessKey, 100)}
          and access_key_revoked_at is null
          and coalesce(access_key_expires_at, created_at + interval '365 days') > now()
        )
      )
        and payment_method in ('zelle','bitcoin','ethereum') and payment_status = 'unpaid' returning id
    `;
    if (!rows[0]) throw new Error("This payment cannot be claimed.");
    await sql`insert into store_order_events (order_id, kind) values (${data.id}, 'payment_claimed')`;
    return { ok: true as const };
  });

export const refreshCryptoQuote = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: { id: string; accessKey?: string }) => data)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ total: string | number; btc_quote_expires_at: string }>`
      select total, btc_quote_expires_at from store_orders where id = ${data.id}
        and (
          user_id = ${context.userId}
          or (
            access_key = ${clean(data.accessKey, 100)}
            and access_key_revoked_at is null
            and coalesce(access_key_expires_at, created_at + interval '365 days') > now()
          )
        )
        and payment_method in ('bitcoin','ethereum') and payment_status = 'unpaid' limit 1
    `;
    if (!rows[0]) throw new Error("Crypto quote cannot be refreshed.");
    if (Date.parse(rows[0].btc_quote_expires_at) > Date.now()) throw new Error("The current Bitcoin quote has not expired.");
    const methods = await sql<{ payment_method: string }>`select payment_method from store_orders where id = ${data.id} limit 1`;
    const asset = methods[0]?.payment_method === "ethereum" ? "ETH" : "BTC";
    const quote = await cryptoQuote(Math.round(number(rows[0].total) * 100), asset);
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    await sql`update store_orders set btc_rate = ${quote.rate}, btc_amount = ${quote.amount}, btc_quote_expires_at = ${expiresAt}, updated_at = now() where id = ${data.id}`;
    await sql`insert into store_order_events (order_id, kind, note) values (${data.id}, 'crypto_requoted', ${`${asset}:${quote.rate}`})`;
    return { ...quote, expiresAt };
  });

export const saveMyBusinessProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { businessEmail?: string; ein?: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
    await requireVerifiedUser(context.userId);
    const businessEmail = normaliseBusinessEmail(data.businessEmail);
    const ein = normaliseEin(data.ein);
    const einFingerprint = await fingerprintEin(ein);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into store_customer_profiles (
        user_id, business_email, ein_fingerprint, updated_at
      ) values (
        ${context.userId}, ${businessEmail || null}, ${einFingerprint}, now()
      )
      on conflict (user_id) do update set
        business_email = excluded.business_email,
        ein_fingerprint = coalesce(excluded.ein_fingerprint, store_customer_profiles.ein_fingerprint),
        updated_at = now()
    `;
    return { ok: true as const, businessEmail, einProvided: Boolean(einFingerprint) };
  });

export const loadMyBusinessProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
    await requireVerifiedUser(context.userId);
    const { getSql } = await import("@/lib/db");
    const rows = await (await getSql())<{ business_email: string | null; ein_fingerprint: string | null }>`
      select business_email, ein_fingerprint
      from store_customer_profiles
      where user_id = ${context.userId}
      limit 1
    `;
    return {
      businessEmail: rows[0]?.business_email ?? "",
      einProvided: Boolean(rows[0]?.ein_fingerprint),
    };
  });

/**
 * Stripe success/cancel URLs must point back at this site, never at a caller-supplied host
 * (that would let a crafted request send a shopper — and their order access key — to a
 * phishing page after paying). The browser's origin is honoured only when it is one of ours.
 */
function resolveCheckoutOrigin(requested: string) {
  const normalise = (value: string | undefined) => {
    if (!value) return null;
    const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      return null;
    }
  };
  const allowed = [
    process.env.VITE_PUBLIC_SITE_URL,
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
    process.env.REPLIT_DEV_DOMAIN,
  ].map(normalise).filter((value): value is string => Boolean(value));
  const wanted = normalise(requested);
  if (wanted && allowed.includes(wanted)) return wanted;
  if (allowed[0]) return allowed[0];
  throw new Error("Checkout origin is not configured. Set VITE_PUBLIC_SITE_URL.");
}

async function cancelAndRefund(
  _sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  id: string, userId: string | null, creditCents: number, note: string,
  allowCreating = false,
) {
  const { withTransaction } = await import("@/lib/db");
  await withTransaction(async (tx) => {
    const current = await tx<{ stripe_session_state: string | null }>`
      select stripe_session_state from store_orders where id = ${id} for update
    `;
    if (!current[0]) return;
    if (current[0].stripe_session_state === "creating" && !allowCreating) {
      throw new Error("Stripe checkout is being prepared. Try cancellation again shortly.");
    }
    const rows = await tx<{ id: string }>`
      update store_orders
      set status = 'cancelled', stripe_session_state = 'cancelled', updated_at = now()
      where id = ${id} and status <> 'cancelled' and payment_status <> 'paid' returning id
    `;
    if (!rows[0]) return;
    if (userId && creditCents > 0) {
      const refunded = await tx<{ id: number }>`
        insert into store_credit_ledger (user_id, order_id, delta, reason)
        values (${userId}, ${id}, ${dollars(creditCents)}, 'Cancelled order refund')
        on conflict (order_id, user_id, reason) where order_id is not null do nothing
        returning id
      `;
      if (refunded[0]) {
        await tx`update store_credits set balance = balance + ${dollars(creditCents)}, updated_at = now() where user_id = ${userId}`;
      }
    }
    await tx`
      update store_referral_rewards
      set status = 'cancelled', cancelled_at = now()
      where order_id = ${id} and status = 'pending'
    `;
    await tx`
      update store_promo_reservations
      set status = 'cancelled', cancelled_at = now()
      where order_id = ${id} and status = 'pending'
    `;
    await tx`insert into store_order_events (order_id, kind, note) values (${id}, 'cancelled', ${note})`;
  });
}

export const listOrders = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((data: { status?: string; method?: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api");
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string; reference: string; created_at: string; email: string; first_name: string;
      last_name: string; total: string | number; items: string; status: string;
      payment_method: string; payment_status: string; payment_ref: string | null; tracking: string | null;
      business_email: string | null; research_attested_at: string | null;
      first_order_review_required: boolean; first_order_review_status: string;
      first_order_reviewed_at: string | null;
       referral_code: string | null; payment_alert: string | null; payment_hold: boolean;
       refund_total: string | number; dispute_status: string | null;
    }>`
      select o.id, o.reference, o.created_at, o.email, o.first_name, o.last_name,
        o.total, o.items, o.status, o.payment_method, o.payment_status, o.payment_ref,
        o.tracking, o.business_email, o.research_attested_at, o.first_order_review_required,
        o.first_order_review_status, o.first_order_reviewed_at, o.referral_code,
        o.payment_hold, o.refund_total, o.dispute_status, (
        select e.note from store_order_events e
        where e.order_id = o.id and e.kind = 'payment_mismatch' limit 1
      ) as payment_alert
      from store_orders o
      where (${clean(data.status, 30)} = '' or o.status = ${clean(data.status, 30)})
        and (${clean(data.method, 30)} = '' or o.payment_method = ${clean(data.method, 30)})
      order by o.created_at desc limit 250
    `;
    return rows.map((row) => ({ ...row, email: maskedEmail(row.email) }));
  });

export const approveFirstOrderReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api");
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const approved = await sql<{ id: string }>`
      update store_orders
      set first_order_review_status = 'approved',
          first_order_reviewed_at = now(),
          first_order_reviewed_by = ${context.userId},
          updated_at = now()
      where id = ${data.id}
        and first_order_review_required = true
        and coalesce(first_order_review_status, 'pending') = 'pending'
        and payment_status = 'paid'
        and status <> 'cancelled'
      returning id
    `;
    if (!approved[0]) {
      const rows = await sql<{
        status: string;
        payment_status: string;
        first_order_review_required: boolean;
        first_order_review_status: string | null;
      }>`
        select status, payment_status, first_order_review_required, first_order_review_status
        from store_orders where id = ${data.id} limit 1
      `;
      if (!rows[0]) throw new Error("Order not found.");
      if (!rows[0].first_order_review_required) {
        throw new Error("This order does not require first-order research-use review.");
      }
      if (rows[0].status === "cancelled") throw new Error("Cancelled orders cannot be approved.");
      if (rows[0].payment_status !== "paid") {
        throw new Error("Confirm payment before approving first-order research-use review.");
      }
      if (rows[0].first_order_review_status === "approved") {
        return { ok: true as const, alreadyApproved: true };
      }
      throw new Error("This order is not awaiting first-order review.");
    }
    await sql`
      insert into store_order_events (order_id, kind, note)
      values (${data.id}, 'first_order_review_approved', 'Approved by administrator')
    `;
    return { ok: true as const, alreadyApproved: false };
  });

export const markOrderPaid = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((data: { id: string; paymentRef: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api");
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const method = await (await getSql())<{ payment_method: string }>`select payment_method from store_orders where id = ${data.id}`;
    if (!["zelle", "bitcoin", "ethereum"].includes(method[0]?.payment_method)) throw new Error("Only manual payments can be confirmed here.");
    if (!clean(data.paymentRef, 200)) throw new Error("A payment reference or transaction ID is required.");
    return settleOrder(data.id, { paymentRef: clean(data.paymentRef, 200) });
  });

export const markOrderShipped = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((data: { id: string; tracking: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api"); await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db"); const sql = await getSql();
    const shipped = await sql<{ id: string }>`
      update store_orders
      set status = 'shipped', shipped_at = now(), tracking = ${clean(data.tracking, 200)}, updated_at = now()
      where id = ${data.id}
        and payment_status = 'paid'
        and payment_hold = false
        and status not in ('cancelled', 'shipped')
        and (
          first_order_review_required = false
          or coalesce(first_order_review_status, 'pending') = 'approved'
        )
      returning id
    `;
    if (!shipped[0]) {
      const rows = await sql<{
        payment_status: string; payment_hold: boolean;
        status: string;
        first_order_review_required: boolean;
        first_order_review_status: string | null;
      }>`
        select payment_status, status, payment_hold, first_order_review_required, first_order_review_status
        from store_orders where id = ${data.id} limit 1
      `;
      if (!rows[0]) throw new Error("Order not found.");
      if (rows[0].payment_status !== "paid") {
        throw new Error("Only paid orders that have not already shipped can be marked shipped.");
      }
      if (rows[0].payment_hold) {
        throw new Error("This order is on payment hold after a refund or dispute review.");
      }
      if (rows[0].first_order_review_required &&
          rows[0].first_order_review_status !== "approved") {
        throw new Error("Approve the first-order research-use review before shipping this order.");
      }
      throw new Error("Only paid orders that have not already shipped can be marked shipped.");
    }
    await sql`insert into store_order_events (order_id, kind, note) values (${data.id}, 'shipped', ${clean(data.tracking, 200)})`;
    const { notifyOrder } = await import("@/lib/checkout/notify.server");
    await notifyOrder("shipped", data.id);
    return { ok: true as const };
  });

export const cancelOrder = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((data: { id: string; note?: string }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api"); await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db"); const sql = await getSql();
    const rows = await sql<{ user_id: string | null; credit_applied: string | number; payment_method: string; payment_status: string; stripe_session_id: string | null; stripe_session_state: string | null }>`
      select user_id, credit_applied, payment_method, payment_status, stripe_session_id, stripe_session_state from store_orders where id = ${data.id}
    `;
    const order = rows[0];
    if (!order) throw new Error("Order not found.");
    if (order.payment_status === "paid") throw new Error("Paid orders cannot be cancelled here. Refund it in Stripe or record the refund manually.");
    if (order.stripe_session_state === "creating") {
      throw new Error("Stripe checkout is being prepared. Try cancellation again shortly.");
    }
    if (order.payment_method === "stripe" && order.stripe_session_id) {
      // Close the hosted checkout so the customer cannot pay a cancelled order after their
      // applied credit has been returned. If they already paid, settle instead of cancelling.
      const { getUncachableStripeClient } = await import("@/lib/payments/stripe.server");
      const { settleStripeSession } = await import("@/lib/checkout/settle.server");
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      else if (session.status === "complete") {
        const outcome = await settleStripeSession(sql, session);
        throw new Error(outcome === "unpaid"
          ? "Stripe still shows this payment as pending; it cannot be cancelled until Stripe reports a final result."
          : "The customer already paid this order in Stripe; it has been marked paid instead of cancelled.");
      }
    }
    await cancelAndRefund(sql, data.id, order.user_id, Math.round(number(order.credit_applied) * 100), clean(data.note, 500) || "Cancelled by administrator");
    return { ok: true as const };
  });

export const loadPaymentSettings = createServerFn({ method: "GET" }).middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("@/lib/store-api"); await requireAdmin(context.userId);
    return settings();
  });

function validBtc(value: string) {
  return /^(bc1[ac-hj-np-z02-9]{11,71}|bc1p[ac-hj-np-z02-9]{58}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(value);
}

function validEth(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export const savePaymentSettings = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((data: {
    zelleRecipient?: string; zelleDisplayName?: string; btcAddress?: string; ethAddress?: string;
    cryptoRewardPercent?: string; paymentNotice?: string; salesTaxRatePercent?: string;
    taxNexusRegion?: string; supplierEmail?: string; ownerNotificationEmail?: string;
    incomeTaxReservePercent?: string;
  }) => data)
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("@/lib/store-api"); await requireAdmin(context.userId);
    const btc = clean(data.btcAddress, 100);
    const eth = clean(data.ethAddress, 100);
    const cryptoRewardPercent = Number(data.cryptoRewardPercent ?? 0);
    if (btc && !validBtc(btc)) throw new Error("Enter a valid Bitcoin bech32 or base58 address.");
    if (eth && !validEth(eth)) throw new Error("Enter a valid Ethereum 0x address.");
    if (!Number.isFinite(cryptoRewardPercent) || cryptoRewardPercent < 0 || cryptoRewardPercent > 100) {
      throw new Error("Crypto reward must be between 0% and 100%.");
    }
    const salesTaxRatePercent = Number(data.salesTaxRatePercent ?? 0);
    const incomeTaxReservePercent = Number(data.incomeTaxReservePercent ?? 4.95);
    if (!Number.isFinite(salesTaxRatePercent) || salesTaxRatePercent < 0 || salesTaxRatePercent > 20) {
      throw new Error("Sales tax estimate must be between 0% and 20%.");
    }
    if (!Number.isFinite(incomeTaxReservePercent) || incomeTaxReservePercent < 0 || incomeTaxReservePercent > 100) {
      throw new Error("Income-tax reserve estimate must be between 0% and 100%.");
    }
    const entries = [
      ["zelle_recipient", clean(data.zelleRecipient, 160)], ["zelle_display_name", clean(data.zelleDisplayName, 160)],
      ["btc_address", btc], ["eth_address", eth], ["crypto_reward_percent", String(cryptoRewardPercent)],
      ["payment_notice", clean(data.paymentNotice, 1000)],
      ["sales_tax_rate_percent", String(salesTaxRatePercent)],
      ["tax_nexus_region", clean(data.taxNexusRegion, 160) || "Illinois"],
      ["supplier_email", clean(data.supplierEmail, 254) || "Apex.nutrition2021@gmail.com"],
      ["owner_notification_email", clean(data.ownerNotificationEmail, 254) || "vitalitychems@gmail.com"],
      ["income_tax_reserve_percent", String(incomeTaxReservePercent)],
    ];
    const { getSql } = await import("@/lib/db"); const sql = await getSql();
    for (const [key, value] of entries) {
      await sql`insert into store_settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
    }
    return { ok: true as const };
  });