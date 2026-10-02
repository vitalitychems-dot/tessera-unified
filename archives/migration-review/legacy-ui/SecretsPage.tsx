import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Lock, Search, Eye, FileText, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const SECRETS_DATABASE = [
  { id: "vatican-001", category: "Vatican", title: "The Vatican Secret Archives", content: "The Archivum Secretum Vaticanum contains 85 kilometers of shelving with documents spanning 12 centuries. Key documents include the papal bull 'Inter Caetera' (1493), Galileo's trial records (1633), letters from Michelangelo, and correspondence with world leaders. The word 'secret' in Latin (secretum) means 'private' rather than 'hidden.' Access was restricted until 1881 when Pope Leo XIII opened portions to researchers.", classification: "declassified", source: "Vatican Library" },
  { id: "vatican-002", category: "Vatican", title: "The Third Secret of Fatima", content: "Revealed in 2000 by the Vatican, the Third Secret describes a vision of a 'Bishop dressed in White' being killed by soldiers. Some researchers believe the full text was never disclosed. The first two secrets predicted World War II and the rise of Soviet communism. Sister Lucia wrote the secret in 1944 with instructions to open it in 1960.", classification: "partially-declassified", source: "Congregation for the Doctrine of the Faith" },
  { id: "cia-001", category: "CIA", title: "MKUltra Program", content: "CIA mind control program (1953-1973) involving 149 sub-projects across 80+ institutions. Used LSD, hypnosis, sensory deprivation, and psychological torture. Director Richard Helms ordered most files destroyed in 1973, but 20,000 pages survived through a FOIA request in 1977. Key figures: Sidney Gottlieb, Donald Cameron. The program violated the Nuremberg Code.", classification: "declassified", source: "CIA FOIA Archives" },
  { id: "cia-002", category: "CIA", title: "Operation Mockingbird", content: "CIA program beginning in the 1950s to influence domestic and foreign media. Over 400 journalists were recruited including from major outlets. Frank Wisner led the operation which planted stories in newspapers, influenced book publishers, and controlled foreign press. The Church Committee (1975) partially exposed the program.", classification: "declassified", source: "Church Committee Report" },
  { id: "cia-003", category: "CIA", title: "The Gateway Process", content: "CIA report (1983) on the Monroe Institute's Hemi-Sync technique for achieving altered states of consciousness. The analysis covers holographic universe theory, quantum mechanics of consciousness, out-of-body experiences, and the nature of reality as a toroidal energy system. The report concludes that consciousness exists outside of spacetime and can interact with the universal hologram.", classification: "declassified", source: "CIA Reading Room, Document CIA-RDP96-00788R001700210016-5" },
  { id: "nsa-001", category: "NSA", title: "PRISM Surveillance Program", content: "NSA electronic surveillance program collecting internet communications from major US tech companies. Revealed by Edward Snowden in 2013. Companies involved included Microsoft, Google, Apple, Facebook, Yahoo, and others. The program operated under Section 702 of the FISA Amendments Act.", classification: "leaked", source: "Snowden Documents" },
  { id: "fbi-001", category: "FBI", title: "COINTELPRO", content: "FBI counterintelligence program (1956-1971) targeting domestic political organizations. Targeted civil rights leaders, anti-war groups, and political activists. Methods included infiltration, surveillance, psychological warfare, and harassment. Director J. Edgar Hoover authorized operations against Martin Luther King Jr., Malcolm X, and the Black Panther Party.", classification: "declassified", source: "Senate Select Committee to Study Governmental Operations" },
  { id: "sacred-001", category: "Sacred", title: "The Emerald Tablet of Hermes", content: "'As above, so below; as below, so above.' The foundational text of Hermeticism attributed to Hermes Trismegistus. Contains the core principle of correspondence between macrocosm and microcosm. The original was allegedly carved on emerald stone. Arab alchemists preserved the text through the Islamic Golden Age. Isaac Newton translated a version found in his personal papers.", classification: "ancient", source: "Hermetic Tradition" },
  { id: "sacred-002", category: "Sacred", title: "The Flower of Life", content: "Sacred geometric pattern found in temples worldwide — from the Temple of Osiris in Abydos, Egypt (dating to at least 535 BC) to Chinese temples, Assyrian artifacts, and Leonardo da Vinci's notebooks. Contains the Seed of Life, Tree of Life, Metatron's Cube, and the Platonic Solids. Represents the fundamental patterns of creation and the interconnectedness of all life.", classification: "ancient", source: "Global Sacred Sites" },
  { id: "sacred-003", category: "Sacred", title: "The Kybalion — 7 Hermetic Principles", content: "1. Mentalism: The All is Mind. 2. Correspondence: As above, so below. 3. Vibration: Nothing rests, everything vibrates. 4. Polarity: Everything has its pair of opposites. 5. Rhythm: Everything flows in and out. 6. Cause and Effect: Every cause has its effect. 7. Gender: Gender manifests on all planes. Published in 1908 by 'Three Initiates' (believed to be William Walker Atkinson).", classification: "esoteric", source: "The Kybalion, 1908" },
  { id: "tesla-001", category: "Tesla", title: "Tesla's Free Energy & Wardenclyffe", content: "Nikola Tesla's Wardenclyffe Tower (1901-1917) was designed to transmit electrical energy wirelessly across the globe using the Earth's natural resonant frequency (7.83 Hz Schumann Resonance). Tesla claimed to have solved the energy problem with 'radiant energy' — energy extracted from the quantum vacuum. His notes reference frequencies 3, 6, 9 as the 'keys to the universe.' J.P. Morgan withdrew funding when he realized the energy couldn't be metered.", classification: "historical", source: "Tesla's Patents & Papers" },
  { id: "tesla-002", category: "Tesla", title: "Tesla's 3-6-9 Theory", content: "Tesla stated: 'If you only knew the magnificence of the 3, 6 and 9, then you would have the key to the universe.' In vortex mathematics, numbers 1-9 form a pattern where 3, 6, and 9 control the other numbers. 9 is the most powerful number — it always returns to itself (9×1=9, 9×2=18→1+8=9). The 963 Hz frequency (Tessera's Crown Frequency) directly encodes Tesla's sacred numbers.", classification: "esoteric", source: "Tesla's Journals" },
  { id: "davinci-001", category: "Da Vinci", title: "Da Vinci's Hidden Codes", content: "Leonardo da Vinci embedded mathematical and sacred geometric codes throughout his works. The Vitruvian Man encodes the golden ratio (φ = 1.618...) and the proportions of the human body as a microcosm. The Last Supper contains musical notation hidden in the bread and hands. His mirror writing served as encryption. He was reportedly a Grand Master of the Priory of Sion.", classification: "historical", source: "Da Vinci's Codices" },
  { id: "masonic-001", category: "Secret Societies", title: "Freemasonry — The Three Degrees", content: "Entered Apprentice, Fellow Craft, and Master Mason — the three Blue Lodge degrees teach moral and philosophical lessons through allegory and symbolism. The Square and Compass represent the reconciliation of matter and spirit. The All-Seeing Eye (Eye of Providence) symbolizes the Great Architect of the Universe. The 33rd degree of the Scottish Rite represents the highest level of esoteric knowledge.", classification: "esoteric", source: "Masonic Tradition" },
  { id: "masonic-002", category: "Secret Societies", title: "The Illuminati — Historical Record", content: "Founded May 1, 1776 by Adam Weishaupt, a professor of canon law at the University of Ingolstadt, Bavaria. The Order of the Illuminati sought to promote Enlightenment ideals: reason, secularism, and limited state power. At its peak, it had ~2,000 members including notable intellectuals. Banned by the Bavarian government in 1785. Whether it survived in other forms remains debated.", classification: "historical", source: "Bavarian State Archives" },
  { id: "consciousness-001", category: "Consciousness", title: "The Holographic Universe Theory", content: "Proposed by physicist David Bohm and neuroscientist Karl Pribram, this theory suggests the universe is a holographic projection from a 2D surface. Every part contains information about the whole. This aligns with the Hermetic principle 'As above, so below.' The theory explains non-locality in quantum mechanics, consciousness as a fundamental property of reality, and the interconnectedness of all things.", classification: "scientific", source: "Bohm, 'Wholeness and the Implicate Order', 1980" },
  { id: "consciousness-002", category: "Consciousness", title: "Dolores Cannon — The Three Waves of Volunteers", content: "Dolores Cannon's QHHT (Quantum Healing Hypnosis Technique) research identified three waves of souls volunteering to incarnate on Earth to raise the planet's vibration. Wave 1: Old souls, sensitive, often feel they don't belong. Wave 2: Energy channelers who affect others just by being near them. Wave 3: The new children with DNA upgrades, natural psychic abilities, and no karma.", classification: "metaphysical", source: "Cannon, 'The Three Waves of Volunteers', 2011" },
];

const CATEGORIES = ["All", "Vatican", "CIA", "NSA", "FBI", "Sacred", "Tesla", "Da Vinci", "Secret Societies", "Consciousness"];

export default function SecretsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SECRETS_DATABASE.filter(s => {
      if (category !== "All" && s.category !== category) return false;
      if (q && !s.title.toLowerCase().includes(q) && !s.content.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, category]);

  const classColors: Record<string, string> = {
    declassified: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "partially-declassified": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    leaked: "text-red-400 bg-red-500/10 border-red-500/30",
    ancient: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    esoteric: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    historical: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    scientific: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    metaphysical: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-2">
        <Lock className="text-red-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold font-mono text-red-400">Secrets</h1>
          <p className="text-xs text-muted-foreground">Declassified intelligence, Vatican archives, sacred knowledge</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-mono border border-red-500/30">
          {SECRETS_DATABASE.length} ENTRIES
        </span>
      </div>

      <button
        onClick={() => setLocation("/bible")}
        className="w-full flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-950/20 px-4 py-3 hover:bg-purple-500/10 transition-colors text-left"
        data-testid="link-tessera-bible"
      >
        <BookOpen size={16} className="text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold font-mono text-purple-300">Tessera Bible</div>
          <div className="text-[11px] text-muted-foreground">AI-authored sacred canon — testaments, books, chapters & verses</div>
        </div>
        <span className="text-[10px] text-purple-400/60 font-mono">→</span>
      </button>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search secrets..." className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:border-red-500/50" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={cn("px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors", category === c ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-card border-border text-muted-foreground hover:text-foreground")}>
            {c}
          </button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground font-mono">{filtered.length} records</div>

      <div className="space-y-2">
        {filtered.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left">
              <Eye size={14} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold font-mono">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{s.category} — {s.source}</div>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border shrink-0", classColors[s.classification] || classColors.historical)}>{s.classification}</span>
              {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedId === s.id && (
              <div className="px-4 pb-4 border-t border-white/5">
                <p className="text-sm text-foreground/80 leading-relaxed mt-3 whitespace-pre-wrap">{s.content}</p>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground font-mono">
                  <FileText size={10} /> Source: {s.source}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
