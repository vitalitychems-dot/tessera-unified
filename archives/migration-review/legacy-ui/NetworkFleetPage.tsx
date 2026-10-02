import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Network, Globe, Wifi, WifiOff, Plus, Send, RefreshCw, Server, Radio,
  Shield, Zap, Cpu, Lock, ChevronDown, ChevronRight, Activity, Users,
  Eye, Database, Layers, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]",
  offline: "bg-red-500/60",
  connecting: "bg-amber-400 animate-pulse",
  active: "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]",
  unknown: "bg-slate-600",
};

export default function NetworkFleetPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Network & Fleet | Tessera"; }, []);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeSection = "all";

  const { data: fleetData } = useQuery<any>({ queryKey: ["/api/fleet/status"], refetchInterval: 10000 });
  const { data: meshData } = useQuery<any>({ queryKey: ["/api/mesh/status"], refetchInterval: 10000 });
  const { data: freqData } = useQuery<any>({ queryKey: ["/api/mesh/frequency-status"], refetchInterval: 15000 });
  const { data: opsecData } = useQuery<any>({ queryKey: ["/api/mesh/opsec-status"], refetchInterval: 15000 });

  const instances = fleetData?.instances || [];
  const meshNodes = meshData?.nodes || [];

  const sections = [
    { id: "fleet" as const, label: "Fleet Instances", icon: Globe, color: "text-cyan-400", count: instances.length },
    { id: "mesh" as const, label: "Mesh Network", icon: Network, color: "text-violet-400", count: meshData?.totalNodes || 0 },
    { id: "defense" as const, label: "Defense & OPSEC", icon: Shield, color: "text-red-400", count: opsecData?.strategies?.length || 0 },
  ];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-foreground`} data-testid="network-fleet-page">
      <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-violet-400 bg-clip-text text-transparent flex items-center justify-center gap-2" data-testid="text-network-title">
            <Network size={24} className="text-cyan-400" />
            Network & Fleet
          </h1>
          <p className="text-xs text-muted-foreground">Fleet instances, mesh network & sovereign defense</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-cyan-400">{instances.length}</div>
            <div className="text-[10px] text-muted-foreground">Fleet Nodes</div>
          </div>
          <div className="bg-violet-950/30 border border-violet-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-violet-400">{meshData?.totalNodes || 0}</div>
            <div className="text-[10px] text-muted-foreground">Mesh Nodes</div>
          </div>
          <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">{meshData?.onlineNodes || 0}</div>
            <div className="text-[10px] text-muted-foreground">Online</div>
          </div>
          <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-400">{opsecData?.activeStrategies || freqData?.totalChannels || 0}</div>
            <div className="text-[10px] text-muted-foreground">Defense Active</div>
          </div>
        </div>

        

        {true && (
          <div className="space-y-2">
            {instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No fleet instances connected yet</div>
            ) : instances.map((inst: any) => (
              <div key={inst.id} className="bg-black/30 border border-white/10 rounded-xl p-3 hover:border-cyan-500/30 transition" data-testid={`fleet-instance-${inst.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", STATUS_DOT[inst.status] || STATUS_DOT.unknown)} />
                  <span className="text-sm font-semibold flex-1 truncate">{inst.name}</span>
                  <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{inst.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(inst.lastSeen)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{inst.url}</div>
                {inst.agents && inst.agents.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {inst.agents.slice(0, 5).map((a: any) => (
                      <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">{a.name}</span>
                    ))}
                    {inst.agents.length > 5 && <span className="text-[10px] text-muted-foreground">+{inst.agents.length - 5}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {true && (
          <div className="space-y-2">
            {meshData && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/30 border border-white/10 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Compute Units</div>
                  <div className="text-sm font-bold text-violet-400">{meshData.totalComputeUnits || 0}</div>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Expansion Rate</div>
                  <div className="text-sm font-bold text-green-400">{meshData.expansionRate || "0/min"}</div>
                </div>
              </div>
            )}
            {meshNodes.map((node: any) => (
              <div key={node.id} className="bg-black/30 border border-white/10 rounded-lg p-3" data-testid={`mesh-node-${node.id}`}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[node.status] || STATUS_DOT.unknown)} />
                  <Server size={12} className="text-violet-400" />
                  <span className="text-xs font-semibold flex-1 truncate">{node.type || node.id}</span>
                  <span className="text-[10px] text-muted-foreground">{node.location}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span><Cpu size={10} className="inline mr-1" />{node.computeUnits} CU</span>
                  <span><Users size={10} className="inline mr-1" />{node.peers} peers</span>
                  <span><Clock size={10} className="inline mr-1" />{node.latencyMs}ms</span>
                  {node.quantumEntangled && <span className="text-violet-400"><Zap size={10} className="inline mr-1" />QE</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {true && (
          <div className="space-y-3">
            {freqData && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-red-400" />
                  <span className="text-xs font-bold text-red-400">Frequency Hopping</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-red-400">{freqData.totalChannels || 128}</div>
                    <div className="text-[10px] text-muted-foreground">Channels</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-orange-400">{freqData.ciphers || 4}</div>
                    <div className="text-[10px] text-muted-foreground">Ciphers</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-400">{freqData.patterns || 6}</div>
                    <div className="text-[10px] text-muted-foreground">Patterns</div>
                  </div>
                </div>
              </div>
            )}
            {opsecData?.strategies && opsecData.strategies.map((s: any, i: number) => (
              <div key={i} className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex items-center gap-2" data-testid={`opsec-${i}`}>
                <Shield size={12} className="text-red-400 shrink-0" />
                <span className="text-xs flex-1">{s.name || s}</span>
                <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
              </div>
            ))}
            {opsecData?.fingerprints && (
              <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5"><Eye size={12} />Identity Rotation</div>
                <div className="text-sm font-mono text-muted-foreground">{opsecData.fingerprints} rotating fingerprints</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
