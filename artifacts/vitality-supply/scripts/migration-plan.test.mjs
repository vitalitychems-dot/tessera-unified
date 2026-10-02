import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/nested/0001_auth.sql"), "0001_auth.sql");
  assert.equal(migrationName("0001_auth.sql"), "0001_auth.sql");
});

test("a file already applied from another directory does not re-apply", () => {
  assert.deepEqual(pendingMigrations(["/migrations/0001_auth.sql"], ["0001_auth.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped", () => {
  assert.equal(isMigrationFile("notes"), false);
  assert.deepEqual(pendingMigrations(["notes", "README.md"], []), []);
});

test("every shipped migration is numbered and unique", () => {
  const names = pendingMigrations(readdirSync(migrationsDir), []).map((m) => m.name);
  assert.ok(names.length >= 9, "expected the store, auth, checkout and newsletter migrations");
  for (const name of names) assert.match(name, /^\d{4}_[a-z0-9_]+\.sql$/);
  const prefixes = names.map((n) => n.slice(0, 4));
  assert.equal(new Set(prefixes).size, prefixes.length, "duplicate migration number");
});

test("store event provenance migration backfills test data and adds live indexes", () => {
  const sql = readFileSync(join(migrationsDir, "0030_store_event_provenance.sql"), "utf8");
  assert.match(sql, /add column if not exists provenance/);
  assert.match(sql, /set provenance = 'test'/);
  assert.match(sql, /store_events_live_current_idx/);
  assert.match(sql, /store_events_live_product_idx/);
});
