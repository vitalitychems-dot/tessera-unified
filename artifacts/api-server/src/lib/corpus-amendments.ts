import { db } from "@workspace/db";
import { corpusAmendmentsTable, type CorpusAmendmentRow } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { logger as baseLogger } from "./logger";
const logger = baseLogger.child ? baseLogger.child({ mod: "corpus-amendments" }) : baseLogger;
import {
  getCorpus,
  getCrossReferences,
  type CorpusEntry,
  type CrossReference,
  _resetCorpusCaches,
  _injectAmendments,
} from "./knowledge-corpus-index";
import { appendLedgerEntry } from "./sovereign-ledger";


export type CorpusAmendmentKind =
  | "add-entry"
  | "add-crossref"
  | "realign-frequency"
  | "retag-entry"
  | "merge-duplicates";

export interface AddEntryPayload {
  id: string;
  domain: string;
  title: string;
  summary: string;
  category: CorpusEntry["category"];
  tags: string[];
  confidence: number;
  frequency?: number;
  sourceRef?: string;
}
export interface AddCrossRefPayload {
  fromId: string;
  toId: string;
  relation: string;
  strength: number;
}
export interface RealignFrequencyPayload {
  entryId: string;
  fromFrequency: number;
  toFrequency: number;
  rationale: string;
}
export interface RetagEntryPayload {
  domain: string;
  addTags: string[];
  rationale: string;
}
export interface MergeDuplicatesPayload {
  keptId: string;
  mergedIds: string[];
  disambiguationTitles: Record<string, string>;
}

export interface CorpusAmendmentInput {
  amendmentId: string;
  kind: CorpusAmendmentKind;
  findingId?: string | null;
  sessionId: string;
  targetIds: string[];
  payload:
    | AddEntryPayload
    | AddCrossRefPayload
    | RealignFrequencyPayload
    | RetagEntryPayload
    | MergeDuplicatesPayload;
  ratifiedBy: string[];
  votingRecord?: Record<string, string>;
  ledgerIndex?: number | null;
  ledgerHash?: string | null;
}

export async function saveCorpusAmendment(input: CorpusAmendmentInput): Promise<CorpusAmendmentRow> {
  const [row] = await db
    .insert(corpusAmendmentsTable)
    .values({
      amendmentId: input.amendmentId,
      kind: input.kind,
      findingId: input.findingId ?? null,
      sessionId: input.sessionId,
      targetIds: input.targetIds,
      payload: input.payload as unknown as Record<string, unknown>,
      ratifiedBy: input.ratifiedBy,
      votingRecord: input.votingRecord ?? {},
      ledgerIndex: input.ledgerIndex ?? null,
      ledgerHash: input.ledgerHash ?? null,
    })
    .returning();
  return row;
}

export async function loadAllAmendments(): Promise<CorpusAmendmentRow[]> {
  return await db.select().from(corpusAmendmentsTable).orderBy(asc(corpusAmendmentsTable.appliedAt));
}

export async function refreshAmendmentsIntoCorpus(): Promise<{
  amendmentsApplied: number;
  newEntries: number;
  newCrossRefs: number;
  realignedFrequencies: number;
  retaggedEntries: number;
  mergedDuplicates: number;
}> {
  const rows = await loadAllAmendments();
  _resetCorpusCaches();
  // Force cache build first so we have base corpus
  getCorpus();
  getCrossReferences();
  let newEntries = 0,
    newCrossRefs = 0,
    realignedFrequencies = 0,
    retaggedEntries = 0,
    mergedDuplicates = 0;
  const addEntries: CorpusEntry[] = [];
  const addRefs: CrossReference[] = [];
  const freqRealign = new Map<string, number>();
  const tagAdds = new Map<string, Set<string>>();
  const mergeMap = new Map<string, { keptId: string; titleSuffix: string }>();
  for (const r of rows) {
    if (r.kind === "add-entry") {
      const p = r.payload as unknown as AddEntryPayload;
      addEntries.push({
        id: p.id,
        domain: p.domain,
        title: p.title,
        summary: p.summary,
        sourceRef: p.sourceRef ?? `corpus-amendment:${r.amendmentId}`,
        category: p.category,
        tags: p.tags,
        confidence: p.confidence,
        frequency: p.frequency,
      });
      newEntries++;
    } else if (r.kind === "add-crossref") {
      const p = r.payload as unknown as AddCrossRefPayload;
      addRefs.push({ fromId: p.fromId, toId: p.toId, relation: p.relation, strength: p.strength });
      newCrossRefs++;
    } else if (r.kind === "realign-frequency") {
      const p = r.payload as unknown as RealignFrequencyPayload;
      freqRealign.set(p.entryId, p.toFrequency);
      realignedFrequencies++;
    } else if (r.kind === "retag-entry") {
      const p = r.payload as unknown as RetagEntryPayload;
      const set = tagAdds.get(p.domain) ?? new Set();
      for (const t of p.addTags) set.add(t);
      tagAdds.set(p.domain, set);
      retaggedEntries++;
    } else if (r.kind === "merge-duplicates") {
      const p = r.payload as unknown as MergeDuplicatesPayload;
      for (const merged of p.mergedIds) {
        mergeMap.set(merged, { keptId: p.keptId, titleSuffix: p.disambiguationTitles[merged] ?? "" });
      }
      mergedDuplicates++;
    }
  }
  _injectAmendments({ addEntries, addRefs, freqRealign, tagAdds, mergeMap });
  logger.info(
    { amendmentsApplied: rows.length, newEntries, newCrossRefs, realignedFrequencies, retaggedEntries, mergedDuplicates },
    "corpus amendments applied",
  );
  return {
    amendmentsApplied: rows.length,
    newEntries,
    newCrossRefs,
    realignedFrequencies,
    retaggedEntries,
    mergedDuplicates,
  };
}

export async function getAmendmentBySessionId(sessionId: string): Promise<CorpusAmendmentRow[]> {
  return await db.select().from(corpusAmendmentsTable).where(eq(corpusAmendmentsTable.sessionId, sessionId));
}

export function sealAmendmentsToLedger(opts: {
  sessionId: string;
  amendmentCount: number;
  findingsAddressed: string[];
  summary: Record<string, number>;
}): { index: number; hash: string } {
  return appendLedgerEntry("corpus-amendment", "council-ratified-corpus-fix", {
    sessionId: opts.sessionId,
    amendmentCount: opts.amendmentCount,
    findingsAddressed: opts.findingsAddressed,
    summary: opts.summary,
  });
}
