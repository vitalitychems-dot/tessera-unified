import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

test("publish-safe index preserves normalized manual-payment uniqueness", async (t) => {
  if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
    t.skip("Run this isolated schema test in development with DATABASE_URL");
    return;
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // No public tables, orders, or schema objects may be changed by this test.
    await client.query("SET LOCAL search_path TO pg_temp");
    await client.query(`CREATE TEMP TABLE store_orders (
      id text PRIMARY KEY, payment_ref text, payment_method text, payment_status text
    ) ON COMMIT DROP`);
    await client.query(
      "INSERT INTO store_orders VALUES ('existing', $1, 'zelle', 'paid')",
      [" AbC \t12\n3\r\f\v"],
    );
    for (const name of [
      "0023_checkout_snapshots.sql",
      "0027_publish_safe_payment_reference_index.sql",
    ]) {
      const migration = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
      await client.query(migration);
    }
    const existing = await client.query(
      "SELECT payment_ref, payment_ref_normalized FROM store_orders WHERE id='existing'",
    );
    assert.equal(existing.rows[0].payment_ref, " AbC \t12\n3\r\f\v", "raw reference is unchanged");
    assert.equal(existing.rows[0].payment_ref_normalized, "abc123", "old rows are backfilled");

    const key = await client.query(`SELECT pg_get_indexdef(indexrelid, 1, true) AS expression
      FROM pg_index WHERE indexrelid='store_orders_paid_manual_payment_ref_uidx'::regclass`);
    assert.equal(key.rows[0].expression, "payment_ref_normalized");
    assert.ok(Buffer.byteLength(key.rows[0].expression) < 63, "publish introspection must not truncate the key");

    async function rejects(query, params, code) {
      await client.query("SAVEPOINT expected_failure");
      try {
        await assert.rejects(client.query(query, params), (err) => err.code === code);
      } finally {
        await client.query("ROLLBACK TO SAVEPOINT expected_failure");
        await client.query("RELEASE SAVEPOINT expected_failure");
      }
    }
    for (const method of ["zelle", "bitcoin", "ethereum"]) {
      await rejects(
        "INSERT INTO store_orders(id,payment_ref,payment_method,payment_status) VALUES ($1,$2,$3,'paid')",
        [`duplicate-${method}`, "a b C 1 2 3", method],
        "23505",
      );
    }
    await client.query(`INSERT INTO store_orders(id,payment_ref,payment_method,payment_status) VALUES
      ('unpaid','ABC123','zelle','unpaid'),
      ('card','ABC123','stripe','paid'),
      ('null-1',null,'zelle','paid'), ('null-2',null,'zelle','paid'),
      ('distinct','other-ref','bitcoin','paid')`);
    await rejects("UPDATE store_orders SET payment_status='paid' WHERE id='unpaid'", [], "23505");
    await rejects("UPDATE store_orders SET payment_ref='Abc 123' WHERE id='distinct'", [], "23505");
    await rejects("UPDATE store_orders SET payment_ref_normalized='override' WHERE id='existing'", [], "428C9");

    await client.query("UPDATE store_orders SET payment_ref=' New Ref ' WHERE id='distinct'");
    const changed = await client.query(
      "SELECT payment_ref_normalized FROM store_orders WHERE id='distinct'",
    );
    assert.equal(changed.rows[0].payment_ref_normalized, "newref", "updates recompute automatically");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await pool.end();
  }
});