type AnalyticsValue = string | number | boolean;
type AnalyticsData = Record<string, AnalyticsValue>;
const SAFE_DIMENSION_KEYS = new Set([
  "product_id",
  "category",
  "quantity",
  "item_count",
  "source",
  "cadence",
  "status",
  "kind",
  "has_batch",
  "budget",
  "shipping_method",
  "payment_method",
  "action",
  "amount_bucket",
  "channel",
  "provider",
  "mode",
  "filter_id",
  "result_count",
  "dose",
  "trigger",
]);

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

/**
 * Replit injects Umami only for an analytics-enabled published deployment.
 * Keep this wrapper optional and deliberately boring: analytics must never
 * affect storefront behavior, and event dimensions must stay primitive.
 */
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined" || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name) || name.length > 50) {
    return;
  }

  const safeData = data
    ? Object.fromEntries(
        Object.entries(data).filter(
          ([key, value]) =>
            SAFE_DIMENSION_KEYS.has(key) &&
            ((typeof value === "number" && Number.isFinite(value)) ||
              typeof value === "string" ||
              typeof value === "boolean"),
        ),
      ) as AnalyticsData
    : undefined;

  try {
    window.umami?.track(name, safeData);
  } catch {
    // Analytics must never break the app.
  }
}

export function amountBucket(cents: number | null | undefined): string {
  const amount = Number(cents);
  if (!Number.isFinite(amount) || amount < 5000) return "under_50";
  if (amount < 10000) return "50_99";
  if (amount < 25000) return "100_249";
  if (amount < 50000) return "250_499";
  return "500_plus";
}