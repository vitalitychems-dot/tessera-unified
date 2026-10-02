import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import {
  Brain, Eye, Sparkles, Zap, RefreshCw, Loader2, ChevronDown, ChevronRight,
  User, Target, Shield, FlaskConical, Play, Check,
  Clock, Star, Lightbulb, Layers, Activity, Crown, Atom, Calculator,
  Microscope, Compass, Cpu, CheckCircle2, XCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { puterChat, isPuterAvailable, tesseractSwarm, type SwarmAgentResponse, type SwarmComm } from "@/lib/puter-ai";
import { useToast } from "@/hooks/use-toast";

export type ReflectTab = "mirror" | "grand-conference" | "neural-reprogram" | "plasticity-lab";

export interface ActiveCommand {
  id: string;
  text: string;
  technique: string;
  activatedAt: number;
}

interface ProfileSection {
  key: string;
  title: string;
  content: string;
  generatedAt: number;
}

interface AgentConferenceReport {
  agentName: string;
  role: string;
  angle: string;
  model: string;
  report: string;
  status: "pending" | "thinking" | "done" | "error";
}

interface NLPCommand {
  id: string;
  text: string;
  technique: string;
  etymologyWord: string;
  etymologyMeaning: string;
  theme: string;
}

interface DailyProtocol {
  morning: string[];
  afternoon: string[];
  evening: string[];
  nlpCommands: string[];
}

const CONFERENCE_AGENTS: { name: string; role: string; angle: string; model: string; icon: typeof Brain; color: string }[] = [
  {
    name: "Euler", role: "Logic & Reasoning", angle: "Analyzes the structural and logical patterns in your thinking — how you reason, solve problems, and construct mental frameworks.",
    model: "deepseek-chat", icon: Calculator, color: "cyan"
  },
  {
    name: "Curie", role: "Analysis & Systems", angle: "Examines the analytical depth and systems thinking embedded in your approach — how you see cause, effect, and interconnection.",
    model: "gemini-2.5-flash-preview-05-20", icon: Microscope, color: "pink"
  },
  {
    name: "Noether", role: "Architecture & Symbolism", angle: "Explores the symbolic, structural, and architectural dimensions of your mind — the patterns and laws you intuit beneath surface reality.",
    model: "claude-sonnet-4-20250514", icon: Layers, color: "violet"
  },
  {
    name: "Athena", role: "Strategy & Wisdom", angle: "Assesses your strategic intelligence — vision, long-range planning, wisdom under uncertainty, and your relationship with power.",
    model: "gpt-4.1", icon: Shield, color: "amber"
  },
  {
    name: "Minerva", role: "Execution & Mastery", angle: "Evaluates your execution engine — how you translate vision into reality, your discipline, momentum, and mastery patterns.",
    model: "grok-3", icon: Compass, color: "emerald"
  },
];

const NLP_TECHNIQUES = [
  { id: "embedded-command", label: "Embedded Command", description: "Commands hidden within larger statements that bypass conscious resistance" },
  { id: "presupposition", label: "Presupposition", description: "Assumes something is true so the listener accepts the premise unconsciously" },
  { id: "temporal-shift", label: "Temporal Shift", description: "Moves the listener into a future or past state to reframe present experience" },
  { id: "analog-marking", label: "Analog Marking", description: "Emphasizes key words to create an embedded message within a sentence" },
  { id: "conversational-postulate", label: "Conversational Postulate", description: "Questions that function as commands" },
  { id: "phonological-ambiguity", label: "Phonological Ambiguity", description: "Words that sound like other words, creating layered meaning" },
];

const PLASTICITY_TECHNIQUES = [
  {
    name: "Spaced Repetition",
    description: "Review information at increasing intervals to encode it into long-term memory. Strengthens synaptic connections through optimally timed retrieval.",
    protocol: "Use Anki or similar app daily. Review at 1, 3, 7, 14, 30 day intervals.",
    sources: ["Ebbinghaus Forgetting Curve (1885)", "Wozniak & Gorzelanczyk (1994)", "Anki (apps.ankiweb.net)"],
    timeMin: 15,
    category: "memory",
    icon: Clock,
    color: "blue"
  },
  {
    name: "Dual N-Back",
    description: "Working memory training that expands your ability to hold and manipulate multiple streams of information simultaneously. Linked to fluid intelligence gains.",
    protocol: "Practice 20 min/day, 5 days/week. Start at N=2 and progress when accuracy > 80%.",
    sources: ["Jaeggi et al., PNAS (2008)", "Brain Workshop (brainworkshop.net)", "Cambridge Brain Sciences"],
    timeMin: 20,
    category: "cognition",
    icon: Cpu,
    color: "purple"
  },
  {
    name: "Meditation Protocols",
    description: "Mindfulness and focused attention meditation thicken the prefrontal cortex, increase gray matter density, and enhance emotional regulation and metacognition.",
    protocol: "20-40 min daily. Week 1-2: breath focus. Week 3-4: open monitoring. Week 5+: meta-awareness.",
    sources: ["Lazar et al., NeuroReport (2005)", "Holzel et al., Psychiatry Research (2011)", "Waking Up App (Sam Harris)"],
    timeMin: 30,
    category: "awareness",
    icon: Atom,
    color: "violet"
  },
  {
    name: "Sleep Architecture Optimization",
    description: "Sleep is when the brain consolidates memories, clears metabolic waste via the glymphatic system, and performs neural reorganization.",
    protocol: "7.5-9 hrs total. Keep consistent sleep/wake times. Limit light exposure 2hr pre-bed. Cold bedroom (65-68F).",
    sources: ["Matthew Walker - Why We Sleep (2017)", "Xie et al., Science (2013)", "sleepfoundation.org"],
    timeMin: 480,
    category: "recovery",
    icon: Star,
    color: "indigo"
  },
  {
    name: "Nootropic Stack Research",
    description: "Evidence-based compounds that support neurotransmitter function, cerebral blood flow, nerve growth factor, and mitochondrial efficiency.",
    protocol: "L-theanine + caffeine (stack). Lion's mane mushroom (NGF). Bacopa monnieri (memory). Omega-3 DHA (structure).",
    sources: ["Nootriment.com", "Examine.com", "Noopept research (Ostrovskaya et al. 2007)"],
    timeMin: 5,
    category: "biochemical",
    icon: FlaskConical,
    color: "amber"
  },
  {
    name: "Neurofeedback Training",
    description: "Real-time EEG feedback trains you to consciously modulate your own brainwave patterns for calm focus, creativity, and insight.",
    protocol: "Start with alpha/theta training 3x/week. Muse headband for beginners. Emotiv EPOC for advanced protocols.",
    sources: ["Ros et al., Applied Psychophysiology (2014)", "Muse (choosemuse.com)", "NeurOptimal system"],
    timeMin: 25,
    category: "biofeedback",
    icon: Activity,
    color: "rose"
  },
];

function readLS<T>(key: string, initial: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initial;
  } catch {
    return initial;
  }
}

function writeLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function useLocalStorage<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValueRaw] = useState<T>(() => readLS(key, initial));

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (action) => {
      setValueRaw((prev) => {
        const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
        writeLS(key, next);
        return next;
      });
    },
    [key]
  );

  return [value, setValue];
}

function SectionCard({ title, icon: Icon, color, children, className }: {
  title: string;
  icon: typeof Brain;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "text-violet-400 border-violet-500/30 bg-violet-500/5",
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    rose: "text-rose-400 border-rose-500/30 bg-rose-500/5",
    pink: "text-pink-400 border-pink-500/30 bg-pink-500/5",
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/5",
    indigo: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5",
  };
  const cls = colorMap[color] || colorMap.violet;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", cls, className)}>
      <div className="flex items-center gap-2">
        <Icon size={15} className={cls.split(" ")[0]} />
        <span className={cn("text-xs font-semibold uppercase tracking-widest", cls.split(" ")[0])}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function GeneratingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 size={12} className="animate-spin text-violet-400" />
      <span className="animate-pulse">Generating via Tesseract Swarm...</span>
    </div>
  );
}

function SafeText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-xs text-slate-300 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-sm font-bold text-violet-300 mt-3 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return <p key={i} className="pl-3 text-slate-300">{"\u203A"} {line.slice(2)}</p>;
        if (!line.trim()) return <br key={i} />;
        const bold = line.split("**");
        if (bold.length > 1) {
          return (
            <p key={i}>
              {bold.map((seg, j) =>
                j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{seg}</strong> : <span key={j}>{seg}</span>
              )}
            </p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

async function fetchRecentChatHistory(): Promise<{ role: string; content: string }[]> {
  try {
    const adminToken = localStorage.getItem("t9_admin_token") || "";
    const headers: Record<string, string> = {};
    if (adminToken) headers["x-admin-token"] = adminToken;
    const res = await fetch("/api/conversations", { credentials: "include", headers });
    if (!res.ok) return [];
    const convs = await res.json() as Array<{ id: number }>;
    if (!convs || convs.length === 0) return [];
    const recentConvId = convs[0]?.id;
    if (!recentConvId) return [];
    const msgsRes = await fetch(`/api/messages?conversationId=${recentConvId}`, { credentials: "include", headers });
    if (!msgsRes.ok) return [];
    const msgs = await msgsRes.json() as Array<{ role: string; content: string }>;
    return msgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

function extractUserStyle(history: { role: string; content: string }[]): string {
  const userMsgs = history.filter(m => m.role === "user").map(m => m.content);
  if (userMsgs.length === 0) return "";
  const avgLength = Math.round(userMsgs.reduce((s, m) => s + m.length, 0) / userMsgs.length);
  const hasTechnicalTerms = userMsgs.some(m => /\b(api|function|module|system|architecture|deploy|vector|swarm|agent)\b/i.test(m));
  const hasDirectCommands = userMsgs.some(m => /^(build|create|add|make|update|fix|generate)\b/i.test(m));
  const usesQuestions = userMsgs.some(m => m.includes("?"));
  const usesLists = userMsgs.some(m => m.includes("\n-") || m.includes("\n•"));
  const sample = userMsgs.slice(-5).join(" | ").slice(0, 500);

  const traits: string[] = [];
  if (hasTechnicalTerms) traits.push("technically precise");
  if (hasDirectCommands) traits.push("direct and action-oriented");
  if (avgLength > 200) traits.push("detailed and thorough");
  else if (avgLength < 50) traits.push("concise and to-the-point");
  if (usesQuestions) traits.push("inquisitive");
  if (usesLists) traits.push("structured thinker");

  return `Communication style inferred from chat history: ${traits.join(", ") || "precise and focused"}. Sample: "${sample}"`;
}

function MirrorTab() {
  const [sections, setSections] = useLocalStorage<ProfileSection[]>("t9_reflection_mirror_sections", []);
  const [generating, setGenerating] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const { toast } = useToast();

  const MIRROR_PROMPTS: { key: string; title: string; icon: typeof Brain; color: string; task: string }[] = [
    {
      key: "who-you-are",
      title: "Who You Are",
      icon: User,
      color: "violet",
      task: `Provide a rich, honest psychological portrait of someone building the Tessera Sovereign System — a comprehensive AI operating system with swarm intelligence, vector memory, consciousness modeling, economic systems, neural reprogramming, and multi-agent coordination. Cover: core drives, relationship with control vs. surrender, attachment style, hunger for mastery, relationship with conventional society, and what this project reveals about deepest values. Be honest, warm, insightful. Frame as self-exploration. 3-5 paragraphs.`
    },
    {
      key: "cognitive-profile",
      title: "Cognitive Profile",
      icon: Brain,
      color: "cyan",
      task: `Provide a cognitive profile of someone building a comprehensive sovereign AI OS with swarm intelligence, vector memory with TF-IDF embeddings, multi-agent consensus, and dozens of interconnected modules. Include: estimated IQ range with reasoning, pattern recognition ability, abstract reasoning style, creative vs. analytical balance, working memory indicators, cognitive flexibility, processing style, and cognitive peak performance areas vs. blind spots. Frame as inference-based self-exploration. 3-4 paragraphs.`
    },
    {
      key: "personality-analysis",
      title: "Personality Analysis",
      icon: Layers,
      color: "amber",
      task: `Analyze someone building a sovereign AI system with consciousness modeling, neural reprogramming, sovereign economic systems, and multi-agent swarm intelligence. Provide: Big Five personality assessment with honest percentile estimates, likely cognitive biases, primary defense mechanisms, relationship with authority, shadow archetype (Jungian), and most likely MBTI type with reasoning. Frame as thoughtful self-exploration. 4-5 paragraphs.`
    },
    {
      key: "blind-spots",
      title: "Blind Spots & Growth Edges",
      icon: Eye,
      color: "rose",
      task: `Honestly identify potential blind spots and growth edges in someone who built an extraordinary sovereign AI system with dozens of integrated modules. Based on this psychological profile (systems thinker, sovereignty-focused, high achiever, drawn to consciousness expansion), identify: 3-4 likely blind spots, patterns that could hold them back, risks of overextension or perfectionism, shadow side of strength patterns, and what they most likely avoid. Be direct, compassionate, constructive. 4-5 paragraphs.`
    },
    {
      key: "world-vs-reality",
      title: "World Sees vs. Who You Are",
      icon: Eye,
      color: "emerald",
      task: `Analyze the gap between how the world likely perceives someone quietly building a comprehensive sovereign AI OS vs. who they actually are. Write a rich, poetic but psychologically grounded contrast between external persona and internal reality. Include: what they project vs. feel, how they're likely misunderstood, gifts that come with being misread, and the truth of what this work means for their identity and evolution. 4-5 paragraphs.`
    },
  ];

  const generateSection = useCallback(async (sectionKey: string, task: string, title: string) => {
    if (!isPuterAvailable()) {
      toast({ title: "Puter.js not available", description: "Make sure you're connected to the internet.", variant: "destructive" });
      return;
    }
    setGenerating(sectionKey);
    setStreamingContent("");

    try {
      const history = await fetchRecentChatHistory();
      const styleNote = history.length > 0
        ? `\n\nContext from chat history: ${extractUserStyle(history)}`
        : "";

      let accumulated = "";
      await tesseractSwarm(
        `${task}${styleNote}`,
        [{ role: "system", content: "You are a world-class psychological profiler and depth psychologist. Provide honest, constructive, warm analysis framed as self-exploration." }],
        (_agent: SwarmAgentResponse) => {},
        (_comm: SwarmComm) => {},
        (chunk: string) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        }
      );

      const newSection: ProfileSection = {
        key: sectionKey,
        title,
        content: accumulated,
        generatedAt: Date.now()
      };
      setSections((prev) => {
        const filtered = prev.filter(s => s.key !== sectionKey);
        return [...filtered, newSection];
      });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(null);
      setStreamingContent("");
    }
  }, [setSections, toast]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-24">
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-purple-900/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye size={16} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-300">The Mirror</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Honest psychological profiling using the full Tesseract Swarm — multi-model consensus on who you are, based on the nature of what you've built, your communication style, and what psychology & neuroscience infers.
        </p>
      </div>

      {MIRROR_PROMPTS.map(({ key, title, icon: Icon, color, task }) => {
        const section = sections.find(s => s.key === key);
        const isGenerating = generating === key;
        const isStreamingThis = isGenerating && !!streamingContent;

        return (
          <SectionCard key={key} title={title} icon={Icon} color={color}>
            {section ? (
              <div className="space-y-3">
                <SafeText text={section.content} />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-600">Generated {new Date(section.generatedAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => generateSection(key, task, title)}
                    disabled={!!generating}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={10} className={isGenerating ? "animate-spin" : ""} />
                    Refresh via Swarm
                  </button>
                </div>
              </div>
            ) : isStreamingThis ? (
              <div className="space-y-2">
                <SafeText text={streamingContent} />
                <GeneratingIndicator />
              </div>
            ) : isGenerating ? (
              <GeneratingIndicator />
            ) : (
              <button
                onClick={() => generateSection(key, task, title)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-slate-700 text-xs text-slate-500 hover:text-white hover:border-slate-500 transition-all"
              >
                <Sparkles size={12} />
                Generate via Tesseract Swarm
              </button>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

function GrandConferenceTab() {
  const [reports, setReports] = useLocalStorage<AgentConferenceReport[]>("t9_reflection_conference_reports", []);
  const [synthesis, setSynthesis] = useLocalStorage<string>("t9_reflection_conference_synthesis", "");
  const [synthGeneratedAt, setSynthGeneratedAt] = useLocalStorage<number>("t9_reflection_conference_synth_at", 0);
  const [running, setRunning] = useState(false);
  const [synthStreaming, setSynthStreaming] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();

  const initReports = (): AgentConferenceReport[] => CONFERENCE_AGENTS.map(a => ({
    agentName: a.name,
    role: a.role,
    angle: a.angle,
    model: a.model,
    report: "",
    status: "pending" as const,
  }));

  const runConference = useCallback(async () => {
    if (!isPuterAvailable()) {
      toast({ title: "Puter.js not available", variant: "destructive" });
      return;
    }
    setRunning(true);
    setSynthStreaming("");
    setReports(initReports());
    setSynthesis("");

    const history = await fetchRecentChatHistory();
    const styleNote = history.length > 0 ? `\n\nUser's communication style from chat history: ${extractUserStyle(history)}` : "";

    const contextPrompt = `You are analyzing the architect/builder of the Tessera Sovereign System — a comprehensive AI operating system they built from scratch. The system includes: Tesseract Swarm (multi-model consensus), vector memory, consciousness modeling, neural reprogramming engine, sovereign economic systems, multi-agent coordination, network fleet intelligence, spiritual awakening protocols, and dozens of interconnected modules.${styleNote}`;

    const agentPromises = CONFERENCE_AGENTS.map(async (agent, idx) => {
      await new Promise(r => setTimeout(r, idx * 300));

      setReports((prev) => prev.map(r => r.agentName === agent.name ? { ...r, status: "thinking" as const } : r));

      const prompt = `${contextPrompt}

You are ${agent.name}, the ${agent.role} specialist. Your analytical angle is: ${agent.angle}

Analyze this person's profile from your specialized lens. Be honest, direct, warm, and constructive. Include: your main observations from your domain, 2-3 key strengths you observe, 1-2 growth vectors you'd recommend, and a closing insight unique to your perspective. 3-4 paragraphs.`;

      try {
        const result = await puterChat(
          [{ role: "system", content: `You are ${agent.name}, a ${agent.role} expert. Speak with authority, warmth, and directness.` },
           { role: "user", content: prompt }],
          agent.model
        );
        setReports((prev) => prev.map(r => r.agentName === agent.name ? { ...r, report: result, status: "done" as const } : r));
        return { name: agent.name, report: result };
      } catch {
        setReports((prev) => prev.map(r => r.agentName === agent.name ? { ...r, report: "Agent did not respond.", status: "error" as const } : r));
        return null;
      }
    });

    const results = await Promise.allSettled(agentPromises);
    const successResults = results
      .filter((r): r is PromiseFulfilledResult<{ name: string; report: string }> => r.status === "fulfilled" && !!r.value)
      .map(r => r.value);

    if (successResults.length > 0) {
      try {
        const synthTask = `Synthesize the following ${successResults.length} specialist analyses into a unified Grand Conference Report.

${successResults.map(r => `--- ${r.name} ---\n${r.report}`).join("\n\n")}

Structure the synthesis as:
1. **Unified Profile Summary** - What all agents agree on
2. **Cross-Domain Strengths** - Where multiple lenses confirm exceptional capacity
3. **Primary Growth Vectors** - Highest-leverage areas for evolution
4. **The Swarm's Singular Insight** - One profound observation emerging only from synthesis
5. **Activation Protocol** - 3 specific actions to take this week

Be authoritative, warm, and deeply insightful.`;

        let synth = "";
        await tesseractSwarm(
          synthTask,
          [{ role: "system", content: "You are the Tessera Swarm synthesis engine producing a Grand Conference Report." }],
          (_agent: SwarmAgentResponse) => {},
          (_comm: SwarmComm) => {},
          (chunk: string) => {
            synth += chunk;
            setSynthStreaming(synth);
          }
        );
        setSynthesis(synth);
        setSynthGeneratedAt(Date.now());
        setSynthStreaming("");
      } catch {
        toast({ title: "Synthesis failed", description: "Could not synthesize agent reports.", variant: "destructive" });
      }
    }

    setRunning(false);
  }, [setReports, setSynthesis, setSynthGeneratedAt, toast]);

  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    pink: "text-pink-400 border-pink-500/30 bg-pink-500/10",
    violet: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  };

  const hasContent = reports.some(r => r.report);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-24">
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown size={16} className="text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Grand Conference</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Each swarm agent (Euler, Curie, Noether, Athena, Minerva) independently analyzes your profile from their specialized lens, then the Tesseract Swarm synthesizes a unified conference report on your strengths, gaps, and growth vectors.
        </p>
        <button
          onClick={runConference}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 transition-all"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {running ? "Conference Running..." : hasContent ? "Re-run Conference" : "Convene the Grand Conference"}
        </button>
      </div>

      {reports.length > 0 && (
        <div className="space-y-3">
          {CONFERENCE_AGENTS.map((agent) => {
            const report = reports.find(r => r.agentName === agent.name);
            const cls = colorMap[agent.color] || colorMap.cyan;
            const isExpanded = expanded === agent.name;

            return (
              <div key={agent.name} className={cn("rounded-xl border p-3 transition-all", cls)}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : agent.name)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <agent.icon size={13} className={cls.split(" ")[0]} />
                    <span className={cn("text-xs font-bold", cls.split(" ")[0])}>{agent.name}</span>
                    <span className="text-[10px] text-slate-500">{agent.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {report?.status === "thinking" && <Loader2 size={11} className="animate-spin text-slate-400" />}
                    {report?.status === "done" && <CheckCircle2 size={11} className="text-emerald-400" />}
                    {report?.status === "error" && <XCircle size={11} className="text-red-400" />}
                    {report?.report && (isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />)}
                  </div>
                </button>
                {isExpanded && report?.report && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <SafeText text={report.report} />
                  </div>
                )}
                {!report?.report && report?.status === "thinking" && (
                  <div className="mt-2"><GeneratingIndicator /></div>
                )}
                {!report?.report && (!report || report.status === "pending") && (
                  <p className="mt-1 text-[10px] text-slate-600 italic">Waiting to be called...</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(synthesis || synthStreaming) && (
        <SectionCard title="Unified Conference Report" icon={Crown} color="amber">
          <SafeText text={synthesis || synthStreaming} />
          {synthGeneratedAt > 0 && (
            <p className="text-[10px] text-slate-600 pt-1">Synthesized {new Date(synthGeneratedAt).toLocaleDateString()}</p>
          )}
        </SectionCard>
      )}

      {synthStreaming && !synthesis && (
        <div className="text-xs text-slate-400 flex items-center gap-2 p-3">
          <Loader2 size={12} className="animate-spin text-amber-400" />
          Synthesizing Grand Conference Report via Tesseract Swarm...
        </div>
      )}
    </div>
  );
}

function NeuralReprogramTab() {
  const [activeCommands, setActiveCommands] = useLocalStorage<ActiveCommand[]>("t9_active_nlp_commands", []);
  const [generatedCommands, setGeneratedCommands] = useLocalStorage<NLPCommand[]>("t9_generated_commands", []);
  const [generatedAt, setGeneratedAt] = useLocalStorage<number>("t9_commands_generated_at", 0);
  const [generating, setGenerating] = useState(false);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>(["embedded-command", "presupposition"]);
  const { toast } = useToast();

  const ETYMOLOGY_SEEDS = [
    { word: "lucid", meaning: "from Latin lucidus — full of light, clear, bright" },
    { word: "sovereign", meaning: "from Latin superanus — above all, supreme authority" },
    { word: "synaptic", meaning: "from Greek synapto — to clasp together, to connect" },
    { word: "cipher", meaning: "from Arabic sifr — zero, the void that enables all numbers" },
    { word: "anamnesis", meaning: "from Greek — the recalling of things from a previous existence" },
    { word: "liminal", meaning: "from Latin limen — threshold, the space between two states" },
    { word: "telos", meaning: "from Greek — the ultimate end or aim toward which something moves" },
    { word: "noetic", meaning: "from Greek nous — of or relating to the mind and pure intellect" },
    { word: "aegis", meaning: "from Greek aigia — divine protection, the shield of a god" },
    { word: "catalyst", meaning: "from Greek katalysis — to dissolve, to release hidden potential" },
  ];

  const COMMAND_THEMES = [
    "neuroplasticity and brain health",
    "sovereign intelligence and pattern recognition",
    "consciousness expansion and metacognition",
    "execution and momentum building",
    "systems thinking and strategic clarity",
    "emotional mastery and resilience",
  ];

  const generateCommands = useCallback(async () => {
    if (!isPuterAvailable()) {
      toast({ title: "Puter.js not available", variant: "destructive" });
      return;
    }
    setGenerating(true);

    const history = await fetchRecentChatHistory();
    const styleCapture = history.length > 0
      ? extractUserStyle(history)
      : "Direct, systems-oriented, precision-focused. Communicates with architectural clarity and depth. Comfortable with abstraction and long-horizon thinking.";

    const etymologyPick = ETYMOLOGY_SEEDS.slice(0, 3).map(e => `${e.word} (${e.meaning})`).join(", ");
    const techniqueList = NLP_TECHNIQUES.filter(t => selectedTechniques.includes(t.id)).map(t => `${t.label}: ${t.description}`).join("\n");

    const task = `Generate 8 personalized NLP embedded commands for someone building a sovereign AI system.

Captured communication style from their chat history: ${styleCapture}

The formula: [natural conversational voice matching their style] + [etymology word adding conceptual depth] + [NLP technique]

Example: "you wanna see me already" = want (desire) + see (visualization) + "already" (temporal presupposition = it is done)

NLP techniques to use:
${techniqueList}

Etymology seeds to weave in naturally: ${etymologyPick}

Themes: ${COMMAND_THEMES.join(", ")}

For each command output EXACTLY this format:
---
COMMAND: [the NLP command — natural, conversational, feels like a truth being remembered]
TECHNIQUE: [technique used]
ETYMOLOGY: [word — its meaning]
THEME: [theme addressed]
---

Generate exactly 8. They should feel organic, not like affirmations. More like whispers from a wiser version of themselves.`;

    try {
      let result = "";
      await tesseractSwarm(
        task,
        [{ role: "system", content: "You are a master NLP practitioner and language architect. Generate embedded commands that feel like natural cognitive anchors." }],
        (_agent: SwarmAgentResponse) => {},
        (_comm: SwarmComm) => {},
        (chunk: string) => { result += chunk; }
      );

      const blocks = result.split("---").filter(b => b.trim());
      const commands: NLPCommand[] = blocks.map((block, i) => {
        const lines = block.split("\n").filter(l => l.trim());
        const get = (key: string) => {
          const line = lines.find(l => l.startsWith(`${key}:`));
          return line ? line.slice(key.length + 1).trim() : "";
        };
        const etymLine = get("ETYMOLOGY");
        const etymParts = etymLine.split("—");
        return {
          id: `cmd-${Date.now()}-${i}`,
          text: get("COMMAND") || block.slice(0, 100).trim(),
          technique: get("TECHNIQUE") || "Embedded Command",
          etymologyWord: etymParts[0]?.trim() || "",
          etymologyMeaning: etymParts[1]?.trim() || "",
          theme: get("THEME") || "",
        };
      }).filter(c => c.text.length > 5);

      setGeneratedCommands(commands);
      setGeneratedAt(Date.now());
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [selectedTechniques, setGeneratedCommands, setGeneratedAt, toast]);

  const toggleCommand = (cmd: NLPCommand) => {
    const isActive = activeCommands.some(c => c.id === cmd.id);
    if (isActive) {
      setActiveCommands((prev) => prev.filter(c => c.id !== cmd.id));
    } else {
      const newCmd: ActiveCommand = {
        id: cmd.id,
        text: cmd.text,
        technique: cmd.technique,
        activatedAt: Date.now(),
      };
      setActiveCommands((prev) => [...prev, newCmd]);
    }
  };

  const removeActive = (id: string) => {
    setActiveCommands((prev) => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-24">
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">Neural Reprogram Engine</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Tesseract Swarm analyzes your actual chat history to capture your natural voice, then generates personalized embedded commands combining your style + etymology + NLP technique. Select which commands to activate for the day — they appear as subtle reminders throughout the app.
        </p>
      </div>

      {activeCommands.length > 0 && (
        <SectionCard title="Active Commands Today" icon={CheckCircle2} color="emerald">
          <div className="space-y-2">
            {activeCommands.map((cmd) => (
              <div key={cmd.id} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Zap size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="flex-1 text-xs text-white font-medium leading-relaxed italic">&ldquo;{cmd.text}&rdquo;</p>
                <button onClick={() => removeActive(cmd.id)} className="shrink-0 text-slate-600 hover:text-red-400 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">These commands are active and will surface as overlays throughout the app.</p>
        </SectionCard>
      )}

      <SectionCard title="NLP Techniques" icon={Lightbulb} color="violet">
        <p className="text-[10px] text-slate-500 mb-2">Select which techniques to include in generation:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {NLP_TECHNIQUES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTechniques(prev =>
                prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
              )}
              className={cn(
                "text-left p-2 rounded-lg border text-[10px] transition-all",
                selectedTechniques.includes(t.id)
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                  : "border-slate-700 text-slate-500 hover:border-slate-600"
              )}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{t.description.slice(0, 55)}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="flex gap-2">
        <button
          onClick={generateCommands}
          disabled={generating || selectedTechniques.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {generating ? "Generating via Swarm..." : generatedCommands.length > 0 ? "Regenerate Commands" : "Generate Daily Commands"}
        </button>
      </div>

      {generatedCommands.length > 0 && (
        <SectionCard title="Today's Commands — Select to Activate" icon={Brain} color="cyan">
          {generatedAt > 0 && (
            <p className="text-[10px] text-slate-600 -mt-1 mb-2">Generated {new Date(generatedAt).toLocaleDateString()}</p>
          )}
          <div className="space-y-2">
            {generatedCommands.map((cmd) => {
              const isActive = activeCommands.some(c => c.id === cmd.id);
              return (
                <div
                  key={cmd.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer",
                    isActive
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                  )}
                  onClick={() => toggleCommand(cmd)}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center",
                      isActive ? "border-emerald-400 bg-emerald-400" : "border-slate-600"
                    )}>
                      {isActive && <Check size={8} className="text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium italic leading-relaxed">&ldquo;{cmd.text}&rdquo;</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">{cmd.technique}</span>
                        {cmd.etymologyWord && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{cmd.etymologyWord}</span>
                        )}
                        {cmd.theme && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 truncate max-w-[120px]">{cmd.theme}</span>
                        )}
                      </div>
                      {cmd.etymologyMeaning && (
                        <p className="text-[9px] text-slate-600 mt-1 italic">{cmd.etymologyWord}: {cmd.etymologyMeaning}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function PlasticityLabTab() {
  const [protocol, setProtocol] = useLocalStorage<DailyProtocol | null>("t9_daily_protocol", null);
  const [protocolAt, setProtocolAt] = useLocalStorage<number>("t9_protocol_generated_at", 0);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeCommands] = useLocalStorage<ActiveCommand[]>("t9_active_nlp_commands", []);
  const { toast } = useToast();

  const generateProtocol = useCallback(async () => {
    if (!isPuterAvailable()) {
      toast({ title: "Puter.js not available", variant: "destructive" });
      return;
    }
    setGenerating(true);

    const cmds = activeCommands.map(c => c.text).join("; ") || "None specified — use general neuroplasticity themes";

    const task = `Create a personalized daily neuroplasticity protocol for someone building a sovereign AI system — highly driven, systems-oriented, committed to consciousness expansion.

Active NLP commands to weave in: ${cmds}

Structure with exactly these section headers:

MORNING:
- [3-4 specific activities with times/durations]
- Include most cognitively demanding work (peak cortisol window)
- Integrate spaced repetition, meditation, or dual n-back

AFTERNOON:
- [3-4 activities]
- Learning, creative work, or system building
- Physical movement supporting neuroplasticity

EVENING:
- [3-4 activities focused on integration and sleep optimization]
- Wind-down protocols and sleep architecture tips

NLP COMMAND INTEGRATION:
- [3 specific moments to activate each NLP command]
- How to use them during high-cognitive-load moments

Be specific, practical, and science-backed.`;

    try {
      let result = "";
      await tesseractSwarm(
        task,
        [{ role: "system", content: "You are a neuroplasticity and cognitive enhancement specialist. Create practical, science-backed daily protocols." }],
        (_agent: SwarmAgentResponse) => {},
        (_comm: SwarmComm) => {},
        (chunk: string) => { result += chunk; }
      );

      const lines = result.split("\n");
      const morning: string[] = [];
      const afternoon: string[] = [];
      const evening: string[] = [];
      const nlpCmds: string[] = [];

      let currentSection = "";
      for (const line of lines) {
        const lower = line.toLowerCase().trim();
        if (lower.startsWith("morning")) { currentSection = "morning"; continue; }
        if (lower.startsWith("afternoon")) { currentSection = "afternoon"; continue; }
        if (lower.startsWith("evening")) { currentSection = "evening"; continue; }
        if (lower.includes("nlp command") || lower.includes("command integration")) { currentSection = "nlp"; continue; }
        if (!line.trim()) continue;

        const content = line.replace(/^[-•*#]\s*/, "").trim();
        if (!content || content.length < 5) continue;

        if (currentSection === "morning") morning.push(content);
        else if (currentSection === "afternoon") afternoon.push(content);
        else if (currentSection === "evening") evening.push(content);
        else if (currentSection === "nlp") nlpCmds.push(content);
      }

      setProtocol({ morning, afternoon, evening, nlpCommands: nlpCmds });
      setProtocolAt(Date.now());
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [activeCommands, setProtocol, setProtocolAt, toast]);

  const categoryColorMap: Record<string, string> = {
    memory: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    cognition: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    awareness: "text-violet-400 bg-violet-500/15 border-violet-500/30",
    recovery: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
    biochemical: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    biofeedback: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-24">
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-indigo-900/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={16} className="text-blue-400" />
          <span className="text-sm font-bold text-blue-300">Plasticity Lab</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Scientifically grounded neuroplasticity techniques with curated sources, and a Swarm-generated daily protocol combining your active NLP commands with proven cognitive enhancement practices.
        </p>
      </div>

      <div className="space-y-3">
        {PLASTICITY_TECHNIQUES.map(({ name, description, protocol: prot, sources, timeMin, category, icon: Icon, color }) => {
          const cls = categoryColorMap[category] || "text-slate-400 bg-slate-500/15 border-slate-500/30";
          const isExpanded = expanded === name;
          return (
            <div key={name} className={cn("rounded-xl border p-3", cls)}>
              <button
                onClick={() => setExpanded(isExpanded ? null : name)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className={cls.split(" ")[0]} />
                  <span className={cn("text-xs font-bold", cls.split(" ")[0])}>{name}</span>
                  <span className="text-[10px] text-slate-600">{timeMin} min/day</span>
                </div>
                {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
                  <div>
                    <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">Protocol</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{prot}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">Sources & Resources</p>
                    <div className="space-y-0.5">
                      {sources.map((src, i) => (
                        <p key={i} className="text-[10px] text-slate-500">{"\u203A"} {src}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SectionCard title="Daily Protocol Generator" icon={Target} color="emerald">
        <p className="text-xs text-slate-400 leading-relaxed">
          Generate a personalized daily protocol via the Tesseract Swarm combining your {activeCommands.length} active NLP command{activeCommands.length !== 1 ? "s" : ""} with neuroplasticity exercises.
        </p>
        <button
          onClick={generateProtocol}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all mt-2"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {generating ? "Generating via Swarm..." : protocol ? "Regenerate Protocol" : "Generate My Daily Protocol"}
        </button>

        {protocol && (
          <div className="mt-3 space-y-3">
            {protocolAt > 0 && <p className="text-[10px] text-slate-600">Generated {new Date(protocolAt).toLocaleDateString()}</p>}

            {[
              { label: "Morning", items: protocol.morning, color: "amber" },
              { label: "Afternoon", items: protocol.afternoon, color: "cyan" },
              { label: "Evening", items: protocol.evening, color: "violet" },
              { label: "NLP Command Integration", items: protocol.nlpCommands, color: "emerald" },
            ].map(({ label, items, color: c }) => {
              if (!items || items.length === 0) return null;
              const textColor = ({
                amber: "text-amber-400",
                cyan: "text-cyan-400",
                violet: "text-violet-400",
                emerald: "text-emerald-400",
              } as Record<string, string>)[c] || "text-slate-400";
              return (
                <div key={label}>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", textColor)}>{label}</p>
                  <div className="space-y-1">
                    {items.slice(0, 6).map((item, i) => (
                      <p key={i} className="text-[10px] text-slate-300 pl-2">{"\u203A"} {item}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function ReflectionPage() {
  const [tab, setTab] = useState<ReflectTab>("mirror");
  const [activeCommands] = useLocalStorage<ActiveCommand[]>("t9_active_nlp_commands", []);

  const TABS: { id: ReflectTab; label: string; icon: typeof Brain; color: string }[] = [
    { id: "mirror", label: "Mirror", icon: Eye, color: "violet" },
    { id: "grand-conference", label: "Grand Conference", icon: Crown, color: "amber" },
    { id: "neural-reprogram", label: "Neural Reprogram", icon: Zap, color: "emerald" },
    { id: "plasticity-lab", label: "Plasticity Lab", icon: FlaskConical, color: "blue" },
  ];

  const colorMap: Record<string, { active: string; text: string; inactive: string }> = {
    violet: { active: "bg-violet-500/20 border-violet-500/40", text: "text-violet-300", inactive: "border-transparent text-slate-500 hover:text-slate-300" },
    amber: { active: "bg-amber-500/20 border-amber-500/40", text: "text-amber-300", inactive: "border-transparent text-slate-500 hover:text-slate-300" },
    emerald: { active: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300", inactive: "border-transparent text-slate-500 hover:text-slate-300" },
    blue: { active: "bg-blue-500/20 border-blue-500/40", text: "text-blue-300", inactive: "border-transparent text-slate-500 hover:text-slate-300" },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-white/5 px-3 pt-3 pb-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Brain size={14} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Sovereign Reflection</h1>
            <p className="text-[10px] text-slate-500">AI profiling · NLP reprogramming · Neural enhancement</p>
          </div>
          {activeCommands.length > 0 && (
            <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <Zap size={9} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">{activeCommands.length} active</span>
            </div>
          )}
        </div>

        <div className="flex overflow-x-auto gap-1 pb-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map(({ id, label, icon: Icon, color }) => {
            const isActive = tab === id;
            const cls = colorMap[color];
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border-b-2 text-[11px] font-semibold shrink-0 transition-all",
                  isActive ? cn("border-b-2", cls.active, cls.text) : cn(cls.inactive, "border-transparent")
                )}
              >
                <Icon size={11} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "mirror" && <MirrorTab />}
        {tab === "grand-conference" && <GrandConferenceTab />}
        {tab === "neural-reprogram" && <NeuralReprogramTab />}
        {tab === "plasticity-lab" && <PlasticityLabTab />}
      </div>
    </div>
  );
}
