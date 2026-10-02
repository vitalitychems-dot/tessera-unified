import { safeFetchText } from "../safe-fetch";
import { htmlToText } from "../ingestion/pipeline";
import type { NormalizedItem } from "../ingestion/pipeline";

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? htmlToText(match[1].trim()) : "";
}

export async function queryRssFeed(
  feedUrl: string,
  feedName: string,
  maxItems = 10,
): Promise<NormalizedItem[]> {
  try {
    const xml = await safeFetchText(feedUrl, {
      providerId: "rss-feed",
      providerName: `RSS: ${feedName}`,
      timeoutMs: 15000,
    });

    const items: NormalizedItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = itemRegex.exec(xml)) !== null && count < maxItems) {
      const itemXml = match[1];
      const title = extractTag(itemXml, "title");
      const link = extractTag(itemXml, "link") || extractTag(itemXml, "guid");
      const description = extractTag(itemXml, "description");
      const content = extractTag(itemXml, "content:encoded") || description;
      const pubDate = extractTag(itemXml, "pubDate");

      if (!content && !title) continue;

      let publishedAt: Date | undefined;
      if (pubDate) {
        try { publishedAt = new Date(pubDate); } catch { }
      }

      items.push({
        source: feedName,
        sourceType: "rss",
        title: title || undefined,
        content: content || title,
        url: link || feedUrl,
        tags: ["rss", feedName.toLowerCase().replace(/\s+/g, "-")],
        metadata: { feedUrl },
        publishedAt,
      });
      count++;
    }

    return items;
  } catch {
    return [];
  }
}
