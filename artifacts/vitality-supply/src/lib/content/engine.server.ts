/**
 * Content-engine run loop (server-only). One fenced run at a time:
 *
 *   1. re-verify every published version against the current deterministic
 *      ruleset (free) and unpublish anything that no longer passes;
 *   2. stop here when paused;
 *   3. refresh at most one page whose refresh date has arrived;
 *   4. publish at most one new page, subject to the daily publish cap and the
 *      daily model-call budget;
 *   5. record a summary and the next due time.
 *
 * Generation never happens inside a page request. Admin actions (pause,
 * unpublish, rollback) live in `admin-api.ts` and share the helpers below.
 */
import { getSql, withTransaction, type Sql } from "@/lib/db";
import { refreshObservationGate, type ObservationGate } from "@/lib/manager-observation.server";
import { serverSiteUrl } from "@/lib/site-url";
import { RULESET_VERSION, runDeterministicGate } from "./compliance";
import { auditExisting, generatePage, type GenerationResult } from "./generate.server";
import { submitIndexNow } from "./indexnow.server";
import { allTopics, compoundTopics, familyTopics, findTopic, METHOD_TOPICS, type ContentTopic } from "./topics";
import { CONTENT_INDEX_PATH, type ContentBody, type ContentKind, type GateReport } from "./types";

export const RUN_INTERVAL_MS = 2 * 60 * 60 * 1000;
const REFRESH_AFTER_DAYS = 45;
const RETRY_FAILED_AFTER_DAYS = 3;
const RETRY_FAILED_REFRESH_AFTER_DAYS = 7;
const MAX_CALLS_PER_GENERATION = 4;
const AUTO_PAUSE_AFTER_FAILURES = 3;
const STALE_RUN_AFTER = "2 hours";

export type EngineState = {
  paused: boolean;
  pausedReason: string | null;
  pausedBy: string | null;
  consecutiveGateFailures: number;
  budgetDay: string | null;
  publishesToday: number;
  modelCallsToday: number;
  dailyPublishCap: number;
  dailyModelCallCap: number;
};

type StateRow = {
  paused: boolean;
  paused_reason: string | null;
  paused_by: string | null;
  consecutive_gate_failures: number;
  budget_day: string | null;
  publishes_today: number;
  model_calls_today: number;
  daily_publish_cap: number;
  daily_model_call_cap: number;
};

type PageRow = {
  id: string;
  kind: ContentKind;
  path: string;
  subject_id: string;
  status: string;
  current_version_id: string | null;
  title: string | null;
  description: string | null;
  next_refresh_at: string | null;
  updated_at: string;
};

type VersionRow = {
  id: string;
  page_id: string;
  version: number;
  title: string;
  description: string;
  body: ContentBody;
  gate_status: "passed" | "failed";
  gate_report: GateReport;
};

function todayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

export async function loadEngineState(sql: Sql, now = new Date()): Promise<EngineState> {
  const rows = await sql<StateRow>`select * from content_engine_state where id = true limit 1`;
  let row = rows[0];
  if (!row) {
    await sql`insert into content_engine_state (id) values (true) on conflict (id) do nothing`;
    row = (await sql<StateRow>`select * from content_engine_state where id = true limit 1`)[0];
  }
  if (!row) throw new Error("content_engine_state row is missing.");
  const today = todayKey(now);
  if (row.budget_day !== today) {
    const reset = await sql<StateRow>`
      update content_engine_state
      set budget_day = ${today}::date, publishes_today = 0, model_calls_today = 0, updated_at = now()
      where id = true and budget_day is distinct from ${today}::date
      returning *
    `;
    // A concurrent caller may already have rolled over and reserved today's
    // budget. Never overwrite that reservation with stale local state.
    row = reset[0] ?? (await sql<StateRow>`select * from content_engine_state where id = true limit 1`)[0];
  }
  if (!row) throw new Error("content_engine_state row is missing after budget rollover.");
  return {
    paused: row.paused,
    pausedReason: row.paused_reason,
    pausedBy: row.paused_by,
    consecutiveGateFailures: row.consecutive_gate_failures,
    budgetDay: row.budget_day ? String(row.budget_day).slice(0, 10) : null,
    publishesToday: row.publishes_today,
    modelCallsToday: row.model_calls_today,
    dailyPublishCap: row.daily_publish_cap,
    dailyModelCallCap: row.daily_model_call_cap,
  };
}

async function recordEvent(
  sql: Sql,
  event: string,
  detail: Record<string, unknown>,
  pageId: string | null,
  runId: string | null,
  actor = "scheduler",
) {
  await sql`
    insert into content_events (page_id, run_id, event, detail, actor)
    values (${pageId}, ${runId}, ${event}, ${JSON.stringify(detail)}::jsonb, ${actor})
  `;
}

async function currentVersion(sql: Sql, page: PageRow): Promise<VersionRow | null> {
  if (!page.current_version_id) return null;
  const rows = await sql<VersionRow>`
    select id, page_id, version, title, description, body, gate_status, gate_report
    from content_versions where id = ${page.current_version_id} limit 1
  `;
  return rows[0] ?? null;
}

/** Paths whose content changed as a side effect of a page change (index + hub). */
function affectedPaths(page: { kind: ContentKind; path: string; body?: ContentBody }) {
  const paths = [page.path, CONTENT_INDEX_PATH];
  if (page.body?.familyId) {
    const hub = familyTopics().find((topic) => topic.subjectId === page.body?.familyId);
    if (hub) paths.push(hub.path);
  }
  return paths;
}

/** Unpublish a page immediately; used by the re-check, the scheduler, and admins. */
export async function unpublishPage(
  sql: Sql,
  page: { id: string; kind: ContentKind; path: string },
  reason: string,
  actor: string,
  runId: string | null,
  body?: ContentBody,
) {
  await sql`
    update content_pages
    set status = 'unpublished', unpublish_reason = ${reason.slice(0, 300)}, updated_at = now()
    where id = ${page.id}
  `;
  await recordEvent(sql, "unpublished", { reason: reason.slice(0, 300) }, page.id, runId, actor);
  await submitIndexNow(sql, affectedPaths({ kind: page.kind, path: page.path, body }), `unpublished ${page.path}`);
}

/**
 * Deterministic re-verification of every published page. Runs every tick and
 * is the mechanism by which a ruleset update takes effect on live pages.
 */
export async function reverifyPublished(sql: Sql, runId: string | null) {
  const pages = await sql<PageRow>`
    select id, kind, path, subject_id, status, current_version_id, title, description, next_refresh_at, updated_at
    from content_pages where status = 'published'
  `;
  let checked = 0;
  let unpublished = 0;
  for (const page of pages) {
    const version = await currentVersion(sql, page);
    if (!version) {
      await unpublishPage(sql, page, "Published page has no current version.", "scheduler", runId);
      unpublished += 1;
      continue;
    }
    checked += 1;
    const deterministic = runDeterministicGate({ title: version.title, description: version.description, body: version.body });
    if (deterministic.ok) {
      await sql`update content_pages set last_verified_at = now() where id = ${page.id}`;
      if (version.gate_report?.ruleset !== RULESET_VERSION) {
        const merged: GateReport = { ...version.gate_report, ruleset: RULESET_VERSION, deterministic, checkedAt: new Date().toISOString() };
        await sql`update content_versions set gate_report = ${JSON.stringify(merged)}::jsonb where id = ${version.id}`;
      }
      continue;
    }
    const failedReport: GateReport = { ...version.gate_report, ruleset: RULESET_VERSION, deterministic, checkedAt: new Date().toISOString() };
    await sql`
      update content_versions set gate_status = 'failed', gate_report = ${JSON.stringify(failedReport)}::jsonb
      where id = ${version.id}
    `;
    await unpublishPage(
      sql,
      page,
      `Re-check against ruleset ${RULESET_VERSION} failed: ${deterministic.violations[0]?.excerpt ?? "violation"}`,
      "scheduler",
      runId,
      version.body,
    );
    unpublished += 1;
  }
  return { checked, unpublished };
}

type ModelCallReservation = {
  budgetDay: string;
  total: number;
};

async function reserveModelCalls(sql: Sql, calls: number, now = new Date()): Promise<ModelCallReservation | null> {
  const today = todayKey(now);
  const rows = await sql<{ budget_day: string; model_calls_today: number }>`
    update content_engine_state
    set budget_day = ${today}::date,
      publishes_today = case when budget_day is distinct from ${today}::date then 0 else publishes_today end,
      model_calls_today = case
        when budget_day is distinct from ${today}::date then ${calls}
        else model_calls_today + ${calls}
      end,
      updated_at = now()
    where id = true
      and (
        case when budget_day is distinct from ${today}::date then 0 else model_calls_today end
      ) + ${calls} <= daily_model_call_cap
    returning budget_day::text, model_calls_today
  `;
  const row = rows[0];
  return row
    ? { budgetDay: String(row.budget_day).slice(0, 10), total: row.model_calls_today }
    : null;
}

async function refundModelCalls(sql: Sql, reservation: ModelCallReservation, calls: number) {
  if (calls <= 0) return;
  await sql`
    update content_engine_state
    set model_calls_today = greatest(0, model_calls_today - ${calls}), updated_at = now()
    where id = true and budget_day = ${reservation.budgetDay}::date
  `;
}

async function noteGateResult(sql: Sql, ok: boolean, runId: string | null, pagePath: string) {
  if (ok) {
    await sql`update content_engine_state set consecutive_gate_failures = 0, updated_at = now() where id = true`;
    return false;
  }
  const rows = await sql<{ consecutive_gate_failures: number; paused: boolean }>`
    update content_engine_state
    set consecutive_gate_failures = consecutive_gate_failures + 1, updated_at = now()
    where id = true
    returning consecutive_gate_failures, paused
  `;
  const failures = rows[0]?.consecutive_gate_failures ?? 0;
  if (failures >= AUTO_PAUSE_AFTER_FAILURES && !rows[0]?.paused) {
    const reason = `Auto-paused after ${failures} consecutive compliance-gate failures (last: ${pagePath}). Review the gate reports, then resume.`;
    await sql`
      update content_engine_state
      set paused = true, paused_reason = ${reason}, paused_by = 'scheduler', updated_at = now()
      where id = true
    `;
    await recordEvent(sql, "paused", { reason }, null, runId);
    return true;
  }
  return false;
}

async function nextVersionNumber(sql: Sql, pageId: string) {
  const rows = await sql<{ next: number }>`
    select coalesce(max(version), 0) + 1 as next from content_versions where page_id = ${pageId}
  `;
  return rows[0]?.next ?? 1;
}

async function insertVersion(sql: Sql, pageId: string, result: GenerationResult, createdBy: string) {
  const version = await nextVersionNumber(sql, pageId);
  const rows = await sql<{ id: string }>`
    insert into content_versions (page_id, version, title, description, body, gate_status, gate_report, model, created_by)
    values (
      ${pageId}, ${version}, ${result.title || "(rejected draft)"}, ${result.description || ""},
      ${JSON.stringify(result.body)}::jsonb, ${result.ok ? "passed" : "failed"},
      ${JSON.stringify(result.report)}::jsonb, ${result.model}, ${createdBy}
    )
    returning id
  `;
  return { id: rows[0]?.id ?? "", version };
}

/** Product-demand signals from first-party events (last 30 days). */
async function demandByProduct(sql: Sql): Promise<Map<string, number>> {
  const rows = await sql<{ product_id: string; score: string }>`
    select product_id,
      sum(case event when 'add_to_cart' then 3 when 'view_product' then 1 else 0 end) as score
    from store_events
    where product_id is not null
      and event in ('view_product', 'add_to_cart')
      and provenance = 'live'
      and created_at > now() - interval '30 days'
    group by product_id
  `;
  return new Map(rows.map((row) => [row.product_id, Number(row.score) || 0]));
}

/**
 * Choose the next topic. Kinds rotate compound → family → method so hub and
 * method pages appear early enough to carry internal links; within a kind,
 * catalog demand and rank decide.
 */
export async function pickNextTopic(sql: Sql): Promise<ContentTopic | null> {
  const pages = await sql<{ kind: ContentKind; subject_id: string; status: string; updated_at: string }>`
    select kind, subject_id, status, updated_at from content_pages
  `;
  const taken = new Set<string>();
  let publishedCount = 0;
  const retryCutoff = Date.now() - RETRY_FAILED_AFTER_DAYS * 86_400_000;
  for (const page of pages) {
    const key = `${page.kind}:${page.subject_id}`;
    if (page.status === "published") publishedCount += 1;
    if (page.status === "failed" && new Date(page.updated_at).getTime() < retryCutoff) continue;
    taken.add(key);
  }
  const demand = await demandByProduct(sql);
  const score = (productId: string, rank: number) => (demand.get(productId) ?? 0) + Math.max(0, 60 - rank) / 6;

  const compounds = compoundTopics()
    .filter((topic) => !taken.has(`compound:${topic.subjectId}`))
    .sort((a, b) => score(b.product.id, b.product.rank) - score(a.product.id, a.product.rank) || a.product.name.localeCompare(b.product.name));
  const families = familyTopics()
    .filter((topic) => !taken.has(`family:${topic.subjectId}`))
    .sort((a, b) =>
      b.products.reduce((sum, p) => sum + score(p.id, p.rank), 0) - a.products.reduce((sum, p) => sum + score(p.id, p.rank), 0),
    );
  const methods = METHOD_TOPICS.filter((topic) => !taken.has(`method:${topic.subjectId}`));

  const rotation = [compounds, families, methods];
  const start = publishedCount % rotation.length;
  for (let offset = 0; offset < rotation.length; offset += 1) {
    const bucket = rotation[(start + offset) % rotation.length];
    if (bucket && bucket[0]) return bucket[0];
  }
  return null;
}

async function publishGenerated(
  sql: Sql,
  topic: ContentTopic,
  result: GenerationResult,
  runId: string | null,
  mode: "publish" | "refresh",
) {
  // Keep the publication primitive safe if a future caller bypasses the
  // scheduler-level gate or eligibility changes during a long model call.
  const observation = await refreshObservationGate(sql);
  if (!observation.eligible) {
    throw new Error(`Autonomous content publication is held by the analytics observation gate: ${observation.reason}`);
  }
  const existing = await sql<PageRow>`
    select id, kind, path, subject_id, status, current_version_id, title, description, next_refresh_at, updated_at
    from content_pages where kind = ${topic.kind} and subject_id = ${topic.subjectId} limit 1
  `;
  let pageId = existing[0]?.id;
  if (!pageId) {
    const inserted = await sql<{ id: string }>`
      insert into content_pages (kind, path, subject_id, status)
      values (${topic.kind}, ${topic.path}, ${topic.subjectId}, 'draft')
      returning id
    `;
    pageId = inserted[0]?.id;
  }
  if (!pageId) throw new Error("Could not create content page.");
  const version = await insertVersion(sql, pageId, result, "scheduler");
  await recordEvent(
    sql,
    "generated",
    { version: version.version, ok: result.ok, modelCalls: result.modelCalls, violations: result.report.deterministic.violations.length + (result.report.model?.violations.length ?? 0) },
    pageId,
    runId,
  );

  if (!result.ok) {
    if (mode === "publish") {
      await sql`
        update content_pages set status = 'failed', updated_at = now(),
          unpublish_reason = ${`Generation failed the compliance gate (version ${version.version}).`}
        where id = ${pageId} and status <> 'published'
      `;
    } else {
      await sql`
        update content_pages set next_refresh_at = now() + ${`${RETRY_FAILED_REFRESH_AFTER_DAYS} days`}::interval, updated_at = now()
        where id = ${pageId}
      `;
    }
    await recordEvent(sql, "gate_failed", { version: version.version, report: result.report }, pageId, runId);
    return { pageId, published: false };
  }

  await sql`
    update content_pages
    set status = 'published', current_version_id = ${version.id}, title = ${result.title},
      description = ${result.description}, published_at = coalesce(published_at, now()),
      first_published_at = coalesce(first_published_at, now()), content_updated_at = now(),
      last_verified_at = now(), unpublish_reason = null, updated_at = now(),
      next_refresh_at = now() + ${`${REFRESH_AFTER_DAYS} days`}::interval
    where id = ${pageId}
  `;
  await recordEvent(sql, mode === "publish" ? "published" : "refreshed", { version: version.version, path: topic.path }, pageId, runId);
  await submitIndexNow(sql, affectedPaths({ kind: topic.kind, path: topic.path, body: result.body }), `${mode} ${topic.path}`);
  return { pageId, published: true };
}

async function generateWithBudget(sql: Sql, topic: ContentTopic, state: EngineState) {
  const reserved = await reserveModelCalls(sql, MAX_CALLS_PER_GENERATION);
  if (reserved === null) return null;
  state.budgetDay = reserved.budgetDay;
  state.modelCallsToday = reserved.total;
  try {
    const result = await generatePage(topic);
    const refund = Math.max(0, MAX_CALLS_PER_GENERATION - result.modelCalls);
    await refundModelCalls(sql, reserved, refund);
    if (state.budgetDay === reserved.budgetDay) state.modelCallsToday -= refund;
    return result;
  } catch (error) {
    // Keep the full reservation on ambiguous provider failure. This can
    // under-use a day's allowance, but it can never exceed the hard cap.
    throw error;
  }
}

export type RunSummary = {
  runId: string | null;
  skipped?: string;
  observationStatus?: ObservationGate["status"];
  reverified: { checked: number; unpublished: number };
  refreshed?: { path: string; ok: boolean };
  published?: { path: string; ok: boolean };
  paused: boolean;
  errors: string[];
};

async function claimRun(sql: Sql, ownerToken: string): Promise<string | null> {
  await sql`
    update content_engine_runs
    set status = 'failed', completed_at = now(), error = 'Recovered a stale content-engine run.'
    where status in ('queued', 'running')
      and coalesce(heartbeat_at, started_at, created_at) < now() - ${STALE_RUN_AFTER}::interval
  `;
  const queued = await sql<{ id: string }>`
    with candidate as (
      select id from content_engine_runs
      where status = 'queued' and owner_token is null
      order by created_at asc
      for update skip locked
      limit 1
    )
    update content_engine_runs as runs
    set status = 'running', started_at = now(), heartbeat_at = now(), owner_token = ${ownerToken}
    from candidate
    where runs.id = candidate.id
      and runs.status = 'queued'
      and runs.owner_token is null
    returning runs.id
  `;
  if (queued[0]) return queued[0].id;
  const created = await sql<{ id: string }>`
    insert into content_engine_runs (status, trigger, owner_token, started_at, heartbeat_at)
    select 'running', 'scheduler', ${ownerToken}, now(), now()
    where not exists (select 1 from content_engine_runs where status in ('queued', 'running'))
      and not exists (
        select 1 from content_engine_runs
        where status in ('completed', 'failed') and next_due_at > now()
      )
    on conflict ((true)) where status in ('queued', 'running') do nothing
    returning id
  `;
  return created[0]?.id ?? null;
}

async function heartbeat(sql: Sql, runId: string, ownerToken: string) {
  const rows = await sql<{ id: string }>`
    update content_engine_runs set heartbeat_at = now()
    where id = ${runId} and status = 'running' and owner_token = ${ownerToken}
    returning id
  `;
  if (!rows[0]) throw new Error("Content-engine run ownership was fenced.");
}

/** Queue a manual run; the scheduler process picks it up within a minute. */
export async function requestManualRun(sql: Sql): Promise<string | null> {
  const rows = await sql<{ id: string }>`
    insert into content_engine_runs (status, trigger)
    select 'queued', 'manual'
    where not exists (select 1 from content_engine_runs where status in ('queued', 'running'))
    on conflict ((true)) where status in ('queued', 'running') do nothing
    returning id
  `;
  return rows[0]?.id ?? null;
}

/**
 * Execute one run when one is queued (manual) or due (every RUN_INTERVAL_MS).
 * `force` queues a manual run first, so a run happens even if none is due.
 * Returns the summary, or `skipped` when nothing was due.
 */
export async function runContentEngine(mode: "due" | "force" = "due"): Promise<RunSummary> {
  const sql = await getSql();
  const ownerToken = crypto.randomUUID();
  if (mode === "force") await requestManualRun(sql);
  const runId = await claimRun(sql, ownerToken);
  const summary: RunSummary = { runId, reverified: { checked: 0, unpublished: 0 }, paused: false, errors: [] };
  if (!runId) return { ...summary, skipped: "no run due" };

  try {
    summary.reverified = await reverifyPublished(sql, runId);
    await heartbeat(sql, runId, ownerToken);
    const state = await loadEngineState(sql);
    const observation = await refreshObservationGate(sql);
    summary.observationStatus = observation.status;
    summary.paused = state.paused;

    if (!state.paused && !observation.eligible) {
      summary.skipped = `Autonomous content generation is waiting for the analytics observation gate: ${observation.reason}`;
    } else if (!state.paused) {
      // Refresh one due page (lowest priority for the model budget after re-verification).
      const due = await sql<PageRow>`
        select id, kind, path, subject_id, status, current_version_id, title, description, next_refresh_at, updated_at
        from content_pages
        where status = 'published' and next_refresh_at is not null and next_refresh_at <= now()
        order by next_refresh_at asc limit 1
      `;
      const refreshTopic = due[0] ? allTopics().find((topic) => topic.kind === due[0]?.kind && topic.subjectId === due[0]?.subject_id) : undefined;
      if (due[0] && !refreshTopic) {
        // The subject left the catalog (e.g. out of stock): stop serving the page.
        await unpublishPage(sql, due[0], "Subject is no longer in the active catalog.", "scheduler", runId);
      } else if (due[0] && refreshTopic) {
        try {
          const result = await generateWithBudget(sql, refreshTopic, state);
          if (result) {
            await heartbeat(sql, runId, ownerToken);
            const outcome = await publishGenerated(sql, refreshTopic, result, runId, "refresh");
            summary.refreshed = { path: refreshTopic.path, ok: outcome.published };
            const paused = await noteGateResult(sql, result.ok, runId, refreshTopic.path);
            if (paused) state.paused = true;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "refresh failed";
          summary.errors.push(`refresh ${refreshTopic.path}: ${message}`);
          await recordEvent(sql, "error", { stage: "refresh", path: refreshTopic.path, message: message.slice(0, 300) }, due[0].id, runId);
        }
      }
      await heartbeat(sql, runId, ownerToken);

      if (!state.paused && state.publishesToday < state.dailyPublishCap) {
        const topic = await pickNextTopic(sql);
        if (topic) {
          try {
            const result = await generateWithBudget(sql, topic, state);
            if (result) {
              await heartbeat(sql, runId, ownerToken);
              const outcome = await publishGenerated(sql, topic, result, runId, "publish");
              summary.published = { path: topic.path, ok: outcome.published };
              if (outcome.published) {
                await sql`update content_engine_state set publishes_today = publishes_today + 1, updated_at = now() where id = true`;
              }
              const paused = await noteGateResult(sql, result.ok, runId, topic.path);
              if (paused) summary.paused = true;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "publish failed";
            summary.errors.push(`publish ${topic.path}: ${message}`);
            await recordEvent(sql, "error", { stage: "publish", path: topic.path, message: message.slice(0, 300) }, null, runId);
          }
        }
      }
    }

    await sql`
      update content_engine_runs
      set status = 'completed', completed_at = now(), next_due_at = now() + ${`${Math.round(RUN_INTERVAL_MS / 1000)} seconds`}::interval,
        summary = ${JSON.stringify(summary)}::jsonb
      where id = ${runId} and owner_token = ${ownerToken}
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "content-engine run failed";
    summary.errors.push(message);
    await sql`
      update content_engine_runs
      set status = 'failed', completed_at = now(), error = ${message.slice(0, 300)},
        next_due_at = now() + ${`${Math.round(RUN_INTERVAL_MS / 1000)} seconds`}::interval,
        summary = ${JSON.stringify(summary)}::jsonb
      where id = ${runId} and owner_token = ${ownerToken}
    `;
  }
  return summary;
}

/** Admin: pause or resume. Resuming clears the auto-pause counter. */
export async function setPaused(sql: Sql, paused: boolean, actor: string, reason?: string) {
  await sql`
    update content_engine_state
    set paused = ${paused}, paused_reason = ${paused ? (reason ?? "Paused by admin.").slice(0, 300) : null},
      paused_by = ${paused ? actor : null},
      consecutive_gate_failures = case when ${paused} then consecutive_gate_failures else 0 end,
      updated_at = now()
    where id = true
  `;
  await recordEvent(sql, paused ? "paused" : "resumed", { reason: reason ?? null }, null, null, actor);
}

/**
 * Admin: make an earlier passed version current (rollback) or re-publish the
 * current one. The deterministic gate runs again on the chosen version and the
 * model self-audit is repeated, so a stale version can never bypass the gate.
 */
export async function restoreVersion(sql: Sql, pageId: string, versionId: string | null, actor: string) {
  const pages = await sql<PageRow>`
    select id, kind, path, subject_id, status, current_version_id, title, description, next_refresh_at, updated_at
    from content_pages where id = ${pageId} limit 1
  `;
  const page = pages[0];
  if (!page) return { ok: false as const, error: "Page not found." };
  const targetId = versionId ?? page.current_version_id;
  if (!targetId) return { ok: false as const, error: "No version to restore." };
  const versions = await sql<VersionRow>`
    select id, page_id, version, title, description, body, gate_status, gate_report
    from content_versions where id = ${targetId} and page_id = ${pageId} limit 1
  `;
  const version = versions[0];
  if (!version) return { ok: false as const, error: "Version not found." };
  const topic = findTopic(page.kind, page.subject_id);
  if (!topic) return { ok: false as const, error: "Subject is no longer in the active catalog." };
  const deterministic = runDeterministicGate({ title: version.title, description: version.description, body: version.body });
  if (!deterministic.ok) {
    return { ok: false as const, error: `Version ${version.version} fails the current ruleset: ${deterministic.violations[0]?.excerpt ?? "violation"}` };
  }
  await loadEngineState(sql);
  const reserved = await reserveModelCalls(sql, 1);
  if (reserved === null) return { ok: false as const, error: "The daily content model-call budget is exhausted." };
  const audit = await auditExisting(topic, { title: version.title, description: version.description, body: version.body });
  if (!audit.ok) return { ok: false as const, error: `Version ${version.version} failed the model self-audit.` };
  const report: GateReport = { ...version.gate_report, ruleset: RULESET_VERSION, deterministic, model: { ok: true, violations: [] }, checkedAt: new Date().toISOString() };
  await withTransaction(async (tx) => {
    await tx`update content_versions set gate_status = 'passed', gate_report = ${JSON.stringify(report)}::jsonb where id = ${version.id}`;
    await tx`
      update content_pages
      set status = 'published', current_version_id = ${version.id}, title = ${version.title},
        description = ${version.description}, published_at = coalesce(published_at, now()),
        first_published_at = coalesce(first_published_at, now()), content_updated_at = now(),
        last_verified_at = now(), unpublish_reason = null, updated_at = now(),
        next_refresh_at = coalesce(next_refresh_at, now() + ${`${REFRESH_AFTER_DAYS} days`}::interval)
      where id = ${pageId}
    `;
  });
  await recordEvent(
    sql,
    versionId && versionId !== page.current_version_id ? "rolled_back" : "republished",
    { version: version.version },
    pageId,
    null,
    actor,
  );
  await submitIndexNow(sql, affectedPaths({ kind: page.kind, path: page.path, body: version.body }), `restore ${page.path}`);
  return { ok: true as const, version: version.version };
}

export function absoluteContentUrl(path: string) {
  return new URL(path, `${serverSiteUrl()}/`).toString();
}
