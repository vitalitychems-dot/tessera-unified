import { createFileRoute } from "@tanstack/react-router";

function validPort(value: string | undefined) {
  const port = Number(value);
  return Boolean(value) && Number.isInteger(port) && port > 0 && port <= 65535;
}

export const Route = createFileRoute("/api/health/ready")({
  server: {
    handlers: {
      GET: async () => {
        const production = process.env.NODE_ENV === "production";
        const checks: Record<string, boolean> = {
          env: Boolean(process.env.DATABASE_URL?.trim()) &&
            (!production || validPort(process.env.PORT)),
          database: false,
          migrations: false,
        };
        let error: string | undefined;
        if (checks.env) {
          try {
            const { getSql } = await import("@/lib/db");
            const sql = await getSql();
            await sql.query("select 1 as ok");
            checks.database = true;
            // Publish synchronizes the production schema from the development
            // database; it does not execute these SQL migration files or update
            // their filename ledger. Verify required schema objects directly.
            const schema = await sql<{ present: boolean }>`
              select
                 (
                    select count(*) = 9
                   from information_schema.tables
                   where table_schema = 'public'
                     and table_name in (
                       'manager_audit_runs',
                        'manager_observation_gate',
                       'content_pages',
                       'content_versions',
                       'content_engine_runs',
                       'content_engine_state',
                       'store_events',
                       'store_order_emails',
                       'content_indexnow_submissions'
                     )
                 )
                 and exists (
                   select 1
                   from pg_indexes
                   where schemaname = 'public'
                     and indexname = 'content_one_active_run_idx'
                 )
                 and (
                   select count(*) = 22
                  from information_schema.columns
                  where table_schema = 'public'
                    and (table_name, column_name) in (
                      ('manager_audit_runs', 'owner_token'),
                      ('manager_audit_runs', 'heartbeat_at'),
                       ('manager_audit_runs', 'observation_status'),
                       ('manager_audit_runs', 'actions_skipped_reason'),
                       ('manager_audit_runs', 'proposed_actions'),
                      ('content_pages', 'current_version_id'),
                      ('content_pages', 'next_refresh_at'),
                      ('content_versions', 'gate_report'),
                      ('content_engine_runs', 'owner_token'),
                      ('content_engine_runs', 'heartbeat_at'),
                       ('content_engine_state', 'daily_model_call_cap'),
                       ('manager_observation_gate', 'id'),
                       ('manager_observation_gate', 'started_at'),
                       ('manager_observation_gate', 'eligible_at'),
                       ('manager_observation_gate', 'status'),
                       ('manager_observation_gate', 'live_events'),
                       ('manager_observation_gate', 'live_sessions'),
                       ('manager_observation_gate', 'live_days'),
                       ('manager_observation_gate', 'last_checked_at'),
                       ('manager_observation_gate', 'blocked_reason'),
                       ('manager_observation_gate', 'updated_at'),
                       ('store_events', 'provenance')
                    )
                )
                 and exists (
                   select 1 from manager_observation_gate where id = true
                 )
                 and exists (
                   select 1
                   from pg_constraint
                   where conrelid = 'manager_observation_gate'::regclass
                     and pg_get_constraintdef(oid) like '%awaiting_live_data%'
                 )
                and (
                  select count(*) = 4
                  from information_schema.tables
                  where table_schema = 'public'
                    and table_name in (
                      'stripe_event_ledger',
                      'payment_adjustments',
                      'worker_heartbeats',
                      'staff_access_audit'
                    )
                )
                 and (
                   select count(*) = 6
                   from information_schema.tables
                   where table_schema = 'public'
                     and table_name in (
                       'stripe_event_ledger',
                       'payment_adjustments',
                       'worker_heartbeats',
                       'staff_access_audit',
                       'store_subscriptions',
                       'newsletter_deliveries'
                     )
                 )
                and (
                  select count(*) = 7
                  from information_schema.columns
                  where table_schema = 'public'
                    and (table_name, column_name) in (
                      ('store_orders', 'stripe_invoice_id'),
                      ('store_orders', 'payment_hold'),
                      ('store_orders', 'refund_total'),
                      ('store_orders', 'dispute_status'),
                      ('store_orders', 'access_key_expires_at'),
                      ('store_orders', 'access_key_revoked_at'),
                      ('store_subscriptions', 'stripe_status_at')
                    )
                )
                 and not exists (
                   select 1
                   from (values
                     ('stripe_event_ledger', 'status'),
                     ('stripe_event_ledger', 'attempts'),
                     ('stripe_event_ledger', 'lease_expires_at'),
                     ('payment_adjustments', 'event_id'),
                     ('payment_adjustments', 'order_id'),
                     ('payment_adjustments', 'kind'),
                     ('payment_adjustments', 'amount'),
                     ('worker_heartbeats', 'worker'),
                     ('worker_heartbeats', 'last_seen_at'),
                     ('store_order_emails', 'status'),
                     ('store_order_emails', 'attempts'),
                     ('store_order_emails', 'lease_expires_at'),
                     ('store_order_emails', 'next_attempt_at'),
                     ('store_subscriptions', 'stripe_subscription_id'),
                     ('store_subscriptions', 'next_cycle'),
                     ('newsletter_deliveries', 'status'),
                     ('newsletter_deliveries', 'lease_expires_at')
                   ) required(table_name, column_name)
                   where not exists (
                     select 1
                     from information_schema.columns c
                     where c.table_schema = 'public'
                       and c.table_name = required.table_name
                       and c.column_name = required.column_name
                   )
                 )
                 and exists (
                   select 1 from pg_indexes
                   where schemaname = 'public'
                     and indexname = 'store_orders_access_key_expiry_idx'
                 )
                 and exists (
                   select 1 from pg_indexes
                   where schemaname = 'public'
                     and indexname = 'stripe_event_ledger_reclaim_idx'
                 )
                as present
            `;
            checks.migrations = Boolean(schema[0]?.present);
          } catch (cause) {
            console.error(
              "[health/ready] dependency check failed:",
              cause instanceof Error ? cause.name : "unknown",
            );
            error = "dependency_check_failed";
          }
        }
        const ready = Object.values(checks).every(Boolean);
        return Response.json(
          {
            ok: ready,
            status: ready ? "ready" : "not_ready",
            checks,
            ...(error ? { error } : {}),
          },
          { status: ready ? 200 : 503 },
        );
      },
    },
  },
});