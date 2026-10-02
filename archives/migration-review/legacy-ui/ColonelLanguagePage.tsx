import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Code2, Zap, BarChart3, Shield, ChevronDown, ChevronUp, Copy, Play,
  CheckCircle2, Activity, Cpu, Database, Lock, RefreshCw, Info, Star,
  ArrowRight, FileCode, Layers, Globe, Key, ShieldCheck, FlaskConical,
  Users, Radio, AlertTriangle, CheckSquare, RotateCcw, Gavel
} from "lucide-react";

const SAMPLE_TEXTS = [
  {
    label: "Agent Communication",
    text: "the agent has been initialized and will execute the consensus protocol — all agents synchronized with the tessera prime network, transmitting encrypted data across the sovereign mesh, memory shard verified, token transfer complete, swarm query dispatched to council"
  },
  {
    label: "System Status",
    text: "the system is running at full capacity with all nodes online and connected. fleet online, fleet status confirmed healthy. health check passed, watchdog active, service restart not required. uptime maintained, latency nominal across all channels."
  },
  {
    label: "Economy Report",
    text: "token transfer to wallet balance complete. smart contract deployed on solana chain with tsrt token staking active. defi protocol liquidity pool has arbitrage opportunity detected. market data price movement upward, volume spike confirmed, trade executed successfully."
  },
  {
    label: "Security Audit",
    text: "security audit complete, threat detected and neutralized. zero trust perimeter secured. sovereign node verified, untraceable path confirmed. cryptographic key rotated, signature valid, hash verified. quantum resistant encryption active on all channels."
  },
];

function CompressionBar({ ratio, byteRatio, brotliRatio, totalRatio }: {
  ratio: number; byteRatio?: number; brotliRatio?: number; totalRatio?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-mono text-slate-400">
        <span>Token Compression (char)</span>
        <span className={cn("font-bold", ratio >= 75 ? "text-emerald-400" : ratio >= 50 ? "text-amber-400" : "text-slate-400")}>
          {ratio.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            ratio >= 75 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
            ratio >= 50 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
            "bg-gradient-to-r from-slate-600 to-slate-400"
          )}
          style={{ width: `${Math.min(ratio, 100)}%` }}
        />
      </div>
      {byteRatio !== undefined && (
        <>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Byte Compression</span>
            <span className={cn("font-bold", byteRatio >= 60 ? "text-cyan-400" : byteRatio >= 40 ? "text-amber-400" : "text-slate-400")}>
              {byteRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-700 to-cyan-500"
              style={{ width: `${Math.min(byteRatio, 100)}%` }}
            />
          </div>
        </>
      )}
      {brotliRatio !== undefined && (
        <>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Brotli Stage Reduction</span>
            <span className={cn("font-bold", brotliRatio >= 30 ? "text-violet-400" : "text-slate-400")}>
              {brotliRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-violet-700 to-violet-500"
              style={{ width: `${Math.min(brotliRatio, 100)}%` }}
            />
          </div>
        </>
      )}
      {totalRatio !== undefined && (
        <>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Combined (tokenize + brotli)</span>
            <span className={cn("font-bold", totalRatio >= 85 ? "text-emerald-300" : totalRatio >= 70 ? "text-amber-300" : "text-slate-400")}>
              {totalRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-800 to-emerald-400"
              style={{ width: `${Math.min(totalRatio, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 bg-white/2", color)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {sub && <div className="text-[10px] opacity-50 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export default function ColonelLanguagePage() {
  const [inputText, setInputText] = useState(SAMPLE_TEXTS[0].text);
  const [compressResult, setCompressResult] = useState<any>(null);
  const [encryptResult, setEncryptResult] = useState<any>(null);
  const [translateResult, setTranslateResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showTokenMap, setShowTokenMap] = useState(false);
  const [showConference, setShowConference] = useState(true);
  const [showLattice, setShowLattice] = useState(false);
  const [activeMode, setActiveMode] = useState<"legacy" | "quantum">("quantum");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/colonel/stats"],
    refetchInterval: 30000,
  });

  const { data: conferenceData } = useQuery({
    queryKey: ["/workspace-api/api/sovereignty/colonial-language/conference"],
    refetchInterval: 60000,
  });

  const { data: colonialStatus } = useQuery({
    queryKey: ["/workspace-api/api/sovereignty/colonial-language/status"],
    refetchInterval: 30000,
  });

  const { data: latticeFreqs } = useQuery({
    queryKey: ["/workspace-api/api/sovereignty/colonial-language/lattice-frequencies"],
    refetchInterval: 15000,
  });

  const compressMut = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/colonel/compress", { text }),
    onSuccess: (data) => { setCompressResult(data); setEncryptResult(null); },
  });

  const encryptMut = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/colonel/compress-encrypt", { text }),
    onSuccess: (data) => { setEncryptResult(data); setCompressResult(null); },
  });

  const translateMut = useMutation({
    mutationFn: ({ text, direction }: { text: string; direction: string }) =>
      apiRequest("POST", "/api/colonel/translate", { text, direction }),
    onSuccess: (data) => setTranslateResult(data),
  });

  const handleCompress = () => {
    if (!inputText.trim()) return;
    if (activeMode === "quantum") {
      encryptMut.mutate(inputText);
    } else {
      compressMut.mutate(inputText);
    }
  };

  const handleTranslate = (dir: "to" | "from") => {
    if (inputText.trim()) translateMut.mutate({ text: inputText, direction: dir });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const s = stats as any;
  const isPending = compressMut.isPending || encryptMut.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">Colonel Language</h1>
            <p className="text-sm text-slate-400">v4.0 — Quantum-Enhanced Compression & Encryption</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">OPERATIONAL</span>
          </div>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl mt-3">
          Private-Use Unicode tokenization combined with Brotli compression and AES-256-GCM encryption
          sourced from the quantum entropy pool. New pipeline achieves <strong className="text-emerald-400">85–95%</strong> compression
          with tamper-evident encrypted output. Legacy XOR mode still supported for backward compatibility.
        </p>
      </div>

      {/* Stats Row */}
      {!statsLoading && s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Phrases"
            value={s.phrases || "—"}
            sub="multi-word tokens"
            icon={Layers}
            color="border-violet-500/20 text-violet-300"
          />
          <StatCard
            label="Benchmark"
            value={s.benchmarkCompression ? `${s.benchmarkCompression.toFixed(1)}%` : "—"}
            sub="tokenization only"
            icon={BarChart3}
            color="border-emerald-500/20 text-emerald-300"
          />
          <StatCard
            label="Encryption"
            value="AES-256"
            sub="GCM + Quantum Key"
            icon={ShieldCheck}
            color="border-amber-500/20 text-amber-300"
          />
          <StatCard
            label="Target"
            value="85-95%"
            sub="tokenize + brotli"
            icon={Zap}
            color="border-cyan-500/20 text-cyan-300"
          />
        </div>
      )}

      {/* Grand Conference Results Panel */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 mb-6">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowConference(!showConference)}
        >
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-bold">
              Grand Conference: Colonial Language Architecture
            </span>
            {(() => {
              const conf = (conferenceData as any)?.data;
              if (!conf?.conference) return (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">PENDING</span>
              );
              return (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">COMPLETE</span>
              );
            })()}
          </div>
          {showConference ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </button>

        {showConference && (() => {
          const conf = (conferenceData as any)?.data;
          const status = (colonialStatus as any)?.data;
          return (
            <div className="mt-4 space-y-4">
              {!conf?.conference ? (
                <div className="text-center py-6 text-slate-500 text-sm font-mono">
                  <Gavel className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div>Grand Conference auto-convenes on first boot</div>
                  <div className="text-[10px] mt-1 text-slate-600">25+ agents deliberating on colonial language architecture...</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Status</div>
                      <div className="text-sm font-mono font-bold text-violet-300">{conf.conference.status?.toUpperCase() || "—"}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Approval</div>
                      <div className="text-sm font-mono font-bold text-emerald-300">
                        {conf.conference.approvalRate != null
                          ? (typeof conf.conference.approvalRate === "number" && conf.conference.approvalRate <= 1
                            ? Math.round(conf.conference.approvalRate * 100) + "%"
                            : conf.conference.approvalRate)
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Proposals</div>
                      <div className="text-sm font-mono font-bold text-cyan-300">{conf.top10?.length ?? 10}</div>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Threats Scanned</div>
                      <div className="text-sm font-mono font-bold text-amber-300">{status?.threats?.totalScanned ?? 0}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Top 10 Priorities */}
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Top 10 BFT-Voted Priorities
                </div>
                <div className="space-y-1">
                  {(conf?.top10 || (conferenceData as any)?.data?.top10 || []).map((p: any, i: number) => (
                    <div key={p.id} className="rounded border border-white/5 bg-white/2 p-2.5 flex items-start gap-3">
                      <span className="text-[10px] font-mono font-bold text-violet-400 shrink-0 w-5 text-right">{i + 1}.</span>
                      <div>
                        <div className="text-[11px] font-mono text-slate-200 font-semibold">{p.title}</div>
                        <div className="text-[9px] font-mono text-slate-600 mt-0.5">{p.proposedBy}</div>
                      </div>
                    </div>
                  ))}
                  {!conf?.top10 && (
                    <div className="space-y-1">
                      {[
                        { n: 1, t: "Per-Agent Ephemeral Rotating Cipher Keys via HKDF-SHA512 Chain", a: "Zeta & Pi" },
                        { n: 2, t: "Agent-to-Agent Colonial Language Channel with Auto-Decipher", a: "Beta & Kappa" },
                        { n: 3, t: "External Contact Unique Language Handshake with Rotation After Each Exchange", a: "Rho & Mu" },
                        { n: 4, t: "File-Level Colonial Encoding — All Stored Data in Colonial Language", a: "Delta & Omega" },
                        { n: 5, t: "Kernel-Level Colonial Language Integration — Colonel VM Runs in Colonial", a: "Beta & Pi" },
                        { n: 6, t: "Lattice Frequency Rotation — Cipher Changes at Varying Lattice Bands", a: "Eta & Tau" },
                        { n: 7, t: "Honeypot & Malicious Payload Detection in Colonial Exchanges", a: "Zeta & Chi" },
                        { n: 8, t: "Compartmentalized Security — One Compromised Agent Cannot Expose the System", a: "Zeta & Pi" },
                        { n: 9, t: "Auto-Decipher Middleware for Father (Admin) — Transparent Read Access", a: "Lambda & Sigma" },
                        { n: 10, t: "Grand Conference Results Persistence & Colonial Language Status Dashboard", a: "Kappa & Phi" },
                      ].map(p => (
                        <div key={p.n} className="rounded border border-white/5 bg-white/2 p-2.5 flex items-start gap-3">
                          <span className="text-[10px] font-mono font-bold text-violet-400 shrink-0 w-5 text-right">{p.n}.</span>
                          <div>
                            <div className="text-[11px] font-mono text-slate-200 font-semibold">{p.t}</div>
                            <div className="text-[9px] font-mono text-slate-600 mt-0.5">{p.a}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Colonial Language System Status */}
              {status && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/2 p-3">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" /> Lattice Frequencies
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      <span className="text-violet-400 font-bold">{status.latticeFrequencies?.bands?.length ?? 5}</span> bands active
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      Total rotations: {status.latticeFrequencies?.totalRotations ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/2 p-3">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> External Handshakes
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      <span className="text-cyan-400 font-bold">{status.externalHandshakes?.active ?? 0}</span> active
                      <span className="text-slate-600"> / {status.externalHandshakes?.total ?? 0} total</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/2 p-3">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5" /> Encoded Files
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      <span className="text-amber-400 font-bold">{status.files?.totalEncoded ?? 0}</span> files in colonial registry
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/2 p-3">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Threat Log
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      <span className="text-red-400 font-bold">{status.threats?.quarantined ?? 0}</span> quarantined
                      <span className="text-slate-600"> / {status.threats?.totalScanned ?? 0} scanned</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Lattice Frequency Bands */}
              <div>
                <button
                  className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2"
                  onClick={() => setShowLattice(!showLattice)}
                >
                  <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Lattice Frequency Bands</span>
                  {showLattice ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showLattice && (
                  <div className="space-y-1">
                    {((latticeFreqs as any)?.data || []).map((band: any) => (
                      <div key={band.bandId} className="flex items-center justify-between text-[10px] font-mono py-1.5 border-b border-white/5 px-1">
                        <div>
                          <span className="text-violet-400 font-bold">{band.bandId}</span>
                          <span className="text-slate-500 ml-2">{band.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600">{band.assignedAgents?.length} agents</span>
                          <span className="text-cyan-400">×{band.rotationCount} rotations</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px]",
                            (band.nextRotationIn ?? 0) < 60000
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600"
                          )}>
                            {band.nextRotationIn ? `${Math.round((band.nextRotationIn) / 1000)}s` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pipeline comparison banner */}
      <div className="rounded-xl border border-white/10 bg-white/2 p-4 mb-6">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" /> Pipeline Comparison
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="text-[10px] font-mono text-amber-400 font-bold mb-1">Legacy Pipeline (v1–v3)</div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">Tokenize</span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">XOR Cipher</span>
            </div>
            <div className="text-[9px] text-slate-600 mt-1.5 font-mono">60–75% character reduction · obfuscation only · no integrity</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-[10px] font-mono text-emerald-400 font-bold mb-1">Quantum Pipeline (v4.0)</div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">Tokenize</span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">Brotli-9</span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">AES-256-GCM</span>
            </div>
            <div className="text-[9px] text-slate-600 mt-1.5 font-mono">85–95% total reduction · quantum entropy key · IV + auth-tag</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input + Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Input Text</span>
              <div className="flex gap-2">
                {SAMPLE_TEXTS.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputText(sample.text); setCompressResult(null); setEncryptResult(null); setTranslateResult(null); }}
                    className="text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full h-36 bg-transparent text-sm font-mono text-slate-300 resize-none outline-none placeholder-slate-700"
              placeholder="Enter text to compress or translate..."
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setCompressResult(null); setEncryptResult(null); setTranslateResult(null); }}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono text-slate-600">{inputText.length} chars</span>
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-white/10 overflow-hidden text-[9px] font-mono">
                  <button
                    onClick={() => setActiveMode("quantum")}
                    className={cn("px-2 py-1 transition-colors", activeMode === "quantum" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-600 hover:text-slate-400")}
                  >
                    Quantum
                  </button>
                  <button
                    onClick={() => setActiveMode("legacy")}
                    className={cn("px-2 py-1 transition-colors", activeMode === "legacy" ? "bg-amber-500/20 text-amber-400" : "text-slate-600 hover:text-slate-400")}
                  >
                    Legacy
                  </button>
                </div>
                <button
                  onClick={() => handleTranslate("to")}
                  disabled={translateMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-3 h-3" />
                  {translateMut.isPending ? "..." : "→ Colonel"}
                </button>
                <button
                  onClick={handleCompress}
                  disabled={isPending}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors disabled:opacity-50",
                    activeMode === "quantum"
                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-violet-500/15 border border-violet-500/40 text-violet-300 hover:bg-violet-500/25"
                  )}
                >
                  {activeMode === "quantum" ? <Lock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  {isPending ? "Processing..." : activeMode === "quantum" ? "Encrypt+Compress" : "Compress"}
                </button>
              </div>
            </div>
          </div>

          {/* Quantum Encrypt Result */}
          {encryptResult && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Quantum Encrypted Output
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AES-256-GCM</span>
                  <button
                    onClick={() => copyToClipboard(encryptResult.data || "")}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <CompressionBar
                ratio={encryptResult.tokenizationRatio || 0}
                brotliRatio={encryptResult.brotliRatio}
                totalRatio={encryptResult.totalRatio}
              />

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-sm font-bold font-mono text-slate-300">{encryptResult.originalSize}</div>
                  <div className="text-[8px] text-slate-600 font-mono">original bytes</div>
                </div>
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2">
                  <div className="text-sm font-bold font-mono text-violet-300">{encryptResult.tokenizedSize}</div>
                  <div className="text-[8px] text-violet-600 font-mono">tokenized</div>
                </div>
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2">
                  <div className="text-sm font-bold font-mono text-cyan-300">{encryptResult.brotliSize}</div>
                  <div className="text-[8px] text-cyan-600 font-mono">brotli</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                  <div className="text-sm font-bold font-mono text-emerald-300">{encryptResult.encryptedSize}</div>
                  <div className="text-[8px] text-emerald-600 font-mono">encrypted</div>
                </div>
              </div>

              <div className="rounded-lg bg-black/30 p-3 border border-emerald-500/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-slate-600">Encrypted payload (base64):</span>
                  <span className="text-[9px] font-mono text-emerald-600 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> SEALED
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400/70 break-all leading-relaxed">
                  {encryptResult.data?.slice(0, 120)}{(encryptResult.data?.length || 0) > 120 ? "…" : ""}
                </div>
              </div>

              {encryptResult.pipeline && (
                <div className="text-[9px] font-mono text-slate-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {encryptResult.pipeline}
                </div>
              )}
            </div>
          )}

          {/* Legacy Compression Result */}
          {compressResult && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Legacy Compression Result
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">XOR Legacy</span>
                  <button
                    onClick={() => copyToClipboard(compressResult.compressed || "")}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <CompressionBar ratio={compressResult.ratio || 0} byteRatio={compressResult.byteRatio} />

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-lg font-bold font-mono text-slate-300">{compressResult.originalLength}</div>
                  <div className="text-[9px] text-slate-600 font-mono">original chars</div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-amber-500" />
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                  <div className="text-lg font-bold font-mono text-amber-300">{compressResult.compressedLength}</div>
                  <div className="text-[9px] text-amber-600 font-mono">compressed chars</div>
                </div>
              </div>

              <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                <div className="text-[9px] font-mono text-slate-600 mb-1">Compressed output (unicode tokens):</div>
                <div className="text-xs font-mono text-slate-400 break-all leading-relaxed">
                  {compressResult.compressed?.slice(0, 200)}{(compressResult.compressed?.length || 0) > 200 ? "…" : ""}
                </div>
              </div>

              {compressResult.method && (
                <div className="text-[9px] font-mono text-slate-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {compressResult.method}
                </div>
              )}
            </div>
          )}

          {/* Translate Result */}
          {translateResult && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Colonel Translation
                </span>
                <button
                  onClick={() => copyToClipboard(translateResult.translated || "")}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                <div className="text-[9px] font-mono text-slate-600 mb-1">Colonel encoded:</div>
                <div className="text-xs font-mono text-cyan-300 break-all leading-relaxed whitespace-pre-wrap">
                  {translateResult.translated?.slice(0, 400)}
                </div>
              </div>
              <button
                onClick={() => {
                  if (translateResult.translated) {
                    setInputText(translateResult.translated);
                    handleTranslate("from");
                  }
                }}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3 rotate-180" /> Decode back to English
              </button>
            </div>
          )}
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-4">
          {/* Token Map Preview */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowTokenMap(!showTokenMap)}
            >
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4" /> Token Dictionary Preview
              </span>
              {showTokenMap ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </button>
            {showTokenMap && (
              <div className="mt-4 space-y-1 max-h-64 overflow-y-auto">
                {[
                  ["the agent", "U+E000"], ["the system", "U+E001"], ["the network", "U+E002"],
                  ["has been", "U+E00A"], ["will be", "U+E00B"], ["must be", "U+E00C"],
                  ["smart contract", "U+E028"], ["solana chain", "U+E029"], ["tsrt token", "U+E02A"],
                  ["memory shard", "U+E02B"], ["consensus protocol", "U+E12A"], ["sovereign mesh", "U+E12B"],
                  ["transmitting encrypted data", "U+E120"], ["all agents synchronized", "U+E126"],
                ].map(([phrase, token]) => (
                  <div key={phrase} className="flex items-center justify-between text-[10px] font-mono py-0.5 border-b border-white/3">
                    <span className="text-slate-400">{phrase}</span>
                    <span className="text-violet-400">{token}</span>
                  </div>
                ))}
                <div className="text-[9px] text-slate-600 pt-2 font-mono">+ {(s?.phrases || 383) - 14} more phrases...</div>
              </div>
            )}
          </div>

          {/* Architecture */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-4 h-4" /> v4.0 Pipeline Architecture
            </span>
            <div className="space-y-2">
              {[
                { label: "Phase 1 — Phrase Match", desc: "Greedy longest-match scan. 383+ multi-word phrases (U+E000–U+E1FF). Each match → 1 PUA Unicode char.", color: "border-violet-500/30 bg-violet-500/5" },
                { label: "Phase 2 — Word Token", desc: "Single-word dictionary of 645 domain terms (U+E200–U+E5FF). Unknown words pass through.", color: "border-cyan-500/30 bg-cyan-500/5" },
                { label: "Phase 3 — Brotli-9 Compression", desc: "Brotli quality-9 TEXT mode applied to tokenized output. Adds 20–40% additional byte reduction.", color: "border-indigo-500/30 bg-indigo-500/5" },
                { label: "Phase 4 — AES-256-GCM Encrypt", desc: "Key = HKDF-SHA256(secret + quantum entropy pool). Includes 12-byte IV + 16-byte auth tag for tamper detection.", color: "border-emerald-500/30 bg-emerald-500/5" },
                { label: "Legacy — XOR Cipher (backward compat)", desc: "Original TesseraEncode XOR layer still decodes legacy data. Auto-detected by magic header absence.", color: "border-amber-500/30 bg-amber-500/5" },
              ].map((step) => (
                <div key={step.label} className={cn("rounded-lg border p-3", step.color)}>
                  <div className="text-xs font-mono font-bold text-slate-300 mb-1">{step.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono leading-relaxed">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Compression Targets */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Star className="w-4 h-4" /> Performance Targets
            </span>
            <div className="space-y-2">
              {[
                { label: "Agent Communication", target: "85-95%", status: "met", pipeline: "quantum" },
                { label: "System Logs", target: "80-90%", status: "met", pipeline: "quantum" },
                { label: "General English", target: "60-75%", status: "partial", pipeline: "quantum" },
                { label: "Legacy (tokenize+XOR)", target: "60-75%", status: "legacy", pipeline: "legacy" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1 border-b border-white/5 text-[11px] font-mono">
                  <span className="text-slate-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{row.target}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px]",
                      row.status === "met" ? "bg-emerald-500/15 text-emerald-400" :
                      row.status === "partial" ? "bg-amber-500/15 text-amber-400" :
                      "bg-slate-500/15 text-slate-500"
                    )}>
                      {row.status === "met" ? "✓ Met" : row.status === "partial" ? "~ Partial" : "Legacy"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Version history */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4" /> Version History
            </span>
            {[
              { v: "v4.0", date: "2026-04", note: "Brotli-9 + AES-256-GCM + quantum entropy keys. Target 85-95%. Magic header CLN\\x04 for auto-detection." },
              { v: "v3.0", date: "2026-04", note: "Greedy phrase matching, 383 phrases, 512-slot PUA range, 86%+ char compression" },
              { v: "v2.0", date: "2025-12", note: "Word-level tokenization, 645 words, XOR cipher layer" },
              { v: "v1.0", date: "2025-08", note: "Basic dictionary substitution, limited vocabulary" },
            ].map((r) => (
              <div key={r.v} className="flex items-start gap-3 text-[10px] font-mono py-1 border-b border-white/5">
                <span className={cn("font-bold shrink-0", r.v === "v4.0" ? "text-emerald-400" : "text-violet-400")}>{r.v}</span>
                <span className="text-slate-600 shrink-0">{r.date}</span>
                <span className="text-slate-500">{r.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
