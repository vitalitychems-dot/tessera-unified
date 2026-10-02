import { lazy, Suspense, useEffect, useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { AgeGate, GATE_BOOT } from "@/components/age-gate";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { CartHydrator } from "@/components/cart-hydrator";
import { useCart } from "@/lib/cart-store";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import appCss from "../styles.css?url";

const loadCartDrawer = () => import("@/components/cart-drawer");
const CartDrawer = lazy(() => loadCartDrawer().then((mod) => ({ default: mod.CartDrawer })));

/** Instant response while the drawer module loads on the very first open. */
function CartDrawerFallback() {
  const isOpen = useCart((s) => s.isOpen);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end" aria-busy="true">
      <div className="absolute inset-0 bg-bg/80" />
      <aside className="relative z-10 flex h-full w-full max-w-md items-center justify-center border-l border-border bg-bg-elevated shadow-lift">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">Opening cart…</p>
      </aside>
    </div>
  );
}
const ResearchChat = lazy(() =>
  import("@/components/research-chat").then((mod) => ({ default: mod.ResearchChat })),
);
const PromoCatcher = lazy(() =>
  import("@/components/promo-field").then((mod) => ({ default: mod.PromoCatcher })),
);
const NewsletterPopup = lazy(() =>
  import("@/components/newsletter-popup").then((mod) => ({ default: mod.NewsletterPopup })),
);

function DeferredGlobals() {
  // Keep the first server and browser render identical. Reading the gate's
  // boot-script DOM mutation during useState caused a hydration mismatch on
  // return navigation from Stripe.
  const [gateReady, setGateReady] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [cartRequested, setCartRequested] = useState(false);
  // Any `openCart()` call — header button, add-to-cart on a product page or a
  // catalog card — must mount the drawer, so the store's open flag is the
  // trigger rather than a separate DOM event each caller has to remember.
  const cartOpen = useCart((s) => s.isOpen);

  useEffect(() => {
    if (cartOpen) setCartRequested(true);
  }, [cartOpen]);

  useEffect(() => {
    const onAccepted = () => setGateReady(true);
    if (document.documentElement.dataset.gate === "ok") setGateReady(true);
    window.addEventListener("vs:age-accepted", onAccepted);
    return () => {
      window.removeEventListener("vs:age-accepted", onAccepted);
    };
  }, []);

  // Do not load deferred globals while the age gate is active. Promotional
  // signup remains available inline rather than interrupting catalog taps with
  // an automatic modal.
  useEffect(() => {
    if (!gateReady) return;
    const schedule = (callback: IdleRequestCallback, timeout: number) =>
      window.requestIdleCallback
        ? window.requestIdleCallback(callback, { timeout })
        : window.setTimeout(callback, timeout);
    const cancel = (handle: number) => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
    // Warm the cart drawer module shortly after the gate so the first cart
    // open renders immediately instead of waiting on a network round trip.
    const cartHandle = schedule(() => {
      void loadCartDrawer().catch(() => {});
    }, 2500);
    const chatHandle = schedule(() => setChatReady(true), 8000);
    return () => {
      cancel(cartHandle);
      cancel(chatHandle);
    };
  }, [gateReady]);

  if (!gateReady) return null;

  return (
    <>
      <Suspense fallback={null}>
        <PromoCatcher />
        <NewsletterPopup />
        {chatReady ? <ResearchChat /> : null}
      </Suspense>
      {cartRequested ? (
        <Suspense fallback={<CartDrawerFallback />}>
          <CartDrawer />
        </Suspense>
      ) : null}
    </>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#05040a" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: `${import.meta.env.BASE_URL}site.webmanifest` },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: GATE_BOOT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  email: BUSINESS.email,
                  telephone: BUSINESS.phone,
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: `${BUSINESS.street}, ${BUSINESS.unit}`,
                    addressLocality: BUSINESS.city,
                    addressRegion: BUSINESS.region,
                    postalCode: BUSINESS.postal,
                    addressCountry: "US",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  publisher: { "@id": `${SITE_URL}/#organization` },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        <AuthProvider>
          <CartHydrator />
          <AgeGate>
            <AnalyticsTracker />
            <Outlet />
             <DeferredGlobals />
          </AgeGate>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});