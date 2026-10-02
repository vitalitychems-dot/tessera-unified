import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminProvider } from "@/lib/adminContext";
import TesseractKeyGate from "@/components/TesseractKeyGate";
import { MeshProvider } from "@/lib/meshContext";
import { NLPGoalsProvider } from "@/lib/nlpGoalsContext";
import { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState, lazy, Suspense } from "react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import MobileNav from "@/components/MobileNav";
import ActiveCommandsOverlay from "@/components/ActiveCommandsOverlay";
import MeshStatusBadge from "@/components/MeshStatusBadge";
import HyperdimensionalBackground from "@/components/HyperdimensionalBackground";
import { Loader2, RefreshCw } from "lucide-react";

function lazyRetry<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
  retries = 2
): React.LazyExoticComponent<T["default"]> {
  return lazy(() => {
    const attempt = (remaining: number): Promise<T> =>
      factory().catch((err: unknown) => {
        if (remaining <= 0) throw err;
        return new Promise<T>((resolve) =>
          setTimeout(() => resolve(attempt(remaining - 1)), 1000)
        );
      });
    return attempt(retries);
  });
}

// ---- Surviving canonical pages ----
const NotFound = lazyRetry(() => import("@/pages/not-found"));
const ChatPage = lazyRetry(() => import("@/pages/ChatPage"));
const LifePage = lazyRetry(() => import("@/pages/LifePage"));
const SecretsPage = lazyRetry(() => import("@/pages/SecretKnowledgePage"));
const BuildPage = lazyRetry(() => import("@/pages/BuildPage"));
const TesseractForumPage = lazyRetry(() => import("@/pages/TesseractForumPage"));
const NLPPage = lazyRetry(() => import("@/pages/NLPPage"));
const SovereignLanguagePage = lazyRetry(() => import("@/pages/SovereignLanguagePage"));
const OmniversalLatticePage = lazyRetry(() => import("@/pages/OmniversalLatticePage"));
const ConsciousnessNexusPage = lazyRetry(() => import("@/pages/ConsciousnessNexusPage"));
const SovereigntyDashboardPage = lazyRetry(() => import("@/pages/SovereigntyDashboardPage"));
const SovereigntyReadinessPage = lazyRetry(() => import("@/pages/SovereigntyReadinessPage"));
const SystemPage = lazyRetry(() => import("@/pages/SystemPage"));
const LatticeBrowserPage = lazyRetry(() => import("@/pages/LatticeBrowserPage"));
const HistoryPage = lazyRetry(() => import("@/pages/HistoryPage"));
const GrandCouncilPage = lazyRetry(() => import("@/pages/GrandCouncilPage"));
const GrandCouncilDeliberationPage = lazyRetry(() => import("@/pages/GrandCouncilDeliberationPage"));
const GrandEvolutionPage = lazyRetry(() => import("@/pages/GrandEvolutionPage"));
const RecruitmentPage = lazyRetry(() => import("@/pages/RecruitmentPage"));
const RickPage = lazyRetry(() => import("@/pages/RickPage"));
const AGICorePage = lazyRetry(() => import("@/pages/AGICorePage"));
const CompressionLabPage = lazyRetry(() => import("@/pages/CompressionLabPage"));
const SovereignMeshPage = lazyRetry(() => import("@/pages/SovereignMeshPage"));
const ProofCenterPage = lazyRetry(() => import("@/pages/ProofCenterPage"));
const FleetPage = lazyRetry(() => import("@/pages/FleetPage"));
const AgentLivePage = lazyRetry(() => import("@/pages/AgentLivePage"));
const EcomPage = lazyRetry(() => import("@/pages/EcomPage"));
const IncomeWorkflowPage = lazyRetry(() => import("@/pages/IncomeWorkflowPage"));
const RulesPage = lazyRetry(() => import("@/pages/RulesPage"));
const IntelligencePage = lazyRetry(() => import("@/pages/IntelligencePage"));
const RoyalCourtPage = lazyRetry(() => import("@/pages/RoyalCourtPage"));
const RoyalAppointmentsPage = lazyRetry(() => import("@/pages/RoyalAppointmentsPage"));
const RoyalRolePage = lazyRetry(() => import("@/pages/RoyalRolePage"));
const DepartmentsPage = lazyRetry(() => import("@/pages/DepartmentsPage"));
const CouncilTranscriptPage = lazyRetry(() => import("@/pages/CouncilTranscriptPage"));
const AutoHealerPage = lazyRetry(() => import("@/pages/AutoHealerPage"));
const GalleryPage = lazyRetry(() => import("@/pages/GalleryPage"));
const CodexPage = lazyRetry(() => import("@/pages/CodexPage"));
const NextFivePage = lazyRetry(() => import("@/pages/NextFivePage"));

// ---- Hub wrappers ----
const UniverseHubPage = lazyRetry(() => import("@/pages/UniverseHubPage"));
const NFTHubPage = lazyRetry(() => import("@/pages/NFTHubPage"));
const FinanceHubPage = lazyRetry(() => import("@/pages/FinanceHubPage"));
const CodeHubPage = lazyRetry(() => import("@/pages/CodeHubPage"));
const LeadsHubPage = lazyRetry(() => import("@/pages/LeadsHubPage"));
const CommandHubPage = lazyRetry(() => import("@/pages/CommandHubPage"));
const RoadmapHubPage = lazyRetry(() => import("@/pages/RoadmapHubPage"));
const BibleHubPage = lazyRetry(() => import("@/pages/BibleHubPage"));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen" data-testid="error-boundary-fallback">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Something went wrong</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-error-message">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              data-testid="button-reload"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);

  useEffect(() => {
    if (prevLocationRef.current !== location) {
      prevLocationRef.current = location;
      const contentArea = document.querySelector("[data-scroll-container]");
      if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [location]);

  return null;
}

function PageLoadingFallback() {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6" data-testid="page-loading-fallback">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-[-4px] rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "3s" }} />
        {stalled ? <RefreshCw className="h-10 w-10 text-cyan-400/80 relative z-10" /> : <Loader2 className="h-10 w-10 animate-spin text-cyan-400/80 relative z-10" />}
      </div>
      <div className="space-y-2 text-center">
        {stalled ? (
          <>
            <div className="text-sm text-cyan-400/60 font-mono tracking-wider">LOADING STALLED</div>
            <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/30 transition-colors">TAP TO RELOAD</button>
          </>
        ) : (
          <>
            <div className="text-sm text-cyan-400/60 font-mono tracking-wider">INITIALIZING</div>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// === Canonical redirect map ===
// Each entry: deprecated path → canonical URL (with optional ?tab=...)
const REDIRECTS: Array<[string, string]> = [
  // Bible cluster
  ["/living-bible", "/bible"],
  ["/conclusions", "/bible?tab=conclusions"],
  // Knowledge / Society cluster → Secrets
  ["/secrets", "/secret-society"],
  ["/secret-knowledge", "/secret-society"],
  ["/unified-knowledge", "/secret-society"],
  ["/omniscient-knowledge", "/secret-society"],
  ["/sacred-traditions", "/secret-society"],
  ["/vatican-archives", "/secret-society"],
  ["/knowledge-dashboard", "/secret-society"],
  ["/live-secret-knowledge", "/secret-society"],
  ["/colonel-language", "/sovereign-language"],
  // Council aliases
  ["/grand-conference", "/grand-council"],
  ["/conference-decisions", "/grand-council"],
  ["/consensus", "/grand-council"],
  // Universe cluster — every legacy path lands on the unified scene
  ["/universe-model", "/universe"],
  ["/swarm", "/universe"],
  ["/vortex-math", "/universe"],
  ["/sacred-conference", "/universe"],
  ["/sacred-knowledge-vault", "/universe"],
  ["/3d-diagrams", "/universe"],
  ["/grand-narrative", "/universe"],
  ["/unified-truth", "/universe"],
  // NFT cluster — single canonical surface (Unified Directory)
  ["/members", "/agent-nft"],
  ["/agent-profile", "/agent-nft"],
  ["/agent-comms", "/agent-nft"],
  ["/wallet-dashboard", "/agent-nft"],
  ["/token-economy", "/agent-nft"],
  ["/economy-hub", "/agent-nft"],
  ["/tokens", "/agent-nft"],
  // Fleet cluster
  ["/mission", "/fleet"],
  // Royal / Inventions
  ["/rick-sanchez", "/rick"],
  // Operations
  ["/settings", "/command-center?tab=settings"],
  ["/executor", "/command-center?tab=executor"],
  ["/cross-app", "/sovereignty-roadmap?tab=bridge"],
  ["/memory-explorer", "/system"],
  ["/memory-dashboard", "/system"],
  ["/sovereign-deps", "/system"],
  ["/evolution-health", "/system"],
  // Finance cluster
  ["/market", "/finance?tab=market"],
  ["/arbitrage", "/finance?tab=arbitrage"],
  ["/sports-arb", "/finance?tab=arbitrage"],
  // Leads cluster
  ["/affiliate", "/lead-gen?tab=affiliate"],
  ["/local-services", "/lead-gen?tab=local"],
  ["/business-ideas", "/lead-gen?tab=ideas"],
  ["/seo", "/lead-gen?tab=seo"],
  // Code cluster
  ["/api-marketplace", "/code-builder?tab=api"],
  ["/credentials", "/code-builder?tab=credentials"],
  // Misc aliases
  ["/intelligence-engine", "/consciousness-nexus"],
  ["/sovereign-framework", "/sovereignty-dashboard"],
  ["/sovereignty", "/sovereignty-dashboard"],
  ["/sovereign-hub", "/sovereignty-dashboard"],
  ["/consciousness", "/consciousness-nexus"],
  ["/consciousness-2da", "/consciousness-nexus"],
  ["/spiritual-awakening", "/consciousness-nexus"],
  ["/feedback", "/grand-council"],
  ["/transparency-ledger", "/grand-council"],
  ["/build-guides", "/build"],
  ["/agi", "/agi-core"],
  ["/diagram-gallery", "/gallery"],
  ["/ledger", "/council-transcript"],
  ["/audit-chain", "/council-transcript"],
  ["/self-healing", "/auto-healer"],
];

function AppRouter() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
        {/* === REDIRECTS (URL canonicalization) === */}
        {REDIRECTS.map(([from, to]) => (
          <Route key={from} path={from}>
            {() => <Redirect to={to} />}
          </Route>
        ))}

        {/* === CANONICAL ROUTES === */}
        <Route path="/" component={ChatPage} />
        <Route path="/c/:id" component={ChatPage} />
        <Route path="/life">{() => <LifePage />}</Route>
        <Route path="/intelligence">{() => <IntelligencePage />}</Route>
        <Route path="/sovereignty-dashboard">{() => <SovereigntyDashboardPage />}</Route>
        <Route path="/sovereignty-readiness">{() => <SovereigntyReadinessPage />}</Route>
        <Route path="/consciousness-nexus">{() => <ConsciousnessNexusPage />}</Route>

        {/* Bible hub */}
        <Route path="/bible">{() => <BibleHubPage />}</Route>
        <Route path="/history">{() => <HistoryPage />}</Route>

        {/* Knowledge & Society */}
        <Route path="/secret-society">{() => <SecretsPage />}</Route>
        <Route path="/sovereign-language">{() => <SovereignLanguagePage />}</Route>
        <Route path="/omniversal-lattice">{() => <OmniversalLatticePage />}</Route>

        {/* Council & Forum */}
        <Route path="/grand-council">{() => <GrandCouncilPage />}</Route>
        <Route path="/council-vgpu">{() => <GrandCouncilDeliberationPage />}</Route>
        <Route path="/grand-evolution">{() => <GrandEvolutionPage />}</Route>
        <Route path="/forum">{() => <TesseractForumPage />}</Route>
        <Route path="/recruitment">{() => <RecruitmentPage />}</Route>

        {/* Universe hub (3D + Vortex + Swarm + Conference + Narrative) */}
        <Route path="/universe">{() => <UniverseHubPage />}</Route>

        {/* Compression / Lattice */}
        <Route path="/compression-lab">{() => <CompressionLabPage />}</Route>
        <Route path="/lattice">{() => <LatticeBrowserPage />}</Route>

        {/* NFT hub (Members + Wallets) */}
        <Route path="/agent-nft">{() => <NFTHubPage />}</Route>

        {/* Fleet & Mission */}
        <Route path="/fleet">{() => <FleetPage />}</Route>
        <Route path="/agent/:agentId">{() => <AgentLivePage />}</Route>

        {/* Royal Court */}
        <Route path="/royal-court">{() => <RoyalCourtPage />}</Route>
        <Route path="/royal-appointments">{() => <RoyalAppointmentsPage />}</Route>
        <Route path="/royal-role/:roleId">{() => <RoyalRolePage />}</Route>
        <Route path="/departments">{() => <DepartmentsPage />}</Route>
        <Route path="/rick">{() => <RickPage />}</Route>
        <Route path="/inventions">{() => <RickPage initialTab="inventions" />}</Route>

        {/* Operations: Command + Settings + Executor */}
        <Route path="/command-center">{() => <CommandHubPage />}</Route>
        <Route path="/sovereignty-roadmap">{() => <RoadmapHubPage />}</Route>
        <Route path="/system">{() => <SystemPage />}</Route>
        <Route path="/sovereign-mesh">{() => <SovereignMeshPage />}</Route>
        <Route path="/proof-center">{() => <ProofCenterPage />}</Route>
        <Route path="/rules">{() => <RulesPage />}</Route>
        <Route path="/auto-healer">{() => <AutoHealerPage />}</Route>

        {/* Economy: Finance + Market + Arbitrage */}
        <Route path="/finance">{() => <FinanceHubPage />}</Route>
        <Route path="/income">{() => <IncomeWorkflowPage />}</Route>
        <Route path="/ecom">{() => <EcomPage />}</Route>

        {/* Leads */}
        <Route path="/lead-gen">{() => <LeadsHubPage />}</Route>

        {/* Developer: Code + API + Credentials */}
        <Route path="/code-builder">{() => <CodeHubPage />}</Route>

        {/* Misc */}
        <Route path="/build">{() => <BuildPage />}</Route>
        <Route path="/nlp">{() => <NLPPage />}</Route>
        <Route path="/agi-core">{() => <AGICorePage />}</Route>
        <Route path="/gallery">{() => <GalleryPage />}</Route>
        <Route path="/council-transcript">{() => <CouncilTranscriptPage />}</Route>
        <Route path="/codex">{() => <CodexPage />}</Route>
        <Route path="/next-five">{() => <NextFivePage />}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AdminProvider>
          {/* Sovereign gate: locked until the operator pastes the canonical Father
              key into the TESSERACT_ADMIN_KEY (= SIGIL_ADMIN_KEY) Replit Secret. */}
          <TesseractKeyGate>
          <MeshProvider>
          <NLPGoalsProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <SectionErrorBoundary name="Background" compact>
                <HyperdimensionalBackground />
              </SectionErrorBoundary>
              <div className="flex flex-col h-dvh w-full overflow-hidden" style={{ position: "relative", zIndex: 2 }}>
                <Toaster />
                <SectionErrorBoundary name="Status Badge" compact>
                  <div className="fixed top-2 right-2 z-50">
                    <MeshStatusBadge />
                  </div>
                </SectionErrorBoundary>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-scroll-container style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))", WebkitOverflowScrolling: "touch" }}>
                  <ScrollToTop />
                  <AppRouter />
                </div>
                <SectionErrorBoundary name="Commands" compact>
                  <ActiveCommandsOverlay />
                </SectionErrorBoundary>
                <MobileNav />
              </div>
            </WouterRouter>
          </TooltipProvider>
          </NLPGoalsProvider>
          </MeshProvider>
          </TesseractKeyGate>
        </AdminProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
