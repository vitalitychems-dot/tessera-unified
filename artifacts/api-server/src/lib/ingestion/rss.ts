import { XMLParser } from "fast-xml-parser";
import { fetchText } from "./scrapers";
import { htmlToText } from "./pipeline";
import type { NormalizedItem } from "./pipeline";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  cdataPropName: "__cdata",
  trimValues: true,
});

function coerceText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (o["__cdata"]) return String(o["__cdata"]);
    if (o["#text"]) return String(o["#text"]);
  }
  return String(val);
}

function coerceArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function parseRss(xml: string, feedName: string, feedUrl: string): NormalizedItem[] {
  const items: NormalizedItem[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>;
  } catch {
    return items;
  }

  const rss = parsed["rss"] as Record<string, unknown> | undefined;
  const feed = parsed["feed"] as Record<string, unknown> | undefined;

  if (rss) {
    const channel = rss["channel"] as Record<string, unknown> | undefined;
    const rawItems = coerceArray((channel?.["item"] as unknown[] | undefined));
    for (const rawItem of rawItems) {
      const item = rawItem as Record<string, unknown>;
      const title = htmlToText(coerceText(item["title"]));
      const link = coerceText(item["link"]) || coerceText(item["guid"]);
      const description = htmlToText(coerceText(item["description"]));
      const content = htmlToText(coerceText(item["content:encoded"])) || description;
      const pubDate = coerceText(item["pubDate"]);

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
    }
  }

  if (feed) {
    const rawEntries = coerceArray((feed["entry"] as unknown[] | undefined));
    for (const rawEntry of rawEntries) {
      const entry = rawEntry as Record<string, unknown>;
      const title = htmlToText(coerceText(entry["title"]));
      const linkVal = entry["link"];
      let link = "";
      if (Array.isArray(linkVal)) {
        const links = linkVal as Record<string, unknown>[];
        const altLink = links.find(l => l["@_rel"] === "alternate");
        const chosen = altLink ?? links[0];
        link = coerceText(chosen?.["@_href"] ?? chosen);
      } else if (linkVal && typeof linkVal === "object") {
        link = coerceText((linkVal as Record<string, unknown>)["@_href"]);
      } else {
        link = coerceText(linkVal);
      }
      const summary = htmlToText(coerceText(entry["summary"]));
      const content = htmlToText(coerceText(entry["content"])) || summary;
      const updated = coerceText(entry["updated"]) || coerceText(entry["published"]);

      if (!content && !title) continue;

      let publishedAt: Date | undefined;
      if (updated) {
        try { publishedAt = new Date(updated); } catch { }
      }

      items.push({
        source: feedName,
        sourceType: "rss",
        title: title || undefined,
        content: content || title,
        url: link || feedUrl,
        tags: ["atom", feedName.toLowerCase().replace(/\s+/g, "-")],
        metadata: { feedUrl },
        publishedAt,
      });
    }
  }

  return items.slice(0, 20);
}

export const DEFAULT_FEEDS: Array<{ name: string; url: string }> = [
  { name: "Hacker News RSS", url: "https://hnrss.org/frontpage" },
  { name: "arXiv CS", url: "https://rss.arxiv.org/rss/cs" },
  { name: "arXiv AI", url: "https://rss.arxiv.org/rss/cs.AI" },
  { name: "NASA News", url: "https://www.nasa.gov/news-release/feed/" },
  { name: "USGS Earthquakes", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom" },
  { name: "Wikipedia Featured", url: "https://en.wikipedia.org/w/api.php?action=featuredfeed&feed=featured&feedformat=atom" },
];

export async function fetchRssFeed(name: string, url: string): Promise<NormalizedItem[]> {
  const xml = await fetchText(url);
  return parseRss(xml, name, url);
}
