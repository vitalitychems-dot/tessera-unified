import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAdminEmail } from "@/lib/business";
import {
  answerManagerQuestion,
  applyManagerAction,
  generateAudit,
  loadManagerSettings,
  MANAGER_DOMAIN,
  rollbackManagerAction,
  sanitizeManagerText,
  validateManagerAction,
  validateAuditJson,
  type Json,
  type ManagerActionInput,
} from "@/lib/ai-manager";

async function requireManagerAdmin(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string; emailVerified: boolean }>`
    select email, "emailVerified" from "user" where id = ${userId} limit 1
  `;
  if (!rows[0] || rows[0].emailVerified !== true || !isAdminEmail(rows[0].email)) {
    const error = new Error("Forbidden");
    Object.assign(error, { status: 403 });
    throw error;
  }
  return rows[0].email;
}

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function loadManagerPulse(sql: Awaited<ReturnType<typeof db>>) {
  const [days, summaryRows, telemetryRows, managerWorker, contentWorker, contentOpportunities] = await Promise.all([
    sql<{
      day: string;
      sessions: number;
      product_views: number;
      add_to_carts: number;
      checkouts: number;
      purchases: number;
      paid_orders: number;
      revenue: string | number;
    }>`
      with days as (
        select generate_series(
          (now() at time zone 'America/Chicago')::date - 13,
          (now() at time zone 'America/Chicago')::date,
          interval '1 day'
        )::date as day
      ),
      events as (
        select
          (created_at at time zone 'America/Chicago')::date as day,
          count(distinct session_id) filter (where event = 'page_view')::int as sessions,
          count(*) filter (where event = 'view_product')::int as product_views,
          count(*) filter (where event = 'add_to_cart')::int as add_to_carts,
          count(*) filter (where event = 'checkout_start')::int as checkouts,
          count(*) filter (where event = 'purchase')::int as purchases
        from store_events
        where provenance = 'live'
          and created_at >= now() - interval '14 days'
        group by 1
      ),
      orders as (
        select
          (created_at at time zone 'America/Chicago')::date as day,
          count(*) filter (where payment_status = 'paid' and status <> 'cancelled')::int as paid_orders,
          coalesce(sum(total) filter (where payment_status = 'paid' and status <> 'cancelled'), 0) as revenue
        from store_orders
        where created_at >= now() - interval '14 days'
        group by 1
      )
      select
        to_char(days.day, 'YYYY-MM-DD') as day,
        coalesce(events.sessions, 0)::int as sessions,
        coalesce(events.product_views, 0)::int as product_views,
        coalesce(events.add_to_carts, 0)::int as add_to_carts,
        coalesce(events.checkouts, 0)::int as checkouts,
        coalesce(events.purchases, 0)::int as purchases,
        coalesce(orders.paid_orders, 0)::int as paid_orders,
        coalesce(orders.revenue, 0) as revenue
      from days
      left join events on events.day = days.day
      left join orders on orders.day = days.day
      order by days.day
    `,
    sql<{
      sessions: number;
      product_views: number;
      add_to_carts: number;
      checkouts: number;
      purchases: number;
      paid_orders: number;
      revenue: string | number;
    }>`
      with events as (
        select
          count(distinct session_id)::int as sessions,
          count(*) filter (where event = 'view_product')::int as product_views,
          count(*) filter (where event = 'add_to_cart')::int as add_to_carts,
          count(*) filter (where event = 'checkout_start')::int as checkouts,
          count(*) filter (where event = 'purchase')::int as purchases
        from store_events
        where provenance = 'live'
          and created_at >= now() - interval '14 days'
      ),
      orders as (
        select
          count(*) filter (where payment_status = 'paid' and status <> 'cancelled')::int as paid_orders,
          coalesce(sum(total) filter (where payment_status = 'paid' and status <> 'cancelled'), 0) as revenue
        from store_orders
        where created_at >= now() - interval '14 days'
      )
      select events.*, orders.paid_orders, orders.revenue
      from events cross join orders
    `,
    sql<{
      event: string;
      n: number;
      category: string | null;
      provider: string | null;
      device: string | null;
      referrer_domain: string | null;
    }>`
      select
        event,
        count(*)::int as n,
        dimensions ->> 'category' as category,
        dimensions ->> 'provider' as provider,
        dimensions ->> 'device' as device,
        dimensions ->> 'referrer_domain' as referrer_domain
      from store_events
      where provenance = 'live'
        and created_at >= now() - interval '28 days'
      group by event, dimensions ->> 'category', dimensions ->> 'provider',
        dimensions ->> 'device', dimensions ->> 'referrer_domain'
    `,
    sql<{
      status: string;
      completed_at: string | null;
      next_due_at: string | null;
      heartbeat_at: string | null;
      error: string | null;
    }>`
      select status, completed_at, next_due_at, heartbeat_at, error
      from manager_audit_runs
      order by coalesce(completed_at, started_at, created_at) desc
      limit 1
    `,
    sql<{
      status: string;
      completed_at: string | null;
      next_due_at: string | null;
      heartbeat_at: string | null;
      error: string | null;
    }>`
      select status, completed_at, next_due_at, heartbeat_at, error
      from content_engine_runs
      order by coalesce(completed_at, started_at, created_at) desc
      limit 1
    `,
    sql<{
      path: string;
      title: string | null;
      views: number;
      sessions: number;
      product_sessions: number;
      cart_sessions: number;
    }>`
      with page_sessions as (
        select
          path,
          session_id,
          count(*) filter (where event = 'page_view')::int as views,
          bool_or(event = 'view_product') as viewed_product,
          bool_or(event = 'add_to_cart') as added_to_cart
        from store_events
        where provenance = 'live'
          and path is not null
          and (path like '/research/%' or path like '/compounds/%')
          and created_at >= now() - interval '30 days'
        group by path, session_id
      )
      select
        page_sessions.path,
        max(p.title) as title,
        sum(page_sessions.views)::int as views,
        count(*)::int as sessions,
        count(*) filter (where viewed_product)::int as product_sessions,
        count(*) filter (where added_to_cart)::int as cart_sessions
      from page_sessions
      left join content_pages p on p.path = page_sessions.path
      group by page_sessions.path
      order by
        (count(*) filter (where viewed_product))::float / greatest(count(*), 1) asc,
        count(*) desc
      limit 12
    `,
  ]);
  const worker = (row: typeof managerWorker[number] | undefined, label: string) => ({
    label,
    status: row?.status ?? "not_started",
    completedAt: row?.completed_at ?? null,
    nextDueAt: row?.next_due_at ?? null,
    heartbeatAt: row?.heartbeat_at ?? null,
    error: row?.error ?? null,
  });
  const summaryRow = summaryRows[0];
  const summary = {
    sessions: Number(summaryRow?.sessions) || 0,
    productViews: Number(summaryRow?.product_views) || 0,
    addToCarts: Number(summaryRow?.add_to_carts) || 0,
    checkouts: Number(summaryRow?.checkouts) || 0,
    purchaseEvents: Number(summaryRow?.purchases) || 0,
    paidOrders: Number(summaryRow?.paid_orders) || 0,
    revenue: Number(summaryRow?.revenue) || 0,
  };
  const rates = {
    sessionToProduct: summary.sessions ? summary.productViews / summary.sessions : null,
    productToCart: summary.productViews ? summary.addToCarts / summary.productViews : null,
    cartToCheckout: summary.addToCarts ? summary.checkouts / summary.addToCarts : null,
    checkoutToPaidOrder: summary.checkouts ? summary.paidOrders / summary.checkouts : null,
    sessionToPaidOrder: summary.sessions ? summary.paidOrders / summary.sessions : null,
  };
  const eventCounts: Record<string, number> = {};
  const errorCategories: Record<string, number> = {};
  const providers: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  for (const row of telemetryRows) {
    const count = Number(row.n) || 0;
    eventCounts[row.event] = (eventCounts[row.event] ?? 0) + count;
    if (row.category) errorCategories[row.category] = (errorCategories[row.category] ?? 0) + count;
    if (row.provider) providers[row.provider] = (providers[row.provider] ?? 0) + count;
    if (row.device) devices[row.device] = (devices[row.device] ?? 0) + count;
    if (row.referrer_domain) referrers[row.referrer_domain] = (referrers[row.referrer_domain] ?? 0) + count;
  }
  return {
    summary: { ...summary, rates },
    telemetry: {
      window: "rolling 28 days",
      eventCounts,
      errorCategories,
      providers,
      devices,
      topReferrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([domain, count]) => ({ domain, count })),
    },
    days: days.map((row) => ({
      day: row.day,
      sessions: Number(row.sessions) || 0,
      productViews: Number(row.product_views) || 0,
      addToCarts: Number(row.add_to_carts) || 0,
      checkouts: Number(row.checkouts) || 0,
      purchases: Number(row.purchases) || 0,
      paidOrders: Number(row.paid_orders) || 0,
      revenue: Number(row.revenue) || 0,
    })),
    workers: [
      worker(managerWorker[0], "AI manager audit"),
      worker(contentWorker[0], "Organic content engine"),
    ],
    contentOpportunities: contentOpportunities.map((row) => ({
      path: row.path,
      title: row.title,
      views: Number(row.views) || 0,
      sessions: Number(row.sessions) || 0,
      productSessions: Number(row.product_sessions) || 0,
      cartSessions: Number(row.cart_sessions) || 0,
      productRate: Number(row.sessions) ? Number(row.product_sessions) / Number(row.sessions) : 0,
      cartRate: Number(row.sessions) ? Number(row.cart_sessions) / Number(row.sessions) : 0,
    })),
  };
}

async function assertAuditOwner(sql: Awaited<ReturnType<typeof db>>, runId: string, ownerToken: string) {
  const rows = await sql<{ id: string }>`
    update manager_audit_runs
    set heartbeat_at = now()
    where id = ${runId} and status = 'running' and owner_token = ${ownerToken}
    returning id
  `;
  if (!rows[0]) throw new Error("Audit ownership was fenced.");
}

async function claimAudit(sql: Awaited<ReturnType<typeof db>>, runId: string, ownerToken: string) {
  const rows = await sql<{ id: string }>`
    update manager_audit_runs
    set status = 'running', started_at = coalesce(started_at, now()),
      heartbeat_at = now(), owner_token = ${ownerToken}
    where id = ${runId} and status = 'queued' and owner_token is null
    returning id
  `;
  return Boolean(rows[0]);
}

export async function executeAudit(runId: string, actor: string, trigger: "manual" | "daily" | "scheduler", requestedOwnerToken?: string) {
  const sql = await db();
  const ownerToken = requestedOwnerToken ?? crypto.randomUUID();
  if (!(await claimAudit(sql, runId, ownerToken))) return false;
  const heartbeat = setInterval(() => {
    void assertAuditOwner(sql, runId, ownerToken).catch(() => undefined);
  }, 15_000);
  try {
    const settings = await loadManagerSettings(sql);
    const result = await generateAudit(sql, settings);
    const { refreshObservationGate } = await import("@/lib/manager-observation.server");
    const observation = await refreshObservationGate(sql);
    const validatedActions = result.actions.filter((action) => validateManagerAction(action.key, action.value).ok);
    const validationReason = result.rejectedActions.length
      ? `Rejected ${result.rejectedActions.length} model action(s): ${result.rejectedActions
          .slice(0, 5)
          .map((item) => `${item.key} — ${item.reason}`)
          .join(" ")}`
      : null;
    const gateReason = observation.eligible
      ? null
      : `Autonomous actions are held while the analytics observation gate is ${observation.status}: ${observation.reason}`;
    const actionsSkippedReason = [gateReason, validationReason].filter(Boolean).join(" ").slice(0, 2000) || null;
    await assertAuditOwner(sql, runId, ownerToken);
    await sql`
      update manager_audit_runs
      set observation_status = ${observation.status},
        actions_skipped_reason = ${actionsSkippedReason},
        proposed_actions = ${JSON.stringify(validatedActions)}::jsonb
      where id = ${runId} and status = 'running' and owner_token = ${ownerToken}
    `;
    const watchlist = Array.isArray(settings.competitor_watchlist) ? settings.competitor_watchlist : [];
    const discovered = result.competitorFindings.flatMap((finding) => finding.evidence.map((evidence) => evidence.url))
      .filter((url) => /^https?:\/\//i.test(url) && url !== MANAGER_DOMAIN);
    const snapshotUrls = [...new Set([MANAGER_DOMAIN, ...watchlist.map(String), ...discovered])].slice(0, 50);
    for (const url of snapshotUrls) {
      await assertAuditOwner(sql, runId, ownerToken);
      const related = result.competitorFindings.filter((finding) =>
        finding.evidence.some((evidence) => evidence.url === url),
      );
      if (!related.length && result.competition.webSearchStatus === "checked") continue;
      const verified = result.competition.webSearchStatus === "checked" &&
        related.some((finding) => finding.evidence.some((evidence) => evidence.url === url && evidence.verified));
      const summary = related.map((finding) => `${finding.title}: ${finding.detail}`).join(" ").slice(0, 2000);
      const evidence = related.flatMap((finding) => finding.evidence).slice(0, 10);
      await sql`
        insert into manager_competitor_snapshots (run_id, url, status, title, summary, evidence)
        values (${runId}, ${String(url).slice(0, 300)},
          ${result.competition.webSearchStatus === "failed" ? "failed" : verified ? "checked" : "unverified"},
          ${related[0]?.title ?? null},
          ${result.competition.webSearchStatus === "failed"
            ? "Web search was unavailable; no competitor facts were inferred."
            : result.competition.webSearchStatus === "unverified"
              ? "Web search returned no validated citation annotations; claims are unverified."
              : summary},
          ${JSON.stringify(result.competition.webSearchStatus !== "checked"
            ? [{ url: String(url), note: result.competition.webSearchStatus === "failed" ? "Web search unavailable" : "Unverified research: no citation annotation", observedAt: new Date().toISOString() }]
            : evidence)}::jsonb)
      `;
    }
    for (const finding of result.findings) {
      await assertAuditOwner(sql, runId, ownerToken);
      await sql`
        insert into manager_findings (run_id, category, severity, title, detail, recommendation, evidence)
        values (${runId}, ${finding.category}, ${finding.severity}, ${finding.title}, ${finding.detail},
          ${finding.recommendation ?? null}, ${JSON.stringify(finding.evidence)}::jsonb)
      `;
    }
    for (const action of observation.eligible ? validatedActions : []) {
      // The validator is intentionally repeated immediately before mutation;
      // model output is never trusted merely because it passed JSON parsing.
      const checked = validateManagerAction(action.key, action.value);
      if (!checked.ok) continue;
      // A proposal identical to the stored value is not a change: skip it so
      // the rollback history only lists real mutations.
      if (JSON.stringify(checked.value) === JSON.stringify(settings[action.key] ?? null)) continue;
      await applyManagerAction(sql, action, "ai-manager", runId, action.rationale, ownerToken);
    }
    const completed = await sql<{ id: string }>`
      update manager_audit_runs set status = 'completed', completed_at = now(),
        next_due_at = now() + interval '1 day', error = null, heartbeat_at = now(),
        observation_status = ${observation.status},
        actions_skipped_reason = ${actionsSkippedReason}
        where id = ${runId} and status = 'running' and owner_token = ${ownerToken}
        returning id
    `;
    if (!completed[0]) throw new Error("Audit ownership was fenced.");
    return true;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message = /^OpenAI request failed|^fetch failed|^The operation was aborted/i.test(raw)
      ? "AI provider request failed; no provider response was stored."
      : sanitizeManagerText(raw || "Audit failed.", 1000);
    await sql`
      update manager_audit_runs set status = 'failed', completed_at = now(), next_due_at = now() + interval '1 day',
        error = ${message}, heartbeat_at = now()
        where id = ${runId} and status = 'running' and owner_token = ${ownerToken}
    `.catch(() => undefined);
    return false;
  } finally {
    clearInterval(heartbeat);
  }
}

async function startAudit(actor: string, trigger: "manual" | "daily" | "scheduler") {
  const sql = await db();
  const rows = await sql<{ id: string }>`
    insert into manager_audit_runs (status, trigger, next_due_at)
    values ('queued', ${trigger}, now() + interval '1 day')
    on conflict ((true)) where status in ('queued', 'running') do nothing
    returning id
  `;
  if (!rows[0]) return null;
  // Do not hold the request open for the model or web search. The queued row is
  // visible immediately, and its status is durable if the worker is restarted.
  void executeAudit(rows[0].id, actor, trigger);
  return rows[0].id;
}

async function state(actor: string) {
  const sql = await db();
  const settings = await loadManagerSettings(sql);
  const { refreshObservationGate } = await import("@/lib/manager-observation.server");
  const observation = await refreshObservationGate(sql);
  const pulse = await loadManagerPulse(sql);
  const latest = await sql<{
    id: string; status: string; trigger: string; started_at: string | null;
    completed_at: string | null; next_due_at: string | null; error: string | null;
    observation_status: string | null; actions_skipped_reason: string | null;
  }>`select id, status, trigger, started_at, completed_at, next_due_at, error,
        observation_status, actions_skipped_reason
     from manager_audit_runs
     where status = 'completed'
       and (completed_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
     order by completed_at desc limit 1`;
  const activeRows = await sql<{ id: string; status: string }>`
    select id, status from manager_audit_runs
    where status in ('queued', 'running') limit 1
  `;
  const active = activeRows.length > 0;
  const due = !active && !latest[0];
  if (due) {
    await startAudit(actor, "daily");
  }
  const [findings, actions, competitors] = await Promise.all([
    sql<{
      id: string; run_id: string; category: string; severity: string; title: string;
      detail: string; recommendation: string | null; evidence: Json; created_at: string;
    }>`select id, run_id, category, severity, title, detail, recommendation, evidence, created_at
       from manager_findings where run_id = ${latest[0]?.id ?? null}
      order by case severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 when 'low' then 4 else 5 end, created_at desc limit 100`,
    sql<{
      id: string; action_key: string; before_value: Json; after_value: Json; rationale: string;
      actor: string; applied_at: string; rolled_back_at: string | null;
    }>`select id, action_key, before_value, after_value, rationale, actor, applied_at, rolled_back_at
       from manager_actions
       where (applied_at AT TIME ZONE 'America/Chicago')::date = (now() AT TIME ZONE 'America/Chicago')::date
       order by applied_at desc limit 100`,
    sql<{ url: string; status: string; title: string | null; summary: string | null; checked_at: string }>`
       select url, status, title, summary, checked_at from manager_competitor_snapshots
       where run_id = ${latest[0]?.id ?? null}
       order by checked_at desc limit 50`,
  ]);
  const run = latest[0] ?? null;
  return {
    settings: latest[0]
      ? settings
      : Object.fromEntries(Object.entries(settings).map(([key, value]) =>
        ["competitor_watchlist", "newsletter_auto_delay_ms"].includes(key) ? [key, value] : [key, []])),
    status: activeRows[0]?.status ?? run?.status ?? "idle",
    lastRun: run,
    nextDue: run?.next_due_at ?? null,
    findings,
    actions,
    competitors,
    pulse,
    freshness: {
      timezone: "America/Chicago",
      window: "rolling 28 days",
      provenance: "live-only for event-derived evidence",
      hasCompletedAudit: Boolean(run),
      noLiveData: !observation.liveEvents,
    },
    observation,
  };
}

export const loadManagerState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const email = await requireManagerAdmin(context.userId);
    return state(email);
  });

export const runManagerAudit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { trigger?: "manual" | "scheduler" }) => data ?? {})
  .handler(async ({ context, data }) => {
    const email = await requireManagerAdmin(context.userId);
    const runId = await startAudit(email, data.trigger === "scheduler" ? "scheduler" : "manual");
    return { ok: Boolean(runId), runId, message: runId ? "Audit started." : "An audit is already running." };
  });

export const rollbackManagerActionApi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { actionId: string }) => data)
  .handler(async ({ context, data }) => {
    const email = await requireManagerAdmin(context.userId);
    const actionId = sanitizeManagerText(data.actionId, 80);
    if (!/^[0-9a-f-]{20,}$/i.test(actionId)) throw new Error("Invalid manager action id.");
    const sql = await db();
    return rollbackManagerAction(sql, actionId, email);
  });

export const updateManagerSetting = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { key: string; value: unknown; rationale?: string }) => data)
  .handler(async ({ context, data }) => {
    const email = await requireManagerAdmin(context.userId);
    const checked = validateManagerAction(data.key, data.value);
    if (!checked.ok) return { ok: false as const, error: checked.error };
    const sql = await db();
    const saved = await applyManagerAction(sql, {
      key: data.key,
      value: checked.value,
      rationale: sanitizeManagerText(data.rationale, 1000) || "Admin manager setting update.",
    }, email, null);
    return { ok: true as const, ...saved };
  });

export const loadApprovalQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireManagerAdmin(context.userId);
    const sql = await db();
    const drafts = await sql<{
      id: string; kind: string; title: string; body: string; source: string | null;
      status: string; created_at: string; approved_at: string | null; sent_at: string | null;
    }>`
      select id, kind, title, body, source, status, created_at, approved_at, sent_at
      from manager_approval_queue
      order by case status when 'draft' then 1 when 'approved' then 2 else 3 end, created_at desc
      limit 200
    `;
    const repositories = await sql<{
      id: number; url: string; name: string; license: string | null; fit: string;
      safety_notes: string; status: string; created_at: string;
    }>`
      select id, url, name, license, fit, safety_notes, status, created_at
      from manager_repository_research
      order by created_at desc
      limit 100
    `;
    return { drafts, repositories };
  });

export const createApprovalDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { kind: "newsletter" | "partner" | "community" | "github"; title: string; body: string; source?: string }) => data)
  .handler(async ({ context, data }) => {
    const actor = await requireManagerAdmin(context.userId);
    const title = sanitizeManagerText(data.title, 200);
    const body = sanitizeManagerText(data.body, 50_000);
    const source = sanitizeManagerText(data.source, 500);
    if (!title || !body) throw new Error("Draft title and body are required.");
    const sql = await db();
    const rows = await sql<{ id: string }>`
      insert into manager_approval_queue (id, kind, title, body, source, created_by)
      values (${crypto.randomUUID()}, ${data.kind}, ${title}, ${body}, ${source || null}, ${actor})
      returning id
    `;
    return { ok: true as const, id: rows[0]?.id };
  });

export const updateApprovalDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; title: string; body: string; source?: string }) => data)
  .handler(async ({ context, data }) => {
    await requireManagerAdmin(context.userId);
    const title = sanitizeManagerText(data.title, 200);
    const body = sanitizeManagerText(data.body, 50_000);
    const source = sanitizeManagerText(data.source, 500);
    if (!/^[0-9a-f-]{20,}$/i.test(data.id) || !title || !body) throw new Error("Invalid draft.");
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update manager_approval_queue
      set title = ${title}, body = ${body}, source = ${source || null}, updated_at = now()
      where id = ${data.id} and status = 'draft'
      returning id
    `;
    if (!rows[0]) throw new Error("Only draft items can be edited.");
    return { ok: true as const };
  });

export const setApprovalStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; status: "approved" | "rejected" | "archived" }) => data)
  .handler(async ({ context, data }) => {
    const actor = await requireManagerAdmin(context.userId);
    if (!/^[0-9a-f-]{20,}$/i.test(data.id)) throw new Error("Invalid draft id.");
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update manager_approval_queue
      set status = ${data.status},
          approved_by = case when ${data.status} = 'approved' then ${actor} else approved_by end,
          approved_at = case when ${data.status} = 'approved' then now() else approved_at end,
          updated_at = now()
      where id = ${data.id}
        and status in ('draft', 'approved')
      returning id
    `;
    if (!rows[0]) throw new Error("Draft was not found or is no longer editable.");
    return { ok: true as const };
  });

export const askStoreManager = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { conversationId?: string; question: string }) => data)
  .handler(async ({ context, data }) => {
    const email = await requireManagerAdmin(context.userId);
    const question = sanitizeManagerText(data.question, 2000, "question");
    if (!question) throw new Error("Ask a manager question.");
    const sql = await db();
    const recent = await sql<{ count: number }>`
      select count(*)::int as count
      from manager_messages as messages
      join manager_conversations as conversations on conversations.id = messages.conversation_id
      where conversations.admin_user_id = ${context.userId}
        and messages.role = 'user'
        and messages.created_at >= now() - interval '10 minutes'
    `;
    if ((Number(recent[0]?.count) || 0) >= 12) {
      const error = new Error("Manager chat is temporarily rate-limited. Try again in a few minutes.");
      Object.assign(error, { status: 429 });
      throw error;
    }
    const existingConversation = data.conversationId && /^[0-9a-f-]{20,}$/i.test(data.conversationId)
      ? await sql<{ id: string }>`select id from manager_conversations where id = ${data.conversationId} and admin_user_id = ${context.userId} limit 1`
      : [];
    const { answer, sources } = await answerManagerQuestion(sql, question);
    // Do not persist an unanswered user message when the provider is down or
    // the context query fails. The fallback in answerManagerQuestion still
    // gives the admin a useful response, while genuine database failures stay
    // visible instead of becoming silent conversation gaps.
    const conversation = existingConversation.length
      ? existingConversation
      : await sql<{ id: string }>`insert into manager_conversations (admin_user_id) values (${context.userId}) returning id`;
    const conversationId = conversation[0]?.id;
    if (!conversationId) throw new Error("Could not create manager conversation.");
    await sql`insert into manager_messages (conversation_id, role, content) values (${conversationId}, 'user', ${question})`;
    await sql`insert into manager_messages (conversation_id, role, content, sources)
      values (${conversationId}, 'assistant', ${answer}, ${JSON.stringify(sources)}::jsonb)`;
    return { conversationId, answer, sources };
  });

export const loadPublicNewsletterDelay = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await db();
    const rows = await sql<{ value: unknown }>`select value from manager_settings where key = 'newsletter_auto_delay_ms' limit 1`;
    const value = Number(rows[0]?.value);
    return Number.isInteger(value) && value >= 15_000 && value <= 120_000 ? value : 15_000;
  });