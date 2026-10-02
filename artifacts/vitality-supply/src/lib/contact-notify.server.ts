/**
 * Durable owner notifications for public partner and investor submissions.
 * The form transaction queues the intent; this worker owns retries and leases.
 */
import type { Sql } from "@/lib/db";
import type { OutboundEmail } from "@/lib/newsletter/email.server";
import {
  contactNotificationTemplate,
  type ContactNotification,
  type ContactNotificationKind,
} from "./contact-emails";

const LEASE_MINUTES = 10;
const MAX_BACKOFF_SECONDS = 6 * 60 * 60;
const MAX_ATTEMPTS = 8;

export type ContactEmailDeliveryDependencies = {
  emailConfigured?: () => Promise<boolean>;
  sendEmail?: (message: OutboundEmail) => Promise<void>;
};

type DeliveryOutcome = "sent" | "failed" | "skipped" | "busy" | "not_ready";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function queueContactNotification(
  sql: Sql,
  kind: ContactNotificationKind,
  contactId: number,
) {
  const rows = await sql<{ id: number }>`
    insert into contact_notification_emails (contact_kind, contact_id)
    values (${kind}, ${contactId})
    on conflict (contact_kind, contact_id) do nothing
    returning id
  `;
  return rows[0]?.id ?? null;
}

/** Queue a notification and kick the worker without making the public form wait for Resend. */
export async function notifyContact(kind: ContactNotificationKind, contactId: number) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const inserted = await queueContactNotification(sql, kind, contactId);
    const row = inserted
      ? { id: inserted }
      : (await sql<{ id: number }>`
          select id from contact_notification_emails
          where contact_kind = ${kind} and contact_id = ${contactId} and sent_at is null
          limit 1
        `)[0];
    if (row) {
      void deliver(sql, row.id).catch((error: unknown) =>
        console.error(`[contact-email] ${kind} delivery crashed for submission ${contactId}:`, messageOf(error)));
    }
  } catch (error) {
    console.error(`[contact-email] could not queue ${kind} notification for submission ${contactId}:`, messageOf(error));
  }
}

export async function flushContactEmails(
  sql: Sql,
  options: { limit?: number; force?: boolean } = {},
  dependencies: ContactEmailDeliveryDependencies = {},
) {
  const limit = options.limit ?? 25;
  const { emailConfigured } = await import("@/lib/newsletter/email.server");
  const pending = await sql<{ id: number }>`
    select id
    from contact_notification_emails
    where sent_at is null
      and status not in ('dead', 'skipped', 'sent')
      and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
      and (${options.force ? true : false} or next_attempt_at is null or next_attempt_at <= now())
    order by created_at
    limit ${limit}
  `;
  const configured = dependencies.emailConfigured ?? emailConfigured;
  if (pending.length === 0 || !(await configured())) {
    return { sent: 0, failed: 0, skipped: 0, queued: pending.length };
  }
  const result = { sent: 0, failed: 0, skipped: 0, queued: 0 };
  for (const row of pending) {
    const outcome = await deliver(sql, row.id, { force: options.force }, dependencies);
    if (outcome === "sent") result.sent++;
    else if (outcome === "failed") result.failed++;
    else if (outcome === "skipped") result.skipped++;
  }
  return result;
}

export async function contactEmailQueueSnapshot(sql: Sql) {
  const rows = await sql<{
    queued: number;
    failed: number;
    oldest_created_at: string | null;
  }>`
    select
      count(*) filter (where sent_at is null and status not in ('sent', 'skipped'))::int as queued,
      count(*) filter (where sent_at is null and status = 'failed')::int as failed,
      min(created_at) filter (where sent_at is null and status not in ('sent', 'skipped')) as oldest_created_at
    from contact_notification_emails
  `;
  return {
    queued: rows[0]?.queued ?? 0,
    failed: rows[0]?.failed ?? 0,
    oldestCreatedAt: rows[0]?.oldest_created_at ?? null,
  };
}

async function deliver(
  sql: Sql,
  outboxId: number,
  options: { force?: boolean } = {},
  dependencies: ContactEmailDeliveryDependencies = {},
): Promise<DeliveryOutcome> {
  const { emailConfigured, sendEmail } = await import("@/lib/newsletter/email.server");
  const configured = dependencies.emailConfigured ?? emailConfigured;
  const send = dependencies.sendEmail ?? sendEmail;
  if (!(await configured())) return "not_ready";

  const claimed = await sql<{ id: number; contact_kind: string; contact_id: number }>`
    update contact_notification_emails
    set status = 'sending',
      attempts = attempts + 1,
      lease_expires_at = now() + (${LEASE_MINUTES} * interval '1 minute'),
      updated_at = now()
    where id = ${outboxId}
      and sent_at is null
      and status not in ('dead', 'skipped', 'sent')
      and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
      and (${options.force ? true : false} or next_attempt_at is null or next_attempt_at <= now())
    returning id, contact_kind, contact_id
  `;
  const job = claimed[0];
  if (!job || (job.contact_kind !== "partner" && job.contact_kind !== "investor")) return "busy";
  const kind = job.contact_kind as ContactNotificationKind;

  try {
    const contact = await loadContact(sql, kind, job.contact_id);
    if (!contact) {
      await sql`
        update contact_notification_emails
        set status = 'skipped', sent_at = now(), lease_expires_at = null, next_attempt_at = null,
            last_error = 'contact submission no longer exists', updated_at = now()
        where id = ${job.id}
      `;
      return "skipped";
    }
    const settings = await sql<{ value: string }>`
      select value from store_settings where key = 'owner_notification_email' limit 1
    `;
    const ownerEmail = settings[0]?.value?.trim() || "vitalitychems@gmail.com";
    const message = contactNotificationTemplate(kind, contact, ownerEmail);
    await send({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    await sql`
      update contact_notification_emails
      set status = 'sent', sent_at = now(), lease_expires_at = null,
          next_attempt_at = null, last_error = null, updated_at = now()
      where id = ${job.id}
    `;
    return "sent";
  } catch (error) {
    const reason = messageOf(error).slice(0, 500);
    console.error(`[contact-email] ${kind} notification failed for submission ${job.contact_id}:`, reason);
    const attempts = await sql<{ attempts: number }>`
      select attempts from contact_notification_emails where id = ${job.id}
    `.catch(() => []);
    const delay = Math.min(
      MAX_BACKOFF_SECONDS,
      60 * Math.pow(2, Math.max(0, Number(attempts[0]?.attempts ?? 1) - 1)),
    );
    await sql`
      update contact_notification_emails
      set status = case when attempts >= ${MAX_ATTEMPTS} then 'dead' else 'failed' end,
          last_error = ${reason}, lease_expires_at = null,
          next_attempt_at = case when attempts >= ${MAX_ATTEMPTS} then null
            else now() + (${delay} * interval '1 second') end,
          updated_at = now()
      where id = ${job.id}
    `.catch(() => undefined);
    return "failed";
  }
}

async function loadContact(sql: Sql, kind: ContactNotificationKind, id: number): Promise<ContactNotification | null> {
  if (kind === "partner") {
    const rows = await sql<{
      id: number; created_at: string; name: string; email: string; organization: string | null;
      channel: string | null; audience: string | null; message: string;
    }>`
      select id, created_at, name, email, organization, channel, audience, message
      from partner_contacts where id = ${id} limit 1
    `;
    const row = rows[0];
    return row ? {
      id: row.id, createdAt: row.created_at, name: row.name, email: row.email,
      organization: row.organization, channel: row.channel, audience: row.audience, message: row.message,
    } : null;
  }
  const rows = await sql<{
    id: number; created_at: string; name: string; email: string; organization: string | null;
    amount_interest: string | null; experience: string | null; message: string;
  }>`
    select id, created_at, name, email, organization, amount_interest, experience, message
    from investor_contacts where id = ${id} limit 1
  `;
  const row = rows[0];
  return row ? {
    id: row.id, createdAt: row.created_at, name: row.name, email: row.email,
    organization: row.organization, amountInterest: row.amount_interest,
    experience: row.experience, message: row.message,
  } : null;
}