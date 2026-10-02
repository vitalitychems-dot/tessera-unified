/**
 * Tab-scoped checkout draft so a reload or a back-navigation does not lose the
 * customer's promo, referral and country choices.
 *
 * Contact and shipping details are intentionally NOT part of the draft: any
 * same-origin script could read sessionStorage, so personal data is never
 * parked there (security review, 2026-09-15). Those inputs carry full
 * `autocomplete` tokens instead, so the browser re-fills them in one tap.
 * The draft still lives in sessionStorage (dies with the tab), expires after a
 * short TTL and is cleared on order creation, on sign-out and whenever the
 * signed-in identity changes.
 */
export const CHECKOUT_DRAFT_KEY = "vs.checkout.form.v2";
export const CHECKOUT_DRAFT_TTL_MS = 30 * 60 * 1000;
const LEGACY_DRAFT_KEYS = ["vs.checkout.form.v1"] as const;

export const CHECKOUT_DRAFT_FIELDS = ["country"] as const;
export type CheckoutDraftField = (typeof CHECKOUT_DRAFT_FIELDS)[number];

export type CheckoutDraft = Partial<Record<CheckoutDraftField, string>> & {
  promoCode?: string;
  referralCode?: string;
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCheckoutDraft(now = Date.now()): CheckoutDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    // Earlier drafts stored contact details; remove them on sight.
    for (const key of LEGACY_DRAFT_KEYS) store.removeItem(key);
    const raw = store.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : 0;
    if (!savedAt || now - savedAt > CHECKOUT_DRAFT_TTL_MS) {
      store.removeItem(CHECKOUT_DRAFT_KEY);
      return null;
    }
    const draft: CheckoutDraft = {};
    for (const key of CHECKOUT_DRAFT_FIELDS) {
      if (typeof parsed[key] === "string") draft[key] = parsed[key];
    }
    if (typeof parsed.promoCode === "string") draft.promoCode = parsed.promoCode;
    if (typeof parsed.referralCode === "string") draft.referralCode = parsed.referralCode;
    return draft;
  } catch {
    clearCheckoutDraft();
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft, now = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: now }));
  } catch {
    // Storage failures must never block checkout.
  }
}

export function clearCheckoutDraft(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(CHECKOUT_DRAFT_KEY);
    for (const key of LEGACY_DRAFT_KEYS) store.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
