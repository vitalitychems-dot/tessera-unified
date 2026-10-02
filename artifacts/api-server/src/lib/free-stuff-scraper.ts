import { logger } from "./logger";
import { sanitizeUntrustedText } from "./external-sandbox-policy";
import { guardedFetch, isAllowedOutboundUrl } from "./outbound-host-policy";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface FreeFinding {
  id: string;
  title: string;
  url: string;
  source: string;
  subreddit: string;
  flair: string | null;
  score: number;
  commentsUrl: string;
  postedAt: number;
  validatedAt: number;
  validation: "ok" | "redirect" | "dead" | "blocked" | "pending";
  validationStatus: number | null;
}

const SOURCES: Array<{ subreddit: string; label: string }> = [
  { subreddit: "freebies", label: "Reddit r/freebies" },
  { subreddit: "freegamefindings", label: "Reddit r/freegamefindings" },
  { subreddit: "GameDeals", label: "Reddit r/GameDeals (free filter)" },
  { subreddit: "deals", label: "Reddit r/deals (free filter)" },
];

const REFRESH_MS = 10 * 60 * 1000;
const VALIDATION_TIMEOUT_MS = 6000;
const USER_AGENT = "Tessera-Sovereign-FreeStuffScraper/1.0 (+https://tessera.local)";
const MAX_PER_SOURCE = 25;

let cache: FreeFinding[] = [];
let lastRefresh = 0;
let refreshing = false;
let timer: SacredHandle | null = null;

interface RedditPostRaw {
  data: {
    id: string;
    title: string;
    url: string;
    permalink: string;
    subreddit: string;
    link_flair_text: string | null;
    score: number;
    created_utc: number;
    is_self: boolean;
  };
}

async function fetchSubreddit(sub: string): Promise<FreeFinding[]> {
  const url = `https://www.reddit.com/r/${sub}/new.json?limit=${MAX_PER_SOURCE}`;
  const r = await guardedFetch(url, { headers: { "user-agent": USER_AGENT, "accept": "application/json" } });
  if (!r.ok) {
    logger.debug({ sub, status: r.status }, "free-stuff: reddit fetch non-200");
    return [];
  }
  const j = (await r.json()) as { data?: { children?: RedditPostRaw[] } };
  const children = j.data?.children ?? [];
  const out: FreeFinding[] = [];
  for (const c of children) {
    const d = c.data;
    if (!d || d.is_self) continue;
    const titleClean = sanitizeUntrustedText(d.title, 300).sanitized;
    const flair = d.link_flair_text ? sanitizeUntrustedText(d.link_flair_text, 80).sanitized : null;
    if (sub === "GameDeals" || sub === "deals") {
      const hay = (titleClean + " " + (flair ?? "")).toLowerCase();
      if (!/\bfree\b|\$0|100% off/.test(hay)) continue;
    }
    out.push({
      id: `${sub}:${d.id}`,
      title: titleClean,
      url: d.url,
      source: SOURCES.find(s => s.subreddit === sub)?.label ?? `r/${sub}`,
      subreddit: sub,
      flair,
      score: d.score,
      commentsUrl: `https://www.reddit.com${d.permalink}`,
      postedAt: d.created_utc * 1000,
      validatedAt: 0,
      validation: "pending",
      validationStatus: null,
    });
  }
  return out;
}

async function validateLink(f: FreeFinding): Promise<FreeFinding> {
  const policyDecision = isAllowedOutboundUrl(f.url, { mode: "validator" });
  if (!policyDecision.allowed) {
    f.validatedAt = Date.now();
    f.validation = "blocked";
    return f;
  }
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), VALIDATION_TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch(f.url, { method: "HEAD", redirect: "manual", signal: ctrl.signal, headers: { "user-agent": USER_AGENT } });
    } finally {
      clearTimeout(timeout);
    }
    f.validatedAt = Date.now();
    f.validationStatus = r.status;
    if (r.status >= 200 && r.status < 300) f.validation = "ok";
    else if (r.status >= 300 && r.status < 400) f.validation = "redirect";
    else if (r.status === 403 || r.status === 429) f.validation = "blocked";
    else f.validation = "dead";
  } catch {
    f.validatedAt = Date.now();
    f.validation = "dead";
  }
  return f;
}

export async function refreshFreeFindings(): Promise<FreeFinding[]> {
  if (refreshing) return cache;
  refreshing = true;
  try {
    const all: FreeFinding[] = [];
    for (const s of SOURCES) {
      try {
        const subResults = await fetchSubreddit(s.subreddit);
        all.push(...subResults);
      } catch (err) {
        logger.warn({ sub: s.subreddit, err: (err as Error).message }, "free-stuff: source failed");
      }
    }
    const seen = new Set<string>();
    const dedup = all.filter(f => { if (seen.has(f.url)) return false; seen.add(f.url); return true; });
    const validated: FreeFinding[] = [];
    for (let i = 0; i < dedup.length; i += 5) {
      const batch = dedup.slice(i, i + 5);
      const r = await Promise.all(batch.map(validateLink));
      validated.push(...r);
    }
    cache = validated.sort((a, b) => b.postedAt - a.postedAt);
    lastRefresh = Date.now();
  } finally {
    refreshing = false;
  }
  return cache;
}

export function getFreeFindings(opts: { onlyValid?: boolean; limit?: number } = {}): {
  findings: FreeFinding[];
  lastRefresh: number;
  sources: typeof SOURCES;
} {
  let findings = cache;
  if (opts.onlyValid) findings = findings.filter(f => f.validation === "ok" || f.validation === "redirect");
  if (opts.limit) findings = findings.slice(0, opts.limit);
  return { findings, lastRefresh, sources: SOURCES };
}

export function startFreeStuffScraper(): void {
  if (timer) return;
  void refreshFreeFindings().catch(err => logger.warn({ err: (err as Error).message }, "free-stuff: initial refresh failed"));
  timer = setSacredInterval(() => {
    void refreshFreeFindings().catch(err => logger.warn({ err: (err as Error).message }, "free-stuff: refresh failed", "free-stuff-scraper"));
  }, REFRESH_MS, "free-stuff-scraper");
  if (typeof timer.unref === "function") timer.unref();
  logger.info("free-stuff scraper started");
}
