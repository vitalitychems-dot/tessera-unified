import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatArticleDate } from "@/components/research-article";
import { loadResearchIndex, type ResearchIndex } from "@/lib/content/public-api";
import { serializeJsonLd } from "@/lib/content/structured-data";
import { CONTENT_INDEX_PATH } from "@/lib/content/types";
import { RUO_SHORT } from "@/lib/legal";
import { seoHead, SITE_NAME, SITE_URL } from "@/lib/seo";

const TITLE = "Research library: compound references and analytical methods";
const DESCRIPTION =
  "Reference pages for catalog research compounds, compound families, and the analytical methods behind HPLC purity and LC-MS identity documentation. Research use only.";

export const Route = createFileRoute("/research/")({
  loader: () => loadResearchIndex(),
  staleTime: 60_000,
  component: ResearchIndexPage,
  head: () =>
    seoHead({
      title: TITLE,
      description: DESCRIPTION,
      path: CONTENT_INDEX_PATH,
    }),
});

type Entry = ResearchIndex["compounds"][number];

function EntryList({ heading, blurb, entries, empty }: { heading: string; blurb: string; entries: Entry[]; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{blurb}</p>
      {entries.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
          {entries.map((entry) => {
            const updated = formatArticleDate(entry.contentUpdatedAt);
            const slug = entry.path.split("/").pop() ?? "";
            const link =
              entry.kind === "family" ? (
                <Link to="/compounds/$family" params={{ family: slug }} className="font-semibold text-fg hover:text-primary">
                  {entry.title}
                </Link>
              ) : (
                <Link to="/research/$slug" params={{ slug }} className="font-semibold text-fg hover:text-primary">
                  {entry.title}
                </Link>
              );
            return (
              <li key={entry.path} className="px-4 py-4">
                {link}
                <p className="mt-1 text-sm leading-relaxed text-muted">{entry.description}</p>
                {updated ? <p className="mt-1 font-mono text-xs tracking-wide text-faint uppercase">Reviewed {updated}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ResearchIndexPage() {
  const index = Route.useLoaderData();
  const all = [...index.methods, ...index.families, ...index.compounds];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Research library", item: `${SITE_URL}${CONTENT_INDEX_PATH}` },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}${CONTENT_INDEX_PATH}`,
        url: `${SITE_URL}${CONTENT_INDEX_PATH}`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@type": "WebSite", url: SITE_URL, name: SITE_NAME },
        publisher: { "@id": `${SITE_URL}/#organization` },
        hasPart: all.map((entry) => ({ "@type": entry.kind === "family" ? "CollectionPage" : "Article", name: entry.title, url: `${SITE_URL}${entry.path}` })),
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Research library</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-wide uppercase">Compound references and analytical methods</h1>
        <p className="mt-5 leading-relaxed text-muted">
          Reference pages for the materials in the research catalog: chemical identity, analytical characterization, lot documentation,
          and how the underlying certificates are read. Pages are reviewed on a rolling schedule against the current catalog and lot records.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-faint">{RUO_SHORT}</p>

        <EntryList
          heading="Analytical methods"
          blurb="How HPLC purity, LC-MS identity, and certificate of analysis documentation are produced and read."
          entries={index.methods}
          empty="Method explainers are published on a rolling schedule."
        />
        <EntryList
          heading="Compound families"
          blurb="Hubs for structurally or functionally related catalog materials."
          entries={index.families}
          empty="Family hubs appear once two or more related materials have reference pages."
        />
        <EntryList
          heading="Compound references"
          blurb="One reference page per catalog material: identity, characterization, documented lots, and storage."
          entries={index.compounds}
          empty="Compound reference pages are published on a rolling schedule."
        />

        <nav aria-label="Related" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/" className="text-primary hover:underline">
            Browse the research catalog
          </Link>
          <Link to="/testing" className="text-primary hover:underline">
            Testing and certificates
          </Link>
          <Link to="/legal/research-use" className="text-primary hover:underline">
            Research-use terms
          </Link>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
