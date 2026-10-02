import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Sparkles, Calendar, Zap, Shield, Heart } from "lucide-react";

const PHASE_EMOJIS: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

const PHASE_COLORS: Record<string, string> = {
  "New Moon": "text-gray-400",
  "Waxing Crescent": "text-blue-300",
  "First Quarter": "text-cyan-300",
  "Waxing Gibbous": "text-violet-300",
  "Full Moon": "text-yellow-300",
  "Waning Gibbous": "text-amber-300",
  "Last Quarter": "text-orange-300",
  "Waning Crescent": "text-rose-300",
};

const ALIGNMENT_ICONS: Record<string, any> = {
  incomeEngines: Zap,
  healingProtocols: Heart,
  consciousnessWork: Sparkles,
  recruitment: Sun,
  protection: Shield,
};

export default function MoonCyclePage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/moon-cycle/current"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-violet-400 font-mono">Calculating Lunar Position...</div>
      </div>
    );
  }

  if (!data) return (
    <div className="p-4 text-center text-muted-foreground">
      <Moon className="w-12 h-12 mx-auto mb-3 text-violet-400/30" />
      <p className="text-sm">Moon cycle data unavailable. Retrying...</p>
    </div>
  );

  const phaseEmoji = PHASE_EMOJIS[data.currentPhase] || "🌑";
  const phaseColor = PHASE_COLORS[data.currentPhase] || "text-white";

  return (
    <div className={embedded ? "" : "p-4"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent" data-testid="heading-moon-cycle">
            Moon Cycle Alignment Engine
          </h1>
          <p className="text-sm text-muted-foreground">All operations synchronized with lunar phases for maximum manifestation power</p>

          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="text-center">
              <div className={`text-6xl mb-2`}>{phaseEmoji}</div>
              <div className={`text-xl font-bold ${phaseColor}`} data-testid="stat-phase">{data.currentPhase}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Phase</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 font-mono" data-testid="stat-illumination">{data.illumination}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Illumination</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 font-mono" data-testid="stat-lunar-age">{data.lunarAge}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Lunar Age (Days)</div>
            </div>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-violet-950/30 to-amber-950/20 border-violet-500/20 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Moon className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Pink Moon — {data.pinkMoon?.date}</h2>
          </div>
          <div className="text-sm text-white/80 mb-2">Peak: {data.pinkMoon?.peakTime} — Illumination: {data.pinkMoon?.illumination}</div>
          {data.pinkMoon?.hoursUntil > 0 && (
            <div className="text-sm text-cyan-400 font-mono mb-3" data-testid="stat-hours-until">{data.pinkMoon.hoursUntil} hours until peak</div>
          )}
          <p className="text-[11px] text-muted-foreground mb-4">{data.pinkMoon?.significance}</p>
          <div className="space-y-2">
            <div className="text-sm font-bold text-violet-300">WHAT TO DO DURING PINK MOON</div>
            {data.pinkMoon?.whatToDo?.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-white/70" data-testid={`pink-moon-todo-${i}`}>
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-black/40 border-cyan-500/20 p-4">
          <h2 className="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            LUNAR OPERATIONS GUIDE
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.lunarOperations && Object.entries(data.lunarOperations).map(([phase, desc]: [string, any], i: number) => {
              const phaseLabel = phase.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
              const emoji = PHASE_EMOJIS[phaseLabel] || "🌑";
              const isCurrentPhase = phaseLabel.toLowerCase().replace(/\s+/g, "") === data.currentPhase?.toLowerCase().replace(/\s+/g, "");
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    isCurrentPhase ? "border-amber-400/40 bg-amber-500/10" : "border-white/5 bg-black/20"
                  }`}
                  data-testid={`phase-guide-${i}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{emoji}</span>
                    <span className={`text-sm font-bold ${isCurrentPhase ? "text-amber-300" : "text-white/80"}`}>{phaseLabel}</span>
                    {isCurrentPhase && <Badge className="bg-amber-500/20 text-amber-300 text-[8px]">CURRENT PHASE</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-black/40 border-emerald-500/20 p-4">
          <h2 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            CURRENT ALIGNMENT STATUS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.currentAlignment && Object.entries(data.currentAlignment).map(([key, val]: [string, any], i: number) => {
              const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
              const Icon = ALIGNMENT_ICONS[key] || Sparkles;
              const isAmplified = typeof val === "string" && val.includes("AMPLIFIED");
              const isMax = typeof val === "string" && val.includes("MAXIMUM");
              return (
                <div key={i} className="p-3 rounded-xl border border-white/10 bg-black/20 text-center" data-testid={`alignment-${key}`}>
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${isAmplified ? "text-yellow-400" : isMax ? "text-red-400" : "text-cyan-400"}`} />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
                  <Badge className={
                    isAmplified ? "bg-yellow-500/20 text-yellow-300" :
                    isMax ? "bg-red-500/20 text-red-300" :
                    "bg-emerald-500/20 text-emerald-300"
                  }>
                    {val}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
