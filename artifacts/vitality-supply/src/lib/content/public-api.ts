/**
 * Public read access to published content-engine pages. Everything here is
 * safe to call from route loaders during SSR; database failures degrade to an
 * empty result so storefront pages never break because the library is down.
 */
import { createServerFn } from "@tanstack/react-start";
import { familyTopicById, findTopic } from "./topics";
import type { ContentBody, ContentKind, PublishedPage } from "./types";
import type { PublishedCrawlPage } from "./crawl";

type PublishedRow = {
  path: string;
  kind: ContentKind;
  subject_id: string;
  title: string;
  description: string;
  body: ContentBody;
  first_published_at: string | null;
  content_updated_at: string | null;
};

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function iso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

/** Direct (non-server-fn) access for the sitemap/llms handlers and tests. */
export async function listPublishedPages(): Promise<PublishedCrawlPage[]> {
  try {
    const sql = await db();
    const rows = await sql<Omit<PublishedRow, "body">>`
      select p.path, p.kind, p.subject_id, v.title, v.description, p.first_published_at, p.content_updated_at
      from content_pages p
      join content_versions v on v.id = p.current_version_id
      where p.status = 'published' and v.gate_status = 'passed'
      order by p.first_published_at asc nulls last
    `;
    return rows
      .filter((row) => findTopic(row.kind, row.subject_id))
      .map((row) => ({
        kind: row.kind,
        path: row.path,
        subjectId: row.subject_id,
        title: row.title,
        description: row.description,
        contentUpdatedAt: iso(row.content_updated_at),
      }));
  } catch (error) {
    console.error("[content] listPublishedPages failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function findPublishedPage(path: string): Promise<PublishedPage | null> {
  if (!/^\/(research|compounds)\/[a-z0-9-]+$/.test(path)) return null;
  try {
    const sql = await db();
    const rows = await sql<PublishedRow>`
      select p.path, p.kind, p.subject_id, v.title, v.description, v.body, p.first_published_at, p.content_updated_at
      from content_pages p
      join content_versions v on v.id = p.current_version_id
      where p.status = 'published' and v.gate_status = 'passed' and p.path = ${path}
      limit 1
    `;
    const row = rows[0];
    // A page whose subject left the catalog is not served even before the scheduler unpublishes it.
    if (!row || !findTopic(row.kind, row.subject_id)) return null;
    let familyHub: PublishedPage["familyHub"] = null;
    if (row.kind === "compound" && row.body.familyId) {
      const hubs = await sql<{ path: string; title: string }>`
        select p.path, v.title
        from content_pages p
        join content_versions v on v.id = p.current_version_id
        where p.status = 'published' and v.gate_status = 'passed' and p.kind = 'family' and p.subject_id = ${row.body.familyId}
        limit 1
      `;
      const hub = hubs[0];
      if (hub) familyHub = { slug: hub.path.split("/").pop() ?? "", title: hub.title };
    }
    return {
      path: row.path,
      kind: row.kind,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      body: row.body,
      firstPublishedAt: iso(row.first_published_at),
      contentUpdatedAt: iso(row.content_updated_at),
      familyHub,
    };
  } catch (error) {
    console.error("[content] findPublishedPage failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export const loadPublishedPage = createServerFn({ method: "GET" })
  .validator((data: { path: string }) => ({ path: String(data?.path ?? "").slice(0, 200) }))
  .handler(async ({ data }) => findPublishedPage(data.path));

export type ResearchIndex = {
  compounds: PublishedCrawlPage[];
  families: PublishedCrawlPage[];
  methods: PublishedCrawlPage[];
};

export const loadResearchIndex = createServerFn({ method: "GET" }).handler(async (): Promise<ResearchIndex> => {
  const pages = await listPublishedPages();
  return {
    compounds: pages.filter((page) => page.kind === "compound"),
    families: pages.filter((page) => page.kind === "family"),
    methods: pages.filter((page) => page.kind === "method"),
  };
});

export type ProductReferenceLinks = {
  reference: { path: string; title: string } | null;
  family: { path: string; title: string } | null;
};

const linkCache = new Map<string, { at: number; value: ProductReferenceLinks }>();
const LINK_CACHE_MS = 60_000;

/** Published reference + family-hub links for a product page (60 s cache; never throws). */
export const loadProductReferenceLinks = createServerFn({ method: "GET" })
  .validator((data: { productId: string }) => ({ productId: String(data?.productId ?? "").slice(0, 120) }))
  .handler(async ({ data }): Promise<ProductReferenceLinks> => {
    const cached = linkCache.get(data.productId);
    if (cached && Date.now() - cached.at < LINK_CACHE_MS) return cached.value;
    const empty: ProductReferenceLinks = { reference: null, family: null };
    try {
      const { findProduct } = await import("@/lib/catalog");
      const product = findProduct(data.productId);
      if (!product || product.category !== "vial-compounds") return empty;
      const subjectId = product.id.slice("vial-compounds__".length);
      const hub = familyTopicById(product.family);
      const sql = await db();
      const rows = await sql<{ path: string; kind: ContentKind; title: string }>`
        select p.path, p.kind, v.title
        from content_pages p
        join content_versions v on v.id = p.current_version_id
        where p.status = 'published' and v.gate_status = 'passed'
          and ((p.kind = 'compound' and p.subject_id = ${subjectId}) or (p.kind = 'family' and p.subject_id = ${hub?.subjectId ?? ""}))
      `;
      const pick = (kind: ContentKind) => {
        const row = rows.find((candidate) => candidate.kind === kind);
        return row ? { path: row.path, title: row.title } : null;
      };
      const value: ProductReferenceLinks = { reference: pick("compound"), family: hub ? pick("family") : null };
      linkCache.set(data.productId, { at: Date.now(), value });
      return value;
    } catch (error) {
      console.error("[content] loadProductReferenceLinks failed:", error instanceof Error ? error.message : error);
      return empty;
    }
  });
