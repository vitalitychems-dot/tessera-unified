import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAdminEmail } from "@/lib/business";
import { findProduct } from "@/lib/catalog";
import { recommendationsFromFunnel } from "@/lib/growth";
import { KNOWN_PROMOS } from "@/lib/promo";
import { actionsFromMerch, scoreMerch } from "@/lib/optimizer";
import { boundedText, canonicalEmail } from "@/lib/public-input";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

async function requireVerifiedCustomer(userId: string) {
  const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
  return requireVerifiedUser(userId);
}

export async function requireAdmin(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string; emailVerified: boolean }>`
    select email, "emailVerified"
    from "user"
    where id = ${userId}
    limit 1
  `;
  if (!rows[0] || rows[0].emailVerified !== true || !isAdminEmail(rows[0].email)) {
    throw new ForbiddenError();
  }
  return rows[0].email;
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!domain) return "••••";
  return `${(local?.slice(0, 1) ?? "•")}••••@${domain}`;
}

function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 2 ? `••••••${digits.slice(-2)}` : "••••";
}

function maskAddress(value: string | null | undefined) {
  return value ? "Private shipping address" : null;
}

/** Certificate-of-analysis ticket from the Testing page (support, not marketing). */
export const saveCoaRequest = createServerFn({ method: "POST" })
  .validator((d: { email: string; compound: string; batch?: string }) => d)
  .handler(async ({ data }) => {
    const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const email = canonicalEmail(input.email);
    const compound = boundedText(input.compound, 120, true);
    const batch = boundedText(input.batch, 80);
    if (!email) {
      return { ok: false as const, error: "Enter a valid email address." };
    }
    if (!compound) return { ok: false as const, error: "Tell us which compound the COA is for." };
    const { getSql } = await import("@/lib/db");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    if (!await consumePublicBudget(sql, "coa", 60)) {
      return { ok: false as const, error: "Too many requests. Please try again later." };
    }
    await sql`
      with eligible as (
        insert into coa_request_limits (
          email_key, last_submitted_at, window_started_at, submission_count
        ) values (${email}, now(), now(), 1)
        on conflict (email_key) do update set
          last_submitted_at = now(),
          window_started_at = case
            when coa_request_limits.window_started_at < now() - interval '30 days' then now()
            else coa_request_limits.window_started_at
          end,
          submission_count = case
            when coa_request_limits.window_started_at < now() - interval '30 days' then 1
            else coa_request_limits.submission_count + 1
          end
        where coa_request_limits.last_submitted_at <= now() - interval '24 hours'
          and (coa_request_limits.window_started_at < now() - interval '30 days'
            or coa_request_limits.submission_count < 3)
        returning email_key
      )
      insert into coa_requests (email, compound, batch)
      select email_key, ${compound}, ${batch} from eligible
    `;
    return { ok: true as const };
  });

export const loadAdminDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();

    const counts = await sql<{ event: string; n: number }>`
       select event, count(*)::int as n from store_events
       where provenance = 'live'
         and (created_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
       group by event
    `;
    const countMap: Record<string, number> = {};
    for (const row of counts) countMap[row.event] = num(row.n);

    const sessions = await sql<{ n: number }>`
       select count(distinct session_id)::int as n from store_events
       where provenance = 'live'
         and (created_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
    `;
    const coaRequests = await sql<{
      id: number;
      created_at: string;
      email: string;
      compound: string;
      batch: string | null;
      resolved_at: string | null;
    }>`
      select id, created_at, email, compound, batch, resolved_at
      from coa_requests
      order by created_at desc
      limit 200
    `;
    const viewed = await sql<{ product_name: string; n: number }>`
      select product_name, count(*)::int as n
      from store_events
      where event = 'view_product' and product_name is not null
         and provenance = 'live'
         and (created_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
      group by product_name
      order by n desc
      limit 8
    `;
    const purchased = await sql<{ product_name: string; n: number }>`
      select product_name, count(*)::int as n
      from store_events
      where event in ('add_to_cart', 'purchase') and product_name is not null
         and provenance = 'live'
         and (created_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
      group by product_name
      order by n desc
      limit 8
    `;
    // Affiliate rows come straight from promo_codes/promo_redemptions. A query
    // failure surfaces as a dashboard error instead of zeroed placeholder rows.
    const affiliates = await sql<{
      code: string;
      kind: string;
      percent: number;
      label: string | null;
      partner: string | null;
      uses: number;
      revenue: string | number | null;
      gmv: string | number | null;
      commission: string | number | null;
    }>`
      select
        c.code,
        c.kind,
        c.percent,
        c.label,
        c.partner,
        coalesce(r.uses, 0)::int as uses,
        coalesce(r.revenue, 0) as revenue,
        coalesce(r.gmv, 0) as gmv,
        coalesce(r.commission, 0) as commission
      from promo_codes c
      left join (
        select
          code,
          count(*)::int as uses,
          sum(amount) as revenue,
          sum(coalesce(order_total, 0)) as gmv,
          sum(coalesce(commission, 0)) as commission
        from promo_redemptions
        group by code
      ) r on r.code = c.code
      where c.active = true
      order by c.kind, c.code
    `;

    const views = countMap.page_view ?? 0;
    const productViews = countMap.view_product ?? 0;
    const addToCarts = countMap.add_to_cart ?? 0;
    const checkouts = countMap.checkout_start ?? 0;
    // Paid orders only: unpaid attempts and cancelled orders are not revenue.
    const orderSummary = await sql<{ n: number; revenue: string | number | null }>`
      select count(*)::int as n, coalesce(sum(total), 0) as revenue
      from store_orders
      where payment_status = 'paid'
        and status <> 'cancelled'
        and (paid_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
    `;
    const orderCount = num(orderSummary[0]?.n);
    const uniqueSessions = num(sessions[0]?.n);
    const revenue = num(orderSummary[0]?.revenue);
    const conversion = uniqueSessions ? orderCount / uniqueSessions : 0;

    return {
      kpis: {
        sessions: uniqueSessions,
        views,
        productViews,
        addToCarts,
        checkouts,
        orders: orderCount,
        revenue,
        conversion,
        provenance: "live event funnel and paid settlement truth",
        window: "current America/Chicago calendar day",
        noLiveData: uniqueSessions === 0,
        lastUpdatedAt: new Date().toISOString(),
      },
       coaRequests: coaRequests.map((request) => ({ ...request, email: maskEmail(request.email) ?? "Private" })),
      topViewed: viewed.map((v) => ({ name: v.product_name, n: num(v.n) })),
      topPurchased: purchased.map((v) => ({ name: v.product_name, n: num(v.n) })),
      affiliates: affiliates.map((a) => ({
        ...a,
        percent: num(a.percent),
        uses: num(a.uses),
        revenue: num(a.revenue),
        gmv: num(a.gmv),
        commission: num(a.commission),
        net: num(a.gmv) - num(a.commission),
      })),
      grok: await runOptimizerInner(sql, {
        sessions: uniqueSessions,
        addToCarts,
        checkouts,
        orders: orderCount,
      }),
      tips: recommendationsFromFunnel({
        views: uniqueSessions || views,
        productViews,
        addToCarts,
        checkouts,
        orders: orderCount,
        topViewed: viewed.map((v) => v.product_name),
        topPurchased: purchased.map((v) => v.product_name),
      }),
    };
  });

export const loadAdminOperations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const { orderEmailQueueSnapshot } = await import("@/lib/checkout/notify.server");
    const { stripeEventSnapshot } = await import("@/lib/stripe-events.server");
    const sql = await getSql();
    const [email, stripe, workers, deadEvents, deadEmails, adjustments, unsettled] = await Promise.all([
      orderEmailQueueSnapshot(sql),
      stripeEventSnapshot(sql),
      sql<{
        worker: string;
        last_seen_at: string;
        last_success_at: string | null;
        last_error: string | null;
        processed_count: number;
      }>`
        select worker, last_seen_at, last_success_at, last_error, processed_count
        from worker_heartbeats order by worker
      `,
      sql<{
        id: string;
        type: string;
        object_id: string | null;
        attempts: number;
        last_error: string | null;
        updated_at: string;
      }>`
        select id, type, object_id, attempts, last_error, updated_at
        from stripe_event_ledger where status = 'dead'
        order by updated_at desc limit 25
      `,
      sql<{
        id: number;
        order_id: string;
        kind: string;
        attempts: number;
        last_error: string | null;
        updated_at: string;
      }>`
        select id, order_id, kind, attempts, last_error, updated_at
        from store_order_emails where status = 'dead'
        order by updated_at desc limit 25
      `,
      sql<{
        id: number;
        kind: string;
        amount: string | number;
        currency: string | null;
        order_id: string | null;
        status: string;
        created_at: string;
      }>`
        select id, kind, amount, currency, order_id, status, created_at
        from payment_adjustments order by created_at desc limit 25
      `,
      sql<{ n: number }>`
        select count(*)::int as n
        from store_orders
        where payment_method = 'stripe'
          and payment_status = 'unpaid'
          and status <> 'cancelled'
          and created_at < now() - interval '15 minutes'
      `,
    ]);
    return {
      email,
      stripe,
      workers,
      deadEvents,
      deadEmails,
      adjustments: adjustments.map((row) => ({ ...row, amount: num(row.amount) })),
      unsettledStripeOrders: num(unsettled[0]?.n),
    };
  });

export const retryAdminStripeEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const id = boundedText(data.id, 200);
    if (!id) throw new Error("Event id is required.");
    const { getSql } = await import("@/lib/db");
    const { retryStripeEvent } = await import("@/lib/stripe-events.server");
    await retryStripeEvent(await getSql(), id);
    return { ok: true as const };
  });

export const retryAdminOrderEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const id = Math.trunc(Number(data.id));
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Email id is required.");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update store_order_emails
      set status = 'queued', attempts = 0, last_error = null,
        lease_expires_at = null, next_attempt_at = null, updated_at = now()
      where id = ${id} and sent_at is null
    `;
    return { ok: true as const };
  });

type AdminCustomerPage = {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  customers: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    region: string | null;
    postal: string | null;
    country: string | null;
    credits: number;
    orderCount: number;
    lastOrderAt: string | null;
  }[];
};

/**
 * Explicit, bounded customer list for the staff customer tab. This endpoint
 * intentionally selects only public identity/contact fields; Better Auth
 * password records live in the account table and are never selected or
 * serialized here.
 */
export const listAdminCustomers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { page?: number; pageSize?: number; search?: string }) => data)
  .handler(async ({ context, data }): Promise<AdminCustomerPage> => {
    await requireAdmin(context.userId);
    const page = Math.min(10_000, Math.max(1, Math.floor(Number(data.page) || 1)));
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(data.pageSize) || 25)));
    const search = boundedText(data.search, 100)?.toLowerCase() ?? "";
    const offset = (page - 1) * pageSize;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      email: string;
      email_verified: boolean;
      created_at: string;
      phone: string | null;
      address: string | null;
      city: string | null;
      region: string | null;
      postal: string | null;
      country: string | null;
      credits: string | number | null;
      order_count: number | string;
      last_order_at: string | null;
      total_count: number | string;
    }>`
      select
        u.id,
        u.name,
        u.email,
        u."emailVerified" as email_verified,
        u."createdAt" as created_at,
        latest.phone,
        latest.address,
        latest.city,
        latest.region,
        latest.postal,
        latest.country,
        coalesce(c.balance, 0) as credits,
        (
          select count(*)::int
          from store_orders o
          where o.user_id = u.id
             or (o.user_id is null and lower(o.email) = lower(u.email))
        ) as order_count,
        latest.created_at as last_order_at,
        count(*) over()::int as total_count
      from "user" u
      left join store_credits c on c.user_id = u.id
      left join lateral (
        select o.phone, o.address, o.city, o.region, o.postal, o.country, o.created_at
        from store_orders o
        where o.user_id = u.id
           or (o.user_id is null and lower(o.email) = lower(u.email))
        order by o.created_at desc
        limit 1
      ) latest on true
      where (
        ${search} = ''
        or lower(u.name) like '%' || ${search} || '%'
        or lower(u.email) like '%' || ${search} || '%'
      )
      order by u."createdAt" desc
      limit ${pageSize} offset ${offset}
    `;
    const total = num(rows[0]?.total_count);
    return {
      page,
      pageSize,
      total,
      hasNext: offset + rows.length < total,
      customers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: maskEmail(row.email) ?? "Private",
        emailVerified: row.email_verified === true,
        createdAt: row.created_at,
        phone: maskPhone(row.phone),
        address: maskAddress(row.address),
        city: row.address ? "Private" : null,
        region: row.address ? "Private" : null,
        postal: row.address ? "Private" : null,
        country: row.address ? "Private" : null,
        credits: num(row.credits),
        orderCount: num(row.order_count),
        lastOrderAt: row.last_order_at,
      })),
    };
  });

export const loadAdminCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { userId: string; page?: number; pageSize?: number; reveal?: boolean }) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const userId = boundedText(data.userId, 120);
    if (!userId) throw new Error("Customer id is required.");
    const page = Math.min(10_000, Math.max(1, Math.floor(Number(data.page) || 1)));
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(data.pageSize) || 25)));
    const reveal = data.reveal === true;
    const offset = (page - 1) * pageSize;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{
      id: string;
      name: string;
      email: string;
      email_verified: boolean;
      created_at: string;
      credits: string | number | null;
      business_email: string | null;
    }>`
      select
        u.id,
        u.name,
        u.email,
        u."emailVerified" as email_verified,
        u."createdAt" as created_at,
        coalesce(c.balance, 0) as credits,
        p.business_email
      from "user" u
      left join store_credits c on c.user_id = u.id
      left join store_customer_profiles p on p.user_id = u.id
      where u.id = ${userId}
      limit 1
    `;
    const customer = users[0];
    if (!customer) throw new Error("Customer not found.");
    if (reveal) {
      await sql`
        insert into staff_access_audit (actor_user_id, action, subject_id)
        values (${context.userId}, 'reveal_customer_contact', ${customer.id})
      `;
    }
    const orders = await sql<{
      id: string;
      reference: string | null;
      created_at: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      address: string;
      city: string;
      region: string | null;
      postal: string;
      country: string;
      total: string | number;
      items: string;
      status: string;
      payment_status: string;
      payment_method: string | null;
      credit_applied: string | number | null;
      credit_earned: string | number | null;
      total_count: number | string;
    }>`
      select
        o.id, o.reference, o.created_at, o.email, o.first_name, o.last_name,
        o.phone, o.address, o.city, o.region, o.postal, o.country, o.total,
        o.items, o.status, o.payment_status, o.payment_method, o.credit_applied,
        o.credit_earned, count(*) over()::int as total_count
      from store_orders o
      where o.user_id = ${customer.id}
         or (o.user_id is null and lower(o.email) = lower(${customer.email}))
      order by o.created_at desc
      limit ${pageSize} offset ${offset}
    `;
    const total = num(orders[0]?.total_count);
    return {
      customer: {
        id: customer.id,
        name: customer.name,
         email: reveal ? customer.email : (maskEmail(customer.email) ?? "Private"),
        emailVerified: customer.email_verified === true,
        createdAt: customer.created_at,
         phone: reveal ? orders[0]?.phone ?? null : maskPhone(orders[0]?.phone),
         address: reveal ? orders[0]?.address ?? null : maskAddress(orders[0]?.address),
         city: reveal ? orders[0]?.city ?? null : orders[0]?.address ? "Private" : null,
         region: reveal ? orders[0]?.region ?? null : orders[0]?.address ? "Private" : null,
         postal: reveal ? orders[0]?.postal ?? null : orders[0]?.address ? "Private" : null,
         country: reveal ? orders[0]?.country ?? null : orders[0]?.address ? "Private" : null,
         businessEmail: reveal ? customer.business_email : maskEmail(customer.business_email),
        credits: num(customer.credits),
      },
      orders: orders.map((order) => ({
        id: order.id,
        reference: order.reference,
        createdAt: order.created_at,
         email: reveal ? order.email : (maskEmail(order.email) ?? "Private"),
        name: `${order.first_name} ${order.last_name}`.trim(),
         phone: reveal ? order.phone : maskPhone(order.phone),
         address: reveal ? order.address : (maskAddress(order.address) ?? "Private"),
         city: reveal ? order.city : "Private",
         region: reveal ? order.region : "Private",
         postal: reveal ? order.postal : "Private",
         country: reveal ? order.country : "Private",
        total: num(order.total),
        items: order.items,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        creditApplied: num(order.credit_applied),
        creditEarned: num(order.credit_earned),
      })),
      page,
      pageSize,
      total,
      hasNext: offset + orders.length < total,
    };
  });

export const validatePromo = createServerFn({ method: "POST" })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) return { ok: false as const };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{
        code: string;
        kind: string;
        percent: number;
        label: string | null;
      }>`
        select code, kind, percent, label from promo_codes
        where code = ${code} and active = true
        limit 1
      `;
      const row = rows[0];
      if (row) {
        return {
          ok: true as const,
          code: row.code,
          kind: row.kind,
          percent: num(row.percent),
          label: row.label ?? "Discount",
        };
      }
    } catch {
      /* table may not exist yet */
    }
    const known = KNOWN_PROMOS[code];
    if (known) {
      return {
        ok: true as const,
        code,
        kind: known.kind,
        percent: known.percent,
        label: known.label,
        firstOrderOnly: known.firstOrderOnly,
      };
    }
    return { ok: false as const };
  });

export const createPromoCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { code: string; kind: "promo" | "affiliate"; percent: number; partner?: string; label?: string }) =>
      d,
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const code = data.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{4,20}$/.test(code)) return { ok: false as const, error: "Use 4–20 letters or numbers." };
    const percent = Math.min(40, Math.max(1, Math.round((Number(data.percent) || 10) * 2) / 2));
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into promo_codes (code, kind, percent, label, partner)
      values (
        ${code},
        ${data.kind},
        ${percent},
        ${data.label?.trim() || null},
        ${data.partner?.trim() || null}
      )
      on conflict (code) do update set
        kind = excluded.kind,
        percent = excluded.percent,
        label = excluded.label,
        partner = excluded.partner,
        active = true
    `;
    return { ok: true as const, code };
  });

export const loadMyAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireVerifiedCustomer(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string | null }>`
      select email from "user" where id = ${context.userId} limit 1
    `;
    const email = (users[0]?.email ?? "").trim().toLowerCase();
    let profile: { businessEmail: string; einProvided: boolean } = {
      businessEmail: "",
      einProvided: false,
    };
    try {
      const rows = await sql<{ business_email: string | null; ein_fingerprint: string | null }>`
        select business_email, ein_fingerprint
        from store_customer_profiles
        where user_id = ${context.userId}
        limit 1
      `;
      profile = {
        businessEmail: rows[0]?.business_email ?? "",
        einProvided: Boolean(rows[0]?.ein_fingerprint),
      };
    } catch {
      /* profile migration may not have been applied yet */
    }
    let balance = 0;
    let ledger: {
      id: number;
      delta: number;
      reason: string;
      created_at: string;
      order_id: string | null;
    }[] = [];
    try {
      const credit = await sql<{ balance: string | number }>`
        select balance from store_credits where user_id = ${context.userId} limit 1
      `;
      balance = num(credit[0]?.balance);
      const rows = await sql<{
        id: number;
        delta: string | number;
        reason: string;
        created_at: string;
        order_id: string | null;
      }>`
        select id, delta, reason, created_at, order_id
        from store_credit_ledger
        where user_id = ${context.userId}
        order by created_at desc
        limit 30
      `;
      ledger = rows.map((r) => ({
        id: r.id,
        delta: num(r.delta),
        reason: r.reason,
        created_at: r.created_at,
        order_id: r.order_id,
      }));
    } catch {
      /* table may not exist yet */
    }
    let orders: {
      id: string;
      reference: string | null;
      created_at: string;
      total: number;
      credit_applied: number;
      credit_earned: number;
      items: string;
      status: string;
      payment_status: string;
      payment_method: string | null;
    }[] = [];
    try {
      const rows = await sql<{
        id: string;
        reference: string | null;
        created_at: string;
        total: string | number;
        credit_applied: string | number | null;
        credit_earned: string | number | null;
        items: string;
        status: string;
        payment_status: string;
        payment_method: string | null;
      }>`
        select id, reference, created_at, total, credit_applied, credit_earned, items, status,
          payment_status, payment_method
        from store_orders
        where user_id = ${context.userId}
        order by created_at desc
        limit 50
      `;
      orders = rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        created_at: r.created_at,
        total: num(r.total),
        credit_applied: num(r.credit_applied),
        credit_earned: num(r.credit_earned),
        items: r.items,
        status: r.status,
        payment_status: r.payment_status,
        payment_method: r.payment_method,
      }));
    } catch {
      /* ignore */
    }
    let affiliates: { code: string; percent: number; redemptions: number; merch: number }[] = [];
    try {
      const rows = await sql<{
        code: string;
        percent: string | number;
        redemptions: string | number;
        merch: string | number;
      }>`
        select c.code, c.percent,
          (select count(*) from promo_redemptions r where r.code = c.code) as redemptions,
          (select coalesce(sum(merch),0) from promo_redemptions r where r.code = c.code) as merch
        from promo_codes c
        where c.owner_id = ${context.userId} and c.kind = 'affiliate'
      `;
      affiliates = rows.map((r) => ({
        code: r.code,
        percent: num(r.percent),
        redemptions: num(r.redemptions),
        merch: num(r.merch),
      }));
    } catch {
      affiliates = [];
    }
    return { email, balance, ledger, orders, affiliates, profile };
  });

export {
  quoteCart, loadPaymentOptions, createOrder, loadOrder, claimPayment, refreshCryptoQuote,
  claimGuestOrders,
  listOrders, approveFirstOrderReview, markOrderPaid, markOrderShipped, cancelOrder,
  loadPaymentSettings, savePaymentSettings,
  saveMyBusinessProfile, loadMyBusinessProfile,
} from "@/lib/checkout/api";

export {
  loadManagerState,
  runManagerAudit,
  rollbackManagerActionApi,
  updateManagerSetting,
  askStoreManager,
  loadPublicNewsletterDelay,
} from "@/lib/manager-api";

export { createSubscriptionCheckout, quoteSubscription } from "@/lib/subscriptions-api";
export {
  submitPartnerContact,
  submitInvestorContact,
  loadContactSubmissions,
  loadInvestorSnapshot,
} from "@/lib/public-contact-api";

type SqlClient = Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>;

async function runOptimizerInner(
  sql: SqlClient,
  kpis: { sessions: number; addToCarts: number; checkouts: number; orders: number },
) {
  const stats = await sql<{
    product_id: string;
    product_name: string | null;
    event: string;
    n: number;
  }>`
    select product_id, max(product_name) as product_name, event, count(*)::int as n
    from store_events
    where product_id is not null
      and event in ('view_product', 'add_to_cart', 'purchase')
      and provenance = 'live'
        and (created_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
    group by product_id, event
  `;
  const byName = new Map<
    string,
    { productId: string; productName: string; views: number; carts: number; purchases: number }
  >();
  for (const row of stats) {
    const cur = byName.get(row.product_id) ?? {
      productId: row.product_id,
      productName: findProduct(row.product_id)?.name ?? row.product_name ?? row.product_id,
      views: 0,
      carts: 0,
      purchases: 0,
    };
    if (row.event === "view_product") cur.views += num(row.n);
    if (row.event === "add_to_cart") cur.carts += num(row.n);
    if (row.event === "purchase") cur.purchases += num(row.n);
    byName.set(row.product_id, cur);
  }
  const merch = [...byName.values()].map((r) => ({
    ...r,
    score: scoreMerch(r.views, r.carts, r.purchases),
  }));
  merch.sort((a, b) => b.score - a.score);
  try {
    for (const r of merch) {
      await sql`
        insert into merch_rank (product_id, product_name, views, carts, purchases, score, updated_at)
        values (${r.productId}, ${r.productName}, ${r.views}, ${r.carts}, ${r.purchases}, ${r.score}, now())
        on conflict (product_id) do update set
          product_name = excluded.product_name,
          views = excluded.views,
          carts = excluded.carts,
          purchases = excluded.purchases,
          score = excluded.score,
          updated_at = now()
      `;
    }
  } catch {
    /* first boot before 0005 */
  }
  const actions = actionsFromMerch(merch, kpis);
  try {
    await sql`delete from grok_actions`;
    for (const a of actions) {
      await sql`
        insert into grok_actions (title, body, applied)
        values (${a.title}, ${a.body}, ${a.applied})
      `;
    }
  } catch {
    /* ignore */
  }
  return { merch: merch.slice(0, 16), actions };
}

export const loadLiveMerch = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      product_id: string;
      product_name: string | null;
      score: number | string;
    }>`
      select product_id, product_name, score
      from merch_rank
      order by score desc, updated_at desc
      limit 16
    `;
    return rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name ?? findProduct(row.product_id)?.name ?? row.product_id,
      score: num(row.score),
    }));
  } catch {
    return [];
  }
});

export const saveWholesaleLead = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      company?: string;
      email: string;
      phone?: string;
      budget?: string;
      notes?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const email = canonicalEmail(input.email);
    const name = boundedText(input.name, 120, true);
    const company = boundedText(input.company, 160);
    const phone = boundedText(input.phone, 40);
    const budget = boundedText(input.budget, 40);
    const notes = boundedText(input.notes, 2_000);
    const validBudget = new Set(["10 vials", "50 vials", "100 vials", "Mixed SKU / not sure"]);
    const validPhone = !phone || /^[+0-9().\s-]{7,40}$/.test(phone);
    if (!email || !name || !validPhone || (budget !== null && !validBudget.has(budget))) {
      return { ok: false as const, error: "We could not process that request." };
    }
    const { getSql } = await import("@/lib/db");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    try {
      if (!await consumePublicBudget(sql, "wholesale", 60)) {
        return { ok: false as const, error: "Too many requests. Please try again later." };
      }
      // The gate and insert are one statement: ON CONFLICT serialises requests
      // by canonical email across all app instances. A valid duplicate gets the
      // same generic response without creating another lead.
      await sql`
        with eligible as (
          insert into wholesale_lead_keys (
            email_key, last_submitted_at, window_started_at, submission_count
          )
          values (${email}, now(), now(), 1)
          on conflict (email_key) do update set
            last_submitted_at = now(),
            window_started_at = case
              when wholesale_lead_keys.window_started_at < now() - interval '30 days'
                then now()
              else wholesale_lead_keys.window_started_at
            end,
            submission_count = case
              when wholesale_lead_keys.window_started_at < now() - interval '30 days'
                then 1
              else wholesale_lead_keys.submission_count + 1
            end
          where wholesale_lead_keys.last_submitted_at <= now() - interval '24 hours'
            and (
              wholesale_lead_keys.window_started_at < now() - interval '30 days'
              or wholesale_lead_keys.submission_count < 3
            )
          returning email_key
        )
        insert into wholesale_leads (name, company, email, phone, budget, notes)
        select ${name}, ${company}, ${email}, ${phone}, ${budget}, ${notes}
        from eligible
      `;
    } catch {
      return { ok: false as const, error: "We could not process that request. Please try again later." };
    }
    return { ok: true as const };
  });

export const createMyAffiliateCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    await requireVerifiedCustomer(context.userId);
    const code = data.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      return { ok: false as const, error: "Use 4–12 letters or numbers." };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string | null }>`
      select email from "user" where id = ${context.userId} limit 1
    `;
    try {
      await sql`
        insert into promo_codes (code, kind, percent, label, partner, owner_id, commission)
        values (
          ${code},
          ${"affiliate"},
          ${5},
          ${"Affiliate buyer rate"},
          ${users[0]?.email ?? null},
          ${context.userId},
          ${12.5}
        )
      `;
    } catch {
      return { ok: false as const, error: "That code is taken. Try another." };
    }
    return { ok: true as const, code };
  });

/**
 * Customer referral codes are issued only to the verified Better Auth user.
 * There is deliberately no email-based claim path: a guest must sign in first.
 */
export const loadMyReferralCode = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireVerifiedCustomer(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string | null; emailVerified: boolean }>`
      select email, "emailVerified" from "user" where id = ${context.userId} limit 1
    `;
    if (!users[0] || users[0].emailVerified !== true || !users[0].email?.trim()) {
      throw new Error("Verify your account email before receiving a customer referral code.");
    }
    const existing = await sql<{ code: string }>`
      select code from promo_codes
      where owner_id = ${context.userId} and kind = 'referral' and active = true
      order by created_at asc
      limit 1
    `;
    if (existing[0]) return { code: existing[0].code };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `VS${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      try {
        const created = await sql<{ code: string }>`
          insert into promo_codes (
            code, kind, percent, label, partner, owner_id, commission
          ) values (
            ${code}, 'referral', 5, 'Customer referral', 'Customer referral', ${context.userId}, 10
          )
          on conflict (code) do nothing
          returning code
        `;
        if (created[0]) return { code: created[0].code };
      } catch {
        const raced = await sql<{ code: string }>`
          select code from promo_codes
          where owner_id = ${context.userId} and kind = 'referral' and active = true
          order by created_at asc limit 1
        `;
        if (raced[0]) return { code: raced[0].code };
      }
    }
    throw new Error("Could not issue a referral code. Try again later.");
  });
