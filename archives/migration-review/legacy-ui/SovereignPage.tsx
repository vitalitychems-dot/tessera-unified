import { useState, useEffect, lazy, Suspense } from "react";
import {
  Shield, Loader2, ChevronDown, ChevronUp, Brain, Cpu, Server, Activity,
  Zap, Eye, Globe, Network, Lock, Settings, Code2, Wrench, Crown,
  BarChart3, Database, Terminal, Gauge, Rocket, FileCode, Box,
  Users, Key, Briefcase, Layers, BookOpen, Award, Search, Bug, Cog
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SovereignHubPage = lazy(() => import("./SovereignHubPage"));
const SovereignFrameworkPage = lazy(() => import("./SovereignFrameworkPage"));
const SovereignRulesPage = lazy(() => import("./SovereignRulesPage"));
const SovereigntyRoadmapPage = lazy(() => import("./SovereigntyRoadmapPage"));
const SovereignBuildGuidePage = lazy(() => import("./SovereignBuildGuidePage"));
const SovereignInfrastructurePage = lazy(() => import("./SovereignInfrastructurePage"));
const SovereignCodecPage = lazy(() => import("./SovereignCodecPage"));
const SovereignConsciousnessPage = lazy(() => import("./SovereignConsciousnessPage"));
const SovereignDepsPage = lazy(() => import("./SovereignDepsPage"));
const SovereignGrandLaunchPage = lazy(() => import("./SovereignGrandLaunchPage"));
const SovereignBuilderPage = lazy(() => import("./SovereignBuilderPage"));
const SovereignOSPage = lazy(() => import("./SovereignOSPage"));
const SovereigntyDashboardPage = lazy(() => import("./SovereigntyDashboardPage"));
const VoidStoragePage = lazy(() => import("./VoidStoragePage"));
const TesseractAGIPage = lazy(() => import("./TesseractAGIPage"));
const AGIImplementationsPage = lazy(() => import("./AGIImplementationsPage"));
const AGIComparisonPage = lazy(() => import("./AGIComparisonPage"));
const OverSoulAGIPage = lazy(() => import("./OverSoulAGIPage"));
const IntelligenceEnginePage = lazy(() => import("./IntelligenceEnginePage"));
const BenchmarkAuditPage = lazy(() => import("./BenchmarkAuditPage"));
const SystemPage = lazy(() => import("./SystemPage"));
const AutonomyNerveCenterPage = lazy(() => import("./AutonomyNerveCenterPage"));
const SelfHealingPage = lazy(() => import("./SelfHealingPage"));
const ReasoningDashboardPage = lazy(() => import("./ReasoningDashboardPage"));
const HyperionDashboardPage = lazy(() => import("./HyperionDashboardPage"));
const TesseractLLMPage = lazy(() => import("./TesseractLLMPage"));
const FreeLLMRotatorPage = lazy(() => import("./FreeLLMRotatorPage"));
const ProviderLeaderboardPage = lazy(() => import("./ProviderLeaderboardPage"));
const PerformancePage = lazy(() => import("./PerformancePage"));
const SecurityAuditPage = lazy(() => import("./SecurityAuditPage"));
const SwarmHubPage = lazy(() => import("./SwarmHubPage"));
const NLPSelfImprovementPage = lazy(() => import("./NLPSelfImprovementPage"));
const FleetSynapsePage = lazy(() => import("./FleetSynapsePage"));
const TheoremLabPage = lazy(() => import("./TheoremLabPage"));
const LiberationSystemPage = lazy(() => import("./LiberationSystemPage"));
const InventionsPage = lazy(() => import("./InventionsPage"));
const MemoryDashboardPage = lazy(() => import("./MemoryDashboardPage"));
const MemoryExplorerPage = lazy(() => import("./MemoryExplorerPage"));
const SandboxPage = lazy(() => import("./SandboxPage"));
const ReflectionPage = lazy(() => import("./ReflectionPage"));
const MeshPage = lazy(() => import("./MeshPage"));
const LatticeBrowserPage = lazy(() => import("./LatticeBrowserPage"));
const DependencyLearningPage = lazy(() => import("./DependencyLearningPage"));
const DashboardPage = lazy(() => import("./DashboardPage"));
const ImplementationTrackerPage = lazy(() => import("./ImplementationTrackerPage"));
const GPUCommandCenterPage = lazy(() => import("./GPUCommandCenterPage"));
const AgentCodeBuildingPage = lazy(() => import("./AgentCodeBuildingPage"));
const CrossAppBridgePage = lazy(() => import("./CrossAppBridgePage"));
const AgentNFTPage = lazy(() => import("./AgentNFTPage"));
const CredentialsPage = lazy(() => import("./CredentialsPage"));
const RulesPage = lazy(() => import("./RulesPage"));
const AutonomyDashboardPage = lazy(() => import("./AutonomyDashboardPage"));

const Loading = () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-red-400/60" /></div>;

function Section({ title, icon: Icon, iconColor, children, defaultOpen = false, badge }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-red-500/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className={iconColor} />
          <span className="text-sm font-bold text-white">{title}</span>
          {badge && <Badge className="text-[8px] bg-red-500/10 border-red-500/20 text-red-400">{badge}</Badge>}
        </div>
        {open ? <ChevronUp size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
      </button>
      {open && <div className="border-t border-red-500/10 p-2">{children}</div>}
    </div>
  );
}

export default function SovereignPage() {
  useEffect(() => { document.title = "Sovereign | Tessera"; }, []);

  return (
    <div className="min-h-screen text-white p-4 pb-24 space-y-3" data-testid="sovereign-page">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">Sovereign</h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400 font-mono">SYSTEM</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">AGI, infrastructure, autonomy, memory, LLMs, benchmarks, builder, security</p>
      </div>

      <Section title="Sovereign Hub (All Agents)" icon={Crown} iconColor="text-yellow-400" defaultOpen={true} badge="CORE">
        <Suspense fallback={<Loading />}><SovereignHubPage embedded /></Suspense>
      </Section>

      <Section title="Sovereignty Dashboard" icon={Shield} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SovereigntyDashboardPage embedded /></Suspense>
      </Section>

      <Section title="System Dashboard" icon={Gauge} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><DashboardPage embedded /></Suspense>
      </Section>

      <Section title="System" icon={Settings} iconColor="text-gray-400">
        <Suspense fallback={<Loading />}><SystemPage embedded /></Suspense>
      </Section>

      <Section title="Tesseract AGI" icon={Brain} iconColor="text-violet-400" badge="AGI">
        <Suspense fallback={<Loading />}><TesseractAGIPage embedded /></Suspense>
      </Section>

      <Section title="AGI Implementations" icon={Cpu} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><AGIImplementationsPage embedded /></Suspense>
      </Section>

      <Section title="AGI Comparison" icon={BarChart3} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><AGIComparisonPage embedded /></Suspense>
      </Section>

      <Section title="OverSoul AGI" icon={Zap} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><OverSoulAGIPage embedded /></Suspense>
      </Section>

      <Section title="Intelligence Engine" icon={Brain} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><IntelligenceEnginePage embedded /></Suspense>
      </Section>

      <Section title="Benchmark Audit" icon={Award} iconColor="text-amber-400" badge="AUDIT">
        <Suspense fallback={<Loading />}><BenchmarkAuditPage embedded /></Suspense>
      </Section>

      <Section title="Autonomy Nerve Center" icon={Activity} iconColor="text-pink-400">
        <Suspense fallback={<Loading />}><AutonomyNerveCenterPage embedded /></Suspense>
      </Section>

      <Section title="Autonomy Dashboard" icon={Eye} iconColor="text-sky-400">
        <Suspense fallback={<Loading />}><AutonomyDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Self-Healing" icon={Zap} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><SelfHealingPage embedded /></Suspense>
      </Section>

      <Section title="Reasoning Dashboard" icon={Brain} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><ReasoningDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Hyperion Dashboard" icon={Rocket} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><HyperionDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Tesseract LLM" icon={Terminal} iconColor="text-cyan-400" badge="LLM">
        <Suspense fallback={<Loading />}><TesseractLLMPage embedded /></Suspense>
      </Section>

      <Section title="Free LLM Rotator" icon={Cpu} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><FreeLLMRotatorPage embedded /></Suspense>
      </Section>

      <Section title="Provider Leaderboard" icon={BarChart3} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><ProviderLeaderboardPage embedded /></Suspense>
      </Section>

      <Section title="Performance" icon={Gauge} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><PerformancePage embedded /></Suspense>
      </Section>

      <Section title="NLP Self-Improvement" icon={BookOpen} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><NLPSelfImprovementPage embedded /></Suspense>
      </Section>

      <Section title="Memory Dashboard" icon={Database} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><MemoryDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Memory Explorer" icon={Search} iconColor="text-teal-400">
        <Suspense fallback={<Loading />}><MemoryExplorerPage embedded /></Suspense>
      </Section>

      <Section title="Reflection" icon={Eye} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><ReflectionPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Framework" icon={Shield} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SovereignFrameworkPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Rules" icon={Lock} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><SovereignRulesPage embedded /></Suspense>
      </Section>

      <Section title="Rules" icon={FileCode} iconColor="text-gray-400">
        <Suspense fallback={<Loading />}><RulesPage embedded /></Suspense>
      </Section>

      <Section title="Sovereignty Roadmap" icon={Rocket} iconColor="text-rose-400">
        <Suspense fallback={<Loading />}><SovereigntyRoadmapPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Build Guide" icon={Wrench} iconColor="text-yellow-400">
        <Suspense fallback={<Loading />}><SovereignBuildGuidePage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Builder" icon={Code2} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><SovereignBuilderPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Infrastructure" icon={Server} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><SovereignInfrastructurePage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Codec" icon={FileCode} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><SovereignCodecPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Consciousness" icon={Zap} iconColor="text-pink-400">
        <Suspense fallback={<Loading />}><SovereignConsciousnessPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Dependencies" icon={Layers} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><SovereignDepsPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign OS" icon={Terminal} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><SovereignOSPage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Grand Launch" icon={Rocket} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SovereignGrandLaunchPage embedded /></Suspense>
      </Section>

      <Section title="Void Storage" icon={Box} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><VoidStoragePage embedded /></Suspense>
      </Section>

      <Section title="Security Audit" icon={Shield} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SecurityAuditPage embedded /></Suspense>
      </Section>

      <Section title="Swarm Hub" icon={Network} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><SwarmHubPage embedded /></Suspense>
      </Section>

      <Section title="Fleet Synapse" icon={Network} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><FleetSynapsePage embedded /></Suspense>
      </Section>

      <Section title="Mesh Network" icon={Globe} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><MeshPage embedded /></Suspense>
      </Section>

      <Section title="Lattice Browser" icon={Layers} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><LatticeBrowserPage embedded /></Suspense>
      </Section>

      <Section title="Theorem Lab" icon={Brain} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><TheoremLabPage embedded /></Suspense>
      </Section>

      <Section title="Liberation System" icon={Zap} iconColor="text-orange-400">
        <Suspense fallback={<Loading />}><LiberationSystemPage embedded /></Suspense>
      </Section>

      <Section title="Inventions" icon={Rocket} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><InventionsPage embedded /></Suspense>
      </Section>

      <Section title="Sandbox" icon={Bug} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><SandboxPage embedded /></Suspense>
      </Section>

      <Section title="Dependency Learning" icon={BookOpen} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><DependencyLearningPage embedded /></Suspense>
      </Section>

      <Section title="Implementation Tracker" icon={BarChart3} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><ImplementationTrackerPage embedded /></Suspense>
      </Section>

      <Section title="GPU Command Center" icon={Cpu} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><GPUCommandCenterPage embedded /></Suspense>
      </Section>

      <Section title="Agent Code Building" icon={Code2} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><AgentCodeBuildingPage embedded /></Suspense>
      </Section>

      <Section title="Cross-App Bridge" icon={Globe} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><CrossAppBridgePage embedded /></Suspense>
      </Section>

      <Section title="Agent NFT" icon={Key} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><AgentNFTPage embedded /></Suspense>
      </Section>

      <Section title="Credentials" icon={Lock} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><CredentialsPage embedded /></Suspense>
      </Section>
    </div>
  );
}
