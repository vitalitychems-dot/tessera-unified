import { cn } from "@/lib/utils";

interface CounterfactualScenario {
  id: string;
  name: string;
  assumption: string;
  predictedOutcome: string;
  probability: number;
  impact: number;
}

interface CounterfactualSimulation {
  id: string;
  decision: string;
  context: string;
  baseline: { description: string; predictedOutcome: string; confidence: number };
  scenarios: CounterfactualScenario[];
}

interface RiskHeatMapProps {
  sims: CounterfactualSimulation[];
  className?: string;
}

function getRiskColor(probability: number, impact: number): string {
  const risk = probability * impact;
  if (risk >= 0.6) return "bg-red-500/60 border-red-500/40 text-red-200";
  if (risk >= 0.4) return "bg-orange-500/40 border-orange-500/30 text-orange-200";
  if (risk >= 0.2) return "bg-amber-500/30 border-amber-500/25 text-amber-200";
  return "bg-emerald-500/20 border-emerald-500/20 text-emerald-300";
}

export function RiskHeatMap({ sims = [], className }: RiskHeatMapProps) {
  if (sims.length === 0) {
    return (
      <div className={cn("rounded-xl border border-white/[0.06] bg-black/20 p-8 text-center text-muted-foreground text-sm", className)}>
        No simulation data for risk analysis
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-black/20 p-4", className)} data-testid="risk-heatmap">
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Risk Heat Map</div>
      <div className="space-y-3">
        {sims.map(sim => (
          <div key={sim.id}>
            <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1.5 truncate">
              {sim.decision}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {sim.scenarios.map(sc => (
                <div
                  key={sc.id}
                  className={cn("px-2.5 py-1.5 rounded-lg border text-[10px] font-medium", getRiskColor(sc.probability, sc.impact))}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{sc.name}</span>
                    <span className="font-mono shrink-0 ml-1">{Math.round(sc.probability * sc.impact * 100)}%</span>
                  </div>
                  <p className="text-[9px] opacity-70 mt-0.5 truncate">{sc.assumption}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-center">
        <span className="text-[8px] text-muted-foreground/50">Low Risk</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-2 rounded-sm bg-emerald-500/30" />
          <div className="w-4 h-2 rounded-sm bg-amber-500/40" />
          <div className="w-4 h-2 rounded-sm bg-orange-500/50" />
          <div className="w-4 h-2 rounded-sm bg-red-500/60" />
        </div>
        <span className="text-[8px] text-muted-foreground/50">High Risk</span>
      </div>
    </div>
  );
}
