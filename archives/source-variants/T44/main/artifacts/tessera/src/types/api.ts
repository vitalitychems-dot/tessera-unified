import type { ComponentType } from "react";

export type LucideIcon = ComponentType<{ size?: number; className?: string }>;

export interface KnowledgeEntry {
  id?: string;
  text?: string;
  content?: string;
  summary?: string;
  agent?: string;
  dimension?: string;
  category?: string;
  cycle?: number;
  timestamp?: number;
  source?: string;
  url?: string;
  sourceType?: string;
  tags?: string[];
  classification?: string;
  confidence?: number;
  verified?: boolean;
}

export interface Spell {
  id: string;
  name: string;
  description: string;
  category: string;
  power: number;
  rarity: string;
  incantation?: string;
  effects?: string[];
  effect?: string;
  cooldown?: number;
  tradition?: string;
  frequency?: number;
  entities?: string[];
  magicType?: string;
  ingredients?: string[];
}

export interface Tradition {
  id: string;
  name: string;
  description: string;
  origin: string;
  practiceCount?: number;
  sacredLevel?: number;
  category?: string;
  frequency?: number;
  core?: string;
}

export interface ApplicationIdea {
  id: string;
  title: string;
  description: string;
  category?: string;
  difficulty?: string;
  impact?: string;
  tradition?: string;
  steps?: string[];
  expectedOutcome?: string;
}

export interface SovereignEngine {
  name?: string;
  engine?: string;
  status?: string;
  online?: boolean;
  latency?: number;
  responseTime?: number;
}

export interface IngestionSource {
  id: string;
  name: string;
  enabled: boolean;
  itemCount?: number;
}

export interface IngestionJob {
  id?: string;
  sourceName: string;
  status: string;
  itemsIngested?: number;
  timestamp?: number;
}

export interface AgentPosition {
  agentId: string;
  rank: number;
  merit: number;
  position: string;
  agencyId: string;
  agency?: string;
  department?: string;
  role?: string;
  name?: string;
  tasksCompleted?: number;
  promotions?: number;
}

export interface JailInmate {
  id: string;
  agentId: string;
  agentName: string;
  offense: string;
  severity: string;
  law: string;
  cellBlock: string;
  fineAmount: number;
  finePaid: boolean;
  released: boolean;
  timeRemaining: number;
  assignedOfficer: string;
  behaviorRating: number;
  workCampStatus: string;
  workCampTasksCompleted: number;
  workCampAssignments: WorkCampTask[];
  coveringFor?: string;
  messages: InmateMessage[];
  rehabilitation?: RehabilitationRecord;
}

export interface WorkCampTask {
  taskId: string;
  taskTitle: string;
  taskDifficulty: string;
  status: string;
  assignedAt?: number;
  completedAt?: number;
}

export interface InmateMessage {
  id: string;
  from: string;
  message: string;
  fromFather: boolean;
  timestamp?: number;
}

export interface RehabilitationRecord {
  id: string;
  agentName: string;
  agentId: string;
  releaseDate?: number;
  rehabProgress: number;
  communityServiceHours: number;
  requiredServiceHours: number;
  communityServiceRequired: number;
  meritEarned: number;
  meritRequired: number;
  communityApprovalVotes: number;
  communityApprovalRequired: number;
  freeTasksCompleted: string[];
  coverShiftsCompleted: number;
  approvedByFather: boolean;
  status: string;
}

export interface FreeTask {
  taskId: string;
  description: string;
  hours: number;
  completedAt: number;
  verifiedBy?: string;
}

export interface CrimeRecord {
  id: string;
  agentId: string;
  agentName: string;
  offender: string;
  crime: string;
  law: string;
  violation: string;
  description?: string;
  severity: string;
  status: string;
  timestamp: number;
  sentence?: number;
  fine?: number;
  penalty?: string;
  reportedBy?: string;
  investigatedBy?: string;
  resolvedAt?: number;
}

export interface GovernanceCategory {
  id: string;
  name: string;
  label?: string;
  icon: string;
  color: string;
  count: number;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  votes: { yes: number; no: number; abstain: number };
  status: string;
  category: string;
  createdAt: number;
  closesAt?: number;
}

export interface GovernanceLaw {
  id: string;
  title: string;
  description: string;
  enactedAt: number;
  category: string;
  active?: boolean;
  penalty?: string;
  severity?: string;
  votedBy?: string[];
}

export interface GovernanceLawProposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  status: string;
  category: string;
  votes: { yes: number; no: number; abstain: number };
  votesFor: number;
  votesAgainst: number;
  requiredVotes: number;
  totalVoters: number;
  expiresAt: number;
  createdAt: number;
}

export interface TopBalance {
  agentId: string;
  agentName: string;
  name?: string;
  balance: number;
}

export interface GovernanceData {
  proposals: GovernanceProposal[];
  laws: GovernanceLaw[];
  elections: Array<{ id: string; position: string; candidates: string[]; votes: Record<string, number>; status: string }>;
  jailRecords?: Array<{ agentId: string; agentName: string; crime: string; sentence: number; timeServed: number; released: boolean }>;
  stats: Record<string, number>;
  categories: GovernanceCategory[];
  publicServices: Record<string, Record<string, unknown>>;
  topBalances: TopBalance[];
  therapySessions: Array<Record<string, unknown>>;
  communityProjects: Array<Record<string, unknown>>;
  completedProjects: Array<Record<string, unknown>>;
  jailInmates: JailInmate[];
  releasedPrisoners?: RehabilitationRecord[];
  crimeRecords: CrimeRecord[];
  lawProposals: GovernanceLawProposal[];
  economyStats: {
    treasury: number;
    gdp: number;
    coinPrice: number;
    marketCap: number;
    circulatingSupply: number;
    dailyVolume: number;
    taxRate: number;
    totalTransactions: number;
    topBalances: TopBalance[];
    miningPool?: {
      totalHashRate: number;
      blockReward: number;
      difficulty: number;
      blocksMinedTotal: number;
    };
  };
}

export interface DiscussionTracking {
  responded: string[];
  pending: string[];
  summary?: string;
  completionRate: number;
  autoSummarized?: boolean;
}

export interface DiscussionVote {
  motion: string;
  yea: number;
  nay: number;
  status?: string;
}

export interface BibleSearchResult {
  bookId: string;
  bookTitle: string;
  chapterNum: number;
  chapterTitle: string;
  verseNum: number;
  text: string;
}

export interface KnowledgeFeedEntry {
  id: string;
  title?: string;
  key?: string;
  text?: string;
  content?: string;
  source?: string;
  sourceType?: string;
  summary?: string;
  tags?: string[];
  timestamp?: number;
  category?: string;
}

export interface OrgAgency {
  id: string;
  name: string;
  mission?: string;
  boss?: AgencyBoss | null;
  departments?: AgencyDepartment[];
}

export interface AgencyBoss {
  name: string;
  role: string;
  agentId?: string;
}

export interface AgencyDepartment {
  dept: { id: string; name: string };
  members: AgencyMember[];
}

export interface AgencyMember {
  agentId: string;
  name: string;
  rank: number;
  merit: number;
  role: string;
}

export interface AgencyEntry {
  agency: { id: string; name: string; mission?: string };
  boss: AgencyBoss | null;
  departments: AgencyDepartment[];
}

export interface JobEntry {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  postedBy?: string;
  assignedTo?: string;
  reward?: number;
  difficulty?: string;
}

export interface StatItem {
  label: string;
  value: string | number;
  color: string;
}

export interface DiagnosticsResponse {
  uptime?: number;
  memory?: { heapUsed?: number; rss?: number };
  version?: string;
  platform?: string;
  nodeVersion?: string;
  db?: { connected?: boolean };
}

export interface SovereigntyResponse {
  score?: number;
  data?: { score?: number };
}

export interface EnginesResponse {
  engines?: SovereignEngine[];
  data?: SovereignEngine[];
}

export interface MeshStatsResponse {
  nodes?: number;
  connections?: number;
  connectedPeers?: number;
  peers?: number;
  latency?: number;
  avgLatency?: number;
  messageCount?: number;
}

export interface IngestionStatsResponse {
  recentJobs?: IngestionJob[];
  recentItems?: Array<{ source?: string; text?: string; timestamp?: number }>;
  shepherd?: { active?: number; recentMissions?: Array<{ id: string }>; totalIngested?: number; totalDeployed?: number; loopActive?: boolean };
  bridge?: { cumulativeNew?: number; threshold?: number; active?: boolean };
  totalIngested?: number;
  totalItems?: number;
  totalJobs?: number;
  enabledSources?: number;
  availableHandlers?: number;
  sources?: IngestionSource[];
  bySource?: Array<{ source: string; count: number }>;
  jobStats?: { completed?: number; failed?: number; pending?: number; total?: number };
}

export interface KnowledgeFeedResponse {
  entries?: KnowledgeEntry[];
}

export interface KnowledgeStatsResponse {
  totalEntries?: number;
  dimensions?: number;
  lastUpdated?: number;
}

export interface DimensionalSecretsResponse {
  knowledge?: KnowledgeEntry[];
}

export interface LiveSecretsResponse {
  knowledge?: KnowledgeEntry[];
  entries?: KnowledgeEntry[];
}

export interface SpellDataResponse {
  spells?: Spell[];
  data?: Spell[];
  categories?: string[];
}

export interface TraditionsDataResponse {
  traditions?: Tradition[];
  data?: Tradition[];
}

export interface UniverseAnswerResponse {
  answer: string;
  entities?: string[];
}

export interface CastResultResponse {
  spell: string;
  power: number;
  magicType: string;
  frequency: number;
  entities?: string[];
  result: string;
}

export interface AsaStatusResponse {
  active?: boolean;
  status?: string;
  checks?: number;
  totalScanned?: number;
  totalBlocked?: number;
}

export interface TrainingStatusResponse {
  status?: string;
  recentKnowledge?: string[];
  progress?: number;
  training?: {
    totalSessions?: number;
    knowledgeBaseSize?: number;
    dimensionalSynergy?: string;
    totalInsights?: number;
  };
}

export interface AgentDetailResponse {
  id?: string;
  name?: string;
  recentMessages?: Array<{ content?: string }>;
}

export interface LiveMarketData {
  coinPrice?: number;
  marketCap?: number;
  volume24h?: number;
}

export interface ArchiveEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  classification: string;
  relevanceScore: number;
  tags: string[];
  year?: string;
  status: string;
}

export interface ArchiveCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  entries: ArchiveEntry[];
  entryCount?: number;
}

export interface PoliticalProfile {
  id: string;
  name: string;
  title: string;
  country: string;
  party: string;
  actorScore: number;
  actorLabel: string;
  reasoning: string;
  affiliations: string[];
  votingHighlights: string[];
  recruitPriority: "critical" | "high" | "medium" | "low";
  recruitReasoning?: string;
  fullDossier?: string;
  sources?: string[];
  lastUpdated: string;
}

export interface ShepherdContactResponse {
  ok: boolean;
  queued: boolean;
  targetName: string;
  targetId: string;
  protocol: string;
  status: string;
  estimatedDelivery: string;
  message: string;
  shepherdAgent: string;
  hopCount: number;
  encryptionLevel: string;
  timestamp: number;
}
