import { safeFetchJson } from "../safe-fetch";

export interface WikipediaSummary {
  title: string;
  extract: string;
  pageId: number;
  description?: string;
  url?: string;
}

interface WikipediaApiSummary {
  title?: string;
  extract?: string;
  pageid?: number;
  description?: string;
  content_urls?: {
    desktop?: { page?: string };
  };
}

export async function queryWikipedia(topic: string): Promise<WikipediaSummary | null> {
  try {
    const data = await safeFetchJson<WikipediaApiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
      {
        providerId: "wikipedia",
        providerName: "Wikipedia REST API",
        timeoutMs: 10000,
      },
    );

    if (!data?.extract) return null;

    return {
      title: data.title ?? topic,
      extract: data.extract,
      pageId: data.pageid ?? 0,
      description: data.description,
      url: data.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}

export async function queryWikipediaMulti(
  topics: string[],
): Promise<WikipediaSummary[]> {
  const results: WikipediaSummary[] = [];
  for (const topic of topics.slice(0, 5)) {
    const summary = await queryWikipedia(topic);
    if (summary) results.push(summary);
  }
  return results;
}
