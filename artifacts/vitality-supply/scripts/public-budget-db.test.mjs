import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

test("database budget permits maximum and denies maximum plus one", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const action = `boundary-${randomUUID()}`;
  const callerKey = "a".repeat(64);
  const otherCallerKey = "b".repeat(64);
  try {
    await client.query("begin");
    await client.query(
      `insert into public_action_limits
        (action, request_key, window_started_at, request_count, last_request_at)
       values ($1, $2, now(), 4999, now())`,
      [action, callerKey],
    );
    const consume = (requestKey) => client.query(
      `insert into public_action_limits
        (action, request_key, window_started_at, request_count, last_request_at)
       values ($1, $2, now(), 1, now())
       on conflict (action, request_key) do update set
         request_count = public_action_limits.request_count + 1,
         last_request_at = now()
       where public_action_limits.request_count < 5000
       returning request_count`,
      [action, requestKey],
    );
    const maximum = await consume(callerKey);
    assert.equal(maximum.rows[0]?.request_count, 5000);
    const denied = await consume(callerKey);
    assert.equal(denied.rowCount, 0);
    const stored = await client.query(
      "select request_count from public_action_limits where action = $1 and request_key = $2",
      [action, callerKey],
    );
    assert.equal(stored.rows[0]?.request_count, 5000);
    const otherCaller = await consume(otherCallerKey);
    assert.equal(otherCaller.rows[0]?.request_count, 1);
    const rowsForAction = await client.query(
      "select count(*)::int as count from public_action_limits where action = $1",
      [action],
    );
    assert.equal(rowsForAction.rows[0]?.count, 2);

    await client.query(
      `insert into public_action_limits
        (action, request_key, window_started_at, request_count, last_request_at)
       values ($1, $2, now() - interval '3 hours', 1, now() - interval '3 hours')`,
      [action, "c".repeat(64)],
    );
    await client.query(`
      with old_public as (
        select ctid from public_action_limits
        where last_request_at < now() - interval '2 hours' limit 100
      )
      delete from public_action_limits
      where ctid in (select ctid from old_public)
    `);
    const stale = await client.query(
      "select count(*)::int as count from public_action_limits where action = $1 and request_key = $2",
      [action, "c".repeat(64)],
    );
    assert.equal(stale.rows[0]?.count, 0);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});