/**
 * Outbound email through the Resend connector.
 *
 * Resend only delivers from a domain the owner has verified (DKIM + SPF records added
 * at the registrar). The sender address lives in `store_settings.email_from` and is
 * editable in Admin → Subscribers, which also lists the DNS records Resend is waiting
 * on. Nothing is sent while the sender's domain is unverified; welcome emails stay
 * queued (welcome_sent_at is null) and can be flushed once delivery is live.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { BUSINESS } from "@/lib/business";
import {
  confirmationTemplate,
  welcomeTemplate,
  type ConfirmationTemplateSubscriber,
  type WelcomeTemplateSubscriber,
} from "./templates";

export const DEFAULT_SENDER = "hello@vitalitychems.com";
const LEGACY_SENDER_SUFFIX = "@vitalitychem.com";
const VERIFIED_SENDER_SUFFIX = "@vitalitychems.com";
const SENDER_NAME = BUSINESS.name;
const DOMAINS_TTL_MS = 5 * 60_000;
const DOMAINS_FAILURE_TTL_MS = 30_000;

const connectors = new ReplitConnectors();

export type DnsRecord = {
  record: string; type: string; name: string; value: string; status: string; priority?: number | null;
};
export type SenderDomain = { id: string; name: string; status: string; records: DnsRecord[] };
export type EmailStatus = {
  connected: boolean;
  sender: string;
  senderDomain: string;
  verified: boolean;
  domains: SenderDomain[];
  error: string | null;
};

/**
 * Only Resend's domain list is cached (it is slow: one request per domain). The sender
 * address is read from the database on every call so a change made by one worker is
 * honoured by all of them immediately. Failures are cached briefly so a blip does not
 * pause delivery for five minutes.
 */
let domainsCache: { domains: SenderDomain[]; error: string | null; expires: number } | null = null;

async function connectorError(response: Response) {
  const detail = await response.text().catch(() => "");
  return `Resend returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`;
}

type ProxyInit = Parameters<ReplitConnectors["proxy"]>[2];

async function resend(path: string, init: ProxyInit = {}) {
  const response = await connectors.proxy("resend", path, init);
  if (!response.ok) throw new Error(await connectorError(response));
  return response;
}

function normalizeSenderAddress(address: string | null | undefined) {
  const normalized = address?.trim().toLowerCase() ?? "";
  return normalized.endsWith(LEGACY_SENDER_SUFFIX)
    ? `${normalized.slice(0, -LEGACY_SENDER_SUFFIX.length)}${VERIFIED_SENDER_SUFFIX}`
    : normalized;
}

export async function senderAddress() {
  const { getSql } = await import("@/lib/db");
  const rows = await (await getSql())<{ value: string }>`
    select value from store_settings where key = 'email_from' limit 1
  `;
  return normalizeSenderAddress(rows[0]?.value) || DEFAULT_SENDER;
}

export function domainOf(address: string) {
  return address.split("@")[1]?.toLowerCase() ?? "";
}

async function loadDomains(fresh: boolean) {
  if (!fresh && domainsCache && domainsCache.expires > Date.now()) return domainsCache;
  try {
    const list = (await (await resend("/domains")).json()) as { data?: Array<{ id: string; name: string; status: string }> };
    const domains: SenderDomain[] = [];
    for (const item of list.data ?? []) {
      const detail = (await (await resend(`/domains/${item.id}`)).json()) as { records?: DnsRecord[] };
      domains.push({
        id: item.id, name: item.name.toLowerCase(), status: item.status,
        records: (detail.records ?? []).map((r) => ({
          record: r.record, type: r.type, name: r.name, value: r.value, status: r.status, priority: r.priority ?? null,
        })),
      });
    }
    domainsCache = { domains, error: null, expires: Date.now() + DOMAINS_TTL_MS };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[email] Resend domain check failed:", message);
    domainsCache = { domains: [], error: message, expires: Date.now() + DOMAINS_FAILURE_TTL_MS };
  }
  return domainsCache;
}

/** Live view of delivery readiness: connection, sender, and every domain Resend knows. */
export async function emailStatus(options: { fresh?: boolean } = {}): Promise<EmailStatus> {
  const [sender, cached] = await Promise.all([senderAddress(), loadDomains(Boolean(options.fresh))]);
  const senderDomain = domainOf(sender);
  const verified = cached.domains.some((d) => d.name === senderDomain && d.status === "verified");
  return {
    connected: cached.error === null, sender, senderDomain, verified,
    domains: cached.domains, error: cached.error,
  };
}

export async function emailConfigured() {
  return (await emailStatus()).verified;
}

/** Ask Resend to (re)check the DNS records for a domain, then refresh the cached status. */
export async function verifySenderDomain(domainId: string) {
  await resend(`/domains/${encodeURIComponent(domainId)}/verify`, { method: "POST" });
  return emailStatus({ fresh: true });
}

/** Register a domain with Resend so its DNS records can be shown to the owner. */
export async function addSenderDomain(name: string) {
  await resend("/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return emailStatus({ fresh: true });
}

export async function saveSenderAddress(address: string) {
  const { getSql } = await import("@/lib/db");
  const normalized = normalizeSenderAddress(address);
  await (await getSql())`
    insert into store_settings (key, value, updated_at) values ('email_from', ${normalized}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  return emailStatus();
}

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** Send one message. Throws when delivery is not ready so callers can queue instead. */
export async function sendEmail(message: OutboundEmail) {
  const status = await emailStatus();
  if (!status.verified) {
    throw new Error(`Email delivery is not ready: ${status.senderDomain} is not verified in Resend.`);
  }
  await resend("/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${status.sender}>`,
      to: [message.to],
      reply_to: message.replyTo ?? BUSINESS.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
}

export async function sendWelcomeEmail(subscriber: WelcomeTemplateSubscriber) {
  const message = welcomeTemplate(subscriber);
  await sendEmail({ to: subscriber.email, ...message });
}

export async function sendConfirmationEmail(subscriber: ConfirmationTemplateSubscriber) {
  const message = confirmationTemplate(subscriber);
  await sendEmail({ to: subscriber.email, ...message });
}

export type BroadcastRecipient = { email: string; html?: string; text?: string };

export async function sendBroadcast(
  message: { subject: string; html: string; text: string },
  recipients: BroadcastRecipient[],
) {
  const status = await emailStatus();
  if (!status.verified) {
    throw new Error(`Email delivery is not ready: ${status.senderDomain} is not verified in Resend.`);
  }
  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < recipients.length; offset += 50) {
    const batch = recipients.slice(offset, offset + 50);
    try {
      await resend("/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.map((recipient) => ({
          from: `${SENDER_NAME} <${status.sender}>`,
          to: [recipient.email],
          reply_to: BUSINESS.email,
          subject: message.subject,
          html: recipient.html ?? message.html,
          text: recipient.text ?? message.text,
        }))),
      });
      sent += batch.length;
    } catch (error) {
      failed += batch.length;
      console.error(
        `[newsletter] Broadcast batch of ${batch.length} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { sent, failed };
}
