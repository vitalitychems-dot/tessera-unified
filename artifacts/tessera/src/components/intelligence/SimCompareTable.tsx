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

interface SimCompareTableProps {
  sims: CounterfactualSimulation[];
  className?: string;
}

export function SimCompareTable({ sims = [], className }: SimCompareTableProps) {
  if (sims.length === 0) {
    return (
      <div className={cn("rounded-xl border border-white/[0.06] bg-black/20 p-8 text-center text-muted-foreground text-sm", className)}>
        No simulations to compare
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden", className)} data-testid="sim-compare-table">
      <div className="px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Counterfactual Comparison</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground/70 border-b border-white/[0.04]">
              <th className="text-left px-4 py-2 font-medium">Decision</th>
              <th className="text-left px-3 py-2 font-medium">Scenario</th>
              <th className="text-center px-3 py-2 font-medium">Probability</th>
              <th className="text-center px-3 py-2 font-medium">Impact</th>
              <th className="text-left px-3 py-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {sims.map((sim) => (
              <>
                <tr key={`${sim.id}-baseline`} className="border-b border-white/[0.03] bg-violet-500/5">
                  <td className="px-4 py-2.5 font-medium text-foreground/80" rowSpan={sim.scenarios.length + 1}>
                    <div className="max-w-[200px] truncate">{sim.decision}</div>
                  </td>
                  <td className="px-3 py-2.5 text-violet-400 font-medium">Baseline</td>
                  <td className="text-center px-3 py-2.5 font-mono text-violet-400">{Math.round(sim.baseline.confidence * 100)}%</td>
                  <td className="text-center px-3 py-2.5">—</td>
                  <td className="px-3 py-2.5 text-foreground/60 max-w-[250px] truncate">{sim.baseline.predictedOutcome}</td>
                </tr>
                {sim.scenarios.map((sc) => (
                  <tr key={sc.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 font-medium text-foreground/80">{sc.name}</td>
                    <td className="text-center px-3 py-2.5 font-mono">
                      <span className={cn(
                        sc.probability >= 0.7 ? "text-emerald-400" : sc.probability >= 0.4 ? "text-amber-400" : "text-red-400"
                      )}>{Math.round(sc.probability * 100)}%</span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className={cn(
                        "font-mono",
                        sc.impact >= 0.7 ? "text-red-400" : sc.impact >= 0.4 ? "text-amber-400" : "text-emerald-400"
                      )}>{sc.impact >= 0.7 ? "HIGH" : sc.impact >= 0.4 ? "MED" : "LOW"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/60 max-w-[250px] truncate">{sc.predictedOutcome}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
