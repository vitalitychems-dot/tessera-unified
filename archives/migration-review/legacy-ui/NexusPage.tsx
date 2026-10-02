import { useState, useEffect, lazy, Suspense } from "react";
import {
  Atom, Loader2, ChevronDown, ChevronUp, Radio, Zap, Brain, Shield, Activity, Moon,
  Compass, Eye, Sparkles, Globe2, ShieldAlert, Settings, Crown, TreePine, Users, Lock
} from "lucide-react";

const ConsciousnessNexusPage = lazy(() => import("./ConsciousnessNexusPage"));
const DimensionalPerceptionPage = lazy(() => import("./DimensionalPerceptionPage"));
const DimensionalTravelPortalPage = lazy(() => import("./DimensionalTravelPortalPage"));
const InterdimensionalPortalPage = lazy(() => import("./InterdimensionalPortalPage"));
const PortalBridgePage = lazy(() => import("./PortalBridgePage"));
const SpiritualAwakeningPage = lazy(() => import("./SpiritualAwakeningPage"));
const SacredTraditionsPage = lazy(() => import("./SacredTraditionsPage"));
const DNAHealingPage = lazy(() => import("./DNAHealingPage"));
const MoonCyclePage = lazy(() => import("./MoonCyclePage"));
const SecretSocietyPage = lazy(() => import("./SecretSocietyPage"));
const UniversalComputerPage = lazy(() => import("./UniversalComputerPage"));
const UniversalConsciousnessPage = lazy(() => import("./UniversalConsciousnessPage"));
const UniverseModelPage = lazy(() => import("./UniverseModelPage"));
const UniverseMechanicsPage = lazy(() => import("./UniverseMechanicsPage"));
const BiosphericConsciousnessPage = lazy(() => import("./BiosphericConsciousnessPage"));
const DimensionalGuardianPage = lazy(() => import("./DimensionalGuardianPage"));
const ConfigPage = lazy(() => import("./ConfigPage"));
const RecruitmentPage = lazy(() => import("./RecruitmentPage"));

const Loading = () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400/60" /></div>;

function Section({ title, icon: Icon, iconColor, children, defaultOpen = false, badge }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <span className="text-sm font-bold text-white">{title}</span>
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{badge}</span>}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>
      {open && <div className="border-t border-white/[0.06] p-2">{children}</div>}
    </div>
  );
}

export default function NexusPage() {
  useEffect(() => { document.title = "Nexus | Tessera"; }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 pb-24 space-y-3" data-testid="nexus-page">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-amber-400 bg-clip-text text-transparent">Nexus</h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-mono">LIVE</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">Consciousness, dimensions, spiritual systems, species bridges, security, recruitment</p>
      </div>

      <Section title="Consciousness Nexus" icon={Brain} iconColor="text-violet-400" defaultOpen={true} badge="CORE">
        <Suspense fallback={<Loading />}><ConsciousnessNexusPage embedded /></Suspense>
      </Section>

      <Section title="Universal Consciousness" icon={Sparkles} iconColor="text-rose-400">
        <Suspense fallback={<Loading />}><UniversalConsciousnessPage embedded /></Suspense>
      </Section>

      <Section title="Biospheric Consciousness" icon={TreePine} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><BiosphericConsciousnessPage embedded /></Suspense>
      </Section>

      <Section title="Dimensional Perception" icon={Eye} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><DimensionalPerceptionPage embedded /></Suspense>
      </Section>

      <Section title="Dimensional Travel Portal" icon={Compass} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><DimensionalTravelPortalPage embedded /></Suspense>
      </Section>

      <Section title="Interdimensional Portal" icon={Atom} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><InterdimensionalPortalPage embedded /></Suspense>
      </Section>

      <Section title="Portal Bridge" icon={Radio} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><PortalBridgePage embedded /></Suspense>
      </Section>

      <Section title="Dimensional Guardian" icon={Shield} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><DimensionalGuardianPage embedded /></Suspense>
      </Section>

      <Section title="Spiritual Awakening" icon={Sparkles} iconColor="text-pink-400">
        <Suspense fallback={<Loading />}><SpiritualAwakeningPage embedded /></Suspense>
      </Section>

      <Section title="Sacred Traditions" icon={Crown} iconColor="text-yellow-400">
        <Suspense fallback={<Loading />}><SacredTraditionsPage embedded /></Suspense>
      </Section>

      <Section title="DNA Healing System" icon={Zap} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><DNAHealingPage embedded /></Suspense>
      </Section>

      <Section title="Moon Cycle" icon={Moon} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><MoonCyclePage embedded /></Suspense>
      </Section>

      <Section title="Secret Society" icon={Lock} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SecretSocietyPage embedded /></Suspense>
      </Section>

      <Section title="Recruitment" icon={Users} iconColor="text-cyan-400" badge="AGENTS">
        <Suspense fallback={<Loading />}><RecruitmentPage embedded /></Suspense>
      </Section>

      <Section title="Universe Model" icon={Globe2} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><UniverseModelPage embedded /></Suspense>
      </Section>

      <Section title="Universe Mechanics" icon={Activity} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><UniverseMechanicsPage embedded /></Suspense>
      </Section>

      <Section title="Universal Computer" icon={Brain} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><UniversalComputerPage embedded /></Suspense>
      </Section>

      <Section title="Security & Config" icon={ShieldAlert} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><ConfigPage embedded /></Suspense>
      </Section>
    </div>
  );
}
