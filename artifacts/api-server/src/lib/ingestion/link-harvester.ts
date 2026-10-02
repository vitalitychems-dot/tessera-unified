import { db } from "@workspace/db";
import { ingestedDataTable, dataSourcesTable } from "@workspace/db/schema";
import { desc, gt } from "drizzle-orm";
import { logger } from "../logger";

const URL_REGEX = /https?:\/\/[^\s"'<>)\]}]+/gi;

const BLOCKED_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "rb.gy", "cutt.ly",
  "facebook.com", "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "youtube.com", "youtu.be",
  "localhost", "127.0.0.1", "0.0.0.0",
]);

const FILE_EXT_BLOCKLIST = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".mp4", ".mp3", ".webm", ".mov", ".wav", ".avi",
  ".zip", ".tar", ".gz", ".bz2", ".rar", ".7z",
  ".exe", ".dmg", ".apk",
];

interface HarvestConfig {
  allowlist: Set<string>;
  perDomainLimitPerHour: number;
  lookbackRows: number;
  maxNewSources: number;
}

function parseAllowlist(): Set<string> {
  const raw = process.env.INGESTION_AUTOLINK_ALLOWLIST ?? "";
  return new Set(
    raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  );
}

function defaultConfig(): HarvestConfig {
  return {
    allowlist: parseAllowlist(),
    perDomainLimitPerHour: 3,
    lookbackRows: 200,
    maxNewSources: 10,
  };
}

function isAllowedDomain(domain: string, allowlist: Set<string>): boolean {
  if (BLOCKED_DOMAINS.has(domain)) return false;
  if (allowlist.size === 0) return false;
  return [...allowlist].some(allowed => domain === allowed || domain.endsWith(`.${allowed}`));
}

function isScrapableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const pathLower = parsed.pathname.toLowerCase();
    if (FILE_EXT_BLOCKLIST.some(ext => pathLower.endsWith(ext))) return false;
    const host = parsed.hostname.toLowerCase();
    if (host.length < 4 || host.length > 253) return false;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return false;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
      if (
        a === 0 || a === 10 || a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224
      ) return false;
    }
    if (host.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}

const perDomainBudget = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000;

const BUDGET_MAX_ENTRIES = 10000;

function pruneDomainBudget(now: number): void {
  for (const [k, v] of perDomainBudget) {
    if (now - v.windowStart > WINDOW_MS) perDomainBudget.delete(k);
  }
  if (perDomainBudget.size > BUDGET_MAX_ENTRIES) {
    const entries = [...perDomainBudget.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
    const toDrop = entries.slice(0, perDomainBudget.size - BUDGET_MAX_ENTRIES);
    for (const [k] of toDrop) perDomainBudget.delete(k);
  }
}

function tryReserveDomainSlot(domain: string, limit: number): boolean {
  const now = Date.now();
  if (perDomainBudget.size > BUDGET_MAX_ENTRIES / 2) pruneDomainBudget(now);
  const entry = perDomainBudget.get(domain);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    perDomainBudget.set(domain, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export interface LinkHarvestResult {
  scanned: number;
  urlsFound: number;
  uniqueCandidates: number;
  newSourcesRegistered: number;
  skippedNotAllowed: number;
  skippedRateLimited: number;
  skippedAlreadyRegistered: number;
  domains: string[];
}

export async function harvestLinksFromRecentIngestion(
  config: Partial<HarvestConfig> = {},
): Promise<LinkHarvestResult> {
  const cfg: HarvestConfig = { ...defaultConfig(), ...config };

  if (cfg.allowlist.size === 0) {
    return {
      scanned: 0,
      urlsFound: 0,
      uniqueCandidates: 0,
      newSourcesRegistered: 0,
      skippedNotAllowed: 0,
      skippedRateLimited: 0,
      skippedAlreadyRegistered: 0,
      domains: [],
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: ingestedDataTable.id, content: ingestedDataTable.content, url: ingestedDataTable.url })
    .from(ingestedDataTable)
    .where(gt(ingestedDataTable.ingestedAt, since))
    .orderBy(desc(ingestedDataTable.ingestedAt))
    .limit(cfg.lookbackRows);

  const candidates = new Map<string, string>();
  let urlsFound = 0;

  for (const row of rows) {
    const text = [row.content ?? "", row.url ?? ""].join(" ");
    const matches = text.match(URL_REGEX) ?? [];
    urlsFound += matches.length;
    for (const raw of matches) {
      const cleaned = raw.replace(/[.,;:!?)]+$/, "");
      if (!isScrapableUrl(cleaned)) continue;
      try {
        const u = new URL(cleaned);
        const key = `${u.protocol}//${u.hostname}${u.pathname}`;
        if (!candidates.has(key)) candidates.set(key, u.hostname.toLowerCase());
      } catch { /* skip */ }
    }
  }

  const existingSources = await db
    .select({ url: dataSourcesTable.url, name: dataSourcesTable.name })
    .from(dataSourcesTable);
  const existingUrls = new Set(existingSources.map(s => (s.url ?? "").trim()).filter(Boolean));
  const existingNames = new Set(existingSources.map(s => s.name));

  let registered = 0;
  let skippedNotAllowed = 0;
  let skippedRateLimited = 0;
  let skippedAlreadyRegistered = 0;
  const domainsAdded = new Set<string>();

  for (const [url, domain] of candidates) {
    if (registered >= cfg.maxNewSources) break;

    if (!isAllowedDomain(domain, cfg.allowlist)) {
      skippedNotAllowed++;
      continue;
    }
    if (existingUrls.has(url)) {
      skippedAlreadyRegistered++;
      continue;
    }
    if (!tryReserveDomainSlot(domain, cfg.perDomainLimitPerHour)) {
      skippedRateLimited++;
      continue;
    }

    const name = `auto:${domain}:${url.length > 60 ? url.slice(0, 57) + "..." : url}`;
    if (existingNames.has(name)) {
      skippedAlreadyRegistered++;
      continue;
    }

    try {
      const inserted = await db.insert(dataSourcesTable).values({
        name,
        type: "web-crawl",
        url,
        enabled: true,
        intervalSeconds: 21600,
        config: { harvestedFromLinkGraph: true, domain, discoveredAt: new Date().toISOString() },
      }).onConflictDoNothing().returning({ id: dataSourcesTable.id });
      if (inserted.length > 0) {
        registered++;
        domainsAdded.add(domain);
      } else {
        skippedAlreadyRegistered++;
      }
    } catch (err) {
      logger.debug({ url, err: (err as Error).message }, "Link harvest: insert failed");
    }
  }

  if (registered > 0) {
    logger.info({ registered, domains: [...domainsAdded] }, "Link harvester seeded new crawl sources");
  }

  return {
    scanned: rows.length,
    urlsFound,
    uniqueCandidates: candidates.size,
    newSourcesRegistered: registered,
    skippedNotAllowed,
    skippedRateLimited,
    skippedAlreadyRegistered,
    domains: [...domainsAdded],
  };
}
