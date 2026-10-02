import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  FileCheck2,
  FlaskConical,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { bestsellers, filterProducts } from "@/lib/catalog";
import { isIndexableCatalogProduct } from "@/lib/catalog-policy";
import { PRODUCT_GRID, type FamilyId } from "@/lib/families";
import { FAQ, TRUST_POINTS } from "@/lib/product-science";
import { RUO_LONG } from "@/lib/legal";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  component: Home,
  head: () =>
    seoHead({
      title: "Vitality Chems — HPLC-documented research compounds",
      description:
        "Browse HPLC-documented research compounds with lot identity, CAS details, and COA records. Laboratory use only. Not for human or animal use.",
      path: "/",
    }),
});

type CatalogTab =
  | "bestsellers"
  | "all"
  | FamilyId
  | "offers";

const TABS: { id: CatalogTab; label: string }[] = [
  { id: "bestsellers", label: "Best sellers" },
  { id: "all", label: "All vials" },
  { id: "metabolic", label: "Receptor pathways" },
  { id: "tissue", label: "Peptide & copper" },
  { id: "gh-axis", label: "Peptide receptors" },
  { id: "mito", label: "Cofactor & redox" },
  { id: "neuro", label: "Neuropeptide compounds" },
  { id: "immune", label: "Peptide assays" },
  { id: "specialty", label: "Analytical blends" },
  { id: "offers", label: "Offers" },
];

const FAMILY_TABS = new Set<FamilyId>([
  "metabolic",
  "tissue",
  "gh-axis",
  "mito",
  "neuro",
  "melanocortin",
  "immune",
  "specialty",
]);

const CRAWLABLE_PRODUCTS = filterProducts({
  family: "all",
  form: "vial",
  min: 0,
  max: Infinity,
  query: "",
}).filter(isIndexableCatalogProduct);

const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
}).replace(/</g, "\\u003c");

function Home() {
  const [tab, setTab] = useState<CatalogTab>("bestsellers");
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const activePromo = useCart((state) => state.promo);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (tab === "bestsellers" && !q) return bestsellers(8);
    const family =
      FAMILY_TABS.has(tab as FamilyId) ? (tab as FamilyId) : "all";
    let list = filterProducts({ family, form: "vial", min: 0, max: Infinity, query: q });
    if (!q && tab === "offers") {
      list = list
        .filter((product) => product.variants.length > 0)
        .sort((a, b) => {
          const aHighestPrice = Math.max(...a.variants.map((variant) => variant.price));
          const bHighestPrice = Math.max(...b.variants.map((variant) => variant.price));
          return bHighestPrice - aHighestPrice;
        })
        .slice(0, 12);
    }
    return list;
  }, [tab, query]);
  const hasCatalogFilters = tab !== "bestsellers" || Boolean(query.trim());

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }}
      />
      <SiteHeader
        active="shop"
        subnav={
          <div className="border-b border-border bg-bg px-3 py-1.5 sm:px-6">
            <div className="scrollbar-none mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto overscroll-contain [touch-action:pan-x]">
              {TABS.map((t) => (
                <CatChip
                  key={t.id}
                  label={t.label}
                  active={tab === t.id && !query.trim()}
                  onClick={() => {
                    setTab(t.id);
                    setQuery("");
                    const family = FAMILY_TABS.has(t.id as FamilyId)
                      ? (t.id as FamilyId)
                      : "all";
                    const resultCount =
                      t.id === "bestsellers"
                        ? bestsellers(8).length
                        : t.id === "offers"
                          ? Math.min(
                              12,
                              filterProducts({
                                family: "all",
                                form: "vial",
                                min: 0,
                                max: Infinity,
                                query: "",
                              }).filter((product) => product.variants.length > 0).length,
                            )
                        : filterProducts({
                            family,
                            form: "vial",
                            min: 0,
                            max: Infinity,
                            query: "",
                          }).length;
                    trackEvent("catalog_filter_selected", {
                      filter_id: t.id,
                      result_count: resultCount,
                    });
                  }}
                />
              ))}
            </div>
            <div className="mx-auto mt-1 flex max-w-[1440px] flex-wrap gap-x-4 gap-y-1 text-[11px] tracking-widest text-muted uppercase">
              <Link to="/wholesale" className="hover:text-primary">
                Wholesale
              </Link>
              <Link to="/affiliates" className="hover:text-primary">
                Affiliates
              </Link>
              <button
                type="button"
                className="hover:text-primary"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("vs:apply-promo", { detail: "WELCOME10" }),
                  )
                }
              >
                {activePromo?.code === "WELCOME10" ? "WELCOME10 applied" : "10% first order"}
              </button>
              <Link to="/subscriptions" className="hover:text-primary">
                Lab restock
              </Link>
            </div>
          </div>
        }
      />
      <section className="brand-glow border-b border-border px-4 py-10 sm:px-6 sm:py-14" aria-labelledby="catalog-intro-heading">
        <div className="mx-auto max-w-[1440px]">
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Defined laboratory materials</p>
          <h1 id="catalog-intro-heading" className="font-display mt-2 max-w-3xl text-4xl font-semibold tracking-wide uppercase sm:text-6xl">
            Research materials with the documentation in view
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Browse vial compounds for qualified laboratory research. Product pages identify the
            catalog lot, CAS details, HPLC documentation, and COA request path. Research use only —
            never for human or animal use.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#catalog" className="btn-primary">Browse best sellers</a>
            <Link to="/testing" className="btn-secondary">View testing documentation</Link>
          </div>
          <div className="mt-8 grid max-w-4xl gap-3 text-xs text-muted sm:grid-cols-3">
            <p className="rounded border border-border bg-overlay px-3 py-2">Lot and CAS identity on product pages</p>
            <p className="rounded border border-border bg-overlay px-3 py-2">HPLC and COA documentation path</p>
            <p className="rounded border border-border bg-overlay px-3 py-2">Tracked shipping with review safeguards</p>
          </div>
        </div>
      </section>

      <section id="catalog" className="px-3 py-2 sm:px-6">
        <div className="mx-auto max-w-[1440px] space-y-2">
           <div className="flex flex-wrap items-center justify-between gap-3 py-2">
             <h2 className="font-mono text-xs tracking-widest text-muted uppercase">
               {filtered.length} research material{filtered.length === 1 ? "" : "s"}
             </h2>
             {hasCatalogFilters ? (
               <button
                 type="button"
                 className="text-xs text-primary underline-offset-4 hover:underline"
                 onClick={() => {
                   setTab("bestsellers");
                   setQuery("");
                   trackEvent("catalog_filter_reset");
                 }}
               >
                 Reset filters
               </button>
             ) : null}
           </div>
          {filtered.length === 0 ? (
             <div className="rounded-md border border-border bg-overlay p-5">
               <p className="text-sm text-muted">No compounds match that search.</p>
               <button
                 type="button"
                 className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
                 onClick={() => {
                   setTab("bestsellers");
                   setQuery("");
                 }}
               >
                 Return to best sellers
               </button>
             </div>
          ) : (
              <div key={tab} className={`${PRODUCT_GRID} contain-layout`}>
              {filtered.map((p, index) => (
                 <ProductCard key={p.id} product={p} priority={index < 2} />
              ))}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-md border border-border bg-overlay px-4 py-3 text-muted">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed">{RUO_LONG}</p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="complete-catalog-heading"
        className="border-t border-border bg-bg-elevated px-6 py-10"
      >
        <div className="mx-auto max-w-[1440px]">
          <h2
            id="complete-catalog-heading"
            className="font-display text-xl font-semibold tracking-wide uppercase"
          >
            Complete research catalog
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Browse every available laboratory compound and its product details, catalog quantities,
            CAS information, and testing documentation.
          </p>
          <nav aria-label="All available research compounds" className="mt-6">
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {CRAWLABLE_PRODUCTS.map((product) => (
                <li key={product.id}>
                  <Link
                    to="/product/$id"
                    params={{ id: product.id }}
                    className="text-sm text-muted underline-offset-4 hover:text-primary hover:underline"
                  >
                    {product.name} research material
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section className="border-y border-border bg-bg-elevated">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-px md:grid-cols-4">
          {TRUST_POINTS.map((t, i) => (
             <Link
               key={t.title}
               to={["/testing", "/testing", "/legal/returns", "/legal/research-use"][i] as "/testing" | "/legal/returns" | "/legal/research-use"}
               className="flex items-center gap-2 px-3 py-3 hover:bg-overlay"
               onClick={() => trackEvent("policy_link_clicked", { action: `trust_${i + 1}` })}
             >
              {i === 0 ? (
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : i === 1 ? (
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : i === 2 ? (
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <div>
                <p className="font-display text-xs font-semibold tracking-wide uppercase">
                  {t.title}
                </p>
                <p className="hidden text-[11px] leading-snug text-muted lg:block">{t.body}</p>
               </div>
             </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="font-display mb-6 text-3xl font-semibold tracking-wide uppercase">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={item.q} className="overflow-hidden rounded-md border border-border bg-surface">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between px-5 py-4 text-left"
                aria-expanded={openFaq === i}
                aria-controls={`faq-answer-${i}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="pr-4 font-medium">{item.q}</span>
                <span className="text-muted" aria-hidden="true">{openFaq === i ? "–" : "+"}</span>
              </button>
              {openFaq === i && (
                <p id={`faq-answer-${i}`} className="px-5 pb-4 text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap-target min-h-9 shrink-0 rounded-full px-2.5 py-1.5 font-display text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors sm:text-xs",
        active
          ? "bg-primary text-primary-fg"
          : "border border-border bg-overlay text-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
