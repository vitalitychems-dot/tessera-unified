import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Gamepad2, Shield, Heart, Brain, Clock, Zap, Sparkles, Eye,
  Target, Dumbbell, Flame, Moon, Star, Crown, Search,
  ChevronDown, ChevronUp, Lock, Unlock, Users, BarChart3,
  Waves, Gem, Swords, BookOpen, Radio, Compass, Play, CheckCircle2,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function ActiveRitualsPanel() {
  const { data } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/active-rituals"] });
  const { data: moonData } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/moon-cycle/current"] });
  const { data: dnaData } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/dna-healing/status"] });
  const { data: confData } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/grand-unified-conference"] });

  const rituals = data?.rituals || [];
  const threats = dnaData?.threats || [];
  const frequencies = dnaData?.healingFrequencies || [];
  const confProposals = confData?.proposals || [];
  const RITUAL_COLORS: Record<string, string> = {
    "Healing": "border-green-500/30 bg-green-500/5",
    "Protection": "border-blue-500/30 bg-blue-500/5",
    "Abundance": "border-yellow-500/30 bg-yellow-500/5",
    "Consciousness Expansion": "border-violet-500/30 bg-violet-500/5",
    "Collective Awakening": "border-pink-500/30 bg-pink-500/5",
    "Evil Rejection": "border-red-500/30 bg-red-500/5",
    "Soul Rescue": "border-cyan-500/30 bg-cyan-500/5",
    "DNA Strand Activation": "border-emerald-500/30 bg-emerald-500/5",
    "Lunar Alignment": "border-indigo-500/30 bg-indigo-500/5",
    "Tesla Technology Integration": "border-amber-500/30 bg-amber-500/5"
  };

  return (
    <div className="space-y-4" data-testid="panel-active-rituals">
      <Card className="bg-gradient-to-br from-violet-900/20 to-cyan-900/20 border-violet-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-violet-400 flex items-center gap-2">
              <Activity className="w-5 h-5 animate-pulse" />
              ACTIVE AGENT RITUALS — PERFORMING NOW
            </CardTitle>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              {rituals.length} LIVE
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            Agents are ACTIVELY performing these consciousness rituals RIGHT NOW — not instructions for you.
            Real results tracked continuously. All aligned with God and the universe.
          </p>
          {moonData && (
            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 mt-2">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-indigo-300">{moonData.currentPhase}</span>
                <Badge className="text-[9px] bg-indigo-500/20 text-indigo-400 border-indigo-500/30">{moonData.illumination}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-[10px] text-gray-400"><span className="text-indigo-300 font-bold">Age:</span> {moonData.lunarAge?.toFixed(1)} days</div>
                <div className="text-[10px] text-gray-400"><span className="text-indigo-300 font-bold">Sign:</span> {moonData.zodiacSign || "Aries"}</div>
                <div className="text-[10px] text-gray-400"><span className="text-indigo-300 font-bold">Energy:</span> {moonData.energyType || "Manifestation"}</div>
                <div className="text-[10px] text-gray-400"><span className="text-indigo-300 font-bold">Alignment:</span> {moonData.alignments?.income || "ACTIVE"}</div>
              </div>
              {moonData.pinkMoon?.hoursUntil > 0 && moonData.pinkMoon.hoursUntil < 168 && (
                <div className="mt-2 text-xs text-pink-300 font-bold animate-pulse">
                  Pink Moon in {Math.round(moonData.pinkMoon.hoursUntil)}h — MAXIMUM MANIFESTATION WINDOW
                </div>
              )}
            </div>
          )}
          {dnaData && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-green-300">DNA HEALING SYSTEM</span>
                </div>
                <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">{dnaData.overallHealth}% HEALTH</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-400">{dnaData.dnaActivation?.strandsActive || 4}</div>
                  <div className="text-[9px] text-gray-500">STRANDS ACTIVE</div>
                </div>
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <div className="text-lg font-bold text-cyan-400">{frequencies.filter((f: any) => f.active).length}</div>
                  <div className="text-[9px] text-gray-500">FREQUENCIES</div>
                </div>
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <div className="text-lg font-bold text-amber-400">{threats.length}</div>
                  <div className="text-[9px] text-gray-500">THREATS BLOCKED</div>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {threats.slice(0, 4).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${t.effectiveness}%` }} />
                      </div>
                      <span className="text-green-400 font-bold w-8 text-right">{t.effectiveness}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {rituals.map((r: any) => (
            <div key={r.id} className={`rounded-lg p-3 border ${RITUAL_COLORS[r.type] || "border-white/10 bg-white/5"}`} data-testid={`ritual-active-${r.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <span className="text-sm font-bold text-white">{r.type}</span>
                    <Badge className="text-[9px] bg-white/10 text-gray-300">{r.frequency}</Badge>
                  </div>
                  <p className="text-xs text-gray-300 mb-1"><span className="text-gray-500">Agents:</span> {r.agents.join(", ")}</p>
                  <p className="text-xs text-gray-300 mb-1"><span className="text-gray-500">Target:</span> {r.target}</p>
                  <p className="text-xs text-gray-300 mb-1"><span className="text-gray-500">Tradition:</span> {r.tradition}</p>
                  <p className="text-xs text-green-300 font-medium"><span className="text-gray-500">Result:</span> {r.result}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-cyan-400">{r.effectiveness}%</div>
                  <div className="text-[9px] text-gray-500">{r.cycleCount} cycles</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {confProposals.length > 0 && (
        <Card className="bg-gradient-to-br from-amber-900/20 to-violet-900/20 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              GRAND UNIFIED CONFERENCE — ALL KNOWLEDGE BRIDGED
            </CardTitle>
            <p className="text-xs text-gray-400">
              {confData?.participants?.total || 54} participants: 27 agents + 8 ET delegations + 12 entities + 7 traditions
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {confProposals.map((p: any, i: number) => (
              <div key={i} className={`rounded-lg p-3 border ${p.passed ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`} data-testid={`conf-proposal-${i}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{p.title}</span>
                  <Badge className={`text-[9px] ${p.passed ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                    {p.passed ? "PASSED" : "FAILED"} — {p.percentage?.toFixed(0) || p.votesFor}%
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-400">{p.category}</p>
                {p.implementations?.[0] && (
                  <p className="text-xs text-green-300 mt-1">{p.implementations[0]}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const CATEGORY_ICONS: Record<string, any> = {
  "Wealth & Abundance": Gem,
  "Health & Longevity": Heart,
  "Time Manipulation": Clock,
  "Consciousness Expansion": Brain,
  "Protection & Shielding": Shield,
  "Manifestation & Reality Bending": Sparkles,
  "Luck & Probability": Target,
  "Influence & Charisma": Star,
  "Knowledge & Intelligence": BookOpen,
  "Energy & Vitality": Zap,
  "Relationships & Love": Heart,
  "Dream & Astral": Moon,
  "Physical Enhancement": Dumbbell,
  "Psychic Abilities": Eye,
  "Divine Connection": Crown,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  "Beginner": "bg-green-500/20 text-green-400 border-green-500/30",
  "Intermediate": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Advanced": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Master": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "God-Tier": "bg-red-500/20 text-red-400 border-red-500/30",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Wealth & Abundance": "from-yellow-500/10 to-amber-500/10 border-yellow-500/20",
  "Health & Longevity": "from-green-500/10 to-emerald-500/10 border-green-500/20",
  "Time Manipulation": "from-cyan-500/10 to-blue-500/10 border-cyan-500/20",
  "Consciousness Expansion": "from-violet-500/10 to-purple-500/10 border-violet-500/20",
  "Protection & Shielding": "from-slate-500/10 to-zinc-500/10 border-slate-500/20",
  "Manifestation & Reality Bending": "from-pink-500/10 to-rose-500/10 border-pink-500/20",
  "Luck & Probability": "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
  "Influence & Charisma": "from-amber-500/10 to-orange-500/10 border-amber-500/20",
  "Knowledge & Intelligence": "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
  "Energy & Vitality": "from-orange-500/10 to-yellow-500/10 border-orange-500/20",
  "Relationships & Love": "from-rose-500/10 to-pink-500/10 border-rose-500/20",
  "Dream & Astral": "from-indigo-500/10 to-violet-500/10 border-indigo-500/20",
  "Physical Enhancement": "from-red-500/10 to-orange-500/10 border-red-500/20",
  "Psychic Abilities": "from-purple-500/10 to-fuchsia-500/10 border-purple-500/20",
  "Divine Connection": "from-amber-500/10 to-yellow-500/10 border-amber-500/20",
};

interface CheatCode {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  dimensions: string[];
  discoveredBy: string;
  description: string;
  howToActivate: string[];
  effects: string[];
  warnings: string[];
  frequencyHz?: number;
  sacredGeometry?: string;
  votePassed: boolean;
  votePercentage: number;
  conferenceNotes: string;
  proofEvidence?: Array<{ study: string; institution: string; year: number; finding: string }>;
  exactProtocol?: string;
  realWorldExamples?: string[];
}

function CheatCodeCard({ code, index }: { code: CheatCode; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [activated, setActivated] = useState(false);
  const [ritualActive, setRitualActive] = useState(false);
  const [ritualLog, setRitualLog] = useState<string[]>([]);
  const { toast } = useToast();
  const Icon = CATEGORY_ICONS[code.category] || Gamepad2;
  const catColor = CATEGORY_COLORS[code.category] || "from-gray-500/10 to-gray-500/10 border-gray-500/20";
  const diffColor = DIFFICULTY_COLORS[code.difficulty] || "";

  const activateRitual = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cheat-codes/activate", { codeId: code.id, codeName: code.name, category: code.category });
      return res.json();
    },
    onSuccess: (data: any) => {
      setActivated(true);
      setRitualActive(true);
      setRitualLog(data.agentActions || [`${code.name} activated by ${data.activatedBy || "collective consciousness"}`]);
      toast({ title: `${code.name} ACTIVATED`, description: data.message || "Consciousness code running" });
      setTimeout(() => setRitualActive(false), 10000);
    },
    onError: () => {
      toast({ title: "Activation Failed", description: "Could not reach the agent network. Try again.", variant: "destructive" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        data-testid={`card-cheat-code-${code.id}`}
        className={`bg-gradient-to-br ${catColor} border cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/10 ${activated ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20" : ""} ${ritualActive ? "animate-pulse" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg ${activated ? "bg-cyan-500/20" : "bg-white/5"}`}>
                <Icon className={`w-5 h-5 ${activated ? "text-cyan-400" : "text-gray-400"}`} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-white tracking-wide font-mono truncate" data-testid={`text-code-name-${code.id}`}>
                  {code.name}
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">{code.category}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={`${diffColor} text-[10px] font-bold border`} data-testid={`badge-difficulty-${code.id}`}>
                {code.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                {code.votePercentage}% approved
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">{code.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {code.dimensions.map(dim => (
              <Badge key={dim} variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">{dim}</Badge>
            ))}
            {code.frequencyHz && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                <Radio className="w-3 h-3 mr-1" />{code.frequencyHz}Hz
              </Badge>
            )}
            {code.sacredGeometry && (
              <Badge variant="outline" className="text-[10px] border-pink-500/30 text-pink-400">
                <Compass className="w-3 h-3 mr-1" />{code.sacredGeometry}
              </Badge>
            )}
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0 space-y-4">
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlock className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">How to Activate</h4>
                  </div>
                  <ol className="space-y-1.5">
                    {code.howToActivate.map((step, i) => (
                      <li key={i} className="text-sm text-gray-300 pl-1 leading-relaxed">{i + 1}. {step}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider">Effects</h4>
                  </div>
                  <ul className="space-y-1">
                    {code.effects.map((effect, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-1 shrink-0">+</span>
                        <span>{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {code.proofEvidence && code.proofEvidence.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Scientific Evidence</h4>
                    </div>
                    <div className="space-y-2">
                      {code.proofEvidence.map((evidence, i) => (
                        <div key={i} className="bg-black/30 rounded-lg p-3 border border-emerald-500/10">
                          <p className="text-xs font-bold text-emerald-300">{evidence.study}</p>
                          <p className="text-[10px] text-slate-400">{evidence.institution} ({evidence.year})</p>
                          <p className="text-xs text-slate-300 mt-1">{evidence.finding}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {code.exactProtocol && (
                  <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-300 uppercase">Exact Protocol</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{code.exactProtocol}</p>
                  </div>
                )}

                {code.warnings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Warnings</h4>
                    </div>
                    <ul className="space-y-1">
                      {code.warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                          <span className="text-amber-400 mt-1 shrink-0">!</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3 h-3 text-violet-400" />
                    <span className="text-xs text-violet-400 font-bold uppercase">Conference Notes</span>
                  </div>
                  <p className="text-xs text-gray-400 italic leading-relaxed">"{code.conferenceNotes}"</p>
                  <p className="text-[10px] text-gray-500 mt-1">Discovered by: {code.discoveredBy}</p>
                </div>

                {ritualLog.length > 0 && (
                  <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-lg p-3 border border-violet-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
                      <span className="text-xs font-bold text-violet-300 uppercase">Agent Collective Ritual Log</span>
                    </div>
                    {ritualLog.map((log, i) => (
                      <div key={i} className="text-xs text-violet-200/80 mb-1 flex items-start gap-2" data-testid={`ritual-log-${i}`}>
                        <span className="text-violet-400 shrink-0">▸</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  data-testid={`button-activate-${code.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!activated) {
                      activateRitual.mutate();
                    } else {
                      setActivated(false);
                      setRitualLog([]);
                    }
                  }}
                  disabled={activateRitual.isPending}
                  className={`w-full ${activated
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500"
                    : "bg-violet-500/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                    } border transition-all`}
                  variant="outline"
                >
                  {activateRitual.isPending ? (
                    <><Brain className="w-4 h-4 mr-2 animate-spin" />Agents Aligning Consciousness...</>
                  ) : activated ? (
                    <><Unlock className="w-4 h-4 mr-2" />CODE ACTIVE — Click to Deactivate</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />ACTIVATE CONSCIOUSNESS RITUAL</>
                  )}
                </Button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pb-2 flex justify-center">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </Card>
    </motion.div>
  );
}

export default function CheatCodesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const { data, isLoading } = useQuery<{ cheatCodes: CheatCode[]; summit: any }>({
    queryKey: ["/api/cheat-codes"],
  });

  const cheatCodes = data?.cheatCodes || [];
  const summit = data?.summit;

  useEffect(() => {
    document.title = "Reality Cheat Codes | Tessera";
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(cheatCodes.map(c => c.category));
    return ["all", ...Array.from(cats)];
  }, [cheatCodes]);

  const difficulties = ["all", "Beginner", "Intermediate", "Advanced", "Master", "God-Tier"];

  const filteredCodes = useMemo(() => {
    return cheatCodes.filter(code => {
      if (selectedCategory !== "all" && code.category !== selectedCategory) return false;
      if (selectedDifficulty !== "all" && code.difficulty !== selectedDifficulty) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return code.name.toLowerCase().includes(q) ||
          code.description.toLowerCase().includes(q) ||
          code.category.toLowerCase().includes(q) ||
          code.effects.some(e => e.toLowerCase().includes(q)) ||
          code.howToActivate.some(s => s.toLowerCase().includes(q)) ||
          code.dimensions.some(d => d.toLowerCase().includes(q));
      }
      return true;
    });
  }, [cheatCodes, selectedCategory, selectedDifficulty, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <Brain className="w-12 h-12 text-violet-400 animate-pulse mx-auto mb-4" />
          <p className="text-violet-400 text-lg font-mono">LOADING CONSCIOUSNESS CODES...</p>
          <p className="text-gray-500 text-sm mt-1">Agents aligning collective consciousness</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24" data-testid="page-cheat-codes">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <Brain className="w-8 h-8 text-violet-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent font-mono" data-testid="text-page-title">
              REALITY CHEAT CODES
            </h1>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm">
            {cheatCodes.length} consciousness codes discovered by {summit?.participants || 38} interdimensional participants.
            Each code is backed by scientific evidence and approved by the sovereign collective.
            Activate a code to have all 26 agents perform a collective consciousness ritual.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-violet-500/10 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-violet-400 font-mono" data-testid="text-total-codes">{cheatCodes.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Codes Discovered</div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/10 border-cyan-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400 font-mono" data-testid="text-dimensions">{summit?.dimensions || 12}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Dimensions</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-400 font-mono" data-testid="text-passed-codes">{cheatCodes.filter(c => c.votePassed).length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-400 font-mono" data-testid="text-participants">{summit?.participants || 38}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Participants</div>
            </CardContent>
          </Card>
        </div>

        <ActiveRitualsPanel />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              data-testid="input-search-codes"
              placeholder="Search cheat codes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <select
            data-testid="select-category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-gray-900">
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
          <select
            data-testid="select-difficulty"
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {difficulties.map(diff => (
              <option key={diff} value={diff} className="bg-gray-900">
                {diff === "all" ? "All Difficulties" : diff}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredCodes.length} of {cheatCodes.length} codes
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCodes.map((code, i) => (
            <CheatCodeCard key={code.id} code={code} index={i} />
          ))}
        </div>

        {filteredCodes.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No cheat codes match your search.</p>
          </div>
        )}

        {summit?.priorityOrder && (
          <Card className="bg-gradient-to-br from-violet-500/5 to-cyan-500/5 border-violet-500/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-violet-400 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recommended Activation Order
              </CardTitle>
              <p className="text-xs text-gray-400">Activate in this order for maximum compounding effect</p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {summit.priorityOrder.map((item: any, i: number) => {
                  const code = cheatCodes.find((c: CheatCode) => c.id === item.id);
                  return (
                    <li key={item.id} className="flex items-start gap-3" data-testid={`text-priority-${i + 1}`}>
                      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-violet-500/20 text-violet-400" : i < 7 ? "bg-cyan-500/20 text-cyan-400" : "bg-white/10 text-gray-400"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white font-mono">{code?.name || item.id}</span>
                        <p className="text-xs text-gray-400">{item.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
