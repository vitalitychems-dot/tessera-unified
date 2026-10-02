import type { Sql } from "@/lib/db";

export const OBSERVATION_DAYS = 28;
export const MIN_LIVE_EVENTS = 50;
export const MIN_LIVE_SESSIONS = 10;
export const MIN_LIVE_DAYS = 7;

export type ObservationStatus = "awaiting_live_data" | "observing" | "eligible";

export type ObservationGate = {
  status: ObservationStatus;
  startedAt: string | null;
  eligibleAt: string | null;
  liveEvents: number;
  liveSessions: number;
  liveDays: number;
  lastCheckedAt: string | null;
  reason: string;
  eligible: boolean;
};

type GateRow = {
  status: ObservationStatus;
  started_at: string | null;
  eligible_at: string | null;
  live_events: number;
  live_sessions: number;
  live_days: number;
  last_checked_at: string | null;
  blocked_reason: string | null;
};

function reasonFor(status: ObservationStatus, row: GateRow) {
  if (status === "awaiting_live_data") {
    return "Waiting for the first server-classified live analytics event.";
  }
  if (status === "eligible") {
    return "Four weeks of live analytics and the minimum sample are available.";
  }
  const remainingEvents = Math.max(0, MIN_LIVE_EVENTS - Number(row.live_events || 0));
  const remainingSessions = Math.max(0, MIN_LIVE_SESSIONS - Number(row.live_sessions || 0));
  const remainingDays = Math.max(0, MIN_LIVE_DAYS - Number(row.live_days || 0));
  const sample =
    remainingEvents || remainingSessions || remainingDays
      ? `Minimum sample remaining: ${remainingEvents} live events, ${remainingSessions} live sessions, and ${remainingDays} live days.`
      : "The four-week observation period is still in progress.";
  return sample;
}

function mapGate(row: GateRow): ObservationGate {
  return {
    status: row.status,
    startedAt: row.started_at,
    eligibleAt: row.eligible_at,
    liveEvents: Number(row.live_events) || 0,
    liveSessions: Number(row.live_sessions) || 0,
    liveDays: Number(row.live_days) || 0,
    lastCheckedAt: row.last_checked_at,
    reason: row.blocked_reason ?? reasonFor(row.status, row),
    eligible: row.status === "eligible",
  };
}

export async function ensureObservationStarted(sql: Sql) {
  const rows = await sql<{ started_at: string; eligible_at: string }>`
    update manager_observation_gate
    set started_at = now(),
      eligible_at = now() + ${`${OBSERVATION_DAYS} days`}::interval,
      status = 'observing',
      blocked_reason = 'Four-week live-analytics observation is in progress.',
      updated_at = now()
    where id = true and started_at is null
    returning started_at, eligible_at
  `;
  return rows[0] ?? null;
}

export async function loadObservationGate(sql: Sql): Promise<ObservationGate> {
  let rows = await sql<GateRow>`
    select status, started_at, eligible_at, live_events, live_sessions, live_days,
      last_checked_at, blocked_reason
    from manager_observation_gate
    where id = true
    limit 1
  `;
  if (!rows[0]) {
    // Publish synchronizes the schema but does not reliably replay data-only
    // migration statements. Repair the singleton idempotently at the boundary
    // instead of making every read-only manager surface fail closed.
    await sql`
      insert into manager_observation_gate (id, status, blocked_reason)
      values (true, 'awaiting_live_data', 'Waiting for the first server-classified live analytics event.')
      on conflict (id) do nothing
    `;
    rows = await sql<GateRow>`
      select status, started_at, eligible_at, live_events, live_sessions, live_days,
        last_checked_at, blocked_reason
      from manager_observation_gate
      where id = true
      limit 1
    `;
  }
  if (!rows[0]) throw new Error("Manager observation gate is unavailable.");
  return mapGate(rows[0]);
}

/**
 * Refreshes the gate from immutable, server-classified live events. Browser
 * callers cannot set the provenance or mark the observation period complete.
 */
export async function refreshObservationGate(sql: Sql): Promise<ObservationGate> {
  const current = await loadObservationGate(sql);
  if (!current.startedAt) return current;

  const metrics = await sql<{ live_events: number; live_sessions: number; live_days: number }>`
    select count(*)::int as live_events,
      count(distinct session_id)::int as live_sessions,
      count(distinct (created_at at time zone 'America/Chicago')::date)::int as live_days
    from store_events
    where provenance = 'live'
      and created_at >= ${current.startedAt}::timestamptz
  `;
  const metric = metrics[0] ?? { live_events: 0, live_sessions: 0, live_days: 0 };
  const elapsed = current.eligibleAt ? Date.now() >= new Date(current.eligibleAt).getTime() : false;
  const eligible =
    elapsed &&
    Number(metric.live_events) >= MIN_LIVE_EVENTS &&
    Number(metric.live_sessions) >= MIN_LIVE_SESSIONS &&
    Number(metric.live_days) >= MIN_LIVE_DAYS;
  const status: ObservationStatus = eligible ? "eligible" : "observing";
  const reason = reasonFor(status, {
    status,
    started_at: current.startedAt,
    eligible_at: current.eligibleAt,
    live_events: Number(metric.live_events) || 0,
    live_sessions: Number(metric.live_sessions) || 0,
    live_days: Number(metric.live_days) || 0,
    last_checked_at: new Date().toISOString(),
    blocked_reason: null,
  });
  const updated = await sql<GateRow>`
    update manager_observation_gate
    set status = ${status},
      live_events = ${Number(metric.live_events) || 0},
      live_sessions = ${Number(metric.live_sessions) || 0},
      live_days = ${Number(metric.live_days) || 0},
      last_checked_at = now(),
      blocked_reason = ${eligible ? null : reason},
      updated_at = now()
    where id = true
    returning status, started_at, eligible_at, live_events, live_sessions, live_days,
      last_checked_at, blocked_reason
  `;
  if (!updated[0]) throw new Error("Manager observation gate disappeared.");
  return mapGate(updated[0]);
}