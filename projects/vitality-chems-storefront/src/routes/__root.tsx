import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AgeGate, GATE_BOOT } from "@/components/age-gate";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { CartDrawer } from "@/components/cart-drawer";
import { CartHydrator } from "@/components/cart-hydrator";
import { ResearchChat } from "@/components/research-chat";
import { WelcomePopup } from "@/components/welcome-popup";
import { PromoCatcher } from "@/components/promo-field";
import { seoHead, SITE_NAME } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import appCss from "../styles.css?url";
import { useEffect, useState } from "react";

const DEFAULT_SEO = seoHead({
  title: "Vitality Chems — HPLC-documented research peptides",
  description:
    "HPLC-documented research peptides for qualified laboratories. Identity, CAS, and COA records. Research use only — not for human or animal use.",
  path: "/",
});

function LazyChat() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), 8000);
    return () => window.clearTimeout(t);
  }, []);
  return on ? <ResearchChat /> : null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#05040a" },
      { name: "robots", content: "index, follow" },
      ...DEFAULT_SEO.meta,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ...DEFAULT_SEO.links,
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
              "@type": "Organization",
              name: SITE_NAME,
              url: "https://vitalitychems.com",
              email: BUSINESS.email,
              telephone: BUSINESS.phoneHref,
              address: {
                "@type": "PostalAddress",
                streetAddress: `${BUSINESS.street}, ${BUSINESS.unit}`,
                addressLocality: BUSINESS.city,
                addressRegion: BUSINESS.region,
                postalCode: BUSINESS.postal,
                addressCountry: "US",
              },
            }),
          }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <CartHydrator />
          <AgeGate>
            <AnalyticsTracker />
            <Outlet />
            <CartDrawer />
            <LazyChat />
            <PromoCatcher />
          </AgeGate>
          <WelcomePopup />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});