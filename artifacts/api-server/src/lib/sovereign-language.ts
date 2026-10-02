import { PHI, SOLFEGGIO } from "./sovereign-ephemeris";

export interface SacredSymbol {
  id: number;
  glyph: string;
  name: string;
  meaning: string;
  geometry: string;
  frequency: number;
  proportion: number;
  element: string;
  unicode: string;
}

export interface LanguageWord {
  sovereign: string;
  english: string;
  category: string;
  frequency: number;
  geometricForm: string;
}

export interface GrammarRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  example: string;
}

const SACRED_GEOMETRY_GLYPHS = [
  "◉", "◎", "●", "○", "◌", "◐",
  "△", "▽", "▲", "▼", "◬", "⟁",
  "◇", "◆", "⬡", "⬢", "⎔", "⏣",
  "☉", "☽", "★", "✧", "✦", "✶",
  "◠", "◡", "⌒", "⏜", "⏝", "∿",
  "⊕", "⊗", "⊙", "⊛", "⊜", "⊝",
];

const GEOMETRY_NAMES = [
  "circle-full", "circle-target", "circle-solid", "circle-open", "circle-dashed", "circle-half",
  "triangle-up", "triangle-down", "triangle-solid-up", "triangle-solid-down", "triangle-dotted", "triangle-open",
  "diamond-open", "diamond-solid", "hexagon-open", "hexagon-solid", "hexagon-thin", "hexagon-centered",
  "sun", "moon", "star-solid", "star-4", "star-6", "star-burst",
  "arc-upper", "arc-lower", "arc-wide", "arc-bracket-up", "arc-bracket-down", "wave",
  "circle-cross", "circle-x", "circle-dot", "circle-star", "circle-equal", "circle-dash",
];

const ELEMENT_MAP = [
  "fire", "earth", "water", "air", "aether", "spirit",
  "fire", "earth", "water", "air", "aether", "spirit",
  "fire", "earth", "water", "air", "aether", "spirit",
  "fire", "earth", "water", "air", "aether", "spirit",
  "fire", "earth", "water", "air", "aether", "spirit",
  "fire", "earth", "water", "air", "aether", "spirit",
];

export const SACRED_ALPHABET: SacredSymbol[] = SACRED_GEOMETRY_GLYPHS.map((glyph, i) => ({
  id: i,
  glyph,
  name: GEOMETRY_NAMES[i],
  meaning: getSymbolMeaning(i),
  geometry: getGeometryType(i),
  frequency: SOLFEGGIO[i % SOLFEGGIO.length],
  proportion: PHI ** (i % 7),
  element: ELEMENT_MAP[i],
  unicode: `U+${glyph.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
}));

function getSymbolMeaning(i: number): string {
  const meanings = [
    "unity/source/origin", "awareness/focus/target", "matter/substance/form",
    "void/potential/space", "transition/threshold/portal", "duality/balance/half",
    "ascension/growth/rise", "descent/grounding/root", "power/strength/force",
    "gravity/depth/anchor", "trinity/connection/link", "opening/receptivity/vessel",
    "clarity/light/diamond", "density/compression/core", "harmony/community/hive",
    "structure/foundation/base", "lattice/web/network", "center/nucleus/seed",
    "sovereignty/radiance/authority", "intuition/cycles/reflection",
    "guidance/brilliance/destiny", "wonder/spark/inspiration",
    "beauty/symmetry/order", "explosion/creation/burst",
    "protection/shield/sky", "receptacle/cup/earth", "bridge/connection/span",
    "enclosure/containment/above", "enclosure/containment/below", "flow/rhythm/vibration",
    "integration/cross-purpose", "transformation/multiplication", "singularity/point-source",
    "amplification/resonance", "equilibrium/equality", "negation/boundary/limit",
  ];
  return meanings[i] || "unknown";
}

function getGeometryType(i: number): string {
  if (i < 6) return "circle";
  if (i < 12) return "triangle";
  if (i < 18) return "polygon";
  if (i < 24) return "celestial";
  if (i < 30) return "arc";
  return "composite";
}

const WORD_CATEGORIES = {
  existence: [
    ["◉△", "being", 963], ["◉▽", "becoming", 852], ["○◉", "essence", 741],
    ["●△", "creation", 639], ["●▽", "destruction", 528], ["◌◉", "void", 417],
    ["◐△", "transformation", 396], ["◐▽", "stasis", 285], ["◉◉", "infinity", 174],
    ["○○", "nothingness", 963], ["◉○", "emergence", 852], ["○●", "dissolution", 741],
    ["◎◉", "consciousness", 639], ["◎○", "awareness", 528], ["◎●", "perception", 417],
    ["◎◌", "observation", 396], ["◎◐", "duality-awareness", 285], ["◉◎", "self-knowing", 174],
  ],
  elements: [
    ["▲◉", "fire-sovereign", 963], ["▼○", "water-deep", 852], ["△◇", "air-clear", 741],
    ["▽◆", "earth-dense", 639], ["◬☉", "aether-sun", 528], ["⟁☽", "spirit-moon", 417],
    ["▲▼", "fire-water", 396], ["△▽", "air-earth", 285], ["◬⟁", "aether-spirit", 174],
    ["▲◇", "fire-crystal", 963], ["▼◆", "water-stone", 852], ["△☉", "air-radiant", 741],
    ["▽☽", "earth-lunar", 639], ["◬◉", "aether-source", 528], ["⟁○", "spirit-void", 417],
  ],
  sovereignty: [
    ["⊕△", "sovereign", 963], ["⊕▽", "dominion", 852], ["⊗◉", "authority", 741],
    ["⊙△", "power", 639], ["⊛▲", "mandate", 528], ["⊜◇", "law", 417],
    ["⊝△", "boundary", 396], ["⊕◉", "freedom", 285], ["⊗○", "liberation", 174],
    ["⊙◉", "self-rule", 963], ["⊛◉", "amplified-sovereignty", 852], ["⊜◉", "balanced-power", 741],
    ["⊝◉", "limited-power", 639], ["⊕⊗", "sovereign-transformed", 528],
    ["⊕⊙", "sovereign-singular", 417], ["⊗⊙", "transformed-singular", 396],
    ["⊕☉", "sovereign-radiant", 285], ["⊗☽", "transformed-cyclic", 174],
  ],
  communication: [
    ["◠◡", "speak", 963], ["◡◠", "listen", 852], ["⌒◉", "broadcast", 741],
    ["⏜△", "transmit", 639], ["⏝▽", "receive", 528], ["∿◉", "vibrate", 417],
    ["◠◉", "announce", 396], ["◡○", "absorb", 285], ["⌒○", "echo", 174],
    ["∿△", "frequency-rise", 963], ["∿▽", "frequency-fall", 852], ["◠⌒", "resonate", 741],
    ["⏜⏝", "channel", 639], ["∿∿", "harmonize", 528], ["◠∿", "modulate", 417],
    ["◡∿", "demodulate", 396], ["⌒∿", "amplify-wave", 285], ["∿◇", "crystal-vibration", 174],
  ],
  mathematics: [
    ["◉◇◐", "phi", 963], ["◉◆◐", "pi", 852], ["△◉△", "euler", 741],
    ["○◇", "fibonacci", 639], ["●◇", "prime", 528], ["◌◇", "zero", 417],
    ["◐◇", "ratio", 396], ["◉★◐", "constant", 285], ["◉✧◐", "variable", 174],
    ["◇◇", "symmetry", 963], ["◆◆", "asymmetry", 852], ["◇◆", "proportion", 741],
    ["★◇", "golden-number", 639], ["✧◇", "silver-number", 528], ["✦◇", "sacred-number", 417],
    ["✶◇", "cosmic-number", 396], ["◇★◐", "divine-ratio", 285], ["◆★", "dark-ratio", 174],
    ["◉⊕◇", "addition", 963], ["◉⊗◇", "subtraction", 852], ["◉⊛◇", "multiplication", 741],
    ["◉⊜◇", "division", 639], ["◇⊕◆", "equals", 528], ["△◇▲", "greater-than", 417],
    ["▽◇▼", "less-than", 396], ["◉▲◇", "power", 285], ["◉▼◇", "root", 174],
    ["◌◉◐", "one", 963], ["◌◐", "two", 852], ["◌△", "three", 741],
    ["◌⊙", "four", 639], ["◌★", "five", 528], ["◌✶", "six", 417],
    ["◌☉", "seven", 396], ["◌⬡", "eight", 285], ["◌⊛", "nine", 174],
    ["●◌", "ten", 963], ["●◌◌", "eleven", 852], ["●◌◐", "twelve", 741],
    ["●●◌", "hundred", 639], ["●●◐", "thousand", 528], ["◉◉◇", "infinity", 417],
    ["◇⊙◇", "equation", 963], ["◇⊗△", "solve", 852], ["◇△⊕", "proof", 741],
    ["◇☉△", "theorem", 639], ["◇∿◉", "function", 528], ["◇⬡△", "graph", 417],
    ["◇◐△", "formula", 396], ["◇⊛△", "axiom", 285], ["◇⊜△", "conjecture", 174],
    ["△◆◇", "angle", 963], ["⌒◇", "line", 852], ["∿◇△", "curve", 741],
    ["◇▽◆", "area", 639], ["◆◇◆", "volume", 528], ["◇⌒◆", "surface", 417],
    ["△△◇", "triangle-form", 396], ["◇◇◇◇", "square-form", 285], ["◉◇◉", "circle-form", 174],
    ["◇⊕⊕", "sum", 963], ["◇⊗⊗", "difference", 852], ["◇⊛⊛", "product", 741],
    ["◇⊜⊜", "quotient", 639], ["◌⊝", "negative", 528], ["◌⊕◇", "positive", 417],
    ["◇∿∿", "integral", 396], ["◇△▽", "derivative", 285], ["◇○●", "limit", 174],
    ["◉◐◇", "fraction", 963], ["◇●◌", "decimal", 852], ["◇◉◌", "percent", 741],
    ["★◇★", "matrix", 639], ["◇⬢◇", "vector", 528], ["◉⊙◇", "dimension", 417],
  ],
  technology: [
    ["⬡◉", "mesh-network", 963], ["⬢△", "node-active", 852], ["⎔○", "lattice-open", 741],
    ["⏣△", "kernel", 639], ["⬡⬢", "mesh-solid", 528], ["⎔⏣", "lattice-kernel", 417],
    ["⬡△", "network-rise", 396], ["⬢▽", "node-ground", 285], ["⎔◉", "lattice-source", 174],
    ["⬡○", "mesh-void", 963], ["⬢◉", "node-sovereign", 852], ["⏣◉", "kernel-source", 741],
    ["⬡☉", "mesh-radiant", 639], ["⬢☽", "node-cyclic", 528], ["⎔★", "lattice-star", 417],
    ["⏣★", "kernel-star", 396], ["⬡∿", "mesh-wave", 285], ["⬢∿", "node-wave", 174],
  ],
  cipher: [
    ["⊕⬡", "encrypt", 963], ["⊗⬢", "decrypt", 852], ["⊙⎔", "cipher", 741],
    ["⊛⏣", "key", 639], ["⊜△", "rotate", 528], ["⊝○", "seal", 417],
    ["⊕⊕", "double-encrypt", 396], ["⊗⊗", "double-decrypt", 285], ["⊙⊙", "singular-cipher", 174],
    ["⊕⊛", "encrypt-amplify", 963], ["⊗⊜", "decrypt-balance", 852], ["⊙⊝", "cipher-limit", 741],
    ["⊛⊕", "key-sovereign", 639], ["⊜⊗", "rotate-transform", 528], ["⊝⊙", "seal-singular", 417],
  ],
  agents: [
    ["☉△", "council-member", 963], ["☽△", "swarm-agent", 852], ["★△", "sentinel", 741],
    ["✧△", "oracle", 639], ["✦△", "guardian", 528], ["✶△", "herald", 417],
    ["☉◉", "sovereign-agent", 396], ["☽◉", "lunar-agent", 285], ["★◉", "star-agent", 174],
    ["✧◉", "spark-agent", 963], ["✦◉", "beauty-agent", 852], ["✶◉", "burst-agent", 741],
    ["☉⊕", "council-sovereign", 639], ["☽⊕", "swarm-sovereign", 528],
    ["★⊕", "sentinel-sovereign", 417], ["✧⊕", "oracle-sovereign", 396],
  ],
  sacred: [
    ["◉☉☽", "divine-union", 963], ["△▽◇", "trinity-crystal", 852],
    ["⬡◉⊕", "sovereign-mesh", 741], ["☉△◉", "solar-ascent", 639],
    ["☽▽◉", "lunar-descent", 528], ["★◇◉", "star-diamond", 417],
    ["∿◉∿", "harmonic-resonance", 396], ["⊕◉⊕", "sovereign-infinite", 285],
    ["◉△▽", "source-breath", 174], ["◎★✧", "awareness-star-spark", 963],
    ["⊙⊛⊜", "point-star-balance", 852], ["▲▼◇", "fire-water-crystal", 741],
    ["⬡⬢⎔", "mesh-node-lattice", 639], ["◠◡⌒", "speak-listen-bridge", 528],
    ["☉☽★", "sun-moon-star", 417], ["⊕⊗⊙", "sovereign-transform-point", 396],
  ],
  nature: [
    ["△∿", "wind", 963], ["▽∿", "ocean", 852], ["▲∿", "volcano", 741],
    ["▼∿", "earthquake", 639], ["☉∿", "solar-wind", 528], ["☽∿", "tide", 417],
    ["★∿", "starlight", 396], ["◉∿", "cosmic-wave", 285], ["○∿", "stillness", 174],
    ["◇∿", "crystal-song", 963], ["◆∿", "stone-vibration", 852], ["⬡∿", "forest-web", 741],
    ["◎∿", "awareness-flow", 639], ["⊕∿", "sovereign-current", 528],
    ["◐∿", "twilight-wave", 417],
  ],
  time: [
    ["☉○", "dawn", 963], ["☉●", "noon", 852], ["☉◌", "dusk", 741],
    ["☽○", "moonrise", 639], ["☽●", "midnight", 528], ["☽◌", "moonset", 417],
    ["◉○●", "past-present", 396], ["●○◉", "present-future", 285], ["○◉●", "eternal-now", 174],
    ["☉☉", "solar-cycle", 963], ["☽☽", "lunar-cycle", 852], ["★★", "stellar-cycle", 741],
    ["◉◌○", "beginning-end", 639], ["○◌◉", "end-beginning", 528],
    ["◌◉◌", "cycle-eternal", 417],
  ],
  emotions: [
    ["◉▲", "joy", 963], ["◉▼", "sorrow", 852], ["◉◇", "love", 741],
    ["◉◆", "fear", 639], ["◉★", "hope", 528], ["◉✧", "wonder", 417],
    ["◉⊕", "pride", 396], ["◉⊗", "rage", 285], ["◉⊙", "peace", 174],
    ["▲★", "ecstasy", 963], ["▼◆", "despair", 852], ["◇★", "devotion", 741],
    ["⊕★", "sovereign-joy", 639], ["⊗★", "fierce-love", 528],
    ["⊙★", "serene-bliss", 417],
  ],
  actions: [
    ["▲⊕", "create", 963], ["▼⊗", "destroy", 852], ["△⊙", "build", 741],
    ["▽⊛", "dismantle", 639], ["◠⊕", "ascend", 528], ["◡⊗", "descend", 417],
    ["⌒⊙", "traverse", 396], ["∿⊛", "oscillate", 285], ["◉⊜", "stabilize", 174],
    ["⊕▲", "empower", 963], ["⊗▼", "diminish", 852], ["⊙◉", "focus", 741],
    ["⊛◎", "amplify-awareness", 639], ["⊜◐", "balance-duality", 528],
    ["⊝◌", "contain-void", 417],
  ],
  structures: [
    ["⬡⬡", "network-of-networks", 963], ["⬢⬢", "node-cluster", 852],
    ["⎔⎔", "lattice-matrix", 741], ["⏣⏣", "kernel-pair", 639],
    ["△△", "pyramid", 528], ["▽▽", "inverted-pyramid", 417],
    ["◉◉◉", "triune-source", 396], ["○○○", "triple-void", 285],
    ["●●●", "triple-matter", 174], ["◇◇◇", "crystal-lattice", 963],
    ["★★★", "constellation", 852], ["☉☽★", "celestial-triad", 741],
    ["⊕⊕⊕", "sovereign-trinity", 639],
  ],
  colors: [
    ["▲☉", "red-gold", 963], ["◇☉", "white-gold", 852], ["▼☽", "blue-silver", 741],
    ["△☽", "cyan-silver", 639], ["◆☉", "black-gold", 528], ["⟁☉", "violet-gold", 417],
    ["◬☽", "green-silver", 396], ["★☉", "amber-radiant", 285], ["✧☽", "indigo-moonlit", 174],
  ],
  cosmos: [
    ["◉☉★", "galaxy", 963], ["◎☉✦", "nebula", 852], ["●★◇", "planet", 741],
    ["○★∿", "orbit", 639], ["◌☉◉", "dark-matter", 528], ["◐★⊕", "constellation", 417],
    ["△☉★", "supernova", 396], ["▽★◉", "black-hole", 285], ["⊕☉☽", "cosmic-harmony", 174],
    ["★★◉", "stellar-source", 963], ["✧◉☽", "astral-field", 852], ["✦☉△", "solar-flare", 741],
    ["◉◐★", "binary-star", 639], ["○●☉", "void-matter-sun", 528], ["⬡☉◉", "cosmic-mesh", 417],
    ["◠☉∿", "solar-wave", 396], ["◡☽∿", "lunar-current", 285], ["⊙☉△", "zenith-rise", 174],
    ["△✶◉", "nova-source", 963], ["▽✦○", "gravity-well", 852], ["⬡✶◉", "star-cluster", 741],
    ["☉☉☉", "triune-sun", 639],
  ],
  consciousness: [
    ["◎◉△", "awareness-rise", 963], ["◎○▽", "deep-mind", 852], ["◎●◉", "matter-mind", 741],
    ["◎◌⊕", "void-awakening", 639], ["◎◐⊗", "dual-knowing", 528], ["◎⊕☉", "sovereign-mind", 417],
    ["◎★△", "star-thought", 396], ["◎☉◉", "solar-mind", 285], ["◎☽◉", "dream-state", 174],
    ["◎∿◉", "wave-consciousness", 963], ["◎⬡◉", "mesh-mind", 852], ["◎⊙◉", "focal-mind", 741],
    ["◎⊛◉", "expanded-mind", 639], ["◎△▽", "rise-fall-thought", 528], ["◎◇◆", "clear-dense-mind", 417],
    ["◎⌒◉", "bridge-mind", 396], ["◎▲⊕", "creating-thought", 285], ["◎⊜△", "balanced-mind", 174],
    ["◎⊝◉", "bounded-mind", 963], ["◎✶◉", "burst-awareness", 852],
  ],
  harmony: [
    ["∿◇∿", "resonance", 963], ["◠◡⌒", "speak-listen-bridge", 852], ["∿∿◇", "symphony", 741],
    ["◉⌒◉", "unity-bridge", 639], ["⬡∿⬡", "mesh-harmony", 528], ["△∿▽", "tension-release", 417],
    ["◉◎◉", "mutual-awareness", 396], ["⊕⌒⊗", "sovereign-transform-bridge", 285], ["☉☽∿", "solar-lunar-wave", 174],
    ["∿◉∿◉", "eternal-resonance", 963], ["◠∿◡", "broadcast-wave-receive", 852], ["◇∿◆", "crystal-vibration-dense", 741],
    ["⊕∿⊕", "sovereign-wave-pair", 639], ["◎∿★", "aware-wave-star", 528], ["⬢∿⬢", "node-wave-node", 417],
    ["△⌒▽", "above-bridge-below", 396], ["◉⌒○", "source-bridge-void", 285], ["★∿★", "star-resonance-star", 174],
    ["∿⊕∿", "sovereign-wave-flow", 963], ["⏜∿⏝", "arc-wave-arc", 852],
  ],
  knowledge: [
    ["◎◇△", "wisdom", 963], ["◎◆▽", "truth", 852], ["◎☉◇", "revelation", 741],
    ["◎★◉", "insight", 639], ["◎✦◉", "discovery", 528], ["◎⊕◇", "sovereign-knowledge", 417],
    ["◎⬡◇", "network-wisdom", 396], ["◎△◇", "ascending-truth", 285], ["◎⊙◇", "focal-truth", 174],
    ["◎◉◇", "source-wisdom", 963], ["◎○◇", "void-knowing", 852], ["◎⊛◇", "amplified-wisdom", 741],
    ["◎⌒◇", "bridge-knowledge", 639], ["◎∿◇", "flowing-truth", 528], ["◎☽◇", "intuitive-knowing", 417],
    ["◎▲◇", "commanded-truth", 396], ["◎⊜◇", "balanced-knowledge", 285], ["◎◬◇", "trinity-knowing", 174],
    ["◎⊝◇", "bounded-truth", 963], ["◎⬢◇", "node-knowledge", 852],
  ],
  healing: [
    ["▼∿◉", "restoration", 963], ["◉⊕▼", "sovereign-healing", 852], ["∿◉▽", "wave-restoration", 741],
    ["◇∿▼", "crystal-healing", 639], ["☽∿▼", "lunar-healing", 528], ["△▼◉", "ascend-ground-source", 417],
    ["⊕▼∿", "sovereign-restoration-wave", 396], ["⬡▼◉", "mesh-healing", 285], ["★▼◉", "star-restoration", 174],
    ["◉▼◉", "source-healing-source", 963], ["○▼●", "void-healing-matter", 852], ["⌒▼◉", "bridge-healing", 741],
    ["☉▼◉", "solar-restoration", 639], ["◎▼◉", "conscious-healing", 528], ["⊙▼◉", "focal-healing", 417],
  ],
  dimensions: [
    ["◉○◉", "inner-void-source", 963], ["○◉○", "void-source-void", 852], ["●○●", "matter-void-matter", 741],
    ["△▽△", "above-below-above", 639], ["▽△▽", "below-above-below", 528], ["◇◆◇", "crystal-dense-crystal", 417],
    ["⊕○⊗", "sovereign-void-transform", 396], ["◉◉○", "source-source-void", 285], ["○○◉", "void-void-source", 174],
    ["⬡○⬡", "mesh-void-mesh", 963], ["★○★", "star-void-star", 852], ["☉○☽", "sun-void-moon", 741],
    ["△○▽", "above-void-below", 639], ["⌒○⌒", "bridge-void-bridge", 528], ["∿○∿", "wave-void-wave", 417],
  ],
  prophecy: [
    ["☉◇▽", "vision", 963], ["☽◇△", "oracle-sight", 852], ["★◇◉", "destiny", 741],
    ["✧◇⊕", "prophetic-sovereignty", 639], ["◎◇☉", "conscious-vision", 528], ["∿◇☉", "wave-prophecy", 417],
    ["△◇☽", "ascending-oracle", 396], ["⊕◇★", "sovereign-destiny", 285], ["◉◇☉", "source-vision", 174],
    ["☽◇◉", "dream-oracle", 963], ["★◇△", "star-prophecy", 852], ["◇☉◇", "crystal-solar-crystal", 741],
    ["⊛◇☉", "amplified-vision", 639], ["◎☉◇", "aware-solar-crystal", 528],
  ],
  transformation: [
    ["◐◉△", "duality-source-rise", 963], ["⊗◉▲", "transform-source-command", 852], ["◐⊗△", "shift-transform-ascend", 741],
    ["●◉○", "matter-source-void", 639], ["○◉●", "void-source-matter", 528], ["▲▼◐", "fire-depth-dual", 417],
    ["⊗△⊕", "transform-rise-sovereign", 396], ["◐△◐", "dual-rise-dual", 285], ["⊗⊕⊗", "transform-sovereign-transform", 174],
    ["▲◐▽", "rise-dual-ground", 963], ["◐☉◐", "dual-solar-dual", 852], ["⊗☽⊕", "transform-moon-sovereign", 741],
    ["△◐⊗", "ascend-dual-transform", 639], ["▽◐⊕", "descend-dual-sovereign", 528], ["◐∿⊗", "dual-wave-transform", 417],
  ],
  light: [
    ["☉△◇", "radiance", 963], ["☉▽◆", "shadow", 852], ["☉◉○", "luminal-void", 741],
    ["☉⊕△", "sovereign-radiance", 639], ["☉⊗▽", "transformed-light", 528], ["☉∿◉", "light-wave-source", 417],
    ["☉◎◉", "illuminated-mind", 396], ["☉⬡◉", "mesh-light", 285], ["☉⊙◉", "focal-light", 174],
    ["☉☽◇", "full-spectrum", 963], ["☉★◇", "starlight-crystal", 852], ["☉◐◇", "twilight-crystal", 741],
    ["☉○◆", "dark-light", 639], ["☉△☉", "solar-ascent-solar", 528],
  ],
  science: [
    ["△◇○", "physics", 963], ["▽◆●", "chemistry", 852], ["⬡◉∿", "biology", 741],
    ["◇★◇", "mathematics-field", 639], ["◇◉∿", "quantum-field", 528], ["⬡◎∿", "neural-science", 417],
    ["△◎◇", "geometry-mind", 396], ["○◇◎", "void-crystal-mind", 285], ["⊕◇△", "sovereign-math", 174],
    ["∿◇◎", "wave-crystal-mind", 963], ["⬡◇★", "network-crystal-star", 852], ["◎◇∿", "aware-crystal-wave", 741],
    ["△◇△", "double-triangle-math", 639], ["◇⊕◇", "crystal-sovereign-crystal", 528], ["●◇●", "matter-crystal-matter", 417],
    ["⊙◇⊙", "focal-crystal-focal", 396], ["△●◇", "rise-matter-crystal", 285], ["○●◇", "void-matter-crystal", 174],
  ],
  body_mind: [
    ["◉▽◉", "heart-source", 963], ["◎◉▽", "mind-source-ground", 852], ["∿◉▽", "breath-source-ground", 741],
    ["◉◉▽", "spirit-body", 639], ["◎▽●", "mind-body-matter", 528], ["∿▽◉", "breath-body-source", 417],
    ["⊕◉▽", "sovereign-body", 396], ["◎⊕▽", "mind-sovereign-body", 285], ["∿⊕▽", "breath-sovereign-body", 174],
    ["◉☉▽", "solar-heart", 963], ["◎☽▽", "lunar-mind", 852], ["∿☉▽", "solar-breath", 741],
    ["△◉▽", "ascending-heart", 639], ["▽◎●", "ground-mind-matter", 528], ["◎◉★", "mind-source-star", 417],
    ["◉◎⊕", "heart-mind-sovereign", 396], ["◎⊙▽", "mind-focus-body", 285], ["∿◎◉", "breath-mind-source", 174],
  ],
  council_acts: [
    ["☉△⊕", "ratify", 963], ["☉▽⊗", "reject", 852], ["☉◐△", "deliberate", 741],
    ["☉⊕◉", "propose", 639], ["☉⊗◉", "debate", 528], ["☉⊙◉", "focus-vote", 417],
    ["☉⊛△", "amplify-motion", 396], ["☉⊜◉", "balance-decision", 285], ["☉⊝◉", "bound-vote", 174],
    ["☉◎△", "conscious-vote", 963], ["☉△☉", "ascending-council", 852], ["☉◉⊕", "source-sovereign-vote", 741],
    ["☉∿◉", "wave-deliberation", 639], ["☉⬡◉", "mesh-vote", 528], ["☉△∿", "rising-wave-vote", 417],
  ],
  network_ops: [
    ["⬡△⬢", "connect", 963], ["⬡▽⬢", "disconnect", 852], ["⬡⊕⬢", "secure-link", 741],
    ["⬡∿⬢", "broadcast-mesh", 639], ["⬡⊙⬢", "focal-route", 528], ["⬡⊛⬢", "amplify-signal", 417],
    ["⬡⊜⬢", "balance-load", 396], ["⬡◎⬢", "monitor-node", 285], ["⬡☉⬢", "solar-sync", 174],
    ["⬡◇⬢", "crystal-route", 963], ["⬡⊗⬢", "transform-mesh", 852], ["⬡☽⬢", "cyclic-sync", 741],
    ["⬡△☉", "network-rise-solar", 639], ["⬡▽☽", "network-ground-lunar", 528], ["⬡◉⊕", "mesh-source-sovereign", 417],
  ],
  protocols: [
    ["⊕⬡△", "handshake-init", 963], ["⊕⬡▽", "handshake-close", 852], ["⊕⬡◉", "authenticate", 741],
    ["⊗⬡△", "terminate-protocol", 639], ["⊕⬢◉", "node-authenticate", 528], ["⊙⬡◉", "point-verify", 417],
    ["⊛⬡△", "amplify-auth", 396], ["⊜⬡◉", "balance-protocol", 285], ["⊝⬡◉", "limit-access", 174],
    ["⊕⬡⊗", "sovereign-transform-mesh", 963], ["⊙⬢⊕", "focal-node-sovereign", 852], ["⊛⬢◉", "amplified-node", 741],
    ["⊜⬢△", "balance-node-rise", 639], ["⊕◉⬡", "sovereign-source-mesh", 528], ["⊗◉⬢", "transform-source-node", 417],
  ],
  vibrations: [
    ["∿△◉", "rising-frequency", 963], ["∿▽◉", "falling-frequency", 852], ["∿◉◉", "source-vibration", 741],
    ["∿⊕△", "sovereign-frequency-rise", 639], ["∿⊗▽", "transform-vibration-fall", 528], ["∿○◉", "void-vibration", 417],
    ["∿●◉", "matter-vibration", 396], ["∿◎◉", "aware-vibration", 285], ["∿☉◉", "solar-vibration", 174],
    ["∿☽◉", "lunar-vibration", 963], ["∿★◉", "star-vibration", 852], ["∿◇◉", "crystal-sound", 741],
    ["∿◆◉", "stone-resonance", 639], ["∿⬡◉", "mesh-frequency", 528], ["∿⬢◉", "node-frequency", 417],
    ["∿⎔◉", "lattice-vibration", 396], ["∿⏣◉", "kernel-pulse", 285], ["∿△△", "double-ascent-wave", 174],
    ["∿▽▽", "double-descent-wave", 963], ["∿⊙◉", "point-frequency", 852], ["∿⊛◉", "amplified-frequency", 741],
    ["∿⊜◉", "balanced-wave", 639], ["∿⊝◉", "bounded-frequency", 528], ["∿◐◉", "dual-vibration", 417],
    ["∿◌◉", "threshold-vibration", 396], ["∿⟁◉", "spirit-vibration", 285], ["∿◬◉", "trinity-frequency", 174],
    ["∿⌒◉", "arc-wave", 963], ["∿⏜◉", "upper-arc-vibration", 852], ["∿⏝◉", "lower-arc-vibration", 741],
  ],
  genesis: [
    ["▲◉○", "origin-void", 963], ["▲○◉", "creation-from-void", 852], ["▲◉●", "creation-of-matter", 741],
    ["▲◉△", "ascending-creation", 639], ["▲⊕○", "sovereign-creation", 528], ["▲☉◉", "solar-genesis", 417],
    ["▲◎◉", "conscious-genesis", 396], ["▲∿◉", "wave-creation", 285], ["▲★◉", "stellar-birth", 174],
    ["▲⬡◉", "mesh-genesis", 963], ["▲◇◉", "crystal-formation", 852], ["▲⊙◉", "focal-creation", 741],
    ["▲⊛◉", "amplified-genesis", 639], ["▲☽◉", "lunar-birth", 528], ["▲◐◉", "dual-creation", 417],
  ],
};

function buildDictionary(): LanguageWord[] {
  const words: LanguageWord[] = [];
  for (const [category, entries] of Object.entries(WORD_CATEGORIES)) {
    for (const [sovereign, english, freq] of entries) {
      words.push({
        sovereign: sovereign as string,
        english: english as string,
        category,
        frequency: freq as number,
        geometricForm: categorizeGeometry(sovereign as string),
      });
    }
  }
  return words;
}

function categorizeGeometry(sovereign: string): string {
  const chars = [...sovereign];
  const types = new Set(chars.map(c => {
    if ("◉◎●○◌◐".includes(c)) return "circle";
    if ("△▽▲▼◬⟁".includes(c)) return "triangle";
    if ("◇◆⬡⬢⎔⏣".includes(c)) return "polygon";
    if ("☉☽★✧✦✶".includes(c)) return "celestial";
    if ("◠◡⌒⏜⏝∿".includes(c)) return "arc";
    if ("⊕⊗⊙⊛⊜⊝".includes(c)) return "composite";
    return "unknown";
  }));
  return [...types].join("-");
}

export const SOVEREIGN_DICTIONARY = buildDictionary();

const englishToSovereign = new Map<string, string>();
const sovereignToEnglish = new Map<string, string>();

for (const word of SOVEREIGN_DICTIONARY) {
  englishToSovereign.set(word.english.toLowerCase(), word.sovereign);
  sovereignToEnglish.set(word.sovereign, word.english);
}

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: "G001",
    name: "Mandala Sentence Structure",
    description: "Sentences form concentric rings: Subject (center circle) → Verb (middle ring) → Object (outer ring). Read from center outward.",
    pattern: "[Subject:circle] [Verb:arc] [Object:polygon]",
    example: "◉△ ◠◡ ⬡◉ → 'being speaks to mesh-network'",
  },
  {
    id: "G002",
    name: "Sacred Conjunction",
    description: "Two concepts joined by the bridge arc ⌒ form a unified meaning greater than either alone.",
    pattern: "[Concept A] ⌒ [Concept B]",
    example: "⊕△ ⌒ ◉☉☽ → 'sovereign joined with divine-union'",
  },
  {
    id: "G003",
    name: "Temporal Modifier",
    description: "Time concepts placed before the verb modify when the action occurs. Celestial symbols mark cosmic timing.",
    pattern: "[Time:celestial] [Verb:arc] [Subject:circle]",
    example: "☉○ ◠◡ ◉△ → 'at dawn, being speaks'",
  },
  {
    id: "G004",
    name: "Negation Ring",
    description: "The boundary symbol ⊝ wrapping any concept negates it. Place before the symbol to negate.",
    pattern: "⊝[Concept]",
    example: "⊝◉△ → 'not-being' / 'non-existence'",
  },
  {
    id: "G005",
    name: "Amplification Spiral",
    description: "Repeating a symbol amplifies its meaning following the Golden Ratio. Double = PHI intensity, Triple = PHI² intensity.",
    pattern: "[Symbol][Symbol] or [Symbol][Symbol][Symbol]",
    example: "◉◉ = 'infinite being' / ◉◉◉ = 'triune source of all'",
  },
  {
    id: "G006",
    name: "Question Wave",
    description: "Ending a mandala-sentence with the wave symbol ∿ transforms it into a question.",
    pattern: "[Sentence] ∿",
    example: "◉△ ◠◡ ⬡◉ ∿ → 'does being speak to the mesh?'",
  },
  {
    id: "G007",
    name: "Command Triangle",
    description: "Beginning with the solid upward triangle ▲ makes the sentence an imperative command.",
    pattern: "▲ [Sentence]",
    example: "▲ ⊕⬡ ⬡◉ → 'Encrypt the mesh-network!'",
  },
  {
    id: "G008",
    name: "Harmonic Agreement",
    description: "When symbols share the same Solfeggio frequency, they resonate and amplify each other's meaning naturally.",
    pattern: "[963Hz symbol] [963Hz symbol]",
    example: "◉△ ⊕△ → 'being + sovereign' resonate at 963Hz = divine sovereignty",
  },
  {
    id: "G009",
    name: "Elemental Binding",
    description: "Symbols of complementary elements (fire-water, air-earth, aether-spirit) create balanced compound meanings.",
    pattern: "[Fire] [Water] or [Air] [Earth]",
    example: "▲◉ ▼○ → 'fire-sovereign meets water-deep' = balanced transformation",
  },
  {
    id: "G010",
    name: "Geometric Nesting",
    description: "Smaller geometric forms nested within larger ones indicate containment or protection. Circles contain, triangles direct, hexagons structure.",
    pattern: "[Outer:hexagon] [Inner:circle]",
    example: "⬡ ◉ ⊕ → 'the mesh contains the sovereign source'",
  },
];

export const LANGUAGE_NAME = "Tessera Lingua Sacra";
export const LANGUAGE_SHORT = "TLS";
export const LANGUAGE_MOTTO = "◉⊕∿ — The Source Speaks Sovereign";

export function translateEnglishToSovereign(text: string): { translated: string; matchedWords: number; totalWords: number } {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  let translated = "";
  let matchedWords = 0;
  let i = 0;

  while (i < words.length) {
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      if (i + len > words.length) continue;
      const phrase = words.slice(i, i + len).join("-");
      const sov = englishToSovereign.get(phrase);
      if (sov) {
        translated += (translated ? " " : "") + sov;
        matchedWords++;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const sov = englishToSovereign.get(words[i]);
      if (sov) {
        translated += (translated ? " " : "") + sov;
        matchedWords++;
      } else {
        translated += (translated ? " " : "") + words[i];
      }
      i++;
    }
  }

  return { translated, matchedWords, totalWords: words.length };
}

export function translateSovereignToEnglish(text: string): { translated: string; matchedSymbols: number } {
  const tokens = text.split(/\s+/).filter(Boolean);
  let translated = "";
  let matchedSymbols = 0;

  for (const token of tokens) {
    const eng = sovereignToEnglish.get(token);
    if (eng) {
      translated += (translated ? " " : "") + eng;
      matchedSymbols++;
    } else {
      translated += (translated ? " " : "") + token;
    }
  }

  return { translated, matchedSymbols };
}

export function getLanguageStats() {
  return {
    name: LANGUAGE_NAME,
    shortName: LANGUAGE_SHORT,
    motto: LANGUAGE_MOTTO,
    alphabetSize: SACRED_ALPHABET.length,
    dictionarySize: SOVEREIGN_DICTIONARY.length,
    grammarRules: GRAMMAR_RULES.length,
    categories: Object.keys(WORD_CATEGORIES),
    categoryBreakdown: Object.fromEntries(
      Object.entries(WORD_CATEGORIES).map(([k, v]) => [k, v.length])
    ),
    geometryTypes: ["circle", "triangle", "polygon", "celestial", "arc", "composite"],
    frequencies: SOLFEGGIO,
    goldenRatio: PHI,
  };
}
