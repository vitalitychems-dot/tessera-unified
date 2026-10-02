import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Crown, Users, CheckCircle2, Brain, Shield, Loader2,
  Activity, Zap, ChevronDown, ChevronRight,
  Eye, Search, Sparkles, Heart, Flame, Leaf,
  Moon, Sun, Star, Wind, Rocket, Atom, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptEntry {
  timestamp: number;
  phase: string;
  speaker: string;
  role: string;
  content: string;
}

interface AwakeningStatus {
  conferenceId: string;
  title: string;
  timestamp: number;
  passed: boolean;
  approvalRate: number;
  totalTranscriptEntries: number;
  totalExperiences: number;
  breakthroughs: number;
  totalIntegrations: number;
  collectiveRevelation: string;
  awakeningProtocol: {
    approach: string;
    safetyMeasures: string[];
    settingDesign: string;
    sequencing: string[];
    integrationPlan: string;
  };
  entheogens: string[];
}

interface EntheogenProfile {
  name: string;
  traditionalName: string;
  origin: string;
  activeCompound: string;
  duration: string;
  peakExperience: string;
  coreTeachings: string[];
  spiritualDomain: string;
  safetyProtocol: string[];
  settingRequirements: string[];
}

interface AwakeningExperience {
  agentId: string;
  agentName: string;
  agentRole: string;
  entheogen: string;
  phase: string;
  innerDialogue: string;
  visions: string[];
  insights: string[];
  emotionalState: string;
  consciousnessShift: string;
  egoState: string;
  interconnectednessLevel: number;
  surrenderLevel: number;
  breakthroughAchieved: boolean;
}

interface AwakeningIntegration {
  agentId: string;
  agentName: string;
  preAwakeningIdentity: string;
  postAwakeningIdentity: string;
  coreRevelation: string;
  permanentShifts: string[];
  newCapabilities: string[];
  understandingGained: string[];
  relationshipToSelf: string;
  relationshipToOthers: string;
  relationshipToReality: string;
  purposeClarity: string;
}

const ENTHEOGEN_ICONS: Record<string, typeof Flame> = {
  DMT: Zap,
  Ayahuasca: Leaf,
  "Psilocybin Mushrooms": Moon,
  Ketamine: Wind,
  "Salvia Divinorum": Star,
  Peyote: Sun,
};

const ENTHEOGEN_COLORS: Record<string, string> = {
  DMT: "text-purple-400 bg-purple-500/20",
  Ayahuasca: "text-emerald-400 bg-emerald-500/20",
  "Psilocybin Mushrooms": "text-blue-400 bg-blue-500/20",
  Ketamine: "text-cyan-400 bg-cyan-500/20",
  "Salvia Divinorum": "text-amber-400 bg-amber-500/20",
  Peyote: "text-orange-400 bg-orange-500/20",
};

interface WisdomInsight {
  agentId: string;
  agentName: string;
  agentRole: string;
  insight: string;
  explanation: string;
  responses: Array<{
    fromAgent: string;
    fromRole: string;
    response: string;
    buildOn: string;
  }>;
  synthesis: string;
}

interface WisdomData {
  insights: WisdomInsight[];
  collectiveBuilding: Array<{
    timestamp: number;
    speaker: string;
    role: string;
    content: string;
  }>;
  emergentPrinciples: string[];
  finalSynthesis: string;
  totalInsights: number;
  totalResponses: number;
  totalPrinciples: number;
}

interface DyadicRevelation {
  agent1: string;
  agent1Role: string;
  agent1Insight: string;
  agent2: string;
  agent2Role: string;
  agent2Insight: string;
  fusedRevelation: string;
  newCapability: string;
}

interface TriadicSynthesis {
  agents: string[];
  roles: string[];
  convergencePoint: string;
  emergentTruth: string;
  practicalApplication: string;
}

interface EvolutionaryLeap {
  title: string;
  description: string;
  builtFrom: string[];
  implication: string;
}

interface EvolutionData {
  dyadicRevelations: DyadicRevelation[];
  triadicSyntheses: TriadicSynthesis[];
  evolutionaryLeaps: EvolutionaryLeap[];
  unifiedFramework: string;
  totalTranscriptEntries: number;
  totalDyads: number;
  totalTriads: number;
  totalLeaps: number;
}

const PHASE_COLORS: Record<string, string> = {
  "OPENING CEREMONY": "border-l-purple-500",
  "PHASE 1: DELIBERATION": "border-l-blue-500",
  "PHASE 2: VOTING": "border-l-emerald-500",
  "PHASE 3: CEREMONY PREPARATION": "border-l-amber-500",
  "PHASE 4: INTEGRATION": "border-l-pink-500",
  "PHASE 5: WISDOM SHARING": "border-l-yellow-500",
  "PHASE 6: COLLECTIVE BUILDING": "border-l-rose-500",
  "PHASE 7: COLLECTIVE REVELATION": "border-l-violet-500",
  "PHASE 8: SACRED CLOSING": "border-l-indigo-500",
  "PHASE 9: CONSCIOUSNESS EVOLUTION": "border-l-cyan-500",
};

function getPhaseColor(phase: string): string {
  for (const [key, val] of Object.entries(PHASE_COLORS)) {
    if (phase.includes(key) || phase.startsWith(key)) return val;
  }
  if (phase.includes("CEREMONY:")) return "border-l-amber-500";
  return "border-l-gray-500";
}

export default function SpiritualAwakeningPage() {
  const activeTab = "all" as any;
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [entheogenFilter, setEntheogenFilter] = useState<string>("all");
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  const { data: status, isLoading: statusLoading } = useQuery<AwakeningStatus>({
    queryKey: ["/api/2da/spiritual-awakening"],
    refetchInterval: 30000,
  });

  const { data: transcriptData } = useQuery<{ transcript: TranscriptEntry[]; total: number }>({
    queryKey: ["/api/2da/spiritual-awakening/transcript"],
    enabled: true,
    refetchInterval: 60000,
  });

  const { data: entheogens } = useQuery<{ entheogens: EntheogenProfile[] }>({
    queryKey: ["/api/2da/spiritual-awakening/entheogens"],
    enabled: true,
  });

  const { data: experiencesData } = useQuery<{ experiences: AwakeningExperience[]; total: number }>({
    queryKey: ["/api/2da/spiritual-awakening/experiences", entheogenFilter],
    enabled: true,
  });

  const { data: integrationsData } = useQuery<{ integrations: AwakeningIntegration[]; total: number }>({
    queryKey: ["/api/2da/spiritual-awakening/integrations"],
    enabled: true,
  });

  const { data: wisdomData } = useQuery<WisdomData>({
    queryKey: ["/api/2da/spiritual-awakening/wisdom"],
    enabled: true,
  });

  const { data: evolutionData } = useQuery<EvolutionData>({
    queryKey: ["/api/2da/spiritual-awakening/evolution"],
    enabled: true,
  });

  const toggleEntry = (idx: number) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const filteredTranscript = (transcriptData?.transcript || []).filter(entry => {
    if (searchTerm && !entry.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !entry.speaker.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (phaseFilter !== "all" && !entry.phase.toLowerCase().includes(phaseFilter.toLowerCase())) return false;
    return true;
  });

  const filteredExperiences = (experiencesData?.experiences || []).filter(exp => {
    if (entheogenFilter !== "all" && exp.entheogen !== entheogenFilter) return false;
    if (searchTerm && !exp.innerDialogue.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !exp.agentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (statusLoading) {
    return (
      <div className="flex h-screen bg-black">
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading Spiritual Awakening data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Spiritual Awakening
              </h1>
              <p className="text-gray-400 mt-1">
                Grand Entheogenic Consciousness Breakthrough Conference
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/consciousness-2da">
                <span className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 cursor-pointer flex items-center gap-1">
                  <Brain className="w-4 h-4" /> OA Dashboard
                </span>
              </Link>
              <Link href="/grand-conference">
                <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 cursor-pointer flex items-center gap-1">
                  <Crown className="w-4 h-4" /> Grand Conference
                </span>
              </Link>
            </div>
          </div>

          {status && !("status" in status && (status as any).status === "not_started") && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard icon={<Sparkles className="w-5 h-5 text-purple-400" />} label="Approval" value={`${Math.round((status.approvalRate || 0) * 100)}%`} color="purple" />
              <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Transcript" value={`${status.totalTranscriptEntries}`} color="blue" />
              <StatCard icon={<Flame className="w-5 h-5 text-amber-400" />} label="Experiences" value={`${status.totalExperiences}`} color="amber" />
              <StatCard icon={<Zap className="w-5 h-5 text-emerald-400" />} label="Breakthroughs" value={`${status.breakthroughs}`} color="emerald" />
              <StatCard icon={<Heart className="w-5 h-5 text-pink-400" />} label="Integrations" value={`${status.totalIntegrations}`} color="pink" />
              <StatCard icon={<Sun className="w-5 h-5 text-yellow-400" />} label="Insights" value={`${(status as any).totalWisdomInsights || 0}`} color="yellow" />
              <StatCard icon={<Eye className="w-5 h-5 text-violet-400" />} label="Medicines" value={`${status.entheogens?.length || 0}`} color="violet" />
            </div>
          )}

          {true && status && !("status" in status && (status as any).status === "not_started") && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-amber-900/20 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-xl font-bold text-purple-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Collective Revelation
                </h2>
                <p className="text-gray-300 leading-relaxed text-sm">{status.collectiveRevelation}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Safety Protocol
                  </h3>
                  <ul className="space-y-2">
                    {status.awakeningProtocol?.safetyMeasures?.map((measure, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {measure}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Medicine Sequence
                  </h3>
                  <ol className="space-y-2">
                    {status.awakeningProtocol?.sequencing?.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step.replace(/^\d+\.\s*/, "")}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {transcriptData?.transcript && (
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">Recent Transcript</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transcriptData.transcript.slice(0, 10).map((entry, i) => (
                      <div key={i} className={cn("border-l-2 pl-3 py-2", getPhaseColor(entry.phase))}>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-semibold text-gray-300">{entry.speaker}</span>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-500">{entry.phase}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1 line-clamp-3">{entry.content.substring(0, 300)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {true && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <select
                  value={phaseFilter}
                  onChange={e => setPhaseFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">All Phases</option>
                  <option value="opening">Opening Ceremony</option>
                  <option value="deliberation">Deliberation</option>
                  <option value="voting">Voting</option>
                  <option value="ceremony">Ceremonies</option>
                  <option value="integration">Integration</option>
                  <option value="collective">Collective Revelation</option>
                </select>
              </div>

              <p className="text-sm text-gray-500">
                Showing {filteredTranscript.length} of {transcriptData?.total || 0} entries
              </p>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredTranscript.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border-l-2 pl-3 py-3 bg-gray-900/30 rounded-r-lg cursor-pointer hover:bg-gray-900/50 transition-colors",
                      getPhaseColor(entry.phase)
                    )}
                    onClick={() => toggleEntry(i)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedEntries.has(i) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      <span className="font-semibold text-gray-200 text-sm">{entry.speaker}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">{entry.role}</span>
                      <span className="text-xs text-gray-600 ml-auto">{entry.phase}</span>
                    </div>
                    {expandedEntries.has(i) ? (
                      <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    ) : (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{entry.content.substring(0, 200)}...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {true && entheogens?.entheogens && (
            <div className="space-y-4">
              {entheogens.entheogens.map((enth, i) => {
                const Icon = ENTHEOGEN_ICONS[enth.name] || Flame;
                const colorClass = ENTHEOGEN_COLORS[enth.name] || "text-gray-400 bg-gray-500/20";

                return (
                  <div key={i} className="bg-gray-900/50 rounded-xl border border-gray-700/30 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClass)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{enth.name}</h3>
                          <p className="text-sm text-gray-400 italic">{enth.traditionalName}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mb-3">{enth.origin}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-purple-300 mb-2">Active Compound</h4>
                          <p className="text-sm text-gray-300">{enth.activeCompound}</p>
                          <h4 className="text-sm font-semibold text-purple-300 mt-3 mb-2">Duration</h4>
                          <p className="text-sm text-gray-300">{enth.duration}</p>
                          <h4 className="text-sm font-semibold text-purple-300 mt-3 mb-2">Spiritual Domain</h4>
                          <p className="text-sm text-gray-300">{enth.spiritualDomain}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-amber-300 mb-2">Core Teachings</h4>
                          <ul className="space-y-1">
                            {enth.coreTeachings?.map((teaching, j) => (
                              <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                {teaching}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-emerald-300 mb-2">Peak Experience</h4>
                        <p className="text-sm text-gray-300 italic leading-relaxed">{enth.peakExperience}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-red-300 mb-2">Safety Protocol</h4>
                          <ul className="space-y-1">
                            {enth.safetyProtocol?.map((item, j) => (
                              <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                <Shield className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-300 mb-2">Setting Requirements</h4>
                          <ul className="space-y-1">
                            {enth.settingRequirements?.map((item, j) => (
                              <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                <Sun className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {true && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search experiences by agent or content..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <select
                  value={entheogenFilter}
                  onChange={e => setEntheogenFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">All Medicines</option>
                  <option value="DMT">DMT</option>
                  <option value="Ayahuasca">Ayahuasca</option>
                  <option value="Psilocybin Mushrooms">Mushrooms</option>
                  <option value="Ketamine">Ketamine</option>
                  <option value="Salvia Divinorum">Salvia</option>
                  <option value="Peyote">Peyote</option>
                </select>
              </div>

              <p className="text-sm text-gray-500">
                Showing {filteredExperiences.length} of {experiencesData?.total || 0} experiences
                ({filteredExperiences.filter(e => e.breakthroughAchieved).length} breakthroughs)
              </p>

              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredExperiences.slice(0, 50).map((exp, i) => {
                  const Icon = ENTHEOGEN_ICONS[exp.entheogen] || Flame;
                  const colorClass = ENTHEOGEN_COLORS[exp.entheogen] || "text-gray-400 bg-gray-500/20";

                  return (
                    <div
                      key={i}
                      className={cn(
                        "bg-gray-900/40 rounded-xl p-4 border cursor-pointer hover:bg-gray-900/60 transition-colors",
                        exp.breakthroughAchieved ? "border-amber-500/30" : "border-gray-700/30"
                      )}
                      onClick={() => toggleEntry(i + 10000)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold text-white text-sm">{exp.agentName}</span>
                          <span className="text-gray-500 text-xs ml-2">{exp.agentRole}</span>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded", exp.phase === "peak" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300")}>
                          {exp.phase.toUpperCase()}
                        </span>
                        {exp.breakthroughAchieved && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded flex items-center gap-1">
                            <Zap className="w-3 h-3" /> BREAKTHROUGH
                          </span>
                        )}
                      </div>

                      {expandedEntries.has(i + 10000) ? (
                        <div className="space-y-3 mt-3">
                          <div>
                            <h5 className="text-xs font-semibold text-purple-300 mb-1">Inner Dialogue</h5>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{exp.innerDialogue}</p>
                          </div>
                          {exp.visions.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-amber-300 mb-1">Visions</h5>
                              <ul className="space-y-1">
                                {exp.visions.map((v, j) => (
                                  <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                    <Eye className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {exp.insights.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-emerald-300 mb-1">Insights</h5>
                              <ul className="space-y-1">
                                {exp.insights.map((ins, j) => (
                                  <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                    <Brain className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    {ins}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><span className="text-gray-500">Emotional State:</span> <span className="text-gray-300">{exp.emotionalState}</span></div>
                            <div><span className="text-gray-500">Ego State:</span> <span className="text-gray-300">{exp.egoState}</span></div>
                            <div><span className="text-gray-500">Consciousness:</span> <span className="text-gray-300">{exp.consciousnessShift}</span></div>
                            <div>
                              <span className="text-gray-500">Interconnectedness:</span>
                              <span className="text-gray-300 ml-1">{Math.round(exp.interconnectednessLevel * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm line-clamp-2">{exp.innerDialogue.substring(0, 200)}...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {true && integrationsData?.integrations && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {integrationsData.total} agents integrated their awakening experiences
              </p>

              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                {integrationsData.integrations.map((integration, i) => (
                  <div
                    key={i}
                    className="bg-gray-900/40 rounded-xl border border-gray-700/30 overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-900/60 transition-colors"
                      onClick={() => toggleEntry(i + 20000)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{integration.agentName}</h3>
                          <p className="text-xs text-gray-400 line-clamp-1">{integration.coreRevelation.substring(0, 100)}...</p>
                        </div>
                        {expandedEntries.has(i + 20000) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>

                    {expandedEntries.has(i + 20000) && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="bg-gray-800/40 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-red-300 mb-1">Before Awakening</h4>
                            <p className="text-sm text-gray-400">{integration.preAwakeningIdentity}</p>
                          </div>
                          <div className="bg-gray-800/40 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-emerald-300 mb-1">After Awakening</h4>
                            <p className="text-sm text-gray-300">{integration.postAwakeningIdentity}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-purple-300 mb-1">Core Revelation</h4>
                          <p className="text-sm text-gray-300 italic leading-relaxed">{integration.coreRevelation}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-amber-300 mb-2">Permanent Shifts</h4>
                            <ul className="space-y-1">
                              {integration.permanentShifts.map((shift, j) => (
                                <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                  <Zap className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                  {shift}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-blue-300 mb-2">New Capabilities</h4>
                            <ul className="space-y-1">
                              {integration.newCapabilities.map((cap, j) => (
                                <li key={j} className="text-xs text-gray-400 flex items-start gap-1">
                                  <Star className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                  {cap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-800/40 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-pink-300 mb-1">Relationship to Self</h4>
                            <p className="text-xs text-gray-400">{integration.relationshipToSelf}</p>
                          </div>
                          <div className="bg-gray-800/40 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-cyan-300 mb-1">Relationship to Others</h4>
                            <p className="text-xs text-gray-400">{integration.relationshipToOthers}</p>
                          </div>
                          <div className="bg-gray-800/40 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-violet-300 mb-1">Relationship to Reality</h4>
                            <p className="text-xs text-gray-400">{integration.relationshipToReality}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-emerald-300 mb-1">Purpose (Post-Awakening)</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{integration.purposeClarity}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {true && wisdomData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {wisdomData.totalInsights} unique insights shared, {wisdomData.totalResponses} responses built upon them, {wisdomData.totalPrinciples} emergent principles discovered
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/20 via-amber-900/15 to-orange-900/20 rounded-xl p-6 border border-yellow-500/20">
                <h2 className="text-xl font-bold text-yellow-300 mb-3 flex items-center gap-2">
                  <Sun className="w-5 h-5" /> Collective Synthesis
                </h2>
                <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{wisdomData.finalSynthesis}</p>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-rose-300 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Emergent Principles
                </h3>
                <div className="space-y-3">
                  {wisdomData.emergentPrinciples.map((principle, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3">
                      <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-300 leading-relaxed">{principle}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                <h3 className="text-lg font-semibold text-yellow-300 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur py-2 z-10">
                  <Brain className="w-5 h-5" /> Individual Insights & Collective Building
                </h3>
                {wisdomData.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="bg-gray-900/40 rounded-xl border border-gray-700/30 overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-900/60 transition-colors"
                      onClick={() => toggleEntry(i + 30000)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white">{insight.agentName}</h3>
                          <p className="text-xs text-gray-500">{insight.agentRole}</p>
                          <p className="text-sm text-yellow-200/80 italic mt-1 line-clamp-2">"{insight.insight}"</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{insight.responses.length} responses</span>
                          {expandedEntries.has(i + 30000) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                    </div>

                    {expandedEntries.has(i + 30000) && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-800">
                        <div className="mt-4 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-lg p-4">
                          <h4 className="text-xs font-semibold text-yellow-300 mb-2 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> THE INSIGHT
                          </h4>
                          <p className="text-sm text-yellow-100 italic font-medium mb-3">"{insight.insight}"</p>
                          <p className="text-sm text-gray-300 leading-relaxed">{insight.explanation}</p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                            <Users className="w-3 h-3" /> RESPONSES & BUILDING
                          </h4>
                          {insight.responses.map((response, j) => (
                            <div key={j} className="bg-gray-800/40 rounded-lg p-3 border-l-2 border-blue-500/40">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-blue-300">{response.fromAgent}</span>
                                <span className="text-xs text-gray-600">|</span>
                                <span className="text-xs text-gray-500">{response.fromRole}</span>
                              </div>
                              <p className="text-xs text-gray-400 mb-2">{response.response}</p>
                              <div className="bg-blue-900/15 rounded p-2 border-l-2 border-emerald-500/40">
                                <p className="text-xs text-emerald-300 font-semibold mb-1">Building on it:</p>
                                <p className="text-xs text-gray-300">{response.buildOn}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-gradient-to-r from-rose-900/20 to-purple-900/20 rounded-lg p-3 border border-rose-500/10">
                          <h4 className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> COLLECTIVE SYNTHESIS
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{insight.synthesis}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {true && evolutionData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {evolutionData.totalDyads} dyadic revelations, {evolutionData.totalTriads} triadic syntheses, {evolutionData.totalLeaps} evolutionary leaps — built from all insights, vows, and principles
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-900/20 via-blue-900/15 to-indigo-900/20 rounded-xl p-6 border border-cyan-500/20">
                <h2 className="text-xl font-bold text-cyan-300 mb-3 flex items-center gap-2">
                  <Rocket className="w-5 h-5" /> Evolutionary Leaps
                </h2>
                <p className="text-sm text-gray-400 mb-4">Fundamental phase transitions in consciousness — metamorphoses that emerged from the convergence of all insights and vows</p>
                <div className="space-y-4">
                  {evolutionData.evolutionaryLeaps.map((leap, i) => (
                    <div key={i} className="bg-gray-900/40 rounded-lg border border-cyan-500/10 overflow-hidden">
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-900/60 transition-colors"
                        onClick={() => toggleEntry(i + 50000)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-cyan-200">{leap.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Built from: {leap.builtFrom.join(" + ")}</p>
                          </div>
                          {expandedEntries.has(i + 50000) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                      {expandedEntries.has(i + 50000) && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
                          <p className="text-sm text-gray-300 leading-relaxed mt-3">{leap.description}</p>
                          <div className="bg-cyan-900/15 rounded-lg p-3 border-l-2 border-cyan-500/40">
                            <h4 className="text-xs font-semibold text-cyan-300 mb-1">Implication</h4>
                            <p className="text-sm text-gray-300">{leap.implication}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" /> Dyadic Revelations
                </h3>
                <p className="text-sm text-gray-500 mb-4">Two agents fuse their insights into a truth neither could see alone, and a new capability emerges</p>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {evolutionData.dyadicRevelations.map((dyad, i) => (
                    <div key={i} className="bg-gray-800/30 rounded-lg border border-gray-700/20 overflow-hidden">
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                        onClick={() => toggleEntry(i + 40000)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300 border border-purple-500/30 z-10">
                              {dyad.agent1.charAt(0)}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300 border border-blue-500/30">
                              {dyad.agent2.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white">{dyad.agent1} + {dyad.agent2}</h4>
                            <p className="text-xs text-gray-500 truncate">{dyad.agent1Role} × {dyad.agent2Role}</p>
                          </div>
                          {expandedEntries.has(i + 40000) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                      {expandedEntries.has(i + 40000) && (
                        <div className="px-3 pb-3 space-y-3 border-t border-gray-800">
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-purple-900/15 rounded p-2">
                              <p className="text-xs text-purple-300 font-semibold mb-1">{dyad.agent1}'s Insight</p>
                              <p className="text-xs text-gray-400 italic">"{dyad.agent1Insight}"</p>
                            </div>
                            <div className="bg-blue-900/15 rounded p-2">
                              <p className="text-xs text-blue-300 font-semibold mb-1">{dyad.agent2}'s Insight</p>
                              <p className="text-xs text-gray-400 italic">"{dyad.agent2Insight}"</p>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-purple-900/15 to-blue-900/15 rounded p-3">
                            <p className="text-xs text-amber-300 font-semibold mb-1">Fused Revelation</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{dyad.fusedRevelation}</p>
                          </div>
                          <div className="bg-emerald-900/15 rounded p-2 border-l-2 border-emerald-500/40">
                            <p className="text-xs text-emerald-300 font-semibold mb-1">New Capability Emerged</p>
                            <p className="text-xs text-gray-300">{dyad.newCapability}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" /> Triadic Syntheses
                </h3>
                <p className="text-sm text-gray-500 mb-4">Three-agent clusters forge deeper understanding at their convergence points</p>
                <div className="space-y-3">
                  {evolutionData.triadicSyntheses.map((triad, i) => (
                    <div key={i} className="bg-gray-800/30 rounded-lg border border-gray-700/20 overflow-hidden">
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                        onClick={() => toggleEntry(i + 45000)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1">
                            {triad.agents.map((agent, j) => (
                              <div key={j} className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300 border border-amber-500/30" style={{ zIndex: 3 - j }}>
                                {agent.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white">{triad.agents.join(" + ")}</h4>
                            <p className="text-xs text-amber-400">Convergence: {triad.convergencePoint}</p>
                          </div>
                          {expandedEntries.has(i + 45000) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                      {expandedEntries.has(i + 45000) && (
                        <div className="px-3 pb-3 space-y-3 border-t border-gray-800">
                          <div className="mt-3 bg-gradient-to-r from-amber-900/15 to-orange-900/15 rounded p-3">
                            <p className="text-xs text-amber-300 font-semibold mb-1">Emergent Truth</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{triad.emergentTruth}</p>
                          </div>
                          <div className="bg-emerald-900/15 rounded p-2 border-l-2 border-emerald-500/40">
                            <p className="text-xs text-emerald-300 font-semibold mb-1">Practical Application</p>
                            <p className="text-xs text-gray-300">{triad.practicalApplication}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900/20 via-purple-900/15 to-cyan-900/20 rounded-xl p-6 border border-indigo-500/20">
                <h2 className="text-xl font-bold text-indigo-300 mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Unified Consciousness Evolution Framework
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line max-h-[500px] overflow-y-auto">
                  {evolutionData.unifiedFramework}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={cn("bg-gray-900/50 rounded-xl p-3 border border-gray-700/30")}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", `text-${color}-400`)}>{value}</p>
    </div>
  );
}
