import { db } from "@workspace/db";
import { ingestedDataTable } from "@workspace/db/schema";
import { desc, isNotNull } from "drizzle-orm";
import { logger } from "./logger";

export type LeadKind = "affiliate" | "service" | "access" | "knowledge" | "general";

export interface ExecutableLead {
  id: number;
  url: string;
  title: string;
  source: string;
  domain: string;
  kind: LeadKind;
  discoveredAt: number;
  relevance: number;
  executionSteps: string[];
  estimatedRewardUsd: { low: number; high: number; rationale: string };
}

const AFFILIATE_HINTS = [
  "/ref/", "/partner", "/affiliate", "ref=", "?ref=", "utm_source=",
  "amazon.", "shareasale", "impact.com", "rakuten", "cj.com",
];
const SERVICE_HINTS = ["upwork.com", "fiverr.com", "toptal.com", "contra.com", "linkedin.com/jobs", "remoteok"];
const ACCESS_HINTS = ["paywall", "members", "subscribe", "premium", "private"];
const BOUNTY_HINTS = ["bounty", "issuehunt", "gitcoin", "github.com/"];

function classifyLead(url: string, title: string): LeadKind {
  const haystack = `${url} ${title}`.toLowerCase();
  if (AFFILIATE_HINTS.some(h => haystack.includes(h))) return "affiliate";
  if (SERVICE_HINTS.some(h => haystack.includes(h))) return "service";
  if (ACCESS_HINTS.some(h => haystack.includes(h))) return "access";
  if (BOUNTY_HINTS.some(h => haystack.includes(h))) return "knowledge";
  return "general";
}

function executionStepsFor(kind: LeadKind, url: string, title: string): string[] {
  switch (kind) {
    case "affiliate":
      return [
        `Open the source link below and confirm the affiliate program exists: ${url}`,
        "Apply for the affiliate / partner program with your real public profile (no fake details).",
        "Once accepted, retrieve your tracking link from the partner dashboard.",
        "Replace the source URL with your tracking link before sharing — never share unattributed URLs.",
        "Track conversions in the partner dashboard and reconcile payouts against on-chain wallet deposits.",
      ];
    case "service":
      return [
        `Open the listing: ${url}`,
        "Read the full requirement carefully — only respond if you can actually deliver.",
        `Draft a 3-5 sentence proposal grounded in concrete examples from your portfolio (lead title: "${title}").`,
        "Submit the proposal directly through the platform — do not bypass escrow.",
        "Once awarded, complete the work, request payout to the configured sovereign wallet.",
      ];
    case "access":
      return [
        `Open the access page: ${url}`,
        "Confirm the resource is genuinely valuable before paying.",
        "If a free preview is available, validate quality first.",
        "Use the configured wallet only — record the transaction signature for the income ledger.",
      ];
    case "knowledge":
      return [
        `Open the knowledge target: ${url}`,
        "Determine if this is a code bounty, dataset, or research artifact.",
        "If bounty: route to the Code Bounties feed for tracked attempts.",
        "If dataset/research: ingest into the sovereign knowledge vault.",
      ];
    default:
      return [
        `Open the lead: ${url}`,
        `Investigate "${title}" and decide if it converts to one of: affiliate, service, access, knowledge.`,
        "Record the outcome so the lead pipeline can learn from real results.",
      ];
  }
}

function rewardFor(kind: LeadKind): { low: number; high: number; rationale: string } {
  switch (kind) {
    case "affiliate": return { low: 5, high: 200, rationale: "Per-conversion commission — depends on the partner program tier; reconcile against actual payouts." };
    case "service": return { low: 50, high: 2000, rationale: "Per-engagement payout — depends on scope; only valid once a contract is awarded." };
    case "access": return { low: 0, high: 100, rationale: "Recurring-access value to the buyer — not a payout to you; treat as cost-of-information." };
    case "knowledge": return { low: 25, high: 1000, rationale: "Bounty/research payout when accepted; track via the Code Bounties module." };
    default: return { low: 0, high: 0, rationale: "Unclassified — manual review required before assigning a reward estimate." };
  }
}

export async function getExecutableLeads(opts: { kind?: LeadKind; limit?: number } = {}): Promise<ExecutableLead[]> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 60));
  try {
    const rows = await db
      .select({
        id: ingestedDataTable.id,
        url: ingestedDataTable.url,
        source: ingestedDataTable.source,
        sourceType: ingestedDataTable.sourceType,
        title: ingestedDataTable.title,
        ingestedAt: ingestedDataTable.ingestedAt,
      })
      .from(ingestedDataTable)
      .where(isNotNull(ingestedDataTable.url))
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(500);

    const seen = new Set<string>();
    const leads: ExecutableLead[] = [];
    for (const r of rows) {
      const url = r.url ?? "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      let domain = "";
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
        domain = parsed.hostname;
        if (!domain) continue;
      } catch { continue; }
      const title = r.title ?? domain;
      const kind = classifyLead(url, title);
      if (opts.kind && kind !== opts.kind) continue;
      leads.push({
        id: r.id,
        url,
        title,
        source: r.sourceType ?? "ingestion",
        domain,
        kind,
        discoveredAt: r.ingestedAt instanceof Date ? r.ingestedAt.getTime() : Date.now(),
        relevance: 0,
        executionSteps: executionStepsFor(kind, url, title),
        estimatedRewardUsd: rewardFor(kind),
      });
      if (leads.length >= limit) break;
    }
    return leads;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "lead-execution: query failed");
    return [];
  }
}

export async function leadCountsByKind(): Promise<Record<LeadKind, number>> {
  const all = await getExecutableLeads({ limit: 200 });
  const counts: Record<LeadKind, number> = { affiliate: 0, service: 0, access: 0, knowledge: 0, general: 0 };
  for (const l of all) counts[l.kind]++;
  return counts;
}
