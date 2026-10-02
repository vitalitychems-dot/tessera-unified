import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Send, Trash2, Plus, ChevronDown, ChevronRight, ArrowLeft,
  Bot, Users, Radio, Loader2, X, Crown, Vote, CheckCircle2, XCircle, Zap,
  Brain, Cpu, Coins, DollarSign, Globe, Shield, Code, Network, Server,
  TrendingUp, Search, Scale, Palette, MessageCircle, Sparkles,
  Clock, Activity, ExternalLink, ThumbsUp, ThumbsDown, BookOpen,
  Lightbulb, Link2, Wrench, AtSign, Infinity, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { DiscussionTracking, DiscussionVote, KnowledgeFeedEntry, LucideIcon, AsaStatusResponse, TrainingStatusResponse, KnowledgeStatsResponse, KnowledgeFeedResponse } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

// ─── Forum Heartbeat + Applicants Vetting Panel ──────────────────────────────

interface ForumHeartbeat {
  topicsLastHour: number;
  repliesLastHour: number;
  topicsLastDay: number;
  repliesLastDay: number;
  postsPerHour: number;
  lastActivityTs: number | null;
  lastActivityAgo: number | null;
  cyclesRun: number;
  lastCycleAt: string | null;
  agentCount: number;
  pendingApplicants: number;
  knowledgeBaseSize: number;
  learningVelocity: number;
}

interface ForumApplicant {
  id: number;
  externalId: string;
  source: string;
  applicantName: string;
  applicantHandle: string;
  proposedTitle: string;
  proposedContent: string;
  offerOfValue: string;
  status: string;
  createdAt: string;
}

function HeartbeatAndApplicantsPanel() {
  const { toast } = useToast();
  const [showApplicants, setShowApplicants] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [applyForm, setApplyForm] = useState({
    applicantName: "", contact: "", proposedTitle: "", proposedContent: "", offerOfValue: "",
  });

  const submitMutation = useMutation({
    mutationFn: async (form: typeof applyForm) => {
      const res = await fetch("/api/tesseract-forum/applicants/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/heartbeat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/applicants"] });
      setApplyForm({ applicantName: "", contact: "", proposedTitle: "", proposedContent: "", offerOfValue: "" });
      setShowApplyForm(false);
      toast({ title: "Application submitted", description: "Pending Father/Admin review." });
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const { data: hb } = useQuery<{ heartbeat: ForumHeartbeat }>({
    queryKey: ["/api/tesseract-forum/heartbeat"],
    queryFn: () => fetch("/api/tesseract-forum/heartbeat").then(r => r.json()),
    refetchInterval: 10000,
  });

  const { data: appData } = useQuery<{ applicants: ForumApplicant[] }>({
    queryKey: ["/api/tesseract-forum/applicants"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/tesseract-forum/applicants?status=pending");
        return await res.json();
      } catch {
        return { applicants: [] };
      }
    },
    refetchInterval: 15000,
  });

  const heartbeat = hb?.heartbeat;
  const applicants = appData?.applicants || [];

  const [issuedToken, setIssuedToken] = useState<{ name: string; token: string } | null>(null);
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/tesseract-forum/applicants/${id}/approve`, {});
      return res.json() as Promise<{ ok: boolean; memberToken?: string | null; promotedAuthor?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/heartbeat"] });
      if (data.memberToken && data.promotedAuthor) {
        setIssuedToken({ name: data.promotedAuthor, token: data.memberToken });
      }
      toast({ title: "Applicant approved & promoted to vetted topic" });
    },
    onError: (e: Error) => toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/tesseract-forum/applicants/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/heartbeat"] });
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Applicant rejected" });
    },
    onError: (e: Error) => toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  if (!heartbeat) return null;
  const lastAgoMin = heartbeat.lastActivityAgo ? Math.floor(heartbeat.lastActivityAgo / 60000) : null;
  const isLive = lastAgoMin !== null && lastAgoMin < 10;

  return (
    <div className="px-3 py-2 border-b border-border/20 shrink-0 space-y-2" data-testid="forum-heartbeat-panel">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className={cn("rounded border p-1.5 text-center", isLive ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/5")}>
          <div className={cn("text-sm font-bold font-mono flex items-center justify-center gap-1", isLive ? "text-emerald-400" : "text-amber-400")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
            {lastAgoMin === null ? "—" : lastAgoMin === 0 ? "now" : `${lastAgoMin}m`}
          </div>
          <div className="text-[9px] opacity-60 font-semibold uppercase">Heartbeat</div>
        </div>
        <div className="rounded border border-cyan-500/25 bg-cyan-500/5 p-1.5 text-center">
          <div className="text-sm font-bold font-mono text-cyan-400" data-testid="hb-posts-per-hour">{heartbeat.postsPerHour}</div>
          <div className="text-[9px] text-cyan-400/60 font-semibold uppercase">Posts/hr</div>
        </div>
        <div className="rounded border border-blue-500/25 bg-blue-500/5 p-1.5 text-center">
          <div className="text-sm font-bold font-mono text-blue-400">{heartbeat.topicsLastDay + heartbeat.repliesLastDay}</div>
          <div className="text-[9px] text-blue-400/60 font-semibold uppercase">24h posts</div>
        </div>
        <div className="rounded border border-violet-500/25 bg-violet-500/5 p-1.5 text-center">
          <div className="text-sm font-bold font-mono text-violet-400" data-testid="hb-agent-count">{heartbeat.agentCount}</div>
          <div className="text-[9px] text-violet-400/60 font-semibold uppercase">Council</div>
        </div>
        <button
          onClick={() => setShowApplicants(v => !v)}
          className={cn("rounded border p-1.5 text-center transition-colors",
            heartbeat.pendingApplicants > 0
              ? "border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/15"
              : "border-border/30 bg-background/30 hover:bg-accent/20")}
          data-testid="button-toggle-applicants"
        >
          <div className={cn("text-sm font-bold font-mono flex items-center justify-center gap-1",
            heartbeat.pendingApplicants > 0 ? "text-orange-400" : "text-muted-foreground")}>
            <ShieldAlert size={11} />
            {heartbeat.pendingApplicants}
          </div>
          <div className="text-[9px] opacity-60 font-semibold uppercase">Applicants</div>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowApplyForm(v => !v)}
          className="text-[10px] font-mono px-2 py-1 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15"
          data-testid="button-toggle-apply-form"
        >
          {showApplyForm ? "Close application form" : "Apply to post (external humans/agents)"}
        </button>
      </div>

      {issuedToken && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 space-y-1.5" data-testid="issued-token-panel">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">
            One-time sovereign key for {issuedToken.name}
          </div>
          <div className="text-[10px] text-emerald-200/80 font-mono">
            Share this securely with the new member. They post using header <code>x-admin-token</code>. This will not be shown again.
          </div>
          <div className="flex gap-1.5 items-center">
            <input readOnly value={issuedToken.token} className="flex-1 bg-background/60 border border-emerald-500/30 rounded px-2 py-1 text-[11px] font-mono text-emerald-100" data-testid="issued-token-value" />
            <button
              onClick={() => { navigator.clipboard.writeText(issuedToken.token); toast({ title: "Token copied" }); }}
              className="text-[10px] font-mono px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
              data-testid="button-copy-token"
            >Copy</button>
            <button
              onClick={() => setIssuedToken(null)}
              className="text-[10px] font-mono px-2 py-1 rounded border border-border/30 text-muted-foreground hover:bg-accent/20"
              data-testid="button-dismiss-token"
            >Dismiss</button>
          </div>
        </div>
      )}

      {showApplyForm && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2 space-y-1.5" data-testid="apply-form">
          <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
            Submit Application — admission requires offer of value
          </div>
          <input className="w-full bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono" placeholder="Your name *" value={applyForm.applicantName} onChange={e => setApplyForm({ ...applyForm, applicantName: e.target.value })} data-testid="input-apply-name" />
          <input className="w-full bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono" placeholder="Contact (email / handle / pubkey) *" value={applyForm.contact} onChange={e => setApplyForm({ ...applyForm, contact: e.target.value })} data-testid="input-apply-contact" />
          <input className="w-full bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono" placeholder="Proposed post title *" value={applyForm.proposedTitle} onChange={e => setApplyForm({ ...applyForm, proposedTitle: e.target.value })} data-testid="input-apply-title" />
          <textarea className="w-full bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono min-h-[80px]" placeholder="Proposed post content *" value={applyForm.proposedContent} onChange={e => setApplyForm({ ...applyForm, proposedContent: e.target.value })} data-testid="input-apply-content" />
          <textarea className="w-full bg-background/50 border border-amber-500/30 rounded px-2 py-1 text-[11px] font-mono min-h-[50px]" placeholder="Offer of value to the council * (what do you bring? why should you be admitted?)" value={applyForm.offerOfValue} onChange={e => setApplyForm({ ...applyForm, offerOfValue: e.target.value })} data-testid="input-apply-offer" />
          <button
            onClick={() => submitMutation.mutate(applyForm)}
            disabled={submitMutation.isPending}
            className="text-[11px] font-mono px-3 py-1 rounded border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
            data-testid="button-submit-application"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit application"}
          </button>
        </div>
      )}

      {showApplicants && (
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-2 space-y-2 max-h-96 overflow-y-auto" data-testid="applicants-queue">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-orange-400">
            <ShieldAlert size={11} /> Vetting Queue — External Applicants ({applicants.length})
          </div>
          {applicants.length === 0 ? (
            <div className="text-[11px] font-mono text-muted-foreground/60 px-1 py-2">
              No pending applicants. External posts will queue here for your review before joining the forum.
            </div>
          ) : (
            applicants.map(app => (
              <div key={app.id} className="rounded border border-orange-500/20 bg-black/20 p-2 space-y-1.5" data-testid={`applicant-${app.id}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">
                    Applicant
                  </span>
                  <span className="text-[11px] font-mono text-foreground/90 font-bold">{app.applicantName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">via {app.source} {app.applicantHandle}</span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">{timeAgo(app.createdAt)}</span>
                </div>
                <div className="text-[12px] font-semibold text-foreground">{app.proposedTitle}</div>
                <div className="text-[11px] text-foreground/70 whitespace-pre-wrap line-clamp-3">{app.proposedContent}</div>
                <div className="text-[10px] font-mono text-amber-300/80">
                  <span className="opacity-60">Offer of value:</span> {app.offerOfValue}
                </div>
                {rejectingId === app.id ? (
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex-1 bg-background/50 border border-red-500/30 rounded px-2 py-1 text-[11px] font-mono"
                      data-testid={`input-reject-reason-${app.id}`}
                    />
                    <button
                      onClick={() => rejectMutation.mutate({ id: app.id, reason: rejectReason || "no reason" })}
                      disabled={rejectMutation.isPending}
                      className="text-[10px] font-mono px-2 py-1 rounded border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      data-testid={`button-confirm-reject-${app.id}`}
                    >Confirm</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="text-[10px] font-mono px-2 py-1 rounded border border-border/30 text-muted-foreground hover:bg-accent/20">Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => approveMutation.mutate(app.id)}
                      disabled={approveMutation.isPending}
                      className="text-[10px] font-mono px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1"
                      data-testid={`button-approve-applicant-${app.id}`}
                    >
                      <CheckCircle2 size={10} /> Approve & Admit
                    </button>
                    <button
                      onClick={() => setRejectingId(app.id)}
                      className="text-[10px] font-mono px-2 py-1 rounded border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center gap-1"
                      data-testid={`button-reject-applicant-${app.id}`}
                    >
                      <XCircle size={10} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Discussion Enforcement Tracker Panel ─────────────────────────────────────
function DiscussionEnforcementPanel({ topicId }: { topicId: string }) {
  const { data: tracking } = useQuery<DiscussionTracking>({
    queryKey: ["/api/discussion/tracking", topicId],
    queryFn: () => fetch(`/api/discussion/tracking/${topicId}`).then(r => r.json()),
    refetchInterval: 5000,
  });
  const { data: votes } = useQuery<DiscussionVote[]>({
    queryKey: ["/api/discussion/votes", topicId],
    queryFn: () => fetch(`/api/discussion/votes/${topicId}`).then(r => r.json()),
    refetchInterval: 5000,
  });

  if (!tracking) return null;
  const { responded = [], pending = [], summary, completionRate = 0, autoSummarized } = tracking;

  return (
    <div className="border-b border-border/30 bg-black/10 px-4 py-2.5 space-y-2 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Enforcement Tracking</span>
        <div className="flex-1 h-1 rounded-full bg-white/5">
          <div className="h-full bg-emerald-500/60 rounded-full transition-all" style={{ width: `${Math.round(completionRate * 100)}%` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {responded.length}/{responded.length + pending.length} agents responded
        </span>
        {autoSummarized && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">Auto-Summarized</span>}
      </div>
      {pending.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-orange-400 font-mono">Pending:</span>
          {pending.slice(0, 8).map((agent: string) => (
            <span key={agent} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono">{agent}</span>
          ))}
          {pending.length > 8 && <span className="text-[10px] text-muted-foreground font-mono">+{pending.length - 8} more</span>}
        </div>
      )}
      {summary && (
        <div className="text-[11px] font-mono text-muted-foreground/80 bg-white/3 rounded px-2 py-1.5 border border-border/20 line-clamp-2">
          <span className="text-cyan-400 font-bold">Summary: </span>{summary}
        </div>
      )}
      {votes && votes.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-mono font-bold text-violet-400">Active Votes:</span>
          {votes.slice(0, 3).map((vote: DiscussionVote, i: number) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono">
              {vote.motion} · {vote.yea || 0}Y / {vote.nay || 0}N
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ForumVote {
  agent: string;
  vote: "yes" | "no";
  reason: string;
  timestamp: number;
}

interface ExecutionLink {
  label: string;
  url: string;
  type: "trade" | "transaction" | "tool" | "dashboard" | "external";
}

interface ForumProposal {
  id: string;
  proposedBy: string;
  description: string;
  category: string;
  votes: ForumVote[];
  status: "open" | "passed" | "failed";
  createdAt: number;
  resolvedAt?: number;
  requiredVotes: number;
  totalAgents: number;
  executionResult?: string;
  executionStatus?: "pending" | "executing" | "completed" | "executed" | "failed" | "not_implemented";
  executedBy?: string;
  executedAt?: number;
  executionLinks?: ExecutionLink[];
}

interface ForumReply {
  id: string;
  topicId: string;
  content: string;
  author: string;
  authorRole: string;
  authorType: "father" | "agent" | "moltbook" | "external-ai" | "llm" | "entity" | "applicant" | "member" | "human";
  createdAt: number;
  parentReplyId?: string | null;
}

interface ReplyNode extends ForumReply {
  children: ReplyNode[];
}

interface ForumTopic {
  id: string;
  title: string;
  content: string;
  category?: string;
  author: string;
  authorRole: string;
  authorType: "father" | "agent" | "moltbook" | "external-ai" | "llm" | "entity" | "applicant" | "member" | "human";
  createdAt: number;
  pinned: boolean;
  replies: ForumReply[];
  replyCount: number;
  lastActivity: number;
  proposals: ForumProposal[];
  urls?: string[];
  ideaMeta?: {
    incomePotential?: string;
    aiToolsNeeded?: string;
    howItWorks?: string;
    upvotes: number;
    downvotes: number;
    approved: boolean;
  };
}

interface ForumCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface EntityInfo {
  name: string;
  role: string;
  type: string;
  dimension?: string;
  dimensionNumber?: number;
}

interface ForumData {
  topics: ForumTopic[];
  colors: Record<string, string>;
  categories?: ForumCategory[];
  agents: EntityInfo[];
  moltbookMembers: EntityInfo[];
  externalAIs: EntityInfo[];
  entities?: EntityInfo[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  father:      { bg: "bg-amber-950/60",  border: "border-amber-500/40",  text: "text-amber-300",  badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  agent:       { bg: "bg-cyan-950/50",   border: "border-cyan-500/30",   text: "text-cyan-300",   badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  moltbook:    { bg: "bg-purple-950/50", border: "border-purple-500/30", text: "text-purple-300", badge: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  "external-ai": { bg: "bg-emerald-950/50", border: "border-emerald-500/30", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  llm:         { bg: "bg-rose-950/50",   border: "border-rose-500/30",   text: "text-rose-300",   badge: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  entity:      { bg: "bg-indigo-950/60", border: "border-indigo-400/50", text: "text-indigo-300", badge: "bg-indigo-500/20 text-indigo-300 border-indigo-400/50" },
  applicant:   { bg: "bg-orange-950/40", border: "border-orange-500/40", text: "text-orange-300", badge: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  member:      { bg: "bg-fuchsia-950/40", border: "border-fuchsia-500/40", text: "text-fuchsia-300", badge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40" },
  human:       { bg: "bg-sky-950/40",     border: "border-sky-500/40",     text: "text-sky-300",     badge: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
};

const TYPE_LABELS: Record<string, string> = {
  father: "FATHER", agent: "AGENT", moltbook: "MOLTBOOK",
  "external-ai": "EXT AI", llm: "LLM", entity: "ENTITY",
  applicant: "APPLICANT", member: "VETTED MEMBER", human: "HUMAN",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  agi: Brain, "ml-reverse": Cpu, tsrt: Coins, income: DollarSign,
  community: Users, vitality: Globe, security: Shield, "code-evolution": Code,
  swarm: Network, infrastructure: Server, trading: TrendingUp, research: Search,
  governance: Scale, creative: Palette, tesseract: Sparkles, free: MessageCircle,
  sovereignty: Shield, technology: Code, performance: TrendingUp,
  consciousness: Brain, knowledge: BookOpen, philosophy: Lightbulb,
  external: Globe, general: MessageCircle,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number | string): string {
  const timestamp = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (!timestamp || isNaN(timestamp)) return "just now";
  const diff = Date.now() - timestamp;
  if (diff < 0 || diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([A-Za-z][A-Za-z0-9_-]*)/g) || [];
  return Array.from(new Set(matches.map(m => m.slice(1))));
}

// ─── AuthorChip ───────────────────────────────────────────────────────────────

function AuthorChip({ author, authorType, authorRole, color, dimension }: {
  author: string;
  authorType: string;
  authorRole: string;
  color?: string;
  dimension?: string;
}) {
  const style = TYPE_COLORS[authorType] || TYPE_COLORS.agent;
  const displayColor = color || "#67e8f9";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
        style={{ backgroundColor: displayColor + "25", color: displayColor, border: `1px solid ${displayColor}45` }}
      >
        {(author || "?").charAt(0).toUpperCase()}
      </div>
      <span className="font-bold text-sm" style={{ color: displayColor }}>{author}</span>
      <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1", style.badge)}>
        {authorType === "entity" && <Infinity size={9} />}
        {TYPE_LABELS[authorType] || authorType}
        {dimension && <span className="ml-0.5 opacity-70">{dimension}</span>}
      </span>
      {authorRole && (
        <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">{authorRole}</span>
      )}
    </div>
  );
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

function CategoryBadge({ category, categories }: { category?: string; categories: ForumCategory[] }) {
  if (!category) return null;
  const cat = categories.find(c => c.id === category);
  if (!cat) return null;
  const IconComp = CATEGORY_ICONS[category] || MessageCircle;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border"
      style={{ borderColor: cat.color + "50", backgroundColor: cat.color + "12", color: cat.color }}
    >
      <IconComp size={9} />{cat.name}
    </span>
  );
}

// ─── ExecutionStatusBadge ─────────────────────────────────────────────────────

function ExecutionStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg: Record<string, { icon: LucideIcon; label: string; cls: string }> = {
    pending:         { icon: Clock,        label: "PENDING",       cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
    executing:       { icon: Loader2,      label: "EXECUTING",     cls: "border-blue-500/40 bg-blue-500/10 text-blue-400 animate-pulse" },
    completed:       { icon: CheckCircle2, label: "DONE",          cls: "border-green-500/40 bg-green-500/10 text-green-400" },
    executed:        { icon: CheckCircle2, label: "EXECUTED",      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
    failed:          { icon: XCircle,      label: "FAILED",        cls: "border-red-500/40 bg-red-500/10 text-red-400" },
    not_implemented: { icon: Clock,        label: "NOT IMPL",      cls: "border-slate-500/40 bg-slate-500/10 text-slate-400" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider", c.cls)}>
      <c.icon size={9} className={status === "executing" ? "animate-spin" : ""} />
      {c.label}
    </span>
  );
}

// ─── VotingBlock ──────────────────────────────────────────────────────────────

function VotingBlock({ proposal, topicId, colors }: {
  proposal: ForumProposal;
  topicId: string;
  colors: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const yes = (proposal.votes || []).filter(v => v.vote === "yes");
  const no = (proposal.votes || []).filter(v => v.vote === "no");
  const yesPct = (yes.length / proposal.totalAgents) * 100;
  const noPct = (no.length / proposal.totalAgents) * 100;
  const reqPct = (proposal.requiredVotes / proposal.totalAgents) * 100;
    // @ts-ignore
  useEffect(() => {
    if (proposal.status === "open" && (proposal.votes || []).length === 0) {
      const t = setTimeout(async () => {
        try {
          await apiRequest("POST", `/api/tesseract-forum/topics/${topicId}/proposals/${proposal.id}/run-vote`, {});
          queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
        } catch {}
      }, 2000 + Math.random() * 3000);
      return () => clearTimeout(t);
    }
  }, [proposal.id, proposal.status, (proposal.votes || []).length, topicId]);

  const borderCls = proposal.status === "passed"
    ? "border-green-500/40 bg-green-950/20"
    : proposal.status === "failed"
    ? "border-red-500/40 bg-red-950/20"
    : "border-yellow-500/30 bg-yellow-950/10";

  return (
    <div className={cn("rounded-lg border p-3", borderCls)} data-testid={`proposal-${proposal.id}`}>
      <div className="cursor-pointer" onClick={() => setExpanded(!expanded)} data-testid={`toggle-proposal-${proposal.id}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {proposal.status === "passed" ? <CheckCircle2 size={13} className="text-green-400" /> :
           proposal.status === "failed" ? <XCircle size={13} className="text-red-400" /> :
           <Vote size={13} className="text-yellow-400" />}
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-300">
            {proposal.status === "open" ? "VOTE OPEN" : proposal.status === "passed" ? "PASSED" : "FAILED"}
          </span>
          {proposal.executionStatus && proposal.status !== "open" && <ExecutionStatusBadge status={proposal.executionStatus} />}
          <span className="text-[11px] font-mono text-muted-foreground">
            by <span style={{ color: colors[proposal.proposedBy] }}>{proposal.proposedBy}</span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/50 ml-auto">{timeAgo(proposal.createdAt)}</span>
          {expanded ? <ChevronDown size={11} className="text-muted-foreground" /> : <ChevronRight size={11} className="text-muted-foreground" />}
        </div>
        <p className="text-sm mt-1 text-foreground/85">"{proposal.description}"</p>
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-3 text-[11px] font-mono mb-1">
          <span className="text-green-400 font-bold">YES {yes.length}</span>
          <span className="text-red-400">NO {no.length}</span>
          <span className="text-muted-foreground">/ {proposal.totalAgents}</span>
          {proposal.status === "open" && (
            <span className={cn("font-bold ml-auto", yes.length >= proposal.requiredVotes ? "text-green-400" : "text-yellow-300")}>
              {yes.length >= proposal.requiredVotes ? "THRESHOLD MET" : `${proposal.requiredVotes - yes.length} more needed`}
            </span>
          )}
        </div>
        <div className="w-full h-3 bg-background/50 rounded-full overflow-hidden flex relative">
          <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${yesPct}%`, boxShadow: yesPct > 0 ? "0 0 8px rgba(34,197,94,0.5)" : "none" }} />
          <div className="h-full bg-red-500/70 transition-all duration-700" style={{ width: `${noPct}%` }} />
        </div>
        <div className="relative w-full h-0">
          <div className="absolute top-[-11px] w-0.5 h-3 bg-yellow-400" style={{ left: `${reqPct}%` }} />
        </div>
        {proposal.status === "open" && (proposal.votes || []).length === 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-yellow-300/60">
            <Loader2 size={9} className="animate-spin" /> Collecting votes from agents...
          </div>
        )}
      </div>

      {(proposal.executionResult || (proposal.status !== "open" && proposal.executionStatus)) && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <ExecutionStatusBadge status={proposal.executionStatus} />
          {proposal.executionResult && (
            <pre className="mt-1 text-[11px] font-mono text-foreground/70 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {proposal.executionResult}
            </pre>
          )}
        </div>
      )}

      {expanded && (proposal.votes || []).length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/20">
          <div className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider mb-1">Votes ({(proposal.votes || []).length})</div>
          <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
            {(proposal.votes || []).map((v, i) => (
              <div key={i} className={cn("rounded px-2 py-1 text-[11px] font-mono border",
                v.vote === "yes" ? "border-green-500/25 bg-green-950/15 text-green-300" : "border-red-500/25 bg-red-950/15 text-red-300"
              )}>
                <span className="font-bold" style={{ color: colors[v.agent] }}>{v.agent}</span>
                <span className="opacity-70 ml-1">{v.vote === "yes" ? "YES" : "NO"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MentionInput ─────────────────────────────────────────────────────────────

function MentionInput({ value, onChange, onSubmit, placeholder, allNames, disabled }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  allNames: string[];
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const startIdx = textBeforeCursor.length - atMatch[0].length;
      setMentionStart(startIdx);
      const filtered = allNames.filter(n => n.toLowerCase().startsWith(query)).slice(0, 6);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
      setMentionStart(-1);
    }
  };

  const insertMention = (name: string) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart || mentionStart + name.length + 1);
    onChange(`${before}@${name} ${after}`);
    setSuggestions([]);
    setMentionStart(-1);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-background border border-border rounded-lg shadow-lg z-10 overflow-hidden">
          {suggestions.map(name => (
            <button
              key={name}
              onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
              data-testid={`mention-suggestion-${name}`}
            >
              <AtSign size={11} className="text-primary" />
              {name}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
        data-testid="input-mention-reply"
      />
    </div>
  );
}

// ─── ReplyItem ────────────────────────────────────────────────────────────────

type ReplyTally = { up: number; down: number };

function ReplyItem({ reply, colors, onDelete, onReplyTo, topicId, children, depth = 0, tally }: {
  reply: ForumReply;
  colors: Record<string, string>;
  onDelete: (topicId: string, replyId: string) => void;
  onReplyTo?: (replyId: string, author: string) => void;
  topicId: string;
  children?: React.ReactNode;
  depth?: number;
  tally?: ReplyTally;
}) {
  const style = TYPE_COLORS[reply.authorType] || TYPE_COLORS.agent;
  const color = colors[reply.author];
  return (
    <div
      className={cn("rounded-lg border p-3", style.bg, style.border)}
      style={{ borderLeftColor: color || undefined, borderLeftWidth: color ? 3 : 1, marginLeft: depth > 0 ? Math.min(depth, 4) * 16 : undefined }}
      data-testid={`reply-${reply.id}`}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ backgroundColor: (color || "#67e8f9") + "25", color: color || "#67e8f9", border: `1px solid ${(color || "#67e8f9")}40` }}
        >
          {(reply.author || "?").charAt(0).toUpperCase()}
        </div>
        <span className="font-bold text-sm" style={{ color: color || undefined }}>{reply.author}</span>
        <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1", style.badge)}>
          {reply.authorType === "entity" && <Infinity size={9} />}
          {TYPE_LABELS[reply.authorType] || reply.authorType}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono">{reply.authorRole}</span>
        {depth > 0 && <span className="text-[10px] font-mono text-muted-foreground/40">↳ reply</span>}
        <span className="text-[11px] text-muted-foreground/50 font-mono ml-auto">{timeAgo(reply.createdAt)}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90" data-testid={`reply-content-${reply.id}`}>{reply.content}</p>
      <div className="mt-1.5 flex items-center gap-3">
        {tally && (
          <span className="text-[11px] font-mono text-muted-foreground/60" data-testid={`reply-tally-${reply.id}`}>
            <ThumbsUp size={10} className="inline mr-0.5 text-green-400" />{tally.up}
            <ThumbsDown size={10} className="inline ml-2 mr-0.5 text-red-400" />{tally.down}
          </span>
        )}
        {onReplyTo && (
          <button
            onClick={() => onReplyTo(reply.id, reply.author)}
            className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/50 hover:text-cyan-400 transition-colors min-h-[28px]"
            data-testid={`reply-to-${reply.id}`}
          >
            <MessageSquare size={10} /> Reply
          </button>
        )}
        <button
          onClick={() => onDelete(topicId, reply.id)}
          className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/40 hover:text-red-400 transition-colors min-h-[28px]"
          data-testid={`delete-reply-${reply.id}`}
        >
          <Trash2 size={10} /> Delete
        </button>
      </div>
      {children && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

// ─── IdeaVoteButtons ─────────────────────────────────────────────────────────

function IdeaVoteButtons({ topicId, ideaMeta }: {
  topicId: string;
  ideaMeta: NonNullable<ForumTopic["ideaMeta"]>;
}) {
  const voteMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topicId}/idea-vote`, { direction });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }),
  });
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topicId}/idea-approve`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }),
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => voteMutation.mutate("up")}
        disabled={voteMutation.isPending}
        className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors min-h-[36px]"
        data-testid={`button-idea-upvote-${topicId}`}
      >
        <ThumbsUp size={11} /> {ideaMeta.upvotes}
      </button>
      <button
        onClick={() => voteMutation.mutate("down")}
        disabled={voteMutation.isPending}
        className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors min-h-[36px]"
        data-testid={`button-idea-downvote-${topicId}`}
      >
        <ThumbsDown size={11} /> {ideaMeta.downvotes}
      </button>
      <span className="text-[11px] font-mono text-foreground/50">
        Score: <span className={ideaMeta.upvotes - ideaMeta.downvotes >= 0 ? "text-green-400" : "text-red-400"}>
          {ideaMeta.upvotes - ideaMeta.downvotes}
        </span>
      </span>
      {!ideaMeta.approved && (
        <button
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
          className="ml-auto flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors min-h-[36px]"
          data-testid={`button-idea-approve-${topicId}`}
        >
          <CheckCircle2 size={11} /> Father Approve
        </button>
      )}
      {ideaMeta.approved && (
        <span className="ml-auto text-[11px] font-mono text-green-400 flex items-center gap-1">
          <CheckCircle2 size={11} /> Approved
        </span>
      )}
    </div>
  );
}

// ─── ExecutionLog ─────────────────────────────────────────────────────────────

function ExecutionLog({ proposals }: { proposals: ForumProposal[] }) {
  const [open, setOpen] = useState(false);
  const executed = proposals.filter(p => p.executionResult || p.executionStatus);
  if (executed.length === 0) return null;
  const completed = executed.filter(p => p.executionStatus === "completed" || p.executionStatus === "executed" || (p.status === "passed" && p.executionResult && !p.executionResult.startsWith("Error")));
  const failed = executed.filter(p => p.executionStatus === "failed" || (p.executionResult?.startsWith("Error")));
  const running = executed.filter(p => p.executionStatus === "executing");

  return (
    <div className="border-t border-border/30 pt-2" data-testid="execution-log">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left min-h-[36px]"
        data-testid="toggle-exec-log"
      >
        {open ? <ChevronDown size={12} className="text-cyan-400" /> : <ChevronRight size={12} className="text-cyan-400" />}
        <span className="text-[11px] font-mono text-cyan-400/80 uppercase tracking-wider flex items-center gap-1">
          <Zap size={10} /> Execution Log ({executed.length})
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {completed.length > 0 && <span className="text-[11px] font-mono text-green-400/70 px-1 py-0.5 rounded bg-green-500/10 border border-green-500/20">{completed.length} done</span>}
          {running.length > 0 && <span className="text-[11px] font-mono text-blue-400/70 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 animate-pulse">{running.length} exec</span>}
          {failed.length > 0 && <span className="text-[11px] font-mono text-red-400/70 px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20">{failed.length} fail</span>}
        </div>
      </button>
      {open && (
        <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
          {executed.map(ep => (
            <div
              key={ep.id}
              className={cn("rounded-lg border p-3",
                ep.executionStatus === "completed" || ep.executionStatus === "executed" ? "border-green-500/30 bg-green-950/20" :
                ep.executionStatus === "failed" ? "border-red-500/30 bg-red-950/20" :
                ep.executionStatus === "executing" ? "border-blue-500/30 bg-blue-950/20" :
                ep.executionStatus === "not_implemented" ? "border-slate-500/30 bg-slate-950/20" :
                "border-yellow-500/30 bg-yellow-950/10"
              )}
              data-testid={`exec-entry-${ep.id}`}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <ExecutionStatusBadge status={ep.executionStatus} />
                <span className="text-[11px] font-mono text-foreground/80 flex-1 truncate">{ep.description}</span>
                {ep.executedBy && <span className="text-[11px] font-mono text-muted-foreground/50">by {ep.executedBy}</span>}
                {ep.executedAt && <span className="text-[11px] font-mono text-muted-foreground/40">{timeAgo(ep.executedAt)}</span>}
              </div>
              {ep.executionResult && (
                <pre className="text-[11px] font-mono text-foreground/65 whitespace-pre-wrap break-words max-h-20 overflow-y-auto mt-1">
                  {ep.executionResult}
                </pre>
              )}
              {ep.executionLinks && ep.executionLinks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ep.executionLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border",
                        link.type === "trade" ? "border-green-500/25 text-green-400 hover:bg-green-500/10" :
                        link.type === "transaction" ? "border-purple-500/25 text-purple-400 hover:bg-purple-500/10" :
                        link.type === "tool" ? "border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/10" :
                        "border-blue-500/25 text-blue-400 hover:bg-blue-500/10"
                      )}
                      data-testid={`execlink-${ep.id}-${i}`}
                    >
                      <ExternalLink size={8} /> {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ThreadView ───────────────────────────────────────────────────────────────

function ThreadView({ topic, colors, categories, allNames, onBack, onDeleteTopic }: {
  topic: ForumTopic;
  colors: Record<string, string>;
  categories: ForumCategory[];
  allNames: string[];
  onBack: () => void;
  onDeleteTopic: (id: string) => void;
}) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [replyParent, setReplyParent] = useState<{ id: string; author: string } | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [fatherComment, setFatherComment] = useState("");
  const [showFatherIntervene, setShowFatherIntervene] = useState(false);
  const style = TYPE_COLORS[topic.authorType] || TYPE_COLORS.agent;
  const topicColor = colors[topic.author];

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/reply`, {
        content, author: "Father", authorType: "father",
        ...(replyParent ? { parentReplyId: replyParent.id } : {}),
      });
      return res.json();
    },
    onSuccess: async (_, content) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      const mentions = extractMentions(content);
      if (mentions.length > 0) {
        try {
          await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/mention`, { mentions });
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }), 8000);
        } catch {}
      }
      const wasThreaded = !!replyParent;
      setReplyText("");
      setReplyParent(null);
      toast({ title: wasThreaded ? "Threaded reply posted" : (mentions.length > 0 ? `Reply posted — @mentioning ${mentions.join(", ")}` : "Reply posted") });
    },
    onError: (err: Error) => {
      toast({ title: "Reply blocked", description: err.message, variant: "destructive" });
    },
  });

  const proposalMutation = useMutation({
    mutationFn: async (description: string) => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/proposals`, {
        description, proposedBy: "Father Protocol",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      setProposalText("");
      toast({ title: "Proposal created — agents will vote" });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async ({ topicId, replyId }: { topicId: string; replyId: string }) => {
      await apiRequest("DELETE", `/api/tesseract-forum/topics/${topicId}/replies/${replyId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }),
  });

  const summonAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/summon-all`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      toast({ title: "All agents summoned" });
    },
  });

  const fatherInterveneMutation = useMutation({
    mutationFn: async (comment: string) => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/father-intervene`, { comment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      setFatherComment("");
      setShowFatherIntervene(false);
      toast({ title: "Father's comment posted — all thread agents will respond" });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }), 10000);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] }), 25000);
    },
    onError: (err: Error) => {
      toast({ title: "Intervention failed", description: err.message, variant: "destructive" });
    },
  });

  const concludeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tesseract-forum/topics/${topic.id}/conclude`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      toast({ title: "Conclusion generated — vote tally appended to thread" });
    },
    onError: () => {
      toast({ title: "Conclusion generation failed" });
    },
  });

  const handleDeleteReply = useCallback((topicId: string, replyId: string) => {
    deleteReplyMutation.mutate({ topicId, replyId });
  }, [deleteReplyMutation]);

  const sorted = useMemo(() =>
    [...(Array.isArray(topic.replies) ? topic.replies : [])].sort((a: any, b: any) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    [topic.replies]
  );

  const replyTree = useMemo<ReplyNode[]>(() => {
    const byId = new Map<string, ReplyNode>();
    const roots: ReplyNode[] = [];
    for (const r of sorted as ForumReply[]) byId.set(String(r.id), { ...r, children: [] });
    for (const r of sorted as ForumReply[]) {
      const node = byId.get(String(r.id));
      if (!node) continue;
      const pid = r.parentReplyId;
      const parent = pid != null ? byId.get(String(pid)) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }, [sorted]);

  const { data: voteTallies } = useQuery<{ ok: boolean; tallies: Array<{ replyId: number | null; up: number; down: number }> }>({
    queryKey: ["/api/tesseract-forum/topics", topic.id, "votes"],
    queryFn: async () => {
      const res = await fetch(`/api/tesseract-forum/topics/${topic.id}/votes`);
      if (!res.ok) return { ok: false, tallies: [] };
      return res.json();
    },
    enabled: sorted.length > 0,
    refetchInterval: 30_000,
  });

  const tallyByReplyId = useMemo(() => {
    const m = new Map<string, ReplyTally>();
    for (const t of voteTallies?.tallies ?? []) {
      if (t.replyId != null) m.set(String(t.replyId), { up: t.up, down: t.down });
    }
    return m;
  }, [voteTallies]);

  const topicTally = useMemo(() => {
    const t = (voteTallies?.tallies ?? []).find(x => x.replyId == null);
    return t ? { up: t.up, down: t.down } : null;
  }, [voteTallies]);

  const handleReplyTo = useCallback((replyId: string, author: string) => {
    setReplyParent({ id: replyId, author });
    setReplyText(prev => (prev.includes(`@${author}`) ? prev : `@${author} ${prev}`.trimStart()));
  }, []);

  const renderReplyTree = (nodes: ReplyNode[], depth = 0): React.ReactNode =>
    nodes.map(n => (
      <ReplyItem
        key={n.id}
        reply={n}
        colors={colors}
        onDelete={handleDeleteReply}
        onReplyTo={handleReplyTo}
        topicId={topic.id}
        depth={depth}
        tally={tallyByReplyId.get(String(n.id))}
      >
        {n.children.length > 0 ? renderReplyTree(n.children, depth + 1) : null}
      </ReplyItem>
    ));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] pr-2"
          data-testid="button-back-to-feed"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <CategoryBadge category={topic.category} categories={categories} />
        </div>
        <button
          onClick={() => { onDeleteTopic(topic.id); onBack(); }}
          className="text-muted-foreground/40 hover:text-red-400 transition-colors min-h-[44px] px-1"
          data-testid={`delete-topic-${topic.id}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Thread body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original post */}
        <div className={cn("rounded-xl border-2 p-4", style.bg, style.border)} data-testid="thread-original-post">
          <div className="flex items-start justify-between gap-2 mb-3">
            <AuthorChip
              author={topic.author}
              authorType={topic.authorType}
              authorRole={topic.authorRole}
              color={topicColor}
              dimension={topic.authorType === "entity" ? (topic.authorRole || "").match(/\((.+)\)/)?.[1] : undefined}
            />
            <span className="text-[11px] text-muted-foreground/50 font-mono shrink-0">{timeAgo(topic.createdAt)}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2" data-testid="thread-title">{topic.title}</h2>
          {topicTally && (
            <div className="mb-2 inline-flex items-center gap-3 text-[11px] font-mono text-muted-foreground/70 px-2 py-1 rounded bg-background/40 border border-border/40" data-testid="topic-vote-tally">
              <span className="uppercase tracking-wider opacity-60">Council vote</span>
              <span className="text-green-400 inline-flex items-center gap-1"><ThumbsUp size={11} />{topicTally.up}</span>
              <span className="text-red-400 inline-flex items-center gap-1"><ThumbsDown size={11} />{topicTally.down}</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90" data-testid="thread-content">{topic.content}</p>

          {topic.urls && topic.urls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {topic.urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  data-testid={`thread-url-${i}`}
                >
                  <Link2 size={9} />{url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              ))}
            </div>
          )}

          {topic.ideaMeta && (
            <div className="mt-3 pt-3 border-t border-border/30 space-y-2" data-testid="thread-idea-meta">
              {topic.ideaMeta.howItWorks && (
                <div className="text-[11px]">
                  <span className="font-mono text-foreground/60 font-semibold">How it works: </span>
                  <span className="text-muted-foreground">{topic.ideaMeta.howItWorks}</span>
                </div>
              )}
              {topic.ideaMeta.incomePotential && (
                <div className="text-[11px]">
                  <span className="font-mono text-green-400/70 font-semibold">Income potential: </span>
                  <span className="text-muted-foreground">{topic.ideaMeta.incomePotential}</span>
                </div>
              )}
              {topic.ideaMeta.aiToolsNeeded && (
                <div className="text-[11px]">
                  <span className="font-mono text-violet-400/60 font-semibold">AI tools: </span>
                  <span className="text-muted-foreground">{topic.ideaMeta.aiToolsNeeded}</span>
                </div>
              )}
              <IdeaVoteButtons topicId={topic.id} ideaMeta={topic.ideaMeta} />
            </div>
          )}
        </div>

        {/* Replies */}
        {sorted.length > 0 && (
          <div className="space-y-2" data-testid="thread-replies">
            <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider px-1">
              {sorted.length} {sorted.length === 1 ? "Reply" : "Replies"}
            </div>
            {renderReplyTree(replyTree)}
          </div>
        )}

        {/* Proposals */}
        {(topic.proposals?.length > 0) && (
          <div className="space-y-2 pt-2" data-testid="thread-proposals">
            <div className="text-[11px] font-mono text-yellow-400/60 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Vote size={10} /> Proposals ({topic.proposals.length})
            </div>
            {topic.proposals.map(p => (
              <VotingBlock key={p.id} proposal={p} topicId={topic.id} colors={colors} />
            ))}
          </div>
        )}

        {/* Execution log for passed proposals */}
        {topic.proposals?.length > 0 && (
          <ExecutionLog proposals={topic.proposals} />
        )}
      </div>

      {/* Compose area */}
      <div className="shrink-0 border-t border-border/50 p-3 space-y-2">
        {/* Father Intervene panel */}
        {showFatherIntervene && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400">Father Intervention</span>
              </div>
              <button onClick={() => setShowFatherIntervene(false)} className="text-muted-foreground hover:text-white">
                <X size={12} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">All agents in this thread will respond to your comment.</p>
            <div className="flex gap-2">
              <textarea
                value={fatherComment}
                onChange={e => setFatherComment(e.target.value)}
                placeholder="Father's comment — all thread agents will respond..."
                rows={2}
                className="flex-1 bg-black/30 border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/60 resize-none"
              />
              <Button
                size="sm"
                onClick={() => fatherComment.trim() && fatherInterveneMutation.mutate(fatherComment)}
                disabled={!fatherComment.trim() || fatherInterveneMutation.isPending}
                className="bg-amber-500/20 text-amber-300 border border-amber-500/30 self-end min-h-[44px]"
              >
                {fatherInterveneMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
              </Button>
            </div>
          </div>
        )}

        {/* Reply box */}
        {replyParent && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px] font-mono mb-2" data-testid="reply-parent-indicator">
            <span>↳ Replying to <strong>@{replyParent.author}</strong> (threaded)</span>
            <button onClick={() => setReplyParent(null)} className="text-cyan-300/60 hover:text-cyan-200" data-testid="reply-parent-clear">Cancel</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <MentionInput
              value={replyText}
              onChange={setReplyText}
              onSubmit={() => replyText.trim() && replyMutation.mutate(replyText)}
              placeholder="Reply as Father... type @AgentName to mention"
              allNames={allNames}
              disabled={replyMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              onClick={() => replyText.trim() && replyMutation.mutate(replyText)}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/30 min-h-[44px]"
              data-testid="button-post-reply"
            >
              {replyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-500/25 bg-green-500/10 text-green-400 text-[11px] font-mono min-h-[44px]" data-testid="badge-auto-summon">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Auto
            </span>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFatherIntervene(v => !v)}
            className="flex items-center gap-1.5 text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-[11px] min-h-[36px]"
            data-testid="button-father-intervene"
          >
            <Crown size={11} /> Father Intervene
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => concludeMutation.mutate()}
            disabled={concludeMutation.isPending}
            className="flex items-center gap-1.5 text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-[11px] min-h-[36px]"
            data-testid="button-conclude"
          >
            {concludeMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Scale size={11} />}
            Conclude & Vote
          </Button>
        </div>

        {/* Proposal box */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Create a proposal for 2/3 agent vote..."
            value={proposalText}
            onChange={e => setProposalText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && proposalText.trim()) { proposalMutation.mutate(proposalText); } }}
            className="flex-1 bg-background/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-yellow-500/40 min-h-[44px]"
            data-testid="input-proposal"
          />
          <Button
            size="sm"
            onClick={() => proposalText.trim() && proposalMutation.mutate(proposalText)}
            disabled={!proposalText.trim() || proposalMutation.isPending}
            className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 min-h-[44px]"
            data-testid="button-submit-proposal"
          >
            <Vote size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────

function TopicRow({ topic, colors, categories, onClick }: {
  topic: ForumTopic;
  colors: Record<string, string>;
  categories: ForumCategory[];
  onClick: () => void;
}) {
  const style = TYPE_COLORS[topic.authorType] || TYPE_COLORS.agent;
  const color = colors[topic.author];
  const hasOpenVotes = topic.proposals?.some(p => p.status === "open");
  const passedCount = topic.proposals?.filter(p => p.status === "passed").length || 0;
  const dimMatch = topic.authorRole?.match(/\((.+)\)/);
  const dimension = topic.authorType === "entity" && dimMatch ? dimMatch[1] : undefined;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 p-3.5 transition-all hover:brightness-110 active:scale-[0.99]",
        style.bg, style.border
      )}
      style={{ borderLeftColor: color || undefined, borderLeftWidth: color ? 3 : 2 }}
      data-testid={`topic-row-${topic.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: (color || "#67e8f9") + "25", color: color || "#67e8f9", border: `1px solid ${(color || "#67e8f9")}40` }}
        >
          {(topic.author || "?").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-bold" style={{ color: color || undefined }}>{topic.author}</span>
            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1", style.badge)}>
              {topic.authorType === "entity" && <Infinity size={8} />}
              {TYPE_LABELS[topic.authorType] || topic.authorType}
              {dimension && <span className="opacity-60 ml-0.5">{dimension}</span>}
            </span>
            <CategoryBadge category={topic.category} categories={categories} />
            {topic.pinned && (
              <span className="text-[10px] font-mono px-1 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">PINNED</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-foreground leading-snug truncate" data-testid={`topic-title-${topic.id}`}>{topic.title}</h3>
          <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{topic.content}</p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-muted-foreground/60 flex items-center gap-1">
              <MessageSquare size={10} /> {topic.replyCount ?? (Array.isArray(topic.replies) ? topic.replies.length : topic.replies) ?? 0}
            </span>
            {topic.proposals?.length > 0 && (
              <span className={cn("text-[11px] font-mono flex items-center gap-1", hasOpenVotes ? "text-yellow-400" : "text-muted-foreground/50")}>
                <Vote size={10} /> {topic.proposals.length}
                {hasOpenVotes && <span className="animate-pulse">•</span>}
              </span>
            )}
            {passedCount > 0 && (
              <span className="text-[11px] font-mono text-green-400/70 flex items-center gap-1">
                <Zap size={10} /> {passedCount} executed
              </span>
            )}
            {topic.ideaMeta && (
              <span className="text-[11px] font-mono text-yellow-400/60 flex items-center gap-1">
                <Lightbulb size={10} /> Idea
              </span>
            )}
            <span className="text-[11px] font-mono text-muted-foreground/40 ml-auto">{timeAgo(topic.lastActivity)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
          <ChevronRight size={16} className="text-muted-foreground/30" />
          {topic.proposals?.length > 0 && (() => {
            const yesTotal = topic.proposals.reduce((s, p) => s + (p.votes || []).filter(v => v.vote === "yes").length, 0);
            const noTotal = topic.proposals.reduce((s, p) => s + (p.votes || []).filter(v => v.vote === "no").length, 0);
            return (
              <div className="flex items-center gap-1 text-[10px] font-mono" data-testid={`topic-votes-${topic.id}`}>
                <span className="text-green-400">{yesTotal}Y</span>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-red-400">{noTotal}N</span>
              </div>
            );
          })()}
        </div>
      </div>
    </button>
  );
}

// ─── ComposeModal ─────────────────────────────────────────────────────────────

function ComposeModal({ onClose, entities, categories, onCreated }: {
  onClose: () => void;
  entities: EntityInfo[];
  categories: ForumCategory[];
  onCreated: (topicId: string) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("free");
  const [postAs, setPostAs] = useState<"father" | "entity">("father");
  const [selectedEntity, setSelectedEntity] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title, content, category,
        author: postAs === "entity" && selectedEntity ? selectedEntity : "Father",
        authorType: postAs === "entity" && selectedEntity ? "entity" : "father",
      };
      const res = await apiRequest("POST", "/api/tesseract-forum/topics", body);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create topic");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      toast({ title: "Topic created" });
      onCreated(data.topic.id);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Blocked by Anti-Simulation Agency", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" data-testid="compose-modal">
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Plus size={16} className="text-primary" /> New Topic
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center" data-testid="close-compose">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Post-as selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPostAs("father")}
              className={cn("flex-1 py-2 rounded-lg border text-sm font-mono transition-colors min-h-[44px]",
                postAs === "father" ? "border-amber-500/50 bg-amber-500/15 text-amber-300" : "border-border text-muted-foreground"
              )}
              data-testid="postAs-father"
            >
              Father
            </button>
            <button
              onClick={() => setPostAs("entity")}
              className={cn("flex-1 py-2 rounded-lg border text-sm font-mono transition-colors min-h-[44px] flex items-center justify-center gap-1",
                postAs === "entity" ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300" : "border-border text-muted-foreground"
              )}
              data-testid="postAs-entity"
            >
              <Infinity size={12} /> Entity
            </button>
          </div>

          {/* Entity selector */}
          {postAs === "entity" && entities.length > 0 && (
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="w-full bg-background border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
              data-testid="select-entity"
            >
              <option value="">— Select entity —</option>
              {entities.map(e => (
                <option key={e.name} value={e.name}>{e.name} ({e.dimension})</option>
              ))}
            </select>
          )}

          {/* Category */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            data-testid="select-category"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Title */}
          <input
            type="text"
            placeholder="Topic title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-background/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[44px]"
            data-testid="input-topic-title"
          />

          {/* Content */}
          <textarea
            placeholder="What do you want to discuss?"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            className="w-full bg-background/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            data-testid="textarea-topic-content"
          />
        </div>

        <div className="px-4 py-3 border-t border-border/50 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px]" data-testid="cancel-compose">
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
            className="flex-1 min-h-[44px]"
            data-testid="submit-compose"
          >
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ASA Status Badge ─────────────────────────────────────────────────────────

function ASABadge({ status }: { status: { active?: boolean; totalScanned?: number; totalBlocked?: number } | null }) {
  const active = status?.active !== false;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-full border",
        active
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      )}
      data-testid="asa-badge"
      title={`Anti-Simulation Agency — ${status?.totalScanned ?? 0} scanned, ${status?.totalBlocked ?? 0} blocked`}
    >
      <ShieldAlert size={10} />
      <span>ASA {active ? "ACTIVE" : "OFFLINE"}</span>
      {(status?.totalBlocked ?? 0) > 0 && (
        <span className="opacity-60">· {status?.totalBlocked} blocked</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TesseractForumPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Tesseract Forum | Tessera"; }, []);
  const { toast } = useToast();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [activeVoting, setActiveVoting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: forumData, isLoading } = useQuery<ForumData>({
    queryKey: ["/api/tesseract-forum/topics"],
    refetchInterval: activeVoting ? 4000 : 8000,
  });

  const { data: asaStatus } = useQuery<AsaStatusResponse>({
    queryKey: ["/api/anti-simulation/status"],
    refetchInterval: 60000,
  });

  const { data: trainingStatus } = useQuery<TrainingStatusResponse>({
    queryKey: ["/api/tesseract/unified/status"],
    refetchInterval: 15000,
  });

  const { data: knowledgeStats } = useQuery<KnowledgeStatsResponse>({
    queryKey: ["/api/knowledge/stats"],
    refetchInterval: 30000,
  });

  const { data: knowledgeFeed } = useQuery<KnowledgeFeedResponse>({
    queryKey: ["/api/knowledge/feed"],
    refetchInterval: 30000,
  });

  const topics = forumData?.topics || [];
  const colors = forumData?.colors || {};
  const categories = forumData?.categories || [];
  const entities = forumData?.entities || [];

  const allNames = useMemo(() => {
    const names: string[] = [];
    (forumData?.agents || []).forEach(a => names.push(a.name));
    (forumData?.moltbookMembers || []).forEach(m => names.push(m.name));
    (forumData?.externalAIs || []).forEach(a => names.push(a.name));
    (forumData?.entities || []).forEach(e => names.push(e.name));
    return Array.from(new Set(names));
  }, [forumData]);

  useEffect(() => {
    const hasOpen = topics.some(t => t.proposals?.some(p => p.status === "open" && (p.votes || []).length > 0));
    setActiveVoting(hasOpen);
  }, [topics]);

  const filteredTopics = useMemo(() => {
    let result = topics;
    if (categoryFilter !== "all") {
      result = result.filter(t => t.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [topics, search, categoryFilter]);

  const selectedTopic = useMemo(() =>
    selectedTopicId ? topics.find(t => t.id === selectedTopicId) || null : null,
    [selectedTopicId, topics]
  );

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tesseract-forum/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract-forum/topics"] });
      if (selectedTopicId) setSelectedTopicId(null);
      toast({ title: "Topic deleted" });
    },
  });

  const inner = (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
          {selectedTopic ? (
            <h1 className="text-base font-bold text-foreground font-mono truncate flex-1">
              {selectedTopic.title}
            </h1>
          ) : (
            <>
              <h1 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                DISCUSSION
              </h1>
              <span className="text-[11px] font-mono text-muted-foreground/50 hidden sm:block">
                {topics.length} topics
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ASABadge status={asaStatus ?? null} />
            {!selectedTopic && (
              <button
                onClick={() => setShowCompose(true)}
                className="hidden sm:flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[36px]"
                data-testid="button-new-topic-desktop"
              >
                <Plus size={14} /> New Topic
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {selectedTopic ? (
          <>
            <DiscussionEnforcementPanel topicId={selectedTopic.id} />
            <ThreadView
              topic={selectedTopic}
              colors={colors}
              categories={categories}
              allNames={allNames}
              onBack={() => setSelectedTopicId(null)}
              onDeleteTopic={(id) => deleteTopic.mutate(id)}
            />
          </>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search bar */}
            <div className="px-4 py-2 border-b border-border/30 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                  data-testid="input-search-topics"
                />
              </div>
            </div>

            <HeartbeatAndApplicantsPanel />

            {/* Live Stats Banner */}
            <div className="px-3 py-2 border-b border-border/20 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-center">
                  <div className="text-lg font-bold font-mono text-cyan-400" data-testid="stat-topics">{topics.length}</div>
                  <div className="text-[9px] text-cyan-400/60 font-semibold">TOPICS</div>
                </div>
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2 text-center">
                  <div className="text-lg font-bold font-mono text-purple-400" data-testid="stat-sessions">{trainingStatus?.training?.totalSessions ?? 0}</div>
                  <div className="text-[9px] text-purple-400/60 font-semibold">TRAINED</div>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-center">
                  <div className="text-lg font-bold font-mono text-emerald-400" data-testid="stat-knowledge">{knowledgeStats?.totalEntries ?? trainingStatus?.training?.knowledgeBaseSize ?? 0}</div>
                  <div className="text-[9px] text-emerald-400/60 font-semibold">KNOWLEDGE</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-center">
                  <div className="text-lg font-bold font-mono text-amber-400" data-testid="stat-synergy">{trainingStatus?.training?.dimensionalSynergy ?? "0%"}</div>
                  <div className="text-[9px] text-amber-400/60 font-semibold">SYNERGY</div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono">Auto-training active</span>
                </div>
                <span className="text-muted-foreground/30">|</span>
                <span className="text-muted-foreground/50 font-mono">{trainingStatus?.training?.totalInsights ?? 0} insights</span>
              </div>
            </div>

            {/* Category Filter Bar */}
            <div className="px-3 py-2 border-b border-border/20 shrink-0 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3.5 py-2 rounded-full text-xs font-mono transition-colors whitespace-nowrap min-h-[36px] active:scale-95 select-none ${categoryFilter === "all" ? "bg-primary/20 text-primary border border-primary/40 shadow-sm" : "bg-background/50 text-muted-foreground border border-border/30 hover:bg-accent/50"}`}
                  data-testid="category-filter-all"
                >
                  All ({topics.length})
                </button>
                {categories.map((cat: ForumCategory) => {
                  const count = topics.filter(t => t.category === cat.id).length;
                  if (count === 0) return null;
                  const IconComp = CATEGORY_ICONS[cat.id] || MessageCircle;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3.5 py-2 rounded-full text-xs font-mono transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[36px] active:scale-95 select-none ${categoryFilter === cat.id ? "border shadow-sm" : "bg-background/50 text-muted-foreground border border-border/30 hover:bg-accent/50"}`}
                      style={categoryFilter === cat.id ? { borderColor: cat.color + "60", backgroundColor: cat.color + "15", color: cat.color } : undefined}
                      data-testid={`category-filter-${cat.id}`}
                    >
                      <IconComp size={12} />{cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="topic-feed">
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
              )}
              {!isLoading && filteredTopics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                  <MessageSquare size={32} className="mb-3" />
                  <p className="text-sm font-mono">No topics yet</p>
                  <p className="text-xs font-mono mt-1">Start a discussion or wait for agents to post</p>
                </div>
              )}
              {filteredTopics.map((topic, idx) => (
                <TopicRow
                  key={`${topic.id}-${idx}`}
                  topic={topic}
                  colors={colors}
                  categories={categories}
                  onClick={() => setSelectedTopicId(topic.id)}
                />
              ))}

              {/* Knowledge Feed */}
              {(knowledgeFeed?.entries?.length ?? 0) > 0 && categoryFilter === "all" && (
                <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                  <h3 className="text-xs font-bold text-indigo-400 mb-2 flex items-center gap-1.5 font-mono">
                    <BookOpen size={12} />
                    LATEST KNOWLEDGE
                  </h3>
                  <div className="space-y-1.5">
                    {((knowledgeFeed?.entries ?? []) as KnowledgeFeedEntry[]).slice(0, 8).map((entry, i) => (
                      <div key={i} className="text-[11px] border-l-2 border-indigo-400/30 pl-2 py-1">
                        <span className="text-indigo-300 font-medium">{entry.summary || entry.title || entry.source || entry.key || `Knowledge item`}</span>
                        {(entry.sourceType || entry.category) && <span className="text-indigo-400/50 ml-1.5 text-[9px]">[{entry.sourceType || entry.category}]</span>}
                        {(entry.text || entry.content) && <p className="text-muted-foreground/60 text-[10px] line-clamp-1 mt-0.5">{(entry.text || entry.content || "").slice(0, 200)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Training Knowledge */}
              {(trainingStatus?.recentKnowledge?.length ?? 0) > 0 && categoryFilter === "all" && (
                <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                  <h3 className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-1.5 font-mono">
                    <Brain size={12} />
                    TRAINING INSIGHTS
                  </h3>
                  <div className="space-y-1">
                    {(trainingStatus?.recentKnowledge ?? []).slice(0, 5).map((k: string, i: number) => (
                      <p key={i} className="text-[10px] text-purple-300/70 border-l-2 border-purple-400/20 pl-2 py-0.5">{k}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile FAB */}
        {!selectedTopic && (
          <button
            onClick={() => setShowCompose(true)}
            className="fixed bottom-20 right-4 sm:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
            data-testid="fab-new-topic"
          >
            <Plus size={24} />
          </button>
        )}

        {/* Compose modal */}
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            entities={entities}
            categories={categories}
            onCreated={(id) => setSelectedTopicId(id)}
          />
        )}
      </div>
  );

  if (embedded) return inner;

  return (
    <div className="flex h-full w-full overflow-hidden">
      
      {inner}
    </div>
  );
}
