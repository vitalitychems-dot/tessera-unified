import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { test } from "node:test";
import type { Sql } from "../src/lib/db";
import { answerManagerQuestion } from "../src/lib/ai-manager";
import { loadObservationGate, refreshObservationGate } from "../src/lib/manager-observation.server";

function sqlFor(client: pg.ClientBase): Sql {
  const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
      text += `$${index + 1}${strings[index + 1] ?? ""}`;
    }
    const result = await client.query(text, values);
    return result.rows as T[];
  }) as Sql;
  sql.query = async <T>(text: string, params: unknown[] = []) =>
    (await client.query(text, params)).rows as T[];
  return sql;
}

function queuedSqlFor(client: pg.ClientBase): Sql {
  const base = sqlFor(client);
  let queue = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation);
    queue = next.then(() => undefined, () => undefined);
    return next;
  };
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
    enqueue(() => base(strings, ...values))) as Sql;
  sql.query = async <T>(text: string, params: unknown[] = []) =>
    enqueue(() => base.query<T>(text, params));
  return sql;
}

type Case = {
  name: string;
  events: number;
  sessions: number;
  days: number;
  expectedEligible: boolean;
};

test("database-backed observation gate enforces every live-data boundary", async (context) => {
  if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
    context.skip("requires a non-production DATABASE_URL");
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const marker = `observation-gate-test-${randomUUID()}`;
  const cases: Case[] = [
    { name: "below event threshold", events: 49, sessions: 10, days: 7, expectedEligible: false },
    { name: "below session threshold", events: 50, sessions: 9, days: 7, expectedEligible: false },
    { name: "below live-day threshold", events: 50, sessions: 10, days: 6, expectedEligible: false },
    { name: "all thresholds met", events: 50, sessions: 10, days: 7, expectedEligible: true },
  ];

  try {
    await client.query("begin");
    const table = await client.query<{ exists: string | null }>(
      "select to_regclass('manager_observation_gate') as exists",
    );
    if (!table.rows[0]?.exists) {
      context.skip("observation-gate migration has not been applied");
      await client.query("rollback");
      return;
    }

    for (const scenario of cases) {
      await client.query("delete from store_events where session_id like $1", [`${marker}:%`]);
      await client.query(`
        update manager_observation_gate
        set started_at = now() - interval '35 days',
            eligible_at = now() - interval '1 second',
            status = 'observing',
            live_events = 0,
            live_sessions = 0,
            live_days = 0,
            last_checked_at = null,
            blocked_reason = 'test'
        where id = true
      `);

      for (let index = 0; index < scenario.events; index += 1) {
        const session = `${marker}:${index % scenario.sessions}`;
        const dayOffset = index % scenario.days;
        await client.query(
          `insert into store_events
             (created_at, session_id, event, path, provenance)
           values (now() - ($1::int * interval '1 day'), $2, 'page_view', '/', 'live')`,
          [dayOffset, session],
        );
      }
      // A test-provenance event must never help an otherwise incomplete gate.
      await client.query(
        `insert into store_events (session_id, event, path, provenance)
         values ($1, 'page_view', '/', 'test')`,
        [`${marker}:test-provenance`],
      );

      const gate = await refreshObservationGate(sqlFor(client));
      assert.equal(gate.eligible, scenario.expectedEligible, scenario.name);
      assert.equal(gate.liveEvents, scenario.events, `${scenario.name}: event count`);
      assert.equal(gate.liveSessions, scenario.sessions, `${scenario.name}: session count`);
      assert.equal(gate.liveDays, scenario.days, `${scenario.name}: day count`);
      assert.equal(gate.status, scenario.expectedEligible ? "eligible" : "observing", scenario.name);
    }
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test("a missing singleton is repaired without enabling autonomous actions or blocking read-only chat", async (context) => {
  if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
    context.skip("requires a non-production DATABASE_URL");
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const sql = queuedSqlFor(client);
  const previousKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const previousBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  try {
    await client.query("begin");
    const table = await client.query<{ exists: string | null }>(
      "select to_regclass('manager_observation_gate') as exists",
    );
    if (!table.rows[0]?.exists) {
      context.skip("observation-gate migration has not been applied");
      await client.query("rollback");
      return;
    }

    const beforeActions = await client.query<{ count: string }>("select count(*)::text as count from manager_actions");
    await client.query("delete from manager_observation_gate where id = true");
    delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    delete process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    const response = await answerManagerQuestion(sql, "What is the largest funnel opportunity?");
    assert.match(response.answer, /AI provider is unavailable|manager records/i);

    const gate = await loadObservationGate(sql);
    assert.equal(gate.status, "awaiting_live_data");
    assert.equal(gate.eligible, false);
    const afterActions = await client.query<{ count: string }>("select count(*)::text as count from manager_actions");
    assert.equal(afterActions.rows[0]?.count, beforeActions.rows[0]?.count);
  } finally {
    if (previousKey === undefined) delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    else process.env.AI_INTEGRATIONS_OPENAI_API_KEY = previousKey;
    if (previousBase === undefined) delete process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    else process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = previousBase;
    await client.query("rollback").catch(() => undefined);
    client.release();
    await pool.end();
  }
});
