import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ResearchArticle } from "@/components/research-article";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { loadPublishedPage } from "@/lib/content/public-api";
import { CONTENT_INDEX_PATH } from "@/lib/content/types";
import { noindexSeoHead, seoHead } from "@/lib/seo";

const NOT_FOUND = {
  throw: true,
  routeId: "/research/$slug",
  headers: { "X-Robots-Tag": "noindex, nofollow" },
} as const;

export const Route = createFileRoute("/research/$slug")({
  loader: async ({ params }) => {
    const page = await loadPublishedPage({ data: { path: `${CONTENT_INDEX_PATH}/${params.slug}` } });
    if (!page) throw notFound(NOT_FOUND);
    return page;
  },
  staleTime: 60_000,
  component: ResearchPage,
  notFoundComponent: ResearchNotFound,
  head: ({ loaderData, params }) =>
    loaderData
      ? seoHead({
          title: loaderData.title,
          description: loaderData.description,
          path: loaderData.path,
          type: "article",
        })
      : noindexSeoHead({
          title: "Reference page not available",
          description: "This research library page is not currently published.",
          path: `${CONTENT_INDEX_PATH}/${params.slug}`,
        }),
});

function ResearchPage() {
  const page = Route.useLoaderData();
  return (
    <ResearchArticle
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Research library", path: "/research" },
      ]}
      familyHub={page.familyHub}
    />
  );
}

function ResearchNotFound() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <h1 className="font-display text-3xl font-semibold uppercase">Page not available</h1>
        <p className="mt-3 text-sm text-muted">
          This reference page is not currently published. Pages are reviewed against the current catalog and compliance ruleset before they are served.
        </p>
        <Link to="/research" className="btn-primary mt-8 inline-flex">
          Research library
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
