import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ResearchArticle } from "@/components/research-article";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { loadPublishedPage } from "@/lib/content/public-api";
import { FAMILY_HUB_PREFIX } from "@/lib/content/types";
import { noindexSeoHead, seoHead } from "@/lib/seo";

const NOT_FOUND = {
  throw: true,
  routeId: "/compounds/$family",
  headers: { "X-Robots-Tag": "noindex, nofollow" },
} as const;

export const Route = createFileRoute("/compounds/$family")({
  loader: async ({ params }) => {
    const page = await loadPublishedPage({ data: { path: `${FAMILY_HUB_PREFIX}/${params.family}` } });
    if (!page) throw notFound(NOT_FOUND);
    return page;
  },
  staleTime: 60_000,
  component: FamilyHubPage,
  notFoundComponent: FamilyNotFound,
  head: ({ loaderData, params }) =>
    loaderData
      ? seoHead({
          title: loaderData.title,
          description: loaderData.description,
          path: loaderData.path,
        })
      : noindexSeoHead({
          title: "Compound family not available",
          description: "This compound family hub is not currently published.",
          path: `${FAMILY_HUB_PREFIX}/${params.family}`,
        }),
});

function FamilyHubPage() {
  const page = Route.useLoaderData();
  return (
    <ResearchArticle
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Research library", path: "/research" },
      ]}
    />
  );
}

function FamilyNotFound() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <h1 className="font-display text-3xl font-semibold uppercase">Family hub not available</h1>
        <p className="mt-3 text-sm text-muted">
          This compound family page is not currently published. Hubs are served only while at least two related materials are in the catalog.
        </p>
        <Link to="/research" className="btn-primary mt-8 inline-flex">
          Research library
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
