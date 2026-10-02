import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const loadMyCredit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireVerifiedUser } = await import("@/lib/auth/verify.server");
    await requireVerifiedUser(context.userId);
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ balance: string | number }>`
        select balance from store_credits where user_id = ${context.userId} limit 1
      `;
      const balance = Number(rows[0]?.balance);
      return { balance: Number.isFinite(balance) ? balance : 0 };
    } catch {
      return { balance: 0 };
    }
  });