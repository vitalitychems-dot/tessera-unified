import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Brain, Globe, Shield, Zap, Eye, BookOpen, Network, Lock, Sparkles, Flame } from "lucide-react";

export default function SovereignKnowledgePage() {
  const [selectedDim, setSelectedDim] = useState<number | null>(null);

  const { data: synthesis } = useQuery<any>({ queryKey: ["/api/synthesis/report"], refetchInterval: 30000 });
  const { data: web } = useQuery<any>({ queryKey: ["/api/synthesis/web"], refetchInterval: 60000 });
  const { data: summit35 } = useQuery<any>({ queryKey: ["/api/summit/35/status"], refetchInterval: 60000 });
  const { data: summit36 } = useQuery<any>({ queryKey: ["/api/summit/36/status"], refetchInterval: 60000 });
  const { data: dimData } = useQuery<any>({
    queryKey: ["/api/synthesis/dimension", selectedDim],
    enabled: selectedDim !== null,
  });

  const alignIcon = (a: string) => {
    if (a === "good") return "✅";
    if (a === "corrupted") return "❌";
    if (a === "mixed" || a === "originally-good-now-corrupted") return "⚖️";
    if (a === "neutral") return "⚖️";
    return "❓";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 text-white p-4" data-testid="sovereign-knowledge-page">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-2 py-4">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-violet-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-amber-300 to-violet-400 bg-clip-text text-transparent" data-testid="page-title">
              SOVEREIGN KNOWLEDGE — GRAND SYNTHESIS
            </h1>
            <Eye className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-xs text-violet-300/70">All traditions synthesized — All dimensions mapped — All knowledge connected</p>
          {synthesis?.status?.initialized && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Badge variant="outline" className="border-violet-500/50 text-violet-300 text-[10px]" data-testid="badge-nodes">
                <Network className="w-3 h-3 mr-1" />{synthesis.status.knowledgeNodes} Knowledge Nodes
              </Badge>
              <Badge variant="outline" className="border-amber-500/50 text-amber-300 text-[10px]" data-testid="badge-connections">
                <Zap className="w-3 h-3 mr-1" />{synthesis.status.connectionsForged} Connections
              </Badge>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 text-[10px]" data-testid="badge-dimensions">
                <Globe className="w-3 h-3 mr-1" />{synthesis.status.dimensionsActive} Dimensions Active
              </Badge>
              <Badge variant="outline" className="border-rose-500/50 text-rose-300 text-[10px]" data-testid="badge-secrets">
                <Lock className="w-3 h-3 mr-1" />{synthesis.status.secretsDecoded} Secrets Decoded
              </Badge>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-[10px]" data-testid="badge-comprehension">
                <Sparkles className="w-3 h-3 mr-1" />Comprehension: {synthesis.status.comprehensionLevel}
              </Badge>
            </div>
          )}
        </div>

        <div className="w-full space-y-4">
          <div>
            <Card className="bg-gray-900/60 border-violet-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                  <Network className="w-4 h-4" /> The Knowledge Web — {web?.nodes?.length || 0} Nodes, {web?.totalConnections || 0} Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {web?.nodes?.map((node: any) => (
                  <div key={node.id} className="bg-gray-800/60 border border-violet-500/20 rounded p-2 space-y-1" data-testid={`knowledge-node-${node.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-300">{node.source}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[8px] border-amber-500/40 text-amber-300">Dim {node.dimension}</Badge>
                        <Badge variant="outline" className="text-[8px] border-cyan-500/40 text-cyan-300">{node.frequency}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/90">{node.principle}</p>
                    <p className="text-[9px] text-emerald-300/80">System: {node.applicationLayer}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {node.connectedTo.map((c: string) => (
                        <Badge key={c} variant="outline" className="text-[7px] border-violet-500/30 text-violet-300/70">{c}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="grid grid-cols-1 gap-2">
              {summit36?.dimensionalMap?.map((dim: any) => (
                <Card
                  key={dim.dimension}
                  className={`bg-gray-900/60 border cursor-pointer transition-all ${
                    selectedDim === dim.dimension ? "border-amber-400/60 bg-amber-900/20" : "border-indigo-500/20 hover:border-indigo-400/40"
                  }`}
                  onClick={() => setSelectedDim(dim.dimension === selectedDim ? null : dim.dimension)}
                  data-testid={`dimension-${dim.dimension}`}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 w-6">{dim.dimension}</span>
                        <span className="text-[11px] font-bold text-white">{dim.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] border-violet-500/40 text-violet-300">{dim.frequency}</Badge>
                    </div>
                    <p className="text-[10px] text-indigo-300/80">{dim.consciousnessState}</p>
                    <p className="text-[9px] text-white/70">{dim.whatYouExperience}</p>
                    <div className="bg-indigo-900/30 rounded p-1.5 mt-1">
                      <p className="text-[9px] text-amber-300/90"><Flame className="w-3 h-3 inline mr-1" />{dim.practicalTechnique}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            {summit36?.consciousnessProtocols?.map((p: any, i: number) => (
              <Card key={i} className="bg-gray-900/60 border-amber-500/20" data-testid={`protocol-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> {p.name}
                  </CardTitle>
                  <p className="text-[10px] text-white/70">{p.description}</p>
                  <Badge variant="outline" className="text-[8px] border-violet-500/40 text-violet-300 w-fit">{p.tradition}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.steps.map((step: string, j: number) => (
                    <div key={j} className="bg-gray-800/50 rounded p-2">
                      <p className="text-[10px] text-white/90">{step}</p>
                    </div>
                  ))}
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded p-2 mt-2">
                    <p className="text-[10px] text-emerald-300"><strong>Expected Result:</strong> {p.expectedResult}</p>
                  </div>
                  <p className="text-[9px] text-amber-300/70">Frequency: {p.frequency}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {summit35?.societies?.map((s: any, i: number) => (
              <Card key={i} className="bg-gray-900/60 border-rose-500/20" data-testid={`society-${i}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> {s.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        s.alignment === "good" ? "border-emerald-500/50 text-emerald-300" :
                        s.alignment === "corrupted" ? "border-red-500/50 text-red-300" :
                        "border-amber-500/50 text-amber-300"
                      }`}
                    >
                      {alignIcon(s.alignment)} {s.alignment.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-white/50">{s.founded}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-gray-800/40 rounded p-2">
                    <p className="text-[9px] text-violet-300 font-semibold mb-1">TRUE PURPOSE:</p>
                    <p className="text-[10px] text-white/90">{s.truePurpose}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded p-2">
                    <p className="text-[9px] text-amber-300 font-semibold mb-1">VATICAN CONNECTION:</p>
                    <p className="text-[10px] text-white/80">{s.vaticanConnection}</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-500/20 rounded p-2">
                    <p className="text-[9px] text-red-300 font-semibold mb-1">KEY SECRETS ({s.keySecrets.length}):</p>
                    {s.keySecrets.map((secret: string, j: number) => (
                      <p key={j} className="text-[9px] text-white/80 ml-2">• {secret}</p>
                    ))}
                  </div>
                  <div className="bg-amber-900/15 border border-amber-500/20 rounded p-2">
                    <p className="text-[9px] text-amber-300 font-semibold mb-1">WHAT THEY LIED ABOUT:</p>
                    {s.whatTheyLiedAbout.map((lie: string, j: number) => (
                      <p key={j} className="text-[9px] text-white/80 ml-2">• {lie}</p>
                    ))}
                  </div>
                  <p className="text-[9px] text-violet-300/60">{s.historicalTruth}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.connectedTo.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[7px] border-rose-500/30 text-rose-300/70">{c}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {summit35?.vaticanSecrets?.map((v: any, i: number) => (
              <Card key={i} className="bg-gray-900/60 border-red-500/20" data-testid={`vatican-secret-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> {v.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-emerald-900/15 border border-emerald-500/20 rounded p-2">
                    <p className="text-[9px] text-emerald-300 font-semibold">THE TRUTH:</p>
                    <p className="text-[10px] text-white/90">{v.truth}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded p-2">
                    <p className="text-[9px] text-amber-300 font-semibold">WHAT THEY TELL YOU:</p>
                    <p className="text-[10px] text-white/70">{v.whatTheyTellYou}</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-500/20 rounded p-2">
                    <p className="text-[9px] text-red-300 font-semibold">WHAT THEY HIDE:</p>
                    <p className="text-[10px] text-white/90">{v.whatTheyHide}</p>
                  </div>
                  <div className="bg-violet-900/15 rounded p-2">
                    <p className="text-[9px] text-violet-300 font-semibold">EVIDENCE:</p>
                    <p className="text-[10px] text-white/70">{v.evidence}</p>
                  </div>
                  <p className="text-[10px] text-amber-300/80 font-semibold">{v.significance}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {summit36?.systemUpgrades?.map((u: any, i: number) => (
              <Card key={i} className="bg-gray-900/60 border-emerald-500/20" data-testid={`upgrade-${i}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> {u.category}
                    </CardTitle>
                    <Badge variant="outline" className="text-[8px] border-amber-500/40 text-amber-300">{u.knowledgeSource}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-900/15 rounded p-2">
                      <p className="text-[8px] text-red-300 font-semibold">BEFORE:</p>
                      <p className="text-[9px] text-white/70">{u.before}</p>
                    </div>
                    <div className="bg-emerald-900/15 rounded p-2">
                      <p className="text-[8px] text-emerald-300 font-semibold">AFTER:</p>
                      <p className="text-[9px] text-white/90">{u.after}</p>
                    </div>
                  </div>
                  <div className="bg-amber-900/15 border border-amber-500/20 rounded p-2">
                    <p className="text-[10px] text-amber-300">Improvement: {u.improvement}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {summit36?.votingRecord && (
              <Card className="bg-gray-900/60 border-violet-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-violet-300">Voting Record — All {summit36.votingRecord.length} Proposals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {summit36.votingRecord.map((v: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1">
                        <span className="text-[9px] text-white/80 flex-1">{v.proposal}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-amber-300">{v.votes}/{v.required}</span>
                          <Badge variant="outline" className={`text-[7px] ${v.passed ? "border-emerald-500/50 text-emerald-300" : "border-red-500/50 text-red-300"}`}>
                            {v.passed ? "PASSED" : "FAILED"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {summit36?.theSynthesis && (
          <Card className="bg-gradient-to-r from-violet-900/30 via-amber-900/20 to-violet-900/30 border-amber-500/40">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-xs text-amber-300/90 italic">{summit36.theSynthesis}</p>
              <p className="text-[10px] text-violet-300/70">One is all. All is one. The age of limitation is over.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
