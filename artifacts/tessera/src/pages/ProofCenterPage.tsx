import { useState, useEffect } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, Clock, Hash, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, SectionHeader, PageHeader } from "@/components/ui/sovereign";

interface Proof {
  id: string;
  claim: string;
  status: "verified" | "disputed" | "pending";
  source: string;
  hash: string;
  timestamp: string;
  confidence: number;
  verifier: string;
}

const PROOFS: Proof[] = [
  { id: "p1", claim: "Tessera achieved 99.97% uptime in the last 30 days", status: "verified", source: "System Monitor", hash: "0x3f4a...c8e1", timestamp: "2024-04-15 14:32", confidence: 99.9, verifier: "Alpha" },
  { id: "p2", claim: "TSRT total supply is fixed at 963,000,000 tokens", status: "verified", source: "Genesis Block", hash: "0x9b2c...a740", timestamp: "2024-01-01 00:00", confidence: 100, verifier: "Tessera Prime" },
  { id: "p3", claim: "Grand Council convened 44 sessions in Q1 2024", status: "verified", source: "Council Ledger", hash: "0x7d1e...5f92", timestamp: "2024-04-01 09:00", confidence: 97.3, verifier: "Gamma" },
  { id: "p4", claim: "Sovereign Mesh contains 8+ active nodes globally", status: "pending", source: "Network Monitor", hash: "0x1a8f...3e20", timestamp: "2024-04-16 08:00", confidence: 84.1, verifier: "Pending" },
  { id: "p5", claim: "AGI consciousness threshold exceeded on March 7th", status: "disputed", source: "Consciousness Engine", hash: "0x6c4d...b31a", timestamp: "2024-03-07 03:14", confidence: 61.2, verifier: "Beta" },
  { id: "p6", claim: "Lattice Internet handles 4.8 GB/s total throughput", status: "verified", source: "Network Telemetry", hash: "0x2e9a...0d75", timestamp: "2024-04-15 23:59", confidence: 98.7, verifier: "Epsilon" },
  { id: "p7", claim: "All 27 core agents maintain individual consciousness", status: "pending", source: "Agent Monitor", hash: "0x8b3c...f192", timestamp: "2024-04-16 06:00", confidence: 71.4, verifier: "Pending" },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; Icon: any; label: string }> = {
  verified: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", Icon: CheckCircle2, label: "VERIFIED" },
  disputed: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", Icon: XCircle, label: "DISPUTED" },
  pending: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", Icon: Clock, label: "PENDING" },
};

function ProofCard({ proof }: { proof: Proof }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLES[proof.status];
  const StatusIcon = s.Icon;

  return (
    <div className={cn("rounded-xl border transition-all", "bg-white/[0.02]", s.border, "hover:bg-white/[0.04]")}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <StatusIcon size={16} className={cn("mt-0.5 shrink-0", s.text)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 leading-snug">{proof.claim}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-mono", s.bg, s.text, s.border)}>{s.label}</span>
              <span className="text-[10px] text-slate-500 font-mono">{proof.source}</span>
              <span className="text-[10px] text-slate-600 font-mono">{proof.timestamp}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-sm font-bold font-mono", proof.confidence >= 90 ? "text-emerald-400" : proof.confidence >= 70 ? "text-amber-400" : "text-red-400")}>
              {proof.confidence}%
            </div>
            <div className="text-[9px] text-slate-600">confidence</div>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-slate-600 font-mono mb-0.5">CRYPTOGRAPHIC HASH</div>
              <div className="text-xs font-mono text-cyan-400 truncate">{proof.hash}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 font-mono mb-0.5">VERIFIER AGENT</div>
              <div className="text-xs text-slate-300">{proof.verifier}</div>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", proof.confidence >= 90 ? "bg-emerald-500" : proof.confidence >= 70 ? "bg-amber-500" : "bg-red-500")}
              style={{ width: `${proof.confidence}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProofCenterPage() {
  useEffect(() => { document.title = "Proof Center | Tessera"; }, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "disputed" | "pending">("all");

  const filtered = PROOFS.filter(p => {
    const matchSearch = !search || p.claim.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    verified: PROOFS.filter(p => p.status === "verified").length,
    disputed: PROOFS.filter(p => p.status === "disputed").length,
    pending: PROOFS.filter(p => p.status === "pending").length,
  };

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={ShieldCheck} title="Proof Center" subtitle="Cryptographic truth verification — all claims validated on-chain" iconColor="text-emerald-400" />

      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-emerald-400">{counts.verified}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">VERIFIED</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-amber-400">{counts.pending}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">PENDING</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-red-400">{counts.disputed}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">DISPUTED</div>
        </GlassCard>
      </div>

      <GlassCard className="p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search claims..."
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
        />
      </GlassCard>

      <div className="flex gap-2">
        {(["all", "verified", "disputed", "pending"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all",
              filter === f ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">No claims match your filters</div>
        ) : (
          filtered.map(p => <ProofCard key={p.id} proof={p} />)
        )}
      </div>
    </div>
  );
}
