import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(root, path), "utf8");

test("checkout cannot submit a stale server quote", () => {
  const checkout = source("src/routes/checkout.tsx");
  assert.match(checkout, /setQuote\(null\);\s*setQuoteStatus\("error"\)/);
  assert.match(checkout, /quoteStatus !== "ready" \|\| !quote/);
  assert.match(checkout, /name="payment-method"/);
  assert.match(checkout, /type="radio"/);
});

test("subscription checkout retries through one durable idempotency key", () => {
  const api = source("src/lib/subscriptions.server.ts");
  const migration = source("migrations/0038_runtime_integrity.sql");
  assert.match(api, /client_idempotency_key/);
  assert.match(api, /idempotencyKey: `subscription-checkout-\$\{idempotencyKey\}`/);
  assert.match(migration, /store_subscriptions_client_idempotency_uidx/);
});

test("public partner and investor leads have a durable notification path", () => {
  const contactApi = source("src/lib/public-contact-api.ts");
  const worker = source("src/lib/contact-notify.server.ts");
  const migration = source("migrations/0040_contact_notification_outbox.sql");
  const scheduler = source("scripts/email-scheduler.ts");
  assert.match(contactApi, /queueContactNotification/);
  assert.match(worker, /contact_notification_emails/);
  assert.match(worker, /status = case when attempts >=/);
  assert.match(migration, /unique \(contact_kind, contact_id\)/);
  assert.match(scheduler, /flushContactEmails/);
});

test("public investor metrics disclose live-ledger provenance", () => {
  const contactApi = source("src/lib/public-contact-api.ts");
  const partners = source("src/routes/partners.tsx");
  assert.match(contactApi, /aggregate-only diligence snapshot/);
  assert.match(contactApi, /paid_orders/);
  assert.match(partners, /Evidence and provenance/);
  assert.match(partners, /not actual customer AOV, net profit, ROI, or a forecast/);
});

test("Stripe adjustment records retain the verified ledger event id", () => {
  const events = source("src/lib/stripe-events.server.ts");
  assert.match(events, /recordPaymentAdjustment\(sql, eventId, type, object, objectId\)/);
  assert.match(events, /\$\{eventId\}, \$\{objectIdValue\}/);
  assert.match(events, /Invoice amount or currency does not match/);
});

test("readiness checks the worker recovery indexes", () => {
  const ready = source("src/routes/api/health/ready.ts");
  assert.match(ready, /store_orders_access_key_expiry_idx/);
  assert.match(ready, /stripe_event_ledger_reclaim_idx/);
  assert.match(ready, /newsletter_deliveries/);
});

test("publish schema avoids boolean shorthand check serialization", () => {
  const observationGate = source("migrations/0034_manager_observation_gate.sql");
  const repair = source("migrations/0039_publish_schema_boolean_check.sql");
  assert.match(observationGate, /id boolean primary key default true,\s*$/m);
  assert.doesNotMatch(observationGate, /id boolean primary key default true check/i);
  assert.match(repair, /drop constraint if exists manager_observation_gate_id_check/i);
});