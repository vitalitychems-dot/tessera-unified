/**
 * First-party conversion telemetry contract.
 *
 * Visitors may only write the events listed here, and each event may only
 * carry the bounded, non-personal dimensions declared for it. Anything else is
 * dropped before it reaches the database. `purchase` is deliberately absent:
 * it is authored by settlement after payment commits and is never accepted
 * from a browser.
 *
 * Pure module (no React, no database) so the same rules run in the browser
 * tracker, the server endpoint, and the tests.
 */

export type EventDims = Record<string, string | number | boolean>;

type DimSpec =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "bool" }
  | { kind: "domain" };

export const DEVICE_KINDS = ["mobile", "desktop"] as const;
export const NEWSLETTER_TRIGGERS = ["timer", "product_view", "scroll", "exit_intent", "manual"] as const;
export const CHECKOUT_FIELD_GROUPS = ["contact", "shipping", "business", "attestation", "payment_method"] as const;
export const PAYMENT_PROVIDERS = ["stripe", "zelle", "bitcoin", "ethereum", "credit", "unknown"] as const;
export const CHECKOUT_ERROR_CATEGORIES = [
  "session",
  "promo",
  "validation",
  "attestation",
  "method_unavailable",
  "rate_limited",
  "crypto_quote",
  "provider",
  "credit",
  "account",
  "expired",
  "network",
  "unknown",
] as const;
export const CART_SIZE_BUCKETS = ["1", "2_3", "4_plus"] as const;

export type NewsletterTrigger = (typeof NEWSLETTER_TRIGGERS)[number];
export type CheckoutFieldGroup = (typeof CHECKOUT_FIELD_GROUPS)[number];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type CheckoutErrorCategory = (typeof CHECKOUT_ERROR_CATEGORIES)[number];

const TRIGGER: DimSpec = { kind: "enum", values: NEWSLETTER_TRIGGERS };
const PROVIDER: DimSpec = { kind: "enum", values: PAYMENT_PROVIDERS };
const CATEGORY: DimSpec = { kind: "enum", values: CHECKOUT_ERROR_CATEGORIES };
const CART_SIZE: DimSpec = { kind: "enum", values: CART_SIZE_BUCKETS };
const DEVICE: DimSpec = { kind: "enum", values: DEVICE_KINDS };

/**
 * Visitor-writable events and their permitted dimensions. Keep dimension
 * values categorical: no free text, no identifiers, no query strings.
 */
export const PUBLIC_EVENTS: Record<string, Record<string, DimSpec>> = {
  page_view: { landing: { kind: "bool" }, referrer_domain: { kind: "domain" }, device: DEVICE },
  view_product: {},
  add_to_cart: {},
  checkout_start: { cart_size: CART_SIZE },
  bundle_tier_selected: {},
  coa_opened: {},
  policy_link_clicked: {},
  quote_refreshed: {},
  attestation_toggled: {},
  age_gate_accepted: { device: DEVICE },
  checkout_empty: {},
  checkout_quote_failed: { category: CATEGORY },
  checkout_validation_failed: { field_group: { kind: "enum", values: CHECKOUT_FIELD_GROUPS } },
  payment_init_failed: { provider: PROVIDER, category: CATEGORY },
  order_created: { provider: PROVIDER },
  newsletter_open: { trigger: TRIGGER },
  newsletter_subscribe: { trigger: TRIGGER },
  resume_prompt_shown: { cart_size: CART_SIZE },
  resume_prompt_clicked: { cart_size: CART_SIZE },
  resume_prompt_dismissed: { cart_size: CART_SIZE },
};

export type PublicEventName = keyof typeof PUBLIC_EVENTS;

export const PUBLIC_EVENT_NAMES = Object.keys(PUBLIC_EVENTS) as PublicEventName[];

export function isPublicEvent(event: unknown): event is PublicEventName {
  return typeof event === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_EVENTS, event);
}

const DOMAIN_PATTERN = /^(?=.{1,80}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Lower-cased registrable-looking hostname, or null when it is not one. */
export function safeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const host = value.trim().toLowerCase().replace(/^www\./, "");
  return DOMAIN_PATTERN.test(host) ? host : null;
}

/**
 * Keep only the dimensions declared for the event, each coerced to its
 * declared shape. Unknown keys and out-of-range values are dropped silently:
 * telemetry must never fail a storefront interaction.
 */
export function sanitizeEventDims(event: PublicEventName, input: unknown): EventDims | null {
  const specs = PUBLIC_EVENTS[event];
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const dims: EventDims = {};
  for (const [key, spec] of Object.entries(specs)) {
    const raw = (input as Record<string, unknown>)[key];
    if (raw === undefined || raw === null) continue;
    if (spec.kind === "bool") {
      if (raw === true || raw === "true") dims[key] = true;
      else if (raw === false || raw === "false") dims[key] = false;
    } else if (spec.kind === "domain") {
      const domain = safeDomain(raw);
      if (domain) dims[key] = domain;
    } else if (typeof raw === "string" && spec.values.includes(raw)) {
      dims[key] = raw;
    }
  }
  return Object.keys(dims).length ? dims : null;
}

/** Bucket a cart size so telemetry never records exact basket contents. */
export function cartSizeBucket(itemCount: number): (typeof CART_SIZE_BUCKETS)[number] {
  if (itemCount <= 1) return "1";
  if (itemCount <= 3) return "2_3";
  return "4_plus";
}

/** Coarse device class from the viewport; no user-agent strings are recorded. */
export function deviceKind(viewportWidth: number): (typeof DEVICE_KINDS)[number] {
  return viewportWidth < 768 ? "mobile" : "desktop";
}

/**
 * Referrer attribution for the first page view of a session: the referring
 * site's registrable host only. Same-site navigation and empty referrers
 * count as direct. Query strings never leave the browser.
 */
export function landingReferrer(referrer: string, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const own = ownHost.toLowerCase().replace(/^www\./, "");
    const domain = safeDomain(host);
    if (!domain || domain === own) return null;
    return domain;
  } catch {
    return null;
  }
}

/**
 * Map a checkout error message to a bounded category. Messages are matched,
 * never stored; the category is the only thing that reaches analytics.
 */
export function classifyCheckoutError(message: unknown): CheckoutErrorCategory {
  const text = typeof message === "string" ? message : "";
  if (!text) return "unknown";
  if (/idempotency|refresh checkout|duplicate/i.test(text)) return "session";
  if (/promo|promotion|referral|affiliate|code/i.test(text)) return "promo";
  if (/attestation|research-use|research use/i.test(text)) return "attestation";
  if (/contact and shipping|valid email|too long|invalid characters|required field|postal|address/i.test(text)) {
    return "validation";
  }
  if (/not enabled|valid payment method|being activated|unavailable right now|not available/i.test(text)) {
    return "method_unavailable";
  }
  if (/too many|rate limit|try again later/i.test(text)) return "rate_limited";
  if (/rate is unavailable|exchange rate|coinbase|quote/i.test(text)) return "crypto_quote";
  if (/stripe|card payments|checkout session/i.test(text)) return "provider";
  if (/credit balance|store credit/i.test(text)) return "credit";
  if (/sign in|signed in|account|verify your email|verified/i.test(text)) return "account";
  if (/expired|cancelled|no longer available|out of stock/i.test(text)) return "expired";
  if (/network|fetch failed|failed to fetch|offline|timed out|timeout/i.test(text)) return "network";
  return "unknown";
}

/**
 * Which part of the checkout form a native validation failure belongs to,
 * derived from the input's autocomplete/type attributes so no markup or value
 * is needed. Unknown inputs are grouped as contact, the most common case.
 */
export function fieldGroupForInput(input: {
  type?: string | null;
  autocomplete?: string | null;
  name?: string | null;
}): CheckoutFieldGroup {
  const type = (input.type ?? "").toLowerCase();
  const auto = (input.autocomplete ?? "").toLowerCase();
  const name = (input.name ?? "").toLowerCase();
  if (type === "checkbox") return "attestation";
  if (type === "radio" || name.includes("payment") || name.includes("method")) return "payment_method";
  if (auto === "organization" || name.includes("lab") || name.includes("organization")) return "business";
  if (
    /^(street-address|address-line1|address-line2|address-level1|address-level2|postal-code|country|country-name)$/.test(auto) ||
    /address|city|region|state|postal|zip|country/.test(name)
  ) {
    return "shipping";
  }
  return "contact";
}

/** Payment method identifier → bounded provider label. */
export function paymentProviderFor(method: unknown): PaymentProvider {
  switch (method) {
    case "stripe":
    case "card":
      return "stripe";
    case "zelle":
      return "zelle";
    case "bitcoin":
    case "btc":
      return "bitcoin";
    case "ethereum":
    case "eth":
      return "ethereum";
    case "credit":
      return "credit";
    default:
      return "unknown";
  }
}
