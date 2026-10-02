/**
 * Durable order-email outbox worker. Staff actions still expose a manual
 * retry, but delivery must not depend on someone opening an admin tab.
 */
import { getSql } from "../src/lib/db";
import { enqueueDueResearchFollowups, flushOrderEmails } from "../src/lib/checkout/notify.server";
import { flushContactEmails } from "../src/lib/contact-notify.server";
import { processApprovedNewsletters } from "../src/lib/newsletter/automation.server";
import { heartbeatWorker, processStripeEvents } from "../src/lib/stripe-events.server";

const POLL_MS = 60 * 1000;

async function tick() {
  let sql: Awaited<ReturnType<typeof getSql>> | undefined;
  const failures: string[] = [];
  let stripe = { processed: 0, failed: 0, claimed: 0 };
  let followups = 0;
  let result = { sent: 0, failed: 0, skipped: 0, queued: 0 };
  let contacts = { sent: 0, failed: 0, skipped: 0, queued: 0 };
  let newsletters = { sent: 0, failed: 0, skipped: 0, campaigns: 0 };
  try {
    sql = await getSql();
    try {
      stripe = await processStripeEvents(sql, 25);
    } catch (error) {
      failures.push(`stripe: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    try {
      followups = await enqueueDueResearchFollowups(sql, 100);
    } catch (error) {
      failures.push(`followups: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    try {
      result = await flushOrderEmails(sql, { limit: 50 });
    } catch (error) {
      failures.push(`order_email: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    try {
      contacts = await flushContactEmails(sql, { limit: 25 });
    } catch (error) {
      failures.push(`contact_email: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    try {
      newsletters = await processApprovedNewsletters(sql, 100);
    } catch (error) {
      failures.push(`newsletter: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    if (followups) console.log("[email-scheduler] follow-ups queued:", followups);
    if (newsletters.sent || newsletters.failed || newsletters.campaigns) {
      console.log("[email-scheduler] newsletters:", JSON.stringify(newsletters));
    }
    if (result.sent || result.failed || result.skipped) {
      console.log("[email-scheduler] flush:", JSON.stringify(result));
    }
    if (contacts.sent || contacts.failed || contacts.skipped) {
      console.log("[email-scheduler] contact flush:", JSON.stringify(contacts));
    }
    if (stripe.processed || stripe.failed) {
      console.log("[email-scheduler] stripe events:", JSON.stringify(stripe));
    }
    await heartbeatWorker(
      sql,
      "commerce-worker",
      failures.length === 0,
      failures.length ? failures.join("; ").slice(0, 500) : undefined,
      stripe.processed + result.sent + contacts.sent,
    );
  } catch (error) {
    try {
      const heartbeatSql = sql ?? await getSql();
      await heartbeatWorker(heartbeatSql, "commerce-worker", false, error instanceof Error ? error.message : "unknown error");
    } catch {
      // The original database error is the useful diagnostic.
    }
    console.error(
      "[email-scheduler] tick failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

let stopping = false;
let waitTimer: NodeJS.Timeout | undefined;

async function main() {
  await tick();
  while (!stopping) {
    await new Promise<void>((resolve) => {
      waitTimer = setTimeout(resolve, POLL_MS);
    });
    waitTimer = undefined;
    if (!stopping) await tick();
  }
}

function stop() {
  stopping = true;
  if (waitTimer) clearTimeout(waitTimer);
}

process.once("SIGTERM", stop);
process.once("SIGINT", stop);
void main().catch((error) => {
  console.error(
    "[email-scheduler] fatal:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});