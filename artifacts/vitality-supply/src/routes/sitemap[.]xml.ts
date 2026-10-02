import { createFileRoute } from "@tanstack/react-router";

/**
 * Dynamic sitemap: static routes and in-stock product pages plus every
 * published research-library page (with its real lastmod). Served from the
 * database so a page appears the moment it is published.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ buildSitemapXml }, { listPublishedPages }] = await Promise.all([
          import("@/lib/content/crawl"),
          import("@/lib/content/public-api"),
        ]);
        const pages = await listPublishedPages();
        return new Response(buildSitemapXml(pages), {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=900",
          },
        });
      },
    },
  },
});
