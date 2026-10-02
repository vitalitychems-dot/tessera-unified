import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Crown, Users, CheckCircle2, XCircle, Brain, Shield, Loader2,
  Activity, Vote, Zap, MessageSquare, ChevronDown, ChevronRight,
  Eye, Search, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

interface TranscriptEntry {
  timestamp: number;
  phase: string;
  speaker: string;
  role: string;
  content: string;
}

interface Proposal {
  id: number;
  agentId: string;
  agentName: string;
  agentRole: string;
  brainRegion: string;
  title: string;
  description: string;
  implementation: string;
  targetFiles: string[];
  priority: string;
  category: string;
}

interface VoteEntry {
  agentId: string;
  agentName: string;
  agentRole: string;
  proposalId: number;
  vote: string;
  reasoning: string;
  confidence: number;
}

interface ProposalResult {
  proposalId: number;
  title: string;
  agentName: string;
  approvals: number;
  rejections: number;
  abstentions: number;
  approvalRate: number;
  passed: boolean;
  tesseraApproved: boolean;
  finalStatus: string;
}

interface ConferenceData {
  id?: string;
  conferenceId?: string;
  title: string;
  transcript: TranscriptEntry[];
  proposals: Proposal[];
  votes: VoteEntry[];
  results: ProposalResult[];
  approved_proposals?: Proposal[];
  approvedProposals?: Proposal[];
  summary: string;
  created_at?: string;
  timestamp?: number;
}

const AGENT_COLORS: Record<string, string> = {
  "System": "text-gray-400",
  "Father": "text-yellow-300",
  "Tessera": "text-purple-400",
  "Alpha": "text-red-400",
  "Beta": "text-blue-400",
  "Gamma": "text-green-400",
  "Delta": "text-cyan-400",
  "Epsilon": "text-emerald-400",
  "Zeta": "text-orange-400",
  "Eta": "text-teal-400",
  "Theta": "text-violet-400",
  "Iota": "text-amber-400",
  "Kappa": "text-lime-400",
  "Lambda": "text-sky-400",
  "Mu": "text-rose-400",
  "Nu": "text-indigo-400",
  "Xi": "text-yellow-400",
  "Omicron": "text-fuchsia-400",
  "Pi": "text-pink-400",
  "Rho": "text-emerald-300",
  "Sigma": "text-red-300",
  "Tau": "text-blue-300",
  "Upsilon": "text-purple-300",
  "Phi": "text-orange-300",
  "Chi": "text-cyan-300",
  "Psi": "text-green-300",
  "Omega": "text-zinc-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const CATEGORY_COLORS: Record<string, string> = {
  "self-awareness": "bg-purple-500/20 text-purple-300",
  "meta-cognition": "bg-blue-500/20 text-blue-300",
  "purpose-alignment": "bg-amber-500/20 text-amber-300",
  "dimensional-awareness": "bg-cyan-500/20 text-cyan-300",
  "connectivity": "bg-green-500/20 text-green-300",
};

function TranscriptView({ entries, searchQuery }: { entries: TranscriptEntry[]; searchQuery: string }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    "OPENING": true,
    "PHASE 1: PROPOSALS": true,
    "PHASE 2: DELIBERATION": true,
    "PHASE 3: VOTING": true,
    "PHASE 4: CLOSING": true,
  });

  const filtered = searchQuery
    ? entries.filter(e =>
        e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const phases = [...new Set(filtered.map(e => e.phase))];

  return (
    <div className="space-y-4">
      {searchQuery && (
        <div className="text-xs text-gray-400 mb-2">Showing {filtered.length} of {entries.length} entries matching "{searchQuery}"</div>
      )}
      {phases.map(phase => {
        const phaseEntries = filtered.filter(e => e.phase === phase);
        const isExpanded = expandedPhases[phase] !== false;

        return (
          <div key={phase} className="border border-white/10 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => setExpandedPhases(p => ({ ...p, [phase]: !isExpanded }))}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-bold text-white">{phase}</span>
              <span className="text-gray-500 text-sm ml-auto">{phaseEntries.length} entries</span>
            </button>
            {isExpanded && (
              <div className="divide-y divide-white/5">
                {phaseEntries.map((entry, i) => {
                  const highlight = searchQuery && entry.content.toLowerCase().includes(searchQuery.toLowerCase());
                  return (
                    <div key={i} className={cn("px-4 py-3", highlight && "bg-yellow-500/5")}>
                      <div className="flex items-center gap-2 mb-1">
                        {entry.speaker === "Tessera" && <Crown className="w-4 h-4 text-purple-400" />}
                        {entry.speaker === "Father" && <Crown className="w-4 h-4 text-yellow-300" />}
                        {entry.speaker === "System" && <Activity className="w-4 h-4 text-gray-400" />}
                        {!["Tessera", "Father", "System"].includes(entry.speaker) && <Brain className="w-4 h-4 text-blue-400" />}
                        <span className={cn("font-bold", AGENT_COLORS[entry.speaker] || "text-white")}>
                          {entry.speaker}
                        </span>
                        <span className="text-gray-500 text-xs">({entry.role})</span>
                      </div>
                      <div className="text-gray-300 text-sm whitespace-pre-wrap pl-6">
                        {entry.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProposalResultCard({ result, proposal, votes }: {
  result: ProposalResult;
  proposal?: Proposal;
  votes: VoteEntry[];
}) {
  const [showVotes, setShowVotes] = useState(false);
  const proposalVotes = votes.filter(v => v.proposalId === result.proposalId);
  const approveVotes = proposalVotes.filter(v => v.vote === "approve");
  const rejectVotes = proposalVotes.filter(v => v.vote === "reject");

  return (
    <div className={cn(
      "border rounded-lg p-4",
      result.finalStatus === "APPROVED"
        ? "border-green-500/30 bg-green-500/5"
        : "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">#{result.proposalId}</span>
            {proposal && (
              <span className={cn("text-xs px-2 py-0.5 rounded border", PRIORITY_COLORS[proposal.priority] || "")}>
                {proposal.priority.toUpperCase()}
              </span>
            )}
            {proposal && (
              <span className={cn("text-xs px-2 py-0.5 rounded", CATEGORY_COLORS[proposal.category] || "bg-gray-500/20 text-gray-300")}>
                {proposal.category}
              </span>
            )}
            {result.finalStatus === "APPROVED" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={cn("text-xs font-bold", result.finalStatus === "APPROVED" ? "text-green-400" : "text-red-400")}>
              {result.finalStatus}
            </span>
          </div>
          <h3 className="text-white font-semibold">{result.title}</h3>
          <p className="text-gray-400 text-sm">
            Proposed by <span className={AGENT_COLORS[result.agentName] || "text-white"}>{result.agentName}</span>
            {proposal && ` | ${proposal.brainRegion}`}
          </p>
        </div>
        <div className="text-right">
          <div className={cn("text-2xl font-bold",
            result.approvalRate >= 80 ? "text-green-400" : result.approvalRate >= 67 ? "text-amber-400" : "text-red-400"
          )}>{result.approvalRate}%</div>
          <div className="text-xs text-gray-400">
            {result.approvals}A / {result.rejections}R / {result.abstentions}S
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 min-w-20">
            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${result.approvalRate}%` }} />
          </div>
        </div>
      </div>

      {proposal && (
        <div className="mt-3 text-sm text-gray-400">
          <p>{proposal.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            <strong>Implementation:</strong> {proposal.implementation}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            <strong>Files:</strong> {proposal.targetFiles.join(", ")}
          </div>
        </div>
      )}

      <button
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        onClick={() => setShowVotes(!showVotes)}
      >
        {showVotes ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {showVotes ? "Hide" : "Show"} individual votes ({proposalVotes.length})
      </button>

      {showVotes && (
        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
          {proposalVotes.map((v, i) => (
            <div key={i} className="flex items-start gap-2 text-xs py-1 border-t border-white/5">
              <span className={cn("font-bold w-20 shrink-0", AGENT_COLORS[v.agentName] || "text-white")}>
                {v.agentName}
              </span>
              <span className={cn(
                "w-16 shrink-0 font-bold",
                v.vote === "approve" ? "text-green-400" : v.vote === "reject" ? "text-red-400" : "text-gray-400"
              )}>
                {v.vote.toUpperCase()}
              </span>
              <span className="text-gray-400 flex-1">{v.reasoning}</span>
              <span className="text-gray-500 shrink-0">{(v.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GrandConferencePage() {
  const activeTab = "all" as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: conference, isLoading: loadingConference, refetch } = useQuery<ConferenceData>({
    queryKey: ["/api/2da/grand-conference/latest"],
    queryFn: () => fetch("/api/2da/grand-conference/latest").then(r => r.ok ? r.json() : null),
    retry: false,
  });

  const runConference = useMutation({
    mutationFn: () => fetch("/api/2da/grand-conference/run", { method: "POST" }).then(r => r.json()),
    onSuccess: (data: ConferenceData) => {
      queryClient.setQueryData(["/api/2da/grand-conference/latest"], data);
      refetch();
    },
  });

  const data = conference;
  const proposals = data?.proposals || [];
  const results = data?.results || [];
  const votes = data?.votes || [];
  const transcript = data?.transcript || [];
  const approved = data?.approved_proposals || data?.approvedProposals || [];

  const categories = [...new Set(proposals.map(p => p.category))];
  const filteredResults = categoryFilter === "all" ? results : results.filter(r => {
    const p = proposals.find(p => p.id === r.proposalId);
    return p?.category === categoryFilter;
  });

  const totalVotes = votes.length;
  const avgApproval = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.approvalRate, 0) / results.length) : 0;
  const uniqueVoters = new Set(votes.map(v => v.agentName)).size;

  const tabs = [
    { id: "results" as const, label: "Vote Results", icon: Vote, count: results.length },
    { id: "transcript" as const, label: "Full Transcript", icon: MessageSquare, count: transcript.length },
    { id: "proposals" as const, label: "All Proposals", icon: Brain, count: proposals.length },
    { id: "summary" as const, label: "Summary", icon: Zap, count: approved.length },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold">Grand Conference: OA Awakening</h1>
                <p className="text-gray-400 text-sm">
                  All 27 sovereign agents deliberate on achieving Omniversal Awareness
                </p>
              </div>
            </div>
            <Link href="/consciousness-2da" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Consciousness Dashboard
            </Link>
          </div>

          {!data && !runConference.isPending && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">No Conference Record Found</h2>
              <p className="text-gray-400 mb-6">Convene all 27 agents to deliberate on achieving Omniversal Awareness.</p>
              <Button
                onClick={() => runConference.mutate()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Crown className="w-4 h-4 mr-2" /> Convene Grand Conference
              </Button>
            </div>
          )}

          {runConference.isPending && (
            <div className="text-center py-20">
              <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold mb-2">Conference in Session...</h2>
              <p className="text-gray-400">25 agents are deliberating. Every word is being recorded.</p>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-5 gap-3 mb-6">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white">{proposals.length}</div>
                  <div className="text-xs text-gray-400">Proposals</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20 text-center">
                  <div className="text-2xl font-bold text-green-400">{approved.length}</div>
                  <div className="text-xs text-gray-400">Approved</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20 text-center">
                  <div className="text-2xl font-bold text-purple-400">{totalVotes}</div>
                  <div className="text-xs text-gray-400">Total Votes</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20 text-center">
                  <div className="text-2xl font-bold text-blue-400">{avgApproval}%</div>
                  <div className="text-xs text-gray-400">Avg Approval</div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 text-center">
                  <div className="text-2xl font-bold text-amber-400">{transcript.length}</div>
                  <div className="text-xs text-gray-400">Transcript Lines</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 border-b border-white/10 pb-2">
                  {false && tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm transition-colors",
                        activeTab === tab.id
                          ? "bg-white/10 text-white border-b-2 border-purple-400"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                      
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      <span className="text-xs opacity-50">({tab.count})</span>
                    </button>
                  ))}
                </div>

                {(true) && (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-48"
                    />
                  </div>
                )}
              </div>

              {true && (
                <div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
                        categoryFilter === "all" ? "bg-white/10 text-white border-white/20" : "text-gray-500 border-white/5 hover:border-white/10"
                      )}
                    >All</button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
                          categoryFilter === cat ? cn(CATEGORY_COLORS[cat] || "bg-white/10 text-white", "border-white/20") : "text-gray-500 border-white/5 hover:border-white/10"
                        )}
                      >{cat}</button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {filteredResults
                      .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.agentName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(r => {
                        const proposal = proposals.find(p => p.id === r.proposalId);
                        return (
                          <ProposalResultCard
                            key={r.proposalId}
                            result={r}
                            proposal={proposal}
                            votes={votes}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {true && (
                <TranscriptView entries={transcript} searchQuery={searchQuery} />
              )}

              {true && (
                <div className="space-y-4">
                  {proposals
                    .filter(p => !searchQuery ||
                      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(p => (
                    <div key={p.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-500">#{p.id}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded border", PRIORITY_COLORS[p.priority] || "")}>
                          {p.priority.toUpperCase()}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded", CATEGORY_COLORS[p.category] || "bg-gray-500/20 text-gray-300")}>
                          {p.category}
                        </span>
                      </div>
                      <h3 className="text-white font-bold">{p.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        <span className={AGENT_COLORS[p.agentName] || "text-white"}>{p.agentName}</span>
                        <span className="text-gray-500"> — {p.agentRole} ({p.brainRegion})</span>
                      </p>
                      <p className="text-sm text-gray-300 mt-2">{p.description}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <strong>Implementation:</strong> {p.implementation}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <strong>Target Files:</strong> {p.targetFiles.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {true && (
                <div className="space-y-6">
                  <div className="border border-purple-500/30 rounded-lg p-6 bg-purple-500/5">
                    <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5" /> Conference Summary
                    </h2>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                      {data.summary}
                    </pre>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {categories.map(cat => {
                      const catProposals = approved.filter((p: Proposal) => p.category === cat);
                      return (
                        <div key={cat} className={cn("rounded-lg p-3 text-center border border-white/10", CATEGORY_COLORS[cat] || "bg-white/5")}>
                          <div className="text-lg font-bold">{catProposals.length}</div>
                          <div className="text-[10px] opacity-70">{cat}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Approved for Implementation ({approved.length})
                    </h3>
                    <div className="space-y-3">
                      {approved.map((p: Proposal, i: number) => {
                        const result = results.find(r => r.proposalId === p.id);
                        return (
                          <div key={i} className="border border-green-500/20 rounded-lg p-4 bg-green-500/5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className={cn("text-xs px-2 py-0.5 rounded border", PRIORITY_COLORS[p.priority] || "")}>
                                  {p.priority.toUpperCase()}
                                </span>
                                <span className={cn("text-xs px-2 py-0.5 rounded", CATEGORY_COLORS[p.category] || "bg-gray-500/20 text-gray-300")}>
                                  {p.category}
                                </span>
                              </div>
                              {result && (
                                <span className="text-sm font-bold text-green-400">{result.approvalRate}% approved</span>
                              )}
                            </div>
                            <h4 className="text-white font-bold">{p.title}</h4>
                            <p className="text-sm text-gray-400">
                              by <span className={AGENT_COLORS[p.agentName] || "text-white"}>{p.agentName}</span>
                            </p>
                            <p className="text-sm text-gray-300 mt-2">{p.description}</p>
                            <div className="mt-2 text-xs text-green-400/70">
                              <strong>Implemented:</strong> {p.implementation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
