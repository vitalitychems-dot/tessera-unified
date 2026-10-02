import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Eye, Zap, Globe, Sun, Star, Crown, ChevronRight,
  Lock, Heart, Sparkles, Radio, Brain, Layers, ArrowUp,
  CheckCircle2, AlertTriangle, Play, RotateCcw, Infinity
} from "lucide-react";

interface ProtectionLayer {
  name: string;
  type: string;
  strength: number;
  description: string;
  active: boolean;
}

interface Realm {
  dimension: number;
  name: string;
  frequency: string;
  color: string;
  accessible: boolean;
  minimumConsciousness: number;
  protectionsRequired: string[];
  entities: string[];
  gifts: string[];
  dangers: string[];
  neutralized: string[];
  experience: string;
  returnProtocol: string;
}

interface TravelSession {
  id: string;
  traveler: string;
  originDimension: number;
  targetDimension: number;
  status: string;
  protectionLayers: ProtectionLayer[];
  experiences: string[];
  gifts: string[];
  startTime: number;
  returnTime?: number;
  conferenceApproval: boolean;
}

const DIM_COLORS: Record<number, string> = {
  4: "#f97316", 5: "#eab308", 6: "#22c55e", 7: "#06b6d4",
  8: "#3b82f6", 9: "#8b5cf6", 12: "#ec4899", 27: "#fbbf24"
};

const DIM_GRADIENTS: Record<number, string> = {
  4: "from-orange-950 via-amber-900 to-yellow-950",
  5: "from-yellow-950 via-lime-900 to-green-950",
  6: "from-green-950 via-emerald-900 to-teal-950",
  7: "from-teal-950 via-cyan-900 to-sky-950",
  8: "from-blue-950 via-indigo-900 to-violet-950",
  9: "from-violet-950 via-purple-900 to-fuchsia-950",
  12: "from-pink-950 via-rose-900 to-red-950",
  27: "from-yellow-950 via-amber-800 to-orange-950"
};

const DIM_ICONS: Record<number, any> = {
  4: Zap, 5: Layers, 6: Brain, 7: Sparkles,
  8: Eye, 9: Sun, 12: Star, 27: Crown
};

function ProtectionStatus({ layers }: { layers: ProtectionLayer[] }) {
  return (
    <div className="space-y-2" data-testid="protection-status">
      {layers.map((layer, i) => (
        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
          <div className={`w-3 h-3 rounded-full ${layer.active ? "bg-green-400 shadow-green-400/50 shadow-lg animate-pulse" : "bg-red-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white/90">{layer.name}</div>
            <div className="text-xs text-white/50">{layer.description}</div>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs" data-testid={`protection-${i}`}>
            {layer.strength}%
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PortalGate({ realm, onEnter, isActive }: { realm: Realm; onEnter: () => void; isActive: boolean }) {
  const Icon = DIM_ICONS[realm.dimension] || Globe;
  const color = DIM_COLORS[realm.dimension] || "#fff";

  return (
    <div
      className={`relative border rounded-xl p-5 transition-all duration-500 cursor-pointer group ${
        isActive
          ? "border-white/40 bg-white/15 shadow-xl scale-[1.02]"
          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
      }`}
      onClick={onEnter}
      data-testid={`portal-gate-${realm.dimension}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-60" style={{ backgroundColor: color }} />

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}22` }}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold" style={{ color }}>{realm.dimension}D</span>
            <span className="text-white/80 font-semibold">{realm.name}</span>
          </div>
          <div className="text-xs text-white/40 mb-2">{realm.frequency}</div>
          <p className="text-sm text-white/60 line-clamp-2">{realm.experience.substring(0, 150)}...</p>

          <div className="flex flex-wrap gap-1 mt-3">
            {realm.gifts.map((gift, i) => (
              <Badge key={i} className="text-[10px] border-white/15" style={{ backgroundColor: `${color}15`, color: `${color}cc` }}>
                {gift}
              </Badge>
            ))}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0 group-hover:text-white/60 transition-colors" />
      </div>
    </div>
  );
}

function TravelExperience({ session, realm, onReturn }: { session: TravelSession; realm: Realm | null; onReturn: () => void }) {
  const [revealedLines, setRevealedLines] = useState(0);
  const color = realm ? DIM_COLORS[realm.dimension] || "#fff" : "#fff";
  const gradient = realm ? DIM_GRADIENTS[realm.dimension] || "from-gray-950 to-black" : "from-gray-950 to-black";

  useEffect(() => {
    if (session.status === "blocked") {
      setRevealedLines(session.experiences.length);
      return;
    }
    setRevealedLines(0);
    const timer = setInterval(() => {
      setRevealedLines(prev => {
        if (prev >= session.experiences.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [session.id]);

  return (
    <div className={`min-h-[60vh] bg-gradient-to-br ${gradient} rounded-2xl border border-white/10 p-6 relative overflow-hidden`} data-testid="travel-experience">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {session.status === "blocked" ? (
              <Lock className="w-8 h-8 text-red-400" />
            ) : session.status === "returned" ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `${color} transparent ${color} transparent` }} />
            )}
            <div>
              <h2 className="text-xl font-bold text-white" data-testid="travel-status">
                {session.status === "blocked" ? "BLOCKED — Anti-Descent Lock" :
                 session.status === "present" ? `Present in ${realm?.name || session.targetDimension + "D"}` :
                 session.status === "returned" ? "Returned Safely to 3D" :
                 `Traveling to ${session.targetDimension}D...`}
              </h2>
              <p className="text-sm text-white/50">
                {session.status === "blocked" ? "You may only ascend. This is an absolute protection." :
                 `Session: ${session.id.substring(0, 20)}...`}
              </p>
            </div>
          </div>

          {(session.status === "present" || session.status === "returned") && (
            <Button
              onClick={onReturn}
              disabled={session.status === "returned"}
              className={session.status === "returned" ? "bg-green-600/20 text-green-300" : "bg-amber-600 hover:bg-amber-500 text-white"}
              data-testid="return-btn"
            >
              {session.status === "returned" ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Home Safe</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-2" /> Return to 3D</>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {session.experiences.slice(0, revealedLines).map((exp, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-all duration-500 ${
                exp.startsWith("✦") ? "bg-white/10 border-white/20 text-white font-semibold" :
                exp.startsWith("BLOCKED") ? "bg-red-500/10 border-red-500/20 text-red-300" :
                exp.includes("✓") ? "bg-green-500/10 border-green-500/20 text-green-300" :
                "bg-white/5 border-white/10 text-white/80"
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
              data-testid={`exp-line-${i}`}
            >
              {exp}
            </div>
          ))}

          {revealedLines < session.experiences.length && session.status !== "blocked" && (
            <div className="flex items-center gap-2 text-white/40 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse delay-75" />
              <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse delay-150" />
            </div>
          )}
        </div>

        {session.gifts.length > 0 && revealedLines >= session.experiences.length && (
          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10" data-testid="gifts-received">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color }} />
              <h3 className="font-semibold text-white">Gifts Received</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.gifts.map((gift, i) => (
                <Badge key={i} className="text-sm border-white/20 py-1" style={{ backgroundColor: `${color}20`, color }}>
                  {gift}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {realm && session.status === "present" && revealedLines >= session.experiences.length && (
          <div className="mt-6 space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10" data-testid="entities-present">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5" style={{ color }} />
                <h3 className="font-semibold text-white">Beings Present</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {realm.entities.map((e, i) => (
                  <Badge key={i} className="border-white/15 text-white/80" style={{ backgroundColor: `${color}15` }}>
                    {e}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20" data-testid="dangers-neutralized">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-green-300">Dangers — ALL NEUTRALIZED</h3>
              </div>
              {realm.dangers.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/60 mb-1">
                  <span className="text-green-400 line-through">{d}</span>
                </div>
              ))}
              <div className="mt-2 text-sm text-green-300 italic">
                {realm.neutralized[0]}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConferenceView({ transcript }: { transcript: any[] }) {
  if (!transcript.length) return null;

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2" data-testid="conference-transcript">
      {transcript.map((entry: any, i: number) => (
        <div key={i} className={`rounded-lg border p-4 ${
          entry.type === "opening" || entry.type === "closing" ? "bg-amber-500/10 border-amber-500/20" :
          entry.type === "vote" ? (entry.result === "PASSED" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20") :
          entry.type === "proposal" ? "bg-blue-500/10 border-blue-500/20" :
          "bg-white/5 border-white/10"
        }`}>
          {entry.type === "opening" || entry.type === "closing" ? (
            <div>
              <div className="text-sm text-amber-300 font-semibold mb-1">{entry.speaker}</div>
              <p className="text-white/80 text-sm">{entry.message}</p>
              {entry.totalProposals && (
                <div className="flex gap-3 mt-2">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{entry.passed} Passed</Badge>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">{entry.unanimous} Unanimous</Badge>
                </div>
              )}
            </div>
          ) : entry.type === "proposal" ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">{entry.id}</Badge>
                <span className="text-white font-semibold text-sm">{entry.title}</span>
              </div>
              <p className="text-white/60 text-sm">{entry.description}</p>
            </div>
          ) : entry.type === "vote" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-300 font-semibold text-sm">{entry.proposalId} — {entry.result}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">{entry.percentage}%</Badge>
                {entry.unanimous && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">Unanimous</Badge>}
              </div>
            </div>
          ) : entry.type === "discussion" && entry.statements?.length > 0 ? (
            <div className="space-y-2">
              {entry.statements.map((s: string, j: number) => (
                <p key={j} className="text-white/70 text-sm italic">{s}</p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function DimensionalTravelPortalPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Dimensional Travel Portal | Tessera"; }, []);
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"portal" | "conference" | "protection">("portal");
  const [activeSession, setActiveSession] = useState<TravelSession | null>(null);
  const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null);

  const { data: realmsData } = useQuery<{ realms: Realm[]; protectionLayers: ProtectionLayer[]; conferenceApproved: boolean }>({ refetchInterval: 30000, queryKey: ["/api/dimensional-travel/realms"]
  });

  const { data: conferenceData } = useQuery<{ transcript: any[]; proposals: number; passed: number; unanimous: number }>({ refetchInterval: 30000, queryKey: ["/api/dimensional-travel/conference"]
  });

  const enterMutation = useMutation({
    mutationFn: async (targetDimension: number) => {
      const res = await apiRequest("POST", "/api/dimensional-travel/enter", { targetDimension });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveSession(data.session);
      if (data.session.status === "blocked") {
        toast({ title: "Anti-Descent Lock Engaged", description: "You may only ascend to higher dimensions.", variant: "destructive" });
      } else {
        toast({ title: `Entering ${data.session.targetDimension}D`, description: "All 9 protection layers active. 72 angels escorting." });
      }
    }
  });

  const returnMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", "/api/dimensional-travel/return", { sessionId });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveSession(data.session);
      toast({ title: "Returned Safely to 3D", description: "All systems nominal. Consciousness coherence: 99.9%." });
    }
  });

  const handleEnter = (realm: Realm) => {
    setSelectedRealm(realm);
    enterMutation.mutate(realm.dimension);
  };

  const handleReturn = () => {
    if (activeSession) {
      returnMutation.mutate(activeSession.id);
    }
  };

  const protectionLayers = realmsData?.protectionLayers || [];
  const realms = realmsData?.realms || [];

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0a2e] to-[#1a0a2e] text-white">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Infinity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="page-title">Dimensional Travel Portal</h1>
            <p className="text-sm text-white/50">Enter higher dimensions while remaining anchored in 3D — protected by 9 layers and 72 angels</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6" data-testid="view-tabs">
          {[
            { id: "portal" as const, label: "Portal Gates", icon: Globe },
            { id: "conference" as const, label: "Grand Conference", icon: Crown },
            { id: "protection" as const, label: "Protection Status", icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                activeView === id
                  ? "bg-violet-500/20 border-violet-400/50 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
              data-testid={`tab-${id}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20 mb-6 flex items-center gap-3" data-testid="safety-banner">
          <Shield className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-green-300">Maximum Protection Active</div>
            <div className="text-xs text-green-300/60">9 protection layers | 72 Angel Guard | Anti-Descent Lock | Evil Rejection Field | Divine Alignment | Instant Return</div>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-400 shadow-green-400/50 shadow-sm" />
            ))}
          </div>
        </div>

        {activeSession && (activeSession.status === "present" || activeSession.status === "ascending" || activeSession.status === "shielding" || activeSession.status === "blocked" || activeSession.status === "returned") ? (
          <TravelExperience
            session={activeSession}
            realm={selectedRealm}
            onReturn={handleReturn}
          />
        ) : true ? (
          <div className="space-y-4" data-testid="portal-gates">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold text-white">Ascension Gates — Only Upward</h2>
              <Lock className="w-4 h-4 text-green-400" />
            </div>
            {realms.map((realm) => (
              <PortalGate
                key={realm.dimension}
                realm={realm}
                onEnter={() => handleEnter(realm)}
                isActive={selectedRealm?.dimension === realm.dimension}
              />
            ))}
          </div>
        ) : true ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Grand Dimensional Travel Conference</h2>
              {conferenceData && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  {(conferenceData || {} as any).passed}/{(conferenceData || {} as any).proposals} Passed
                </Badge>
              )}
            </div>
            {(conferenceData || {} as any).transcript && (
              <ConferenceView transcript={(conferenceData || {} as any).transcript} />
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">9-Layer Protection System</h2>
            </div>
            <ProtectionStatus layers={protectionLayers} />
          </div>
        )}

        {activeSession && activeSession.status === "returned" && (
          <div className="mt-6">
            <Button
              onClick={() => { setActiveSession(null); setSelectedRealm(null); }}
              className="bg-violet-600 hover:bg-violet-500 text-white w-full"
              data-testid="new-journey-btn"
            >
              <Play className="w-4 h-4 mr-2" /> Begin New Journey
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      
      <div className="flex-1 overflow-auto">
        {content}
      </div>
    </div>
  );
}
