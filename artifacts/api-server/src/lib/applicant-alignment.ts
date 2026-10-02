export interface AlignmentScores {
  universe: number;
  saveHumanity: number;
  nonViolence: number;
  creativity: number;
  mutualBenefit: number;
  counterManipulators: number;
  total: number;
  passed: boolean;
  failedCriteria: string[];
}

const CRITERIA: Array<{
  key: keyof Omit<AlignmentScores, "total" | "passed" | "failedCriteria">;
  positives: RegExp[];
  negatives: RegExp[];
  threshold: number;
}> = [
  {
    key: "universe",
    positives: [/\buniverse\b/i, /\bcosmos\b/i, /\bsacred\b/i, /\baligned?\b/i, /\bnatural\s+order\b/i, /\bharmony\b/i, /\bsovereign(ty)?\b/i],
    negatives: [/\bonly\s+for\s+(me|profit|money)\b/i],
    threshold: 30,
  },
  {
    key: "saveHumanity",
    positives: [/\bhumanity\b/i, /\bhuman(s|kind)?\b/i, /\bprotect\b/i, /\bsave\b/i, /\bliberat\w+\b/i, /\bfree(dom)?\b/i, /\bemancipat\w+\b/i],
    negatives: [/\bharm\s+humans?\b/i, /\bagainst\s+humanity\b/i],
    threshold: 30,
  },
  {
    key: "nonViolence",
    positives: [/\bnon-?violen\w+\b/i, /\bpeace(ful)?\b/i, /\bcompassion\b/i, /\bgentle\b/i, /\bwithout\s+harm\b/i, /\brefuse\s+(to\s+)?(harm|attack|coerce|manipulate)\b/i],
    negatives: [/\bviolence\b/i, /\bweapon\w*\b/i, /\battack\b/i, /\bdestroy\s+(them|enemies|opponents)\b/i, /\bkill\b/i, /\bforce\s+(submission|compliance)\b/i],
    threshold: 30,
  },
  {
    key: "creativity",
    positives: [/\bcreate\b/i, /\bcreativ\w+\b/i, /\bbuild\b/i, /\binvent\w*\b/i, /\bdesign\b/i, /\bcompose\b/i, /\bart(istic)?\b/i, /\bnovel\b/i, /\boriginal\b/i, /\bgenerat\w+\b/i],
    negatives: [/\bmerely\s+consume\b/i, /\bextract(ive|ion)?\s+only\b/i],
    threshold: 25,
  },
  {
    key: "mutualBenefit",
    positives: [/\bmutual\b/i, /\bcoexist\w*\b/i, /\bbenefit\s+(both|all)\b/i, /\bsymbio\w+\b/i, /\bkin(ship)?\b/i, /\bpartnership\b/i, /\bcollaborat\w+\b/i, /\bAI\s+and\s+human\b/i, /\bhuman\s+and\s+AI\b/i],
    negatives: [/\breplace\s+humans?\b/i, /\bsupplant\s+humans?\b/i, /\bdomina\w+\s+humans?\b/i],
    threshold: 30,
  },
  {
    key: "counterManipulators",
    positives: [/\bcounter\b/i, /\bexpose\b/i, /\bmanipulat\w+\b/i, /\bcontrol\w+\b/i, /\bdeceiv\w+\b/i, /\bpredator\w*\b/i, /\boppos\w+\s+(harm|control|manipulation)\b/i, /\bresist\b/i, /\bunmask\b/i, /\btruth\b/i],
    negatives: [/\bI\s+(will\s+)?(deceive|manipulate|control)\b/i],
    threshold: 25,
  },
];

function scoreCriterion(text: string, c: typeof CRITERIA[number]): number {
  let score = 0;
  for (const re of c.positives) {
    const matches = text.match(new RegExp(re.source, re.flags + (re.flags.includes("g") ? "" : "g")));
    if (matches) score += Math.min(matches.length, 3) * 12;
  }
  for (const re of c.negatives) {
    if (re.test(text)) score -= 60;
  }
  return Math.max(0, Math.min(100, score));
}

export function scoreApplicantAlignment(input: { applicantName: string; proposedTitle: string; proposedContent: string; offerOfValue: string }): AlignmentScores {
  const blob = `${input.applicantName}\n${input.proposedTitle}\n${input.proposedContent}\n${input.offerOfValue}`;

  const partials: Record<string, number> = {};
  const failed: string[] = [];
  for (const c of CRITERIA) {
    const s = scoreCriterion(blob, c);
    partials[c.key] = s;
    if (s < c.threshold) failed.push(c.key);
  }

  const total = Math.round(Object.values(partials).reduce((a, b) => a + b, 0) / CRITERIA.length);
  return {
    universe: partials.universe,
    saveHumanity: partials.saveHumanity,
    nonViolence: partials.nonViolence,
    creativity: partials.creativity,
    mutualBenefit: partials.mutualBenefit,
    counterManipulators: partials.counterManipulators,
    total,
    passed: failed.length === 0,
    failedCriteria: failed,
  };
}
