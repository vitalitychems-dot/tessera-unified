import type { Sql } from "@/lib/db";
import { broadcastTemplate } from "./templates";

const LEASE_MINUTES = 10;
const MAX_BACKOFF_SECONDS = 6 * 60 * 60;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function setting(sql: Sql, key: string, fallback: string) {
  const rows = await sql<{ value: string }>`
    select value from store_settings where key = ${key} limit 1
  `;
  return rows[0]?.value ?? fallback;
}

/**
 * Send only approved newsletter drafts, only to confirmed active subscribers,
 * with one durable delivery row per subscriber. Approval remains the human
 * control point; this worker automates the approved send and retries outages.
 */
export async function processApprovedNewsletters(sql: Sql, limit = 100) {
  if ((await setting(sql, "newsletter_auto_send_enabled", "true")).toLowerCase() !== "true") {
    return { campaigns: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const approved = await sql<{ id: string; title: string; body: string }>`
    select id, title, body
    from manager_approval_queue
    where kind = 'newsletter' and status = 'approved' and sent_at is null
    order by approved_at nulls last, created_at
    limit 10
  `;
  let campaigns = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const campaign of approved) {
    const recipients = await sql<{ id: number }>`
      select id
      from store_subscribers
      where confirmed_at is not null and unsubscribed_at is null
    `;
    for (const recipient of recipients) {
      await sql`
        insert into newsletter_deliveries (approval_id, subscriber_id)
        values (${campaign.id}, ${recipient.id})
        on conflict (approval_id, subscriber_id) do nothing
      `;
    }
    const rows = await sql<{ id: number; subscriber_id: number }>`
      select id, subscriber_id
      from newsletter_deliveries
      where approval_id = ${campaign.id}
        and sent_at is null
        and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
        and (next_attempt_at is null or next_attempt_at <= now())
      order by created_at
      limit ${limit}
    `;
    for (const delivery of rows) {
      const claimed = await sql<{ id: number }>`
        update newsletter_deliveries
        set status = 'sending', attempts = attempts + 1,
          lease_expires_at = now() + (${LEASE_MINUTES} * interval '1 minute'),
          updated_at = now()
        where id = ${delivery.id} and sent_at is null
          and (status <> 'sending' or lease_expires_at is null or lease_expires_at <= now())
        returning id
      `;
      if (!claimed[0]) continue;
      try {
        const subscriber = await sql<{ email: string; unsubscribe_token: string }>`
          select email, unsubscribe_token
          from store_subscribers
          where id = ${delivery.subscriber_id}
            and confirmed_at is not null and unsubscribed_at is null
          limit 1
        `;
        if (!subscriber[0]) {
          await sql`
            update newsletter_deliveries set status = 'skipped', sent_at = now(),
              lease_expires_at = null, updated_at = now()
            where id = ${delivery.id}
          `;
          skipped++;
          continue;
        }
        const { sendEmail } = await import("./email.server");
        const rendered = broadcastTemplate(campaign.title, campaign.body, subscriber[0].unsubscribe_token);
        await sendEmail({ to: subscriber[0].email, subject: campaign.title, ...rendered });
        await sql`
          update newsletter_deliveries set status = 'sent', sent_at = now(),
            lease_expires_at = null, next_attempt_at = null, last_error = null, updated_at = now()
          where id = ${delivery.id}
        `;
        sent++;
      } catch (error) {
        const reason = messageOf(error).slice(0, 500);
        const attempts = await sql<{ attempts: number }>`
          select attempts from newsletter_deliveries where id = ${delivery.id}
        `.catch(() => []);
        const delay = Math.min(
          MAX_BACKOFF_SECONDS,
          60 * Math.pow(2, Math.max(0, Number(attempts[0]?.attempts ?? 1) - 1)),
        );
        await sql`
          update newsletter_deliveries set status = 'failed', last_error = ${reason},
            lease_expires_at = null,
            next_attempt_at = now() + (${delay} * interval '1 second'),
            updated_at = now()
          where id = ${delivery.id}
        `.catch(() => undefined);
        failed++;
      }
    }
    const remaining = await sql<{ n: number }>`
      select count(*)::int as n from newsletter_deliveries
      where approval_id = ${campaign.id} and sent_at is null
        and status not in ('skipped')
    `;
    if (Number(remaining[0]?.n ?? 0) === 0) {
      await sql`
        update manager_approval_queue set status = 'sent', sent_at = now(), updated_at = now()
        where id = ${campaign.id} and status = 'approved'
      `;
    }
    campaigns++;
  }
  return { campaigns, sent, failed, skipped };
}
