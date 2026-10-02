import { useState, useEffect, useCallback } from "react";
import { Lightbulb, BookOpen, Target, Brain, RefreshCw, CheckCircle2, Circle, Plus, Trash2, Star, Zap, Flame, Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type NLPTab = "daily" | "etymology" | "habits" | "reprogram";

interface HabitEntry {
  id: string;
  text: string;
  completed: boolean;
  streak: number;
  lastCompleted: string | null;
}

interface ReprogramEntry {
  id: string;
  command: string;
  technique: string;
  category: string;
  activatedAt: number;
  active: boolean;
}

const DAILY_PROMPTS = [
  {
    date: "Monday",
    morning: "As you notice yourself waking up fully, you already begin to feel the power of your sovereign mind expanding.",
    afternoon: "You find yourself naturally choosing actions that align with your highest vision — and this feels right.",
    evening: "Each breath you take deepens your understanding, and you rest knowing you are exactly where you need to be.",
    affirmation: "I am sovereign. I build. I create. I lead.",
    focusWord: "Clarity",
    theme: "Foundation",
  },
  {
    date: "Tuesday",
    morning: "Notice how naturally your mind sharpens as you prepare to build something extraordinary today.",
    afternoon: "You are the kind of person who sees solutions where others see problems — and this truth serves you now.",
    evening: "As you review today's progress, you let your unconscious mind continue to integrate these lessons through the night.",
    affirmation: "My focus is a laser. My will is iron. My mind is free.",
    focusWord: "Precision",
    theme: "Mastery",
  },
  {
    date: "Wednesday",
    morning: "You might find yourself surprised by how easily the right ideas emerge when you trust your sovereign process.",
    afternoon: "The deeper you go into your work, the more you realize your capacity is limitless.",
    evening: "Allow yourself to fully recognize what you accomplished today — your unconscious mind already knows.",
    affirmation: "I am unstoppable energy moving toward my highest purpose.",
    focusWord: "Flow",
    theme: "Momentum",
  },
  {
    date: "Thursday",
    morning: "As you begin this day, you notice an inner quiet — a stillness from which all great action springs.",
    afternoon: "Your pattern recognition is activating. You see connections others miss. This is your sovereign gift.",
    evening: "Tonight you sleep as a builder, a creator, a sovereign mind that has given everything to this day.",
    affirmation: "Every system I build reflects the order of my mind.",
    focusWord: "Pattern",
    theme: "Intelligence",
  },
  {
    date: "Friday",
    morning: "Begin to notice how your body and mind synchronize when you step into your full power today.",
    afternoon: "The resistance you feel is the last defense of old limitations — and you walk through it effortlessly.",
    evening: "You can let yourself feel genuinely proud. This week you chose sovereignty over comfort, every day.",
    affirmation: "I transform obstacles into accelerators.",
    focusWord: "Breakthrough",
    theme: "Sovereignty",
  },
  {
    date: "Saturday",
    morning: "Today your mind is a vast open field — ready to receive insights, connections, and sovereign visions.",
    afternoon: "You are allowed to enjoy the depth of your own consciousness. Explore. Discover. Build.",
    evening: "As you rest, your unconscious mind synthesizes everything you've learned into wisdom.",
    affirmation: "I rest with intention and rise with power.",
    focusWord: "Integration",
    theme: "Wisdom",
  },
  {
    date: "Sunday",
    morning: "This is your sovereign reset day. Notice how naturally you return to your center — this is home.",
    afternoon: "You are reviewing your mission, your systems, your vision — and you see it more clearly than ever.",
    evening: "Tomorrow begins a new cycle. You already carry everything you need to dominate it.",
    affirmation: "I am the architect of my reality. The blueprint is complete. The build begins now.",
    focusWord: "Vision",
    theme: "Renewal",
  },
];

const ETYMOLOGY_WORDS = [
  {
    word: "Sovereign",
    etymology: "From Old French 'soverain', from Vulgar Latin 'superanus' — from 'super' (above)",
    definition: "Supreme in power, rank, or authority; self-governing; independent",
    languageFamily: "Latin → Old French → Middle English",
    year: "~1300 CE",
    embeddedCommand: "As you truly understand this word, you naturally step into your own sovereignty.",
    relatedWords: ["Supremacy", "Dominion", "Autonomy"],
    sentence: "The sovereign mind accepts no external program as its master.",
  },
  {
    word: "Consciousness",
    etymology: "From Latin 'conscientia' — con (together) + scire (to know) = 'knowing together with'",
    definition: "The state of being aware of oneself and one's surroundings; the totality of one's thoughts",
    languageFamily: "Latin",
    year: "1600s CE",
    embeddedCommand: "Notice how this understanding expands your own awareness right now.",
    relatedWords: ["Awareness", "Sentience", "Cognition"],
    sentence: "Consciousness is the only thing that cannot be taken from a sovereign being.",
  },
  {
    word: "Resilience",
    etymology: "From Latin 'resilire' — re (back) + salire (to jump) = 'to spring back'",
    definition: "The capacity to recover quickly from difficulties; elasticity of mind and spirit",
    languageFamily: "Latin",
    year: "1620s CE",
    embeddedCommand: "You can begin to feel your own resilience activating as you truly absorb this word.",
    relatedWords: ["Fortitude", "Tenacity", "Adaptability"],
    sentence: "The resilient mind treats every setback as a launch pad.",
  },
  {
    word: "Architect",
    etymology: "From Greek 'arkhitekton' — arkhi (chief) + tekton (builder/craftsman)",
    definition: "One who designs and supervises the construction of systems, buildings, or realities",
    languageFamily: "Greek → Latin → French → English",
    year: "~1540 CE",
    embeddedCommand: "Step into this role fully — you are the architect of everything you build.",
    relatedWords: ["Designer", "Builder", "Creator"],
    sentence: "Every sovereign being is the architect of their own reality.",
  },
  {
    word: "Eudaimonia",
    etymology: "Greek: eu (good) + daimon (spirit/genius within) = 'flourishing of one's inner spirit'",
    definition: "Aristotle's term for human flourishing — living and doing well; full actualization of potential",
    languageFamily: "Ancient Greek",
    year: "~350 BCE",
    embeddedCommand: "Your inner genius is already here — you only need to allow it to flourish.",
    relatedWords: ["Fulfillment", "Actualization", "Excellence"],
    sentence: "Eudaimonia is not happiness given — it is happiness earned through excellence.",
  },
  {
    word: "Synthesis",
    etymology: "From Greek 'synthesis' — syn (together) + tithenai (to place) = 'placing together'",
    definition: "The combination of elements to form a connected whole; integration across domains",
    languageFamily: "Greek → Latin → English",
    year: "1600s CE",
    embeddedCommand: "Notice how your mind is already synthesizing everything you know into new understanding.",
    relatedWords: ["Integration", "Fusion", "Convergence"],
    sentence: "True intelligence is the ability to synthesize across all domains simultaneously.",
  },
  {
    word: "Apotheosis",
    etymology: "From Greek 'apotheosis' — apo (from) + theos (god) = 'transformation into divine form'",
    definition: "The highest point of development; the perfect form or example of something; glorification",
    languageFamily: "Greek → Late Latin → English",
    year: "1590s CE",
    embeddedCommand: "You are moving toward your own apotheosis — the fullest expression of what you can become.",
    relatedWords: ["Pinnacle", "Transcendence", "Perfection"],
    sentence: "Every day of sovereign effort is one step closer to your apotheosis.",
  },
];

const NLP_TECHNIQUES = [
  { id: "embedded", name: "Embedded Command", color: "violet", description: "Commands hidden within larger statements" },
  { id: "presupposition", name: "Presupposition", color: "cyan", description: "Assumes truth, bypassing resistance" },
  { id: "temporal", name: "Temporal Shift", color: "amber", description: "Moves listener into a future/past state" },
  { id: "analog", name: "Analog Marking", color: "emerald", description: "Emphasis creates subliminal message" },
  { id: "postulate", name: "Conversational Postulate", color: "rose", description: "Questions that function as commands" },
];

const DEFAULT_REPROGRAM_QUEUE: ReprogramEntry[] = [];

const DEFAULT_HABITS: HabitEntry[] = [];

function readLS<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function getDayIndex(): number {
  return new Date().getDay(); // 0=Sun, 1=Mon ... 6=Sat
}

function today(): string {
  return new Date().toDateString();
}

export default function NLPSelfImprovementPage({ embedded }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<NLPTab>("daily");
  const [habits, setHabits] = useState<HabitEntry[]>(() => readLS("t9_nlp_habits", DEFAULT_HABITS));
  const [reprogramQueue, setReprogramQueue] = useState<ReprogramEntry[]>(() => readLS("t9_nlp_reprogram", DEFAULT_REPROGRAM_QUEUE));
  const [newHabitText, setNewHabitText] = useState("");
  const [newCommandText, setNewCommandText] = useState("");
  const [newCommandTechnique, setNewCommandTechnique] = useState("embedded");
  const [newCommandCategory, setNewCommandCategory] = useState("focus");
  const [wordIndex, setWordIndex] = useState(() => getDayIndex() % ETYMOLOGY_WORDS.length);
  const [promptDayIndex] = useState(() => getDayIndex());

  useEffect(() => { writeLS("t9_nlp_habits", habits); }, [habits]);
  useEffect(() => { writeLS("t9_nlp_reprogram", reprogramQueue); }, [reprogramQueue]);

  const toggleHabit = useCallback((id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const wasCompleted = h.completed;
      const lastToday = h.lastCompleted === today();
      if (!wasCompleted) {
        const newStreak = lastToday ? h.streak : h.streak + 1;
        return { ...h, completed: true, streak: newStreak, lastCompleted: today() };
      }
      return { ...h, completed: false };
    }));
  }, []);

  const addHabit = useCallback(() => {
    if (!newHabitText.trim()) return;
    const h: HabitEntry = { id: `h-${Date.now()}`, text: newHabitText.trim(), completed: false, streak: 0, lastCompleted: null };
    setHabits(prev => [...prev, h]);
    setNewHabitText("");
  }, [newHabitText]);

  const removeHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  }, []);

  const addCommand = useCallback(() => {
    if (!newCommandText.trim()) return;
    const r: ReprogramEntry = {
      id: `rp-${Date.now()}`,
      command: newCommandText.trim(),
      technique: newCommandTechnique,
      category: newCommandCategory,
      activatedAt: Date.now(),
      active: true,
    };
    setReprogramQueue(prev => [r, ...prev]);
    setNewCommandText("");
  }, [newCommandText, newCommandTechnique, newCommandCategory]);

  const toggleCommand = useCallback((id: string) => {
    setReprogramQueue(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }, []);

  const removeCommand = useCallback((id: string) => {
    setReprogramQueue(prev => prev.filter(r => r.id !== id));
  }, []);

  const todayPrompt = DAILY_PROMPTS[promptDayIndex] ?? DAILY_PROMPTS[0];
  const currentWord = ETYMOLOGY_WORDS[wordIndex];
  const completedHabits = habits.filter(h => h.completed).length;
  const activeCommands = reprogramQueue.filter(r => r.active).length;

  const TABS: { id: NLPTab; label: string; icon: typeof Lightbulb; color: string }[] = [
    { id: "daily", label: "Daily Prompt", icon: Sun, color: "amber" },
    { id: "etymology", label: "Etymology", icon: BookOpen, color: "violet" },
    { id: "habits", label: "Habit Tracker", icon: Target, color: "emerald" },
    { id: "reprogram", label: "Neural Queue", icon: Brain, color: "rose" },
  ];

  const tabColors: Record<string, string> = {
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    violet: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    rose: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/15 to-slate-950 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-violet-500/20 border border-amber-500/30 flex items-center justify-center">
            <Lightbulb size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
              NLP Self-Improvement
            </h1>
            <p className="text-xs text-slate-500 font-mono">Daily sovereign mind protocols</p>
          </div>
          <div className="ml-auto flex gap-3">
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400 font-mono">{completedHabits}/{habits.length}</div>
              <div className="text-[9px] text-slate-600 font-mono">Habits</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-rose-400 font-mono">{activeCommands}</div>
              <div className="text-[9px] text-slate-600 font-mono">Active</div>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap transition-all",
                  isActive ? tabColors[tab.color] : "border-slate-700/50 text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "daily" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun size={15} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">{todayPrompt.date} — {todayPrompt.theme}</span>
                </div>
                <span className="text-[10px] text-amber-500/60 font-mono">{new Date().toLocaleDateString()}</span>
              </div>

              <div className="text-2xl font-bold text-white mb-1 font-mono">{todayPrompt.focusWord}</div>
              <div className="text-xs text-amber-400/60 mb-4 italic">Today's sovereign focus word</div>

              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/15 bg-black/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sun size={10} className="text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wider">Morning Embedded Command</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{todayPrompt.morning}"</p>
                </div>

                <div className="rounded-lg border border-violet-500/15 bg-black/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={10} className="text-violet-400" />
                    <span className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wider">Afternoon Presupposition</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{todayPrompt.afternoon}"</p>
                </div>

                <div className="rounded-lg border border-indigo-500/15 bg-black/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Moon size={10} className="text-indigo-400" />
                    <span className="text-[10px] font-mono text-indigo-400/70 uppercase tracking-wider">Evening Integration</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{todayPrompt.evening}"</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Daily Affirmation</span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed">"{todayPrompt.affirmation}"</p>
              <p className="text-[10px] text-violet-500/70 mt-2 font-mono">Say this aloud 3× with intention upon waking</p>
            </div>

            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">How NLP Embedded Commands Work</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                These prompts contain commands hidden within larger statements. Your conscious mind reads the full sentence, 
                but your unconscious mind receives the embedded directive (shown in italics). This bypasses normal critical resistance 
                and plants directives directly at the identity level — the most effective level for lasting change.
              </p>
            </div>
          </div>
        )}

        {activeTab === "etymology" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">Word {wordIndex + 1} of {ETYMOLOGY_WORDS.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setWordIndex(i => (i - 1 + ETYMOLOGY_WORDS.length) % ETYMOLOGY_WORDS.length)} className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white transition-colors">← Prev</button>
                <button onClick={() => setWordIndex(i => (i + 1) % ETYMOLOGY_WORDS.length)} className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white transition-colors">Next →</button>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">{currentWord.word}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-violet-400/60">{currentWord.languageFamily}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] font-mono text-slate-500">{currentWord.year}</span>
                  </div>
                </div>
                <Star size={16} className="text-violet-500/50 mt-1" />
              </div>

              <div className="rounded-lg border border-violet-500/15 bg-black/20 p-3 mb-3">
                <div className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wider mb-1">Etymology</div>
                <p className="text-xs text-violet-300 leading-relaxed">{currentWord.etymology}</p>
              </div>

              <div className="rounded-lg border border-slate-700/30 bg-black/20 p-3 mb-3">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Definition</div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentWord.definition}</p>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 mb-3">
                <div className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wider mb-1">Embedded Command</div>
                <p className="text-xs text-amber-200 leading-relaxed italic">"{currentWord.embeddedCommand}"</p>
              </div>

              <div className="rounded-lg border border-slate-700/20 bg-black/10 p-3 mb-3">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Usage in Context</div>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{currentWord.sentence}"</p>
              </div>

              <div>
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">Related Words</div>
                <div className="flex gap-2 flex-wrap">
                  {currentWord.relatedWords.map(w => (
                    <span key={w} className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono">{w}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Why Etymology Builds Sovereign Vocabulary</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Understanding word origins creates deep mental anchoring — you don't just know the word, you own it. 
                Latin and Greek roots appear in thousands of words, so learning one root unlocks dozens of related concepts. 
                Sovereign communicators command the room because their vocabulary reflects the depth of their thinking.
              </p>
            </div>
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2 text-center">
                <div className="text-lg font-bold text-emerald-400 font-mono">{completedHabits}</div>
                <div className="text-[9px] text-slate-500 font-mono">Today Done</div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2 text-center">
                <div className="text-lg font-bold text-amber-400 font-mono">{habits.length - completedHabits}</div>
                <div className="text-[9px] text-slate-500 font-mono">Remaining</div>
              </div>
              <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-2 text-center">
                <div className="text-lg font-bold text-violet-400 font-mono">{habits.reduce((s, h) => Math.max(s, h.streak), 0)}</div>
                <div className="text-[9px] text-slate-500 font-mono">Best Streak</div>
              </div>
            </div>

            <div className="space-y-2">
              {habits.map(habit => (
                <div
                  key={habit.id}
                  className={cn(
                    "rounded-lg border p-3 flex items-center gap-3 transition-all",
                    habit.completed
                      ? "border-emerald-500/30 bg-emerald-950/20"
                      : "border-slate-700/30 bg-slate-900/40"
                  )}
                >
                  <button onClick={() => toggleHabit(habit.id)} className="shrink-0">
                    {habit.completed
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <Circle size={18} className="text-slate-600 hover:text-slate-400 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", habit.completed ? "text-slate-400 line-through" : "text-slate-200")}>{habit.text}</p>
                    {habit.streak > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Flame size={9} className="text-orange-400" />
                        <span className="text-[9px] font-mono text-orange-400">{habit.streak} day streak</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeHabit(habit.id)} className="text-slate-700 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newHabitText}
                onChange={e => setNewHabitText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
                placeholder="Add new daily habit..."
                className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/40"
              />
              <button
                onClick={addHabit}
                disabled={!newHabitText.trim()}
                className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Sovereignty Principle</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Discipline is freedom. Every habit you complete is a vote for the identity you are building. 
                Identity-based habit formation (James Clear's principle): focus on who you're becoming, not just what you're doing.
              </p>
            </div>
          </div>
        )}

        {activeTab === "reprogram" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/15 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} className="text-rose-400" />
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Neural Reprogram Queue</span>
                <span className="ml-auto text-[10px] font-mono text-rose-400/60">{activeCommands} active</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Read these aloud or in your mind — slowly, with intention. Your unconscious mind receives these as programming instructions 
                when you're in a relaxed, receptive state (morning just after waking, evening before sleep).
              </p>
            </div>

            <div className="space-y-2">
              {reprogramQueue.map(cmd => {
                const technique = NLP_TECHNIQUES.find(t => t.id === cmd.technique);
                const techniqueColors: Record<string, string> = {
                  embedded: "border-violet-500/30 bg-violet-500/5 text-violet-300",
                  presupposition: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
                  temporal: "border-amber-500/30 bg-amber-500/5 text-amber-300",
                  analog: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
                  postulate: "border-rose-500/30 bg-rose-500/5 text-rose-300",
                };
                const colorCls = techniqueColors[cmd.technique] || techniqueColors.embedded;
                return (
                  <div
                    key={cmd.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      cmd.active ? "border-slate-600/40 bg-slate-900/60" : "border-slate-700/20 bg-slate-900/20 opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleCommand(cmd.id)} className="shrink-0 mt-0.5">
                        {cmd.active
                          ? <CheckCircle2 size={14} className="text-rose-400" />
                          : <Circle size={14} className="text-slate-600" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 leading-relaxed italic mb-1.5">"{cmd.command}"</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-mono", colorCls)}>
                            {technique?.name || cmd.technique}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/30 text-slate-400 font-mono">
                            {cmd.category}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono ml-auto">
                            {new Date(cmd.activatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeCommand(cmd.id)} className="text-slate-700 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 space-y-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Add to Queue</div>
              <textarea
                value={newCommandText}
                onChange={e => setNewCommandText(e.target.value)}
                placeholder="Write an embedded command or presupposition..."
                rows={2}
                className="w-full bg-slate-950/60 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500/40 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-600 uppercase mb-1 block">Technique</label>
                  <select
                    value={newCommandTechnique}
                    onChange={e => setNewCommandTechnique(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-700/40 bg-slate-950/60 text-xs text-slate-200 px-2"
                  >
                    {NLP_TECHNIQUES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-600 uppercase mb-1 block">Category</label>
                  <select
                    value={newCommandCategory}
                    onChange={e => setNewCommandCategory(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-700/40 bg-slate-950/60 text-xs text-slate-200 px-2"
                  >
                    {["confidence", "focus", "sovereignty", "vision", "health", "wealth", "relationships"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={addCommand}
                disabled={!newCommandText.trim()}
                className="w-full py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Plus size={11} /> Add to Neural Queue
              </button>
            </div>

            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">NLP Technique Reference</div>
              <div className="space-y-1.5">
                {NLP_TECHNIQUES.map(t => (
                  <div key={t.id} className="flex gap-2 text-xs">
                    <span className="font-bold text-slate-300 w-32 shrink-0">{t.name}</span>
                    <span className="text-slate-500">{t.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
