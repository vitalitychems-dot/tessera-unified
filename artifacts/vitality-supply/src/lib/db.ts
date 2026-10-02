/**
 * Server-only Postgres access on top of the shared pool in `db-pool.server.ts`.
 *
 * DATABASE_URL is required in every environment. There is deliberately no
 * embedded/in-memory fallback: a missing connection string fails loudly
 * instead of silently running on a throwaway database. Schema comes from
 * `migrations/*.sql` (apply with `pnpm run migrate`); never create tables
 * inline in server functions.
 *
 * `pg` is imported lazily so this module stays safe to reference from files
 * that are also bundled for the browser; `getSql()` itself refuses to run there.
 */
import { createServerOnlyFn } from "@tanstack/react-start";

/**
 * Minimal SQL surface. Both the tagged-template and `.query()` forms resolve
 * to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

let sqlPromise: Promise<Sql> | undefined;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  const { getPool } = await import("./db-pool.server");
  const pool = getPool();
  return toSql(async <T>(text: string, params: unknown[]) => {
    const res = await pool.query(text, params);
    return res.rows as T[];
  });
}

/**
 * Get the shared, **server-only** SQL client. Memoized — safe to call per
 * request. A failed initialisation (e.g. DATABASE_URL missing) is not
 * memoized, so the next call retries once the configuration is fixed.
 */
export const getSql = createServerOnlyFn(function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = undefined;
    throw err;
  });
  return sqlPromise;
});

/**
 * Run `fn` inside one database transaction on a dedicated connection. Commits when
 * `fn` resolves, rolls back when it throws. Use for any multi-statement money movement
 * (settlement, refunds) so a crash midway cannot leave half the side effects applied.
 */
export const withTransaction = createServerOnlyFn(async function withTransaction<T>(
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  if (typeof window !== "undefined") throw new Error("withTransaction is server-only.");
  const { getPool } = await import("./db-pool.server");
  const client = await getPool().connect();
  const tx = toSql(async <R>(text: string, params: unknown[]) => {
    const res = await client.query(text, params);
    return res.rows as R[];
  });
  try {
    await client.query("begin");
    const result = await fn(tx);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});
