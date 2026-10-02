import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAdminEmail } from "@/lib/business";
import type { Sql } from "@/lib/db";
import { broadcastTemplate, welcomeTemplate } from "./templates";
import { boundedText, canonicalEmail } from "@/lib/public-input";

const GENERIC_SUBSCRIPTION_MESSAGE =
  "If this address can receive our mail, we’ll send a confirmation link shortly.";
const CONFIRMATION_COOLDOWN_MINUTES = 15;
const WELCOME_LEASE_MINUTES = 10;
const WELCOME_MAX_BACKOFF_SECONDS = 6 * 60 * 60;

export type NewsletterSubscriber = {
  id: number;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
  welcome_sent_at: string | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  confirmation_token: string;
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
};

class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

async function requireAdmin(userId: string) {
  const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
  await requireVerifiedUser(userId);
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string }>`
    select email from "user" where id = ${userId} limit 1
  `;
  if (!isAdminEmail(rows[0]?.email)) throw new ForbiddenError();
  return rows[0].email;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Unknown email delivery error";
}

/**
 * Claim one welcome email with a lease. The sent marker is written only after
 * delivery succeeds, while failures release the lease with exponential backoff
 * so a provider outage cannot permanently strand the subscriber.
 */
async function deliverWelcome(sql: Sql, subscriber: Pick<NewsletterSubscriber, "id" | "email" | "name" | "unsubscribe_token">) {
  const claimed = await sql<{ id: number }>`
    update store_subscribers
    set welcome_claimed_at = now(),
      welcome_lease_expires_at = now() + (${WELCOME_LEASE_MINUTES} * interval '1 minute'),
      welcome_attempts = welcome_attempts + 1,
      updated_at = now()
    where id = ${subscriber.id}
      and welcome_sent_at is null
      and (welcome_claimed_at is null or welcome_lease_expires_at <= now())
      and (welcome_next_attempt_at is null or welcome_next_attempt_at <= now())
      and unsubscribed_at is null
      and confirmed_at is not null
    returning id
  `;
  if (!claimed[0]) return false;
  try {
    const { sendWelcomeEmail } = await import("./email.server");
    await sendWelcomeEmail({
      email: subscriber.email,
      name: subscriber.name,
      unsubscribeToken: subscriber.unsubscribe_token,
    });
    await sql`
      update store_subscribers
      set welcome_sent_at = now(), welcome_claimed_at = null,
        welcome_lease_expires_at = null, welcome_next_attempt_at = null,
        welcome_last_error = null, updated_at = now()
      where id = ${subscriber.id} and welcome_sent_at is null
    `;
    return true;
  } catch (error) {
    const attempts = await sql<{ welcome_attempts: number }>`
      select welcome_attempts from store_subscribers where id = ${subscriber.id}
    `.catch(() => []);
    const delay = Math.min(
      WELCOME_MAX_BACKOFF_SECONDS,
      60 * Math.pow(2, Math.max(0, Number(attempts[0]?.welcome_attempts ?? 1) - 1)),
    );
    await sql`
      update store_subscribers
      set welcome_claimed_at = null,
        welcome_lease_expires_at = null,
        welcome_next_attempt_at = now() + (${delay} * interval '1 second'),
        welcome_last_error = ${messageOf(error).slice(0, 500)},
        updated_at = now()
      where id = ${subscriber.id} and welcome_sent_at is null
    `.catch(() => undefined);
    throw error;
  }
}

export const subscribe = createServerFn({ method: "POST" })
  .validator((data: { email: string; name?: string; source: string; cadence?: string }) => data)
  .handler(async ({ data }) => {
    const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const email = canonicalEmail(input.email);
    const name = boundedText(input.name, 160);
    const source = boundedText(input.source, 80, true);
    const cadence = boundedText(input.cadence, 40);
    const validSource = Boolean(source && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(source));
    const validCadence = !cadence || cadence === "monthly" || cadence === "quarterly";
    if (!email || !source || !validSource || !validCadence) {
      return { ok: false as const, error: "We could not process that subscription request." };
    }

    try {
      const { getSql } = await import("@/lib/db");
      const { consumePublicBudget } = await import("@/lib/public-abuse.server");
      const sql = await getSql();
      // This caller budget prevents an attacker rotating recipient addresses to
      // turn confirmation delivery into an email-spam primitive, without
      // allowing one visitor to exhaust the allowance for everyone else.
      if (!await consumePublicBudget(sql, "newsletter", 120)) {
        return {
          ok: true as const,
          code: "WELCOME10" as const,
          message: GENERIC_SUBSCRIPTION_MESSAGE,
        };
      }
      const allowed = await sql<{ email_key: string }>`
        insert into newsletter_request_limits (email_key, last_requested_at)
        values (${email}, now())
        on conflict (email_key) do update
          set last_requested_at = now()
          where newsletter_request_limits.last_requested_at
            < now() - (${CONFIRMATION_COOLDOWN_MINUTES} || ' minutes')::interval
        returning email_key
      `;
      // Keep the response indistinguishable while avoiding repeated database
      // writes and confirmation-mail work for a hot address.
      if (!allowed[0]) {
        return {
          ok: true as const,
          code: "WELCOME10" as const,
          message: GENERIC_SUBSCRIPTION_MESSAGE,
        };
      }
      const rows = await sql<NewsletterSubscriber>`
        insert into store_subscribers (
          email, name, source, cadence, promo_code, unsubscribe_token,
          confirmation_token, confirmation_sent_at, confirmed_at, unsubscribed_at, updated_at
        )
        values (
          ${email}, ${name}, ${source}, ${cadence}, 'WELCOME10',
          md5(random()::text || clock_timestamp()::text || ${email}),
          md5(random()::text || clock_timestamp()::text || ${email} || 'confirm'),
          null, null, null, now()
        )
        on conflict (lower(email)) do update set
          name = coalesce(excluded.name, store_subscribers.name),
          source = excluded.source,
          cadence = coalesce(excluded.cadence, store_subscribers.cadence),
          promo_code = 'WELCOME10',
          welcome_sent_at = case
            when store_subscribers.unsubscribed_at is not null
              then coalesce(store_subscribers.welcome_sent_at, now())
            else store_subscribers.welcome_sent_at
          end,
          unsubscribed_at = null,
          updated_at = now()
        returning id, email, name, source, created_at, welcome_sent_at,
          unsubscribed_at, unsubscribe_token, confirmation_token,
          confirmation_sent_at, confirmed_at
      `;
      const subscriber = rows[0];
      if (!subscriber) return { ok: false as const, error: "We could not process that subscription request." };

      // The timestamp is the cross-instance cooldown claim. A repeated request
      // for an unconfirmed address cannot fan out confirmation mail.
      const confirmation = await sql<NewsletterSubscriber>`
        update store_subscribers
        set confirmation_sent_at = now(),
            confirmation_token = md5(random()::text || clock_timestamp()::text || email || 'confirm'),
            updated_at = now()
        where id = ${subscriber.id}
          and unsubscribed_at is null
          and confirmed_at is null
          and (confirmation_sent_at is null
            or confirmation_sent_at < now() - (${CONFIRMATION_COOLDOWN_MINUTES} || ' minutes')::interval)
        returning id, email, name, source, created_at, welcome_sent_at,
          unsubscribed_at, unsubscribe_token, confirmation_token,
          confirmation_sent_at, confirmed_at
      `;
      const emailModule = await import("./email.server");
      if (confirmation[0] && await emailModule.emailConfigured()) {
        await emailModule.sendConfirmationEmail({
          email: confirmation[0].email,
          name: confirmation[0].name,
          confirmationToken: confirmation[0].confirmation_token,
        }).catch((error: unknown) =>
          console.error("[newsletter] Confirmation email delivery failed:", messageOf(error)));
      }
      // Existing active subscribers remain eligible for their one queued
      // welcome. A resubscribe permanently suppresses a missing claim.
      if (subscriber.confirmed_at && !subscriber.welcome_sent_at) {
        await deliverWelcome(sql, subscriber).catch((error: unknown) =>
          console.error("[newsletter] Welcome email delivery failed:", messageOf(error)));
      }
      return { ok: true as const, code: "WELCOME10" as const, message: GENERIC_SUBSCRIPTION_MESSAGE };
    } catch (error) {
      console.error("[newsletter] Subscribe failed:", error);
      return {
        ok: false as const,
        error: "We could not process that subscription request. Please try again later.",
      };
    }
  });

export const confirmSubscription = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const token = typeof input.token === "string" ? input.token.trim() : "";
    if (!/^[a-f0-9]{32}$/i.test(token)) return { ok: true as const };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<NewsletterSubscriber>`
        update store_subscribers
        set confirmed_at = coalesce(confirmed_at, now()), updated_at = now()
        where confirmation_token = ${token} and unsubscribed_at is null
        returning id, email, name, source, created_at, welcome_sent_at,
          unsubscribed_at, unsubscribe_token, confirmation_token,
          confirmation_sent_at, confirmed_at
      `;
      const row = rows[0];
      if (row && !row.welcome_sent_at) {
        const emailModule = await import("./email.server");
        if (await emailModule.emailConfigured()) {
          await deliverWelcome(sql, row).catch((error: unknown) =>
            console.error("[newsletter] Welcome email delivery failed:", messageOf(error)));
        }
      }
    } catch (error) {
      console.error("[newsletter] Confirmation failed:", messageOf(error));
    }
    // Identical for valid, expired, and unknown tokens.
    return { ok: true as const };
  });

export const unsubscribe = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const input = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const token = typeof input.token === "string" ? input.token.trim() : "";
    if (!/^[a-f0-9]{32}$/i.test(token)) return { ok: true as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update store_subscribers
      set unsubscribed_at = coalesce(unsubscribed_at, now()), updated_at = now()
      where unsubscribe_token = ${token}
    `;
    return { ok: true as const };
  });

export const loadNewsletterAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const subscribers = await sql<NewsletterSubscriber>`
      select id, email, name, source, created_at, welcome_sent_at,
        unsubscribed_at, unsubscribe_token, confirmation_token,
        confirmation_sent_at, confirmed_at
      from store_subscribers order by created_at desc
    `;
    const { emailStatus } = await import("./email.server");
     const { orderEmailQueueSnapshot } = await import("@/lib/checkout/notify.server");
     const { contactEmailQueueSnapshot } = await import("@/lib/contact-notify.server");
     const [email, orderEmailQueue, contactEmailQueue] = await Promise.all([
       emailStatus(),
       orderEmailQueueSnapshot(sql),
       contactEmailQueueSnapshot(sql),
     ]);
    return {
      connected: email.verified,
      email,
      subscribers,
      queuedOrderEmails: orderEmailQueue.queued,
      orderEmailQueue,
      queuedContactEmails: contactEmailQueue.queued,
      contactEmailQueue,
      queued: subscribers.filter((row) => !row.unsubscribed_at && row.confirmed_at && !row.welcome_sent_at).length,
      active: subscribers.filter((row) => !row.unsubscribed_at).length,
      unsubscribed: subscribers.filter((row) => row.unsubscribed_at).length,
    };
  });

export const sendTestNewsletter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const staffEmail = await requireAdmin(context.userId);
    const emailModule = await import("./email.server");
    const template = welcomeTemplate({
      email: staffEmail,
      name: "Vitality Chems staff",
      unsubscribeToken: "00000000000000000000000000000000",
    });
    try {
      await emailModule.sendEmail({ to: staffEmail, ...template, subject: `[TEST] ${template.subject}` });
      return { ok: true as const, message: `Test sent to ${staffEmail}.` };
    } catch (error) {
      return { ok: false as const, error: messageOf(error) };
    }
  });

const SENDER_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** Admin: change the From address. The domain must then be verified in Resend. */
export const saveEmailSender = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { address: string }) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const address = data.address.trim().toLowerCase();
    if (!SENDER_PATTERN.test(address) || address.length > 200) {
      return { ok: false as const, error: "Enter a valid sender address such as hello@yourdomain.com." };
    }
    const emailModule = await import("./email.server");
    let status = await emailModule.saveSenderAddress(address);
    const domain = status.senderDomain;
    if (status.connected && !status.domains.some((d) => d.name === domain)) {
      try {
        status = await emailModule.addSenderDomain(domain);
      } catch (error) {
        return { ok: false as const, error: `Sender saved, but Resend could not add ${domain}: ${messageOf(error)}` };
      }
    }
    return {
      ok: true as const,
      message: status.verified
        ? `Sending as ${status.sender}.`
        : `Sender saved. Add the DNS records below for ${domain}, then check verification.`,
      status,
    };
  });

/** Admin: ask Resend to re-check a domain's DNS records. */
export const verifyEmailDomain = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { domainId: string }) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const emailModule = await import("./email.server");
    try {
      const status = await emailModule.verifySenderDomain(data.domainId.trim());
      const domain = status.domains.find((d) => d.id === data.domainId.trim());
      if (status.verified) {
        const { getSql } = await import("@/lib/db");
        const { flushOrderEmails } = await import("@/lib/checkout/notify.server");
         const { flushContactEmails } = await import("@/lib/contact-notify.server");
         const sql = await getSql();
         void flushOrderEmails(sql, { limit: 100 });
         void flushContactEmails(sql, { limit: 100 });
      }
      return {
        ok: true as const,
        message: domain?.status === "verified"
          ? `${domain.name} is verified. Email delivery is live.`
          : `Resend is checking ${domain?.name ?? "the domain"} (status: ${domain?.status ?? "unknown"}). DNS changes can take up to an hour to propagate.`,
        status,
      };
    } catch (error) {
      return { ok: false as const, error: messageOf(error) };
    }
  });

export const sendQueuedWelcomes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<NewsletterSubscriber>`
      select id, email, name, source, created_at, welcome_sent_at,
        unsubscribed_at, unsubscribe_token, confirmation_token,
        confirmation_sent_at, confirmed_at
      from store_subscribers
      where unsubscribed_at is null and confirmed_at is not null and welcome_sent_at is null
      order by created_at
    `;
    const emailModule = await import("./email.server");
    if (!(await emailModule.emailConfigured())) {
      return { ok: false as const, error: `${rows.length} welcome emails remain queued; verify the sender domain first.` };
    }
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        if (await deliverWelcome(sql, row)) sent++;
      } catch (error) {
        failed++;
        console.error(`[newsletter] Queued welcome failed for ${row.email}:`, messageOf(error));
      }
    }
    const { flushOrderEmails } = await import("@/lib/checkout/notify.server");
    const orders = await flushOrderEmails(sql, { force: true, limit: 100 });
    const { flushContactEmails } = await import("@/lib/contact-notify.server");
    const contacts = await flushContactEmails(sql, { force: true, limit: 100 });
    return {
      ok: true as const,
       sent: sent + orders.sent + contacts.sent,
       failed: failed + orders.failed + contacts.failed,
       message: `Queued emails: ${sent} welcome, ${orders.sent} order, and ${contacts.sent} partner/investor emails sent, ${failed + orders.failed + contacts.failed} failed${orders.skipped + contacts.skipped ? `, ${orders.skipped + contacts.skipped} no longer needed` : ""}.`,
    };
  });

export const sendNewsletterBroadcast = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { subject: string; body: string; confirmed: boolean }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const subject = data.subject.trim().slice(0, 200);
    const body = data.body.trim().slice(0, 50_000);
    if (!data.confirmed) return { ok: false as const, error: "Broadcast confirmation is required." };
    if (!subject || !body) return { ok: false as const, error: "Subject and message are required." };

    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const recipients = await sql<{ email: string; unsubscribe_token: string }>`
      select email, unsubscribe_token from store_subscribers
      where unsubscribed_at is null order by created_at
    `;
    const emailModule = await import("./email.server");
    if (!(await emailModule.emailConfigured())) {
      return { ok: false as const, error: "Email delivery is not ready: verify the sender domain first." };
    }
    const rendered = recipients.map((recipient) => {
      const template = broadcastTemplate(subject, body, recipient.unsubscribe_token);
      return { email: recipient.email, ...template };
    });
    const result = await emailModule.sendBroadcast(
      { subject, html: "", text: "" },
      rendered,
    );
    return { ok: true as const, recipients: recipients.length, ...result };
  });