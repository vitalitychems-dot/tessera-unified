import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { BUSINESS } from "@/lib/business";
import { cn, formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { UserButton } from "@/lib/auth/gates";
import { authEnabled } from "@/lib/auth/client";
import { useLabCredit } from "@/lib/use-lab-credit";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

// The search overlay bundles the full catalog index; only fetch it on first
// open. The header warms the chunk on hover/focus so the click itself is instant.
const loadSearchOverlay = () => import("@/components/search-overlay");
const SearchOverlay = lazy(() =>
  loadSearchOverlay().then((m) => ({ default: m.SearchOverlay })),
);

function SearchOverlayFallback() {
  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-24 bg-bg/70" aria-busy="true">
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-lift p-4 text-center text-sm text-muted">
        Loading search...
      </div>
    </div>
  );
}

export function SiteHeader({
  active,
  subnav,
}: {
  active?: "shop" | "subscribe" | "checkout" | "testing" | "signin" | "wholesale" | "affiliates";
  subnav?: ReactNode;
}) {
  const openCart = useCart((s) => s.openCart);
  const activePromo = useCart((s) => s.promo);
  const cartNotice = useCart((s) => s.notice);
  const dismissCartNotice = useCart((s) => s.dismissNotice);
  const { count } = useCartTotals();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const { balance } = useLabCredit();
  const { user, isPending } = useCurrentUserState();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const first = menuPanelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onMenuKeyDown);
    return () => document.removeEventListener("keydown", onMenuKeyDown);
  }, [menuOpen]);
  const showSignedOut = authEnabled && hydrated && !isPending && !user;
  const showSignedIn = hydrated && !!user;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        trackEvent("search_opened", { source: "keyboard" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-bg">
        <div className="bg-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-primary-fg">
          <span className="sm:hidden">3 vials 8% off · 5 vials 12% · 10 vials 18%</span>
          <span className="hidden sm:inline">
            Lab rates: 3 vials 8% · 5 vials 12% · 10 vials 18% · Reward credits on every order · Crypto
            saves 8%
          </span>
        </div>
        <nav className="glass-panel py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              to="/"
              aria-label="Vitality Chems home"
              className="flex min-w-0 shrink items-center gap-2"
            >
              <img
                src="/brand/logo-64.png"
                alt=""
                className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
              />
              <span className="font-display whitespace-nowrap text-base font-semibold tracking-wider uppercase sm:text-xl">
                 Vitality Chems
              </span>
            </Link>

            {active === "checkout" ? (
              <div className="hidden items-center gap-2 text-xs tracking-widest text-muted uppercase sm:flex">
                Encrypted checkout
              </div>
            ) : (
              <div className="hidden items-center gap-5 text-sm font-medium tracking-widest text-muted uppercase lg:flex">
                <Link
                  to="/"
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "shop" ? "text-primary" : "",
                  )}
                >
                  Shop
                </Link>
                <Link
                  to="/testing"
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "testing" ? "text-primary" : "",
                  )}
                >
                  Testing
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("vs:open-newsletter", { detail: "desktop_header" }),
                    )
                  }
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "subscribe" ? "text-primary" : "",
                  )}
                >
                  Subscribe
                </button>
                <Link
                  to="/subscriptions"
                  className="transition-colors hover:text-primary"
                >
                  Restocks
                </Link>
                <Link
                  to="/wholesale"
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "wholesale" ? "text-primary" : "",
                  )}
                >
                  Wholesale
                </Link>
                <Link
                  to="/affiliates"
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "affiliates" ? "text-primary" : "",
                  )}
                >
                  Affiliates
                </Link>
                <Link to="/contact" className="transition-colors hover:text-primary">
                  Contact
                </Link>
                <Link to="/partners" className="transition-colors hover:text-primary">
                  Partners
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("vs:apply-promo", { detail: "WELCOME10" }),
                    )
                  }
                  className="tap-target hidden rounded-full border border-primary/40 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-primary uppercase transition-colors hover:bg-primary hover:text-primary-fg lg:inline"
                >
                  {activePromo?.code === "WELCOME10" ? "WELCOME10 applied" : "10% first order"}
                </button>
                {showSignedOut ? (
                  <Link
                    to="/login"
                    rel="nofollow"
                    className={cn(
                      "transition-colors hover:text-primary",
                      active === "signin" ? "text-primary" : "",
                    )}
                  >
                    Sign in
                  </Link>
                ) : null}
                {showSignedIn ? (
                  <Link
                    to="/account"
                    rel="nofollow"
                    className={cn(
                      "transition-colors hover:text-primary",
                      active === "signin" ? "text-primary" : "",
                    )}
                  >
                    Account
                    {balance > 0 ? ` · ${formatPrice(balance)}` : ""}
                  </Link>
                ) : null}
                <a
                  href={BUSINESS.phoneHref}
                  className="hidden font-mono text-xs tracking-wide normal-case xl:inline hover:text-primary"
                >
                  {BUSINESS.phoneDisplay}
                </a>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                ref={menuButtonRef}
                className="tap-target p-2 text-muted hover:text-fg lg:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-controls="mobile-nav-panel"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {active !== "checkout" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(true);
                    trackEvent("search_opened", { source: "header" });
                  }}
                  onPointerEnter={() => void loadSearchOverlay()}
                  onFocus={() => void loadSearchOverlay()}
                  aria-label="Search catalog"
                  aria-haspopup="dialog"
                  aria-expanded={searchOpen}
                  className="tap-target p-2 text-muted transition-colors hover:text-fg"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  openCart();
                  trackEvent("cart_opened", { item_count: count });
                }}
                aria-label={`Open cart, ${count} item${count !== 1 ? "s" : ""}`}
                className="tap-target relative shrink-0 p-2 transition-colors hover:text-primary"
              >
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-fg">
                    {count}
                  </span>
                )}
              </button>
              {hydrated && isPending ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-overlay" />
              ) : (
                <>
                  {showSignedOut ? (
                    <Link
                      to="/login"
                      rel="nofollow"
                      aria-label="Sign in"
                      className="tap-target inline-flex items-center gap-1.5 px-2 font-display text-xs font-semibold tracking-widest uppercase text-muted hover:text-primary lg:hidden"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Sign in</span>
                    </Link>
                  ) : null}
                  {showSignedIn ? (
                    <>
                      <Link
                        to="/account"
                        rel="nofollow"
                        aria-label="Lab account"
                         className="tap-target inline-flex items-center px-2 font-mono text-[10px] tracking-widest text-primary uppercase sm:hidden"
                      >
                        {balance > 0 ? formatPrice(balance) : "Acct"}
                      </Link>
                      <div className="hidden sm:block">
                        <UserButton />
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </nav>
        {menuOpen ? (
          <div
            ref={menuPanelRef}
            id="mobile-nav-panel"
            role="navigation"
            aria-label="Mobile site navigation"
            className="border-b border-border bg-bg-elevated px-4 py-3 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm font-medium tracking-widest uppercase">
              <Link to="/" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Shop
              </Link>
              <Link to="/wholesale" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Wholesale
              </Link>
              <Link to="/affiliates" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Affiliates
              </Link>
              <Link to="/testing" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Testing
              </Link>
              <Link to="/subscriptions" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Research restocks
              </Link>
              <button
                type="button"
                className="py-2 hover:text-primary"
                onClick={() => {
                  setMenuOpen(false);
                  window.dispatchEvent(
                    new CustomEvent("vs:open-newsletter", { detail: "mobile_menu" }),
                  );
                }}
              >
                Subscribe
              </button>
              <button
                type="button"
                       className="tap-target py-2 text-left text-primary"
                onClick={() => {
                  setMenuOpen(false);
                   window.dispatchEvent(
                     new CustomEvent("vs:apply-promo", { detail: "WELCOME10" }),
                   );
                }}
              >
                {activePromo?.code === "WELCOME10" ? "WELCOME10 applied" : "10% first order"}
              </button>
              <Link to="/contact" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
              <Link to="/partners" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Partners
              </Link>
            </div>
          </div>
        ) : null}
        {cartNotice ? (
          <div
            role="alert"
            data-testid="status-cart-cleanup"
            className="flex items-start justify-between gap-4 border-b border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100 sm:px-6"
          >
            <p className="mx-auto max-w-7xl flex-1">{cartNotice}</p>
            <button
              type="button"
              data-testid="button-dismiss-cart-cleanup"
              onClick={dismissCartNotice}
              className="shrink-0 font-semibold uppercase tracking-wider hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {subnav}
      </div>
        {searchOpen ? (
          <Suspense fallback={<SearchOverlayFallback />}>
            <SearchOverlay open onClose={() => setSearchOpen(false)} />
          </Suspense>
        ) : null}
    </>
  );
}
