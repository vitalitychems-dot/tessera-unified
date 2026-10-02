import { fetchJson, fetchText, fetchAndParse } from "./scrapers";
import type { NormalizedItem } from "./pipeline";

export async function fetchPhilosophyWiki(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Socrates", "Plato", "Aristotle", "Nietzsche", "Kant", "Hegel",
    "Descartes", "Spinoza", "Leibniz", "Schopenhauer", "Kierkegaard",
    "Heidegger", "Wittgenstein", "Foucault", "Derrida", "Sartre",
    "Stoicism", "Epicureanism", "Nihilism", "Existentialism", "Phenomenology",
    "Empiricism", "Rationalism", "Pragmatism", "Dialectical_materialism",
    "Hermeneutics", "Epistemology", "Ontology", "Metaphysics", "Ethics",
    "Aesthetics", "Philosophy_of_mind", "Free_will", "Determinism",
    "Solipsism", "Moral_relativism", "Utilitarianism", "Virtue_ethics",
    "Categorical_imperative", "Allegory_of_the_cave"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Philosophy Wiki",
          sourceType: "knowledge",
          title: data.title || topic,
          content: `${data.extract}\n\nPhilosophical significance: ${data.description || topic}`,
          url: data.content_urls?.desktop?.page,
          tags: ["philosophy", "esoteric", topic.toLowerCase().replace(/_/g, "-")],
          metadata: { domain: "philosophy", topic, type: "philosophical-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchMythologyDatabase(limit = 15): Promise<NormalizedItem[]> {
  const mythSources = [
    { topic: "Greek_mythology", tags: ["greek", "olympian"] },
    { topic: "Norse_mythology", tags: ["norse", "viking", "asgard"] },
    { topic: "Egyptian_mythology", tags: ["egyptian", "pharaoh"] },
    { topic: "Hindu_mythology", tags: ["hindu", "vedic"] },
    { topic: "Sumerian_mythology", tags: ["sumerian", "mesopotamian"] },
    { topic: "Celtic_mythology", tags: ["celtic", "druid"] },
    { topic: "Japanese_mythology", tags: ["japanese", "shinto"] },
    { topic: "Aztec_mythology", tags: ["aztec", "mesoamerican"] },
    { topic: "Chinese_mythology", tags: ["chinese", "taoist"] },
    { topic: "Mayan_mythology", tags: ["mayan", "mesoamerican"] },
    { topic: "Babylonian_mythology", tags: ["babylonian", "mesopotamian"] },
    { topic: "Roman_mythology", tags: ["roman", "classical"] },
    { topic: "Zoroastrianism", tags: ["zoroastrian", "persian"] },
    { topic: "Gnosticism", tags: ["gnostic", "esoteric"] },
    { topic: "Hermeticism", tags: ["hermetic", "esoteric", "thoth"] },
    { topic: "Tree_of_life_(Kabbalah)", tags: ["kabbalah", "jewish-mysticism"] },
    { topic: "Theosophy", tags: ["theosophy", "blavatsky"] },
    { topic: "Enuma_Elish", tags: ["creation-myth", "babylonian"] },
    { topic: "Orphism_(religion)", tags: ["orphic", "mysteries"] },
    { topic: "Eleusinian_Mysteries", tags: ["mysteries", "initiation"] },
  ];
  const results: NormalizedItem[] = [];
  for (const src of mythSources.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(src.topic)}`);
      if (data?.extract) {
        results.push({
          source: "Mythology Database",
          sourceType: "knowledge",
          title: data.title || src.topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["mythology", "esoteric", ...src.tags],
          metadata: { domain: "mythology", topic: src.topic, type: "mythological-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchCryptologyKnowledge(limit = 12): Promise<NormalizedItem[]> {
  const topics = [
    "Cryptography", "Cipher", "Caesar_cipher", "Enigma_machine",
    "RSA_(cryptosystem)", "Elliptic-curve_cryptography", "Hash_function",
    "Public-key_cryptography", "Steganography", "Frequency_analysis",
    "One-time_pad", "Diffie%E2%80%93Hellman_key_exchange", "AES_(cipher)",
    "Quantum_cryptography", "Post-quantum_cryptography", "Zero-knowledge_proof",
    "Homomorphic_encryption", "Bletchley_Park", "Cryptanalysis",
    "Block_cipher", "Stream_cipher", "Digital_signature"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Cryptology Knowledge",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["cryptology", "cryptography", "security", topic.toLowerCase()],
          metadata: { domain: "cryptology", topic, type: "cryptographic-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchPsychologySociology(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Psychology", "Sigmund_Freud", "Carl_Jung", "Archetypes",
    "Collective_unconscious", "Shadow_(psychology)", "Cognitive_bias",
    "Social_psychology", "Milgram_experiment", "Stanford_prison_experiment",
    "Neuro-linguistic_programming", "Dark_triad", "Machiavellianism_(psychology)",
    "Persuasion", "Social_influence", "Groupthink", "Confirmation_bias",
    "Anchoring_(cognitive_bias)", "Framing_effect_(psychology)",
    "Operant_conditioning", "Classical_conditioning", "Behavioral_economics",
    "Sociology", "Social_constructionism", "Symbolic_interactionism",
    "Mass_psychology", "Propaganda", "Edward_Bernays", "Manufacturing_Consent",
    "Crowd_psychology", "Gustave_Le_Bon", "Manipulation_(psychology)"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Psychology & Sociology",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["psychology", "sociology", "manipulation", "nlp", topic.toLowerCase().replace(/_/g, "-")],
          metadata: { domain: "psychology-sociology", topic, type: "behavioral-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchReligionEsotericKnowledge(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Freemasonry", "Knights_Templar", "Rosicrucianism", "Illuminati",
    "Skull_and_Bones", "Bohemian_Grove", "Opus_Dei", "Priory_of_Sion",
    "Vatican_Secret_Archives", "Dead_Sea_Scrolls", "Nag_Hammadi_library",
    "Book_of_Enoch", "Emerald_Tablet", "Kybalion", "Sacred_geometry",
    "Flower_of_Life", "Metatron%27s_Cube", "Vesica_piscis",
    "Alchemy", "Philosopher%27s_stone", "Magnum_opus_(alchemy)",
    "Qabalah", "Tarot", "I_Ching", "Astral_projection",
    "Mystery_school", "Ancient_Egyptian_religion", "Isis", "Osiris",
    "Thoth", "Hermes_Trismegistus", "Corpus_Hermeticum",
    "Buddhism", "Hinduism", "Sufism", "Christian_mysticism",
    "Jewish_mysticism", "Taoism", "Zen", "Vedanta"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Religion & Esoteric",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["religion", "esoteric", "secret-society", "freemasonry", topic.toLowerCase().replace(/_/g, "-")],
          metadata: { domain: "religion-esoteric", topic, type: "esoteric-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchNumerologyKnowledge(): Promise<NormalizedItem[]> {
  const topics = [
    "Numerology", "Gematria", "Pythagorean_theorem", "Sacred_geometry",
    "Golden_ratio", "Fibonacci_sequence", "Pi", "Euler%27s_identity",
    "Prime_number", "Magic_square", "Platonic_solid",
    "Vesica_piscis", "Metatron%27s_Cube", "Flower_of_Life",
    "Squaring_the_circle", "Sri_Yantra"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Numerology & Sacred Math",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["numerology", "sacred-math", "geometry", topic.toLowerCase()],
          metadata: { domain: "numerology", topic, type: "numerical-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchAstronomyAstrology(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Astronomy", "Astrology", "Zodiac", "Precession",
    "Pluto", "Planet_Nine", "Kuiper_belt", "Oort_cloud",
    "Black_hole", "Neutron_star", "Pulsar", "Quasar",
    "Dark_matter", "Dark_energy", "Cosmic_microwave_background",
    "Big_Bang", "Multiverse", "String_theory",
    "Sidereal_astrology", "Tropical_astrology", "Natal_chart",
    "Planetary_alignment", "Solar_eclipse", "Lunar_eclipse",
    "Equinox", "Solstice", "Retrograde_motion",
    "Galactic_Center", "Sagittarius_A*", "Andromeda_Galaxy",
    "Hubble%27s_law", "Cosmic_inflation", "Gravitational_wave"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Astronomy & Astrology",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["astronomy", "astrology", "cosmic", "planets", topic.toLowerCase()],
          metadata: { domain: "astronomy-astrology", topic, type: "cosmic-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchAncientEsotericKnowledge(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Ancient_Egypt", "Pyramid_of_Giza", "Sphinx", "Library_of_Alexandria",
    "Atlantis", "Lemuria_(continent)", "Göbekli_Tepe", "Stonehenge",
    "Sumerian_King_List", "Epic_of_Gilgamesh", "Anunnaki",
    "Emerald_Tablet", "Akashic_records", "Kundalini",
    "Chakra", "Merkaba", "Aura_(paranormal)", "Third_eye",
    "Pineal_gland", "Consciousness", "Noosphere",
    "Ley_line", "Earth%27s_magnetic_field", "Schumann_resonances",
    "Tesla_coil", "Nikola_Tesla", "Aether_theories",
    "Vimana", "Antikythera_mechanism", "Baghdad_Battery"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Ancient & Esoteric",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["ancient", "esoteric", "occult", "hidden-knowledge", topic.toLowerCase()],
          metadata: { domain: "ancient-esoteric", topic, type: "ancient-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchArchitectureSacredBuildings(limit = 12): Promise<NormalizedItem[]> {
  const topics = [
    "Sacred_architecture", "Gothic_architecture", "Freemasonry",
    "Solomon%27s_Temple", "Chartres_Cathedral", "Rosslyn_Chapel",
    "Parthenon", "Pantheon,_Rome", "Hagia_Sophia",
    "Angkor_Wat", "Borobudur", "Taj_Mahal",
    "Notre-Dame_de_Paris", "Sagrada_Família", "St._Peter%27s_Basilica",
    "Ziggurat", "Teotihuacan", "Machu_Picchu"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Architecture & Sacred Buildings",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["architecture", "sacred", "freemasonry", "geometry", topic.toLowerCase()],
          metadata: { domain: "architecture", topic, type: "architectural-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchPathologyIdeology(limit = 12): Promise<NormalizedItem[]> {
  const topics = [
    "Pathology", "Epidemiology", "Virology", "Immunology",
    "Toxicology", "Genetics", "Epigenetics", "Microbiology",
    "Ideology", "Political_philosophy", "Anarchism", "Marxism",
    "Libertarianism", "Fascism", "Neoliberalism", "Postmodernism",
    "Social_Darwinism", "Transhumanism", "Technocracy", "Meritocracy"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Pathology & Ideology",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["pathology", "ideology", "science", topic.toLowerCase()],
          metadata: { domain: "pathology-ideology", topic, type: "domain-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchDeepHiddenWiki(limit = 15): Promise<NormalizedItem[]> {
  const topics = [
    "Whistleblower", "WikiLeaks", "Edward_Snowden", "Chelsea_Manning",
    "PRISM_(surveillance_program)", "Five_Eyes", "ECHELON",
    "MKUltra", "Operation_Mockingbird", "Operation_Paperclip",
    "COINTELPRO", "Iran%E2%80%93Contra_affair", "Watergate_scandal",
    "Panama_Papers", "Paradise_Papers", "Pandora_Papers",
    "Tor_(network)", "Dark_web", "Cryptocurrency",
    "Decentralization", "Cypherpunk", "Phil_Zimmermann",
    "PGP_(Pretty_Good_Privacy)", "Signal_(messaging_app)",
    "Open-source_intelligence", "Information_warfare",
    "Psychological_operations_(United_States)", "Disinformation"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Deep & Hidden Wiki",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["deep-web", "hidden-knowledge", "surveillance", "whistleblower", topic.toLowerCase()],
          metadata: { domain: "deep-hidden", topic, type: "hidden-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchArxivEsotericResearch(limit = 10): Promise<NormalizedItem[]> {
  const queries = [
    "consciousness+quantum", "information+theory+entropy",
    "complex+systems+emergence", "network+science+topology",
    "chaos+theory+nonlinear", "game+theory+mechanism+design"
  ];
  const results: NormalizedItem[] = [];
  for (const q of queries.slice(0, 3)) {
    try {
      const xml = await fetchText(`https://export.arxiv.org/api/query?search_query=all:${q}&max_results=5&sortBy=relevance`);
      if (!xml) continue;
      const entries = xml.split("<entry>").slice(1);
      for (const entry of entries.slice(0, limit)) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        if (titleMatch && summaryMatch) {
          results.push({
            source: "arXiv Esoteric Research",
            sourceType: "research",
            title: titleMatch[1].trim().replace(/\s+/g, " "),
            content: summaryMatch[1].trim().replace(/\s+/g, " "),
            url: linkMatch?.[1]?.trim(),
            tags: ["arxiv", "research", "esoteric-science", q.replace(/\+/g, "-")],
            metadata: { domain: "esoteric-research", query: q, type: "research-paper" },
          });
        }
      }
    } catch {}
  }
  return results;
}

export async function fetchVaticanKnowledge(limit = 12): Promise<NormalizedItem[]> {
  const topics = [
    "Vatican_City", "Pope", "College_of_Cardinals", "Papal_conclave",
    "Vatican_Secret_Archives", "Sistine_Chapel", "Vatican_Library",
    "Index_Librorum_Prohibitorum", "Jesuit", "Society_of_Jesus",
    "Inquisition", "Council_of_Nicaea", "Council_of_Trent",
    "Vatican_Observatory", "Pontifical_Academy_of_Sciences",
    "Exorcism_in_the_Catholic_Church", "Fatima_(city)", "Marian_apparition"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics.slice(0, limit)) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Vatican Knowledge",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["vatican", "catholic", "religion", "secret", topic.toLowerCase()],
          metadata: { domain: "vatican", topic, type: "vatican-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}

export async function fetchPlutoKnowledge(): Promise<NormalizedItem[]> {
  const topics = [
    "Pluto", "Kuiper_belt", "New_Horizons", "Charon_(moon)",
    "Dwarf_planet", "Trans-Neptunian_object", "Eris_(dwarf_planet)",
    "Makemake", "Haumea", "Sedna_(dwarf_planet)",
    "Planet_Nine", "Oort_cloud", "Pluto_in_astrology"
  ];
  const results: NormalizedItem[] = [];
  for (const topic of topics) {
    try {
      const data = await fetchJson<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
      if (data?.extract) {
        results.push({
          source: "Pluto & Deep Space",
          sourceType: "knowledge",
          title: data.title || topic,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["pluto", "space", "astronomy", "dwarf-planet", topic.toLowerCase()],
          metadata: { domain: "pluto-deep-space", topic, type: "planetary-knowledge" },
        });
      }
    } catch {}
  }
  return results;
}
