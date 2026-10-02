import { useState, useEffect, lazy, Suspense } from "react";
import {
  Brain, Lock, Sparkles, Lightbulb, Activity, BookOpen, Eye, AlertTriangle,
  TrendingUp, Database, Loader2, ChevronDown, ChevronUp, Search, Shield, Zap,
  Globe, ScrollText, Code2, FileText, Bookmark, Archive
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const OmniscientKnowledgePage = lazy(() => import("./OmniscientKnowledgePage"));
const UniversalKnowledgePage = lazy(() => import("./UniversalKnowledgePage"));
const SovereignKnowledgePage = lazy(() => import("./SovereignKnowledgePage"));
const KnowledgePipelinePage = lazy(() => import("./KnowledgePipelinePage"));
const KnowledgeSynthesisPage = lazy(() => import("./KnowledgeSynthesisPage"));
const KnowledgeDashboardPage = lazy(() => import("./KnowledgeDashboardPage"));
const KnowledgeBasePage = lazy(() => import("./KnowledgeBasePage"));
const AgentSecretsPage = lazy(() => import("./AgentSecretsPage"));
const KnowledgeSecretsPage = lazy(() => import("./KnowledgeSecretsPage"));
const SecretKnowledgePage = lazy(() => import("./SecretKnowledgePage"));
const LiveSecretKnowledgePage = lazy(() => import("./LiveSecretKnowledgePage"));
const SovereignSecretsPage = lazy(() => import("./SovereignSecretsPage"));
const VaticanArchivesPage = lazy(() => import("./VaticanArchivesPage"));
const DiscoveriesPage = lazy(() => import("./DiscoveriesPage"));
const ColonelLanguagePage = lazy(() => import("./ColonelLanguagePage"));
const CheatCodesPage = lazy(() => import("./CheatCodesPage"));
const DataSourcesPage = lazy(() => import("./DataSourcesPage"));
const UnifiedKnowledgePage = lazy(() => import("./UnifiedKnowledgePage"));
const GrandKnowledgeConferencePage = lazy(() => import("./GrandKnowledgeConferencePage"));

const Loading = () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400/60" /></div>;

function Section({ title, icon: Icon, iconColor, children, defaultOpen = false, badge }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-violet-500/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className={iconColor} />
          <span className="text-sm font-bold text-slate-200">{title}</span>
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{badge}</span>}
        </div>
        {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>
      {open && <div className="border-t border-violet-500/10 p-2">{children}</div>}
    </div>
  );
}

export default function KnowledgePage() {
  useEffect(() => { document.title = "Knowledge | Tessera"; }, []);

  return (
    <div className="min-h-screen text-white p-4 pb-24 space-y-3" data-testid="knowledge-page">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Knowledge</h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            <span className="text-[10px] text-emerald-300 font-mono">LEARNING</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">Omniscient feeds, synthesis, secrets, discoveries, archives, languages</p>
      </div>

      <Section title="Omniscient Knowledge (Live)" icon={Activity} iconColor="text-emerald-400" defaultOpen={true} badge="LIVE">
        <Suspense fallback={<Loading />}><OmniscientKnowledgePage embedded initialTab="live" /></Suspense>
      </Section>

      <Section title="Universal Knowledge" icon={Brain} iconColor="text-cyan-400">
        <Suspense fallback={<Loading />}><UniversalKnowledgePage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Knowledge" icon={Shield} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SovereignKnowledgePage embedded /></Suspense>
      </Section>

      <Section title="Unified Knowledge" icon={Globe} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><UnifiedKnowledgePage embedded /></Suspense>
      </Section>

      <Section title="Knowledge Pipeline" icon={TrendingUp} iconColor="text-blue-400">
        <Suspense fallback={<Loading />}><KnowledgePipelinePage embedded /></Suspense>
      </Section>

      <Section title="Knowledge Synthesis" icon={Sparkles} iconColor="text-purple-400">
        <Suspense fallback={<Loading />}><KnowledgeSynthesisPage embedded /></Suspense>
      </Section>

      <Section title="Knowledge Dashboard" icon={Database} iconColor="text-violet-400">
        <Suspense fallback={<Loading />}><KnowledgeDashboardPage embedded /></Suspense>
      </Section>

      <Section title="Knowledge Base" icon={BookOpen} iconColor="text-teal-400">
        <Suspense fallback={<Loading />}><KnowledgeBasePage embedded /></Suspense>
      </Section>

      <Section title="Data Sources" icon={Database} iconColor="text-indigo-400">
        <Suspense fallback={<Loading />}><DataSourcesPage embedded /></Suspense>
      </Section>

      <Section title="Agent Secrets" icon={Lock} iconColor="text-rose-400">
        <Suspense fallback={<Loading />}><AgentSecretsPage embedded /></Suspense>
      </Section>

      <Section title="Knowledge Secrets" icon={Eye} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><KnowledgeSecretsPage embedded /></Suspense>
      </Section>

      <Section title="Secret Knowledge Archive" icon={Lock} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SecretKnowledgePage embedded /></Suspense>
      </Section>

      <Section title="Live Secret Knowledge" icon={Activity} iconColor="text-pink-400">
        <Suspense fallback={<Loading />}><LiveSecretKnowledgePage embedded /></Suspense>
      </Section>

      <Section title="Sovereign Secrets" icon={Shield} iconColor="text-red-400">
        <Suspense fallback={<Loading />}><SovereignSecretsPage embedded /></Suspense>
      </Section>

      <Section title="Vatican Archives" icon={Archive} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><VaticanArchivesPage embedded /></Suspense>
      </Section>

      <Section title="Discoveries" icon={Lightbulb} iconColor="text-yellow-400">
        <Suspense fallback={<Loading />}><DiscoveriesPage embedded /></Suspense>
      </Section>

      <Section title="Colonel Language" icon={Code2} iconColor="text-emerald-400">
        <Suspense fallback={<Loading />}><ColonelLanguagePage embedded /></Suspense>
      </Section>

      <Section title="Cheat Codes" icon={Zap} iconColor="text-amber-400">
        <Suspense fallback={<Loading />}><CheatCodesPage embedded /></Suspense>
      </Section>

      <Section title="Grand Knowledge Conference" icon={ScrollText} iconColor="text-yellow-400">
        <Suspense fallback={<Loading />}><GrandKnowledgeConferencePage embedded /></Suspense>
      </Section>
    </div>
  );
}
