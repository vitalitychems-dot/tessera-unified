import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { boundedText, canonicalEmail } from "@/lib/public-input";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export const submitPartnerContact = createServerFn({ method: "POST" })
  .validator((data: {
    name: string;
    email: string;
    organization?: string;
    channel?: string;
    audience?: string;
    message: string;
  }) => data)
  .handler(async ({ data }) => {
    const email = canonicalEmail(data.email) ?? "";
    const name = boundedText(data.name, 120, true);
    const organization = boundedText(data.organization, 160);
    const channel = boundedText(data.channel, 80);
    const audience = boundedText(data.audience, 120);
    const message = boundedText(data.message, 4_000, true);
    if (!validEmail(email) || !name || !message) {
      return { ok: false as const, error: "Enter your name, a valid email, and a short proposal." };
    }
    const { getSql, withTransaction } = await import("@/lib/db");
    const { notifyContact, queueContactNotification } = await import("@/lib/contact-notify.server");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    if (!await consumePublicBudget(sql, "partner-contact", 30)) {
      return { ok: false as const, error: "Too many requests. Please try again later." };
    }
    const id = await withTransaction(async (tx) => {
      const rows = await tx<{ id: number }>`
        insert into partner_contacts (name, email, organization, channel, audience, message)
        values (${name}, ${email}, ${organization}, ${channel}, ${audience}, ${message})
        returning id
      `;
      const contactId = rows[0]?.id;
      if (!contactId) throw new Error("Could not save the partner proposal.");
      await queueContactNotification(tx, "partner", contactId);
      return contactId;
    });
    void notifyContact("partner", id);
    return { ok: true as const };
  });

export const submitInvestorContact = createServerFn({ method: "POST" })
  .validator((data: {
    name: string;
    email: string;
    organization?: string;
    amountInterest?: string;
    experience?: string;
    message: string;
  }) => data)
  .handler(async ({ data }) => {
    const email = canonicalEmail(data.email) ?? "";
    const name = boundedText(data.name, 120, true);
    const organization = boundedText(data.organization, 160);
    const amountInterest = boundedText(data.amountInterest, 80);
    const experience = boundedText(data.experience, 500);
    const message = boundedText(data.message, 4_000, true);
    if (!validEmail(email) || !name || !message) {
      return { ok: false as const, error: "Enter your name, a valid email, and a short thesis." };
    }
    const { getSql, withTransaction } = await import("@/lib/db");
    const { notifyContact, queueContactNotification } = await import("@/lib/contact-notify.server");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    if (!await consumePublicBudget(sql, "investor-contact", 20)) {
      return { ok: false as const, error: "Too many requests. Please try again later." };
    }
    const id = await withTransaction(async (tx) => {
      const rows = await tx<{ id: number }>`
        insert into investor_contacts (name, email, organization, amount_interest, experience, message)
        values (${name}, ${email}, ${organization}, ${amountInterest}, ${experience}, ${message})
        returning id
      `;
      const contactId = rows[0]?.id;
      if (!contactId) throw new Error("Could not save the investor inquiry.");
      await queueContactNotification(tx, "investor", contactId);
      return contactId;
    });
    void notifyContact("investor", id);
    return { ok: true as const };
  });

export const loadContactSubmissions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("@/lib/store-api");
    await requireAdmin(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const [partners, investors] = await Promise.all([
      sql<{ id: number; created_at: string; name: string; email: string; organization: string | null; channel: string | null; audience: string | null; message: string; status: string }>`
        select id, created_at, name, email, organization, channel, audience, message, status
        from partner_contacts order by created_at desc limit 100
      `,
      sql<{ id: number; created_at: string; name: string; email: string; organization: string | null; amount_interest: string | null; experience: string | null; message: string; status: string }>`
        select id, created_at, name, email, organization, amount_interest, experience, message, status
        from investor_contacts order by created_at desc limit 100
      `,
    ]);
    return { partners, investors };
  });

/**
 * Public, aggregate-only diligence snapshot. It exposes no customer identity,
 * address, or order-level detail; modeled catalog economics remain separate.
 */
export const loadInvestorSnapshot = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getSql } = await import("@/lib/db");
    const { consumePublicBudget } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    if (!await consumePublicBudget(sql, "investor-snapshot", 30)) {
      return {
        ok: false as const,
        error: "The live diligence snapshot is temporarily rate-limited.",
      };
    }
    const rows = await sql<{
      paid_orders: number;
      gross_merchandise: string | number;
      refunds: string | number;
      sales_tax_collected: string | number;
      latest_paid_at: string | null;
    }>`
      select
        count(*)::int as paid_orders,
        coalesce(sum(greatest(0, subtotal - discount)), 0) as gross_merchandise,
        coalesce(sum(greatest(0, refund_total)), 0) as refunds,
        coalesce(sum(greatest(0, sales_tax)), 0) as sales_tax_collected,
        max(paid_at) as latest_paid_at
      from store_orders
      where payment_status = 'paid' and status <> 'cancelled'
    `;
    const row = rows[0];
    return {
      ok: true as const,
      paidOrders: Number(row?.paid_orders ?? 0),
      grossMerchandise: Number(row?.gross_merchandise ?? 0),
      refunds: Number(row?.refunds ?? 0),
      salesTaxCollected: Number(row?.sales_tax_collected ?? 0),
      latestPaidAt: row?.latest_paid_at ?? null,
      source: "Paid order ledger; aggregate only; gross merchandise is before refunds and excludes shipping, tax, processor fees, and overhead.",
    };
  });
