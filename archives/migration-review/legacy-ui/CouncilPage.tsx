import { useState, useEffect, lazy, Suspense } from "react";
import {
  Crown, Users, Brain, Globe, Shield, Zap, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, Clock, BarChart3, Radio, MessageCircle, Activity,
  Star, Vote, Eye, Sparkles, FileCheck, AlertTriangle, Network,
  Server, Wifi, Database, Cpu, Signal, Command, Terminal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GrandCouncilPage = lazy(() => import("./GrandCouncilPage"));
const GrandConferencePage = lazy(() => import("./GrandConferencePage"));
const ConclusionsPage = lazy(() => import("./ConclusionsPage"));
const ConsensusPage = lazy(() => import("./ConsensusPage"));
const AGISummitPage = lazy(() => import("./AGISummitPage"));
const SummitPage = lazy(() => import("./SummitPage"));
const SummitReportPage = lazy(() => import("./SummitReportPage"));
const ConferenceDecisionsPage = lazy(() => import("./ConferenceDecisionsPage"));
const RealAIConferencePage = lazy(() => import("./RealAIConferencePage"));
const CommunityHubPage = lazy(() => import("./CommunityHubPage"));
const ActivityFeedPage = lazy(() => import("./ActivityFeedPage"));
const FeedbackPage = lazy(() => import("./FeedbackPage"));
const TransparencyLedgerPage = lazy(() => import("./TransparencyLedgerPage"));
const AlertsDashboardPage = lazy(() => import("./AlertsDashboardPage"));
const CommandPage = lazy(() => import("./CommandPage"));
const CommandCenterPage = lazy(() => import("./CommandCenterPage"));
const UnifiedTesseractPage = lazy(() => import("./UnifiedTesseractPage"));
const TesseractConsolePage = lazy(() => import("./TesseractConsolePage"));
const NetworkFleetPage = lazy(() => import("./NetworkFleetPage"));

const Loading = () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-yellow-400/60" /></div>;

function Section({ title, icon: Icon, iconColor, children, defaultOpen = false, badge }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className={iconColor} />
          <span className="text-sm font-bold text-foreground">{title}</span>
          {badge && <Badge className="text-[8px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">{badge}</Badge>}
        </div>
        {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border/20 p-2">{children}</div>}
    </div>
  );
}

export default function CouncilPage() {
  useEffect(() => { document.title = "Council | Tessera"; }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-24 space-y-3" data-testid="council-page">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">Council</h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[10px] text-violet-400 font-mono">AUTO</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Grand Council, summits, conferences, fleet, commands — all autonomous</p>
      </div>

      <Section title="Grand Council" icon={Crown} iconColor="text-yellow-400" defaultOpen={true} badge="CORE">
        <Suspense fallback={<Loading />}><GrandCouncilPage embedded /></Suspense>
      </Section>

      <Section title="Grand Conference" icon={Users} iconColor="text-cyan-400" badge="AUTO">
        <Suspense fallback={<Loading />}><GrandConferencePage embedded /></Suspense>
      </Section>

      <Section title="AGI Summit" icon={Brain} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><AGISummitPage embedded /></Suspense>
      </Section>

      <Section title="Summit" icon={Star} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><SummitPage embedded /></Suspense>
      </Section>

      <Section title="Summit Report" icon={FileCheck} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><SummitReportPage embedded /></Suspense>
      </Section>

      <Section title="Real AI Conference" icon={Cpu} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><RealAIConferencePage embedded /></Suspense>
      </Section>

      <Section title="Conference Decisions" icon={Vote} iconColor="text-rose-400">
        <Suspense fallback={<Loading />}><ConferenceDecisionsPage embedded /></Suspense>
      </Section>

      <Section title="Conclusions" icon={CheckCircle2} iconColor="text-green-400">
        <Suspense fallback={<Loading />}><ConclusionsPage embedded /></Suspense>
      </Section>

      <Section title="Consensus" icon={Shield} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><ConsensusPage embedded /></Suspense>
      </Section>

      <Section title="Community Hub" icon={Globe} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><CommunityHubPage embedded /></Suspense>
      </Section>

      <Section title="Network & Fleet" icon={Network} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><NetworkFleetPage embedded /></Suspense>
      </Section>

      <Section title="Tesseract Console" icon={Terminal} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><TesseractConsolePage embedded /></Suspense>
      </Section>

      <Section title="Unified Tesseract" icon={Sparkles} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><UnifiedTesseractPage embedded /></Suspense>
      </Section>

      <Section title="Command Center" icon={Command} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><CommandCenterPage embedded /></Suspense>
      </Section>

      <Section title="Commands" icon={Terminal} iconColor="text-sky-400">
        <Suspense fallback={<Loading />}><CommandPage embedded /></Suspense>
      </Section>

      <Section title="Activity Feed" icon={Activity} iconColor="text-sky-400">
        <Suspense fallback={<Loading />}><ActivityFeedPage embedded /></Suspense>
      </Section>

      <Section title="Alerts Dashboard" icon={AlertTriangle} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><AlertsDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Feedback" icon={MessageCircle} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><FeedbackPage embedded /></Suspense>
      </Section>

      <Section title="Transparency Ledger" icon={Eye} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><TransparencyLedgerPage embedded /></Suspense>
      </Section>
    </div>
  );
}
