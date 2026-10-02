import { Pool, types } from "pg";

/**
 * The single node-postgres pool for this process, shared by app queries
 * (`@/lib/db`) and Better Auth so the two never compete for the hosted
 * database's connection limit. Memoized on globalThis: dev HMR re-evaluates
 * modules, and each evaluation must reuse the pool instead of opening another.
 *
 * Server-only — never import from client code (`@/lib/db` loads this lazily).
 *
 * TLS is driven by the connection string (`?sslmode=require` on Replit /
 * Neon URLs), so the same code works against a plain local Postgres.
 */

// Result-type parity so every query returns JSON-safe values:
//   int8/bigint (incl. count(*)) -> number   (past 2^53 loses precision — cast
//                                            `::text` for huge integers)
//   date                         -> 'YYYY-MM-DD' string
//   interval                     -> Postgres interval text
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;
types.setTypeParser(OID_INT8, Number);
types.setTypeParser(OID_DATE, identity);
types.setTypeParser(OID_INTERVAL, identity);

// An empty/whitespace DATABASE_URL (an easy misconfig in deploy UIs) must mean
// "unset" so the caller fails loudly instead of the driver guessing localhost.
const rawDatabaseUrl = process.env.DATABASE_URL;
export const databaseUrl = normalizeSslMode(
  rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl.trim() : undefined,
);

/**
 * pg 8.x already treats `sslmode=prefer|require|verify-ca` as `verify-full`
 * (full certificate + hostname verification) and emits a startup security
 * warning asking for the intent to be made explicit before pg 9 switches to
 * the weaker libpq semantics. Pin `verify-full` so production keeps exactly the
 * verification it has today, warning-free. URLs that opt into libpq semantics
 * (`uselibpqcompat=true`) are left untouched.
 */
export function normalizeSslMode(url: string | undefined): string | undefined {
  if (!url || /[?&]uselibpqcompat=/i.test(url)) return url;
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/i, "$1verify-full");
}

const globalRef = globalThis as typeof globalThis & { __vsPgPool__?: Pool };

function poolMax(): number {
  const raw = Number(process.env.PG_POOL_MAX);
  return Number.isInteger(raw) && raw > 0 && raw <= 50 ? raw : 6;
}

/** Shared pool; throws when DATABASE_URL is missing. */
export function getPool(): Pool {
  if (!databaseUrl) {
    throw new Error(
      "[db] DATABASE_URL is not set. Customer, auth, analytics, newsletter and " +
        "checkout services need the Postgres database; public catalog pages do not.",
    );
  }
  if (!globalRef.__vsPgPool__) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: poolMax(),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    // An idle client dropped by the server emits 'error' on the pool; without
    // a listener Node treats it as an unhandled error and exits the process.
    pool.on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });
    globalRef.__vsPgPool__ = pool;
  }
  return globalRef.__vsPgPool__;
}
