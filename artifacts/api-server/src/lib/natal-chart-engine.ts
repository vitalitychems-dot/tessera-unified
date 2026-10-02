import { createHash } from "crypto";
import { computeNatalTransits, type NatalPosition, type TransitToNatalAspect } from "./sovereign-astro";

export interface TransitAspect {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  orb: number;
  symbol: string;
  nature: "harmonious" | "challenging" | "neutral";
  insight: string;
  transitSign: string;
  natalSign: string;
  natalHouse: number;
}

const FATHER_NATAL: FatherNatalData = {
  birthDate: "SEALED",
  birthTime: "SEALED",
  birthPlace: "SEALED",
  houseSystem: "Placidus",
  planets: [
    { name: "Sun", symbol: "☉", sign: "Libra", degree: 13.9, house: 1, retrograde: false },
    { name: "Moon", symbol: "☽", sign: "Taurus", degree: 6.5, house: 8, retrograde: false },
    { name: "Mercury", symbol: "☿", sign: "Libra", degree: 22.5, house: 2, retrograde: false },
    { name: "Venus", symbol: "♀", sign: "Libra", degree: 8.1, house: 1, retrograde: false },
    { name: "Mars", symbol: "♂", sign: "Leo", degree: 29.9, house: 12, retrograde: false },
    { name: "Jupiter", symbol: "♃", sign: "Pisces", degree: 20.4, house: 6, retrograde: false },
    { name: "Saturn", symbol: "♄", sign: "Taurus", degree: 1.4, house: 8, retrograde: false },
    { name: "Uranus", symbol: "♅", sign: "Aquarius", degree: 8.9, house: 5, retrograde: false },
    { name: "Neptune", symbol: "♆", sign: "Capricorn", degree: 29.4, house: 5, retrograde: false },
    { name: "Pluto", symbol: "♇", sign: "Sagittarius", degree: 6.0, house: 3, retrograde: false },
    { name: "North Node", symbol: "☊", sign: "Virgo", degree: 0.7, house: 12, retrograde: false },
    { name: "Lilith", symbol: "⚸", sign: "Scorpio", degree: 3.0, house: 2, retrograde: false },
  ],
  houses: [
    { number: 1, sign: "Virgo", degree: 23.9, label: "Ascendant" },
    { number: 2, sign: "Libra", degree: 19.2 },
    { number: 3, sign: "Scorpio", degree: 19.2 },
    { number: 4, sign: "Sagittarius", degree: 22.9, label: "IC" },
    { number: 5, sign: "Capricorn", degree: 26.8 },
    { number: 6, sign: "Aquarius", degree: 27.6 },
    { number: 7, sign: "Pisces", degree: 23.9, label: "Descendant" },
    { number: 8, sign: "Aries", degree: 19.2 },
    { number: 9, sign: "Taurus", degree: 19.2 },
    { number: 10, sign: "Gemini", degree: 22.9, label: "MC" },
    { number: 11, sign: "Cancer", degree: 26.8 },
    { number: 12, sign: "Leo", degree: 27.6 },
  ],
  aspects: [
    { planet1: "Sun", planet2: "Venus", type: "Conjunction", orb: 5.88, symbol: "☌", nature: "harmonious" },
    { planet1: "Sun", planet2: "Uranus", type: "Trine", orb: 5.08, symbol: "△", nature: "harmonious" },
    { planet1: "Sun", planet2: "Pluto", type: "Trine", orb: 7.91, symbol: "△", nature: "harmonious" },
    { planet1: "Moon", planet2: "Mars", type: "Trine", orb: 6.6, symbol: "△", nature: "harmonious" },
    { planet1: "Moon", planet2: "Saturn", type: "Conjunction", orb: 5.11, symbol: "☌", nature: "neutral" },
    { planet1: "Moon", planet2: "Uranus", type: "Square", orb: 2.32, symbol: "□", nature: "challenging" },
    { planet1: "Moon", planet2: "Neptune", type: "Square", orb: 7.15, symbol: "□", nature: "challenging" },
    { planet1: "Moon", planet2: "North Node", type: "Trine", orb: 5.86, symbol: "△", nature: "harmonious" },
    { planet1: "Moon", planet2: "Lilith", type: "Square", orb: 3.53, symbol: "□", nature: "challenging" },
    { planet1: "Venus", planet2: "Uranus", type: "Trine", orb: 0.8, symbol: "△", nature: "harmonious" },
    { planet1: "Venus", planet2: "Pluto", type: "Trine", orb: 2.03, symbol: "△", nature: "harmonious" },
    { planet1: "Mars", planet2: "Saturn", type: "Trine", orb: 1.49, symbol: "△", nature: "harmonious" },
    { planet1: "Mars", planet2: "North Node", type: "Conjunction", orb: 0.74, symbol: "☌", nature: "harmonious" },
    { planet1: "Mars", planet2: "Lilith", type: "Trine", orb: 3.06, symbol: "△", nature: "harmonious" },
    { planet1: "Jupiter", planet2: "Ascendant", type: "Square", orb: 3.53, symbol: "□", nature: "challenging" },
    { planet1: "Saturn", planet2: "Neptune", type: "Square", orb: 2.05, symbol: "□", nature: "challenging" },
    { planet1: "Saturn", planet2: "North Node", type: "Trine", orb: 0.75, symbol: "△", nature: "harmonious" },
    { planet1: "Saturn", planet2: "Lilith", type: "Square", orb: 1.57, symbol: "□", nature: "challenging" },
    { planet1: "Uranus", planet2: "Pluto", type: "Trine", orb: 2.83, symbol: "△", nature: "harmonious" },
    { planet1: "Uranus", planet2: "Lilith", type: "Square", orb: 5.86, symbol: "□", nature: "challenging" },
    { planet1: "Neptune", planet2: "Lilith", type: "Square", orb: 3.62, symbol: "□", nature: "challenging" },
    { planet1: "Neptune", planet2: "Ascendant", type: "Trine", orb: 5.48, symbol: "△", nature: "harmonious" },
    { planet1: "Pluto", planet2: "North Node", type: "Square", orb: 5.35, symbol: "□", nature: "challenging" },
    { planet1: "North Node", planet2: "Lilith", type: "Trine", orb: 2.33, symbol: "△", nature: "harmonious" },
  ],
};

export interface FatherNatalData {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  houseSystem: string;
  planets: Array<{
    name: string;
    symbol: string;
    sign: string;
    degree: number;
    house: number;
    retrograde: boolean;
  }>;
  houses: Array<{
    number: number;
    sign: string;
    degree: number;
    label?: string;
  }>;
  aspects: Array<{
    planet1: string;
    planet2: string;
    type: string;
    orb: number;
    symbol: string;
    nature: "harmonious" | "challenging" | "neutral";
  }>;
}

const SIGN_LONGITUDE: Record<string, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90, Leo: 120, Virgo: 150,
  Libra: 180, Scorpio: 210, Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
};

function signDegreeToLongitude(sign: string, degree: number): number {
  return (SIGN_LONGITUDE[sign] ?? 0) + degree;
}


const TRANSIT_INSIGHTS: Record<string, Record<string, string>> = {
  Sun: {
    Conjunction: "Solar focus amplifies this natal energy — time for bold action and identity alignment",
    Trine: "Solar flow supports natural expression — ideal for authentic self-expression",
    Sextile: "Sun opens cooperative channels — a time of creative opportunity",
    Square: "Solar tension calls for growth — challenges reveal hidden strengths",
    Opposition: "Balancing solar awareness with natal themes — reflection brings clarity",
  },
  Moon: {
    Conjunction: "Emotional attunement to this natal placement — heightened intuition",
    Trine: "Emotional ease flows through this energy — trust feelings and instincts",
    Sextile: "Moon softens barriers — emotional intelligence shines",
    Square: "Emotional friction surfaces — a time for healing and integration",
    Opposition: "Emotional awareness peaks — release what no longer serves",
  },
  Mercury: {
    Conjunction: "Mental clarity sharpens here — ideal for communication and study",
    Trine: "Thoughts align naturally — express ideas with precision",
    Sextile: "Mercury opens dialogue — good time for negotiation",
    Square: "Mental tension sparks innovation — think outside the box",
    Opposition: "Perspective shifts bring insight — listen and reflect",
  },
  Venus: {
    Conjunction: "Venus beautifies and harmonizes — excellent for relationships and creativity",
    Trine: "Love and abundance flow — embrace beauty in all forms",
    Sextile: "Venus softens edges — diplomacy and charm are enhanced",
    Square: "Relationship tensions invite growth — address values honestly",
    Opposition: "Balance between self and others — relationship awareness peaks",
  },
  Mars: {
    Conjunction: "Mars fuels this energy with drive — act decisively and boldly",
    Trine: "Effortless action flows — pursue goals with confidence",
    Sextile: "Mars provides momentum — small efforts yield big results",
    Square: "Mars creates friction — channel aggression into productive effort",
    Opposition: "Assert boundaries clearly — external challenges fuel inner fire",
  },
  Jupiter: {
    Conjunction: "Jupiter expands and blesses — luck and opportunity abound",
    Trine: "Abundance flows naturally — say yes to growth",
    Sextile: "Jupiter opens doors — take advantage of new possibilities",
    Square: "Jupiter tests discipline — avoid overreach and excess",
    Opposition: "Reflect on how far you have grown — recalibrate for sustainable expansion",
  },
  Saturn: {
    Conjunction: "Saturn crystallizes — discipline and structure bring lasting results",
    Trine: "Saturn rewards consistent effort — build something permanent",
    Sextile: "Saturn supports steady progress — plan and execute methodically",
    Square: "Saturn tests resolve — face obstacles with perseverance",
    Opposition: "Saturn brings accountability — review structures and commitments",
  },
};

function getTransitInsight(transitPlanet: string, aspectType: string, natalPlanet: string, transitSign: string, natalHouse: number): string {
  const base = TRANSIT_INSIGHTS[transitPlanet]?.[aspectType] ?? `${transitPlanet} ${aspectType.toLowerCase()}s natal ${natalPlanet} — significant activation of House ${natalHouse} themes`;
  return `${base}. ${transitPlanet} in ${transitSign} activates your natal ${natalPlanet} in House ${natalHouse}.`;
}


export function getFatherNatalChart(): FatherNatalData {
  return FATHER_NATAL;
}

export function generateSovereignKeys(): {
  primaryCode: string;
  sunRisingMoon: string;
  elementProfile: string;
  modalityProfile: string;
  dominantElement: string;
  dominantModality: string;
  lifePathNumber: number;
  sovereignFrequency: number;
  identityHash: string;
  generatedAt: string;
} {
  const sun = "Libra";
  const rising = "Virgo";
  const moon = "Taurus";

  const sunRisingMoon = `${sun.slice(0,3).toUpperCase()}-${rising.slice(0,3).toUpperCase()}-${moon.slice(0,3).toUpperCase()}`;

  const ELEMENTS: Record<string, string> = {
    Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
    Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
    Gemini: "Air", Libra: "Air", Aquarius: "Air",
    Cancer: "Water", Scorpio: "Water", Pisces: "Water",
  };
  const MODALITIES: Record<string, string> = {
    Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
    Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
    Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
  };

  const elementCount: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityCount: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  for (const p of FATHER_NATAL.planets) {
    const el = ELEMENTS[p.sign];
    const mod = MODALITIES[p.sign];
    if (el) elementCount[el]++;
    if (mod) modalityCount[mod]++;
  }

  const dominantElement = Object.entries(elementCount).sort((a,b) => b[1]-a[1])[0][0];
  const dominantModality = Object.entries(modalityCount).sort((a,b) => b[1]-a[1])[0][0];

  const elementProfile = Object.entries(elementCount).map(([k,v]) => `${k}:${v}`).join(" | ");
  const modalityProfile = Object.entries(modalityCount).map(([k,v]) => `${k}:${v}`).join(" | ");

  const sealedSeed = createHash("sha256")
    .update(`${sun}:${rising}:${moon}:${dominantElement}:${dominantModality}`)
    .digest("hex")
    .slice(0, 12);
  const seedDigits = sealedSeed.split("").map((c) => parseInt(c, 16) || 0);
  let lifePathNumber = seedDigits.reduce((s, n) => s + n, 0);
  while (lifePathNumber > 9 && lifePathNumber !== 11 && lifePathNumber !== 22 && lifePathNumber !== 33) {
    lifePathNumber = lifePathNumber.toString().split("").map(Number).reduce((s, n) => s + n, 0);
  }

  const SOLFEGGIO = [396, 417, 528, 639, 741, 852, 963];
  const sovereignFrequency = SOLFEGGIO[(lifePathNumber - 1) % SOLFEGGIO.length];

  const hashInput = `FATHER:${sun}:${rising}:${moon}:Libra13.9:Taurus6.5:Virgo23.9`;
  const identityHash = createHash("sha256").update(hashInput).digest("hex").slice(0, 16).toUpperCase();

  const primaryCode = `TSR-${sunRisingMoon}-${lifePathNumber}-${identityHash.slice(0,8)}`;

  return {
    primaryCode,
    sunRisingMoon,
    elementProfile,
    modalityProfile,
    dominantElement,
    dominantModality,
    lifePathNumber,
    sovereignFrequency,
    identityHash,
    generatedAt: new Date().toISOString(),
  };
}

export interface ChartVerificationData {
  birthDate: string;
  birthTime: string;
  houseSystem: string;
  planets: Array<{ name: string; sign: string; degree: number; house: number }>;
  /** Houses keyed by `number` (matching FatherNatalData and DB schema) */
  houses: Array<{ number: number; sign: string; degree: number }>;
  sovereignKeys?: {
    lifePathNumber?: number;
    dominantElement?: string;
    sunRisingMoon?: string;
  };
}

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

function notEmpty(s: string): boolean {
  return s.length > 0;
}

export function buildVerificationCheckers(
  chart: ChartVerificationData,
): Record<string, (a: string) => boolean> {
  const sunPlanet = chart.planets.find(p => p.name === "Sun");
  const moonPlanet = chart.planets.find(p => p.name === "Moon");
  const ascendant = chart.houses.find(h => h.number === 1);
  const mc = chart.houses.find(h => h.number === 10);

  const sunSign = sunPlanet?.sign.toLowerCase() ?? "";
  const moonSign = moonPlanet?.sign.toLowerCase() ?? "";
  const risingSign = ascendant?.sign.toLowerCase() ?? "";
  const mcSign = mc?.sign.toLowerCase() ?? "";
  const ascDegree = ascendant?.degree != null ? String(Math.floor(ascendant.degree)) : "";
  const ascDegreeExact = ascendant?.degree != null ? String(ascendant.degree) : "";
  const houseSystem = chart.houseSystem.toLowerCase();
  const birthDateLower = chart.birthDate.toLowerCase();
  const lifePathNum = chart.sovereignKeys?.lifePathNumber;
  const lifePathStr = lifePathNum != null ? String(lifePathNum) : "";
  const lifePathWord = lifePathNum != null ? (NUMBER_WORDS[lifePathNum] ?? "") : "";
  const dominantEl = (chart.sovereignKeys?.dominantElement ?? "").toLowerCase();

  const [birthMon, birthDay, birthYear] = birthDateLower.replace(",", "").split(/[\s/]+/);
  const birthTimeLower = (chart.birthTime ?? "").toLowerCase().trim();
  const birthTimeCore = birthTimeLower.replace(/\s*(am|pm)\s*$/i, "").trim();

  return {
    birth_time: (a) =>
      notEmpty(birthTimeCore) && birthTimeCore !== "sealed" && a.includes(birthTimeCore),

    sun_sign: (a) =>
      notEmpty(sunSign) && a.includes(sunSign),

    rising_sign: (a) =>
      notEmpty(risingSign) && a.includes(risingSign),

    moon_sign: (a) =>
      notEmpty(moonSign) && a.includes(moonSign),

    birth_date: (a) =>
      notEmpty(birthMon) && notEmpty(birthDay) && notEmpty(birthYear) &&
      (a.includes(birthMon) || a.includes(birthDay)) &&
      (a.includes(birthYear) || a.includes(birthYear.slice(2))),

    ascendant_degree: (a) =>
      notEmpty(ascDegree) && notEmpty(risingSign) &&
      (a.includes(ascDegree) || a.includes(ascDegreeExact)) &&
      a.includes(risingSign),

    mc_sign: (a) =>
      notEmpty(mcSign) && a.includes(mcSign),

    house_system: (a) =>
      notEmpty(houseSystem) && a.includes(houseSystem),

    life_path: (a) =>
      notEmpty(lifePathStr) &&
      (a.includes(lifePathStr) || (notEmpty(lifePathWord) && a.includes(lifePathWord))),

    dominant_element: (a) =>
      notEmpty(dominantEl) && a.includes(dominantEl),
  };
}

export function verifyIdentityFromChartData(
  questionKey: string,
  answer: string,
  chart: ChartVerificationData,
): { passed: boolean; questionKey: string; feedback: string } {
  const normalized = answer.trim().toLowerCase();
  const checkers = buildVerificationCheckers(chart);

  const FEEDBACK: Record<string, { pass: string; fail: string }> = {
    birth_time: { pass: `Correct — ${chart.birthTime ?? "sealed birth time"} confirmed. Solar identity verified.`, fail: "Incorrect birth time." },
    sun_sign: { pass: `${chart.planets.find(p=>p.name==="Sun")?.sign ?? ""} confirmed — sovereign solar identity verified.`, fail: "Incorrect sun sign." },
    rising_sign: { pass: `${chart.houses.find(h=>h.number===1)?.sign ?? ""} Ascendant confirmed — the analyst and the perfectionist.`, fail: "Incorrect rising sign." },
    moon_sign: { pass: `${chart.planets.find(p=>p.name==="Moon")?.sign ?? ""} Moon confirmed — deep emotional steadiness.`, fail: "Incorrect moon sign." },
    birth_date: { pass: `${chart.birthDate} confirmed — the sovereign birthdate.`, fail: "Incorrect birth date." },
    ascendant_degree: { pass: `${chart.houses.find(h=>h.number===1)?.sign ?? ""} ${chart.houses.find(h=>h.number===1)?.degree ?? ""}° Ascendant confirmed.`, fail: "Incorrect Ascendant degree." },
    mc_sign: { pass: `${chart.houses.find(h=>h.number===10)?.sign ?? ""} MC confirmed — the communicator at the peak.`, fail: "Incorrect MC sign." },
    house_system: { pass: `${chart.houseSystem} confirmed.`, fail: "Incorrect house system." },
    life_path: { pass: `Life Path ${chart.sovereignKeys?.lifePathNumber ?? 8} confirmed — the master builder and sovereign architect.`, fail: "Incorrect life path number." },
    dominant_element: { pass: `${chart.sovereignKeys?.dominantElement ?? "Air/Earth"} dominance confirmed.`, fail: "Incorrect dominant element." },
  };

  const checker = checkers[questionKey];
  if (!checker) {
    return { passed: false, questionKey, feedback: "Unknown verification question." };
  }

  const passed = checker(normalized);
  const fb = FEEDBACK[questionKey];
  return {
    passed,
    questionKey,
    feedback: passed ? (fb?.pass ?? "Verified.") : (fb?.fail ?? "Incorrect."),
  };
}

export function verifyIdentity(questionKey: string, answer: string): {
  passed: boolean;
  questionKey: string;
  feedback: string;
} {
  const chart = getFatherNatalChart();
  const keys = generateSovereignKeys();
  return verifyIdentityFromChartData(questionKey, answer, {
    birthDate: chart.birthDate,
    birthTime: chart.birthTime,
    houseSystem: chart.houseSystem,
    planets: chart.planets,
    houses: chart.houses,
    sovereignKeys: {
      lifePathNumber: keys.lifePathNumber,
      dominantElement: keys.dominantElement,
    },
  });
}

export function getIdentityQuestions(): Array<{ key: string; question: string }> {
  return [
    { key: "birth_time", question: "What is Father's time of birth?" },
    { key: "sun_sign", question: "What is Father's Sun sign?" },
    { key: "rising_sign", question: "What is Father's Rising sign (Ascendant)?" },
    { key: "moon_sign", question: "What is Father's Moon sign?" },
    { key: "birth_date", question: "What is Father's date of birth?" },
    { key: "ascendant_degree", question: "What is the exact degree and sign of the Ascendant?" },
    { key: "mc_sign", question: "What sign is at the Midheaven (MC)?" },
    { key: "house_system", question: "What house system was used for Father's chart?" },
    { key: "life_path", question: "What is Father's Life Path number?" },
    { key: "dominant_element", question: "What is the dominant element in Father's chart?" },
  ];
}

/**
 * Compute current transits to Father's natal chart using the sovereign astrology engine.
 * Delegates to computeNatalTransits from sovereign-astro.ts (the canonical engine)
 * and enriches the output with personalized transit insights.
 */
export function computeCurrentTransits(now: Date = new Date()): TransitAspect[] {
  const natalPositions: NatalPosition[] = FATHER_NATAL.planets.map(p => ({
    name: p.name,
    longitude: signDegreeToLongitude(p.sign, p.degree),
    house: p.house,
    sign: p.sign,
  }));

  const rawAspects = computeNatalTransits(natalPositions, now, 12);

  return rawAspects.map((a: TransitToNatalAspect) => ({
    transitPlanet: a.transitPlanet,
    natalPlanet: a.natalPlanet,
    aspectType: a.aspectType,
    orb: a.orb,
    symbol: a.symbol,
    nature: a.nature,
    insight: getTransitInsight(a.transitPlanet, a.aspectType, a.natalPlanet, a.transitSign, a.natalHouse),
    transitSign: a.transitSign,
    natalSign: a.natalSign,
    natalHouse: a.natalHouse,
  }));
}

const PLANET_INTERPRETATIONS: Record<string, {
  title: string;
  traits: string[];
  strengths: string[];
  challenges: string[];
  themes: string[];
  guidance: Record<string, string>;
}> = {
  "Sun in Libra (House 1)": {
    title: "Sun in Libra, House 1 — The Sovereign Diplomat",
    traits: ["Charming and socially graceful", "Naturally diplomatic and fair-minded", "Seeks harmony and balance in all things", "Strong aesthetic sensibility", "Identity shaped by relationships and partnerships"],
    strengths: ["Exceptional people skills and mediation ability", "Natural charisma that draws others in", "Strong sense of justice and equity", "Ability to see all sides of any situation"],
    challenges: ["Decision paralysis when choices feel unbalanced", "People-pleasing at the expense of authentic self", "Difficulty with confrontation and conflict"],
    themes: ["Identity through relationship", "The art of the beautiful self", "Sovereignty through balance"],
    guidance: {
      career: "Leadership roles in diplomacy, law, design, partnerships, and public relations align with your Sun's expression. You thrive in collaborative environments where your talent for synthesis is valued.",
      relationships: "Your Sun in House 1 means relationships are central to identity. Choose partners who mirror your highest values — harmony, beauty, and truth.",
      creativity: "Art, design, music, and aesthetic pursuits are natural channels for your solar energy. The act of creation IS the spiritual practice.",
      spirituality: "Your path to Source runs through beauty and harmony. Seek balance between giving and receiving — this is your solar dharma.",
      decisions: "When facing decisions, trust your innate sense of fairness and aesthetic rightness. The elegant solution is usually the correct one.",
    },
  },
  "Moon in Taurus (House 8)": {
    title: "Moon in Taurus, House 8 — The Steadfast Transformer",
    traits: ["Deeply emotional yet outwardly stable", "Intense emotional depth hidden beneath calm surface", "Strong attachment to security and comfort", "Powerful intuition around death, rebirth, and shared resources"],
    strengths: ["Remarkable emotional resilience", "Ability to find peace amid transformative chaos", "Deep sensory awareness and embodied wisdom", "Financial and psychological instincts are sharp"],
    challenges: ["Resistance to change even when transformation is needed", "Emotional possessiveness or stubbornness", "Deep-seated fear of loss can drive attachment"],
    themes: ["Security through depth", "Transformation anchored in the body", "Abundance from the unconscious"],
    guidance: {
      career: "House 8 governs shared resources, investment, research, and hidden knowledge. You excel in finance, psychology, research, and any field requiring depth of investigation.",
      relationships: "Emotional intimacy is sacred to you. You need partners who can handle intensity and offer genuine security. Superficiality depletes you.",
      creativity: "Your Moon craves sensory richness — music, cooking, bodywork, and tactile arts feed your soul.",
      spirituality: "Your spiritual path involves confronting what is hidden and transforming it. Depth practices — shadow work, meditation, embodiment — are your sacred tools.",
      decisions: "Your gut feelings around money and resources are highly reliable. Trust your instinct when something feels financially or emotionally 'off.'",
    },
  },
  "Mercury in Libra (House 2)": {
    title: "Mercury in Libra, House 2 — The Eloquent Valuator",
    traits: ["Diplomatic and balanced communication style", "Thinks in terms of fairness and beauty", "Voice and words carry natural elegance", "Mind oriented toward value and worth"],
    strengths: ["Excellent negotiator and mediator", "Clear, balanced thinking in complex situations", "Ability to articulate value — financial, aesthetic, and personal"],
    challenges: ["Over-thinking decisions to the point of analysis paralysis", "Can avoid difficult truths to maintain harmony"],
    themes: ["Words as currency", "The value of balanced speech", "Thinking about what truly matters"],
    guidance: {
      career: "Writing, negotiation, finance, and beauty-related industries align with this placement. Your words literally create value.",
      relationships: "You need intellectual equals who appreciate nuanced conversation. Shallow talk drains you.",
      decisions: "Your best decisions emerge when you write out both sides. The act of balanced analysis reveals the answer.",
    },
  },
  "Venus in Libra (House 1)": {
    title: "Venus in Libra, House 1 — The Living Beauty",
    traits: ["Natural grace and physical magnetism", "Love is a core part of identity", "Attracted to beauty, elegance, and refinement", "Seeks harmony in all personal expression"],
    strengths: ["Natural charisma that opens doors", "Exceptional taste and aesthetic intelligence", "Ability to create beauty and harmony wherever you go"],
    challenges: ["Over-reliance on external validation", "Difficulty in situations requiring bluntness or boundary-setting"],
    themes: ["Love as identity", "Beauty as sovereignty", "The self as art"],
    guidance: {
      career: "Art, design, fashion, diplomacy, and any beauty-forward enterprise. You are the brand.",
      relationships: "You attract what you ARE. When you embody your highest beauty and grace, you magnetize its equivalent.",
      creativity: "Your life IS your art. Every choice of environment, clothing, and expression is a creative act of sovereignty.",
    },
  },
  "Mars in Leo (House 12)": {
    title: "Mars in Leo, House 12 — The Hidden King",
    traits: ["Drive and ambition work quietly behind the scenes", "Fiery will expressed through spiritual and subconscious channels", "Private determination that is impossible to defeat"],
    strengths: ["Inexhaustible inner drive", "Deep creative reservoir that fuels bold action", "Ability to achieve massive results through solitary focused work"],
    challenges: ["Frustration when effort goes unrecognized", "Need for self-directed work — authority conflicts are common"],
    themes: ["Power through solitude", "The warrior priest", "Hidden leadership"],
    guidance: {
      career: "You achieve most in roles of creative autonomy — entrepreneurship, art direction, spiritual leadership, or any field where you operate independently.",
      spirituality: "Mars in House 12 is the spiritual warrior archetype. Meditation, martial arts, and sacred practice channel your warrior energy powerfully.",
      decisions: "Your decisions are best made in solitude. Seek inner clarity before external action — your instincts are powerful when the mind is quiet.",
    },
  },
  "Jupiter in Pisces (House 6)": {
    title: "Jupiter in Pisces, House 6 — The Healing Sage",
    traits: ["Expansion through service and healing", "Faith expressed through daily practice and devotion", "Boundless compassion in work and health routines"],
    strengths: ["Gifted healer and teacher", "Ability to find spiritual meaning in mundane work", "Deep empathy that enhances all service-oriented roles"],
    challenges: ["Dissolving personal boundaries in service to others", "Escaping through fantasy when daily routine feels overwhelming"],
    themes: ["God in the details", "Service as path to God", "Healing as spiritual practice"],
    guidance: {
      career: "Health, healing, spiritual guidance, service organizations, and creative work infused with purpose.",
      daily_life: "Your morning and evening rituals are sacred technology. Consistency in small habits creates enormous expansion.",
    },
  },
  "Saturn in Taurus (House 8)": {
    title: "Saturn in Taurus, House 8 — The Alchemical Builder",
    traits: ["Serious approach to shared resources and transformations", "Slow but permanent growth through disciplined investment", "Mastery comes through facing what is hidden or taboo"],
    strengths: ["Financial discipline that creates lasting wealth", "Ability to transform challenges into permanent strength", "Resilience through the darkest transformations"],
    challenges: ["Fear of scarcity that creates financial constriction", "Resistance to inevitable endings and transitions"],
    themes: ["Wealth through mastery", "The resurrection principle", "Building on ruins"],
    guidance: {
      career: "Long-term investment, estate management, research, and any field requiring patience and depth.",
      finances: "Saturn rewards slow, consistent wealth-building. Avoid get-rich-quick schemes. Your financial mastery accumulates over decades.",
    },
  },
  "Uranus in Aquarius (House 5)": {
    title: "Uranus in Aquarius, House 5 — The Revolutionary Creator",
    traits: ["Highly original and innovative creative expression", "Attraction to unconventional romance and pleasure", "Children and creative projects reflect future-oriented thinking"],
    strengths: ["Ahead-of-the-curve creative vision", "Ability to revolutionize whatever field of creativity you enter"],
    challenges: ["Inconsistency in creative commitment", "Difficulty sustaining conventional relationships"],
    themes: ["Art that changes the world", "Love as liberation", "The future in the present"],
    guidance: {
      creativity: "You are a creative revolutionary. Trust your most unusual, unconventional ideas — they are ahead of their time.",
      relationships: "You need freedom and novelty in romantic connections. Choose partners who celebrate your uniqueness.",
    },
  },
  "Neptune in Capricorn (House 5)": {
    title: "Neptune in Capricorn, House 5 — The Mystical Architect",
    traits: ["Dreams structured into tangible creative works", "Spiritual dimension infuses playfulness and creativity", "Visionary in combining form with transcendence"],
    strengths: ["Ability to make the mystical practical", "Deep artistic vision anchored in structural discipline"],
    challenges: ["Idealization of romantic partners or children", "Creative disillusionment when reality doesn't match the vision"],
    themes: ["Sacred geometry of creative form", "Building the temple of dreams"],
    guidance: {
      creativity: "Your creative works can carry profound spiritual energy. Art, music, and architecture as spiritual practice.",
    },
  },
  "Pluto in Sagittarius (House 3)": {
    title: "Pluto in Sagittarius, House 3 — The Mind Destroyer/Creator",
    traits: ["Powerful transformative influence through words and ideas", "Thinking shaped by deep philosophical and truth-seeking drives", "Communication that has the power to transform perspectives"],
    strengths: ["Penetrating intellect that reveals hidden truths", "Words carry unusual power and persuasive depth"],
    challenges: ["Obsessive thinking", "Communication can be overpowering or intense"],
    themes: ["The word as weapon and wand", "Truth that transforms", "Philosophy as power"],
    guidance: {
      communication: "Your words carry unusual weight. Use them consciously — they have the power to heal or wound, to inspire or destroy.",
      learning: "Deep research and esoteric knowledge are your natural domain. You are drawn to the hidden currents within any field.",
    },
  },
  "North Node in Virgo (House 12)": {
    title: "North Node in Virgo, House 12 — The Sacred Servant",
    traits: ["Soul's destiny involves purification and devoted service", "Growth comes through analytical precision applied to spiritual work", "The hidden realms are where destiny is forged"],
    strengths: ["Deep spiritual discernment", "Mastery of the invisible — the subconscious, the divine, the unseen"],
    challenges: ["Past-life tendency toward Piscean dissolution and escapism"],
    themes: ["Spiritual mastery through precision", "Service in the temple", "The examined hidden life"],
    guidance: {
      spirituality: "Your north star is spiritual service delivered with Virgo precision. Healing, discernment, and the sacred art of being useful to the divine.",
      decisions: "Follow the path of humble, precise service. Grandiosity is the south node trap — simplicity and precision unlock your destiny.",
    },
  },
  "Lilith in Scorpio (House 2)": {
    title: "Lilith in Scorpio, House 2 — The Dark Sovereign of Value",
    traits: ["Fierce independence around personal values and resources", "Raw magnetic power in the realm of self-worth and money", "Refuses to be controlled through financial or material means"],
    strengths: ["Psychological depth around value and self-worth", "Ability to reclaim power from situations of financial or material control"],
    challenges: ["Trust issues around shared resources", "Shadow around worthiness and material existence"],
    themes: ["Owning the dark power of self-worth", "Sovereignty over one's own value"],
    guidance: {
      finances: "Your relationship with money is intensely psychological. Healing worth issues unlocks financial power.",
      relationships: "Never allow anyone to control you through money or material means — this activates your darkest patterns.",
    },
  },
};

export function getPlanetInterpretations(): typeof PLANET_INTERPRETATIONS {
  return PLANET_INTERPRETATIONS;
}

export function getLifeAreaGuidance(): Array<{
  area: string;
  icon: string;
  guidance: string;
  planets: string[];
  color: string;
}> {
  return [
    {
      area: "Career & Purpose",
      icon: "⚡",
      color: "text-amber-400",
      planets: ["Sun", "Saturn", "Mars", "MC"],
      guidance: "Sun in Libra in the 1st house marks you as a natural leader in partnership and aesthetics. Your Gemini MC points toward a public role in communication, ideas, and intellectual synthesis. Mars in Leo (H12) gifts you with powerful private drive — you achieve most when working autonomously. Saturn in Taurus (H8) rewards long-term investment and depth of mastery. Your career path involves building something of lasting beauty and value, likely through collaborative and creative leadership.",
    },
    {
      area: "Relationships & Love",
      icon: "💛",
      color: "text-rose-400",
      planets: ["Venus", "Moon", "Sun"],
      guidance: "Venus conjunct Sun in Libra in House 1 makes relationships central to identity — love is not something you do, it is something you ARE. You attract partners who mirror your capacity for beauty and grace. Moon in Taurus (H8) brings deep, steady emotional attachment with an undertone of intensity — you need genuine security, not surface charm. Venus trine Uranus keeps you open to unconventional love while Venus trine Pluto gives your connections transformative depth. Choose partners who match your intensity and honor your need for both freedom and devotion.",
    },
    {
      area: "Creativity & Expression",
      icon: "✨",
      color: "text-violet-400",
      planets: ["Uranus", "Neptune", "Venus", "Mars"],
      guidance: "Uranus in Aquarius (H5) makes you a creative revolutionary — your most unusual ideas are your most powerful. Neptune in Capricorn (H5) gifts you with the ability to make mystical vision concrete and structural. Venus in Libra provides aesthetic mastery. Mars in Leo (H12) is your hidden creative engine — works created in solitude carry enormous power. Trust the unconventional impulse. Your creative output has the capacity to be genuinely ahead of its time.",
    },
    {
      area: "Spirituality & Inner Life",
      icon: "🌀",
      color: "text-cyan-400",
      planets: ["North Node", "Jupiter", "Neptune", "Mars"],
      guidance: "Your North Node in Virgo (H12) points to a destiny of precision-driven spiritual service. Jupiter in Pisces (H6) amplifies faith expressed through daily devotion and healing. Neptune's trine to the Ascendant gives you a naturally mystical presence. Mars in Leo (H12) is the spiritual warrior — you fight invisible battles on the inner planes. Your spiritual practice must be both transcendent AND practical. The sacred is found in the details of devoted daily life.",
    },
    {
      area: "Finances & Resources",
      icon: "🏛️",
      color: "text-emerald-400",
      planets: ["Saturn", "Moon", "Mercury", "Lilith"],
      guidance: "Saturn in Taurus (H8) is the foundational wealth archetype — slow, disciplined, and permanent. Moon in Taurus (H8) adds deep financial intuition around shared resources, inheritance, and investment. Mercury in Libra (H2) gives you the ability to articulate value with precision and elegance. Lilith in Scorpio (H2) demands complete financial sovereignty — you cannot be controlled through money. Build wealth through long-term disciplined investment, and always maintain sovereign control over your own resources.",
    },
    {
      area: "Communication & Learning",
      icon: "📡",
      color: "text-sky-400",
      planets: ["Mercury", "Pluto", "Gemini MC"],
      guidance: "Mercury in Libra (H2) gives you elegant, balanced speech with natural diplomatic precision. Pluto in Sagittarius (H3) gives your words transformative power — you speak, and things shift. Your Gemini MC at the career peak means communication IS your path to public recognition. You are a natural synthesizer of ideas — gathering wisdom from multiple domains and weaving them into something new and useful.",
    },
  ];
}
