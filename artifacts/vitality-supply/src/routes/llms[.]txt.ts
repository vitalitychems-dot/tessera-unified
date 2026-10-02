import { createFileRoute } from "@tanstack/react-router";

/** llms.txt: site summary plus the published research-library pages. */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const [{ buildLlmsTxt }, { listPublishedPages }] = await Promise.all([
          import("@/lib/content/crawl"),
          import("@/lib/content/public-api"),
        ]);
        const pages = await listPublishedPages();
        return new Response(buildLlmsTxt(pages), {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=900",
          },
        });
      },
    },
  },
});
