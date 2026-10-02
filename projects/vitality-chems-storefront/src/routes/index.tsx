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
import { SocialProof } from "@/components/social-proof";
import { bestsellers, filterProducts } from "@/lib/catalog";
import { PRODUCT_GRID } from "@/lib/families";
import { FAQ, TRUST_POINTS } from "@/lib/product-science";
import { BUSINESS } from "@/lib/business";
import { RUO_LONG } from "@/lib/legal";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
  head: () =>
    seoHead({
      title: "Vitality Chems — HPLC-documented research peptides",
      description:
        "Shop HPLC-documented research peptides for qualified laboratories. Identity, CAS, and COA records. Laboratory use only. Not for human or animal use.",
      path: "/",
    }),
});

type CatalogTab =
  | "all"
  | "bestsellers"
  | "vial"
  | "capsule"
  | "topical"
  | "liquid"
  | "spray";

const TABS: { id: CatalogTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bestsellers", label: "Top sellers" },
  { id: "vial", label: "Vials" },
  { id: "capsule", label: "Capsules" },
  { id: "topical", label: "Topicals" },
  { id: "liquid", label: "Liquids" },
  { id: "spray", label: "Aqueous sprays" },
];

const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}).replace(/</g, "\\u003c");

function Home() {
  const [tab, setTab] = useState<CatalogTab>("bestsellers");
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (tab === "bestsellers" && !q) return bestsellers(8);
    let list = filterProducts({ family: "all", form: "all", min: 0, max: Infinity, query: q });
    if (!q) {
      if (tab === "vial") list = list.filter((p) => p.category === "vial-compounds");
      else if (tab === "capsule") list = list.filter((p) => p.formKind === "capsule");
      else if (tab === "topical") list = list.filter((p) => p.formKind === "topical");
      else if (tab === "liquid") list = list.filter((p) => p.formKind === "liquid");
      else if (tab === "spray") list = list.filter((p) => p.formKind === "spray");
    }
    return list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  }, [tab, query]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: BUSINESS.name,
            url: "https://vitalitychems.com",
            email: BUSINESS.email,
            telephone: "+17797174445",
            address: {
              "@type": "PostalAddress",
              streetAddress: `${BUSINESS.street}, ${BUSINESS.unit}`,
              addressLocality: BUSINESS.city,
              addressRegion: BUSINESS.region,
              postalCode: BUSINESS.postal,
              addressCountry: "US",
            },
            description:
              "HPLC-documented research peptides sold strictly for laboratory and in-vitro use. Not a pharmacy. Not for human consumption.",
          }),
        }}
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
                    setQuery("");
                    setTab(t.id);
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
                onClick={() => window.dispatchEvent(new Event("vs:open-welcome"))}
              >
                10% first order
              </button>
              <Link to="/subscriptions" className="hover:text-primary">
                Lab restock
              </Link>
            </div>
          </div>
        }
      />
      <h1 className="sr-only">Vitality Chems research peptides — highest-demand compounds</h1>

      <section id="catalog" className="px-3 py-2 sm:px-6">
        <div className="mx-auto max-w-[1440px] space-y-2">
          <h2 className="sr-only">{filtered.length} research compounds</h2>
          {tab === "spray" && (
            <p className="text-[11px] leading-relaxed text-muted">
              Aqueous spray presentations for laboratory handling of solutions — not for
              administration to people or animals.
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No compounds match that search.</p>
          ) : (
            <div className={PRODUCT_GRID}>
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-md border border-border bg-overlay px-4 py-3 text-muted">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed">{RUO_LONG}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-elevated">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-px md:grid-cols-4">
          {TRUST_POINTS.map((t, i) => (
            <div key={t.title} className="flex items-center gap-2 px-3 py-3">
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
            </div>
          ))}
        </div>
      </section>

      <SocialProof />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="font-display mb-6 text-3xl font-semibold tracking-wide uppercase">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={item.q} className="overflow-hidden rounded-md border border-border bg-surface">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="pr-4 font-medium">{item.q}</span>
                <span className="text-muted">{openFaq === i ? "–" : "+"}</span>
              </button>
              {openFaq === i && (
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
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
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1.5 font-display text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors sm:text-xs min-h-9",
        active
          ? "bg-primary text-primary-fg"
          : "border border-border bg-overlay text-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
