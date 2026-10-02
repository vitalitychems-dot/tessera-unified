import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { getStripeSync } from "@/lib/payments/stripe.server";
import { enqueueStripeEvent } from "@/lib/stripe-events.server";

async function webhook(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature." }, { status: 400 });
  const payload = Buffer.from(await request.arrayBuffer());
  try {
    // processWebhook verifies the signature against the managed webhook secret
    // (or the connection's secret when one is provided) and throws if it does not
    // match, so the payload is only parsed below after verification succeeded.
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    const event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
    const { getSql } = await import("@/lib/db");
    const queued = await enqueueStripeEvent(await getSql(), event);
    console.log("[stripe webhook] accepted", { eventId: event.id, type: event.type, queued });
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalidRequest = error instanceof SyntaxError ||
      /signature|webhook secret|invalid payload|malformed/i.test(message);
    console.warn("[stripe webhook] rejected", {
      reason: invalidRequest ? "invalid_request" : "processing_failed",
    });
    return Response.json(
      { error: "Webhook could not be accepted." },
      { status: invalidRequest ? 400 : 500 },
    );
  }
}


export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: ({ request }) => webhook(request) } },
});
