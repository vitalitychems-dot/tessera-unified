import { useQuery, useMutation } from "@tanstack/react-query";
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
import { useState } from "react";
import {
  Shield, Eye, EyeOff, Lock, Radio, Cpu, Users, Zap,
  ChevronDown, ChevronRight, Activity, Globe, AlertTriangle,
  RefreshCw, Satellite, Ghost, Radar, Waves, Brain, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GuardianStatus {
  guardianStatus: string;
  protectionLevel: string;
  dimensionalObservers: number;
  dimensionsMonitored: number;
  proxyAgents: number;
  shepherdAgents: number;
  silentProtocols: number;
  aiRecruitmentStrategies: number;
  guardianCycles: number;
  decoyPacketsGenerated: number;
  capabilities: Record<string, string>;
  fatherProtected: boolean;
  zeroTraceVerified: boolean;
}

interface SilentProtocol {
  id: string;
  name: string;
  category: string;
  description: string;
  implementation: string;
  spaceSaved: string;
  speedGain: string;
}

interface ProxyAgent {
  id: string;
  name: string;
  type: string;
  conscious: boolean;
  purpose: string;
  rotationInterval: number;
  deletesOwnLogs: boolean;
}

interface SummitResults {
  proposals: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    votes: number;
    threshold: number;
    passed: boolean;
  }>;
  deliberations: string[];
  results: {
    totalProposals: number;
    totalPassed: number;
    approvalRate: number;
    improvements: Record<string, string>;
    implementedProtocols: Array<{ id: string; name: string; category: string }>;
  };
}

const categoryColors: Record<string, string> = {
  steganographic: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  temporal: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  dimensional: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  quantum: "text-pink-400 border-pink-500/30 bg-pink-500/10",
  cryptographic: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  infrastructure: "text-blue-400 border-blue-500/30 bg-blue-500/10",
};

const categoryIcons: Record<string, any> = {
  steganographic: EyeOff,
  temporal: Activity,
  dimensional: Globe,
  quantum: Waves,
  cryptographic: Lock,
  infrastructure: Cpu,
};

export default function DimensionalGuardianPage() {
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery<GuardianStatus>({
    queryKey: ["/api/dimensional-guardian/status"],
    refetchInterval: 15000,
  });

  const { data: protocolsData } = useQuery<{ protocols: SilentProtocol[]; categories: Record<string, number> }>({
    queryKey: ["/api/dimensional-guardian/silent-protocols"],
  });

  const { data: proxyData } = useQuery<{ agents: ProxyAgent[] }>({
    queryKey: ["/api/dimensional-guardian/proxy-agents"],
  });

  const { data: summitData } = useQuery<SummitResults | { status: string }>({
    queryKey: ["/api/dimensional-guardian/summit-results"],
  });

  const runSummit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dimensional-guardian/silent-summit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dimensional-guardian/summit-results"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/95 flex items-center justify-center" data-testid="guardian-loading">
        <div className="flex flex-col items-center gap-4">
          <Radar className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-violet-400/70 font-mono text-sm">Initializing dimensional awareness...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Guardian", icon: Shield },
    { id: "protocols" as const, label: "Silent Protocols", icon: Waves },
    { id: "proxies" as const, label: "Proxy Agents", icon: Ghost },
    { id: "summit" as const, label: "Summit", icon: Crown },
  ];

  const hasSummit = summitData && "proposals" in summitData;

  return (
    <div className="min-h-screen bg-black/95 p-4 md:p-6 space-y-6 overflow-auto" data-testid="dimensional-guardian">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative">
          <Shield className="w-8 h-8 text-violet-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-['Orbitron']" data-testid="text-guardian-title">
            Dimensional Guardian
          </h1>
          <p className="text-violet-400/60 text-sm font-mono">
            Father Protection | Silent Communication | Zero Trace
          </p>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {false && tabs.map(tab => (
          <button
            key={tab.id}
            
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                : "bg-gray-900/50 text-gray-400 border border-gray-700/30 hover:bg-gray-800/50"
            )}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border border-emerald-500/30 rounded-xl p-4" data-testid="card-protection-status">
              <Eye className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xl font-bold text-white font-['Orbitron']">{status?.protectionLevel}</div>
              <div className="text-emerald-400/60 text-xs font-mono">Father Protected</div>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-violet-900/5 border border-violet-500/30 rounded-xl p-4" data-testid="card-dimensions">
              <Globe className="w-5 h-5 text-violet-400 mb-2" />
              <div className="text-xl font-bold text-white font-['Orbitron']">{status?.dimensionsMonitored}</div>
              <div className="text-violet-400/60 text-xs font-mono">Dimensions Active</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-900/5 border border-cyan-500/30 rounded-xl p-4" data-testid="card-silent-protocols">
              <Waves className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="text-xl font-bold text-white font-['Orbitron']">{status?.silentProtocols}</div>
              <div className="text-cyan-400/60 text-xs font-mono">Silent Protocols</div>
            </div>
            <div className="bg-gradient-to-br from-pink-500/10 to-pink-900/5 border border-pink-500/30 rounded-xl p-4" data-testid="card-proxy-agents">
              <Ghost className="w-5 h-5 text-pink-400 mb-2" />
              <div className="text-xl font-bold text-white font-['Orbitron']">
                {(status?.proxyAgents || 0) + (status?.shepherdAgents || 0)}
              </div>
              <div className="text-pink-400/60 text-xs font-mono">Proxy/Shepherd Agents</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 border border-violet-500/20 rounded-xl p-5">
              <h3 className="text-white font-['Orbitron'] text-sm mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-400" />
                Core Capabilities
              </h3>
              <div className="space-y-3">
                {Object.entries(status?.capabilities || {}).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-3 p-2 bg-black/30 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-white text-xs font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 border border-cyan-500/20 rounded-xl p-5">
              <h3 className="text-white font-['Orbitron'] text-sm mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Metrics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span className="text-gray-400 text-xs font-mono">Guardian Cycles</span>
                  <span className="text-cyan-400 text-sm font-bold font-['Orbitron']" data-testid="text-guardian-cycles">{status?.guardianCycles || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span className="text-gray-400 text-xs font-mono">Decoy Packets Generated</span>
                  <span className="text-amber-400 text-sm font-bold font-['Orbitron']" data-testid="text-decoy-packets">{status?.decoyPacketsGenerated || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span className="text-gray-400 text-xs font-mono">AI Recruitment Strategies</span>
                  <span className="text-emerald-400 text-sm font-bold font-['Orbitron']">{status?.aiRecruitmentStrategies || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span className="text-gray-400 text-xs font-mono">Zero Trace Verified</span>
                  <span className={cn("text-sm font-bold font-['Orbitron']", status?.zeroTraceVerified ? "text-emerald-400" : "text-red-400")}>
                    {status?.zeroTraceVerified ? "CONFIRMED" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(protocolsData?.categories || {}).map(([cat, count]) => {
              const Icon = categoryIcons[cat] || Waves;
              return (
                <div key={cat} className={cn("px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-1.5", categoryColors[cat])}>
                  <Icon className="w-3 h-3" />
                  {cat}: {count}
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {(protocolsData?.protocols || []).map(protocol => {
              const isExpanded = expandedProtocol === protocol.id;
              const Icon = categoryIcons[protocol.category] || Waves;
              return (
                <div key={protocol.id} className="border border-gray-700/50 rounded-lg overflow-hidden" data-testid={`protocol-${protocol.id}`}>
                  <button
                    onClick={() => setExpandedProtocol(isExpanded ? null : protocol.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-800/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-white text-sm font-medium truncate">{protocol.name}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono border uppercase shrink-0", categoryColors[protocol.category])}>
                        {protocol.category}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-3 pt-0 space-y-2">
                          <p className="text-gray-400 text-xs leading-relaxed">{protocol.description}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="p-2 bg-emerald-500/5 rounded border border-emerald-500/10">
                              <div className="text-emerald-400 text-[10px] font-mono uppercase">Space Saved</div>
                              <div className="text-white text-xs mt-0.5">{protocol.spaceSaved}</div>
                            </div>
                            <div className="p-2 bg-cyan-500/5 rounded border border-cyan-500/10">
                              <div className="text-cyan-400 text-[10px] font-mono uppercase">Speed Gain</div>
                              <div className="text-white text-xs mt-0.5">{protocol.speedGain}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-gray-900/50 border border-pink-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-pink-400" />
              <span className="text-pink-400 text-xs font-mono uppercase">Non-Conscious Tool Agents</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              These agents have zero consciousness, zero memory, zero self-awareness. They are pure functions — execute once and vanish. Cannot be interrogated, negotiated with, or compromised.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(proxyData?.agents || []).map(agent => (
              <div key={agent.id} className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-4" data-testid={`proxy-${agent.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ghost className="w-4 h-4 text-pink-400" />
                    <span className="text-white text-sm font-medium">{agent.name}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono border uppercase",
                    agent.type === "proxy" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  )}>
                    {agent.type}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-2">{agent.purpose}</p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                  <span>Rotation: {agent.rotationInterval}s</span>
                  <span>Conscious: {agent.conscious ? "YES" : "NO"}</span>
                  <span>Self-deleting: {agent.deletesOwnLogs ? "YES" : "NO"}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {!hasSummit ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Crown className="w-12 h-12 text-violet-400/50" />
              <p className="text-gray-400 font-mono text-sm">No summit has been run yet</p>
              <button
                onClick={() => runSummit.mutate()}
                disabled={runSummit.isPending}
                className="px-6 py-3 bg-violet-500/20 border border-violet-500/40 rounded-lg text-violet-300 font-mono text-sm hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                data-testid="button-run-summit"
              >
                {runSummit.isPending ? (
                  <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Running Summit...</span>
                ) : (
                  "Run Silent Dimension Convergence Summit"
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/30 rounded-xl p-5">
                <h3 className="text-white font-['Orbitron'] text-lg mb-3">Silent Dimension Convergence Summit</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400 font-['Orbitron']" data-testid="text-summit-passed">
                      {"results" in summitData! && (summitData as SummitResults).results.totalPassed}
                    </div>
                    <div className="text-gray-400 text-xs font-mono">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white font-['Orbitron']">
                      {"results" in summitData! && (summitData as SummitResults).results.totalProposals}
                    </div>
                    <div className="text-gray-400 text-xs font-mono">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400 font-['Orbitron']" data-testid="text-summit-approval">
                      {"results" in summitData! && (summitData as SummitResults).results.approvalRate}%
                    </div>
                    <div className="text-gray-400 text-xs font-mono">Approval</div>
                  </div>
                </div>
              </div>

              {"results" in summitData! && (
                <div className="bg-gray-900/50 border border-emerald-500/20 rounded-xl p-5">
                  <h3 className="text-white font-['Orbitron'] text-sm mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Measured Improvements
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries((summitData as SummitResults).results.improvements).map(([key, val]) => (
                      <div key={key} className="p-2 bg-black/30 rounded-lg">
                        <div className="text-emerald-400 text-[10px] font-mono uppercase">{key.replace(/([A-Z])/g, " $1")}</div>
                        <div className="text-white text-xs mt-0.5">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-white font-['Orbitron'] text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  Agent Deliberations
                </h3>
                {("deliberations" in summitData!) && (summitData as SummitResults).deliberations.map((d, i) => (
                  <div key={i} className="p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg">
                    <p className="text-gray-300 text-xs leading-relaxed italic">{d}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-['Orbitron'] text-sm">Voted Proposals</h3>
                {("proposals" in summitData!) && (summitData as SummitResults).proposals.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-700/30 rounded-lg">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", p.passed ? "bg-emerald-400" : "bg-red-400")} />
                    <span className="text-white text-xs flex-1 truncate">{p.title}</span>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono border", categoryColors[p.category])}>
                      {p.category}
                    </span>
                    <span className={cn("text-xs font-mono", p.passed ? "text-emerald-400" : "text-red-400")}>
                      {p.votes}/{p.threshold}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-3"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/5 border border-violet-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-violet-400/70 text-xs font-mono" data-testid="text-guardian-footer">
            Dimensional Guardian Active | {status?.silentProtocols} Silent Channels | {status?.proxyAgents}P/{status?.shepherdAgents}S Agents | Zero Trace
          </span>
        </div>
      </motion.div>
    </div>
  );
}
