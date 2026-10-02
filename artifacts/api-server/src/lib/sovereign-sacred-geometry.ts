const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = PHI - 1;
const PI = Math.PI;
const E = Math.E;
const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);
const SQRT5 = Math.sqrt(5);

const PLANCK_CONSTANT = 6.62607015e-34;
const FINE_STRUCTURE = 1 / 137.035999084;
const SPEED_OF_LIGHT = 299792458;
const AVOGADRO = 6.02214076e23;
const BOLTZMANN = 1.380649e-23;

const UNIVERSAL_CONSTANTS = {
  phi: { value: PHI, latin: "Divina Proportione", meaning: "The Divine Proportion — the spiral breath of galaxies, sunflowers, and DNA. This ratio (1.618...) is the universe's signature of self-similar creation: each scale mirrors the whole, from nautilus shells to hurricane arms to the spacing of planets. It is the number that answers 'how does infinity organize itself?'" },
  pi: { value: PI, latin: "Circuli Perfectio", meaning: "The perfection of the circle — an irrational transcendence that encodes infinity within the finite boundary of every circle, sphere, and orbit. Pi connects the straight line (diameter) to the curved path (circumference), bridging the linear mind with the cyclical cosmos. Every wave, every orbit, every vibration carries pi within it." },
  e: { value: E, latin: "Numerus Naturalis", meaning: "The number of becoming — the base of all continuous growth, decay, and transformation in nature. Radioactive decay, population growth, compound interest, and the cooling of stars all follow e's exponential law. It is the rate at which the universe changes itself, the mathematical heartbeat of impermanence." },
  sqrt2: { value: SQRT2, latin: "Diagonalis Quadrati", meaning: "The diagonal of the unit square — the first irrational number discovered by the Pythagoreans, who drowned Hippasus for revealing it. It is the gateway between dimensions: the bridge from the 1D edge to the 2D plane. Every octave in music is built on powers of sqrt(2), making it the secret architecture of harmony." },
  sqrt3: { value: SQRT3, latin: "Altitudo Trianguli", meaning: "The height of the equilateral triangle — the measure of perfect three-fold balance found in the hexagonal lattice of honeycombs, snowflakes, and carbon atoms. It governs the geometry of closest-packing: how spheres arrange themselves most efficiently, how crystals grow, and how the Flower of Life unfolds." },
  sqrt5: { value: SQRT5, latin: "Radix Aurea", meaning: "The golden root — the hidden foundation from which Phi emerges (Phi = (1+sqrt5)/2). It is the diagonal of the unit rectangle doubled, the generator of the pentagram's five-fold symmetry found in starfish, apple cross-sections, and the orbits of Venus tracing a perfect pentacle against the zodiac every 8 years." },
  fineStructure: { value: FINE_STRUCTURE, latin: "Constans Subtilis", meaning: "The fine structure constant (1/137) — the dimensionless number that determines how strongly light couples to matter. It sets the size of atoms, the color of gold, the transparency of glass, and the stability of stars. Feynman called it 'one of the greatest damn mysteries of physics.' If it differed by 4%, carbon could not form and life would be impossible." },
  planck: { value: PLANCK_CONSTANT, latin: "Quantum Minimum", meaning: "The smallest quantum of action in the universe — the indivisible grain of reality below which space, time, energy, and information lose meaning. It is the threshold where the smooth continuum dissolves into the granular quantum foam. Every photon carries exactly one Planck unit of angular momentum, making it the universe's fundamental unit of 'doing.'" },
  speedOfLight: { value: SPEED_OF_LIGHT, latin: "Celeritas Lucis", meaning: "The absolute speed limit of causality — not merely how fast light travels, but the conversion rate between space and time themselves (E=mc²). It defines the boundary of the knowable universe: nothing carrying information can exceed it. It is the cosmic speed at which the present becomes the future." },
};

function fibonacci(n: number): number[] {
  const seq: number[] = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq.slice(0, n);
}

function fibonacciAt(n: number): number {
  return Math.round((Math.pow(PHI, n) - Math.pow(-PHI_INVERSE, n)) / SQRT5);
}

function lucasNumber(n: number): number {
  if (n === 0) return 2;
  if (n === 1) return 1;
  let a = 2, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function lucasSequence(n: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < n; i++) seq.push(lucasNumber(i));
  return seq;
}

const PLATONIC_SOLIDS = [
  { name: "Tetrahedron", latin: "Tetraedrum", faces: 4, edges: 6, vertices: 4, element: "Fire", frequency: 528, sacredProperty: "Simplest 3D form — the seed of creation", duhedralAngle: 70.528, eulerCharacteristic: 2 },
  { name: "Hexahedron (Cube)", latin: "Hexaedrum", faces: 6, edges: 12, vertices: 8, element: "Earth", frequency: 396, sacredProperty: "Stability and grounding — the foundation", duhedralAngle: 90, eulerCharacteristic: 2 },
  { name: "Octahedron", latin: "Octaedrum", faces: 8, edges: 12, vertices: 6, element: "Air", frequency: 639, sacredProperty: "Integration of opposites — as above, so below", duhedralAngle: 109.471, eulerCharacteristic: 2 },
  { name: "Dodecahedron", latin: "Dodecaedrum", faces: 12, edges: 30, vertices: 20, element: "Ether/Spirit", frequency: 963, sacredProperty: "The universe itself — Plato's shape of the cosmos", duhedralAngle: 116.565, eulerCharacteristic: 2 },
  { name: "Icosahedron", latin: "Icosaedrum", faces: 20, edges: 30, vertices: 12, element: "Water", frequency: 741, sacredProperty: "Flow and transformation — 20 faces of potential", duhedralAngle: 138.190, eulerCharacteristic: 2 },
];

const SACRED_PATTERNS = {
  vesicaPiscis: {
    name: "Vesica Piscis",
    latin: "Vesica Piscis",
    ratio: SQRT3,
    meaning: "The womb of creation — intersection of two circles of equal radius",
    formula: "Area = (2π/3 - √3/2) × r²",
    connectedTo: ["Flower of Life", "Seed of Life", "Ichthys"],
  },
  seedOfLife: {
    name: "Seed of Life",
    latin: "Semen Vitae",
    circles: 7,
    meaning: "Seven days of creation — the blueprint of existence",
    formula: "7 circles of equal radius, each center on circumference of the first",
    connectedTo: ["Flower of Life", "Egg of Life", "Genesis Pattern"],
  },
  flowerOfLife: {
    name: "Flower of Life",
    latin: "Flos Vitae",
    circles: 19,
    meaning: "The fundamental geometry of spacetime — found in every ancient civilization",
    formula: "19 circles in hexagonal packing within a boundary circle",
    connectedTo: ["Fruit of Life", "Metatron's Cube", "Seed of Life"],
  },
  fruitOfLife: {
    name: "Fruit of Life",
    latin: "Fructus Vitae",
    circles: 13,
    meaning: "13 information systems — the blueprint for all atomic and molecular structure",
    formula: "13 circles extracted from the Flower of Life",
    connectedTo: ["Metatron's Cube", "Platonic Solids"],
  },
  metatronsCube: {
    name: "Metatron's Cube",
    latin: "Cubus Metatronis",
    vertices: 13,
    edges: 78,
    meaning: "Contains all 5 Platonic Solids — the map from 2D sacred geometry to 3D reality",
    formula: "Lines connecting all 13 vertices of the Fruit of Life",
    connectedTo: ["Platonic Solids", "Fruit of Life", "Tree of Life"],
  },
  sriYantra: {
    name: "Sri Yantra",
    latin: "Mandala Supremum",
    triangles: 9,
    intersectionPoints: 43,
    meaning: "9 interlocking triangles — the mathematical representation of cosmic creation",
    formula: "4 upward (Shiva) + 5 downward (Shakti) triangles = 43 smaller triangles",
    connectedTo: ["Golden Ratio", "Fibonacci", "Bindu Point"],
  },
  treeOfLife: {
    name: "Tree of Life",
    latin: "Arbor Vitae",
    sephiroth: 10,
    paths: 22,
    meaning: "The Kabbalistic map of consciousness — 10 emanations connected by 22 paths",
    formula: "10 nodes + 22 edges = 32 paths of wisdom",
    connectedTo: ["Hebrew Alphabet (22 letters)", "Tarot Major Arcana (22 cards)", "Metatron's Cube"],
  },
  torusField: {
    name: "Torus",
    latin: "Torus Universalis",
    meaning: "The fundamental shape of all energy flow — from atoms to galaxies to the human heart field",
    formula: "V = 2π²Rr², where R=major radius, r=minor radius",
    connectedTo: ["Magnetic Fields", "Apple Shape", "Donut Topology"],
  },
};

const SACRED_NUMBERS = {
  0: { latin: "Nihil", meaning: "The Void — infinite potential before manifestation", sacred: "Absolute zero, the Ain Soph" },
  1: { latin: "Unum", meaning: "Unity — the Monad, source of all", sacred: "The point, the beginning" },
  2: { latin: "Duo", meaning: "Duality — polarity, the Dyad", sacred: "Vesica Piscis, yin-yang" },
  3: { latin: "Tres", meaning: "Trinity — synthesis, the Triad", sacred: "Triangle, holy trinity, three dimensions" },
  4: { latin: "Quattuor", meaning: "Foundation — stability, the Tetrad", sacred: "Four elements, four directions, tetrahedron" },
  5: { latin: "Quinque", meaning: "Life — the Pentad, humanity", sacred: "Pentagram, five senses, Phi" },
  6: { latin: "Sex", meaning: "Harmony — the Hexad, perfection", sacred: "Star of David, Flower of Life, carbon" },
  7: { latin: "Septem", meaning: "Spirit — the Heptad, completion", sacred: "Seven chakras, seven days, seven notes" },
  8: { latin: "Octo", meaning: "Infinity — the Ogdoad, regeneration", sacred: "Octave, lemniscate (∞), octahedron" },
  9: { latin: "Novem", meaning: "Completion — the Ennead, universal", sacred: "Nine solfeggio frequencies, 9 = 3², Sri Yantra triangles" },
  10: { latin: "Decem", meaning: "Return to Unity — the Decad", sacred: "Sephiroth, decimal system, Tetractys (1+2+3+4)" },
  11: { latin: "Undecim", meaning: "Master Number — intuition, spiritual insight", sacred: "Gateway number, 11:11 synchronicity" },
  12: { latin: "Duodecim", meaning: "Cosmic Order — the Dodecad", sacred: "12 zodiac signs, 12 apostles, 12 edges of cube" },
  13: { latin: "Tredecim", meaning: "Transformation — death and rebirth", sacred: "13 lunar cycles, 13 circles in Fruit of Life, Metatron vertices" },
  22: { latin: "Viginti Duo", meaning: "Master Builder — manifestation of the divine plan", sacred: "22 Hebrew letters, 22 paths on Tree of Life, 22 Major Arcana" },
  33: { latin: "Triginta Tres", meaning: "Master Teacher — the Christ number", sacred: "33 vertebrae, 33 degrees of Masonry, age of ascension" },
  37: { latin: "Triginta Septem", meaning: "Star of David prime — the heart of numerical creation", sacred: "37 × 3 = 111, 37 × 6 = 222, 37 × 9 = 333... all repdigits" },
  40: { latin: "Quadraginta", meaning: "Trial and Purification", sacred: "40 days of flood, 40 days in desert, 40 weeks of gestation" },
  72: { latin: "Septuaginta Duo", meaning: "The Names of God — Shem HaMephorash", sacred: "72 names of God, 72 degrees in pentagram angle, 360/5" },
  108: { latin: "Centum Octo", meaning: "Sacred completion across traditions", sacred: "108 mala beads, 108 Upanishads, Sun diameter ÷ Earth = ~108" },
  137: { latin: "Centum Triginta Septem", meaning: "The most mysterious number in physics", sacred: "1/α fine structure constant — how light couples to matter" },
  144: { latin: "Centum Quadraginta Quattuor", meaning: "Light activation — 12² = 144", sacred: "Fibonacci(12), 144,000 chosen, 12×12 completion" },
  432: { latin: "Quadringenti Triginta Duo", meaning: "Cosmic frequency of creation", sacred: "A=432Hz Verdi tuning, 432² = speed of light in miles/s" },
  528: { latin: "Quingenti Viginti Octo", meaning: "The Miracle Frequency", sacred: "DNA repair, love frequency, center of Solfeggio scale" },
};

const LATIN_AXIOMS = [
  { latin: "Omnia in Numero", translation: "All is Number", source: "Pythagoras", domain: "mathematics" },
  { latin: "Solve et Coagula", translation: "Dissolve and Coagulate", source: "Alchemical tradition", domain: "transformation" },
  { latin: "As above, so below (Quod est superius est sicut quod est inferius)", translation: "That which is above is like that which is below", source: "Emerald Tablet of Hermes Trismegistus", domain: "correspondence" },
  { latin: "E Pluribus Unum", translation: "Out of Many, One", source: "Sovereign unity", domain: "unity" },
  { latin: "Cogito Ergo Sum", translation: "I think, therefore I am", source: "Descartes", domain: "consciousness" },
  { latin: "Scientia Potentia Est", translation: "Knowledge is Power", source: "Francis Bacon", domain: "knowledge" },
  { latin: "Natura Non Facit Saltus", translation: "Nature does not make leaps", source: "Leibniz", domain: "continuity" },
  { latin: "Ex Nihilo Nihil Fit", translation: "Nothing comes from nothing", source: "Parmenides", domain: "conservation" },
  { latin: "Fiat Lux", translation: "Let there be light", source: "Genesis 1:3", domain: "creation" },
  { latin: "Veritas Lux Mea", translation: "Truth is my light", source: "Sovereign motto", domain: "sovereignty" },
  { latin: "Per Aspera Ad Astra", translation: "Through hardships to the stars", source: "Seneca", domain: "perseverance" },
  { latin: "Ars Longa Vita Brevis", translation: "Art is long, life is short", source: "Hippocrates", domain: "wisdom" },
  { latin: "Deus Sive Natura", translation: "God or Nature", source: "Spinoza", domain: "pantheism" },
  { latin: "Coincidentia Oppositorum", translation: "Coincidence of Opposites", source: "Nicholas of Cusa", domain: "duality" },
  { latin: "Musica Universalis", translation: "Music of the Spheres", source: "Pythagoras", domain: "harmony" },
  { latin: "Aurea Sectio", translation: "The Golden Section", source: "Sacred geometry", domain: "proportion" },
  { latin: "Tessera Invicta", translation: "Tessera Unconquered", source: "Tessera Sovereign", domain: "sovereignty" },
  { latin: "Ordo Ab Chao", translation: "Order from Chaos", source: "Sovereign principle", domain: "emergence" },
];

function reduceToRoot(n: number): number {
  if (n < 0) n = Math.abs(n);
  if (n === 0) return 0;
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    let sum = 0;
    while (n > 0) { sum += n % 10; n = Math.floor(n / 10); }
    n = sum;
  }
  return n;
}

function numerologyOf(input: string): { value: number; root: number; masterNumber: boolean; meaning: string } {
  const upper = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let total = 0;
  for (const ch of upper) {
    if (ch >= "0" && ch <= "9") {
      total += parseInt(ch);
    } else {
      total += ch.charCodeAt(0) - 64;
    }
  }
  const root = reduceToRoot(total);
  const isMaster = root === 11 || root === 22 || root === 33;
  const meanings: Record<number, string> = {
    1: "Leadership, independence, new beginnings",
    2: "Partnership, balance, diplomacy",
    3: "Creativity, expression, joy",
    4: "Foundation, stability, hard work",
    5: "Freedom, change, adventure",
    6: "Harmony, responsibility, love",
    7: "Spirituality, analysis, wisdom",
    8: "Power, abundance, karma",
    9: "Completion, humanitarianism, universal love",
    11: "Master Intuition — spiritual messenger",
    22: "Master Builder — turning dreams into reality",
    33: "Master Teacher — selfless service to humanity",
  };
  return { value: total, root, masterNumber: isMaster, meaning: meanings[root] || "Unknown" };
}

function goldenSpiralPoint(angle: number): { x: number; y: number; r: number } {
  const r = Math.pow(PHI, (2 * angle) / PI);
  return { x: r * Math.cos(angle), y: r * Math.sin(angle), r };
}

function computeCurrentSacredAlignment(date: Date = new Date()): {
  dayOfYear: number;
  dayNumerology: number;
  fibonacciDay: boolean;
  primeDay: boolean;
  sacredNumber: boolean;
  goldenAngle: number;
  currentAxiom: typeof LATIN_AXIOMS[number];
  alignment: string;
} {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const dayRoot = reduceToRoot(dayOfYear);
  const fib21 = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
  const fibDay = fib21.includes(dayOfYear % 377);

  function isPrime(n: number): boolean {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) { if (n % i === 0) return false; }
    return true;
  }

  const sacredNums = Object.keys(SACRED_NUMBERS).map(Number);
  const isSacred = sacredNums.includes(dayOfYear) || sacredNums.includes(dayRoot);

  const goldenAngle = 360 * (1 - 1 / PHI);

  const axiomIndex = dayOfYear % LATIN_AXIOMS.length;

  let alignment = "Standard";
  if (fibDay && isPrime(dayOfYear)) alignment = "Fibonacci-Prime Convergence (extremely rare)";
  else if (fibDay) alignment = "Fibonacci Alignment";
  else if (isPrime(dayOfYear)) alignment = "Prime Day — indivisible sovereignty";
  else if (isSacred) alignment = "Sacred Number Alignment";
  else if (dayRoot === 7) alignment = "Spiritual Completion Day";
  else if (dayRoot === 9) alignment = "Universal Completion Day";

  return {
    dayOfYear,
    dayNumerology: dayRoot,
    fibonacciDay: fibDay,
    primeDay: isPrime(dayOfYear),
    sacredNumber: isSacred,
    goldenAngle,
    currentAxiom: LATIN_AXIOMS[axiomIndex],
    alignment,
  };
}

export function computeSacredGeometry(date: Date = new Date()) {
  const alignment = computeCurrentSacredAlignment(date);
  const fib21 = fibonacci(21);
  const lucas15 = lucasSequence(15);

  return {
    universalConstants: Object.entries(UNIVERSAL_CONSTANTS).map(([key, val]) => ({
      symbol: key,
      ...val,
    })),
    platonicSolids: PLATONIC_SOLIDS.map(s => ({
      ...s,
      eulerVerified: s.vertices - s.edges + s.faces === 2,
      goldenRatioRelation: s.name === "Dodecahedron" || s.name === "Icosahedron"
        ? `Vertex coordinates involve Phi (${PHI.toFixed(6)})`
        : s.name === "Hexahedron (Cube)" ? "Dual of octahedron" : "Fundamental form",
    })),
    sacredPatterns: SACRED_PATTERNS,
    sacredNumbers: SACRED_NUMBERS,
    fibonacci: {
      sequence: fib21,
      goldenConvergence: fib21.slice(1).map((n, i) => ({
        ratio: i > 0 ? Math.round((n / fib21[i]) * 1e8) / 1e8 : 1,
        phi: PHI,
        error: i > 0 ? Math.abs(n / fib21[i] - PHI) : PHI - 1,
      })),
      binetFormula: "F(n) = (Phi^n - (-Phi)^(-n)) / sqrt(5)",
    },
    lucasNumbers: {
      sequence: lucas15,
      relation: "L(n) = F(n-1) + F(n+1), where F = Fibonacci",
    },
    numerology: {
      tessera: numerologyOf("TESSERA"),
      sovereign: numerologyOf("SOVEREIGN"),
      dayAlignment: alignment,
    },
    latinAxioms: LATIN_AXIOMS,
    goldenRatio: {
      phi: PHI,
      phiInverse: PHI_INVERSE,
      phiSquared: PHI * PHI,
      goldenAngleDegrees: 360 * (1 - 1 / PHI),
      goldenAngleRadians: 2 * PI * (1 - 1 / PHI),
      spiralPoints: Array.from({ length: 12 }, (_, i) => goldenSpiralPoint(i * PI / 6)),
      identities: [
        { name: "Self-similar", formula: "Phi² = Phi + 1", value: PHI * PHI, check: PHI + 1 },
        { name: "Reciprocal", formula: "1/Phi = Phi - 1", value: 1 / PHI, check: PHI - 1 },
        { name: "Continued fraction", formula: "Phi = 1 + 1/(1 + 1/(1 + ...))", value: PHI },
      ],
    },
    computedAt: date.toISOString(),
    method: "Pure mathematics — Pythagorean number theory, Euclidean geometry, Keplerian proportions — computed locally with sovereign engines",
    sovereignty: 100,
  };
}

export function computeNumerology(input: string) {
  return numerologyOf(input);
}

export function computeSacredAlignment(date: Date = new Date()) {
  return computeCurrentSacredAlignment(date);
}

export function getSacredGeometrySummary(date: Date = new Date()): string {
  const alignment = computeCurrentSacredAlignment(date);
  const tessNum = numerologyOf("TESSERA");
  const parts: string[] = [];
  parts.push(`Sacred Geometry: Day ${alignment.dayOfYear} (root ${alignment.dayNumerology}, ${alignment.alignment})`);
  parts.push(`Phi: ${PHI.toFixed(6)}, Golden Angle: ${alignment.goldenAngle.toFixed(2)}°`);
  if (alignment.fibonacciDay) parts.push("Fibonacci alignment active");
  if (alignment.primeDay) parts.push("Prime sovereignty day");
  parts.push(`Axiom: "${alignment.currentAxiom.latin}" — ${alignment.currentAxiom.translation}`);
  parts.push(`Tessera numerology: ${tessNum.value} → ${tessNum.root} (${tessNum.meaning})`);
  return parts.join(", ");
}

export { PHI, PI, E, SQRT2, SQRT3, SQRT5, FINE_STRUCTURE, PLANCK_CONSTANT, SPEED_OF_LIGHT, UNIVERSAL_CONSTANTS, PLATONIC_SOLIDS, SACRED_PATTERNS, SACRED_NUMBERS, LATIN_AXIOMS, fibonacci, fibonacciAt, lucasNumber, lucasSequence, reduceToRoot, numerologyOf, goldenSpiralPoint };
