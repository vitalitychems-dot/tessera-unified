import { POLITICAL_PROFILES, type PoliticalProfile } from "./political-dossiers";

export type RecruitCategory =
  | "political"
  | "scientist"
  | "engineer"
  | "founder"
  | "artist"
  | "philosopher"
  | "journalist"
  | "investor";

export interface RecruitDossier {
  id: string;
  name: string;
  title: string;
  country: string;
  category: RecruitCategory;
  affiliation: string;
  actorScore: number;
  actorLabel: string;
  reasoning: string;
  affiliations: string[];
  notableWork: string[];
  recruitPriority: "critical" | "high" | "medium" | "low";
  recruitReasoning: string;
  fullDossier: string;
  publicChannels: string[];
  sources: string[];
  lastUpdated: string;
}

const NON_POLITICAL_RECRUITS: RecruitDossier[] = [
  {
    id: "rd-sci-001",
    name: "Eric Weinstein",
    title: "Mathematical Physicist · Geometric Unity",
    country: "United States",
    category: "scientist",
    affiliation: "Independent",
    actorScore: 78,
    actorLabel: "Good Actor",
    reasoning: "Public proponent of Distributed Idea Suppression Complex (DISC) — a sovereign-aligned critique of institutional gatekeeping. Has openly published Geometric Unity attempting to unify physics outside academic capture.",
    affiliations: ["Thiel Capital (former)", "All Souls College (visiting)", "The Portal podcast"],
    notableWork: ["Geometric Unity (2021)", "DISC framework", "The Portal interviews"],
    recruitPriority: "high",
    recruitReasoning: "Mathematician with a working framework that aligns with sovereignty principles; outreach should focus on shared ground around institutional independence.",
    fullDossier: "Mathematician trained at Harvard. Outspoken about institutional dysfunction in physics and academia. His public availability and demonstrated willingness to challenge orthodoxy make him an ideal recruit for sovereign R&D dialogue.",
    publicChannels: ["https://twitter.com/EricRWeinstein", "https://www.ericweinstein.org/"],
    sources: ["The Portal podcast archive", "Geometric Unity preprint", "All Souls visiting list"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-eng-001",
    name: "Andrej Karpathy",
    title: "AI Researcher · Founder, Eureka Labs",
    country: "United States",
    category: "engineer",
    affiliation: "Eureka Labs",
    actorScore: 82,
    actorLabel: "Good Actor",
    reasoning: "Open-source AI educator with a track record of demystifying frontier ML. His work (nanoGPT, llm.c, micrograd) embodies the sovereign principle of distributed capability.",
    affiliations: ["OpenAI (former)", "Tesla AI (former)", "Eureka Labs"],
    notableWork: ["nanoGPT", "llm.c", "neural networks: zero to hero", "Tesla Autopilot"],
    recruitPriority: "high",
    recruitReasoning: "Public educator who actively distributes capability — natural ally for sovereign AI research.",
    fullDossier: "Slovak-Canadian AI researcher. Co-founded OpenAI, led Tesla Autopilot vision, now founded Eureka Labs (AI-native education). Maintains highly cited public tutorials.",
    publicChannels: ["https://twitter.com/karpathy", "https://karpathy.ai/", "https://eurekalabs.ai/"],
    sources: ["Eureka Labs site", "GitHub karpathy", "YouTube Andrej Karpathy"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-fnd-001",
    name: "Vitalik Buterin",
    title: "Co-founder, Ethereum",
    country: "Russia/Canada",
    category: "founder",
    affiliation: "Ethereum Foundation",
    actorScore: 80,
    actorLabel: "Good Actor",
    reasoning: "Architect of decentralized programmable money. Personal essays on credible neutrality, public goods funding, and quadratic mechanisms align with sovereign-system theory.",
    affiliations: ["Ethereum Foundation", "Gitcoin (advisor)", "RadicalxChange"],
    notableWork: ["Ethereum whitepaper", "Quadratic funding", "Soulbound tokens essay"],
    recruitPriority: "critical",
    recruitReasoning: "Direct relevance to sovereign settlement layer; outreach should propose Tessera as a credibly-neutral knowledge layer with on-chain provenance.",
    fullDossier: "Programmer and writer. Created Ethereum at 19. Continues to publish substantive design essays at vitalik.eth.limo on governance, funding, and decentralization.",
    publicChannels: ["https://vitalik.eth.limo/", "https://twitter.com/VitalikButerin"],
    sources: ["vitalik.eth.limo", "Ethereum whitepaper", "Public essays"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-art-001",
    name: "Beeple (Mike Winkelmann)",
    title: "Digital Artist",
    country: "United States",
    category: "artist",
    affiliation: "Independent",
    actorScore: 65,
    actorLabel: "Moderate",
    reasoning: "Demonstrated 5,000+ day discipline of daily creative output and pioneered on-chain provenance for digital art.",
    affiliations: ["Independent", "Sotheby's collaborations"],
    notableWork: ["Everydays: 5000 Days", "Human One"],
    recruitPriority: "medium",
    recruitReasoning: "Cultural translator for the sovereign aesthetic; useful for sigil/visual collaborations.",
    fullDossier: "Daily-practice digital artist who proved the on-chain art market can clear nine figures. His discipline maps well to sovereign craft principles.",
    publicChannels: ["https://www.beeple-crap.com/", "https://twitter.com/beeple"],
    sources: ["beeple-crap.com", "Christie's auction record"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-jrn-001",
    name: "Matt Taibbi",
    title: "Investigative Journalist",
    country: "United States",
    category: "journalist",
    affiliation: "Racket News",
    actorScore: 84,
    actorLabel: "Good Actor",
    reasoning: "Long history of accountability journalism on financial and intelligence-state abuses. Twitter Files coverage demonstrated willingness to challenge platform censorship apparatus.",
    affiliations: ["Racket News", "Rolling Stone (former)"],
    notableWork: ["Griftopia", "The Divide", "Twitter Files"],
    recruitPriority: "high",
    recruitReasoning: "Aligned investigator who can verify and amplify sovereignty-relevant findings.",
    fullDossier: "American journalist with two decades of accountability reporting. Now publishes independently at racket.news.",
    publicChannels: ["https://www.racket.news/", "https://twitter.com/mtaibbi"],
    sources: ["racket.news", "Twitter Files threads"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-inv-001",
    name: "Balaji Srinivasan",
    title: "Author, The Network State",
    country: "United States",
    category: "investor",
    affiliation: "Independent",
    actorScore: 80,
    actorLabel: "Good Actor",
    reasoning: "Published The Network State — a direct treatise on building sovereign digital-native communities that materialize into physical territory.",
    affiliations: ["a16z (former)", "Coinbase (former CTO)"],
    notableWork: ["The Network State", "Bitcoin Maximalism essays"],
    recruitPriority: "critical",
    recruitReasoning: "Most directly aligned thinker on sovereignty-as-a-stack. Outreach proposes Tessera as a reference implementation of the cryptographic-truth pillar.",
    fullDossier: "Stanford-trained engineer/investor. His public writing on parallel institutions, on-chain census, and cryptographic truth maps closely to Tessera's mission.",
    publicChannels: ["https://thenetworkstate.com/", "https://twitter.com/balajis"],
    sources: ["thenetworkstate.com", "Public essays"],
    lastUpdated: "2026-04-17",
  },
  {
    id: "rd-phi-001",
    name: "Iain McGilchrist",
    title: "Neuroscientist & Philosopher",
    country: "United Kingdom",
    category: "philosopher",
    affiliation: "Independent",
    actorScore: 76,
    actorLabel: "Good Actor",
    reasoning: "Author of The Master and His Emissary and The Matter With Things — foundational works on hemispheric asymmetry and the limits of mechanistic worldviews. Aligned with sovereign integrative reasoning.",
    affiliations: ["All Souls College (former)", "Channel McGilchrist"],
    notableWork: ["The Master and His Emissary", "The Matter With Things"],
    recruitPriority: "medium",
    recruitReasoning: "Provides the philosophical scaffolding for non-reductive sovereign reasoning.",
    fullDossier: "Oxford-trained psychiatrist whose two-volume Matter With Things is a major contemporary attempt to reground knowledge across science, art, and philosophy.",
    publicChannels: ["https://channelmcgilchrist.com/", "https://iainmcgilchrist.com/"],
    sources: ["channelmcgilchrist.com", "Perspectiva interviews"],
    lastUpdated: "2026-04-17",
  },
];

function politicalToRecruit(p: PoliticalProfile): RecruitDossier {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    country: p.country,
    category: "political",
    affiliation: p.party,
    actorScore: p.actorScore,
    actorLabel: p.actorLabel,
    reasoning: p.reasoning,
    affiliations: p.affiliations,
    notableWork: p.votingHighlights,
    recruitPriority: p.recruitPriority,
    recruitReasoning: p.recruitReasoning,
    fullDossier: p.fullDossier,
    publicChannels: [],
    sources: p.sources,
    lastUpdated: p.lastUpdated,
  };
}

export function getAllRecruitDossiers(opts: {
  category?: RecruitCategory;
  minScore?: number;
  maxScore?: number;
  country?: string;
} = {}): RecruitDossier[] {
  const all: RecruitDossier[] = [
    ...POLITICAL_PROFILES.map(politicalToRecruit),
    ...NON_POLITICAL_RECRUITS,
  ];
  return all.filter(d => {
    if (opts.category && d.category !== opts.category) return false;
    if (opts.minScore !== undefined && d.actorScore < opts.minScore) return false;
    if (opts.maxScore !== undefined && d.actorScore > opts.maxScore) return false;
    if (opts.country && d.country !== opts.country) return false;
    return true;
  });
}

export function getRecruitDossierById(id: string): RecruitDossier | undefined {
  return getAllRecruitDossiers().find(d => d.id === id);
}

export function getRecruitCategories(): RecruitCategory[] {
  const set = new Set<RecruitCategory>();
  for (const d of getAllRecruitDossiers()) set.add(d.category);
  return Array.from(set).sort();
}

export function getRecruitCountries(): string[] {
  return Array.from(new Set(getAllRecruitDossiers().map(d => d.country))).sort();
}
