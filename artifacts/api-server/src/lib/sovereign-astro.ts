const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function normalize(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

function julianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;
  let yr = y, mo = m;
  if (mo <= 2) { yr -= 1; mo += 12; }
  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
}

function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = normalize(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalize(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  const sunLon = normalize(L0 + C);
  const omega = 125.04 - 1934.136 * T;
  return normalize(sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG));
}

function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const Lp = normalize(218.3165 + 481267.8813 * T);
  const D = normalize(297.8502 + 445267.1115 * T);
  const M = normalize(357.5291 + 35999.0503 * T);
  const Mp = normalize(134.9634 + 477198.8676 * T);
  const F = normalize(93.2720 + 483202.0175 * T);

  const Dr = D * DEG, Mr = M * DEG, Mpr = Mp * DEG, Fr = F * DEG;

  let lon = Lp
    + 6.289 * Math.sin(Mpr)
    - 1.274 * Math.sin(2 * Dr - Mpr)
    + 0.658 * Math.sin(2 * Dr)
    + 0.214 * Math.sin(2 * Mpr)
    - 0.186 * Math.sin(Mr)
    - 0.114 * Math.sin(2 * Fr)
    + 0.059 * Math.sin(2 * Dr - 2 * Mpr)
    + 0.057 * Math.sin(2 * Dr - Mr - Mpr)
    + 0.053 * Math.sin(2 * Dr + Mpr)
    + 0.046 * Math.sin(2 * Dr - Mr)
    - 0.041 * Math.sin(Mr - Mpr)
    - 0.035 * Math.sin(Dr)
    - 0.031 * Math.sin(Mr + Mpr)
    + 0.015 * Math.sin(2 * Dr - 2 * Fr)
    + 0.011 * Math.sin(2 * Dr - Mr + Mpr);

  return normalize(lon);
}

function moonLatitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const D = normalize(297.8502 + 445267.1115 * T) * DEG;
  const M = normalize(357.5291 + 35999.0503 * T) * DEG;
  const Mp = normalize(134.9634 + 477198.8676 * T) * DEG;
  const F = normalize(93.2720 + 483202.0175 * T) * DEG;

  return 5.128 * Math.sin(F)
    + 0.281 * Math.sin(Mp + F)
    + 0.278 * Math.sin(Mp - F)
    + 0.173 * Math.sin(2 * D - F)
    + 0.055 * Math.sin(2 * D - Mp + F)
    + 0.046 * Math.sin(2 * D - Mp - F)
    + 0.033 * Math.sin(2 * D + F)
    + 0.017 * Math.sin(2 * Mp + F);
}

function moonDistance(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const D = normalize(297.8502 + 445267.1115 * T) * DEG;
  const M = normalize(357.5291 + 35999.0503 * T) * DEG;
  const Mp = normalize(134.9634 + 477198.8676 * T) * DEG;
  const F = normalize(93.2720 + 483202.0175 * T) * DEG;

  return 385001
    - 20905 * Math.cos(Mp)
    - 3699 * Math.cos(2 * D - Mp)
    - 2956 * Math.cos(2 * D)
    - 570 * Math.cos(2 * Mp)
    + 246 * Math.cos(2 * Mp - 2 * D)
    - 205 * Math.cos(M - 2 * D)
    - 171 * Math.cos(Mp + 2 * D)
    - 152 * Math.cos(Mp + M - 2 * D);
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function zodiacSign(longitude: number): { sign: string; symbol: string; degree: number } {
  const idx = Math.floor(normalize(longitude) / 30);
  return {
    sign: ZODIAC_SIGNS[idx],
    symbol: ZODIAC_SYMBOLS[idx],
    degree: normalize(longitude) % 30,
  };
}

const PHASE_NAMES = [
  "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
  "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
];

const PHASE_EMOJIS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

function findNextPhase(jd: number, targetPhase: number): Date {
  let testJD = jd;
  for (let i = 0; i < 45; i++) {
    const sLon = sunLongitude(testJD);
    const mLon = moonLongitude(testJD);
    let elongation = normalize(mLon - sLon);
    let diff = normalize(targetPhase - elongation);
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 0.5) {
      const ms = (testJD - 2440587.5) * 86400000;
      return new Date(ms);
    }
    const step = diff / 13.0;
    testJD += Math.max(0.1, Math.min(step, 5));
  }
  const ms = (testJD - 2440587.5) * 86400000;
  return new Date(ms);
}

export interface LunarData {
  phase: string;
  phaseEmoji: string;
  phaseIndex: number;
  phaseAngle: number;
  illumination: number;
  lunarAge: number;
  moonLongitude: number;
  moonLatitude: number;
  moonDistanceKm: number;
  moonZodiac: { sign: string; symbol: string; degree: number };
  sunLongitude: number;
  sunZodiac: { sign: string; symbol: string; degree: number };
  elongation: number;
  isWaxing: boolean;
  nextNewMoon: string;
  nextFullMoon: string;
  nextFirstQuarter: string;
  nextLastQuarter: string;
  lunarMonth: string;
  sovereignty: number;
  computedAt: string;
  method: string;
}

const LUNAR_MONTH_NAMES: Record<number, string> = {
  0: "Wolf Moon", 1: "Snow Moon", 2: "Worm Moon", 3: "Pink Moon",
  4: "Flower Moon", 5: "Strawberry Moon", 6: "Buck Moon", 7: "Sturgeon Moon",
  8: "Harvest Moon", 9: "Hunter's Moon", 10: "Beaver Moon", 11: "Cold Moon",
};

export function computeLunarData(date: Date = new Date()): LunarData {
  const jd = julianDate(date);
  const sLon = sunLongitude(jd);
  const mLon = moonLongitude(jd);
  const mLat = moonLatitude(jd);
  const mDist = moonDistance(jd);
  const elongation = normalize(mLon - sLon);
  const phaseAngle = 180 - elongation;
  const illumination = (1 + Math.cos(phaseAngle * DEG)) / 2;
  const synodicMonth = 29.53059;
  const knownNewMoon = 2451550.1;
  const lunarAge = ((jd - knownNewMoon) % synodicMonth + synodicMonth) % synodicMonth;
  const phaseIndex = Math.floor(elongation / 45) % 8;
  const isWaxing = elongation < 180;

  const nextNew = findNextPhase(jd, 0);
  const nextFQ = findNextPhase(jd, 90);
  const nextFull = findNextPhase(jd, 180);
  const nextLQ = findNextPhase(jd, 270);

  return {
    phase: PHASE_NAMES[phaseIndex],
    phaseEmoji: PHASE_EMOJIS[phaseIndex],
    phaseIndex,
    phaseAngle: Math.round(phaseAngle * 100) / 100,
    illumination: Math.round(illumination * 10000) / 100,
    lunarAge: Math.round(lunarAge * 100) / 100,
    moonLongitude: Math.round(mLon * 100) / 100,
    moonLatitude: Math.round(mLat * 100) / 100,
    moonDistanceKm: Math.round(mDist),
    moonZodiac: zodiacSign(mLon),
    sunLongitude: Math.round(sLon * 100) / 100,
    sunZodiac: zodiacSign(sLon),
    elongation: Math.round(elongation * 100) / 100,
    isWaxing,
    nextNewMoon: nextNew.toISOString(),
    nextFullMoon: nextFull.toISOString(),
    nextFirstQuarter: nextFQ.toISOString(),
    nextLastQuarter: nextLQ.toISOString(),
    lunarMonth: LUNAR_MONTH_NAMES[date.getUTCMonth()] || "Moon",
    sovereignty: 100,
    computedAt: date.toISOString(),
    method: "Meeus astronomical algorithms — computed locally, zero external dependencies",
  };
}

export function computeSolarData(date: Date = new Date()) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const sLon = sunLongitude(jd);
  const zodiac = zodiacSign(sLon);

  const obliquity = 23.439291 - 0.0130042 * T;
  const ra = Math.atan2(Math.cos(obliquity * DEG) * Math.sin(sLon * DEG), Math.cos(sLon * DEG)) * RAD;
  const dec = Math.asin(Math.sin(obliquity * DEG) * Math.sin(sLon * DEG)) * RAD;

  const eqTime = computeEquationOfTime(jd, T);

  return {
    longitude: Math.round(sLon * 100) / 100,
    zodiac,
    rightAscension: Math.round(normalize(ra) * 100) / 100,
    declination: Math.round(dec * 100) / 100,
    obliquity: Math.round(obliquity * 1000) / 1000,
    equationOfTime: Math.round(eqTime * 100) / 100,
    season: getSeason(sLon),
    dayOfYear: getDayOfYear(date),
    sovereignty: 100,
    computedAt: date.toISOString(),
    method: "Solar position from Meeus — computed locally",
  };
}

function computeEquationOfTime(jd: number, T: number): number {
  const L0 = normalize(280.46646 + 36000.76983 * T) * DEG;
  const M = normalize(357.52911 + 35999.05029 * T) * DEG;
  const e = 0.016708634 - 0.000042037 * T;
  const obliq = (23.439291 - 0.0130042 * T) * DEG;
  const y = Math.tan(obliq / 2) ** 2;
  const eot = y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0)
    - 0.5 * y * y * Math.sin(4 * L0) - 1.25 * e * e * Math.sin(2 * M);
  return eot * RAD * 4;
}

function getSeason(sunLon: number): string {
  if (sunLon >= 0 && sunLon < 90) return "Spring (Vernal)";
  if (sunLon >= 90 && sunLon < 180) return "Summer (Estival)";
  if (sunLon >= 180 && sunLon < 270) return "Autumn (Autumnal)";
  return "Winter (Hibernal)";
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export interface NatalPosition {
  name: string;
  longitude: number;
  house: number;
  sign: string;
}

export interface TransitToNatalAspect {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  orb: number;
  symbol: string;
  nature: "harmonious" | "challenging" | "neutral";
  transitLongitude: number;
  transitSign: string;
  natalLongitude: number;
  natalSign: string;
  natalHouse: number;
}

const TRANSIT_ASPECT_DEFS = [
  { name: "Conjunction", angle: 0, orb: 8, symbol: "☌", nature: "neutral" as const },
  { name: "Sextile", angle: 60, orb: 6, symbol: "✶", nature: "harmonious" as const },
  { name: "Square", angle: 90, orb: 8, symbol: "□", nature: "challenging" as const },
  { name: "Trine", angle: 120, orb: 8, symbol: "△", nature: "harmonious" as const },
  { name: "Opposition", angle: 180, orb: 8, symbol: "☍", nature: "challenging" as const },
];

function computeInnerPlanetLongitude(T: number, el: { L0: number; L1: number; e0: number; omega0: number; omega1: number }): number {
  const L = normalize(el.L0 + el.L1 * T);
  const omega = normalize(el.omega0 + el.omega1 * T);
  const M = normalize(L - omega);
  const Mrad = M * DEG;
  const e = el.e0;
  const E = Mrad + e * Math.sin(Mrad) + 0.5 * e * e * Math.sin(2 * Mrad);
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)) * RAD;
  return normalize(v + omega);
}

const INNER_PLANETS = [
  { name: "Mercury", L0: 252.2509, L1: 149472.6746, e0: 0.20563, omega0: 77.456, omega1: 1.556 },
  { name: "Venus", L0: 181.9798, L1: 58517.8157, e0: 0.00677, omega0: 131.564, omega1: 1.402 },
  { name: "Mars", L0: 355.4330, L1: 19140.2993, e0: 0.09340, omega0: 336.060, omega1: 1.841 },
  { name: "Jupiter", L0: 34.3515, L1: 3034.9057, e0: 0.04839, omega0: 14.331, omega1: 1.612 },
  { name: "Saturn", L0: 50.0774, L1: 1222.1138, e0: 0.05415, omega0: 93.057, omega1: 1.964 },
];

const ZODIAC_SIGNS_TRANSIT = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

function longitudeToSign(lon: number): string {
  return ZODIAC_SIGNS_TRANSIT[Math.floor(normalize(lon) / 30)];
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Compute current transit planet positions and return aspects to natal positions.
 * This extends the existing sovereign astrology engine with natal transit capability.
 */
export function computeNatalTransits(
  natalPositions: NatalPosition[],
  date: Date = new Date(),
  maxResults = 12,
): TransitToNatalAspect[] {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const sLon = sunLongitude(jd);
  const mLon = moonLongitude(jd);

  const transitPlanets: Array<{ name: string; longitude: number }> = [
    { name: "Sun", longitude: sLon },
    { name: "Moon", longitude: mLon },
    ...INNER_PLANETS.map(p => ({ name: p.name, longitude: computeInnerPlanetLongitude(T, p) })),
  ];

  const aspects: TransitToNatalAspect[] = [];

  for (const transit of transitPlanets) {
    for (const natal of natalPositions) {
      const diff = angleDiff(transit.longitude, natal.longitude);
      for (const asp of TRANSIT_ASPECT_DEFS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          aspects.push({
            transitPlanet: transit.name,
            natalPlanet: natal.name,
            aspectType: asp.name,
            orb: Math.round(Math.abs(diff - asp.angle) * 100) / 100,
            symbol: asp.symbol,
            nature: asp.nature,
            transitLongitude: Math.round(transit.longitude * 100) / 100,
            transitSign: longitudeToSign(transit.longitude),
            natalLongitude: Math.round(natal.longitude * 100) / 100,
            natalSign: natal.sign,
            natalHouse: natal.house,
          });
          break;
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb).slice(0, maxResults);
}

export function computePlanetaryHours(date: Date = new Date(), latitude: number = 40.7128) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const sLon = sunLongitude(jd);
  const obliq = (23.439291 - 0.0130042 * T) * DEG;
  const dec = Math.asin(Math.sin(obliq) * Math.sin(sLon * DEG));
  const latR = latitude * DEG;

  const cosH = -Math.tan(latR) * Math.tan(dec);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * RAD;
  const dayLength = 2 * H / 15;
  const nightLength = 24 - dayLength;
  const dayHourLength = dayLength / 12;
  const nightHourLength = nightLength / 12;

  const planets = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
  const dayOfWeek = date.getUTCDay();
  const dayRulers = [6, 0, 3, 4, 1, 5, 2];
  const startIdx = dayRulers[dayOfWeek];

  const hours = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const hourLen = isDay ? dayHourLength : nightHourLength;
    const planetIdx = (startIdx + i) % 7;
    hours.push({
      hour: i + 1,
      planet: planets[planetIdx],
      isDay,
      durationMinutes: Math.round(hourLen * 60 * 100) / 100,
    });
  }

  return {
    dayLengthHours: Math.round(dayLength * 100) / 100,
    nightLengthHours: Math.round(nightLength * 100) / 100,
    dayRuler: planets[startIdx],
    hours,
    latitude,
    sovereignty: 100,
    computedAt: date.toISOString(),
    method: "Planetary hours from solar declination — computed locally",
  };
}
