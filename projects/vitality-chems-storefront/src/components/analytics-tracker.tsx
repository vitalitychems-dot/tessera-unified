import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { researchSessionId } from "@/lib/session-id";
import { trackEvent } from "@/lib/store-api";

export function AnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef("");

  useEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;
    const sessionId = researchSessionId();
    const productMatch = pathname.match(/^\/product\/(.+)/);
    void trackEvent({
      data: {
        sessionId,
        event: productMatch ? "view_product" : "page_view",
        path: pathname,
        productId: productMatch?.[1],
      },
    }).catch(() => {});
  }, [pathname]);

  return null;
}

export function trackClient(
  event: string,
  extra?: { productId?: string; productName?: string; path?: string },
) {
  void trackEvent({
    data: {
      sessionId: researchSessionId(),
      event,
      path: extra?.path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
      productId: extra?.productId,
      productName: extra?.productName,
    },
  }).catch(() => {});
}
