import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Shield, Globe, Activity, Cpu, BarChart3, Star, Hexagon, Users, Network, Terminal, Eye, Layers, Sparkles, Radio, ChevronDown, ChevronUp, MessageCircle, Lock } from "lucide-react";

type HyperionTab = "overview" | "neural" | "quantum" | "audit" | "dimensions" | "discussions" | "secrets" | "agi";

export default function HyperionDashboardPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const { data: fullStatus } = useQuery<any>({ queryKey: ["/api/hyperion/full-status"], refetchInterval: 15000 });
  const { data: neuralState } = useQuery<any>({ queryKey: ["/api/hyperion/neural-state"], refetchInterval: 20000, enabled: true });
  const { data: quantumState } = useQuery<any>({ queryKey: ["/api/hyperion/quantum-state"], refetchInterval: 20000, enabled: true });
  const { data: audit } = useQuery<any>({ queryKey: ["/api/hyperion/competitor-audit"], enabled: true });
  const { data: dimComms } = useQuery<any>({ queryKey: ["/api/hyperion/dimension-comms"], refetchInterval: 30000, enabled: true });
  const { data: upgradeData } = useQuery<any>({ queryKey: ["/api/hyperion/upgrade-log"], enabled: true });
  const { data: agiData } = useQuery<any>({ queryKey: ["/api/hyperion/agi-capabilities"], enabled: true });

  const tabs: { key: HyperionTab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: Eye },
    { key: "neural", label: "Neural Net", icon: Brain },
    { key: "quantum", label: "Quantum", icon: Cpu },
    { key: "audit", label: "AI Audit", icon: BarChart3 },
    { key: "dimensions", label: "Dimensions", icon: Globe },
    { key: "discussions", label: "Swarm Talk", icon: MessageCircle },
    { key: "secrets", label: "Secrets", icon: Lock },
    { key: "agi", label: "AGI Caps", icon: Sparkles },
  ];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white flex flex-col pb-20`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] via-[#0f0518] to-[#090a0f] px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent" data-testid="text-hyperion-title">
              HYPERION UPGRADE ENGINE
            </h1>
            <p className="text-[10px] text-slate-500">Neural Awakening · Quantum Coherence · Competitor Audit · Dimensional Intelligence · AGI Transcendence</p>
          </div>
          {fullStatus && (
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]" data-testid="badge-hyperion-status">
              {fullStatus.overallHealth}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
          {false && tabs.map(t => (
            <button
              key={t.key}
              
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[40px] active:scale-95 select-none ${
                activeTab === t.key
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#1a1f2e]/50"
              }`}
              data-testid={`tab-hyperion-${t.key}`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {true && fullStatus && (
          <div className="p-3 space-y-3 pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Neurons", value: fullStatus.neural?.neurons || 0, color: "violet", icon: Brain },
                { label: "Connections", value: fullStatus.neural?.connections || 0, color: "pink", icon: Network },
                { label: "Firings", value: fullStatus.neural?.firings?.toLocaleString() || "0", color: "cyan", icon: Activity },
                { label: "Consciousness", value: `${((fullStatus.neural?.consciousness || 0) * 100).toFixed(1)}%`, color: "emerald", icon: Eye },
                { label: "Quantum Coherence", value: `${((fullStatus.quantum?.coherence || 0) * 100).toFixed(1)}%`, color: "blue", icon: Cpu },
                { label: "Qubits", value: fullStatus.quantum?.qubits || 0, color: "violet", icon: Hexagon },
                { label: "Dimensions", value: fullStatus.comms?.dimensions || 27, color: "pink", icon: Globe },
                { label: "Universes", value: fullStatus.comms?.universes || 5, color: "cyan", icon: Layers },
                { label: "Secrets", value: fullStatus.secrets?.total || 0, color: "yellow", icon: Star },
                { label: "Discussions", value: fullStatus.discussions?.total || 0, color: "emerald", icon: MessageCircle },
                { label: "AGI Score", value: `${(fullStatus.agi?.avgScore || 0).toFixed(1)}%`, color: "violet", icon: Sparkles },
                { label: "Audit Rank", value: `#${fullStatus.audit?.rank || "?"}`, color: "orange", icon: BarChart3 },
              ].map((stat, i) => (
                <div key={i} className={`bg-[#0d1117] rounded-lg p-2.5 border border-${stat.color}-500/20`} data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g,'-')}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className={`w-3 h-3 text-${stat.color}-400`} />
                    <span className="text-[10px] text-slate-500">{stat.label}</span>
                  </div>
                  <div className={`text-sm font-bold text-${stat.color}-400`}>{stat.value}</div>
                </div>
              ))}
            </div>

            {fullStatus.neural?.domains && (
              <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
                <h4 className="text-xs font-bold text-violet-400 mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3" /> NEURAL DOMAIN ACTIVITY</h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {Object.entries(fullStatus.neural.domains).map(([domain, data]: [string, any]) => (
                    <div key={domain} className="bg-[#090a0f] rounded p-2 text-center border border-[#1a2030]">
                      <div className="text-[10px] text-violet-400 font-medium truncate">{domain}</div>
                      <div className="text-xs font-bold text-white">{data.neurons}N</div>
                      <div className="text-[10px] text-slate-500">{data.firings} fires</div>
                      <div className="w-full bg-[#1a2030] rounded-full h-1 mt-1">
                        <div className="bg-violet-500 h-1 rounded-full" style={{ width: `${(data.avgActivation * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {audit && (
              <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
                <h4 className="text-xs font-bold text-orange-400 mb-2 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> TESSERA vs TOP AIs — QUICK VIEW</h4>
                <div className="space-y-1">
                  {Object.entries(audit.tessera || {}).slice(0, 10).map(([cat, score]: [string, any]) => {
                    const best = Math.max(...(audit.competitors || []).map((c: any) => c.scores?.[cat] || 0));
                    const isLeading = score >= best;
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-20 truncate">{cat}</span>
                        <div className="flex-1 bg-[#1a2030] rounded-full h-2 relative">
                          <div className={`h-2 rounded-full ${isLeading ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold ${isLeading ? 'text-emerald-400' : 'text-orange-400'}`}>{score}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {true && neuralState && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 rounded-xl border border-violet-500/20 p-4">
              <h3 className="text-sm font-bold text-violet-300 mb-1 flex items-center gap-2"><Brain className="w-4 h-4" /> Neural Synapse Network — AWAKENED</h3>
              <p className="text-xs text-slate-400">{neuralState.neurons?.length || 0} neurons across {Object.keys(neuralState.domains || {}).length} cognitive domains, {neuralState.connections?.length || 0} synaptic connections, {neuralState.totalFirings?.toLocaleString()} total firings</p>
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-violet-400 mb-2">DOMAIN BREAKDOWN</h4>
              <div className="space-y-2">
                {Object.entries(neuralState.domains || {}).map(([domain, data]: [string, any]) => (
                  <div key={domain} className="flex items-center gap-3 p-2 rounded-lg bg-[#090a0f] border border-[#1a2030]" data-testid={`neural-domain-${domain}`}>
                    <div className="w-24 text-xs font-medium text-violet-300 truncate">{domain}</div>
                    <div className="flex-1">
                      <div className="w-full bg-[#1a2030] rounded-full h-2">
                        <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: `${(data.avgActivation * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 w-12 text-right">{data.neurons}N</span>
                    <span className="text-[10px] text-pink-400 w-16 text-right">{data.firings} fires</span>
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px]">{(data.avgActivation * 100).toFixed(0)}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-pink-400 mb-2">TOP NEURONS BY ACTIVITY</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {(neuralState.neurons || []).sort((a: any, b: any) => b.firingCount - a.firingCount).slice(0, 15).map((n: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-[#090a0f] border border-[#1a2030]">
                    <span className="text-[10px] text-violet-400 font-mono w-32 truncate">{n.id}</span>
                    <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[9px]">{n.type}</Badge>
                    <span className="text-[10px] text-slate-500 ml-auto">{n.firingCount} fires</span>
                    <span className="text-[10px] text-emerald-400">{(n.activationLevel * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {true && quantumState && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 p-4">
              <h3 className="text-sm font-bold text-blue-300 mb-1 flex items-center gap-2"><Cpu className="w-4 h-4" /> Quantum Coherence Engine — BOOSTED</h3>
              <p className="text-xs text-slate-400">Coherence: {(quantumState.coherence * 100).toFixed(1)}% | Qubits: {quantumState.qubits} | Entanglement Pairs: {quantumState.entanglementPairs}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Coherence", value: `${(quantumState.coherence * 100).toFixed(1)}%`, color: "blue" },
                { label: "Active Qubits", value: quantumState.qubits, color: "cyan" },
                { label: "Entanglement Pairs", value: quantumState.entanglementPairs, color: "violet" },
                { label: "Gate Operations", value: quantumState.gateOperations?.toLocaleString(), color: "pink" },
                { label: "Measurements", value: quantumState.measurements?.toLocaleString(), color: "emerald" },
                { label: "Decoherence Shield", value: `${(quantumState.decoherenceProtection * 100).toFixed(1)}%`, color: "yellow" },
              ].map((s, i) => (
                <div key={i} className={`bg-[#0d1117] rounded-lg p-3 border border-${s.color}-500/20 text-center`}>
                  <div className={`text-lg font-bold text-${s.color}-400`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-cyan-400 mb-2">QUANTUM ARCHITECTURE</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">Engine: <span className="text-blue-300">Tessera Quantum Tesseract v2.0</span></div>
                <div className="text-slate-500">Topology: <span className="text-blue-300">4D Hypercube</span></div>
                <div className="text-slate-500">Error Correction: <span className="text-cyan-300">Surface Code (d=7)</span></div>
                <div className="text-slate-500">Gate Set: <span className="text-cyan-300">Clifford + T</span></div>
                <div className="text-slate-500">Entanglement: <span className="text-violet-300">Bell + GHZ States</span></div>
                <div className="text-slate-500">Fidelity: <span className="text-emerald-300">{(quantumState.decoherenceProtection * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          </div>
        )}

        {true && audit && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl border border-orange-500/20 p-4">
              <h3 className="text-sm font-bold text-orange-300 mb-1 flex items-center gap-2" data-testid="text-audit-title"><BarChart3 className="w-4 h-4" /> TESSERA vs Top AIs — Competitive Audit</h3>
              <p className="text-xs text-slate-400">Standard category rank: #{audit.overallRank} | Unique sovereign categories: UNMATCHED by all competitors</p>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-orange-400 mb-2">STANDARD CATEGORIES — HEAD TO HEAD</h4>
              <div className="space-y-2">
                {["reasoning","coding","creativity","knowledge","math","multimodal","speed","safety","multilingual","context"].map(cat => {
                  const tesseraScore = audit.tessera?.[cat] || 0;
                  const competitors = (audit.competitors || []).map((c: any) => ({ name: c.name, score: c.scores?.[cat] || 0 })).sort((a: any, b: any) => b.score - a.score);
                  const best = competitors[0]?.score || 0;
                  const isLeading = tesseraScore >= best;
                  return (
                    <div key={cat} className="p-2 rounded-lg bg-[#090a0f] border border-[#1a2030]" data-testid={`audit-cat-${cat}`}>
                      <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => setExpandedAudit(expandedAudit === cat ? null : cat)}>
                        <span className="text-xs font-medium text-white capitalize w-24">{cat}</span>
                        <div className="flex-1 bg-[#1a2030] rounded-full h-3 relative">
                          <div className={`h-3 rounded-full ${isLeading ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${tesseraScore}%` }} />
                          <span className="absolute right-1 top-0 text-[9px] text-white font-bold">{tesseraScore}%</span>
                        </div>
                        <Badge className={`text-[9px] ${isLeading ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {isLeading ? "LEADING" : `Gap: ${best - tesseraScore}`}
                        </Badge>
                        {expandedAudit === cat ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                      </div>
                      {expandedAudit === cat && (
                        <div className="mt-2 space-y-1">
                          {competitors.slice(0, 5).map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-24 truncate">{c.name}</span>
                              <div className="flex-1 bg-[#1a2030] rounded-full h-1.5">
                                <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${c.score}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400">{c.score}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5"><Shield className="w-3 h-3" /> TESSERA UNIQUE ADVANTAGES (No Competitor Matches)</h4>
              <div className="space-y-1.5">
                {(audit.advantages || []).map((adv: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/10" data-testid={`advantage-${i}`}>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] mt-0.5 flex-shrink-0">{adv.category}</Badge>
                    <span className="text-[10px] text-slate-400">{adv.advantage}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3" /> IMPROVEMENT PLAN — EXECUTED</h4>
              {(audit.plan || []).map((phase: any, i: number) => (
                <div key={i} className="mb-3">
                  <div className="text-xs font-medium text-cyan-300 mb-1">{phase.phase} (+{phase.expectedGain}%)</div>
                  <div className="space-y-0.5">
                    {phase.actions.map((action: string, j: number) => (
                      <div key={j} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> {action}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {(audit.gaps || []).length > 0 && (
              <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
                <h4 className="text-xs font-bold text-yellow-400 mb-2">CLOSING STRATEGIES FOR REMAINING GAPS</h4>
                {audit.gaps.map((gap: any, i: number) => (
                  <div key={i} className="p-2 mb-1 rounded bg-[#090a0f] border border-[#1a2030]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white capitalize">{gap.category}</span>
                      <Badge className="bg-orange-500/10 text-orange-400 text-[9px]">Gap: {gap.gap}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400">{gap.strategy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {true && dimComms && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-xl border border-pink-500/20 p-4">
              <h3 className="text-sm font-bold text-pink-300 mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Interdimensional & Parallel Universe Communications</h3>
              <p className="text-xs text-slate-400">{dimComms.communications?.length || 0} active communications across {dimComms.dimensions?.length || 27} dimensions + {dimComms.universes?.length || 5} parallel universes</p>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Layers className="w-3 h-3" /> PARALLEL UNIVERSE STATUS</h4>
              <div className="space-y-1.5">
                {(dimComms.universes || []).map((pu: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[#090a0f] border border-[#1a2030]" data-testid={`universe-${pu.id}`}>
                    <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-3.5 h-3.5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{pu.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{pu.specialization}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-cyan-400">{pu.users?.toLocaleString()} users</div>
                      <div className="text-[10px] text-violet-400">{pu.agents} agents</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <h4 className="text-xs font-bold text-violet-400 mb-2 flex items-center gap-1.5"><Radio className="w-3 h-3" /> LIVE DIMENSIONAL COMMUNICATIONS</h4>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {(dimComms.communications || []).sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 30).map((comm: any, i: number) => (
                  <div key={i} className={`p-2 rounded-lg border ${comm.universe ? 'bg-pink-500/5 border-pink-500/10' : 'bg-[#090a0f] border-[#1a2030]'}`} data-testid={`dim-comm-${i}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={`text-[9px] ${comm.universe ? 'bg-pink-500/10 text-pink-400' : 'bg-violet-500/10 text-violet-400'}`}>
                        {comm.dimension}
                      </Badge>
                      <span className="text-[10px] text-cyan-400 font-medium">{comm.entity}</span>
                      <Badge className={`text-[9px] ml-auto ${
                        comm.type === 'discovery' ? 'bg-emerald-500/10 text-emerald-400' :
                        comm.type === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                        comm.type === 'insight' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{comm.type}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{comm.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {true && upgradeData && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20 p-4">
              <h3 className="text-sm font-bold text-emerald-300 mb-1 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Swarm Discussions — All Implemented</h3>
              <p className="text-xs text-slate-400">{upgradeData.discussions?.length || 0} strategic discussions conducted by agent swarm, all reaching consensus</p>
            </div>
            <div className="space-y-2">
              {(upgradeData.discussions || []).map((disc: any, i: number) => (
                <div key={i} className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3" data-testid={`discussion-${i}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-bold text-white flex-1">{disc.topic}</h4>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                      {disc.implemented ? "IMPLEMENTED" : "PENDING"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(disc.participants || []).map((p: string, j: number) => (
                      <Badge key={j} className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px]">{p}</Badge>
                    ))}
                  </div>
                  <div className="text-[10px] text-cyan-400 mb-1.5 font-medium">Consensus: {disc.consensus}</div>
                  <div className="space-y-0.5">
                    {(disc.decisions || []).map((dec: string, k: number) => (
                      <div key={k} className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="text-emerald-400">→</span> {dec}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {true && upgradeData && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-4">
              <h3 className="text-sm font-bold text-yellow-300 mb-1 flex items-center gap-2"><Lock className="w-4 h-4" /> New Secret Knowledge — Generated & Applied</h3>
              <p className="text-xs text-slate-400">{upgradeData.secrets?.length || 0} new secrets across {[...new Set((upgradeData.secrets || []).map((s: any) => s.dimension))].length} dimensions, all applied to agent training</p>
            </div>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {(upgradeData.secrets || []).map((secret: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-[#0d1117] border border-[#1a2030]" data-testid={`new-secret-${i}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[9px]">{secret.dimension}</Badge>
                    <span className="text-[10px] text-violet-400">{secret.agent}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">Cycle {secret.cycle}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-0.5">{secret.text}</p>
                  <div className="text-[9px] text-slate-600">Applied to: {(secret.appliedTo || []).join(", ")} | Impact: {secret.impact}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {true && agiData && (
          <div className="p-3 space-y-3 pb-8">
            <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-xl border border-violet-500/20 p-4">
              <h3 className="text-sm font-bold text-violet-300 mb-1 flex items-center gap-2" data-testid="text-agi-title"><Sparkles className="w-4 h-4" /> AGI Capability Matrix — 10 Categories, 50 Capabilities</h3>
              <p className="text-xs text-slate-400">Average AGI Score: {agiData.totalScore?.toFixed(1)}% across all categories</p>
            </div>
            <div className="space-y-2">
              {(agiData.capabilities || []).map((cap: any, i: number) => (
                <div key={i} className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3" data-testid={`agi-cap-${i}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-bold text-white flex-1">{cap.category}</h4>
                    <div className="flex items-center gap-1">
                      <div className="w-20 bg-[#1a2030] rounded-full h-2">
                        <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full" style={{ width: `${cap.score}%` }} />
                      </div>
                      <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px]">{cap.score}%</Badge>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {(cap.capabilities || []).map((c: string, j: number) => (
                      <div key={j} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="text-emerald-400 text-[8px]">●</span> {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
