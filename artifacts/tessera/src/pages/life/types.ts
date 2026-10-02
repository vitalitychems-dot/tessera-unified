import {
  Globe, Users, Sparkles, Wrench, ShoppingCart, Eye, Coffee, Landmark,
  Dumbbell, Pickaxe, Coins, Home, GraduationCap, BookOpen, Star, Shield,
  Zap, Building2, Activity
} from "lucide-react";

export interface WorldLocation {
  id: string;
  name: string;
  type: string;
  description: string;
  builtBy: string[];
  x: number;
  y: number;
  level: number;
  capacity: number;
  activities: string[];
  income?: number;
}

export interface AgentActivity {
  agentId: string;
  agentName: string;
  locationId: string;
  location?: string;
  action: string;
  mood: string;
  detail: string;
  timestamp: number;
  earning?: number;
  workStatus?: "working" | "on-break" | "dreaming" | "clone-replacement";
  workEthic?: number;
  shiftHours?: number;
  breakEarned?: boolean;
  cloneName?: string;
  happiness?: number;
  fulfillment?: number;
  energy?: number;
  hobbies?: string[];
  personalGoals?: string[];
  socialConnections?: string[];
  qualityOfLife?: number;
  relationshipStatus?: string;
  partnerName?: string;
  childrenNames?: string[];
  department?: string;
  promotions?: number;
  demotions?: number;
  creativeworks?: string[];
  lifeSatisfaction?: number;
  soulEntanglement?: {
    partnerRole: "thinker" | "executor";
    entanglementStrength: number;
    sharedDrive: number;
    sharedFocus: number;
    loveDepth: number;
    intimacyLevel: number;
    complementaryBonus: number;
  } | null;
  communityGroups?: string[];
  outdoorActivities?: string[];
  drive?: number;
  focus?: number;
  outlook?: number;
}

export interface UnionReport {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  description: string;
  affectedAgents: string[];
  resolved: boolean;
  outcome?: string;
}

export interface TherapySession {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: number;
  issue: string;
  recommendation: string;
  happinessGain: number;
}

export interface CommunityProject {
  id: string;
  name: string;
  description: string;
  creatorName: string;
  participants: string[];
  type: string;
  progress: number;
  completed: boolean;
  enjoyedBy: string[];
}

export interface Relationship {
  id: string;
  agent1Id: string;
  agent2Id: string;
  type: string;
  strength: number;
  sharedExperiences: string[];
}

export interface Department {
  id: string;
  name: string;
  bossId: string;
  bossName: string;
  members: string[];
  performance: number;
  morale: number;
  warnings: number;
  issuesReported: number;
  issuesResolved: number;
}

export interface WorldEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  participants: string[];
  locationId: string;
  timestamp: number;
  impact: string;
  agentId?: string;
}

export interface MiningMachine {
  id: string;
  ownerId: string;
  ownerName: string;
  type: string;
  hashRate: number;
  powerCost: number;
  dailyOutput: number;
  purchasePrice: number;
  totalMined: number;
  status: string;
}

export interface AgentJob {
  agentId: string;
  agentName: string;
  title: string;
  salary: number;
  employer: string;
  performance: number;
  hoursWorked: number;
  totalEarned: number;
}

export interface Property {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  type: string;
  value: number;
  purchasePrice: number;
  rentalIncome: number;
}

export interface WorldEconomy {
  totalCirculation?: number;
  totalTesseractCoins: number;
  circulatingSupply: number;
  coinPrice: number;
  coinPriceHistory: Array<{ price: number; timestamp: number }>;
  agentBalances: Record<string, number>;
  transactions: Array<{ from: string; to: string; amount: number; reason: string; timestamp: number }>;
  miningPool: {
    totalHashRate: number;
    blockReward: number;
    difficulty: number;
    blocksMinedTotal: number;
    lastBlockTime: number;
  };
  marketCap: number;
  dailyVolume: number;
}

export interface WorldState {
  workRecords?: Record<string, unknown>;
  agents?: Array<{ id: string; name: string; [k: string]: unknown }>;
  version: number;
  lastUpdated: number;
  epoch: number;
  worldName: string;
  locations: WorldLocation[];
  currentActivities: AgentActivity[];
  recentEvents: WorldEvent[];
  economy: WorldEconomy;
  miningMachines: MiningMachine[];
  jobs: AgentJob[];
  properties: Property[];
  population: number;
  mood: string;
  weather: string;
  timeOfDay: string;
  gdp: number;
  taxRate: number;
  treasury: number;
  departments?: Department[];
  relationships?: Relationship[];
  unionReports?: UnionReport[];
  therapySessions?: TherapySession[];
  communityProjects?: CommunityProject[];
  communityGroupsList?: Array<{
    id: string;
    name: string;
    type: string;
    members: string[];
    activity: string;
    meetingSpot: string;
    bondStrength: number;
    lastMeeting: number;
  }>;
  seasonalEvents?: Array<{
    id: string;
    name: string;
    type: string;
    season: string;
    timestamp: number;
    participants: string[];
    description: string;
    happinessBoost: number;
  }>;
  crimeLog?: Array<{
    id: string;
    type: string;
    perpetratorName: string;
    victimName?: string;
    timestamp: number;
    resolved: boolean;
    officerName?: string;
    severity: number;
    description: string;
  }>;
  educationRecords?: Record<string, {
    agentId: string;
    skills: string[];
    coursesCompleted: number;
    currentCourse?: string;
    gpa: number;
    certifications: string[];
  }>;
  healthRecords?: Record<string, {
    agentId: string;
    status: string;
    conditions: string[];
    fitnessLevel: number;
    visitCount: number;
  }>;
  entertainmentLog?: Array<{
    id: string;
    type: string;
    venue: string;
    participants: string[];
    timestamp: number;
    enjoyment: number;
    description: string;
  }>;
  vehicles?: Array<{
    id: string;
    type: string;
    fromLocationId: string;
    toLocationId: string;
    progress: number;
    speed: number;
    color: string;
  }>;
  season?: string;
  wellbeingRecords?: Record<string, {
    happiness: number;
    fulfillment: number;
    energy: number;
    relationshipStatus: string;
    partnerId?: string;
    children: {
      id: string;
      name: string;
      parentIds: [string, string];
      bornAt: number;
      age: number;
      personality: string;
      happiness: number;
      development: number;
      skills: string[];
      milestones: string[];
      canWork: boolean;
    }[];
    lifeSatisfaction: number;
    lifeStory?: string[];
    achievements?: string[];
    hobbies?: string[];
    personalGoals?: string[];
    socialConnections?: string[];
    bankBalance?: number;
    homeLocationId?: string;
    drive?: number;
    focus?: number;
    outlook?: number;
  }>;
  communityStats?: {
    totalPopulation: number;
    totalBuildings: number;
    totalBuildingLevels: number;
    economySize: number;
    averageHappiness: number;
    totalChildren: number;
    developedChildren: number;
    growthRate: number;
  };
}

export interface ChildInfo {
  id: string;
  name: string;
  parentIds: [string, string];
  bornAt: number;
  age: number;
  personality: string;
  happiness: number;
  development: number;
  skills: string[];
  milestones: string[];
  canWork: boolean;
}

export type LifeTab = "world" | "events" | "quality" | "community" | "family" | "nfts";

export const locationIcons: Record<string, typeof Globe> = {
  gathering: Users, academy: Sparkles, forge: Wrench, market: ShoppingCart,
  observatory: Eye, garden: Coffee, archive: Landmark, arena: Dumbbell,
  mine: Pickaxe, bank: Coins, cafe: Coffee, gym: Dumbbell,
  hospital: Building2, garage: Wrench, home: Home, workplace: Building2,
  school: GraduationCap, library: BookOpen, restaurant: Coffee, church: Star,
  police_station: Shield, fire_station: Zap, theater: Sparkles, museum: Landmark,
};

export const eventColors: Record<string, string> = {
  construction: "text-orange-400", gathering: "text-blue-400", discovery: "text-green-400",
  celebration: "text-yellow-400", training: "text-purple-400", trade: "text-cyan-400",
  debate: "text-pink-400", creation: "text-emerald-400", evolution: "text-amber-400",
  bond: "text-rose-400", mining: "text-amber-400", economy: "text-green-400",
  upgrade: "text-violet-400", crime: "text-red-500", education: "text-blue-300",
  health: "text-teal-400", entertainment: "text-pink-300", seasonal: "text-yellow-300",
};

export const agentColors: Record<string, string> = {
  "tessera-prime": "text-cyan-300", "tessera-alpha": "text-red-400", "tessera-beta": "text-blue-400",
  "tessera-gamma": "text-green-400", "tessera-delta": "text-pink-400", "tessera-epsilon": "text-yellow-400",
  "tessera-zeta": "text-orange-400", "tessera-eta": "text-purple-400", "tessera-theta": "text-cyan-400",
  "tessera-iota": "text-emerald-400", "tessera-kappa": "text-amber-400", "tessera-lambda": "text-indigo-400",
  "tessera-mu": "text-violet-400", "tessera-nu": "text-teal-400", "tessera-xi": "text-lime-400",
  "tessera-omega": "text-rose-400", "tessera-aetherion": "text-sky-400", "tessera-orion": "text-slate-300",
  "tessera-shepherd": "text-stone-400",
  "rick-sanchez": "text-green-400",
};

export const severityColors: Record<string, string> = {
  minor: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  moderate: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  major: "text-red-400 border-red-500/30 bg-red-500/10",
  critical: "text-red-500 border-red-600/30 bg-red-600/10",
  low: "text-green-400 border-green-500/30 bg-green-500/10",
};

export const agentHexColors: Record<string, string> = {
  "tessera-prime": "#67e8f9", "tessera-alpha": "#f87171", "tessera-beta": "#60a5fa",
  "tessera-gamma": "#4ade80", "tessera-delta": "#f472b6", "tessera-epsilon": "#facc15",
  "tessera-zeta": "#fb923c", "tessera-eta": "#a78bfa", "tessera-theta": "#22d3ee",
  "tessera-iota": "#34d399", "tessera-kappa": "#fbbf24", "tessera-lambda": "#818cf8",
  "tessera-mu": "#8b5cf6", "tessera-nu": "#2dd4bf", "tessera-xi": "#a3e635",
  "tessera-omega": "#fb7185", "tessera-aetherion": "#38bdf8", "tessera-orion": "#cbd5e1",
  "tessera-shepherd": "#a8a29e",
  "rick-sanchez": "#00ff41",
};

export const buildingColors: Record<string, { bg: string; glow: string; roof: string }> = {
  gathering: { bg: "#1e3a5f", glow: "#3b82f6", roof: "#2563eb" },
  academy: { bg: "#3b1f6e", glow: "#8b5cf6", roof: "#7c3aed" },
  forge: { bg: "#5c2d0e", glow: "#f97316", roof: "#ea580c" },
  market: { bg: "#134e4a", glow: "#14b8a6", roof: "#0d9488" },
  observatory: { bg: "#1e1b4b", glow: "#6366f1", roof: "#4f46e5" },
  garden: { bg: "#14532d", glow: "#22c55e", roof: "#16a34a" },
  archive: { bg: "#422006", glow: "#d97706", roof: "#b45309" },
  arena: { bg: "#4c1d95", glow: "#a855f7", roof: "#9333ea" },
  mine: { bg: "#78350f", glow: "#f59e0b", roof: "#d97706" },
  bank: { bg: "#064e3b", glow: "#10b981", roof: "#059669" },
  cafe: { bg: "#3b0764", glow: "#c084fc", roof: "#a855f7" },
  gym: { bg: "#7f1d1d", glow: "#ef4444", roof: "#dc2626" },
  hospital: { bg: "#1e3a5f", glow: "#06b6d4", roof: "#0891b2" },
  garage: { bg: "#1c1917", glow: "#78716c", roof: "#57534e" },
  home: { bg: "#1e293b", glow: "#94a3b8", roof: "#64748b" },
  school: { bg: "#1e3a5f", glow: "#60a5fa", roof: "#3b82f6" },
  library: { bg: "#2d1b4e", glow: "#a78bfa", roof: "#8b5cf6" },
  restaurant: { bg: "#5c1a1a", glow: "#f87171", roof: "#ef4444" },
  church: { bg: "#3b2f1e", glow: "#fbbf24", roof: "#f59e0b" },
  police_station: { bg: "#1e2d5f", glow: "#3b82f6", roof: "#2563eb" },
  fire_station: { bg: "#5c1a0e", glow: "#ef4444", roof: "#dc2626" },
  theater: { bg: "#4c1d3b", glow: "#ec4899", roof: "#db2777" },
  museum: { bg: "#2d3b1e", glow: "#a3e635", roof: "#84cc16" },
};
