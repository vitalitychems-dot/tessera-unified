import { logger } from "./logger";
import { addCodexAmendment } from "./tessera-codex";
import { appendLedgerEntry } from "./sovereign-ledger";
import type { GrandConferenceSession, CycleResult, Improvement, Invention } from "./sacred-grand-conference-engine";
import type { CollectiveBallot } from "./sovereign-vote-engine";

export interface PersistResult {
  sessionId: string;
  ledgerIndex: number;
  ledgerHash: string;
  actsEntries: number;
  doctrineEntries: number;
  abstainedItems: number;
  rejectedItems: number;
  totalApproved: number;
  failedAmendments: number;
  byBook: Record<string, number>;
}

function ratifiersFromBallot(b: CollectiveBallot): string[] {
  return b.ballots.filter(a => a.vote === "approve").map(a => a.agentId);
}

function votingRecordFromBallot(b: CollectiveBallot): Record<string, string> {
  const r: Record<string, string> = {};
  for (const a of b.ballots) r[a.agentId] = a.vote;
  return r;
}

function describeImprovement(imp: Improvement, ballot: CollectiveBallot): string {
  const lines: string[] = [];
  lines.push(`# ${imp.title}`);
  lines.push("");
  lines.push(`**Impact:** ${imp.impact}  `);
  lines.push(`**Domain:** ${imp.domain}  `);
  if (imp.auditFindingRef) lines.push(`**Audit Reference:** ${imp.auditFindingRef}  `);
  lines.push("");
  lines.push(imp.description);
  lines.push("");
  lines.push("## Society Ballot");
  lines.push(`- Total eligible voters: **${ballot.totalEligible}** (full sovereign society)`);
  lines.push(`- Outcome: **${ballot.outcome.toUpperCase()}** (decisive: ${ballot.decisive})`);
  lines.push(`- Approval rate: **${(ballot.approvalRate * 100).toFixed(1)}%**`);
  lines.push(`- Weighted vote: approve=${ballot.weighted.approve}, reject=${ballot.weighted.reject}, abstain=${ballot.weighted.abstain}`);
  lines.push(`- Raw vote: approve=${ballot.raw.approve}, reject=${ballot.raw.reject}, abstain=${ballot.raw.abstain}`);
  lines.push("");
  lines.push("## Sacred Anchor");
  const a = ballot.sacred.titleAnchor;
  lines.push(`- Title gematria: **${a.gematria}** (digital root ${a.digitalRoot})`);
  lines.push(`- Nearest sacred number: **${a.nearestSacred.value}** — *${a.nearestSacred.meaning}* (Δ${a.nearestSacred.deviation})`);
  return lines.join("\n");
}

function describeInvention(inv: Invention, ballot: CollectiveBallot): string {
  const lines: string[] = [];
  lines.push(`# ${inv.title || `Invention ${inv.id}`}`);
  lines.push("");
  lines.push(`**ID:** ${inv.id}  `);
  if (inv.inventedBy?.length) lines.push(`**Lineage:** ${inv.inventedBy.join(", ")}  `);
  if (inv.inspirations?.length) lines.push(`**Inspirations:** ${inv.inspirations.join(", ")}  `);
  lines.push("");
  if (inv.description) { lines.push(inv.description); lines.push(""); }
  lines.push("## Society Ballot");
  lines.push(`- Outcome: **${ballot.outcome.toUpperCase()}**, approval rate ${(ballot.approvalRate * 100).toFixed(1)}%`);
  lines.push(`- Weighted: approve=${ballot.weighted.approve}, reject=${ballot.weighted.reject}, abstain=${ballot.weighted.abstain} of ${ballot.totalEligible} eligible`);
  return lines.join("\n");
}

export async function persistConferenceOutputs(
  session: GrandConferenceSession,
): Promise<PersistResult> {
  const result: PersistResult = {
    sessionId: session.sessionId,
    ledgerIndex: -1,
    ledgerHash: "",
    actsEntries: 0,
    doctrineEntries: 0,
    abstainedItems: 0,
    rejectedItems: 0,
    totalApproved: 0,
    failedAmendments: 0,
    byBook: { acts: 0, doctrine: 0 },
  };

  for (const cycle of session.cycles) {
    const allBallots: CollectiveBallot[] = [...cycle.improvementBallots, ...cycle.inventionBallots];
    for (const b of allBallots) {
      if (b.outcome !== "approved") {
        if (b.outcome === "rejected") result.rejectedItems++;
        else result.abstainedItems++;
        continue;
      }
    }

    // Persist each approved improvement to Book of Acts.
    for (let k = 0; k < cycle.improvements.length; k++) {
      const imp = cycle.improvements[k];
      const ballot = cycle.improvementBallots[k];
      if (!ballot || ballot.outcome !== "approved") continue;
      try {
        await addCodexAmendment({
          book: "acts",
          section: `Cycle ${cycle.cycleNumber} — ${cycle.cycleName}`,
          title: `[${imp.id}] ${imp.title}`,
          content: describeImprovement(imp, ballot),
          provenance: `sacred-grand-conference:${session.sessionId}:cycle-${cycle.cycleNumber}:${imp.id}`,
          tags: [
            "conference-output",
            "improvement",
            imp.domain,
            imp.impact,
            `cycle-${cycle.cycleNumber}`,
            `nearest-sacred-${ballot.sacred.titleAnchor.nearestSacred.value}`,
          ],
          ratifiedBy: ratifiersFromBallot(ballot),
          sessionId: session.sessionId,
          votingRecord: votingRecordFromBallot(ballot),
          proofLinks: imp.auditFindingRef ? [imp.auditFindingRef] : [],
        });
        result.actsEntries++;
        result.byBook.acts++;
        result.totalApproved++;
      } catch (err) {
        result.failedAmendments++;
        logger.warn({ err, impId: imp.id }, "failed to persist improvement to Acts");
      }
    }

    // Persist each approved invention to Book of Acts.
    for (let k = 0; k < cycle.inventions.length; k++) {
      const inv = cycle.inventions[k];
      const ballot = cycle.inventionBallots[k];
      if (!ballot || ballot.outcome !== "approved") continue;
      try {
        await addCodexAmendment({
          book: "acts",
          section: `Cycle ${cycle.cycleNumber} — Inventions`,
          title: `[${inv.id}] ${inv.title || "Invention"}`,
          content: describeInvention(inv, ballot),
          provenance: `sacred-grand-conference:${session.sessionId}:cycle-${cycle.cycleNumber}:${inv.id}`,
          tags: [
            "conference-output",
            "invention",
            ...(inv.inventedBy ?? []),
            ...(inv.inspirations ?? []),
            `cycle-${cycle.cycleNumber}`,
          ],
          ratifiedBy: ratifiersFromBallot(ballot),
          sessionId: session.sessionId,
          votingRecord: votingRecordFromBallot(ballot),
        });
        result.actsEntries++;
        result.byBook.acts++;
        result.totalApproved++;
      } catch (err) {
        result.failedAmendments++;
        logger.warn({ err, invId: inv.id }, "failed to persist invention to Acts");
      }
    }

    // Persist Bible chapter (if present) to Book of Doctrine.
    const bibleChapter = (cycle as CycleResult & { bibleChapter?: { title?: string; verses?: Array<{ number: number; text: string }> } }).bibleChapter;
    if (bibleChapter && Array.isArray(bibleChapter.verses) && bibleChapter.verses.length > 0) {
      const versesText = bibleChapter.verses
        .map(v => `${v.number}. ${v.text}`)
        .join("\n");
      try {
        await addCodexAmendment({
          book: "doctrine",
          section: `Tessera Bible — Chapter ${cycle.cycleNumber}`,
          title: bibleChapter.title ?? `Chapter ${cycle.cycleNumber} — ${cycle.cycleName}`,
          content: `# ${bibleChapter.title ?? cycle.cycleName}\n\n${versesText}`,
          provenance: `sacred-grand-conference:${session.sessionId}:cycle-${cycle.cycleNumber}:bible`,
          tags: ["conference-output", "tessera-bible", `cycle-${cycle.cycleNumber}`, `frequency-${cycle.sacredFrequency}`],
          ratifiedBy: cycle.agentsEvolved,
          sessionId: session.sessionId,
        });
        result.doctrineEntries++;
        result.byBook.doctrine++;
      } catch (err) {
        result.failedAmendments++;
        logger.warn({ err, cycle: cycle.cycleNumber }, "failed to persist bible chapter to Doctrine");
      }
    }
  }

  // Single ledger entry sealing the session: total approved + abstained + rejected counts,
  // plus an integrity hash over the ratified item ids.
  const allItemIds: string[] = [];
  for (const c of session.cycles) {
    for (const b of [...c.improvementBallots, ...c.inventionBallots]) {
      if (b.outcome === "approved") allItemIds.push(b.itemId);
    }
  }
  const ledger = appendLedgerEntry("council-decision", "sacred-grand-conference", {
    sessionId: session.sessionId,
    cycles: session.cycles.length,
    totalImprovements: session.totalImprovements,
    totalInventions: session.totalInventions,
    totalKnowledgeGained: session.totalKnowledgeGained,
    bibleChaptersGenerated: session.bibleChaptersGenerated,
    persisted: {
      actsEntries: result.actsEntries,
      doctrineEntries: result.doctrineEntries,
      totalApproved: result.totalApproved,
      abstained: result.abstainedItems,
      rejected: result.rejectedItems,
      failedAmendments: result.failedAmendments,
    },
    ratifiedItemIds: allItemIds,
  });
  result.ledgerIndex = ledger.index;
  result.ledgerHash = ledger.hash;

  logger.info(
    {
      sessionId: session.sessionId,
      actsEntries: result.actsEntries,
      doctrineEntries: result.doctrineEntries,
      ledgerIndex: ledger.index,
    },
    "Conference outputs persisted to Codex (Acts + Doctrine) and sealed in ledger",
  );

  return result;
}
