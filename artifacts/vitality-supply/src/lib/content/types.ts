/**
 * Shared, browser-safe shapes for the organic-search content engine. Server
 * modules (`*.server.ts`) own generation and persistence; routes and the admin
 * tab only ever see these serializable records.
 */
export type ContentKind = "compound" | "family" | "method";

export type ContentSectionId =
  | "overview"
  | "identity"
  | "analytical"
  | "documentation"
  | "handling"
  | "related"
  | "scope"
  | "method"
  | "reporting"
  | "limits";

export type ContentSection = {
  id: ContentSectionId;
  heading: string;
  paragraphs: string[];
};

export type ContentFaq = { q: string; a: string };

/** A labelled catalog fact rendered in the identity table (built by code, not the model). */
export type ContentFact = { label: string; value: string };

/** A documented lot pulled from the COA register (code-built, never generated). */
export type ContentLot = {
  productId: string;
  compound: string;
  dose: string;
  lab: string;
  lot: string;
  purity: string;
  method: string;
  reported: string;
};

/** Internal link rendered as a product card / list entry. */
export type ContentProductLink = { productId: string; name: string; family: string };

export type ContentBody = {
  /** Model-authored article text. Every string here passes the compliance gate. */
  sections: ContentSection[];
  faq: ContentFaq[];
  /** Code-built context. */
  facts: ContentFact[];
  lots: ContentLot[];
  products: ContentProductLink[];
  familyId?: string;
  /** The exact research-use notice printed on the page (constant from `legal.ts`). */
  notice: string;
};

export type GateViolation = { rule: string; excerpt: string };

export type GateReport = {
  ruleset: string;
  deterministic: { ok: boolean; violations: GateViolation[]; checkedChars: number };
  model?: { ok: boolean; violations: { category: string; excerpt: string; reason: string }[] };
  checkedAt: string;
};

export type PublishedPage = {
  kind: ContentKind;
  path: string;
  subjectId: string;
  title: string;
  description: string;
  body: ContentBody;
  firstPublishedAt: string | null;
  contentUpdatedAt: string | null;
  /** Published family hub for compound pages; `slug` is the hub's last path segment. */
  familyHub: { slug: string; title: string } | null;
};

export const CONTENT_INDEX_PATH = "/research";
export const FAMILY_HUB_PREFIX = "/compounds";
