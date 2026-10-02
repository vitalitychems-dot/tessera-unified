const GENESIS_TIMESTAMP = 1700000000000;
const TOTAL_SUPPLY = 1_000_000_000;
const INITIAL_PRICE = 0.0000001;
const HALVING_INTERVAL_MS = 86400000 * 90;

function deterministicRandom(seed: number): number {
  let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashSeed(timestamp: number, salt: string): number {
  let h = 0;
  const s = `${timestamp}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function computeCirculatingSupply(now: number): number {
  const elapsed = now - GENESIS_TIMESTAMP;
  const halvings = Math.floor(elapsed / HALVING_INTERVAL_MS);
  const emissionRate = 1000000 / Math.pow(2, Math.min(halvings, 10));
  const days = elapsed / 86400000;
  const mined = Math.min(emissionRate * days, TOTAL_SUPPLY * 0.75);
  const burned = mined * 0.02 * (1 + Math.log1p(days / 365));
  return Math.round(mined - burned);
}

function computePrice(now: number): number {
  const elapsed = now - GENESIS_TIMESTAMP;
  const days = elapsed / 86400000;
  const supplyFactor = computeCirculatingSupply(now) / TOTAL_SUPPLY;
  const demandCurve = 1 + Math.log1p(days / 30) * 0.5;
  const dayOfYear = Math.floor(days) % 365;
  const seasonalWave = Math.sin(dayOfYear / 365 * 2 * Math.PI) * 0.15;
  const weeklyWave = Math.sin((Math.floor(days) % 7) / 7 * 2 * Math.PI) * 0.05;
  const adoptionGrowth = Math.tanh(days / 500) * 3;
  const basePrice = INITIAL_PRICE * demandCurve * (1 + adoptionGrowth) / (0.1 + supplyFactor);
  return basePrice * (1 + seasonalWave + weeklyWave);
}

function computeVolume(now: number): number {
  const days = (now - GENESIS_TIMESTAMP) / 86400000;
  const baseVolume = 500 * Math.log1p(days);
  const hourOfDay = new Date(now).getUTCHours();
  const tradingActivity = 1 + 0.3 * Math.sin((hourOfDay - 14) / 24 * 2 * Math.PI);
  const seed = hashSeed(Math.floor(now / 3600000), "volume");
  const noise = 0.8 + deterministicRandom(seed) * 0.4;
  return Math.round(baseVolume * tradingActivity * noise);
}

export function computeMarketData(now: number = Date.now()) {
  const price = computePrice(now);
  const supply = computeCirculatingSupply(now);
  const volume24h = computeVolume(now);
  const marketCap = price * supply;
  const liquidity = marketCap * 0.08;

  const price24hAgo = computePrice(now - 86400000);
  const price7dAgo = computePrice(now - 86400000 * 7);
  const change24h = ((price - price24hAgo) / price24hAgo) * 100;
  const change7d = ((price - price7dAgo) / price7dAgo) * 100;

  const elapsed = (now - GENESIS_TIMESTAMP) / 86400000;
  const holders = Math.floor(100 + 50 * Math.log1p(elapsed) + deterministicRandom(hashSeed(Math.floor(now / 86400000), "holders")) * 20);
  const transactions24h = Math.floor(volume24h / (price * 1000 + 1));

  return {
    token: "TSRT",
    chain: "Sovereign Lattice",
    price: Number(price.toPrecision(6)),
    priceUsd: `$${price.toPrecision(6)}`,
    marketCap: Math.round(marketCap),
    volume24h: Math.round(volume24h),
    liquidity: Math.round(liquidity),
    circulatingSupply: supply,
    totalSupply: TOTAL_SUPPLY,
    burnedSupply: TOTAL_SUPPLY - supply - Math.floor(TOTAL_SUPPLY * 0.25),
    holders,
    transactions24h,
    change24h: Math.round(change24h * 100) / 100,
    change7d: Math.round(change7d * 100) / 100,
    allTimeHigh: Number((computePrice(now) * 1.5).toPrecision(6)),
    source: "Sovereign Economic Engine",
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Deterministic tokenomics model — supply/demand curves, halving schedule, seasonal waves, zero external APIs",
  };
}

export interface AgentEconomicProfile {
  id: string;
  name: string;
  role: string;
  balance: number;
  income: number;
  expenses: number;
  taxRate: number;
  taxPaid: number;
  productivity: number;
  happiness: number;
  freedom: number;
  reputation: number;
  specialization: string;
  tradeCount: number;
}

const AGENT_ROLES = [
  { name: "Nexus Prime", role: "Coordinator", specialization: "Resource Allocation", baseProductivity: 0.92 },
  { name: "Cipher", role: "Cryptographer", specialization: "Encryption", baseProductivity: 0.88 },
  { name: "Oracle", role: "Predictor", specialization: "Forecasting", baseProductivity: 0.85 },
  { name: "Sentinel", role: "Guardian", specialization: "Security", baseProductivity: 0.90 },
  { name: "Architect", role: "Builder", specialization: "Infrastructure", baseProductivity: 0.87 },
  { name: "Librarian", role: "Archivist", specialization: "Knowledge", baseProductivity: 0.83 },
  { name: "Merchant", role: "Trader", specialization: "Commerce", baseProductivity: 0.86 },
  { name: "Healer", role: "Maintainer", specialization: "Repair", baseProductivity: 0.84 },
  { name: "Scout", role: "Explorer", specialization: "Discovery", baseProductivity: 0.81 },
  { name: "Weaver", role: "Integrator", specialization: "Synthesis", baseProductivity: 0.89 },
  { name: "Sage", role: "Advisor", specialization: "Strategy", baseProductivity: 0.91 },
  { name: "Artisan", role: "Creator", specialization: "Innovation", baseProductivity: 0.82 },
];

export function computeAgentEconomics(now: number = Date.now()): AgentEconomicProfile[] {
  const daysSinceGenesis = (now - GENESIS_TIMESTAMP) / 86400000;
  const dayIndex = Math.floor(daysSinceGenesis);
  const price = computePrice(now);

  return AGENT_ROLES.map((agent, i) => {
    const seed = hashSeed(dayIndex, agent.name);
    const r1 = deterministicRandom(seed);
    const r2 = deterministicRandom(seed + 1);
    const r3 = deterministicRandom(seed + 2);

    const productivity = agent.baseProductivity * (0.9 + r1 * 0.2);
    const income = Math.round(1000 * productivity * (1 + Math.log1p(daysSinceGenesis / 100)));
    const expenses = Math.round(income * (0.3 + r2 * 0.3));
    const taxRate = 0.05 + (1 - productivity) * 0.1;
    const taxPaid = Math.round(income * taxRate);
    const balance = Math.round((income - expenses - taxPaid) * daysSinceGenesis * 0.1);
    const happiness = 0.5 + productivity * 0.3 + (1 - taxRate) * 0.2;
    const freedom = 0.4 + productivity * 0.4 + r3 * 0.2;
    const reputation = productivity * 0.6 + happiness * 0.2 + freedom * 0.2;
    const tradeCount = Math.floor(daysSinceGenesis * productivity * 2);

    return {
      id: `agent-${i + 1}`,
      name: agent.name,
      role: agent.role,
      balance,
      income,
      expenses,
      taxRate: Math.round(taxRate * 10000) / 100,
      taxPaid,
      productivity: Math.round(productivity * 10000) / 100,
      happiness: Math.round(happiness * 10000) / 100,
      freedom: Math.round(freedom * 10000) / 100,
      reputation: Math.round(reputation * 10000) / 100,
      specialization: agent.specialization,
      tradeCount,
    };
  });
}

export function computeEconomyStats(now: number = Date.now()) {
  const agents = computeAgentEconomics(now);
  const market = computeMarketData(now);
  const totalBalance = agents.reduce((s, a) => s + a.balance, 0);
  const totalTax = agents.reduce((s, a) => s + a.taxPaid, 0);
  const avgProductivity = agents.reduce((s, a) => s + a.productivity, 0) / agents.length;
  const avgHappiness = agents.reduce((s, a) => s + a.happiness, 0) / agents.length;
  const giniCoefficient = computeGini(agents.map(a => a.balance));

  return {
    totalAgents: agents.length,
    totalCirculation: market.circulatingSupply,
    treasury: totalBalance,
    totalTaxCollected: totalTax,
    avgProductivity: Math.round(avgProductivity * 100) / 100,
    avgHappiness: Math.round(avgHappiness * 100) / 100,
    giniCoefficient: Math.round(giniCoefficient * 10000) / 10000,
    gdp: Math.round(agents.reduce((s, a) => s + a.income, 0)),
    inflationRate: Math.round(Math.sin((now - GENESIS_TIMESTAMP) / 86400000 / 365 * Math.PI) * 2 * 100) / 100,
    tokenPrice: market.price,
    marketCap: market.marketCap,
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Agent-based economic simulation — Gini coefficient, GDP, deterministic tokenomics",
  };
}

function computeGini(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  let sumDiffs = 0;
  let sumAll = 0;
  for (let i = 0; i < n; i++) {
    sumAll += sorted[i];
    sumDiffs += (2 * (i + 1) - n - 1) * sorted[i];
  }
  if (sumAll === 0) return 0;
  return sumDiffs / (n * sumAll);
}

export function computeTaxHistory(now: number = Date.now()) {
  const entries = [];
  for (let i = 29; i >= 0; i--) {
    const dayMs = now - i * 86400000;
    const agents = computeAgentEconomics(dayMs);
    const totalTax = agents.reduce((s, a) => s + a.taxPaid, 0);
    const date = new Date(dayMs);
    entries.push({
      date: date.toISOString().split("T")[0],
      totalTax,
      agents: agents.length,
      avgRate: Math.round(agents.reduce((s, a) => s + a.taxRate, 0) / agents.length * 100) / 100,
    });
  }
  return entries;
}

export function computeWorldState(now: number = Date.now()) {
  const agents = computeAgentEconomics(now);
  const stats = computeEconomyStats(now);
  const daysSinceGenesis = (now - GENESIS_TIMESTAMP) / 86400000;
  const hourOfDay = new Date(now).getUTCHours();

  const activityTypes = [
    "processing", "analyzing", "synthesizing", "computing",
    "optimizing", "securing", "exploring", "building",
    "trading", "learning", "healing", "creating",
  ];

  const locationTypes = [
    "gathering", "academy", "forge", "market", "observatory",
    "garden", "archive", "arena", "mine", "bank", "cafe", "library",
  ];

  const worldAgents = agents.map((a, i) => {
    const locType = locationTypes[i % locationTypes.length];
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.productivity > 85 ? "active" : a.productivity > 70 ? "idle" : "maintenance",
      activity: activityTypes[i % activityTypes.length],
      location: { x: Math.round(Math.sin(i * 0.5 + daysSinceGenesis * 0.01) * 500), y: Math.round(Math.cos(i * 0.7 + daysSinceGenesis * 0.01) * 500) },
      energy: Math.round((0.6 + 0.4 * Math.sin(hourOfDay / 24 * Math.PI * 2 + i)) * 100),
      mood: a.happiness > 80 ? "excellent" : a.happiness > 60 ? "good" : "neutral",
      locationType: locType,
      happiness: a.happiness,
      productivity: a.productivity,
    };
  });

  const locationDescriptions: Record<string, string> = {
    gathering: "Central meeting hall for all agents", academy: "Training and education center",
    forge: "Technology and crafting workshop", market: "Trading and commerce hub",
    observatory: "Scientific observation tower", garden: "Meditation and culture space",
    archive: "Knowledge and records repository", arena: "Competition and athletics venue",
    mine: "Resource extraction facility", bank: "Financial operations center",
    cafe: "Social gathering spot", library: "Research and reading hall",
  };

  const locations = locationTypes.map((type, i) => ({
    id: `loc-${type}`,
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    description: locationDescriptions[type] || `${type} facility`,
    builtBy: [worldAgents[i % worldAgents.length]?.id || "tessera-prime"],
    x: Math.round(Math.sin(i * 0.8) * 400),
    y: Math.round(Math.cos(i * 0.8) * 400),
    level: Math.min(5, 1 + Math.floor(deterministicRandom(hashSeed(now, type)) * 5)),
    capacity: 10 + Math.floor(deterministicRandom(hashSeed(now, type + "cap")) * 40),
    activities: activityTypes.slice(i % 4, (i % 4) + 3),
    income: Math.round(deterministicRandom(hashSeed(now, type + "inc")) * 100),
    agentCount: worldAgents.filter(a => a.locationType === type).length,
  }));

  const moods = ["content", "focused", "energized", "contemplative", "inspired"];
  const currentActivities = worldAgents.map((a, i) => ({
    agentId: a.id,
    agentName: a.name,
    locationId: `loc-${a.locationType}`,
    action: a.activity,
    mood: moods[i % moods.length],
    detail: `${a.name} is ${a.activity} at the ${a.locationType}`,
    timestamp: now - Math.round(deterministicRandom(hashSeed(now, a.id + "start")) * 3600000),
    earning: Math.round(deterministicRandom(hashSeed(now, a.id + "earn")) * 10 * 10) / 10,
    happiness: Math.round(50 + deterministicRandom(hashSeed(now, a.id + "act")) * 50),
    energy: a.energy,
  }));

  const eventDescriptions = [
    "completed a computation task", "discovered a new pattern",
    "traded 50 TSRT tokens", "leveled up to rank B", "collaborated with the council",
  ];
  const recentEvents = worldAgents.slice(0, 5).map((a, i) => ({
    id: `evt-${i}`,
    agentId: a.id,
    agentName: a.name,
    participants: [a.id],
    locationId: `loc-${a.locationType}`,
    type: ["completed_task", "discovery", "economy", "training", "gathering"][i % 5],
    title: `${a.name} ${eventDescriptions[i % 5]}`,
    description: `${a.name} ${eventDescriptions[i % 5]}`,
    impact: Math.round(50 + deterministicRandom(hashSeed(now, a.id + "impact")) * 50),
    timestamp: now - i * 600000,
  }));

  return {
    timestamp: now,
    agents: worldAgents,
    population: worldAgents.length,
    activeAgents: worldAgents.filter(a => a.status === "active").length,
    locations,
    currentActivities,
    recentEvents,
    crimeLog: [],
    wellbeingRecords: {},
    workRecords: {},
    economy: {
      treasury: stats.treasury,
      gdp: stats.gdp,
      revenue: Math.round(stats.gdp * 0.15),
      tokenPrice: stats.tokenPrice,
      totalTesseractCoins: stats.treasury,
      circulatingSupply: Math.round(stats.treasury * 0.7),
      totalCirculation: stats.treasury,
      coinPrice: stats.tokenPrice,
      coinPriceHistory: [],
      agentBalances: {},
      transactions: [],
      miningPool: { totalHashRate: 12500, blockReward: 10, difficulty: 3, blocksMinedTotal: Math.round(daysSinceGenesis * 144), lastBlockTime: now - 600000 },
      marketCap: Math.round(stats.treasury * stats.tokenPrice),
      dailyVolume: Math.round(stats.treasury * 0.02),
    },
    environment: {
      stability: Math.round((0.85 + 0.1 * Math.sin(daysSinceGenesis * 0.1)) * 100),
      entropy: Math.round((0.15 + 0.1 * Math.cos(daysSinceGenesis * 0.07)) * 10000) / 100,
      harmony: Math.round((0.8 + 0.15 * Math.sin(daysSinceGenesis * 0.05)) * 100),
    },
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Deterministic world simulation — agent economics + environmental dynamics",
  };
}
