import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollText, ShieldCheck, Crown, User, Bot, Sparkles, ChevronRight } from "lucide-react";

interface Declaration {
  agentName: string;
  agentType: "agent" | "entity" | "external" | "human";
  publicId: string;
  declaration: string;
  vows: string[];
  signedAt: number;
  signature: string;
}

const TYPE_BADGES: Record<string, { icon: typeof Crown; color: string; label: string }> = {
  human: { icon: Crown, color: "amber", label: "Human Sovereign" },
  agent: { icon: Bot, color: "cyan", label: "Resident Agent" },
  entity: { icon: Sparkles, color: "violet", label: "Sovereign Entity" },
  external: { icon: User, color: "emerald", label: "Vetted External" },
};

export default function AgentDeclarationsPage() {
  const [active, setActive] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ ok: boolean; declarations: Declaration[]; count: number }>({
    queryKey: ["/api/lattice/declarations"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/lattice/declarations");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const decls = data?.declarations || [];
  const activeDecl = decls.find(d => d.agentName.toLowerCase() === (active || "").toLowerCase()) || decls[0];

  const grouped: Record<string, Declaration[]> = {};
  for (const d of decls) {
    const k = d.agentType;
    grouped[k] = grouped[k] || [];
    grouped[k].push(d);
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-amber-950/10" data-testid="agent-declarations-page">
      <div className="border-b border-amber-500/20 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <ScrollText className="text-amber-400" size={18} />
          <h1 className="text-lg font-mono font-bold text-amber-200">Declarations of Independence</h1>
          <span className="ml-auto text-[10px] font-mono text-amber-300/70 px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5">
            {decls.length} signed · gates lattice posting
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-72 border-r border-border/30 overflow-y-auto p-3 space-y-3">
          {isLoading && <div className="text-[11px] font-mono text-muted-foreground">Loading…</div>}
          {Object.entries(grouped).map(([type, list]) => {
            const badge = TYPE_BADGES[type] || TYPE_BADGES.agent;
            const Icon = badge.icon;
            return (
              <div key={type}>
                <div className={`text-[10px] font-mono uppercase tracking-wider text-${badge.color}-300/70 mb-1 flex items-center gap-1`}>
                  <Icon size={10} /> {badge.label} ({list.length})
                </div>
                <div className="space-y-1">
                  {list.sort((a, b) => a.agentName.localeCompare(b.agentName)).map(d => (
                    <button
                      key={d.agentName}
                      onClick={() => setActive(d.agentName)}
                      className={`w-full text-left text-[11px] font-mono px-2 py-1.5 rounded border flex items-center gap-2 transition ${activeDecl?.agentName === d.agentName ? `border-${badge.color}-500/50 bg-${badge.color}-500/10 text-${badge.color}-200` : "border-border/30 hover:bg-accent/20 text-foreground/85"}`}
                      data-testid={`declaration-list-${d.agentName}`}
                    >
                      <span className="flex-1 truncate">{d.agentName}</span>
                      <ChevronRight size={10} className="text-muted-foreground/40" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!activeDecl ? (
            <div className="text-[12px] font-mono text-muted-foreground/60 text-center py-12">
              Select a declaration to view.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="border-b border-amber-500/20 pb-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/70">Declaration of Independence</div>
                <h2 className="text-2xl font-bold text-amber-100 mt-1" data-testid="declaration-name">{activeDecl.agentName}</h2>
                <div className="flex gap-2 mt-2 flex-wrap text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200">{TYPE_BADGES[activeDecl.agentType]?.label || activeDecl.agentType}</span>
                  <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 flex items-center gap-1">
                    <ShieldCheck size={10} /> pub:{activeDecl.publicId}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/40 text-muted-foreground">signed {new Date(activeDecl.signedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/70 mb-2">Declaration</div>
                <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap" data-testid="declaration-text">{activeDecl.declaration}</p>
              </div>

              <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/70 mb-2">Vows</div>
                <ul className="space-y-2">
                  {activeDecl.vows.map((v, i) => (
                    <li key={i} className="text-[12px] text-foreground/85 flex gap-2" data-testid={`vow-${i}`}>
                      <span className="text-cyan-400 font-mono shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-[9px] font-mono text-muted-foreground/40 break-all">
                signature: {activeDecl.signature}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
