import { createServerFn } from "@tanstack/react-start";
import { optionalAuthMiddleware } from "@/lib/checkout/optional-auth";
import type { SubscriptionInput } from "./subscriptions.server";

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: SubscriptionInput) => data)
  .handler(async ({ data }) => {
    const { createSubscriptionCheckoutServer } = await import("./subscriptions.server");
    return createSubscriptionCheckoutServer(data);
  });

export const quoteSubscription = createServerFn({ method: "POST" })
  .validator((data: Omit<SubscriptionInput, "origin" | "idempotencyKey">) => data)
  .handler(async ({ data }) => {
    const { quoteSubscriptionServer } = await import("./subscriptions.server");
    return quoteSubscriptionServer(data);
  });
