import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(join(root, "migrations", "0014_first_order_review.sql"), "utf8");
const integrityMigration = readFileSync(join(root, "migrations", "0015_checkout_integrity.sql"), "utf8");
const api = readFileSync(join(root, "src", "lib", "checkout", "api.ts"), "utf8");
const settlement = readFileSync(join(root, "src", "lib", "checkout", "settle.server.ts"), "utf8");
const storeApi = readFileSync(join(root, "src", "lib", "store-api.ts"), "utf8");

test("first-order review migration has an explicit approval state and audit fields", () => {
  assert.match(migration, /first_order_review_status/);
  assert.match(migration, /first_order_reviewed_at/);
  assert.match(migration, /first_order_reviewed_by/);
  assert.match(migration, /where first_order_review_required = false/);
});

test("shipping SQL requires approved first-order review", () => {
  assert.match(api, /export const approveFirstOrderReview/);
  assert.match(api, /first_order_review_status = 'approved'/);
  assert.match(api, /first_order_review_required = false\s+or coalesce\(first_order_review_status, 'pending'\) = 'approved'/);
});

test("referral reservation uses canonical email identity and pending cancellation", () => {
  assert.match(api, /requireVerifiedReferralIdentity/);
  assert.match(api, /"emailVerified"/);
  assert.match(api, /fingerprintReferralIdentity\(`email:\$\{canonicalReferralEmail\(identityEmail\)\}`\)/);
  assert.match(api, /on conflict \(referred_key_hash\)/);
  assert.match(api, /status = 'cancelled'/);
  assert.match(api, /Customer referral codes are only valid on a customer's first paid order/);
  assert.match(settlement, /select id from "user" where id = \$\{current\.user_id\} for update/);
});

test("checkout integrity is durable and canonical", () => {
  assert.match(integrityMigration, /first_order_only boolean/);
  assert.match(integrityMigration, /WELCOME10/);
  assert.match(integrityMigration, /store_orders_client_idempotency_uidx/);
  assert.match(integrityMigration, /store_promo_reservations_identity_uidx/);
  assert.match(api, /idempotencyKey\?: string/);
  assert.match(api, /Too many recent unpaid checkout attempts/);
  assert.match(api, /stripe_session_state = 'creating'/);
  assert.match(api, /Stripe checkout is being prepared/);
  assert.match(settlement, /first_order_identity/);
  assert.match(storeApi, /where user_id = \$\{context\.userId\}/);
  assert.doesNotMatch(storeApi, /or \(\$\{email\} <> '' and lower\(email\) = \$\{email\}\)/);
});