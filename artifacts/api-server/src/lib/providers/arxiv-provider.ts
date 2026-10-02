import { safeFetchText } from "../safe-fetch";
import type { NormalizedItem } from "../ingestion/pipeline";

export interface ArxivPaper {
  title: string;
  summary: string;
  id: string;
  authors: string;
  publishedAt?: Date;
}

export async function queryArxiv(
  query = "artificial intelligence",
  maxResults = 5,
): Promise<ArxivPaper[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  try {
    const text = await safeFetchText(url, {
      providerId: "arxiv",
      providerName: "arXiv API",
      timeoutMs: 20000,
    });

    const items: ArxivPaper[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(text)) !== null) {
      const entry = match[1];
      const getTag = (tag: string): string => {
        const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim().replace(/<[^>]+>/g, "").trim() : "";
      };
      const title = getTag("title");
      const summary = getTag("summary");
      const id = getTag("id");
      const published = getTag("published");
      const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)]
        .map(m2 => m2[1])
        .join(", ");

      if (title && summary) {
        items.push({
          title,
          summary,
          id,
          authors,
          publishedAt: published ? new Date(published) : undefined,
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function queryArxivAsNormalizedItems(
  query = "artificial intelligence",
  maxResults = 5,
): Promise<NormalizedItem[]> {
  const papers = await queryArxiv(query, maxResults);
  return papers.map(paper => ({
    source: "arXiv",
    sourceType: "api",
    title: paper.title,
    content: `${paper.summary}\n\nAuthors: ${paper.authors}`,
    url: paper.id,
    tags: ["arxiv", "research", "paper"],
    metadata: { authors: paper.authors, arxivId: paper.id.split("/abs/")[1] ?? paper.id },
    publishedAt: paper.publishedAt,
  }));
}
