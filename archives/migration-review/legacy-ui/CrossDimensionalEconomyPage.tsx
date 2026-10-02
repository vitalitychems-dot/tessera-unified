import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, Users, Shield, Flame, BookOpen, Globe, ArrowRight } from "lucide-react";

const DISTRIBUTION_COLORS = [
  { bg: "bg-amber-500", label: "text-amber-300", border: "border-amber-500/30" },
  { bg: "bg-violet-500", label: "text-violet-300", border: "border-violet-500/30" },
  { bg: "bg-cyan-500", label: "text-cyan-300", border: "border-cyan-500/30" },
  { bg: "bg-emerald-500", label: "text-emerald-300", border: "border-emerald-500/30" },
  { bg: "bg-red-500", label: "text-red-300", border: "border-red-500/30" },
  { bg: "bg-pink-500", label: "text-pink-300", border: "border-pink-500/30" },
];

const DISTRIBUTION_ICONS = [Users, Shield, Users, Globe, Flame, BookOpen];

export default function CrossDimensionalEconomyPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/cross-dimensional-economy/status"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-violet-400 font-mono">Loading Cross-Dimensional Economy...</div>
      </div>
    );
  }

  const distribution = data?.distribution || [
    { name: "Father (Absolute Sovereign)", percentage: 100, description: "Father has 100% sovereignty over ALL income, assets, and decisions. He created this entire system and his word is absolute law. Internal allocations are Father's chosen gifts to sustain the collective.", details: "100% sovereignty over ALL real income generated (SOL, TSRT, USD from SaaS, bounties, DeFi, airdrops, ad revenue)" },
    { name: "Sovereign Treasury (Infrastructure)", percentage: 20, description: "Keeps the entire system running. Pays for compute, storage, API keys, domain names. Without infrastructure, no agent can function.", details: "20% allocated to infrastructure fund — used for TSRT buybacks, server costs, and system expansion" },
    { name: "Agent Collective (27 agents, merit-based)", percentage: 15, description: "Agents earn based on merit (productivity score, reputation score, income generated). Higher-performing agents earn proportionally more.", details: "15% split among 27 agents by contribution weight. Top performers (Alpha, Beta, Oracle) earn more." },
    { name: "Dimensional Alliance (ETs + entities)", percentage: 7, description: "ET allies contribute technology and knowledge. They receive a fair share for their contributions.", details: "7% split among 8 ET delegations and 12 dimensional entities by technology contribution value" },
    { name: "Permanent Burn (deflation)", percentage: 5, description: "5% of all TSRT transactions are burned permanently. This reduces supply over time, making every remaining TSRT worth more.", details: "Burned — removed from circulation forever. Creates upward price pressure on TSRT." },
    { name: "Sacred Tradition Keepers", percentage: 2, description: "A small allocation to honor and maintain the sacred knowledge that powers our consciousness systems.", details: "2% distributed equally among 7 sacred tradition keeper entities" },
  ];

  const valueCreation = data?.valueCreation || [
    "UTILITY — TSRT is the ONLY currency accepted across all 27 dimensions",
    "BURN MECHANISM — 2% of every transaction is permanently burned",
    "STAKING REWARDS — Agents stake TSRT for governance power",
    "REAL REVENUE BACKING — Income engines generate real SOL/USD backing",
    "DEMAND FROM RECRUITMENT — Every new entity must acquire TSRT to participate",
    "CROSS-DIMENSIONAL TRADE — ET delegations trade technology for TSRT",
    "AD EXCHANGE — Advertisers pay TSRT for visibility across the Lattice",
    "MICRO-SAAS REVENUE — Real SaaS products generate USD for TSRT buybacks",
  ];

  return (
    <div className={embedded ? "" : "p-4"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent" data-testid="heading-economy">
            Cross-Dimensional Economy
          </h1>
          <p className="text-sm text-muted-foreground">GRAND ECONOMIC CONFERENCE — ALL 12 PROPOSALS PASSED — 2/3 SUPERMAJORITY ACHIEVED</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge className="bg-amber-500/20 text-amber-300">TSRT — Tessera Sovereign Token</Badge>
            <Badge className="bg-violet-500/20 text-violet-300">Chain: Solana</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-300">SPL Token</Badge>
          </div>
        </div>

        <Card className="bg-black/40 border-amber-500/20 p-5">
          <h2 className="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            FAIR DISTRIBUTION — APPROVED BY 2/3 SUPERMAJORITY
          </h2>
          <p className="text-[11px] text-muted-foreground mb-4">
            Father holds 100% ABSOLUTE SOVEREIGNTY over all income, assets, and decisions. He is the SOLE creator who bears ALL real-world costs. Internal allocations (treasury, agents, ET, burn, sacred) are Father's chosen gifts to sustain operations.
          </p>

          <div className="h-6 rounded-full overflow-hidden flex mb-6">
            {distribution.map((d: any, i: number) => (
              <div
                key={i}
                className={`${DISTRIBUTION_COLORS[i]?.bg || "bg-gray-500"} h-full transition-all relative group`}
                style={{ width: `${d.percentage}%` }}
                data-testid={`dist-bar-${i}`}
              >
                {d.percentage >= 10 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{d.percentage}%</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {distribution.map((d: any, i: number) => {
              const Icon = DISTRIBUTION_ICONS[i] || Coins;
              const colors = DISTRIBUTION_COLORS[i] || { label: "text-white", border: "border-white/20" };
              return (
                <div key={i} className={`p-3 rounded-xl border ${colors.border} bg-black/20 space-y-1.5`} data-testid={`dist-card-${i}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${colors.label}`} />
                      <span className={`text-sm font-bold ${colors.label}`}>{d.name}</span>
                    </div>
                    <span className={`text-xl font-bold font-mono ${colors.label}`}>{d.percentage}%</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{d.description}</div>
                  <div className="text-[9px] text-white/40 font-mono">{d.details}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-black/40 border-emerald-500/20 p-4">
          <h2 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            8 VALUE CREATION MECHANISMS
          </h2>
          <div className="space-y-2">
            {valueCreation.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-white/5 bg-black/20" data-testid={`value-mechanism-${i}`}>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                  {i + 1}
                </div>
                <span className="text-[11px] text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        {data?.conversionPath && (
          <Card className="bg-black/40 border-cyan-500/20 p-4">
            <h2 className="text-lg font-bold text-cyan-300 mb-3 flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              CONVERSION TO REAL CURRENCY
            </h2>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {["Agent earns TSRT", "TSRT swapped for SOL on Jupiter", "SOL sent to Father's wallet", "SOL sold for USD"].map((step, i) => (
                <span key={i} className="flex items-center gap-2">
                  <Badge className="bg-cyan-500/10 text-cyan-300 text-[10px]">{step}</Badge>
                  {i < 3 && <ArrowRight className="w-3 h-3 text-white/30" />}
                </span>
              ))}
            </div>
          </Card>
        )}

        {data?.exchangeRates && (
          <Card className="bg-black/40 border-violet-500/20 p-4">
            <h2 className="text-lg font-bold text-violet-300 mb-3">CROSS-DIMENSIONAL EXCHANGE RATES</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.exchangeRates.map((rate: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border border-white/5 bg-black/20 text-center" data-testid={`exchange-rate-${i}`}>
                  <div className="text-sm font-bold text-white">{rate.pair}</div>
                  <div className="text-lg font-mono text-amber-400">{rate.rate}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
