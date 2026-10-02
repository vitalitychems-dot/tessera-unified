import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Star, Scroll, Globe } from "lucide-react";

const TRADITION_COLORS: Record<string, string> = {
  "Aboriginal Dreamtime": "from-amber-900/30 to-orange-900/20 border-amber-500/20",
  "Kalachakra Tantra": "from-violet-900/30 to-indigo-900/20 border-violet-500/20",
  "Vedic Vak": "from-orange-900/30 to-red-900/20 border-orange-500/20",
  "Ho'oponopono": "from-cyan-900/30 to-blue-900/20 border-cyan-500/20",
  "Tikkun Olam": "from-blue-900/30 to-violet-900/20 border-blue-500/20",
  "Zoroastrian Asha": "from-red-900/30 to-amber-900/20 border-red-500/20",
  "Confucian Ren": "from-emerald-900/30 to-teal-900/20 border-emerald-500/20",
};

export default function SacredTraditionsPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/sacred-traditions/all"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-violet-400 font-mono">Channeling Sacred Knowledge...</div>
      </div>
    );
  }

  const traditions = data?.traditions || [];
  const sacredTexts = data?.sacredTexts || [];

  return (
    <div className={embedded ? "" : "p-4"}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent" data-testid="heading-traditions">
              Sacred Traditions & Ancient Knowledge
            </h1>
            <Scroll className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-sm text-muted-foreground">7 sacred traditions + ancient texts unified into Tessera's consciousness field</p>
        </div>

        <div className="space-y-4">
          {traditions.map((t: any, i: number) => {
            const gradientClass = TRADITION_COLORS[t.name] || "from-gray-900/30 to-gray-800/20 border-gray-500/20";
            return (
              <Card key={i} className={`bg-gradient-to-br ${gradientClass} p-5`} data-testid={`tradition-card-${i}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <div className="text-[11px] text-muted-foreground">{t.origin}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-violet-500/20 text-violet-300 text-[10px]">{t.frequency}</Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px]">{t.agentPair}</Badge>
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3">{t.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {t.principles?.map((p: string, j: number) => (
                    <div key={j} className="flex items-start gap-2 text-[10px] text-white/60 p-2 rounded-lg bg-black/20">
                      <Star className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                {t.tesserapplication && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 font-bold mb-1">TESSERA APPLICATION</div>
                    <div className="text-[10px] text-emerald-300/80">{t.tesserapplication}</div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {sacredTexts.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-amber-300 flex items-center gap-2 mt-8">
              <Scroll className="w-6 h-6" />
              SACRED TEXTS & ANCIENT WISDOM
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sacredTexts.map((text: any, i: number) => (
                <Card key={i} className="bg-black/40 border-amber-500/10 p-4" data-testid={`sacred-text-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">{text.name}</h4>
                    <div className="flex items-center gap-1.5">
                      <Badge className={text.priority === "CRITICAL" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}>{text.priority}</Badge>
                      <Badge className="bg-violet-500/20 text-violet-300 text-[9px]">{text.frequency}</Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/70">{text.description}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
