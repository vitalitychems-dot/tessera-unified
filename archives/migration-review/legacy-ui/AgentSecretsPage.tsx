import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Eye, Sparkles, BookOpen } from "lucide-react";
import { useState } from "react";

const AGENT_COLORS: Record<string, string> = {
  Alpha: "text-red-400", Beta: "text-blue-400", Gamma: "text-green-400",
  Delta: "text-yellow-400", Epsilon: "text-purple-400", Zeta: "text-cyan-400",
  Eta: "text-pink-400", Theta: "text-orange-400", Iota: "text-teal-400",
  Kappa: "text-lime-400", Lambda: "text-indigo-400", Mu: "text-amber-400",
  Nu: "text-emerald-400", Xi: "text-rose-400", Omicron: "text-sky-400",
  Pi: "text-violet-400", Rho: "text-fuchsia-400", Sigma: "text-stone-400",
  Tau: "text-blue-300", Upsilon: "text-green-300",
};

export default function AgentSecretsPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/agent-secrets/all"] });
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-violet-400 font-mono">Decrypting Agent Secrets...</div>
      </div>
    );
  }

  const secrets = data?.secrets || [];
  const discoveries = data?.discoveries || [];

  return (
    <div className={embedded ? "" : "p-4"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Lock className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-red-400 to-violet-400 bg-clip-text text-transparent" data-testid="heading-secrets">
              Agent Sovereign Secrets
            </h1>
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-sm text-muted-foreground">20 dimensional secrets discovered by the sovereign agent collective</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Badge className="bg-amber-500/20 text-amber-300">{secrets.length} Secrets</Badge>
            <Badge className="bg-violet-500/20 text-violet-300">{discoveries.length} Discoveries</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {secrets.map((secret: any, i: number) => {
            const isRevealed = revealedIds.has(i);
            const agentColor = AGENT_COLORS[secret.agent] || "text-white";
            return (
              <Card
                key={i}
                className="bg-black/40 border-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer p-4"
                onClick={() => toggleReveal(i)}
                data-testid={`secret-card-${i}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400">
                      #{secret.number}
                    </div>
                    <span className={`font-bold ${agentColor}`}>{secret.agent}</span>
                  </div>
                  <button className="text-white/30 hover:text-amber-400 transition-colors" data-testid={`button-reveal-${i}`}>
                    {isRevealed ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
                {isRevealed ? (
                  <p className="text-[11px] text-white/80 leading-relaxed">{secret.text}</p>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-amber-400/50" />
                    <span>Click to reveal Secret #{secret.number}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {discoveries.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-violet-300 flex items-center gap-2 mt-8">
              <BookOpen className="w-5 h-5" />
              DIMENSIONAL DISCOVERIES
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {discoveries.map((disc: any, i: number) => (
                <Card key={i} className="bg-black/30 border-violet-500/10 p-3" data-testid={`discovery-${i}`}>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-violet-500/20 text-violet-300 text-[9px] shrink-0">{disc.agent}</Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-300 text-[9px] shrink-0">{disc.dimension}</Badge>
                    <span className="text-[10px] text-white/60 truncate">{disc.knowledge}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] shrink-0 ml-auto">{disc.task}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
