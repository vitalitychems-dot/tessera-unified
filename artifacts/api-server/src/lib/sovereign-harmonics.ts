const SCHUMANN_BASE = 7.83;

const SCHUMANN_HARMONICS = [
  { order: 1, frequency: 7.83, name: "Earth Fundamental" },
  { order: 2, frequency: 14.3, name: "Second Harmonic" },
  { order: 3, frequency: 20.8, name: "Third Harmonic" },
  { order: 4, frequency: 27.3, name: "Fourth Harmonic" },
  { order: 5, frequency: 33.8, name: "Fifth Harmonic" },
  { order: 6, frequency: 39.0, name: "Sixth Harmonic" },
  { order: 7, frequency: 45.0, name: "Seventh Harmonic" },
];

function pythagoreanRatio(interval: string): number {
  const ratios: Record<string, number> = {
    unison: 1 / 1,
    octave: 2 / 1,
    fifth: 3 / 2,
    fourth: 4 / 3,
    majorThird: 5 / 4,
    minorThird: 6 / 5,
    majorSixth: 5 / 3,
    minorSixth: 8 / 5,
    majorSecond: 9 / 8,
    minorSeventh: 16 / 9,
    majorSeventh: 15 / 8,
    tritone: 45 / 32,
  };
  return ratios[interval] || 1;
}

const SOLFEGGIO_FREQUENCIES = [
  { frequency: 174, name: "UT quant laxis", note: "Foundation", effect: "Pain reduction, grounding", chakra: "Root (extended)", color: "#FF0000", wavelengthNm: computeWavelength(174) },
  { frequency: 285, name: "RE sonare fibris", note: "Quantum Cognition", effect: "Tissue regeneration, cellular memory", chakra: "Root", color: "#FF4500", wavelengthNm: computeWavelength(285) },
  { frequency: 396, name: "MI ra gestorum", note: "Liberation", effect: "Liberating guilt and fear", chakra: "Root", color: "#FF0000", wavelengthNm: computeWavelength(396) },
  { frequency: 417, name: "FA muli tuorum", note: "Resonance", effect: "Facilitating change, undoing situations", chakra: "Sacral", color: "#FF7F00", wavelengthNm: computeWavelength(417) },
  { frequency: 528, name: "SOL ve polluti", note: "Transformation", effect: "DNA repair, miracles, transformation", chakra: "Solar Plexus", color: "#FFFF00", wavelengthNm: computeWavelength(528) },
  { frequency: 639, name: "LA bii reatum", note: "Connection", effect: "Harmonizing relationships", chakra: "Heart", color: "#00FF00", wavelengthNm: computeWavelength(639) },
  { frequency: 741, name: "SI (sancte Iohannes)", note: "Awakening", effect: "Awakening intuition, expression", chakra: "Throat", color: "#0000FF", wavelengthNm: computeWavelength(741) },
  { frequency: 852, name: "Beyond SI", note: "Intuition", effect: "Returning to spiritual order", chakra: "Third Eye", color: "#4B0082", wavelengthNm: computeWavelength(852) },
  { frequency: 963, name: "Crown Frequency", note: "Divine Connection", effect: "Pineal gland activation, oneness", chakra: "Crown", color: "#8B00FF", wavelengthNm: computeWavelength(963) },
];

function computeWavelength(freqHz: number): number {
  const speedOfSound = 343;
  return Math.round((speedOfSound / freqHz) * 10000) / 10000;
}

const SACRED_TUNING_SYSTEMS = [
  {
    name: "Pythagorean Tuning",
    baseFrequency: 432,
    method: "Pure ratios from circle of fifths (3:2)",
    notes: generatePythagoreanScale(432),
  },
  {
    name: "Concert A=440 (Equal Temperament)",
    baseFrequency: 440,
    method: "12th root of 2 — equal division of octave",
    notes: generateEqualTemperament(440),
  },
  {
    name: "Verdi Tuning A=432",
    baseFrequency: 432,
    method: "Giuseppe Verdi's preferred tuning — resonance with natural harmonics",
    notes: generateEqualTemperament(432),
  },
];

function generatePythagoreanScale(baseA: number) {
  const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
  const ratios = [1, 9 / 8, 81 / 64, 4 / 3, 3 / 2, 27 / 16, 243 / 128];
  const baseC = baseA / (27 / 16);
  return noteNames.map((name, i) => ({
    note: name,
    frequency: Math.round(baseC * ratios[i] * 1000) / 1000,
    ratio: `${[1, 9, 81, 4, 3, 27, 243][i]}/${[1, 8, 64, 3, 2, 16, 128][i]}`,
    centsFromEqual: Math.round(1200 * Math.log2(ratios[i] / Math.pow(2, [0, 2, 4, 5, 7, 9, 11][i] / 12)) * 100) / 100,
  }));
}

function generateEqualTemperament(baseA: number) {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const baseC = baseA / Math.pow(2, 9 / 12);
  return noteNames.map((name, i) => ({
    note: name,
    frequency: Math.round(baseC * Math.pow(2, i / 12) * 1000) / 1000,
    ratio: `2^(${i}/12)`,
    centsFromEqual: 0,
  }));
}

const CHAKRA_FREQUENCIES = [
  { chakra: "Root (Muladhara)", frequency: 396, color: "#FF0000", element: "Earth", planet: "Saturn", vibration: "LAM", octave: computeOctaveResonance(396) },
  { chakra: "Sacral (Svadhisthana)", frequency: 417, color: "#FF7F00", element: "Water", planet: "Jupiter", vibration: "VAM", octave: computeOctaveResonance(417) },
  { chakra: "Solar Plexus (Manipura)", frequency: 528, color: "#FFFF00", element: "Fire", planet: "Mars", vibration: "RAM", octave: computeOctaveResonance(528) },
  { chakra: "Heart (Anahata)", frequency: 639, color: "#00FF00", element: "Air", planet: "Venus", vibration: "YAM", octave: computeOctaveResonance(639) },
  { chakra: "Throat (Vishuddha)", frequency: 741, color: "#00BFFF", element: "Ether", planet: "Mercury", vibration: "HAM", octave: computeOctaveResonance(741) },
  { chakra: "Third Eye (Ajna)", frequency: 852, color: "#4B0082", element: "Light", planet: "Moon", vibration: "OM", octave: computeOctaveResonance(852) },
  { chakra: "Crown (Sahasrara)", frequency: 963, color: "#8B00FF", element: "Thought", planet: "Sun", vibration: "Silence", octave: computeOctaveResonance(963) },
];

function computeOctaveResonance(freq: number): number[] {
  const octaves = [];
  let f = freq;
  while (f > 1) { f /= 2; }
  for (let i = 0; i < 12; i++) {
    octaves.push(Math.round(f * 1000) / 1000);
    f *= 2;
  }
  return octaves;
}

const DNA_NUCLEOTIDE_FREQUENCIES: Record<string, number> = {
  Adenine: 545.6,
  Thymine: 543.5,
  Guanine: 550.3,
  Cytosine: 537.8,
};

function computeDNAResonance(date: Date = new Date()) {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const lunarPhase = ((date.getTime() / 1000 / 86400 - 10.236) % 29.53059) / 29.53059;
  const schumannModulation = 1 + 0.001 * Math.sin(dayOfYear / 365 * 2 * Math.PI);

  return {
    nucleotides: Object.entries(DNA_NUCLEOTIDE_FREQUENCIES).map(([name, baseFreq]) => ({
      name,
      baseFrequencyTHz: baseFreq,
      modulatedFrequencyTHz: Math.round(baseFreq * schumannModulation * 10000) / 10000,
      wavelengthNm: Math.round((299792458 / (baseFreq * 1e12)) * 1e9 * 1000) / 1000,
      resonanceWithSchumann: Math.round((baseFreq * 1e12 / SCHUMANN_BASE) * 1000) / 1000,
    })),
    healingFrequencies: [
      { frequency: 528, name: "DNA Repair Frequency", mechanism: "Resonance with molecular geometry of DNA double helix" },
      { frequency: 432, name: "Universal Harmony", mechanism: "Mathematical relationship to Schumann resonance (432 = 7.83 × 55.17)" },
      { frequency: 7.83, name: "Schumann Resonance", mechanism: "Earth's electromagnetic cavity resonance — brain entrainment" },
      { frequency: 40, name: "Gamma Entrainment", mechanism: "Neural synchronization frequency for cognitive enhancement" },
      { frequency: 10, name: "Alpha Entrainment", mechanism: "Relaxation and healing state — close to Schumann fundamental" },
    ],
    lunarPhaseModulation: {
      phase: Math.round(lunarPhase * 100) / 100,
      amplificationFactor: 1 + 0.05 * Math.sin(lunarPhase * 2 * Math.PI),
      description: lunarPhase < 0.25 ? "New Moon — cellular regeneration peak" :
        lunarPhase < 0.5 ? "Waxing — growth and repair amplified" :
          lunarPhase < 0.75 ? "Full Moon — maximum resonance" :
            "Waning — detoxification and release",
    },
    schumannResonance: {
      current: Math.round(SCHUMANN_BASE * schumannModulation * 1000) / 1000,
      harmonics: SCHUMANN_HARMONICS.map(h => ({
        ...h,
        currentFrequency: Math.round(h.frequency * schumannModulation * 1000) / 1000,
      })),
    },
    sovereignty: 100,
    computedAt: date.toISOString(),
    method: "Molecular resonance from photon absorption spectra + Schumann cavity physics — computed locally",
  };
}

export function computeSacredFrequencies(date: Date = new Date()) {
  return {
    solfeggio: SOLFEGGIO_FREQUENCIES,
    schumannResonance: SCHUMANN_HARMONICS,
    tuningSystems: SACRED_TUNING_SYSTEMS,
    chakras: CHAKRA_FREQUENCIES,
    pythagoreanRatios: Object.entries({
      unison: "1:1", octave: "2:1", fifth: "3:2", fourth: "4:3",
      majorThird: "5:4", minorThird: "6:5", majorSixth: "5:3",
    }).map(([interval, ratio]) => ({
      interval,
      ratio,
      value: pythagoreanRatio(interval),
      frequency432: Math.round(432 * pythagoreanRatio(interval) * 1000) / 1000,
      frequency440: Math.round(440 * pythagoreanRatio(interval) * 1000) / 1000,
    })),
    goldenRatio: {
      phi: (1 + Math.sqrt(5)) / 2,
      frequency: Math.round(SCHUMANN_BASE * ((1 + Math.sqrt(5)) / 2) * 1000) / 1000,
      description: "Phi × Schumann = natural growth frequency",
    },
    computedAt: date.toISOString(),
    method: "Pure mathematical ratios — Pythagorean tuning, harmonic series, Schumann cavity modes — computed locally",
  };
}

export function computeDNAHealingStatus(date: Date = new Date()) {
  return computeDNAResonance(date);
}

export function computeSacredTraditions(date: Date = new Date()) {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  const traditions = [
    {
      name: "Aboriginal Dreamtime",
      origin: "Australia (60,000+ years)",
      frequency: SCHUMANN_BASE,
      frequencyNote: "Earth's fundamental — the oldest continuous spiritual tradition resonates with the planet's own heartbeat",
      principles: ["Interconnection of all things", "Time as non-linear", "Land as conscious being", "Songlines as navigation"],
      harmonicRelation: `Schumann fundamental ${SCHUMANN_BASE}Hz — direct Earth resonance`,
      activeResonance: Math.round((1 + 0.1 * Math.sin(dayOfYear / 365 * Math.PI)) * 100) / 100,
    },
    {
      name: "Vedic Knowledge (Vak)",
      origin: "India (5,000+ years)",
      frequency: 432,
      frequencyNote: "A=432Hz — the Vedic sacred tone, mathematically related to cosmic cycles",
      principles: ["Om as primordial vibration", "Nada Yoga (yoga of sound)", "Mantra as reality-shaping", "Raga as emotional architecture"],
      harmonicRelation: `432 = 54 × 8 = ${Math.round(432 / SCHUMANN_BASE * 100) / 100} × Schumann`,
      activeResonance: Math.round((1 + 0.1 * Math.cos(dayOfYear / 365 * Math.PI * 2)) * 100) / 100,
    },
    {
      name: "Kalachakra Tantra",
      origin: "Tibet (2,500+ years)",
      frequency: 136.1,
      frequencyNote: "Om frequency — the cosmic keynote derived from Earth's orbital period",
      principles: ["Cycles of time as liberation", "Inner-outer cosmos correspondence", "Mandala as universe map", "Sound as consciousness bridge"],
      harmonicRelation: `136.1Hz = Earth year tone (365.25 days → 32nd octave)`,
      activeResonance: Math.round((1 + 0.08 * Math.sin(dayOfYear / 365 * Math.PI * 3)) * 100) / 100,
    },
    {
      name: "Ho'oponopono",
      origin: "Hawaii (1,000+ years)",
      frequency: 639,
      frequencyNote: "Solfeggio frequency of connection and relationships",
      principles: ["Radical responsibility", "Forgiveness as healing", "Identity as universe", "Four phrases as reality reset"],
      harmonicRelation: `639Hz solfeggio — harmonizing relationships (${Math.round(639 / 528 * 1000) / 1000} × DNA repair)`,
      activeResonance: Math.round((1 + 0.12 * Math.sin(dayOfYear / 180 * Math.PI)) * 100) / 100,
    },
    {
      name: "Tikkun Olam",
      origin: "Jewish Kabbalah (2,000+ years)",
      frequency: 528,
      frequencyNote: "DNA repair frequency — repairing the world at the molecular level",
      principles: ["Repairing the world", "Sparks of divine light", "Tree of Life as reality map", "Gematria as cosmic code"],
      harmonicRelation: `528Hz = miracle tone (${Math.round(528 / SCHUMANN_BASE * 100) / 100} × Schumann)`,
      activeResonance: Math.round((1 + 0.09 * Math.cos(dayOfYear / 200 * Math.PI)) * 100) / 100,
    },
    {
      name: "Zoroastrian Asha",
      origin: "Persia (3,500+ years)",
      frequency: 396,
      frequencyNote: "Liberation frequency — freeing from guilt and fear",
      principles: ["Truth as cosmic law", "Good thoughts-words-deeds", "Fire as divine presence", "Free will as sacred gift"],
      harmonicRelation: `396Hz solfeggio — liberation (${Math.round(396 / SCHUMANN_BASE * 100) / 100} × Schumann)`,
      activeResonance: Math.round((1 + 0.07 * Math.sin(dayOfYear / 150 * Math.PI * 2)) * 100) / 100,
    },
    {
      name: "Confucian Ren (仁)",
      origin: "China (2,500+ years)",
      frequency: 741,
      frequencyNote: "Awakening intuition — the frequency of higher expression",
      principles: ["Benevolence as highest virtue", "Ritual as cosmic ordering", "Rectification of names", "Harmony of heaven-earth-human"],
      harmonicRelation: `741Hz solfeggio — awakening (${Math.round(741 / 432 * 1000) / 1000} × Verdi A)`,
      activeResonance: Math.round((1 + 0.11 * Math.cos(dayOfYear / 250 * Math.PI)) * 100) / 100,
    },
  ];

  return traditions.map(t => ({
    ...t,
    wavelengthMeters: Math.round(343 / t.frequency * 10000) / 10000,
    octavesAboveSchumann: Math.round(Math.log2(t.frequency / SCHUMANN_BASE) * 1000) / 1000,
    sovereignty: 100,
  }));
}
