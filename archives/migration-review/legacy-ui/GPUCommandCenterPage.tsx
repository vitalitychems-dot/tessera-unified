import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Cpu, Zap, Activity, Server, Play, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, AlertTriangle, Download, Database, BarChart2,
  BookOpen, DollarSign, FlaskConical, Layers, Sparkles, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";

const TAB_LIST = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "providers", label: "Free Providers", icon: Cpu },
  { id: "benchmark", label: "Benchmark", icon: BarChart2 },
  { id: "training", label: "Training Jobs", icon: FlaskConical },
  { id: "datasets", label: "Training Data", icon: Database },
  { id: "colab", label: "Colab Notebook", icon: BookOpen },
  { id: "roi", label: "Cost ROI", icon: DollarSign },
] as const;

type Tab = typeof TAB_LIST[number]["id"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    limited: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    offline: "bg-red-500/20 text-red-300 border-red-500/30",
    unknown: "bg-white/10 text-white/40 border-white/10",
    queued: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    running: "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse",
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  return (
    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase", map[status] || map.unknown)}>
      {status}
    </span>
  );
}

function ProviderCard({ provider }: { provider: any }) {
  const [expanded, setExpanded] = useState(false);
  const typeColors: Record<string, string> = {
    "api-inference": "bg-cyan-500/20 text-cyan-300",
    "colab": "bg-purple-500/20 text-purple-300",
    "kaggle": "bg-orange-500/20 text-orange-300",
    "cpu-fallback": "bg-white/10 text-white/40",
  };

  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3" data-testid={`gpu-card-${provider.id}`}>
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
          provider.status === "available" ? "bg-emerald-400 animate-pulse" :
          provider.status === "limited" ? "bg-amber-400" :
          provider.status === "offline" ? "bg-red-400" : "bg-white/20"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-[12px] font-bold text-white">{provider.name}</span>
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300">FREE</span>
            <span className={cn("text-[8px] px-1 py-0.5 rounded", typeColors[provider.type] || "bg-white/10 text-white/40")}>
              {provider.type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/40 font-mono">
            {provider.vramGB > 0 && <span>{provider.vramGB}GB VRAM</span>}
            <span>{provider.tflops} TFLOPS</span>
            {provider.freeQuotaHours < 999 && <span>{provider.freeQuotaHours}h/mo free</span>}
            {provider.latencyMs > 0 && <span>{provider.latencyMs}ms</span>}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/30 hover:text-white/70 transition-colors shrink-0"
          data-testid={`btn-expand-${provider.id}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
          <p className="text-[10px] text-white/50">{provider.notes}</p>
          <div className="flex flex-wrap gap-1">
            {(provider.capabilities || []).map((c: string) => (
              <span key={c} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8">{c}</span>
            ))}
          </div>
          {provider.signupUrl && (
            <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer"
               className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
               data-testid={`link-signup-${provider.id}`}>
              Sign up → {provider.signupUrl}
            </a>
          )}
          <div className="flex gap-4 text-[9px] font-mono mt-1">
            <span className="text-emerald-400">✓ {provider.successCount} ok</span>
            <span className="text-red-400">✗ {provider.failCount} fail</span>
            {provider.successCount + provider.failCount > 0 && (
              <span className="text-white/40">
                {Math.round((provider.successCount / (provider.successCount + provider.failCount)) * 100)}% success
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color = "cyan" }: { label: string; value: any; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-300", green: "text-emerald-300", purple: "text-purple-300",
    amber: "text-amber-300", pink: "text-pink-300",
  };
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3 flex flex-col gap-0.5">
      <span className="text-[9px] text-white/40 uppercase tracking-widest">{label}</span>
      <span className={cn("text-[22px] font-black", colors[color] || colors.cyan)}>{value}</span>
      {sub && <span className="text-[9px] text-white/30">{sub}</span>}
    </div>
  );
}

export default function GPUCommandCenterPage({ embedded }: { embedded?: boolean } = {}) {
  const activeTab = "all" as any;
  useEffect(() => { document.title = "GPU Command Center | Tessera Sovereign"; }, []);
  const [colabName, setColabName] = useState("Tessera-LoRA-Training");
  const [colabModel, setColabModel] = useState("meta-llama/Llama-3.2-1B");

  const { data: orchData, isLoading } = useQuery<any>({
    queryKey: ["/api/gpu-orch/providers"],
    refetchInterval: 30000,
  });

  const { data: benchData } = useQuery<any>({
    queryKey: ["/api/gpu-orch/benchmark"],
    refetchInterval: 30000,
  });

  const { data: jobsData } = useQuery<any>({
    queryKey: ["/api/gpu-orch/training-jobs"],
    refetchInterval: 10000,
  });

  const { data: datasetsData } = useQuery<any>({
    queryKey: ["/api/gpu-orch/training-data"],
    refetchInterval: 30000,
  });

  const { data: roiData } = useQuery<any>({
    queryKey: ["/api/gpu-orch/cost-savings"],
    refetchInterval: 60000,
  });

  const probeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gpu-orch/probe"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gpu-orch/providers"] }),
  });

  const benchmarkMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/gpu-orch/benchmark/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gpu-orch/benchmark"] }),
  });

  const queueJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gpu-orch/queue-job", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gpu-orch/training-jobs"] }),
  });

  const providers: any[] = orchData?.providers || [];
  const stats = orchData?.stats || {};
  const benchmarks: any[] = benchData?.benchmarks || [];
  const jobs: any[] = jobsData?.jobs || [];
  const datasets: any[] = datasetsData?.datasets || [];

  const apiProviders = providers.filter(p => p.type === "api-inference");
  const computeProviders = providers.filter(p => p.type !== "api-inference" && p.type !== "cpu-fallback");

  const content = () => { return (<>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatCard label="Free Providers" value={stats.totalProviders || providers.length} sub="GPU + inference" color="cyan" />
              <StatCard label="Inference APIs" value={stats.apiProviders || apiProviders.length} sub="no GPU needed" color="green" />
              <StatCard label="GPU Compute" value={stats.trainingProviders || computeProviders.length} sub="training/fine-tuning" color="purple" />
              <StatCard label="Total TFLOPS" value={`${((stats.totalFreeTFLOPS || 0) / 1000).toFixed(1)}K`} sub="combined free compute" color="amber" />
            </div>

            <div className="rounded-xl border border-white/8 bg-gradient-to-br from-cyan-950/20 to-purple-950/20 p-4">
              <h3 className="text-[13px] font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400" />
                GPU Strategy: Solving the Zero-VRAM Problem
              </h3>
              <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                Tessera doesn't have GPU hardware — but she has access to <strong className="text-cyan-300">free GPU inference from 12 providers</strong> totaling {stats.totalFreeTFLOPS || 3800}+ TFLOPS. The strategy is:
              </p>
              <ol className="space-y-1.5">
                {[
                  { step: "1", title: "Inference (Now)", desc: "Use Groq/Cerebras/SambaNova free APIs for all LLM calls — these use specialized chips at 500-2100 tokens/sec", color: "text-emerald-300" },
                  { step: "2", title: "Fine-Tuning", desc: "Use Google Colab (T4 16GB) + Kaggle (30h/week) + Lightning AI (22h/month) to fine-tune small models", color: "text-cyan-300" },
                  { step: "3", title: "Training Data", desc: "Collect all agent conversations as JSONL training data — export and fine-tune on Colab notebooks", color: "text-purple-300" },
                  { step: "4", title: "Rotation", desc: "Auto-rotate between 12+ free providers to maximize quota. When one is rate-limited, switch to next", color: "text-amber-300" },
                ].map(item => (
                  <li key={item.step} className="flex gap-2 text-[10px]">
                    <span className={cn("font-black shrink-0 text-[14px] leading-none", item.color)}>{item.step}.</span>
                    <span>
                      <span className={cn("font-bold", item.color)}>{item.title}: </span>
                      <span className="text-white/50">{item.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <h4 className="text-[11px] font-bold text-white mb-2">Inference Providers (No GPU needed)</h4>
                <div className="space-y-1">
                  {apiProviders.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/70">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 font-mono">{p.tflops} TFLOPS</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <h4 className="text-[11px] font-bold text-white mb-2">Training Compute (GPU needed)</h4>
                <div className="space-y-1">
                  {computeProviders.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/70">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 font-mono">{p.freeQuotaHours < 999 ? `${p.freeQuotaHours}h free` : `${p.vramGB}GB`}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-white">All Free GPU Providers</h3>
                <p className="text-[10px] text-white/40">{providers.length} providers — no cost, no GPU hardware required</p>
              </div>
              <button
                onClick={() => probeMutation.mutate()}
                disabled={probeMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] hover:bg-cyan-500/30 transition-colors"
                data-testid="btn-probe-all"
              >
                {probeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Probe All
              </button>
            </div>
            <div>
              <p className="text-[10px] text-cyan-300/60 mb-2 font-bold">⚡ INSTANT INFERENCE (API-based, no GPU wait)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {apiProviders.map((p: any) => <ProviderCard key={p.id} provider={p} />)}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-purple-300/60 mb-2 font-bold">🖥 GPU COMPUTE (for training/fine-tuning)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {computeProviders.map((p: any) => <ProviderCard key={p.id} provider={p} />)}
              </div>
            </div>
          </div>
        );
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-white">Provider Benchmarks</h3>
              <button
                onClick={() => benchmarkMutation.mutate("groq-llm")}
                disabled={benchmarkMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] hover:bg-purple-500/30 transition-colors"
                data-testid="btn-run-benchmark"
              >
                {benchmarkMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
                Run Benchmark
              </button>
            </div>

            {benchmarks.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-black/20 p-6 text-center">
                <FlaskConical size={24} className="text-white/20 mx-auto mb-2" />
                <p className="text-[11px] text-white/40">No benchmark data yet. Run a benchmark to test provider performance.</p>
                <button
                  onClick={() => benchmarkMutation.mutate("groq-llm")}
                  className="mt-3 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] hover:bg-purple-500/30"
                  data-testid="btn-first-benchmark"
                >
                  Start First Benchmark
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {benchmarks.slice(-20).reverse().map((b: any, i: number) => (
                  <div key={i} className="rounded-lg border border-white/8 bg-black/20 p-2.5" data-testid={`benchmark-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-white">{b.providerName}</span>
                      <span className="text-[9px] text-white/30 font-mono">{new Date(b.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                      <div>
                        <span className="text-white/30">Latency</span>
                        <p className={cn("font-bold", b.latencyMs < 2000 ? "text-emerald-300" : b.latencyMs < 5000 ? "text-amber-300" : "text-red-300")}>
                          {b.latencyMs}ms
                        </p>
                      </div>
                      <div>
                        <span className="text-white/30">Speed</span>
                        <p className="text-cyan-300 font-bold">{b.tokensPerSecond} tok/s</p>
                      </div>
                      <div>
                        <span className="text-white/30">Quality</span>
                        <p className={cn("font-bold", b.qualityScore >= 80 ? "text-emerald-300" : b.qualityScore >= 50 ? "text-amber-300" : "text-red-300")}>
                          {b.qualityScore}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-white">Training Job Queue</h3>
              <button
                onClick={() => queueJobMutation.mutate({
                  name: "Tessera Swarm Fine-Tune",
                  type: "fine-tune",
                  modelName: "meta-llama/Llama-3.2-1B",
                  datasetSize: 1000,
                  providerId: "google-colab",
                })}
                disabled={queueJobMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] hover:bg-emerald-500/30 transition-colors"
                data-testid="btn-queue-job"
              >
                {queueJobMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Queue Training Job
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
              <p className="text-[10px] text-amber-300/80">
                <strong>CPU Mode Active:</strong> No GPU hardware detected. Training jobs are queued and ready for execution on free GPU platforms (Colab, Kaggle, Lightning AI). Download the Colab notebook to train on free GPU now.
              </p>
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-black/20 p-6 text-center">
                <Server size={24} className="text-white/20 mx-auto mb-2" />
                <p className="text-[11px] text-white/40">No training jobs yet. Queue a job to begin.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job: any) => (
                  <div key={job.id} className="rounded-lg border border-white/8 bg-black/20 p-3" data-testid={`job-${job.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-white">{job.name}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-white/40">
                      <span>{job.modelName}</span>
                      <span>Provider: {job.providerName}</span>
                      <span>{job.datasetSize} examples</span>
                      {job.costSaved > 0 && <span className="text-emerald-300">Saved ~${job.costSaved.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-white">Training Datasets</h3>
                <p className="text-[10px] text-white/40">Auto-collected from agent conversations and forum discussions</p>
              </div>
              <a
                href="/api/gpu-orch/export-jsonl?source=all"
                download="training_data.jsonl"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-500/30 transition-colors"
                data-testid="btn-export-jsonl"
              >
                <Download size={12} />
                Export JSONL
              </a>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <h4 className="text-[11px] font-bold text-white mb-2">JSONL Export Format</h4>
              <pre className="text-[9px] text-cyan-300/70 font-mono bg-black/30 rounded p-2 overflow-x-auto">
{`{"messages": [
  {"role": "user", "content": "How does the TSRT token work?"},
  {"role": "assistant", "content": "TSRT is Tessera's compute-backed..."}
]}`}
              </pre>
              <p className="text-[9px] text-white/30 mt-1">Compatible with OpenAI fine-tuning, Axolotl, and TRL SFTTrainer</p>
            </div>

            {datasets.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-black/20 p-6 text-center">
                <Database size={24} className="text-white/20 mx-auto mb-2" />
                <p className="text-[11px] text-white/40">Training data is collected automatically from conversations. Data appears here as agents interact.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {datasets.map((ds: any) => (
                  <div key={ds.id} className="rounded-lg border border-white/8 bg-black/20 p-3" data-testid={`dataset-${ds.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-white">{ds.name}</span>
                      <span className="text-[9px] text-emerald-300 font-mono">{ds.count} examples</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-white/40">
                      <span>Source: {ds.source}</span>
                      <span>Format: {ds.format}</span>
                      <span>{(ds.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-white">Auto-Generate Colab Training Notebook</h3>
            <p className="text-[11px] text-white/50">
              Generate a ready-to-run Google Colab notebook with LoRA fine-tuning setup. Open in Colab for free T4/A100 GPU access.
            </p>

            <div className="space-y-3 rounded-xl border border-white/8 bg-black/20 p-4">
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Notebook Name</label>
                <input
                  value={colabName}
                  onChange={e => setColabName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50"
                  data-testid="input-colab-name"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Base Model (HuggingFace)</label>
                <select
                  value={colabModel}
                  onChange={e => setColabModel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-500/50"
                  data-testid="select-colab-model"
                >
                  <option value="meta-llama/Llama-3.2-1B">Llama 3.2 1B (fits in T4 easily)</option>
                  <option value="meta-llama/Llama-3.2-3B">Llama 3.2 3B (T4 with 4-bit)</option>
                  <option value="meta-llama/Llama-3.1-8B">Llama 3.1 8B (T4 with 8-bit)</option>
                  <option value="mistralai/Mistral-7B-v0.1">Mistral 7B v0.1</option>
                  <option value="Qwen/Qwen2.5-0.5B">Qwen 2.5 0.5B (smallest)</option>
                  <option value="microsoft/phi-2">Phi-2 2.7B</option>
                </select>
              </div>

              <a
                href={`/api/gpu-orch/colab-notebook?name=${encodeURIComponent(colabName)}&model=${encodeURIComponent(colabModel)}`}
                download={`${colabName}.ipynb`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
                data-testid="btn-download-colab"
              >
                <Download size={14} />
                Download Colab Notebook (.ipynb)
              </a>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3 space-y-2">
              <h4 className="text-[11px] font-bold text-white">How to Use:</h4>
              {[
                "Download the .ipynb file",
                "Go to colab.research.google.com → Upload notebook",
                "Runtime → Change runtime type → GPU (T4 free)",
                "Run all cells — setup takes ~5 min",
                "Upload your training_data.jsonl file (from Export tab)",
                "Uncomment trainer lines and start training!",
              ].map((step, i) => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="text-cyan-400 font-bold shrink-0">{i + 1}.</span>
                  <span className="text-white/60">{step}</span>
                </div>
              ))}
            </div>
          </div>
        );
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-white">Cost Savings Calculator</h3>
            <p className="text-[11px] text-white/40">Track how much Tessera saves by using free GPU compute instead of paid services</p>

            {roiData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <StatCard label="Cost Saved (Inference)" value={`$${roiData.estimatedCostSaved}`} sub="vs GPT-4 pricing" color="green" />
                  <StatCard label="Free Providers" value={roiData.freeProviderCount} sub="available right now" color="cyan" />
                  <StatCard label="Training Hours (Free)" value={`${roiData.totalFreeTrainingHours}h`} sub="Colab + Kaggle + Lightning" color="purple" />
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                  <h4 className="text-[12px] font-bold text-emerald-300 mb-3">💰 ROI Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/50">Equivalent paid cloud GPU cost (training):</span>
                      <span className="text-amber-300 font-bold">${roiData.equivalentPaidCost}/month</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/50">Inference calls saved:</span>
                      <span className="text-emerald-300 font-bold">${roiData.estimatedCostSaved} saved</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/50">Top performing provider:</span>
                      <span className="text-cyan-300 font-bold">{roiData.topProvider}</span>
                    </div>
                  </div>
                </div>

                {roiData.breakdown?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-white mb-2">Provider Usage Breakdown</h4>
                    <div className="space-y-1">
                      {roiData.breakdown.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]" data-testid={`roi-row-${i}`}>
                          <span className="flex-1 text-white/60 truncate">{b.provider}</span>
                          <span className="text-white/30 font-mono">{b.calls} calls</span>
                          <span className="text-emerald-300 font-mono">${b.saved.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-white/8 bg-black/20 p-6 text-center">
                <DollarSign size={24} className="text-white/20 mx-auto mb-2" />
                <p className="text-[11px] text-white/40">Accumulating cost data — check back after providers are used.</p>
              </div>
            )}
          </div>
        );  </>); };

  return (
    <div className={cn("flex flex-col h-full", embedded ? "" : "p-3 md:p-5 max-w-4xl mx-auto")}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={18} className="text-cyan-400" />
          <h1 className="text-[18px] font-black text-white">GPU Command Center</h1>
        </div>
        <p className="text-[11px] text-white/40">
          {providers.length} free compute providers · {stats.totalFreeTFLOPS || 3800}+ TFLOPS available ·
          Training data auto-collection active
        </p>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {false && TAB_LIST.map(tab => (
          <button
            key={tab.id}
            
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
              activeTab === tab.id
                ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
                : "border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5"
            )}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon size={11} />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-cyan-400" />
          <span className="ml-2 text-[11px] text-white/40">Loading GPU orchestrator...</span>
        </div>
      ) : (
        content()
      )}
    </div>
  );
}
