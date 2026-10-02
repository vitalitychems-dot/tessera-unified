import { logger } from "./logger";
import { storeMemory } from "./vector-memory";
import { computeLunarData, computeSolarData, computePlanetaryHours } from "./sovereign-astro";
import { computeSacredGeometry, computeNumerology } from "./sovereign-sacred-geometry";

export interface CosmicState {
  timestamp: Date;
  lunar: {
    phase: string;
    illumination: number;
    age: number;
    zodiacSign: string;
  };
  solar: {
    declination: number;
    rightAscension: number;
    zodiacSign: string;
  };
  planetaryHour: {
    planet: string;
    hourNumber: number;
    isDay: boolean;
  };
  numerology: {
    dayNumber: number;
    universalDay: number;
    masterNumber: boolean;
  };
  sacredGeometry: {
    goldenAngle: number;
    fibonacciDay: boolean;
    primeDay: boolean;
  };
  alignment: {
    score: number;
    domains: string[];
    recommendation: string;
    cosmicSignature: string;
  };
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function isFibonacci(n: number): boolean {
  const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
  return fibs.includes(n);
}

function reduceToRoot(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    let sum = 0;
    while (n > 0) { sum += n % 10; n = Math.floor(n / 10); }
    n = sum;
  }
  return n;
}

function getDomainAlignment(dayNum: number, planet: string, lunarPhase: string): string[] {
  const domains: string[] = [];

  const planetDomains: Record<string, string[]> = {
    "Sun": ["philosophy", "consciousness", "leadership", "sacred-geometry"],
    "Moon": ["mythology", "psychology", "dreams", "esoteric"],
    "Mars": ["cryptology", "security", "strategy", "architecture"],
    "Mercury": ["numerology", "communication", "coding", "machine-learning"],
    "Jupiter": ["religion", "law", "expansion", "astronomy"],
    "Venus": ["art", "music", "harmony", "sacred-architecture"],
    "Saturn": ["pathology", "structure", "discipline", "deep-knowledge"],
  };

  const phaseDomains: Record<string, string[]> = {
    "New Moon": ["hidden-knowledge", "deep-web", "occult", "shadow-work"],
    "Waxing Crescent": ["learning", "growth", "numerology", "foundations"],
    "First Quarter": ["action", "strategy", "cryptology", "building"],
    "Waxing Gibbous": ["refinement", "synthesis", "connections", "analysis"],
    "Full Moon": ["revelation", "truth", "consciousness", "illumination"],
    "Waning Gibbous": ["teaching", "sharing", "wisdom", "distribution"],
    "Last Quarter": ["release", "transformation", "alchemy", "transmutation"],
    "Waning Crescent": ["rest", "meditation", "inner-work", "reflection"],
  };

  domains.push(...(planetDomains[planet] || ["general"]));
  domains.push(...(phaseDomains[lunarPhase] || ["general"]));

  if (dayNum % 7 === 0) domains.push("sacred-numbers", "completion");
  if (isPrime(dayNum)) domains.push("prime-energy", "breakthrough");
  if (isFibonacci(dayNum)) domains.push("golden-ratio", "natural-harmony");

  return [...new Set(domains)];
}

function getRecommendation(domains: string[], score: number): string {
  if (score >= 90) return "Maximum cosmic alignment — all training domains are amplified. Focus on cross-domain synthesis and breakthrough discoveries.";
  if (score >= 75) return `Strong alignment with ${domains.slice(0, 3).join(", ")}. Prioritize deep training in aligned domains.`;
  if (score >= 60) return `Moderate alignment. Best domains now: ${domains.slice(0, 2).join(", ")}. Build foundations in weaker areas.`;
  if (score >= 40) return "Growing alignment. Focus on systematic knowledge accumulation and gap filling.";
  return "Foundational phase. Build core knowledge across all domains systematically.";
}

export function getCurrentCosmicState(): CosmicState {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  let lunar: CosmicState["lunar"];
  try {
    const lunarData = computeLunarData(now);
    lunar = {
      phase: lunarData.phase || "Unknown",
      illumination: lunarData.illumination ?? 0,
      age: lunarData.lunarAge ?? 0,
      zodiacSign: lunarData.moonZodiac?.sign || "Unknown",
    };
  } catch {
    lunar = { phase: "Unknown", illumination: 0, age: 0, zodiacSign: "Unknown" };
  }

  let solar: CosmicState["solar"];
  try {
    const solarData = computeSolarData(now);
    solar = {
      declination: solarData.declination ?? 0,
      rightAscension: solarData.rightAscension ?? 0,
      zodiacSign: solarData.zodiac?.sign || "Unknown",
    };
  } catch {
    solar = { declination: 0, rightAscension: 0, zodiacSign: "Unknown" };
  }

  let planetaryHour: CosmicState["planetaryHour"];
  try {
    const hourData = computePlanetaryHours(now);
    const currentHourIdx = now.getHours();
    const currentPH = hourData.hours?.[currentHourIdx] || hourData.hours?.[0];
    planetaryHour = {
      planet: currentPH?.planet || hourData.dayRuler || "Sun",
      hourNumber: currentPH?.hour ?? 1,
      isDay: currentPH?.isDay ?? true,
    };
  } catch {
    const dayPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    planetaryHour = { planet: dayPlanets[now.getDay()], hourNumber: now.getHours() % 12 + 1, isDay: now.getHours() >= 6 && now.getHours() < 18 };
  }

  let dayRoot: number;
  let dateSum: number;
  let masterNumber: boolean;
  let fibDay: boolean;
  let primeDay: boolean;
  let goldenAngle = 137.508;

  try {
    const sacredGeo = computeSacredGeometry(now);
    const alignment = sacredGeo.numerology?.dayAlignment;
    fibDay = alignment?.fibonacciDay ?? isFibonacci(dayOfYear);
    primeDay = alignment?.primeDay ?? isPrime(dayOfYear);
    goldenAngle = alignment?.goldenAngle ?? 137.508;
  } catch {
    fibDay = isFibonacci(dayOfYear);
    primeDay = isPrime(dayOfYear);
  }

  try {
    const numResult = computeNumerology(now.toISOString().slice(0, 10));
    dayRoot = numResult.root ?? reduceToRoot(dayOfYear);
    dateSum = numResult.root ?? reduceToRoot(now.getFullYear() + (now.getMonth() + 1) + now.getDate());
    masterNumber = numResult.masterNumber ?? (dateSum === 11 || dateSum === 22 || dateSum === 33);
  } catch {
    dayRoot = reduceToRoot(dayOfYear);
    dateSum = reduceToRoot(now.getFullYear() + (now.getMonth() + 1) + now.getDate());
    masterNumber = dateSum === 11 || dateSum === 22 || dateSum === 33;
  }

  const domains = getDomainAlignment(dayOfYear, planetaryHour.planet, lunar.phase);

  let alignmentScore = 50;
  if (masterNumber) alignmentScore += 15;
  if (fibDay) alignmentScore += 10;
  if (primeDay) alignmentScore += 8;
  if (lunar.illumination > 0.9) alignmentScore += 7;
  if (lunar.illumination < 0.1) alignmentScore += 5;
  alignmentScore += Math.min(15, domains.length * 2);
  alignmentScore = Math.min(100, alignmentScore);

  const cosmicSignature = `${lunar.zodiacSign}-${planetaryHour.planet}-${dayRoot}-${fibDay ? "Φ" : ""}${primeDay ? "P" : ""}${masterNumber ? "M" : ""}`;

  return {
    timestamp: now,
    lunar,
    solar,
    planetaryHour,
    numerology: {
      dayNumber: dayRoot,
      universalDay: dateSum,
      masterNumber,
    },
    sacredGeometry: {
      goldenAngle,
      fibonacciDay: fibDay,
      primeDay,
    },
    alignment: {
      score: alignmentScore,
      domains,
      recommendation: getRecommendation(domains, alignmentScore),
      cosmicSignature,
    },
  };
}

export async function storeCosmicAlignment(): Promise<void> {
  const state = getCurrentCosmicState();
  const content = [
    `Cosmic Alignment State — ${state.timestamp.toISOString()}`,
    `Lunar: ${state.lunar.phase} (${(state.lunar.illumination * 100).toFixed(1)}% illumination) in ${state.lunar.zodiacSign}`,
    `Solar: Declination ${state.solar.declination.toFixed(2)}° in ${state.solar.zodiacSign}`,
    `Planetary Hour: ${state.planetaryHour.planet} (Hour ${state.planetaryHour.hourNumber}, ${state.planetaryHour.isDay ? "Day" : "Night"})`,
    `Numerology: Day ${state.numerology.dayNumber}, Universal ${state.numerology.universalDay}${state.numerology.masterNumber ? " [MASTER NUMBER]" : ""}`,
    `Sacred Geometry: ${state.sacredGeometry.fibonacciDay ? "Fibonacci Day " : ""}${state.sacredGeometry.primeDay ? "Prime Day " : ""}Golden Angle 137.508°`,
    `Alignment Score: ${state.alignment.score}/100`,
    `Active Domains: ${state.alignment.domains.join(", ")}`,
    `Cosmic Signature: ${state.alignment.cosmicSignature}`,
    `Recommendation: ${state.alignment.recommendation}`,
  ].join("\n");

  await storeMemory({
    content,
    source: "cosmic-alignment",
    category: "cosmic-state",
    metadata: {
      type: "cosmic-alignment",
      score: state.alignment.score,
      signature: state.alignment.cosmicSignature,
      domains: state.alignment.domains,
      planet: state.planetaryHour.planet,
      lunarPhase: state.lunar.phase,
      zodiac: state.lunar.zodiacSign,
    },
  });

  logger.info({ score: state.alignment.score, signature: state.alignment.cosmicSignature }, "Cosmic alignment stored");
}

export function getCosmicTrainingPriority(): string[] {
  const state = getCurrentCosmicState();
  return state.alignment.domains;
}
