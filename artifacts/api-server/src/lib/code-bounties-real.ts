import { logger } from "./logger";
import { sanitizeUntrustedText } from "./external-sandbox-policy";
import { guardedFetch } from "./outbound-host-policy";
import { loadJson, saveJson } from "./disk-persistence";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface CodeBounty {
  id: string;
  title: string;
  htmlUrl: string;
  apiUrl: string;
  repoFullName: string;
  repoUrl: string;
  labels: string[];
  body: string;
  createdAt: number;
  updatedAt: number;
  comments: number;
  state: string;
  rewardHint: string | null;
}

export interface BountyAttempt {
  id: string;
  bountyId: string;
  startedAt: number;
  status: "investigating" | "drafting" | "submitted" | "merged" | "rejected" | "abandoned";
  notes: string;
  prUrl: string | null;
  payoutTxRef: string | null;
}

const BOUNTY_QUERIES = [
  'is:issue is:open label:"💰 bounty"',
  'is:issue is:open label:bounty',
  'is:issue is:open label:"💎 bounty"',
];
const REFRESH_MS = 20 * 60 * 1000;
const PER_QUERY_LIMIT = 30;

let cache: CodeBounty[] = [];
let lastRefresh = 0;
let refreshing = false;
let timer: SacredHandle | null = null;
const attempts = new Map<string, BountyAttempt[]>();
let attemptsLoaded = false;
const ATTEMPTS_FILE = "bounty-attempts.json";

async function ensureAttemptsLoaded(): Promise<void> {
  if (attemptsLoaded) return;
  attemptsLoaded = true;
  const stored = await loadJson<Record<string, BountyAttempt[]>>(ATTEMPTS_FILE, {});
  for (const [k, v] of Object.entries(stored)) attempts.set(k, v);
  logger.info({ keys: attempts.size }, "code-bounties: attempts restored from disk");
}

function persistAttempts(): void {
  const obj: Record<string, BountyAttempt[]> = {};
  for (const [k, v] of attempts) obj[k] = v;
  saveJson(ATTEMPTS_FILE, obj);
}

interface GitHubSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  url: string;
  repository_url: string;
  labels: Array<{ name: string }>;
  body: string | null;
  created_at: string;
  updated_at: string;
  comments: number;
  state: string;
}

const REWARD_REGEX = /\$([0-9,]+)|(\d+)\s?(USDC|USDT|ETH|SOL|TSRT|XMR|BTC)\b/i;

function extractReward(text: string): string | null {
  const m = text.match(REWARD_REGEX);
  return m ? m[0] : null;
}

async function searchGitHub(q: string): Promise<CodeBounty[]> {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${PER_QUERY_LIMIT}`;
  const headers: Record<string, string> = {
    "accept": "application/vnd.github+json",
    "user-agent": "Tessera-Sovereign-BountySolver/1.0",
    "x-github-api-version": "2022-11-28",
  };
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (token) headers["authorization"] = `Bearer ${token}`;
  const r = await guardedFetch(url, { headers });
  if (!r.ok) {
    logger.debug({ q, status: r.status }, "code-bounties: github search non-200");
    return [];
  }
  const j = (await r.json()) as { items?: GitHubSearchItem[] };
  const items = j.items ?? [];
  return items.map(it => {
    const repoFull = it.repository_url.replace(/^https:\/\/api\.github\.com\/repos\//, "");
    const body = sanitizeUntrustedText(it.body ?? "", 1500).sanitized;
    return {
      id: `gh-${it.id}`,
      title: sanitizeUntrustedText(it.title, 240).sanitized,
      htmlUrl: it.html_url,
      apiUrl: it.url,
      repoFullName: repoFull,
      repoUrl: `https://github.com/${repoFull}`,
      labels: it.labels.map(l => l.name),
      body,
      createdAt: new Date(it.created_at).getTime(),
      updatedAt: new Date(it.updated_at).getTime(),
      comments: it.comments,
      state: it.state,
      rewardHint: extractReward(`${it.title} ${body}`),
    };
  });
}

export async function refreshBounties(): Promise<CodeBounty[]> {
  if (refreshing) return cache;
  refreshing = true;
  try {
    const all: CodeBounty[] = [];
    for (const q of BOUNTY_QUERIES) {
      try {
        const r = await searchGitHub(q);
        all.push(...r);
      } catch (err) {
        logger.warn({ q, err: (err as Error).message }, "code-bounties: query failed");
      }
    }
    const seen = new Set<string>();
    cache = all
      .filter(b => { if (seen.has(b.htmlUrl)) return false; seen.add(b.htmlUrl); return true; })
      .sort((a, b) => b.updatedAt - a.updatedAt);
    lastRefresh = Date.now();
  } finally {
    refreshing = false;
  }
  return cache;
}

export function getBounties(opts: { withReward?: boolean; limit?: number } = {}): {
  bounties: CodeBounty[];
  lastRefresh: number;
  attemptsCount: number;
} {
  let bounties = cache;
  if (opts.withReward) bounties = bounties.filter(b => b.rewardHint !== null);
  if (opts.limit) bounties = bounties.slice(0, opts.limit);
  let total = 0;
  for (const arr of attempts.values()) total += arr.length;
  return { bounties, lastRefresh, attemptsCount: total };
}

export function recordAttempt(bountyId: string, status: BountyAttempt["status"], notes: string): BountyAttempt {
  const a: BountyAttempt = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bountyId,
    startedAt: Date.now(),
    status,
    notes: sanitizeUntrustedText(notes, 1000).sanitized,
    prUrl: null,
    payoutTxRef: null,
  };
  const list = attempts.get(bountyId) ?? [];
  list.push(a);
  attempts.set(bountyId, list);
  persistAttempts();
  return a;
}

export function getAttempts(bountyId?: string): BountyAttempt[] {
  if (bountyId) return attempts.get(bountyId) ?? [];
  return Array.from(attempts.values()).flat().sort((a, b) => b.startedAt - a.startedAt);
}

export function startBountyRefresher(): void {
  if (timer) return;
  void ensureAttemptsLoaded();
  void refreshBounties().catch(err => logger.warn({ err: (err as Error).message }, "code-bounties: initial refresh failed"));
  timer = setSacredInterval(() => {
    void refreshBounties().catch(err => logger.warn({ err: (err as Error).message }, "code-bounties: refresh failed", "code-bounties-real"));
  }, REFRESH_MS, "code-bounties-real");
  if (typeof timer.unref === "function") timer.unref();
  logger.info("code-bounty refresher started");
}
