import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

let pageVisible = true;
let visListeners: Set<() => void> = new Set();

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    pageVisible = document.visibilityState === "visible";
    visListeners.forEach((fn) => fn());
  });
}

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(pageVisible);
  useEffect(() => {
    const handler = () => setVisible(pageVisible);
    visListeners.add(handler);
    return () => { visListeners.delete(handler); };
  }, []);
  return visible;
}

export function useSmartRefetch(baseInterval: number, routePrefix?: string): number | false {
  const visible = usePageVisible();
  const [location] = useLocation();

  if (!visible) return false;

  if (routePrefix && !location.startsWith(routePrefix)) {
    return false;
  }

  return baseInterval;
}

const INTERVAL_TIERS = {
  critical: 30_000,
  normal: 60_000,
  background: 120_000,
  lazy: 300_000,
} as const;

export type RefetchTier = keyof typeof INTERVAL_TIERS;

export function useTieredRefetch(tier: RefetchTier, routePrefix?: string): number | false {
  const visible = usePageVisible();
  const [location] = useLocation();

  if (!visible) return false;
  if (routePrefix && !location.startsWith(routePrefix)) return false;

  return INTERVAL_TIERS[tier];
}
