import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Target, RefreshCw, DollarSign, ExternalLink, Lock, TrendingUp, AlertTriangle, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface ArbOpportunity {
  id: string;
  type: string;
  sport: string;
  game: string;
  profitPct: number;
  legs: {
    outcome: string;
    odds: number;
    decimalOdds: number;
    book: string;
    bookUrl: string;
    stakePercent: number;
  }[];
  totalImpliedProb: number;
  timestamp: number;
}

interface ArbResponse {
  arbs: ArbOpportunity[];
  lastUpdated: number;
  sportsScanned: string[];
  totalGamesScanned: number;
  apiCallsRemaining: number | null;
}

const BOOK_URLS: Record<string, string> = {
  "DraftKings": "https://sportsbook.draftkings.com",
  "FanDuel": "https://sportsbook.fanduel.com",
  "BetMGM": "https://sports.betmgm.com",
  "Caesars": "https://sportsbook.caesars.com",
  "Pinnacle": "https://www.pinnacle.com",
  "BetRivers": "https://www.betrivers.com",
  "PointsBet": "https://www.pointsbet.com",
  "Bovada": "https://www.bovada.lv",
  "Bet365": "https://www.bet365.com",
  "WynnBET": "https://www.wynnbet.com",
};

function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export default function SportsArbPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Sports Arbitrage | Tessera"; }, []);
  const [stake, setStake] = useState<string>("100");
  const [selectedArb, setSelectedArb] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<ArbResponse>({
    queryKey: ["/api/sports-arb"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const stakeNum = parseFloat(stake) || 100;
  const arbs = data?.arbs || [];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-black/95 text-white p-4 md:p-6`} data-testid="page-sports-arb">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" data-testid="text-page-title">ArbMax — Sports Arbitrage</h1>
              <p className="text-xs text-gray-500">Guaranteed profit via odds discrepancies across books</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30",
              isFetching && "opacity-50 cursor-not-allowed"
            )}
            data-testid="button-refresh-arbs"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            {isFetching ? "Scanning..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Opportunities Found</div>
            <div className="text-2xl font-bold text-amber-400" data-testid="text-arb-count">{arbs.length}</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Best Profit %</div>
            <div className="text-2xl font-bold text-green-400" data-testid="text-best-profit">
              {arbs.length > 0 ? `${arbs[0].profitPct.toFixed(2)}%` : "—"}
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Games Scanned</div>
            <div className="text-2xl font-bold text-cyan-400" data-testid="text-games-scanned">
              {data?.totalGamesScanned ?? "—"}
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Last Updated</div>
            <div className="text-sm font-medium text-gray-300" data-testid="text-last-updated">
              {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "—"}
            </div>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-400">Your Stake:</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">$</span>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="bg-black/50 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white font-mono text-lg w-40 focus:outline-none focus:border-amber-500/50"
                placeholder="100"
                min="1"
                data-testid="input-stake"
              />
            </div>
            {arbs.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Max guaranteed profit:</span>
                <span className="text-lg font-bold text-green-400" data-testid="text-max-profit">
                  ${(stakeNum * arbs[0].profitPct / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-gray-500">Scanning sportsbooks for arbitrage opportunities...</p>
          </div>
        ) : arbs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <p className="text-gray-400 text-center max-w-md">
              No arbitrage opportunities found right now. The scanner checks all major sports every 60 seconds.
              Arbs are rare and time-sensitive — they appear when sportsbooks have different odds.
            </p>
            <p className="text-xs text-gray-600">
              {data?.apiCallsRemaining !== null && data?.apiCallsRemaining !== undefined
                ? `API calls remaining: ${data.apiCallsRemaining}`
                : "Configure THE_ODDS_API_KEY in settings for live data"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {arbs.map((arb, idx) => {
              const isSelected = selectedArb === arb.id;
              const guaranteedProfit = stakeNum * arb.profitPct / 100;

              return (
                <div
                  key={arb.id}
                  className={cn(
                    "bg-gray-900/80 border rounded-xl overflow-hidden transition-all cursor-pointer",
                    isSelected ? "border-amber-500/60" : "border-gray-800 hover:border-gray-700"
                  )}
                  onClick={() => setSelectedArb(isSelected ? null : arb.id)}
                  data-testid={`card-arb-${idx}`}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                        idx === 0 ? "bg-amber-500/30 text-amber-300" : "bg-gray-800 text-gray-400"
                      )}>
                        {idx === 0 ? <Trophy className="w-4 h-4" /> : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm" data-testid={`text-arb-game-${idx}`}>{arb.game}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{arb.sport}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-400">{arb.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400" data-testid={`text-arb-profit-${idx}`}>
                        +{arb.profitPct.toFixed(2)}%
                      </div>
                      <div className="text-xs text-green-400/70">
                        ${guaranteedProfit.toFixed(2)} guaranteed
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="border-t border-gray-800 p-4 bg-black/30">
                      <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Optimal Stake Split</div>
                      <div className="space-y-3">
                        {arb.legs.map((leg, legIdx) => {
                          const legStake = stakeNum * leg.stakePercent / 100;
                          const bookUrl = BOOK_URLS[leg.book] || leg.bookUrl || "#";
                          return (
                            <div key={legIdx} className="flex items-center justify-between bg-gray-900/60 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                                  {legIdx + 1}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">{leg.outcome}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatOdds(leg.odds)} ({leg.decimalOdds.toFixed(3)})
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-bold text-amber-400">${legStake.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">{leg.stakePercent.toFixed(1)}%</div>
                                </div>
                                <a
                                  href={bookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-all"
                                  data-testid={`link-book-${idx}-${legIdx}`}
                                >
                                  {leg.book}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>Total implied probability: {(arb.totalImpliedProb * 100).toFixed(2)}%</span>
                        <span>Edge: {((1 - arb.totalImpliedProb) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-gray-300">How It Works</span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Arbitrage betting exploits odds discrepancies between sportsbooks to guarantee profit regardless of outcome.</p>
            <p>When the combined implied probability across all outcomes drops below 100%, the difference is your guaranteed profit.</p>
            <p>Enter your stake, pick the top opportunity, split your bets exactly as shown across the listed sportsbooks.</p>
            <p>Opportunities are time-sensitive — odds change fast. Execute quickly when you see an arb.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
