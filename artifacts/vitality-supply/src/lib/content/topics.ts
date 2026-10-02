/**
 * The finite, deterministic universe of pages the engine may write. Topics are
 * derived from the live catalog so a new compound automatically becomes a
 * candidate and a discontinued one stops being linked. Browser-safe.
 */
import { PRODUCTS, productsByFamily, type Product } from "@/lib/catalog";
import { FAMILIES, type FamilyId } from "@/lib/families";
import { CONTENT_INDEX_PATH, FAMILY_HUB_PREFIX, type ContentKind } from "./types";

export type CompoundTopic = {
  kind: "compound";
  subjectId: string;
  path: string;
  product: Product;
};

export type FamilyTopic = {
  kind: "family";
  subjectId: FamilyId;
  path: string;
  label: string;
  blurb: string;
  products: Product[];
};

export type MethodTopic = {
  kind: "method";
  subjectId: string;
  path: string;
  title: string;
  brief: string;
  outline: string[];
};

export type ContentTopic = CompoundTopic | FamilyTopic | MethodTopic;

/** Stable, keyword-bearing hub slugs (family ids are internal shorthand). */
export const FAMILY_HUB_SLUGS: Record<FamilyId, string> = {
  metabolic: "receptor-pathway-compounds",
  tissue: "peptide-and-copper-compounds",
  "gh-axis": "peptide-receptor-ligands",
  mito: "cofactor-and-redox-compounds",
  neuro: "neuropeptide-compounds",
  melanocortin: "melanocortin-receptor-ligands",
  immune: "peptide-assay-compounds",
  specialty: "analytical-blends-and-materials",
};

export const METHOD_TOPICS: MethodTopic[] = [
  {
    kind: "method",
    subjectId: "reading-a-certificate-of-analysis",
    path: `${CONTENT_INDEX_PATH}/reading-a-certificate-of-analysis`,
    title: "Reading a certificate of analysis for a research compound",
    brief:
      "Explains, field by field, what a lot-specific certificate of analysis (COA) for a lyophilized research material reports: identification of the material and lot, the analytical methods used, the purity figure and how it is derived, identity confirmation, the net quantity, the reporting laboratory, and the report date. Explains that results apply only to the sample tested.",
    outline: ["scope", "identity", "analytical", "reporting", "limits", "documentation"],
  },
  {
    kind: "method",
    subjectId: "hplc-purity-testing",
    path: `${CONTENT_INDEX_PATH}/hplc-purity-testing`,
    title: "How HPLC purity is determined for research peptides",
    brief:
      "Describes reversed-phase HPLC with UV detection as the release method for peptide purity: how area-percent purity is calculated from a chromatogram, what related-substance peaks mean, why a purity figure is a lot-level measurement, and how it appears on a certificate of analysis.",
    outline: ["scope", "method", "reporting", "limits", "documentation"],
  },
  {
    kind: "method",
    subjectId: "lc-ms-identity-confirmation",
    path: `${CONTENT_INDEX_PATH}/lc-ms-identity-confirmation`,
    title: "LC-MS identity confirmation for research compounds",
    brief:
      "Describes how liquid chromatography–mass spectrometry confirms that the material in a lot is the named compound: observed versus theoretical mass, charge states typical of peptides, why identity and purity are separate questions, and how identity results are reported.",
    outline: ["scope", "method", "reporting", "limits", "documentation"],
  },
  {
    kind: "method",
    subjectId: "lyophilized-research-materials",
    path: `${CONTENT_INDEX_PATH}/lyophilized-research-materials`,
    title: "Lyophilized research materials: what the format means for identity and storage",
    brief:
      "Explains what lyophilization (freeze-drying) is as a manufacturing and stabilization step, why research peptides are supplied as lyophilized powder in sealed vials, how net quantity is stated, and how sealed lyophilized material is stored and handled as a laboratory reagent. Contains no preparation or use instructions.",
    outline: ["scope", "method", "handling", "limits", "documentation"],
  },
];

export function compoundSubjectId(product: Product) {
  return product.id.split("__")[1] ?? product.id;
}

export function compoundTopicFor(product: Product): CompoundTopic {
  const subjectId = compoundSubjectId(product);
  return { kind: "compound", subjectId, path: `${CONTENT_INDEX_PATH}/${subjectId}`, product };
}

export function compoundTopics(): CompoundTopic[] {
  return PRODUCTS.filter((product) => product.inStock && product.category === "vial-compounds")
    .map(compoundTopicFor);
}

export function familyTopics(): FamilyTopic[] {
  return FAMILIES.flatMap((family) => {
    const products = productsByFamily(family.id).filter((product) => product.inStock);
    if (products.length < 2) return [];
    return [
      {
        kind: "family" as const,
        subjectId: family.id,
        path: `${FAMILY_HUB_PREFIX}/${FAMILY_HUB_SLUGS[family.id]}`,
        label: family.label,
        blurb: family.blurb,
        products,
      },
    ];
  });
}

export function allTopics(): ContentTopic[] {
  return [...compoundTopics(), ...familyTopics(), ...METHOD_TOPICS];
}

export function findTopic(kind: ContentKind, subjectId: string): ContentTopic | undefined {
  return allTopics().find((topic) => topic.kind === kind && topic.subjectId === subjectId);
}

export function findTopicByPath(path: string): ContentTopic | undefined {
  return allTopics().find((topic) => topic.path === path);
}

export function familyTopicById(id: string): FamilyTopic | undefined {
  return familyTopics().find((topic) => topic.subjectId === id);
}
