import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { researchSessionId } from "@/lib/session-id";
import { trackStoreEvent } from "@/lib/analytics-event-api";
import {
  deviceKind,
  landingReferrer,
  type EventDims,
  type PublicEventName,
} from "@/lib/conversion/events";

type AnalyticsEvent = {
  sessionId: string;
  event: PublicEventName;
  path: string;
  productId?: string;
  productName?: string;
  dims?: EventDims;
};

const pending: AnalyticsEvent[] = [];
const MAX_PENDING_EVENTS = 100;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const keepaliveFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, keepalive: true });

function flush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = undefined;
  const events = pending.splice(0);
  for (const data of events) {
    void trackStoreEvent({ data, fetch: keepaliveFetch }).catch((error) => {
      console.error("[analytics] event delivery failed:", error);
    });
  }
}

function enqueue(data: AnalyticsEvent) {
  if (pending.length >= MAX_PENDING_EVENTS) {
    pending.splice(0, pending.length - MAX_PENDING_EVENTS + 1);
  }
  pending.push(data);
  if (!flushTimer) flushTimer = setTimeout(flush, 750);
}

export function AnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef("");

  useEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;
    const sessionId = researchSessionId();
    const productMatch = pathname.match(/^\/product\/(.+)/);
    const event: PublicEventName = productMatch ? "view_product" : "page_view";
    const dims: EventDims | undefined = event === "page_view"
      ? (() => {
          let landing = true;
          try {
            const key = `vs-analytics-landed:${sessionId}`;
            landing = sessionStorage.getItem(key) !== "1";
            if (landing) sessionStorage.setItem(key, "1");
          } catch {
            // A missing storage capability should not block telemetry.
          }
          return {
            landing,
            device: deviceKind(window.innerWidth),
            ...(landing && landingReferrer(document.referrer, window.location.hostname)
              ? { referrer_domain: landingReferrer(document.referrer, window.location.hostname) as string }
              : {}),
          };
        })()
      : undefined;
    enqueue({
      sessionId,
      event,
      path: pathname,
      productId: productMatch?.[1],
      dims,
    });
  }, [pathname]);

  useEffect(() => {
    const onPageHide = () => flush();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flush();
    };
  }, []);

  return null;
}

export function trackClient(
  event: PublicEventName,
  extra?: { productId?: string; productName?: string; path?: string; dims?: EventDims },
) {
  enqueue({
    sessionId: researchSessionId(),
    event,
    path: extra?.path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
    productId: extra?.productId,
    productName: extra?.productName,
    dims: extra?.dims,
  });
}
