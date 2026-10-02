/**
 * Admin server functions for the content engine. Every handler requires a
 * verified admin (same rule as the AI manager) and only touches content
 * tables — never pricing, payments, orders, or deployments.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAdminEmail } from "@/lib/business";
import { CANONICAL_HOSTNAME } from "@/lib/site-url";
import { refreshObservationGate, type ObservationGate } from "@/lib/manager-observation.server";
import { RULESET_VERSION } from "./compliance";
import { requestManualRun, restoreVersion, RUN_INTERVAL_MS, setPaused, unpublishPage, loadEngineState, type EngineState } from "./engine.server";
import { indexNowEnabled, indexNowKey } from "./indexnow.server";
import { allTopics } from "./topics";
import type { ContentKind, GateReport } from "./types";

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function requireContentAdmin(userId: string) {
  const sql = await db();
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

function assertId(value: unknown, label: string) {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-f-]{20,}$/i.test(id)) throw new Error(`Invalid ${label}.`);
  return id;
}

export type ContentPageSummary = {
  id: string;
  kind: ContentKind;
  path: string;
  subjectId: string;
  status: string;
  title: string | null;
  currentVersion: number | null;
  gateStatus: "passed" | "failed" | null;
  gateReport: GateReport | null;
  publishedAt: string | null;
  contentUpdatedAt: string | null;
  nextRefreshAt: string | null;
  lastVerifiedAt: string | null;
  unpublishReason: string | null;
  inCatalog: boolean;
  metrics: { views: number; sessions: number; productSessions: number; cartSessions: number };
};

export type ContentEventRecord = {
  id: string;
  createdAt: string;
  event: string;
  actor: string;
  pagePath: string | null;
  /** Only the string fields the admin UI renders (reason / message); nothing nested. */
  detail: { reason: string | null; message: string | null };
};

export type IndexNowRecord = {
  id: string;
  createdAt: string;
  urls: string[];
  reason: string;
  outcome: string;
  statusCode: number | null;
  detail: string | null;
};

export type ContentRunRecord = {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  completedAt: string | null;
  nextDueAt: string | null;
  error: string | null;
  /** Flattened from the stored RunSummary so the admin UI stays serializable. */
  summary: {
    reverified: number;
    unpublished: number;
    published: string | null;
    refreshed: string | null;
    skipped: string | null;
    observationStatus: ObservationGate["status"] | null;
    errors: string[];
  } | null;
};

export type ContentEngineOverview = {
  state: EngineState;
  observationGate: ObservationGate;
  rulesetVersion: string;
  cadenceHours: number;
  topicsTotal: number;
  indexNow: {
    enabled: boolean;
    keyPath: string | null;
    summary: {
      accepted: number;
      rejected: number;
      failed: number;
      skipped: number;
      oldestFailureAt: string | null;
      lastSuccessAt: string | null;
    };
  };
  searchConsoleRecommendation: string;
  pages: ContentPageSummary[];
  events: ContentEventRecord[];
  indexNowLog: IndexNowRecord[];
  runs: ContentRunRecord[];
};

function iso(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

async function overview(): Promise<ContentEngineOverview> {
  const sql = await db();
  const state = await loadEngineState(sql);
  const observationGate = await refreshObservationGate(sql);
  type PageRow = {
    id: string; kind: ContentKind; path: string; subject_id: string; status: string; title: string | null;
    version: number | null; gate_status: "passed" | "failed" | null; gate_report: GateReport | null;
    published_at: string | null; content_updated_at: string | null; next_refresh_at: string | null;
    last_verified_at: string | null; unpublish_reason: string | null;
  };
  const pages = await sql<PageRow>`
    select p.id, p.kind, p.path, p.subject_id, p.status, p.title,
      v.version, v.gate_status, v.gate_report,
      p.published_at, p.content_updated_at, p.next_refresh_at, p.last_verified_at, p.unpublish_reason
    from content_pages p
    left join content_versions v on v.id = p.current_version_id
    order by p.created_at desc
  `;
  type MetricRow = { path: string; views: number; sessions: number; product_sessions: number; cart_sessions: number };
  const metrics = await sql<MetricRow>`
    with pv as (
      select path, session_id, min(created_at) as first_view, count(*) as views
      from store_events
      where event = 'page_view'
        and provenance = 'live'
        and (path like '/research/%' or path like '/compounds/%')
        and created_at > now() - interval '30 days'
      group by path, session_id
    )
    select pv.path,
      sum(pv.views)::int as views,
      count(*)::int as sessions,
      count(distinct case when exists (
        select 1 from store_events e
        where e.session_id = pv.session_id and e.event = 'view_product' and e.provenance = 'live' and e.created_at > pv.first_view
      ) then pv.session_id end)::int as product_sessions,
      count(distinct case when exists (
        select 1 from store_events e
        where e.session_id = pv.session_id and e.event = 'add_to_cart' and e.provenance = 'live' and e.created_at > pv.first_view
      ) then pv.session_id end)::int as cart_sessions
    from pv
    group by pv.path
  `;
  const metricByPath = new Map(metrics.map((row) => [row.path, row]));
  const topics = allTopics();
  const inCatalog = new Set(topics.map((topic) => `${topic.kind}:${topic.subjectId}`));

  type EventRow = { id: string; created_at: string; event: string; actor: string; page_path: string | null; detail: Record<string, unknown> };
  const events = await sql<EventRow>`
    select e.id, e.created_at, e.event, e.actor, p.path as page_path, e.detail
    from content_events e
    left join content_pages p on p.id = e.page_id
    order by e.created_at desc
    limit 40
  `;
  type IndexRow = { id: string; created_at: string; urls: string[]; reason: string; outcome: string; status_code: number | null; detail: string | null };
  const indexNowLog = await sql<IndexRow>`
    select id, created_at, urls, reason, outcome, status_code, detail
    from content_indexnow_submissions order by created_at desc limit 20
  `;
  const indexNowStats = await sql<{
    outcome: string;
    count: number;
    oldest_created_at: string | null;
    latest_created_at: string | null;
  }>`
    select outcome, count(*)::int as count, min(created_at) as oldest_created_at,
      max(created_at) as latest_created_at
    from content_indexnow_submissions
    where created_at > now() - interval '24 hours'
    group by outcome
  `;
  const indexNowSummary = {
    accepted: indexNowStats.find((row) => row.outcome === "accepted")?.count ?? 0,
    rejected: indexNowStats.find((row) => row.outcome === "rejected")?.count ?? 0,
    failed: indexNowStats.find((row) => row.outcome === "failed")?.count ?? 0,
    skipped: indexNowStats.find((row) => row.outcome === "skipped")?.count ?? 0,
    oldestFailureAt:
      indexNowStats.find((row) => row.outcome === "failed")?.oldest_created_at ?? null,
    lastSuccessAt:
      indexNowStats.find((row) => row.outcome === "accepted")?.latest_created_at ?? null,
  };
  const summarizeRun = (raw: Record<string, unknown> | null): ContentRunRecord["summary"] => {
    if (!raw) return null;
    const reverified = raw.reverified && typeof raw.reverified === "object" ? (raw.reverified as { checked?: unknown; unpublished?: unknown }) : {};
    const pathOf = (value: unknown) => (value && typeof value === "object" && typeof (value as { path?: unknown }).path === "string" ? (value as { path: string }).path : null);
    return {
      reverified: typeof reverified.checked === "number" ? reverified.checked : 0,
      unpublished: typeof reverified.unpublished === "number" ? reverified.unpublished : 0,
      published: pathOf(raw.published),
      refreshed: pathOf(raw.refreshed),
      skipped: typeof raw.skipped === "string" ? raw.skipped : null,
      observationStatus: typeof raw.observationStatus === "string"
        ? raw.observationStatus as ObservationGate["status"]
        : null,
      errors: Array.isArray(raw.errors) ? raw.errors.filter((item): item is string => typeof item === "string") : [],
    };
  };
  type RunRow = { id: string; status: string; trigger: string; created_at: string; completed_at: string | null; next_due_at: string | null; error: string | null; summary: Record<string, unknown> | null };
  const runs = await sql<RunRow>`
    select id, status, trigger, created_at, completed_at, next_due_at, error, summary
    from content_engine_runs order by created_at desc limit 6
  `;
  const key = indexNowKey();
  return {
    state,
    observationGate,
    rulesetVersion: RULESET_VERSION,
    cadenceHours: RUN_INTERVAL_MS / 3_600_000,
    topicsTotal: topics.length,
    indexNow: {
      enabled: indexNowEnabled(),
      keyPath: key ? `/${key}.txt` : null,
      summary: indexNowSummary,
    },
    searchConsoleRecommendation: `Verify ${CANONICAL_HOSTNAME} in Google Search Console (DNS TXT record) and submit https://${CANONICAL_HOSTNAME}/sitemap.xml once; Bing and Yandex already receive IndexNow pings from this engine.`,
    pages: pages.map((row) => {
      const metric = metricByPath.get(row.path);
      return {
        id: row.id,
        kind: row.kind,
        path: row.path,
        subjectId: row.subject_id,
        status: row.status,
        title: row.title,
        currentVersion: row.version,
        gateStatus: row.gate_status,
        gateReport: row.gate_report,
        publishedAt: iso(row.published_at),
        contentUpdatedAt: iso(row.content_updated_at),
        nextRefreshAt: iso(row.next_refresh_at),
        lastVerifiedAt: iso(row.last_verified_at),
        unpublishReason: row.unpublish_reason,
        inCatalog: inCatalog.has(`${row.kind}:${row.subject_id}`),
        metrics: {
          views: metric?.views ?? 0,
          sessions: metric?.sessions ?? 0,
          productSessions: metric?.product_sessions ?? 0,
          cartSessions: metric?.cart_sessions ?? 0,
        },
      };
    }),
    events: events.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at) ?? "",
      event: row.event,
      actor: row.actor,
      pagePath: row.page_path,
      detail: {
        reason: typeof row.detail?.reason === "string" ? row.detail.reason : null,
        message: typeof row.detail?.message === "string" ? row.detail.message : null,
      },
    })),
    indexNowLog: indexNowLog.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at) ?? "",
      urls: Array.isArray(row.urls) ? row.urls : [],
      reason: row.reason,
      outcome: row.outcome,
      statusCode: row.status_code,
      detail: row.detail,
    })),
    runs: runs.map((row) => ({
      id: row.id,
      status: row.status,
      trigger: row.trigger,
      createdAt: iso(row.created_at) ?? "",
      completedAt: iso(row.completed_at),
      nextDueAt: iso(row.next_due_at),
      error: row.error,
      summary: summarizeRun(row.summary),
    })),
  };
}

export const loadContentEngine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireContentAdmin(context.userId);
    return overview();
  });

export type ContentVersionRecord = {
  id: string;
  version: number;
  title: string;
  gateStatus: "passed" | "failed";
  gateReport: GateReport;
  model: string | null;
  createdBy: string;
  createdAt: string;
  isCurrent: boolean;
};

export const loadContentPageVersions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { pageId: string }) => ({ pageId: assertId(data?.pageId, "page id") }))
  .handler(async ({ context, data }): Promise<ContentVersionRecord[]> => {
    await requireContentAdmin(context.userId);
    const sql = await db();
    type Row = { id: string; version: number; title: string; gate_status: "passed" | "failed"; gate_report: GateReport; model: string | null; created_by: string; created_at: string; current_version_id: string | null };
    const rows = await sql<Row>`
      select v.id, v.version, v.title, v.gate_status, v.gate_report, v.model, v.created_by, v.created_at, p.current_version_id
      from content_versions v join content_pages p on p.id = v.page_id
      where v.page_id = ${data.pageId}
      order by v.version desc
    `;
    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      title: row.title,
      gateStatus: row.gate_status,
      gateReport: row.gate_report,
      model: row.model,
      createdBy: row.created_by,
      createdAt: iso(row.created_at) ?? "",
      isCurrent: row.current_version_id === row.id,
    }));
  });

export const setContentEnginePaused = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { paused: boolean; reason?: string }) => ({
    paused: data?.paused === true,
    reason: typeof data?.reason === "string" ? data.reason.slice(0, 300) : undefined,
  }))
  .handler(async ({ context, data }) => {
    const email = await requireContentAdmin(context.userId);
    const sql = await db();
    await setPaused(sql, data.paused, email, data.reason);
    return overview();
  });

export const requestContentRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireContentAdmin(context.userId);
    const sql = await db();
    const runId = await requestManualRun(sql);
    return {
      ok: Boolean(runId),
      message: runId
        ? "Run queued. The scheduler picks it up within a minute; refresh this tab to follow it."
        : "A run is already queued or in progress.",
    };
  });

export const unpublishContentPage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { pageId: string; reason?: string }) => ({
    pageId: assertId(data?.pageId, "page id"),
    reason: typeof data?.reason === "string" && data.reason.trim() ? data.reason.trim().slice(0, 300) : "Unpublished by admin.",
  }))
  .handler(async ({ context, data }) => {
    const email = await requireContentAdmin(context.userId);
    const sql = await db();
    const rows = await sql<{ id: string; kind: ContentKind; path: string; status: string }>`
      select id, kind, path, status from content_pages where id = ${data.pageId} limit 1
    `;
    const page = rows[0];
    if (!page) throw new Error("Page not found.");
    if (page.status === "published") await unpublishPage(sql, page, data.reason, email, null);
    return overview();
  });

export const restoreContentPage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { pageId: string; versionId?: string | null }) => ({
    pageId: assertId(data?.pageId, "page id"),
    versionId: data?.versionId ? assertId(data.versionId, "version id") : null,
  }))
  .handler(async ({ context, data }) => {
    const email = await requireContentAdmin(context.userId);
    const sql = await db();
    const result = await restoreVersion(sql, data.pageId, data.versionId, email);
    return { result, overview: await overview() };
  });
