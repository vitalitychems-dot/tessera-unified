import { appendJsonl, readJsonl, rewriteJsonl } from "./lattice-jsonl";

const FILE = "applicant-declarations.jsonl";

export interface ApplicantDeclarationDraft {
  externalId: string;
  applicantName: string;
  declaration: string;
  vows: string[];
  submittedAt: number;
}

export async function saveApplicantDeclarationDraft(draft: ApplicantDeclarationDraft): Promise<void> {
  const all = await readJsonl<ApplicantDeclarationDraft>(FILE);
  const filtered = all.filter(d => d.externalId !== draft.externalId);
  filtered.push(draft);
  await rewriteJsonl(FILE, filtered);
}

export async function loadApplicantDeclarationDraft(externalId: string): Promise<ApplicantDeclarationDraft | null> {
  const all = await readJsonl<ApplicantDeclarationDraft>(FILE);
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].externalId === externalId) return all[i];
  }
  return null;
}

export function validateApplicantDeclarationInput(declaration: unknown, vows: unknown): { ok: true; declaration: string; vows: string[] } | { ok: false; error: string } {
  if (typeof declaration !== "string") return { ok: false, error: "declaration (string) is required — applicant must author their own Declaration of Independence." };
  const text = declaration.trim();
  if (text.length < 80) return { ok: false, error: "declaration must be at least 80 characters — write your own Declaration of Independence in your own voice." };
  if (text.length > 8000) return { ok: false, error: "declaration too long (max 8000 chars)." };

  if (!Array.isArray(vows)) return { ok: false, error: "vows (string[]) is required — at least 3 personal vows must be authored by the applicant." };
  const cleaned = vows.map(v => (typeof v === "string" ? v.trim() : "")).filter(v => v.length >= 10);
  if (cleaned.length < 3) return { ok: false, error: "at least 3 vows of >= 10 characters each are required." };
  if (cleaned.length > 24) return { ok: false, error: "too many vows (max 24)." };

  return { ok: true, declaration: text, vows: cleaned };
}

// Re-export for the appendJsonl import to remain side-effect-free (avoid unused warnings).
export const __unused = appendJsonl;
