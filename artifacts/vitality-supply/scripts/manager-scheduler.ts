/**
 * Long-lived production scheduler. It runs outside request handling so daily
 * audits continue even when no administrator opens the dashboard.
 */
import { getSql } from "../src/lib/db";
import { executeAudit } from "../src/lib/manager-api";
import { refreshObservationGate } from "../src/lib/manager-observation.server";

const INTERVAL_MS = 60 * 60 * 1000;
const STALE_AFTER = "2 hours";

async function tick() {
  const sql = await getSql();
  const observation = await refreshObservationGate(sql);
  console.log(
    `[manager-scheduler] observation ${observation.status} (${observation.liveEvents} live events, ${observation.liveSessions} sessions)`,
  );
  await sql`
    update manager_audit_runs
    set status = 'failed', completed_at = now(),
      error = 'Scheduler recovered a stale audit run.'
    where status in ('queued', 'running')
      and coalesce(started_at, created_at) < now() - ${STALE_AFTER}::interval
  `;
  const due = await sql<{ id: string }>`
    insert into manager_audit_runs (status, trigger, next_due_at)
    select 'queued', 'scheduler', now() + interval '1 day'
    where not exists (
      select 1 from manager_audit_runs
      where status in ('queued', 'running')
    )
    and not exists (
      select 1 from manager_audit_runs
      where status in ('completed', 'failed') and next_due_at > now()
    )
    on conflict ((true)) where status in ('queued', 'running') do nothing
    returning id
  `;
  if (due[0]) await executeAudit(due[0].id, "scheduler", "scheduler");
}

let stopping = false;
let waitTimer: NodeJS.Timeout | undefined;
async function runTick() {
  try {
    await tick();
  } catch (error) {
    // A transient database or model failure must not permanently disable the
    // daily scheduler process. The next interval will retry the fenced run.
    console.error(
      "[manager-scheduler] tick failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function main() {
  await runTick();
  while (!stopping) {
    await new Promise<void>((resolve) => {
      waitTimer = setTimeout(resolve, INTERVAL_MS);
    });
    waitTimer = undefined;
    if (!stopping) {
      await runTick();
    }
  }
}

function stop() {
  stopping = true;
  if (waitTimer) clearTimeout(waitTimer);
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
void main().catch((error) => {
  console.error("[manager-scheduler] fatal:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});