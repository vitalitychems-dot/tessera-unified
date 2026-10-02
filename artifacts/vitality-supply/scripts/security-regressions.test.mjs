import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkout = readFileSync(join(root, "src", "lib", "checkout", "api.ts"), "utf8");
const quote = readFileSync(join(root, "src", "lib", "checkout", "quote.ts"), "utf8");
const settlement = readFileSync(join(root, "src", "lib", "checkout", "settle.server.ts"), "utf8");
const store = readFileSync(join(root, "src", "lib", "store-api.ts"), "utf8");
const analyticsApi = readFileSync(join(root, "src", "lib", "analytics-event-api.ts"), "utf8");
const newsletter = readFileSync(join(root, "src", "lib", "newsletter", "api.ts"), "utf8");
const promo = readFileSync(join(root, "src", "lib", "promo.ts"), "utf8");
const migration = readFileSync(join(root, "migrations", "0016_public_submission_safeguards.sql"), "utf8");
const endpointBudgets = readFileSync(join(root, "migrations", "0018_public_endpoint_budgets.sql"), "utf8");
const callerBudgets = readFileSync(join(root, "migrations", "0032_public_budgets_per_caller.sql"), "utf8");
const publicAbuse = readFileSync(join(root, "src", "lib", "public-abuse.server.ts"), "utf8");
const login = readFileSync(join(root, "src", "routes", "login.tsx"), "utf8");

test("self-referral checks owner id/email inside the order transaction", () => {
  assert.match(checkout, /if \(referralOwnerId\) \{\s+const ownerRows = await tx/);
  assert.match(checkout, /owner\.id === context\.userId/);
  assert.match(checkout, /canonicalReferralEmail\(ownerEmail\) === canonicalReferralEmail\(identityEmail\)/);
  assert.match(checkout, /regexp_replace\(email, '\\\\\+\[\^@\]\*@', '@'\)/);
});

test("affiliate owners cannot discount their own orders or earn commission", () => {
  assert.match(checkout, /row\.kind === "affiliate" && options\.userId && row\.owner_id === options\.userId/);
  assert.match(checkout, /owner\.id === context\.userId/);
  assert.match(checkout, /canonicalReferralEmail\(ownerEmail\) === canonicalReferralEmail\(contact\.email\)/);
  assert.match(checkout, /affiliate_owner_id, affiliate_commission_rate/);
  assert.match(checkout, /\$\{affiliateCommissionRate\}, \$\{affiliateCommission\}/);
  assert.match(settlement, /affiliate_owner_id, affiliate_commission_rate, affiliate_commission/);
  assert.match(settlement, /const commissionRate = n\(order\.affiliate_commission_rate\)/);
  assert.doesNotMatch(settlement, /select kind, owner_id, commission/);
  assert.match(settlement, /canonicalReferralEmail\(affiliateOwner\.email\) === canonicalReferralEmail\(order\.email\)/);
  assert.match(settlement, /const payableCommission = isSelfAffiliate \? 0 : commission/);
  assert.match(settlement, /payableCommission > 0/);
});

test("WELCOME10 is first-order-only and reserved atomically", () => {
  assert.match(promo, /WELCOME10: \{[^}]*firstOrderOnly: true/);
  assert.match(checkout, /insert into store_promo_reservations/);
  assert.match(checkout, /on conflict \(code, customer_identity\) where status in \('pending', 'settled'\) do nothing/);
  assert.match(settlement, /update store_promo_reservations/);
  assert.match(settlement, /set status = 'settled'/);
});

test("checkout rejects oversized carts and requires durable idempotency", () => {
  assert.match(quote, /MAX_CHECKOUT_LINES/);
  assert.match(quote, /input\.lines\.length > MAX_CHECKOUT_LINES/);
  assert.match(checkout, /\^\[A-Za-z0-9_-\]\{16,120\}\$/);
  assert.match(checkout, /store_orders where client_idempotency_key/);
  assert.match(checkout, /MAX_RECENT_UNPAID_ATTEMPTS/);
});

test("authenticated checkout derives contact email from the account", () => {
  assert.match(checkout, /checkoutContact = \{ \.\.\.data\.contact, email: accountEmail \}/);
  assert.match(checkout, /const contact = await validateContact\(checkoutContact\)/);
  assert.match(checkout, /customer_email: contact\.email/);
});

test("public analytics and lead endpoints use durable limits and strict bounds", () => {
  assert.match(analyticsApi, /public_event_limits/);
  assert.match(analyticsApi, /event_count < 120/);
  assert.match(store, /canonicalEmail\(input\.email\)/);
  assert.match(store, /wholesale_lead_keys/);
  assert.match(store, /coa_request_limits/);
  assert.match(store, /consumePublicBudget\(sql, "coa"/);
  assert.match(store, /consumePublicBudget\(sql, "wholesale"/);
  assert.match(migration, /create table if not exists public_event_limits/);
  assert.match(endpointBudgets, /create table if not exists public_action_limits/);
  assert.match(endpointBudgets, /create table if not exists coa_request_limits/);
  assert.match(callerBudgets, /drop constraint if exists public_action_limits_global_key_ck/);
  assert.match(callerBudgets, /request_key <> ''/);
  assert.match(publicAbuse, /x-forwarded-for/);
  assert.match(publicAbuse, /createHmac/);
  assert.match(publicAbuse, /untrusted-request/);
  assert.match(publicAbuse, /old_public/);
  assert.doesNotMatch(publicAbuse, /headers\.get\("(?:cookie|user-agent|accept-language|sec-ch-ua)/);
  assert.match(publicAbuse, /old_newsletter/);
  assert.match(publicAbuse, /old_wholesale/);
  assert.match(publicAbuse, /old_coa/);
});

test("newsletter responses are generic and resubscribe cannot clear welcome claim", () => {
  assert.match(newsletter, /GENERIC_SUBSCRIPTION_MESSAGE/);
  assert.match(newsletter, /welcome_sent_at = case/);
  assert.match(newsletter, /store_subscribers\.unsubscribed_at is not null/);
  assert.match(newsletter, /newsletter_request_limits/);
  assert.match(newsletter, /confirmation_sent_at < now\(\)/);
  assert.match(newsletter, /consumePublicBudget\(sql, "newsletter"/);
});

test("public merchandising only reads persisted rankings", () => {
  const handler = store.match(
    /export const loadLiveMerch[\s\S]*?\n\}\);/,
  )?.[0];
  assert.ok(handler, "loadLiveMerch handler should exist");
  assert.match(handler, /select product_id, product_name, score/);
  assert.doesNotMatch(handler, /runOptimizerInner|insert into|delete from/);
});

test("checkout has a global abuse budget and cannot cancel orders by submitted email", () => {
  assert.match(checkout, /consumePublicBudget\(sql, "checkout"/);
  assert.doesNotMatch(checkout, /lower\(email\) = \$\{contact\.email\}[\s\S]{0,300}status = 'cancelled'/);
  assert.doesNotMatch(checkout, /"Expired abandoned checkout"/);
});

test("login uses a dedicated defensive redirect validator", () => {
  assert.match(login, /safeLoginRedirect/);
  assert.doesNotMatch(login, /search\.redirect\.startsWith/);
});