import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = readFileSync(join(root, "src", "lib", "checkout", "api.ts"), "utf8");
const account = readFileSync(join(root, "src", "lib", "store-api.ts"), "utf8");
const migration = readFileSync(join(root, "migrations", "0017_guest_order_claims.sql"), "utf8");

test("guest order claiming requires authenticated verified ownership", () => {
  assert.match(api, /export const claimGuestOrders = createServerFn/);
  assert.match(api, /\.middleware\(\[authMiddleware\]\)/);
  assert.match(api, /"emailVerified"/);
  assert.match(api, /user\.emailVerified !== true/);
  assert.match(api, /where user_id is null and lower\(email\) = \$\{email\}/);
  assert.match(api, /withTransaction/);
});

test("account order history remains scoped by user id", () => {
  assert.match(account, /from store_orders\s+where user_id = \$\{context\.userId\}/);
  assert.doesNotMatch(account, /from store_orders\s+where lower\(email\)/);
});

test("guest claim lookup has an ownership index", () => {
  assert.match(migration, /where user_id is null/);
  assert.match(migration, /store_orders_unclaimed_email_idx/);
});