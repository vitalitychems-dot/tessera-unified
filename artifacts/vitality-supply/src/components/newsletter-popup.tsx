import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { subscribe } from "@/lib/newsletter/api";
import { loadPublicNewsletterDelay } from "@/lib/store-api";
import { trackEvent } from "@/lib/analytics";
import { useModal } from "@/lib/use-modal";

const DISMISSED_KEY = "vs-newsletter-dismissed-v2";
const QUIET_ROUTES = /^\/(checkout|order|login|account|admin)(\/|$)/;

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const show = useCallback((trigger: string) => {
    setError(null);
    setOpen(true);
    trackEvent("newsletter_popup_opened", { trigger });
  }, []);
  const close = useCallback((action: "dismiss" | "completed") => {
    setOpen(false);
    trackEvent("newsletter_popup_closed", { action });
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage can be unavailable in hardened browsers; closing still works.
    }
  }, []);

  useEffect(() => {
    const onRequested = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      show(typeof detail === "string" ? detail : "site_control");
    };
    window.addEventListener("vs:open-newsletter", onRequested);
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Auto-open when session storage is unavailable.
    }
    let disposed = false;
    let timer: number | undefined;
    if (!dismissed) {
      loadPublicNewsletterDelay()
        .catch(() => 15000)
        .then((delay) => {
          if (disposed) return;
          timer = window.setTimeout(() => {
            // Do not interrupt if there's already an active overlay or interaction
            if (document.body.style.overflow === "hidden") return;
            // Never interrupt a purchase in progress or account/staff screens.
            if (QUIET_ROUTES.test(window.location.pathname)) return;
            show("automatic");
          }, Number.isInteger(delay) && delay >= 15000 && delay <= 120000 ? delay : 15000);
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener("vs:open-newsletter", onRequested);
      if (timer) window.clearTimeout(timer);
    };
  }, [show]);

  useModal(open, () => close("dismiss"), "newsletter-container");

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="newsletter-container"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-bg/80 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-title"
      onClick={() => close("dismiss")}
    >
      <div
        className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg border border-border bg-bg-elevated shadow-lift sm:max-w-2xl sm:grid-cols-[minmax(0,0.9fr)_1.1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Dismiss subscription form"
          className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-bg/80 text-fg hover:text-primary"
          onClick={() => close("dismiss")}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="vial-stage hidden sm:block">
          <img
            src="/brand/popup-vial.jpg?v=10"
            alt=""
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="p-6 sm:p-7">
          <img
            src="/brand/popup-vial.jpg?v=10"
            alt=""
            className="mx-auto mb-4 h-40 w-auto object-contain sm:hidden"
          />
          {done ? (
            <>
              <p className="font-mono text-xs tracking-widest text-primary uppercase">Request received</p>
              <h2 id="newsletter-title" className="font-display mt-2 text-2xl font-semibold uppercase">
                Check your email
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Confirm your subscription to receive restock notices and the first-order offer.
              </p>
              <button type="button" className="btn-primary mt-6 w-full" onClick={() => close("completed")}>
                Continue shopping
              </button>
            </>
          ) : (
            <>
              <p className="font-mono text-xs tracking-widest text-primary uppercase">Lab updates</p>
              <h2 id="newsletter-title" className="font-display mt-2 pr-8 text-2xl font-semibold uppercase">
                10% off your first order
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Subscribe for catalog restocks, new HPLC documentation, and a welcome code.
              </p>
              <form
                className="mt-6 flex flex-col gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setPending(true);
                  setError(null);
                  try {
                    const result = await subscribe({
                      data: { email, source: "welcome_popup" },
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    trackEvent("newsletter_subscribed", { source: "welcome_popup" });
                    setDone(true);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Could not subscribe.");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <label className="sr-only" htmlFor="newsletter-email">Lab email</label>
                <input
                  id="newsletter-email"
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="Lab email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-field"
                />
                <button className="btn-primary w-full" type="submit" disabled={pending}>
                  {pending ? "Subscribing…" : "Get 10% off"}
                </button>
                {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
              </form>
              <button type="button" className="mt-3 min-h-11 w-full text-xs text-faint hover:text-muted" onClick={() => close("dismiss")}>
                No thanks
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}