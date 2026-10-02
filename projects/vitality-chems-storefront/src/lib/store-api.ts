import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAdminEmail } from "@/lib/business";
import { recommendationsFromFunnel } from "@/lib/growth";
import { KNOWN_PROMOS } from "@/lib/promo";
import { CREDIT_RATE, money } from "@/lib/pricing";
import { actionsFromMerch, scoreMerch } from "@/lib/optimizer";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

async function requireAdmin(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string }>`
    select email from "user" where id = ${userId} limit 1
  `;
  if (!isAdminEmail(rows[0]?.email)) throw new ForbiddenError();
  return rows[0].email;
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const trackEvent = createServerFn({ method: "POST" })
  .validator(
    (d: {
      sessionId: string;
      event: string;
      path?: string;
      productId?: string;
      productName?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const event = String(data.event).slice(0, 40);
    const sessionId = String(data.sessionId).slice(0, 80);
    if (!event || !sessionId) return { ok: false as const };
    await sql`
      insert into store_events (session_id, event, path, product_id, product_name)
      values (
        ${sessionId},
        ${event},
        ${data.path?.slice(0, 200) ?? null},
        ${data.productId?.slice(0, 120) ?? null},
        ${data.productName?.slice(0, 120) ?? null}
      )
    `;
    return { ok: true as const };
  });

export const placeResearchOrder = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: string;
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
      subtotal: number;
      shipping: number;
      discount: number;
      total: number;
      items: string;
      sessionId?: string;
      promoCode?: string;
      userId?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@") || !data.firstName.trim() || !data.address.trim()) {
      return { ok: false as const, error: "Incomplete laboratory order form." };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into store_orders (
        id, email, first_name, last_name, lab, phone, address, city, region, postal, country,
        subtotal, shipping, discount, total, items, promo_code
      ) values (
        ${data.id},
        ${email},
        ${data.firstName.trim()},
        ${data.lastName.trim()},
        ${data.lab?.trim() || null},
        ${data.phone?.trim() || null},
        ${data.address.trim()},
        ${data.city.trim()},
        ${data.region?.trim() || null},
        ${data.postal.trim()},
        ${data.country.trim() || "United States"},
        ${data.subtotal},
        ${data.shipping},
        ${data.discount},
        ${data.total},
        ${data.items},
        ${data.promoCode?.trim().toUpperCase() || null}
      )
    `;
    const promo = data.promoCode?.trim().toUpperCase();
    if (promo) {
      const merch = Math.max(0, data.subtotal - data.discount);
      let percent = 10;
      let ownerId: string | null = null;
      let kind = "promo";
      try {
        const rows = await sql<{ percent: number; owner_id: string | null; kind: string }>`
          select percent, owner_id, kind from promo_codes where code = ${promo} and active = true limit 1
        `;
        if (rows[0]) {
          percent = num(rows[0].percent);
          ownerId = rows[0].owner_id;
          kind = rows[0].kind;
        }
      } catch {
        const known = KNOWN_PROMOS[promo];
        if (known) percent = known.percent;
      }
      const commission = money(merch * (percent / 100));
      try {
        await sql`
          insert into promo_redemptions (code, order_id, email, amount, order_total, merch, commission)
          values (
            ${promo},
            ${data.id},
            ${email},
            ${data.discount},
            ${data.total},
            ${merch},
            ${commission}
          )
        `;
      } catch {
        try {
          await sql`
            insert into promo_redemptions (code, order_id, email, amount)
            values (${promo}, ${data.id}, ${email}, ${data.discount})
          `;
        } catch {
          /* table may not exist yet */
        }
      }
      if (ownerId && kind === "affiliate") {
        try {
          const prior = await sql<{ merch: string | number }>`
            select coalesce(sum(merch), 0) as merch from promo_redemptions where code = ${promo}
          `;
          const lifetime = num(prior[0]?.merch);
          const rate = lifetime >= 5000 ? 0.15 : lifetime >= 1000 ? 0.125 : 0.1;
          const credit = money(merch * rate);
          const owner = await sql<{ email: string | null }>`
            select email from "user" where id = ${ownerId} limit 1
          `;
          await sql`
            insert into store_credits (user_id, email, balance, updated_at)
            values (${ownerId}, ${owner[0]?.email ?? null}, ${credit}, now())
            on conflict (user_id) do update set
              balance = store_credits.balance + ${credit},
              updated_at = now()
          `;
          await sql`
            insert into store_credit_ledger (user_id, order_id, delta, reason)
            values (${ownerId}, ${data.id}, ${credit}, ${"affiliate"})
          `;
        } catch {
          /* credits table may not exist */
        }
      }
    }
    if (data.userId) {
      try {
        await sql`update store_orders set user_id = ${data.userId} where id = ${data.id}`;
      } catch {
        /* column may not exist yet */
      }
    }
    if (data.sessionId) {
      await sql`
        insert into store_events (session_id, event, path, meta)
        values (${data.sessionId.slice(0, 80)}, ${"purchase"}, ${"/checkout"}, ${data.id})
      `;
    }
    return { ok: true as const };
  });

export const saveSubscriber = createServerFn({ method: "POST" })
  .validator(
    (d: {
      email: string;
      name?: string;
      setId?: string;
      setName?: string;
      cadence?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into store_subscribers (email, name, set_id, set_name, cadence)
      values (
        ${email},
        ${data.name?.trim() || null},
        ${data.setId ?? null},
        ${data.setName ?? null},
        ${data.cadence ?? null}
      )
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
      select event, count(*)::int as n from store_events group by event
    `;
    const countMap: Record<string, number> = {};
    for (const row of counts) countMap[row.event] = num(row.n);

    const sessions = await sql<{ n: number }>`
      select count(distinct session_id)::int as n from store_events
    `;
    const orders = await sql<{
      id: string;
      created_at: string;
      email: string;
      first_name: string;
      last_name: string;
      lab: string | null;
      phone: string | null;
      address: string;
      city: string;
      region: string | null;
      postal: string;
      country: string;
      total: string | number;
      items: string;
      status: string;
      promo_code: string | null;
      credit_applied: string | number | null;
      credit_earned: string | number | null;
    }>`
      select id, created_at, email, first_name, last_name, lab, phone, address, city, region, postal, country, total, items, status, promo_code, credit_applied, credit_earned
      from store_orders
      order by created_at desc
      limit 200
    `;
    const subscribers = await sql<{
      id: number;
      created_at: string;
      email: string;
      name: string | null;
      set_name: string | null;
      cadence: string | null;
    }>`
      select id, created_at, email, name, set_name, cadence
      from store_subscribers
      order by created_at desc
      limit 200
    `;
    const viewed = await sql<{ product_name: string; n: number }>`
      select product_name, count(*)::int as n
      from store_events
      where event = 'view_product' and product_name is not null
      group by product_name
      order by n desc
      limit 8
    `;
    const purchased = await sql<{ product_name: string; n: number }>`
      select product_name, count(*)::int as n
      from store_events
      where event in ('add_to_cart', 'purchase') and product_name is not null
      group by product_name
      order by n desc
      limit 8
    `;
    let affiliates: {
      code: string;
      kind: string;
      percent: number;
      label: string | null;
      partner: string | null;
      uses: number;
      revenue: string | number | null;
      gmv: string | number | null;
      commission: string | number | null;
    }[] = [];
    try {
      affiliates = await sql`
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
    } catch {
      affiliates = Object.entries(KNOWN_PROMOS).map(([code, k]) => ({
        code,
        kind: k.kind,
        percent: k.percent,
        label: k.label,
        partner: null,
        uses: 0,
        revenue: 0,
        gmv: 0,
        commission: 0,
      }));
    }
    const revenueRow = await sql<{ s: string | number | null }>`
      select coalesce(sum(total), 0) as s from store_orders
    `;

    let credits: { email: string | null; balance: number; user_id: string }[] = [];
    try {
      const rows = await sql<{ email: string | null; balance: string | number; user_id: string }>`
        select user_id, email, balance from store_credits order by balance desc
      `;
      credits = rows.map((r) => ({
        user_id: r.user_id,
        email: r.email,
        balance: num(r.balance),
      }));
    } catch {
      credits = [];
    }

    const views = countMap.page_view ?? 0;
    const productViews = countMap.view_product ?? 0;
    const addToCarts = countMap.add_to_cart ?? 0;
    const checkouts = countMap.checkout_start ?? 0;
    const orderCount = orders.length;
    const uniqueSessions = num(sessions[0]?.n);
    const revenue = num(revenueRow[0]?.s);
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
      },
      orders: orders.map((o) => ({
        ...o,
        total: num(o.total),
        credit_applied: num(o.credit_applied),
        credit_earned: num(o.credit_earned),
      })),
      subscribers,
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
      credits,
      grok: await runOptimizerInner(sql, {
        sessions: uniqueSessions,
        addToCarts,
        checkouts,
        orders: orderCount,
      }).catch(() => ({ merch: [], actions: [] })),
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

export const loadMyCredit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ balance: string | number }>`
        select balance from store_credits where user_id = ${context.userId} limit 1
      `;
      return { balance: num(rows[0]?.balance) };
    } catch {
      return { balance: 0 };
    }
  });

export const loadMyAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string | null }>`
      select email from "user" where id = ${context.userId} limit 1
    `;
    const email = (users[0]?.email ?? "").trim().toLowerCase();
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
      created_at: string;
      total: number;
      credit_applied: number;
      credit_earned: number;
      items: string;
      status: string;
    }[] = [];
    try {
      const rows = await sql<{
        id: string;
        created_at: string;
        total: string | number;
        credit_applied: string | number | null;
        credit_earned: string | number | null;
        items: string;
        status: string;
      }>`
        select id, created_at, total, credit_applied, credit_earned, items, status
        from store_orders
        where user_id = ${context.userId}
           or (${email} <> '' and lower(email) = ${email})
        order by created_at desc
        limit 50
      `;
      orders = rows.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        total: num(r.total),
        credit_applied: num(r.credit_applied),
        credit_earned: num(r.credit_earned),
        items: r.items,
        status: r.status,
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
    return { email, balance, ledger, orders, affiliates };
  });

export const settleCredits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { orderId: string; apply: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string | null }>`
      select email from "user" where id = ${context.userId} limit 1
    `;
    const email = users[0]?.email ?? null;
    const orders = await sql<{
      subtotal: string | number;
      discount: string | number;
      total: string | number;
    }>`
      select subtotal, discount, total from store_orders where id = ${data.orderId} limit 1
    `;
    const order = orders[0];
    if (!order) return { ok: false as const, applied: 0, earned: 0, balance: 0 };
    const merch = Math.max(0, num(order.subtotal) - num(order.discount));
    let balance = 0;
    try {
      const existing = await sql<{ balance: string | number }>`
        select balance from store_credits where user_id = ${context.userId} limit 1
      `;
      balance = num(existing[0]?.balance);
    } catch {
      return { ok: false as const, applied: 0, earned: 0, balance: 0 };
    }
    const applied = data.apply ? money(Math.min(balance, merch)) : 0;
    const earned = money(merch * CREDIT_RATE);
    const next = money(balance - applied + earned);
    await sql`
      insert into store_credits (user_id, email, balance, updated_at)
      values (${context.userId}, ${email}, ${next}, now())
      on conflict (user_id) do update set
        email = excluded.email,
        balance = ${next},
        updated_at = now()
    `;
    if (applied > 0) {
      await sql`
        insert into store_credit_ledger (user_id, order_id, delta, reason)
        values (${context.userId}, ${data.orderId}, ${-applied}, ${"applied"})
      `;
    }
    if (earned > 0) {
      await sql`
        insert into store_credit_ledger (user_id, order_id, delta, reason)
        values (${context.userId}, ${data.orderId}, ${earned}, ${"earned"})
      `;
    }
    await sql`
      update store_orders set
        user_id = ${context.userId},
        credit_applied = ${applied},
        credit_earned = ${earned},
        total = ${money(num(order.total) - applied)}
      where id = ${data.orderId}
    `;
    return { ok: true as const, applied, earned, balance: next };
  });

type SqlClient = Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>;

async function runOptimizerInner(
  sql: SqlClient,
  kpis: { sessions: number; addToCarts: number; checkouts: number; orders: number },
) {
  const stats = await sql<{
    product_id: string | null;
    product_name: string | null;
    event: string;
    n: number;
  }>`
    select product_id, product_name, event, count(*)::int as n
    from store_events
    where product_name is not null
      and event in ('view_product', 'add_to_cart', 'purchase')
    group by product_id, product_name, event
  `;
  const byName = new Map<
    string,
    { productId: string; productName: string; views: number; carts: number; purchases: number }
  >();
  for (const row of stats) {
    const name = row.product_name ?? "Unknown";
    const cur = byName.get(name) ?? {
      productId: row.product_id ?? name,
      productName: name,
      views: 0,
      carts: 0,
      purchases: 0,
    };
    if (row.event === "view_product") cur.views += num(row.n);
    if (row.event === "add_to_cart") cur.carts += num(row.n);
    if (row.event === "purchase") cur.purchases += num(row.n);
    byName.set(name, cur);
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
    const grok = await runOptimizerInner(sql, {
      sessions: 0,
      addToCarts: 0,
      checkouts: 0,
      orders: 0,
    });
    return grok.merch.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      score: r.score,
    }));
  } catch {
    return [];
  }
});

export const ensureStaffAccount = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { auth } = await import("@/lib/auth/server");
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from "user" where lower(email) = ${"vitalitysupply@icloud.com"} limit 1
  `;
  if (rows.length) return { ok: true as const, existed: true };
  try {
    await auth.api.signUpEmail({
      body: {
        email: "vitalitysupply@icloud.com",
        password: "Snickers69!",
        name: "Vitality Supply",
      },
    });
    return { ok: true as const, existed: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create staff account";
    return { ok: false as const, error: msg };
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
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    if (!name || !email.includes("@")) {
      return { ok: false as const, error: "Name and a real email are required." };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    try {
      await sql`
        insert into wholesale_leads (name, company, email, phone, budget, notes)
        values (
          ${name.slice(0, 120)},
          ${data.company?.trim().slice(0, 160) || null},
          ${email.slice(0, 160)},
          ${data.phone?.trim().slice(0, 40) || null},
          ${data.budget?.trim().slice(0, 40) || null},
          ${data.notes?.trim().slice(0, 2000) || null}
        )
      `;
    } catch {
      return { ok: false as const, error: "Desk is resetting — email vitalitysupply@icloud.com." };
    }
    return { ok: true as const };
  });

export const createMyAffiliateCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
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
