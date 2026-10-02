import { createServerFn } from "@tanstack/react-start";
import { findProduct } from "@/lib/catalog";
import { boundedText } from "@/lib/public-input";
import {
  isPublicEvent,
  sanitizeEventDims,
  type PublicEventName,
} from "@/lib/conversion/events";

export const trackStoreEvent = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sessionId: string;
      event: string;
      path?: string;
      productId?: string;
      productName?: string;
      dims?: unknown;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { consumePublicBudget, requestAnalyticsSessionId } = await import("@/lib/public-abuse.server");
    const sql = await getSql();
    const event = boundedText(data.event, 40, true) as PublicEventName;
    // Keep accepting the legacy client field for compatibility, but never use
    // it for the live sample. The server derives the bounded identity.
    const sessionId = requestAnalyticsSessionId();
    const path = boundedText(data.path, 200);
    const productId = boundedText(data.productId, 120);
    const catalogProduct = productId ? findProduct(productId) : null;
    const productName = catalogProduct?.name ?? null;
    const dimensions = isPublicEvent(event) ? sanitizeEventDims(event, data.dims) : null;
    // Provenance is deployment- and request-owned. Never accept a browser flag:
    // local/preview, explicit exclusions, and automation remain test traffic.
    const { getAnalyticsProvenance } = await import("./analytics-provenance.server");
    const provenance = getAnalyticsProvenance();
    if (
      !event ||
      !sessionId ||
       !isPublicEvent(event) ||
      (path !== null && !(path === "/" || /^\/[a-z0-9][a-z0-9/_-]*$/i.test(path))) ||
      Boolean(productId && !catalogProduct)
    ) {
      return { ok: false as const };
    }
    if (!await consumePublicBudget(sql, "analytics", 5_000)) {
      return { ok: false as const };
    }
    const inserted = await sql<{ session_id: string }>`
      with eligible as (
        insert into public_event_limits (
          session_id, window_started_at, event_count, last_event_at
        )
        values (${sessionId}, now(), 1, now())
        on conflict (session_id) do update set
          event_count = case
            when public_event_limits.window_started_at < now() - interval '1 hour' then 1
            else public_event_limits.event_count + 1
          end,
          window_started_at = case
            when public_event_limits.window_started_at < now() - interval '1 hour' then now()
            else public_event_limits.window_started_at
          end,
          last_event_at = now()
        where public_event_limits.window_started_at < now() - interval '1 hour'
          or public_event_limits.event_count < 120
        returning session_id
      )
       insert into store_events (session_id, event, path, product_id, product_name, dimensions, provenance)
       select session_id, ${event}, ${path}, ${productId}, ${productName},
         ${dimensions ? JSON.stringify(dimensions) : null}::jsonb, ${provenance}
      from eligible
      returning session_id
    `;
    if (inserted.length > 0 && provenance === "live") {
      try {
        const { ensureObservationStarted } = await import("./manager-observation.server");
        await ensureObservationStarted(sql);
      } catch (error) {
        // Analytics must never block a storefront interaction. The next live
        // event retries the gate initialization, while logs retain only the
        // non-sensitive failure message.
        console.error(
          "[analytics] observation gate initialization failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }
    return { ok: inserted.length > 0 };
  });