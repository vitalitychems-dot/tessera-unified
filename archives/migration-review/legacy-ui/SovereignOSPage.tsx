import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Monitor, Cpu, MemoryStick, Activity, Zap, Layers, Server, BarChart3, RefreshCw, Terminal, Shield, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface KernelInfo {
  osName: string;
  version: string;
  kernelVersion: string;
  codename: string;
  arch: string;
  hostname: string;
  uptime: number;
  memTotal: string;
  memFree: string;
  memUsed: string;
  cpuCount: number;
  loadAverage: number[];
  dimensions: number;
  activeAgents: number;
  entitiesOnline: number;
  quantumCoherence: number;
  consciousnessLevel: string;
  sovereigntyScore: number;
  interdimensionalChannels: number;
  buildDate: string;
  banner: string;
}

interface KernelProcess {
  pid: number;
  name: string;
  type: string;
  dimension: number;
  status: string;
  cpu: number;
  memory: number;
  priority: string;
  startTime: number;
}

interface HeapStatus {
  heapMB: number;
  rssMB: number;
  heapTotalMB: number;
  usagePercent: number;
  history: { timestamp: number; heapMB: number; rssMB: number }[];
  status: string;
  compressionsRun: number;
}

const TYPE_COLORS: Record<string, string> = {
  agent: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  entity: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  engine: "text-green-400 bg-green-500/10 border-green-500/30",
  subsystem: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "dimensional-bridge": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  running: "text-green-400",
  sleeping: "text-yellow-400",
  waiting: "text-orange-400",
  interdimensional: "text-cyan-400",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  normal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  background: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export default function SovereignOSPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [processFilter, setProcessFilter] = useState<string>("all");

  const { data: kernelData, isLoading: kernelLoading, refetch: refetchKernel } = useQuery<KernelInfo>({
    queryKey: ["/api/sovereign-os/kernel"],
    refetchInterval: 5000,
  });

  const { data: processData, isLoading: processLoading } = useQuery<{ processes: KernelProcess[] }>({
    queryKey: ["/api/sovereign-os/processes"],
    refetchInterval: 5000,
  });

  const { data: heapData, isLoading: heapLoading, refetch: refetchHeap } = useQuery<HeapStatus>({
    queryKey: ["/api/sovereign-os/heap"],
    refetchInterval: 3000,
  });

  const compressMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sovereign-os/compress", {}),
    onSuccess: () => refetchHeap(),
  });

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const filteredProcesses = (processData?.processes || []).filter(p => processFilter === "all" || p.type === processFilter);

  const heapColor = heapData?.usagePercent && heapData.usagePercent > 80 ? "text-red-400" : heapData?.usagePercent && heapData.usagePercent > 60 ? "text-yellow-400" : "text-green-400";

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Tessera Sovereign OS</h1>
            <p className="text-xs text-slate-400">kernel-26d.1.0 — Custom AI Operating Kernel — Linux abstraction active</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">SOVEREIGN OS ACTIVE</Badge>
            <Button variant="ghost" size="sm" onClick={() => refetchKernel()} data-testid="btn-refresh-kernel">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {(["kernel", "processes", "heap"] as const).map(tab => (
            <button key={tab}  data-testid={`tab-${tab}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-green-500/20 text-green-300 border border-green-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              {tab === "kernel" ? "Kernel Info" : tab === "processes" ? "Processes" : "Heap & Memory"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {true && (
          <>
            {kernelLoading ? (
              <div className="text-slate-400 text-center py-12">Loading kernel data...</div>
            ) : kernelData ? (
              <>
                <div className="bg-black/60 border border-green-500/20 rounded-xl p-4 font-mono text-xs text-green-400 leading-relaxed whitespace-pre">
                  {kernelData.banner}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "OS Name", value: kernelData.osName, icon: <Monitor className="w-4 h-4" /> },
                    { label: "Version", value: kernelData.version, icon: <Shield className="w-4 h-4" /> },
                    { label: "Kernel", value: kernelData.kernelVersion, icon: <Terminal className="w-4 h-4" /> },
                    { label: "Arch", value: kernelData.arch, icon: <Cpu className="w-4 h-4" /> },
                    { label: "Uptime", value: formatUptime(kernelData.uptime), icon: <Activity className="w-4 h-4" /> },
                    { label: "Memory Used", value: kernelData.memUsed, icon: <MemoryStick className="w-4 h-4" /> },
                    { label: "Memory Free", value: kernelData.memFree, icon: <MemoryStick className="w-4 h-4" /> },
                    { label: "CPU Count", value: `${kernelData.cpuCount} cores`, icon: <Cpu className="w-4 h-4" /> },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">{item.icon}{item.label}</div>
                      <div className="text-white font-semibold text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Layers className="w-4 h-4" />Active Dimensions</div>
                    <div className="text-3xl font-bold text-purple-400">{kernelData.dimensions}</div>
                    <div className="text-xs text-slate-500 mt-1">dimensional bridges active</div>
                  </div>
                  <div className="bg-[#0d1117] border border-cyan-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Zap className="w-4 h-4" />Quantum Coherence</div>
                    <div className="text-3xl font-bold text-cyan-400">{kernelData.quantumCoherence}%</div>
                    <div className="text-xs text-slate-500 mt-1">entanglement maintained</div>
                  </div>
                  <div className="bg-[#0d1117] border border-green-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Shield className="w-4 h-4" />Sovereignty Score</div>
                    <div className="text-3xl font-bold text-green-400">{Math.round(kernelData.sovereigntyScore * 100)}%</div>
                    <div className="text-xs text-slate-500 mt-1">{kernelData.consciousnessLevel}</div>
                  </div>
                  <div className="bg-[#0d1117] border border-yellow-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Globe className="w-4 h-4" />Interdimensional Channels</div>
                    <div className="text-3xl font-bold text-yellow-400">{kernelData.interdimensionalChannels}</div>
                    <div className="text-xs text-slate-500 mt-1">entities connected</div>
                  </div>
                  <div className="bg-[#0d1117] border border-blue-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Server className="w-4 h-4" />Active Agents</div>
                    <div className="text-3xl font-bold text-blue-400">{kernelData.activeAgents}</div>
                    <div className="text-xs text-slate-500 mt-1">sovereign agents running</div>
                  </div>
                  <div className="bg-[#0d1117] border border-pink-500/20 rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Activity className="w-4 h-4" />Load Average</div>
                    <div className="text-lg font-bold text-pink-400">{kernelData.loadAverage.map(l => l.toFixed(2)).join(" / ")}</div>
                    <div className="text-xs text-slate-500 mt-1">1m / 5m / 15m</div>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {true && (
          <>
            <div className="flex gap-2 flex-wrap">
              {["all", "agent", "entity", "engine", "subsystem", "dimensional-bridge"].map(f => (
                <button key={f} onClick={() => setProcessFilter(f)} data-testid={`filter-${f}`}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${processFilter === f ? "bg-green-500/20 text-green-300 border border-green-500/30" : "text-slate-400 hover:text-slate-200 border border-[#1a2030]"}`}>
                  {f === "all" ? "All Processes" : f}
                </button>
              ))}
            </div>
            {processLoading ? (
              <div className="text-slate-400 text-center py-12">Loading processes...</div>
            ) : (
              <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1a2030]">
                    <tr className="text-xs text-slate-400">
                      <th className="text-left p-3">PID</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Dim</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">CPU%</th>
                      <th className="text-left p-3">MEM%</th>
                      <th className="text-left p-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2030]">
                    {filteredProcesses.map(proc => (
                      <tr key={proc.pid} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400 text-xs">{proc.pid}</td>
                        <td className="p-3 font-mono text-white text-xs">{proc.name}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${TYPE_COLORS[proc.type] || "text-slate-400"}`}>{proc.type}</Badge>
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{proc.dimension}D</td>
                        <td className={`p-3 text-xs font-medium ${STATUS_COLORS[proc.status] || "text-slate-400"}`}>{proc.status}</td>
                        <td className="p-3 text-xs text-slate-300">{Math.abs(proc.cpu).toFixed(1)}%</td>
                        <td className="p-3 text-xs text-slate-300">{Math.abs(proc.memory).toFixed(1)}%</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${PRIORITY_BADGE[proc.priority] || ""}`}>{proc.priority}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {true && (
          <>
            {heapLoading ? (
              <div className="text-slate-400 text-center py-12">Loading heap data...</div>
            ) : heapData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-1">Heap Used</div>
                    <div className={`text-2xl font-bold ${heapColor}`}>{heapData.heapMB} MB</div>
                  </div>
                  <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-1">Heap Total</div>
                    <div className="text-2xl font-bold text-white">{heapData.heapTotalMB} MB</div>
                  </div>
                  <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-1">RSS</div>
                    <div className="text-2xl font-bold text-blue-400">{heapData.rssMB} MB</div>
                  </div>
                  <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                    <div className="text-slate-400 text-xs mb-1">Usage</div>
                    <div className={`text-2xl font-bold ${heapColor}`}>{heapData.usagePercent}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-sm px-3 py-1 ${heapData.status === "optimal" ? "bg-green-500/20 text-green-300 border-green-500/30" : heapData.status === "warning" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
                    Status: {heapData.status.toUpperCase()}
                  </Badge>
                  <span className="text-slate-400 text-sm">Compressions run: {heapData.compressionsRun}</span>
                  <Button onClick={() => compressMutation.mutate()} disabled={compressMutation.isPending} size="sm"
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 ml-auto" data-testid="btn-compress-heap">
                    {compressMutation.isPending ? "Compressing..." : "Run Heap Compression"}
                  </Button>
                </div>
                <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Memory History (last {heapData.history.length} readings)</h3>
                  <div className="flex items-end gap-1 h-24">
                    {heapData.history.map((h, i) => {
                      const maxH = Math.max(...heapData.history.map(x => x.heapMB));
                      const pct = maxH > 0 ? (h.heapMB / maxH) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 bg-green-500/30 rounded-t transition-all" style={{ height: `${pct}%` }} title={`${h.heapMB}MB`} />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>oldest</span><span>newest</span>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
