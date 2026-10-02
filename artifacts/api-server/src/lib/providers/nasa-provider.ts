import { safeFetchJson } from "../safe-fetch";
import { secureExternalBinaryFetch } from "../secureExternalWrapper";
import type { NormalizedItem } from "../ingestion/pipeline";

function getNasaApiKey(): string {
  if (process.env.NASA_API_KEY) return process.env.NASA_API_KEY;
  if (process.env.NODE_ENV !== "production") return "DEMO_KEY";
  throw new Error("NASA_API_KEY environment variable is required in production");
}

interface NasaApodApiItem {
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  date?: string;
  media_type?: string;
  copyright?: string;
}

export interface NasaApodItem {
  title: string;
  explanation: string;
  url?: string;
  date?: string;
  mediaType?: string;
}

export async function queryNasaApod(count = 3): Promise<NasaApodItem[]> {
  try {
    const raw = await safeFetchJson<NasaApodApiItem | NasaApodApiItem[]>(
      `https://api.nasa.gov/planetary/apod?api_key=${getNasaApiKey()}&count=${count}`,
      {
        providerId: "nasa-apod",
        providerName: "NASA APOD API",
        timeoutMs: 12000,
      },
    );
    const items: NasaApodApiItem[] = Array.isArray(raw) ? raw : [raw];
    return items.map(item => ({
      title: item.title ?? "NASA APOD",
      explanation: item.explanation ?? "",
      url: item.url ?? item.hdurl,
      date: item.date,
      mediaType: item.media_type,
    }));
  } catch {
    return [];
  }
}

export async function queryNasaAsNormalizedItems(): Promise<NormalizedItem[]> {
  const items = await queryNasaApod(5);
  return items.map(item => ({
    source: "NASA APOD",
    sourceType: "api",
    title: item.title,
    content: item.explanation || item.title,
    url: item.url,
    tags: ["nasa", "astronomy", "apod", item.mediaType ?? "unknown"].filter(Boolean) as string[],
    metadata: { date: item.date, mediaType: item.mediaType },
    publishedAt: item.date ? new Date(item.date) : undefined,
  }));
}

interface NasaImageSearchResult {
  collection: {
    items: Array<{
      data: Array<{
        title?: string;
        description?: string;
        nasa_id?: string;
        date_created?: string;
        media_type?: string;
        center?: string;
        keywords?: string[];
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
        render?: string;
      }>;
      href?: string;
    }>;
    metadata?: { total_hits?: number };
  };
}

export interface NasaImageLibraryItem {
  nasaId: string;
  title: string;
  description: string;
  dateCreated?: string;
  mediaType: string;
  center?: string;
  keywords: string[];
  thumbnailUrl?: string;
  collectionUrl?: string;
}

export async function queryNasaImageLibrary(
  query: string,
  mediaType: "image" | "video" | "audio" = "image",
  pageSize = 10,
): Promise<{ items: NasaImageLibraryItem[]; totalHits: number }> {
  try {
    const params = new URLSearchParams({
      q: query,
      media_type: mediaType,
      page_size: String(Math.min(pageSize, 50)),
    });
    const raw = await safeFetchJson<NasaImageSearchResult>(
      `https://images-api.nasa.gov/search?${params}`,
      {
        providerId: "nasa-image-library",
        providerName: "NASA Image & Video Library",
        timeoutMs: 15000,
      },
    );

    const items: NasaImageLibraryItem[] = (raw.collection?.items || [])
      .filter((item) => item.data?.[0])
      .map((item) => {
        const d = item.data[0];
        const thumb = item.links?.find((l) => l.rel === "preview")?.href;
        return {
          nasaId: d.nasa_id || "unknown",
          title: d.title || "Untitled",
          description: d.description || "",
          dateCreated: d.date_created,
          mediaType: d.media_type || mediaType,
          center: d.center,
          keywords: d.keywords || [],
          thumbnailUrl: thumb,
          collectionUrl: item.href,
        };
      });

    return {
      items,
      totalHits: raw.collection?.metadata?.total_hits || items.length,
    };
  } catch {
    return { items: [], totalHits: 0 };
  }
}

const NASA_ASSET_HOSTS = new Set([
  "images-api.nasa.gov",
  "images-assets.nasa.gov",
  "images-orig.nasa.gov",
]);

function isAllowedNasaAssetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return NASA_ASSET_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith(".nasa.gov");
  } catch {
    return false;
  }
}

function upgradeToHttps(url: string): string {
  return url.startsWith("http://") ? "https://" + url.slice(7) : url;
}

export async function fetchNasaImageAsBuffer(nasaId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const assetUrl = `https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`;
    const assetData = await safeFetchJson<{ collection: { items: Array<{ href: string }> } }>(
      assetUrl,
      {
        providerId: "nasa-image-library",
        providerName: "NASA Image Asset Lookup",
        timeoutMs: 10000,
      },
    );

    const imageUrls = (assetData.collection?.items || [])
      .map((i) => i.href)
      .filter((href) => /\.(jpg|jpeg|png|webp)$/i.test(href))
      .filter((href) => isAllowedNasaAssetUrl(href))
      .map(upgradeToHttps);

    const thumbUrls = imageUrls.filter((u) => /thumb/i.test(u));
    const medUrls = imageUrls.filter((u) => /medium/i.test(u) || /small/i.test(u));
    const targetUrl = medUrls[0] || thumbUrls[0] || imageUrls[0];

    if (!targetUrl) return null;

    const result = await secureExternalBinaryFetch(targetUrl, {
      timeoutMs: 20000,
      requestedBy: "nasa-image-proxy",
    });

    if (result.status < 200 || result.status >= 300) return null;

    return {
      buffer: result.buffer,
      contentType: result.contentType,
    };
  } catch {
    return null;
  }
}
