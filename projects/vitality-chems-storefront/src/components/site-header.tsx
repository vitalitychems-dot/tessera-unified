import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";
import { SearchOverlay } from "@/components/search-overlay";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { BUSINESS } from "@/lib/business";
import { cn, formatPrice } from "@/lib/utils";
import { UserButton } from "@/lib/auth/gates";
import { useLabCredit } from "@/lib/use-lab-credit";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function SiteHeader({
  active,
  subnav,
}: {
  active?: "shop" | "subscribe" | "checkout" | "testing" | "signin" | "wholesale" | "affiliates";
  subnav?: ReactNode;
}) {
  const openCart = useCart((s) => s.openCart);
  const { count } = useCartTotals();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { balance } = useLabCredit();
  const { user, isPending } = useCurrentUserState();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  const showSignedOut = hydrated && !isPending && !user;
  const showSignedIn = hydrated && !!user;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
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
            <Link to="/" className="flex min-w-0 shrink items-center gap-2">
              <img
                src="/brand/logo.png"
                alt=""
                className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
              />
              <span className="font-display whitespace-nowrap text-lg font-semibold tracking-wider uppercase sm:text-xl">
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
                <Link
                  to="/subscriptions"
                  className={cn(
                    "transition-colors hover:text-primary",
                    active === "subscribe" ? "text-primary" : "",
                  )}
                >
                  Subscribe
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
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("vs:open-welcome"))}
                  className="hidden rounded-full border border-primary/40 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-primary uppercase transition-colors hover:bg-primary hover:text-primary-fg lg:inline"
                >
                  10% first order
                </button>
                {showSignedOut ? (
                  <Link
                    to="/login"
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
                className="p-2 text-muted hover:text-fg lg:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {active !== "checkout" && (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search catalog"
                  className="p-2 text-muted transition-colors hover:text-fg"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={openCart}
                aria-label={`Open cart, ${count} item${count !== 1 ? "s" : ""}`}
                className="relative shrink-0 p-2 transition-colors hover:text-primary"
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
                      aria-label="Sign in"
                      className="inline-flex min-h-10 items-center gap-1.5 px-2 font-display text-xs font-semibold tracking-widest uppercase text-muted hover:text-primary lg:hidden"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Sign in</span>
                    </Link>
                  ) : null}
                  {showSignedIn ? (
                    <>
                      <Link
                        to="/account"
                        aria-label="Lab account"
                        className="inline-flex min-h-10 items-center px-2 font-mono text-[10px] tracking-widest text-primary uppercase sm:hidden"
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
          <div className="border-b border-border bg-bg-elevated px-4 py-3 lg:hidden">
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
              <Link
                to="/subscriptions"
                className="py-2 hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Subscribe
              </Link>
              <button
                type="button"
                className="py-2 text-left text-primary"
                onClick={() => {
                  setMenuOpen(false);
                  window.dispatchEvent(new Event("vs:open-welcome"));
                }}
              >
                10% first order
              </button>
              <Link to="/contact" className="py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
            </div>
          </div>
        ) : null}
        {subnav}
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
