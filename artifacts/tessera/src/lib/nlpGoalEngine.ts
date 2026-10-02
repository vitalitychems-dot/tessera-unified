import { NLP_TECHNIQUE_STYLES } from "./nlpTechniques";

export interface NLPSegment {
  text: string;
  nlp?: {
    textColor: string;
    bold: boolean;
    italic: boolean;
    uppercase: boolean;
    sizeClass: string;
    technique: string;
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SYNONYM_MAP: Record<string, string[]> = {
  discipline:    ["disciplin", "consistent", "consistenc", "commit", "dedic", "persist", "self-control"],
  focus:         ["focus", "focu", "clarity", "clear", "concentrat", "attent", "intentional"],
  financial:     ["financ", "money", "wealth", "income", "rich", "abundan", "prosper", "earn"],
  sovereignty:   ["sovereig", "sovereign", "independen", "freedom", "free", "autonom", "liberat"],
  confidence:    ["confiden", "bold", "power", "strong", "strength", "courag", "asserti"],
  abundance:     ["abundan", "prosper", "wealth", "wealthy", "plenty", "rich", "surplus"],
  success:       ["success", "achiev", "accomplish", "win", "victori", "triumph", "excel"],
  health:        ["health", "heal", "vital", "energi", "wellness", "fit", "strong", "recover"],
  growth:        ["grow", "growth", "expand", "evolv", "develop", "progress", "advance", "learn"],
  love:          ["love", "loving", "compassion", "heart", "care", "nurtur", "warm"],
  purpose:       ["purpos", "mission", "vision", "calling", "destini", "intent", "direct"],
  peace:         ["peace", "calm", "serenity", "serene", "tranquil", "balance", "harmoni"],
  clarity:       ["clarity", "clear", "focus", "understand", "insight", "aware", "conscious"],
  power:         ["power", "strong", "strength", "might", "capabilit", "competen", "master"],
  wealth:        ["wealth", "rich", "financ", "money", "prosper", "abundan", "earn", "income"],
  freedom:       ["freedom", "free", "liberat", "sovereig", "independen", "autonom", "unlimit"],
  build:         ["build", "built", "creat", "construct", "develop", "craft", "design", "make"],
  momentum:      ["momentum", "motion", "progress", "forward", "action", "activ", "drive"],
  vision:        ["vision", "dream", "imagine", "envision", "see", "manifest", "future"],
  mindset:       ["mindset", "mind", "mental", "thought", "believ", "programm", "pattern"],
};

function getMatchTerms(goal: string): string[] {
  const normalized = goal.toLowerCase().trim();
  const terms = new Set<string>([normalized]);

  const stemmed = normalized
    .replace(/(?:tion|ness|ment|ance|ence|ing|ity|ful|ous|al|ed|er|ly|est)$/, "")
    .trim();
  if (stemmed.length >= 3 && stemmed !== normalized) {
    terms.add(stemmed);
  }

  for (const [key, synonymStems] of Object.entries(SYNONYM_MAP)) {
    const keyRoot = key.replace(/(?:tion|ness|ment|ance|ence|ing|ity|ful|ous|al|ed|er|ly|est)$/, "");
    if (
      normalized.includes(key) ||
      normalized.includes(keyRoot) ||
      stemmed === keyRoot ||
      stemmed.startsWith(keyRoot.slice(0, 4))
    ) {
      for (const syn of synonymStems) {
        terms.add(syn);
      }
    }
  }

  return Array.from(terms).filter((t) => t.length >= 3);
}

function styleForGoal(goalIndex: number) {
  return NLP_TECHNIQUE_STYLES[goalIndex % NLP_TECHNIQUE_STYLES.length];
}

export function applyNLPHighlights(text: string, goals: string[]): NLPSegment[] {
  if (!goals.length || !text.trim()) return [{ text }];

  const goalData = goals.map((g, i) => ({
    terms: getMatchTerms(g),
    style: styleForGoal(i),
  }));

  const segments: NLPSegment[] = [];
  let position = 0;

  while (position < text.length) {
    let bestMatch: {
      start: number;
      end: number;
      style: (typeof NLP_TECHNIQUE_STYLES)[0];
    } | null = null;

    for (const { terms, style } of goalData) {
      for (const term of terms) {
        let pattern: RegExp;
        try {
          pattern = new RegExp(
            `(?<![a-zA-Z])(${escapeRegex(term)}[a-z]*)(?![a-zA-Z])`,
            "gi"
          );
        } catch {
          continue;
        }

        pattern.lastIndex = position;
        const match = pattern.exec(text);

        if (match && match.index >= position) {
          if (
            !bestMatch ||
            match.index < bestMatch.start ||
            (match.index === bestMatch.start &&
              match[0].length > bestMatch.end - bestMatch.start)
          ) {
            bestMatch = {
              start: match.index,
              end: match.index + match[0].length,
              style,
            };
          }
        }
      }
    }

    if (!bestMatch) {
      segments.push({ text: text.slice(position) });
      break;
    }

    if (bestMatch.start > position) {
      segments.push({ text: text.slice(position, bestMatch.start) });
    }

    segments.push({
      text: text.slice(bestMatch.start, bestMatch.end),
      nlp: {
        textColor: bestMatch.style.textColor,
        bold: bestMatch.style.bold,
        italic: bestMatch.style.italic,
        uppercase: bestMatch.style.uppercase,
        sizeClass: bestMatch.style.sizeClass,
        technique: bestMatch.style.id,
      },
    });

    position = bestMatch.end;
  }

  return segments;
}
