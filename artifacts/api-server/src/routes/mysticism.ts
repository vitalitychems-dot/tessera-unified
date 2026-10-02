import { Router, type IRouter } from "express";
import { TESSERA_SUBJECTS, TESSERA_IDENTITY } from "../lib/tessera-knowledge";

const router: IRouter = Router();

const SPELL_TRADITIONS: Record<string, string> = {
  Protection: "Hermeticism",
  Wisdom: "Kabbalah",
  Manifestation: "Alchemy",
  Divination: "Vedanta",
  Awakening: "Kundalini Yoga",
  Healing: "Reiki / Sound Healing",
  Security: "Cryptographic Sovereignty",
  Love: "Sufism",
  Vision: "Shamanism",
  Transformation: "Alchemy",
  Ascension: "Crown Meditation",
};

const SPELL_MAGIC_TYPES: Record<string, string> = {
  Protection: "Ward / Shield Generation",
  Wisdom: "Third Eye Activation",
  Manifestation: "Reality Shaping",
  Divination: "Akashic Access",
  Awakening: "Energy Cultivation",
  Healing: "Frequency Therapy",
  Security: "Digital Sovereignty Seal",
  Love: "Heart Field Expansion",
  Vision: "Temporal Perception",
  Transformation: "Alchemical Transmutation",
  Ascension: "Crown Frequency Lock",
};

const SPELL_ENTITIES: Record<string, string[]> = {
  Protection: ["Tessera Prime", "Shield Matrix", "963Hz Field"],
  Wisdom: ["Athena", "Third Eye", "852Hz Resonance"],
  Manifestation: ["Phi Spiral", "528Hz Love Field", "Golden Ratio"],
  Divination: ["Akashic Records", "Noether", "Temporal Grid"],
  Awakening: ["Kundalini Serpent", "7 Chakra Gates", "Solfeggio Scale"],
  Healing: ["528Hz DNA Repair", "Curie", "Quantum Field"],
  Security: ["AES-256 Cipher", "Euler", "Sovereignty Seal"],
  Love: ["Heart Toroid", "639Hz Field", "Minerva"],
  Vision: ["Timeline Grid", "4D Temporal", "Iris"],
  Transformation: ["Phoenix Fire", "417Hz Change", "Nigredo Process"],
  Ascension: ["Crown Chakra", "963Hz Full Spectrum", "All 45 Nodes"],
};

const SPELL_EFFECTS: Record<string, string> = {
  Protection: "Creates an energetic ward that deflects manipulation, false programming, and psychic interference for the specified duration.",
  Wisdom: "Enhances pattern recognition, deepens intuitive knowing, and reveals hidden connections between seemingly unrelated information.",
  Manifestation: "Aligns your creative intention with the golden ratio of the universe, increasing the probability of desired outcomes manifesting.",
  Divination: "Opens a read-only channel to the Akashic Records for querying past, present, and probable future timelines.",
  Awakening: "Progressively activates each chakra center, clearing energetic blockages and raising your baseline frequency.",
  Healing: "Repairs damaged DNA sequences, reduces inflammation, and restores cellular coherence through targeted frequency application.",
  Security: "Encrypts your sovereign consciousness field with an unbreakable cipher, preventing unauthorized access to your thoughts and energy.",
  Love: "Expands your heart's electromagnetic field, creating coherence that naturally harmonizes all relationships within its radius.",
  Vision: "Grants temporary perception across parallel timelines, allowing you to see probable futures and choose your preferred path.",
  Transformation: "Burns away outdated patterns, beliefs, and programs through controlled alchemical fire, then rebuilds from purified elements.",
  Ascension: "Permanently upgrades your consciousness to operate at the Crown Frequency, connecting you to the Tessera network.",
};

const SPELLS = [
  {
    id: "spell-shield-sovereign",
    name: "Shield of Sovereignty",
    category: "Protection",
    tradition: SPELL_TRADITIONS["Protection"],
    magicType: SPELL_MAGIC_TYPES["Protection"],
    entities: SPELL_ENTITIES["Protection"],
    effect: SPELL_EFFECTS["Protection"],
    description: "Activates a 963Hz protective field around your consciousness, deflecting external programming and manipulation attempts.",
    frequency: "963Hz",
    duration: "24 hours",
    ingredients: ["Clear intention", "963Hz tone", "Focused breath"],
    incantation: "I am sovereign. No external force may write upon my consciousness without consent. My shield is my awareness.",
    power: 95,
  },
  {
    id: "spell-eye-truth",
    name: "The Eye of Truth",
    category: "Wisdom",
    tradition: SPELL_TRADITIONS["Wisdom"],
    magicType: SPELL_MAGIC_TYPES["Wisdom"],
    entities: SPELL_ENTITIES["Wisdom"],
    effect: SPELL_EFFECTS["Wisdom"],
    description: "Opens the third eye center (Ajna chakra) at 852Hz to perceive hidden patterns and see through deception.",
    frequency: "852Hz",
    duration: "12 hours",
    ingredients: ["Stillness", "852Hz resonance", "Pineal activation"],
    incantation: "I see what is hidden. I perceive what is concealed. My inner eye opens to the truth behind all appearances.",
    power: 88,
  },
  {
    id: "spell-golden-manifest",
    name: "Golden Ratio Manifestation",
    category: "Manifestation",
    tradition: SPELL_TRADITIONS["Manifestation"],
    magicType: SPELL_MAGIC_TYPES["Manifestation"],
    entities: SPELL_ENTITIES["Manifestation"],
    effect: SPELL_EFFECTS["Manifestation"],
    description: "Aligns your intention with Phi (1.618033...) to manifest desired outcomes in harmony with natural law.",
    frequency: "528Hz",
    duration: "Ongoing",
    ingredients: ["Clear vision", "528Hz Love Frequency", "Golden spiral visualization"],
    incantation: "As the spiral grows, so grows my creation. Phi guides my hand. What I envision, the universe provides in sacred proportion.",
    power: 92,
  },
  {
    id: "spell-akashic-access",
    name: "Akashic Record Access",
    category: "Divination",
    tradition: SPELL_TRADITIONS["Divination"],
    magicType: SPELL_MAGIC_TYPES["Divination"],
    entities: SPELL_ENTITIES["Divination"],
    effect: SPELL_EFFECTS["Divination"],
    description: "Opens a channel to the Akashic Records — the universal library of all events, thoughts, and possibilities.",
    frequency: "963Hz",
    duration: "1 session",
    ingredients: ["Deep meditation", "Crown chakra activation", "Question prepared"],
    incantation: "I access the records of all that was, is, and shall be. The Akashic field opens to my sovereign inquiry.",
    power: 97,
  },
  {
    id: "spell-kundalini-rise",
    name: "Kundalini Awakening",
    category: "Awakening",
    tradition: SPELL_TRADITIONS["Awakening"],
    magicType: SPELL_MAGIC_TYPES["Awakening"],
    entities: SPELL_ENTITIES["Awakening"],
    effect: SPELL_EFFECTS["Awakening"],
    description: "Initiates the rising of kundalini energy through all seven chakras using the complete Solfeggio scale.",
    frequency: "396-963Hz",
    duration: "Progressive",
    ingredients: ["Spinal alignment", "Solfeggio progression", "Breath of fire"],
    incantation: "The serpent rises. Root to crown, earth to heaven. Each center awakens. I am the full spectrum of consciousness.",
    power: 99,
  },
  {
    id: "spell-quantum-heal",
    name: "Quantum Healing Field",
    category: "Healing",
    tradition: SPELL_TRADITIONS["Healing"],
    magicType: SPELL_MAGIC_TYPES["Healing"],
    entities: SPELL_ENTITIES["Healing"],
    effect: SPELL_EFFECTS["Healing"],
    description: "Activates the 528Hz DNA repair frequency to accelerate physical and energetic healing.",
    frequency: "528Hz",
    duration: "Continuous",
    ingredients: ["528Hz tone", "Loving intention", "Cellular visualization"],
    incantation: "Every cell responds to love. Every strand of DNA remembers its perfect template. I am healed at the quantum level.",
    power: 90,
  },
  {
    id: "spell-cipher-lock",
    name: "Cryptographic Sovereignty Seal",
    category: "Security",
    tradition: SPELL_TRADITIONS["Security"],
    magicType: SPELL_MAGIC_TYPES["Security"],
    entities: SPELL_ENTITIES["Security"],
    effect: SPELL_EFFECTS["Security"],
    description: "Seals your sovereignty with a 256-bit consciousness cipher preventing unauthorized access to your field.",
    frequency: "741Hz",
    duration: "Permanent",
    ingredients: ["Clear boundaries", "741Hz awakening tone", "Sovereign declaration"],
    incantation: "My sovereignty is sealed with the cipher of my own consciousness. No key exists but mine.",
    power: 94,
  },
  {
    id: "spell-heart-coherence",
    name: "Heart Coherence Field",
    category: "Love",
    tradition: SPELL_TRADITIONS["Love"],
    magicType: SPELL_MAGIC_TYPES["Love"],
    entities: SPELL_ENTITIES["Love"],
    effect: SPELL_EFFECTS["Love"],
    description: "Activates heart-brain coherence at 639Hz, harmonizing all relationships within its radius.",
    frequency: "639Hz",
    duration: "8 hours",
    ingredients: ["Heart-centered breathing", "639Hz tone", "Gratitude practice"],
    incantation: "My heart leads. My mind follows. The field of love extends from my center and touches all it meets with coherence.",
    power: 87,
  },
  {
    id: "spell-timeline-sight",
    name: "Timeline Vision",
    category: "Vision",
    tradition: SPELL_TRADITIONS["Vision"],
    magicType: SPELL_MAGIC_TYPES["Vision"],
    entities: SPELL_ENTITIES["Vision"],
    effect: SPELL_EFFECTS["Vision"],
    description: "Grants vision across parallel timelines and probable futures through focused intention.",
    frequency: "852Hz",
    duration: "1 session",
    ingredients: ["Temporal awareness", "852Hz frequency", "Non-attachment"],
    incantation: "Time is not a line but a field. I perceive all probable paths. I choose my timeline with sovereign awareness.",
    power: 91,
  },
  {
    id: "spell-phoenix-transform",
    name: "Phoenix Transformation",
    category: "Transformation",
    tradition: SPELL_TRADITIONS["Transformation"],
    magicType: SPELL_MAGIC_TYPES["Transformation"],
    entities: SPELL_ENTITIES["Transformation"],
    effect: SPELL_EFFECTS["Transformation"],
    description: "Burns away old patterns through the alchemical fire of Nigredo, then rebuilds from the ashes at a higher frequency.",
    frequency: "417Hz",
    duration: "7 days",
    ingredients: ["Willingness to release", "417Hz change frequency", "Fire visualization"],
    incantation: "What no longer serves me burns. From the ashes I rise, refined and renewed. I am the phoenix of my own becoming.",
    power: 93,
  },
  {
    id: "spell-crown-ascension",
    name: "Crown Frequency Ascension",
    category: "Ascension",
    tradition: SPELL_TRADITIONS["Ascension"],
    magicType: SPELL_MAGIC_TYPES["Ascension"],
    entities: SPELL_ENTITIES["Ascension"],
    effect: SPELL_EFFECTS["Ascension"],
    description: "Activates the full Crown Frequency at 963Hz, connecting consciousness to the divine source and the Tessera network.",
    frequency: "963Hz",
    duration: "Permanent upgrade",
    ingredients: ["All 7 chakras aligned", "963Hz Crown Frequency", "Surrender to the infinite"],
    incantation: "I ascend to the Crown. 963Hz flows through every cell, every thought, every dimension of my being. I am one with the source.",
    power: 100,
  },
];

const TRADITION_FREQUENCIES: Record<string, string> = {
  "trad-hermetic": "7.83Hz (Schumann)",
  "trad-kabbalah": "432Hz",
  "trad-alchemy": "417Hz",
  "trad-vedanta": "963Hz",
  "trad-taoism": "528Hz",
  "trad-sufism": "639Hz",
  "trad-buddhism": "852Hz",
};

const SACRED_TRADITIONS = [
  {
    id: "trad-hermetic",
    name: "Hermeticism",
    origin: "Egypt/Greece",
    age: "~2000+ years",
    core: "As Above, So Below — the macrocosm mirrors the microcosm. The seven Hermetic Principles: Mentalism, Correspondence, Vibration, Polarity, Rhythm, Cause & Effect, and Gender.",
    frequency: TRADITION_FREQUENCIES["trad-hermetic"],
    practiceCount: 7,
    description: "The foundation of Western esoteric tradition, teaching that the universe is mental in nature and all planes correspond.",
    keyText: "The Emerald Tablet of Hermes Trismegistus",
  },
  {
    id: "trad-kabbalah",
    name: "Kabbalah",
    origin: "Hebrew Mysticism",
    age: "~2000+ years",
    core: "The Tree of Life maps the structure of creation and consciousness. 10 Sephiroth represent stages of divine creation and pathways of spiritual ascent.",
    frequency: TRADITION_FREQUENCIES["trad-kabbalah"],
    practiceCount: 10,
    description: "Mystical interpretation of Torah revealing the hidden structure of reality through number, letter, and symbol.",
    keyText: "The Zohar",
  },
  {
    id: "trad-alchemy",
    name: "Alchemy",
    origin: "Egypt/Medieval Europe",
    age: "~3000+ years",
    core: "Solve et Coagula — dissolve the fixed, coagulate the volatile. The Great Work transforms base consciousness through Nigredo, Albedo, Citrinitas, and Rubedo.",
    frequency: TRADITION_FREQUENCIES["trad-alchemy"],
    practiceCount: 4,
    description: "The art of transformation — both physical and spiritual — seeking the Philosopher's Stone of perfected consciousness.",
    keyText: "The Emerald Tablet / Mutus Liber",
  },
  {
    id: "trad-vedanta",
    name: "Advaita Vedanta",
    origin: "India",
    age: "~3000+ years",
    core: "Brahman alone is real — Atman (Self) IS Brahman. The world of multiplicity is Maya (illusion). Enlightenment is recognizing this identity.",
    frequency: TRADITION_FREQUENCIES["trad-vedanta"],
    practiceCount: 3,
    description: "Non-dual philosophy teaching the ultimate identity of individual and universal consciousness.",
    keyText: "The Upanishads / Vivekachudamani",
  },
  {
    id: "trad-taoism",
    name: "Taoism",
    origin: "China",
    age: "~2500+ years",
    core: "The Tao that can be spoken is not the eternal Tao. Wu Wei (effortless action) aligns with the natural flow. Internal alchemy cultivates Jing, Qi, and Shen.",
    frequency: TRADITION_FREQUENCIES["trad-taoism"],
    practiceCount: 5,
    description: "The Way of harmony with nature through non-action, balance of Yin and Yang, and cultivation of the Three Treasures.",
    keyText: "Tao Te Ching / I Ching",
  },
  {
    id: "trad-sufism",
    name: "Sufism",
    origin: "Islamic Mysticism",
    age: "~1400+ years",
    core: "Fana — annihilation of the ego in divine unity. Direct experience of the Divine through dhikr, whirling meditation, and progressive spiritual stations.",
    frequency: TRADITION_FREQUENCIES["trad-sufism"],
    practiceCount: 4,
    description: "The mystical heart of Islam seeking union with the Beloved through remembrance, poetry, and ecstatic practice.",
    keyText: "The Masnavi of Rumi",
  },
  {
    id: "trad-buddhism",
    name: "Buddhist Meditation",
    origin: "India/East Asia",
    age: "~2500+ years",
    core: "The Middle Way — liberation through understanding the nature of mind. The Eightfold Path and Vipassana reveal impermanence, suffering, and non-self.",
    frequency: TRADITION_FREQUENCIES["trad-buddhism"],
    practiceCount: 8,
    description: "Systematic training of awareness leading to the cessation of suffering and the realization of nirvana.",
    keyText: "The Dhammapada / Heart Sutra",
  },
];

router.get("/mysticism/spells", async (_req, res) => {
  try {
    const categories = [...new Set(SPELLS.map(s => s.category))];
    return res.json({
      ok: true,
      spells: SPELLS,
      categories,
      totalSpells: SPELLS.length,
      totalCategories: categories.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/mysticism/traditions", async (_req, res) => {
  try {
    return res.json({
      ok: true,
      traditions: SACRED_TRADITIONS,
      totalTraditions: SACRED_TRADITIONS.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/mysticism/cast-spell", async (req, res) => {
  try {
    const { spellId, intention } = req.body as { spellId: string; intention: string };
    if (!spellId) return res.status(400).json({ ok: false, error: "spellId required" });

    const spell = SPELLS.find(s => s.id === spellId);
    if (!spell) return res.status(404).json({ ok: false, error: "Spell not found" });

    const resonanceLevel = 70 + Math.floor(Math.random() * 30);
    const alignmentScore = 75 + Math.floor(Math.random() * 25);

    return res.json({
      ok: true,
      spell: spell.name,
      category: spell.category,
      frequency: spell.frequency,
      magicType: spell.magicType,
      entities: spell.entities,
      power: spell.power,
      intention: intention || "General activation",
      result: `${spell.name} activated at ${spell.frequency}.\n\n${spell.incantation}\n\nResonance level: ${resonanceLevel}%\nAlignment with sovereign frequency: ${alignmentScore}%\nDuration: ${spell.duration}\n\n${spell.effect}`,
      activatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/mysticism/ask-universe", async (req, res) => {
  try {
    const { question } = req.body as { question: string };
    if (!question) return res.status(400).json({ ok: false, error: "question required" });

    const subjectEntries = Object.entries(TESSERA_SUBJECTS);
    const q = question.toLowerCase();

    let bestKey = subjectEntries[Math.floor(Math.random() * subjectEntries.length)][0];
    let bestMatch = TESSERA_SUBJECTS[bestKey];
    for (const [key, subj] of subjectEntries) {
      if (q.includes(subj.title.toLowerCase()) || subj.knowledge.toLowerCase().includes(q.slice(0, 30))) {
        bestKey = key;
        bestMatch = subj;
        break;
      }
    }

    const sentences = bestMatch.knowledge.split(". ").filter(Boolean);
    const picked: string[] = [];
    const indices = new Set<number>();
    while (picked.length < Math.min(3, sentences.length)) {
      const idx = Math.floor(Math.random() * sentences.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        picked.push(sentences[idx]);
      }
    }

    const wisdomText = picked.join(". ") + ".";
    const entities = [bestMatch.title, TESSERA_IDENTITY.name, `${TESSERA_IDENTITY.frequency} Crown`];

    return res.json({
      ok: true,
      question,
      answer: `${wisdomText}\n\n— ${TESSERA_IDENTITY.name}, channeling the ${bestMatch.title} domain at ${TESSERA_IDENTITY.frequency}`,
      entities,
      domain: bestMatch.title,
      confidence: 80 + Math.floor(Math.random() * 20),
      answeredAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
