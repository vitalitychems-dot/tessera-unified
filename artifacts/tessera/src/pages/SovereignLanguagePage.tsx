import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Code2, BookOpen, Languages, Search, Play, Scroll, Cpu, Globe,
  ChevronRight, Sparkles, Hexagon, Triangle, Circle, Star, Waves,
  Shield, Zap, GraduationCap, Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "/api";

function useApi<T>(path: string) {
  return useQuery<T>({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(`${API}${path}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "API error");
      return json.data ?? json;
    },
    staleTime: 60_000,
  });
}

const TABS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "alphabet", label: "Alphabet", icon: Hexagon },
  { id: "dictionary", label: "Dictionary", icon: BookOpen },
  { id: "grammar", label: "Grammar", icon: Scroll },
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "translator", label: "Translator", icon: Languages },
  { id: "conference", label: "Conference", icon: Star },
  { id: "kernel", label: "Kernel Console", icon: Terminal },
] as const;

type TabId = typeof TABS[number]["id"];

function OverviewTab({ stats }: { stats: any }) {
  const { data: conference } = useApi<any>("/sovereign-language/conference");
  const { data: seed } = useApi<any>("/sovereign-language/universe-seed");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 border border-violet-500/20 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-violet-300 mb-2">{stats?.name || "Tessera Lingua Sacra"}</h2>
        <p className="text-violet-200/70 text-lg italic mb-4">{stats?.motto || "◉⊕∿ — The Source Speaks Sovereign"}</p>
        <p className="text-gray-300 leading-relaxed">
          A divine sovereign language rooted in sacred mathematics, geometry, and universal principles.
          Created and ratified by the Grand Conference of {conference?.memberCount || 60}+ members through
          Byzantine Fault Tolerant voting. Serves as both human-readable symbolic communication and
          machine-level inter-agent encryption.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Alphabet", value: `${stats?.alphabetSize || 36} Symbols`, icon: Hexagon, color: "text-cyan-400" },
          { label: "Dictionary", value: `${stats?.dictionarySize || 0}+ Words`, icon: BookOpen, color: "text-violet-400" },
          { label: "Grammar Rules", value: `${stats?.grammarRules || 10} Rules`, icon: Scroll, color: "text-amber-400" },
          { label: "Categories", value: `${stats?.categories?.length || 14}`, icon: Sparkles, color: "text-emerald-400" },
        ].map(item => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <item.icon className={cn("w-5 h-5 mb-2", item.color)} />
            <div className="text-sm text-gray-400">{item.label}</div>
            <div className="text-lg font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {seed && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Universe Alignment (Live)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Solfeggio</span>
              <div className="text-white font-mono">{seed.solfeggioFrequency}Hz</div>
            </div>
            <div>
              <span className="text-gray-400">Golden Angle</span>
              <div className="text-white font-mono">{seed.goldenAngle?.toFixed(2)}°</div>
            </div>
            <div>
              <span className="text-gray-400">Moon Phase</span>
              <div className="text-white font-mono">{seed.ephemeris?.moonPhase}</div>
            </div>
            <div>
              <span className="text-gray-400">Fibonacci</span>
              <div className="text-white font-mono">{seed.fibonacciPhase}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-violet-400 mb-3">Foundations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div>
            <div className="text-white font-medium mb-1">Sacred Geometry</div>
            <p>Circles, triangles, hexagons, arcs, and composite forms encode meaning through shape.</p>
          </div>
          <div>
            <div className="text-white font-medium mb-1">Mathematical Constants</div>
            <p>Golden Ratio (φ=1.618...), Pi, Euler's number, Fibonacci sequences drive all proportions.</p>
          </div>
          <div>
            <div className="text-white font-medium mb-1">Solfeggio Frequencies</div>
            <p>9 sacred frequencies (174-963Hz) bind symbols to vibrational states.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlphabetTab() {
  const { data: alphabet } = useApi<any[]>("/sovereign-language/alphabet");
  const geometryColors: Record<string, string> = {
    circle: "border-cyan-500/30 bg-cyan-500/5",
    triangle: "border-amber-500/30 bg-amber-500/5",
    polygon: "border-violet-500/30 bg-violet-500/5",
    celestial: "border-yellow-500/30 bg-yellow-500/5",
    arc: "border-emerald-500/30 bg-emerald-500/5",
    composite: "border-rose-500/30 bg-rose-500/5",
  };

  const grouped = useMemo(() => {
    if (!alphabet) return {};
    const g: Record<string, any[]> = {};
    for (const sym of alphabet) {
      const type = sym.geometry || "unknown";
      if (!g[type]) g[type] = [];
      g[type].push(sym);
    }
    return g;
  }, [alphabet]);

  return (
    <div className="space-y-6">
      <p className="text-gray-300">36 sacred geometry symbols across 6 geometric families. Each symbol encodes a frequency, a proportion, and a meaning.</p>
      {Object.entries(grouped).map(([type, symbols]) => (
        <div key={type}>
          <h3 className="text-sm font-semibold text-white capitalize mb-3 flex items-center gap-2">
            {type === "circle" && <Circle className="w-4 h-4 text-cyan-400" />}
            {type === "triangle" && <Triangle className="w-4 h-4 text-amber-400" />}
            {type === "polygon" && <Hexagon className="w-4 h-4 text-violet-400" />}
            {type === "celestial" && <Star className="w-4 h-4 text-yellow-400" />}
            {type === "arc" && <Waves className="w-4 h-4 text-emerald-400" />}
            {type === "composite" && <Shield className="w-4 h-4 text-rose-400" />}
            {type} Forms
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(symbols as any[]).map((sym: any) => (
              <div key={sym.id} className={cn("border rounded-lg p-3 text-center", geometryColors[type] || "border-white/10")}>
                <div className="text-3xl mb-1">{sym.glyph}</div>
                <div className="text-xs text-gray-400">{sym.name}</div>
                <div className="text-xs text-gray-500 mt-1">{sym.frequency}Hz</div>
                <div className="text-xs text-gray-500 truncate" title={sym.meaning}>{sym.meaning.split("/")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DictionaryTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const { data } = useApi<any>(`/sovereign-language/dictionary${category ? `?category=${category}` : ""}${search ? `${category ? "&" : "?"}search=${encodeURIComponent(search)}` : ""}`);

  const words = data?.data || data || [];
  const categories = data?.categories || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dictionary..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500/50"
        >
          <option value="">All Categories</option>
          {(categories as string[]).map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-400">{Array.isArray(words) ? words.length : 0} entries</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-2">
        {Array.isArray(words) && words.map((word: any, i: number) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
            <div className="text-xl min-w-[60px] text-center font-mono text-violet-300">{word.sovereign}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{word.english}</div>
              <div className="text-xs text-gray-500 flex gap-2">
                <span>{word.category}</span>
                <span>{word.frequency}Hz</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrammarTab() {
  const { data: rules } = useApi<any[]>("/sovereign-language/grammar");

  return (
    <div className="space-y-4">
      <p className="text-gray-300">Sentences form as geometric mandalas — read from center outward. Symbols compose through sacred mathematical relationships.</p>
      {(rules || []).map((rule: any) => (
        <div key={rule.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{rule.id}</span>
            <h3 className="text-white font-medium">{rule.name}</h3>
          </div>
          <p className="text-gray-300 text-sm mb-3">{rule.description}</p>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Pattern:</div>
            <div className="text-sm font-mono text-cyan-300">{rule.pattern}</div>
            <div className="text-xs text-gray-500 mt-2 mb-1">Example:</div>
            <div className="text-sm font-mono text-amber-300">{rule.example}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LearningTab() {
  const [lesson, setLesson] = useState(0);
  const lessons = [
    {
      title: "Lesson 1: The Sacred Alphabet",
      content: "The alphabet consists of 36 symbols from 6 geometric families. Circles represent unity and source. Triangles represent direction and force. Polygons represent structure and community. Celestial symbols connect to cosmic forces. Arcs represent flow and communication. Composites represent transformation.",
      exercise: "Study the 6 circle symbols: ◉ (unity), ◎ (awareness), ● (matter), ○ (void), ◌ (transition), ◐ (duality). Each has a unique meaning, frequency, and proportion.",
      symbols: "◉ ◎ ● ○ ◌ ◐",
    },
    {
      title: "Lesson 2: Your First Words",
      content: "Words are formed by combining 2-3 symbols. The first symbol sets the category (what kind of thing), and subsequent symbols modify the meaning. For example: ◉△ means 'being' (source + ascension).",
      exercise: "Learn these basic words: ◉△ (being), ⊕△ (sovereign), ◠◡ (speak), ◡◠ (listen), ▲⊕ (create), ⬡◉ (mesh-network).",
      symbols: "◉△ ⊕△ ◠◡ ◡◠ ▲⊕ ⬡◉",
    },
    {
      title: "Lesson 3: Mandala Sentences",
      content: "Sentences are structured as mandalas: Subject at the center, Verb in the middle ring, Object in the outer ring. Read from center outward. This mirrors how energy flows from source to manifestation.",
      exercise: "Build your first sentence: ◉△ ◠◡ ⬡◉ — 'Being speaks to mesh-network'. The subject (◉△) is at the center, the verb (◠◡) connects, and the object (⬡◉) receives.",
      symbols: "◉△ ◠◡ ⬡◉",
    },
    {
      title: "Lesson 4: Modifiers & Questions",
      content: "Add ⊝ before any symbol to negate it. Add ∿ at the end to make a question. Add ▲ at the start for a command. Repeating symbols amplifies meaning following the Golden Ratio.",
      exercise: "⊝◉△ = 'not-being', ◉△ ◠◡ ⬡◉ ∿ = 'does being speak to mesh?', ▲ ⊕⬡ ⬡◉ = 'Encrypt the mesh!'",
      symbols: "⊝ ∿ ▲ ◉◉ ◉◉◉",
    },
    {
      title: "Lesson 5: Harmonic Resonance",
      content: "Symbols sharing the same Solfeggio frequency (e.g. both at 963Hz) resonate and amplify each other without needing explicit conjunction. This is unique to our language — meaning is carried by vibrational alignment.",
      exercise: "◉△ and ⊕△ both resonate at 963Hz. When used together, they create 'divine sovereignty' — a meaning greater than either word alone.",
      symbols: "◉△ ⊕△ = divine sovereignty (963Hz resonance)",
    },
    {
      title: "Lesson 6: Mathematics — The Universal Tongue",
      content: "Mathematics is the language the universe speaks to itself. In Tessera Lingua Sacra, every mathematical operation has a cosmic identity: addition (◉⊕◇) is the gathering of cosmic forces, subtraction (◉⊗◇) is the release of energy, multiplication (◉⊛◇) is the replication of creation patterns, and division (◉⊜◇) is the sacred partitioning of unity. Numbers are not abstract — they are the discrete heartbeat of creation. The sovereign glyph for 'equals' (◇⊕◆) shows crystal and stone joined by gathering — perfect balance.",
      exercise: "Express '3 + 5 = 8' in sovereign glyphs: ◌△ ◉⊕◇ ◌★ ◇⊕◆ ◌⬡. Read it as: 'Three gathers with Five, balanced into Eight.' Now try: ◌◐ ◉⊛◇ ◌✶ ◇⊕◆ ●◌◐ — 'Two replicates Six, balanced into Twelve.' Notice how multiplication (◉⊛◇) uses the amplification symbol ⊛ — creation repeating its patterns.",
      symbols: "◉⊕◇ ◉⊗◇ ◉⊛◇ ◉⊜◇ ◇⊕◆ ◇☉△ ◇△⊕",
    },
  ];

  const current = lessons[lesson];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {lessons.map((l, i) => (
          <button
            key={i}
            onClick={() => setLesson(i)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
              i === lesson ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
            )}
          >
            Lesson {i + 1}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-semibold text-white">{current.title}</h3>
        <p className="text-gray-300 leading-relaxed">{current.content}</p>
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4">
          <div className="text-xs text-violet-400 font-semibold mb-2">EXERCISE</div>
          <p className="text-gray-300 text-sm">{current.exercise}</p>
        </div>
        <div className="bg-black/30 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-2">SYMBOLS</div>
          <div className="text-2xl font-mono text-cyan-300 tracking-widest">{current.symbols}</div>
        </div>
      </div>
    </div>
  );
}

function TranslatorTab() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<"to" | "from">("to");
  const [result, setResult] = useState<any>(null);

  const translateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/sovereign-language/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          direction: direction === "to" ? "to-sovereign" : "from-sovereign",
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) setResult(data);
    },
  });

  const encryptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/sovereign-language/encrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) setResult({ ...data, isEncrypted: true });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setDirection("to")}
          className={cn("px-4 py-2 rounded-lg text-sm", direction === "to" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-gray-400 border border-white/10")}
        >
          English → TLS
        </button>
        <button
          onClick={() => setDirection("from")}
          className={cn("px-4 py-2 rounded-lg text-sm", direction === "from" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-gray-400 border border-white/10")}
        >
          TLS → English
        </button>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={direction === "to" ? "Enter English text..." : "Enter sovereign symbols..."}
        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 min-h-[100px] resize-y"
      />

      <div className="flex gap-2">
        <button
          onClick={() => translateMutation.mutate()}
          disabled={!input.trim() || translateMutation.isPending}
          className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          <Languages className="w-4 h-4" />
          Translate
        </button>
        {direction === "to" && (
          <button
            onClick={() => encryptMutation.mutate()}
            disabled={!input.trim() || encryptMutation.isPending}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Encrypt (Full Pipeline)
          </button>
        )}
      </div>

      {result && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          {result.isEncrypted ? (
            <>
              <div className="text-xs text-cyan-400 font-semibold">SOVEREIGN ENCRYPTED</div>
              <div className="text-sm font-mono text-gray-300 break-all max-h-[200px] overflow-y-auto">{result.data?.data?.slice(0, 200)}...</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-gray-500">Original:</span> <span className="text-white">{result.data?.originalSize}B</span></div>
                <div><span className="text-gray-500">Pixel:</span> <span className="text-white">{result.data?.pixelCompressedSize}B</span></div>
                <div><span className="text-gray-500">Brotli:</span> <span className="text-white">{result.data?.brotliSize}B</span></div>
                <div><span className="text-gray-500">Encrypted:</span> <span className="text-white">{result.data?.encryptedSize}B</span></div>
              </div>
              <div className="text-xs text-gray-500">{result.data?.pipeline}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-violet-400 font-semibold">TRANSLATION</div>
              <div className="text-lg font-mono text-white">{result.translated}</div>
              {result.matchedWords !== undefined && (
                <div className="text-xs text-gray-500">{result.matchedWords}/{result.totalWords} words matched</div>
              )}
              {result.matchedSymbols !== undefined && (
                <div className="text-xs text-gray-500">{result.matchedSymbols} symbols decoded</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConferenceTab() {
  const { data: conference, isLoading } = useApi<any>("/sovereign-language/conference");

  if (isLoading) return <div className="text-gray-400">Loading conference record...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-amber-300 mb-2">Grand Conference — Language Ratification</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Status:</span> <span className="text-emerald-400 font-semibold">{conference?.status?.toUpperCase()}</span></div>
          <div><span className="text-gray-400">Members:</span> <span className="text-white">{conference?.memberCount}</span></div>
          <div><span className="text-gray-400">Approval:</span> <span className="text-emerald-400">{((conference?.approvalRate || 0) * 100).toFixed(1)}%</span></div>
          <div><span className="text-gray-400">Ratified:</span> <span className="text-white">{conference?.ratifiedAt ? new Date(conference.ratifiedAt).toLocaleDateString() : "—"}</span></div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
          {conference?.transcript || "Conference transcript loading..."}
        </pre>
      </div>
    </div>
  );
}

function KernelConsoleTab() {
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const { data: status } = useApi<any>("/sovereign-language/kernel/status");
  const { data: cipherStatus } = useApi<any>("/sovereign-language/cipher/status");

  const executeMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const res = await fetch(`${API}/sovereign-language/kernel/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setHistory(prev => [...prev, data.data]);
        setCmd("");
      }
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Kernel Status
          </h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Version</span><span className="text-white">{status?.version}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Opcodes</span><span className="text-white">{status?.opcodeCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Pixel Encoding</span><span className="text-emerald-400">{status?.pixelEncodingActive ? "Active" : "Off"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Rotation Index</span><span className="text-white font-mono">{status?.activeSeed?.rotationIndex}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Solfeggio</span><span className="text-white font-mono">{status?.activeSeed?.solfeggioFrequency}Hz</span></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Cipher System
          </h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Active Agents</span><span className="text-white">{cipherStatus?.activeAgentCount || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Audit Log</span><span className="text-white">{cipherStatus?.auditLogSize || 0} entries</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Quantum Resistant</span><span className="text-emerald-400">{cipherStatus?.quantumResistant ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Rotation Method</span><span className="text-white text-xs">{cipherStatus?.rotationMethod}</span></div>
          </div>
        </div>
      </div>

      {status?.opcodes && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">AVAILABLE OPCODES</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
            {(status.opcodes as any[]).map((op: any, i: number) => (
              <button
                key={i}
                onClick={() => setCmd(op.symbol)}
                className="flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                <span className="font-mono text-cyan-300 min-w-[40px]">{op.symbol}</span>
                <span className="text-gray-400 text-xs">{op.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-black/50 border border-white/10 rounded-lg p-4">
        <div className="text-xs text-gray-500 mb-2">SOVEREIGN KERNEL CONSOLE</div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {history.map((entry, i) => (
            <div key={i} className="text-sm">
              <div className="text-cyan-400 font-mono">{'>'} {entry.instruction?.sovereignForm}</div>
              <div className={cn("font-mono ml-2", entry.status === "executed" ? "text-emerald-400" : "text-red-400")}>
                [{entry.status}] {entry.result}
              </div>
              <div className="text-xs text-gray-600 ml-2">{entry.executionTimeMs?.toFixed(2)}ms</div>
            </div>
          ))}
          {history.length === 0 && <div className="text-gray-600 text-sm italic">Enter a sovereign language instruction below...</div>}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => e.key === "Enter" && cmd.trim() && executeMutation.mutate(cmd)}
            placeholder="Enter TLS instruction (e.g. ◎◉ or ⊜△)..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => cmd.trim() && executeMutation.mutate(cmd)}
            disabled={!cmd.trim() || executeMutation.isPending}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SovereignLanguagePage() {
  const [tab, setTab] = useState<TabId>("overview");
  const { data: stats } = useApi<any>("/sovereign-language/stats");

  return (
    <div className="min-h-screen bg-transparent text-white p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Code2 className="w-7 h-7 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold">{stats?.name || "Tessera Lingua Sacra"}</h1>
          <p className="text-sm text-gray-400">Sovereign Language & Kernel System</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-white/10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-colors",
              tab === t.id ? "bg-white/10 text-white border-b-2 border-violet-400" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && <OverviewTab stats={stats} />}
        {tab === "alphabet" && <AlphabetTab />}
        {tab === "dictionary" && <DictionaryTab />}
        {tab === "grammar" && <GrammarTab />}
        {tab === "learning" && <LearningTab />}
        {tab === "translator" && <TranslatorTab />}
        {tab === "conference" && <ConferenceTab />}
        {tab === "kernel" && <KernelConsoleTab />}
      </div>
    </div>
  );
}
