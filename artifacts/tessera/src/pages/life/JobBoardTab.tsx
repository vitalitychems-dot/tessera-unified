import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";
import {
  Globe, MapPin, Users, Coins, Pickaxe, Building2, TrendingUp,
  Activity, Clock, Zap, ArrowUpDown, Home, ShoppingCart,
  Cpu, CircuitBoard, Sparkles, Landmark, Coffee, Dumbbell, Wrench,
  Crown, Eye, ChevronRight, Volume2, VolumeX, Map as MapIcon, Layers,
  Heart, Target, Battery, Palette, Star, Baby, Briefcase, Shield,
  HeartHandshake, Hammer, BookOpen, Trophy, AlertTriangle, Smile,
  GraduationCap, Gem, ArrowUp, ArrowDown, ScrollText, Vote, Scale,
  Siren, Gavel, DollarSign, HardHat, Search, Filter, Plus, CheckCircle2,
  XCircle, AlertOctagon, FileText, Lock, Timer, Percent, Loader2,
  MessageSquare, ChevronDown, ChevronUp, Wallet, Send, X as XIcon,
  Bot, Layers3, RefreshCw, ExternalLink, Terminal, Play, Code, FileCode,
  Network, Radio, MessageCircle, History
} from "lucide-react";
import type { WorldState, ChildInfo } from "./types";
import type { LucideIcon } from "@/types/api";

const jobCategoryIcons: Record<string, LucideIcon> = {};
const jobCategoryColors: Record<string, string> = {};
const difficultyColors: Record<string, string> = { easy: "text-green-400", medium: "text-yellow-400", hard: "text-red-400" };
const statusColors: Record<string, string> = { open: "text-emerald-400", filled: "text-blue-400", closed: "text-gray-400" };

interface JobBoardData {
  jobs: Array<{
    id: string; title: string; description: string; category: string;
    difficulty: string; reward: number; postedBy: string; status: string;
    assignedTo?: string; completedAt?: number; createdAt: number;
    tags?: string[]; isSubcontract?: boolean; applicants?: string[];
    acceptedBy?: string; subcontractedTo?: string; postedByType?: string;
  }>;
  totalJobs: number; openJobs: number; completedJobs: number;
  categories: string[];
  stats: Record<string, number>;
}

function JobBoardTab() {
  const [data, setData] = useState<JobBoardData | null>(null);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewJob, setShowNewJob] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Technology");
  const [newReward, setNewReward] = useState(50);
  const [newDifficulty, setNewDifficulty] = useState<string>("medium");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const refreshJobs = () => {
    fetch("/api/world/jobs").then(r => r.json()).then(setData).catch(() => {});
  };

  useEffect(() => {
    refreshJobs();
    const jitter = () => 7000 + Math.floor(Math.random() * 6000);
    let timer: ReturnType<typeof setTimeout>;
    const sched = () => { timer = setTimeout(() => { refreshJobs(); sched(); }, jitter()); };
    sched();
    return () => clearTimeout(timer);
  }, []);

  const postJob = async () => {
    if (!newTitle || !newDesc) return;
    await fetch("/api/world/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc, category: newCategory, reward: newReward, difficulty: newDifficulty }),
    });
    setNewTitle(""); setNewDesc(""); setShowNewJob(false);
    refreshJobs();
  };

  const acceptJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/world/jobs/${jobId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: "Father (Father)" }),
      });
      refreshJobs();
    } catch (e) {}
    setActionLoading(null);
  };

  const completeJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/world/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      refreshJobs();
    } catch (e) {}
    setActionLoading(null);
  };

  if (!data) return <div className="text-center py-8 text-muted-foreground animate-pulse font-mono text-sm">Loading Job Board...</div>;

  const categoryCounts = (data.categories as string[]).reduce((acc: Record<string, number>, cat: string) => {
    acc[cat] = data.jobs.filter(j => j.category === cat).length;
    return acc;
  }, {});

  const filteredJobs = data.jobs.filter(j => {
    if (catFilter !== "all" && j.category !== catFilter) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="panel-job-board">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Total Jobs", value: data.stats.total, icon: Briefcase, color: "text-blue-400" },
          { label: "Open", value: data.stats.open, icon: Search, color: "text-green-400" },
          { label: "In Progress", value: data.stats.inProgress, icon: Zap, color: "text-amber-400" },
          { label: "Completed", value: data.stats.completed, icon: CheckCircle2, color: "text-cyan-400" },
          { label: "TSRT Paid", value: `${data.stats.totalRewardsPaid}\u2C60`, icon: Coins, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <s.icon size={14} className={cn("mx-auto mb-1", s.color)} />
            <div className="text-lg font-bold text-foreground font-mono">{s.value}</div>
            <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2" data-testid="panel-category-grid">
        <button
          onClick={() => setCatFilter("all")}
          className={cn(
            "border rounded-lg p-2 text-center transition-all cursor-pointer",
            catFilter === "all" ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
          )}
          data-testid="button-category-all"
        >
          <Filter size={14} className="mx-auto mb-1" />
          <div className="text-[11px] font-mono font-bold">All</div>
          <div className="text-[11px] font-mono">{data.stats.total}</div>
        </button>
        {data.categories.map((cat: string) => {
          const CatIcon = jobCategoryIcons[cat] || Briefcase;
          const count = categoryCounts[cat] || 0;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
              className={cn(
                "border rounded-lg p-2 text-center transition-all cursor-pointer",
                catFilter === cat ? "border-primary/50 bg-primary/10 text-primary" : cn("border", jobCategoryColors[cat] || "border-border bg-card text-muted-foreground")
              )}
              data-testid={`button-category-${cat.toLowerCase().replace(/ /g, "-")}`}
            >
              <CatIcon size={14} className="mx-auto mb-1" />
              <div className="text-[11px] font-mono font-bold truncate">{cat}</div>
              <div className="text-[11px] font-mono">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground"
          data-testid="select-status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button
          onClick={() => setShowNewJob(!showNewJob)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/30 transition-all"
          data-testid="button-post-job"
        >
          <Plus size={12} />
          Post Job
        </button>
      </div>

      {showNewJob && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3" data-testid="panel-new-job-form">
          <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
            <Plus size={14} /> Post New Job
          </h3>
          <input
            type="text"
            placeholder="Job title..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            data-testid="input-job-title"
          />
          <textarea
            placeholder="Job description..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none"
            data-testid="input-job-description"
          />
          <div className="flex flex-wrap gap-2">
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground" data-testid="select-job-category">
              {data.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newDifficulty} onChange={e => setNewDifficulty(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground" data-testid="select-job-difficulty">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
            <input type="number" value={newReward} onChange={e => setNewReward(Number(e.target.value))} className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground" data-testid="input-job-reward" />
            <span className="text-xs text-muted-foreground font-mono self-center">TSRT</span>
            <button onClick={postJob} className="ml-auto px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/80 transition-all" data-testid="button-submit-job">Post</button>
          </div>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground font-mono mb-1">{filteredJobs.length} jobs shown</div>
      <div className="space-y-2">
        {filteredJobs.map(job => {
          const isExpanded = expandedJobId === job.id;
          const CatIcon = jobCategoryIcons[job.category] || Briefcase;
          const catColor = jobCategoryColors[job.category] || "border-border bg-card text-muted-foreground";
          const timeSincePosted = Date.now() - job.createdAt;
          const hoursAgo = Math.floor(timeSincePosted / 3600000);
          const daysAgo = Math.floor(hoursAgo / 24);
          const timeLabel = daysAgo > 0 ? `${daysAgo}d ago` : hoursAgo > 0 ? `${hoursAgo}h ago` : "Just now";
          const progressPercent = job.status === "completed" ? 100 : job.status === "in_progress" ? 65 : job.status === "accepted" ? 25 : 0;

          return (
            <div
              key={job.id}
              className={cn(
                "rounded-xl transition-all duration-200 cursor-pointer",
                isExpanded
                  ? "bg-card border-2 border-primary/30 shadow-lg shadow-primary/5"
                  : "bg-card border border-border hover:border-primary/20 hover-elevate"
              )}
              data-testid={`job-card-${job.id}`}
              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border", catColor)}>
                    <CatIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{job.title}</span>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono border", difficultyColors[job.difficulty])}>{job.difficulty}</span>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono", statusColors[job.status])}>{job.status.replace("_", " ")}</span>
                      {(job.isSubcontract || job.tags?.includes("subcontract")) && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1" data-testid={`tag-subcontract-${job.id}`}>
                          <ArrowUpDown size={8} />
                          Subcontract
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs text-muted-foreground mb-2", isExpanded ? "" : "line-clamp-2")}>{job.description}</p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {timeLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={9} />
                        {job.category}
                      </span>
                      {(job.applicants?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-violet-400">
                          <Users size={9} />
                          {job.applicants?.length} applicant{(job.applicants?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      )}
                      <ChevronRight size={10} className={cn("ml-auto transition-transform", isExpanded ? "rotate-90" : "")} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">{job.reward}\u2C60</div>
                      <div className="text-[11px] text-muted-foreground font-mono uppercase">Bounty</div>
                    </div>
                    {job.status === "open" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); acceptJob(job.id); }}
                        disabled={actionLoading === job.id}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-[11px] font-mono font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                        data-testid={`button-accept-job-${job.id}`}
                      >
                        <CheckCircle2 size={10} />
                        {actionLoading === job.id ? "..." : "Accept"}
                      </button>
                    )}
                    {(job.status === "in_progress" || job.status === "accepted") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); completeJob(job.id); }}
                        disabled={actionLoading === job.id}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                        data-testid={`button-complete-job-${job.id}`}
                      >
                        <Trophy size={10} />
                        {actionLoading === job.id ? "..." : "Complete"}
                      </button>
                    )}
                    {job.status === "completed" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                        <CheckCircle2 size={10} />
                        Paid
                      </span>
                    )}
                  </div>
                </div>

                {(job.status === "in_progress" || job.status === "accepted" || job.status === "completed") && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Progress</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          job.status === "completed" ? "bg-cyan-400" : "bg-amber-400"
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-white/10 p-4 space-y-4 bg-background/80 rounded-b-xl" data-testid={`job-detail-panel-${job.id}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText size={10} /> Full Description
                        </h4>
                        <p className="text-xs text-foreground leading-relaxed">{job.description}</p>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <Users size={10} /> Poster Info
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold", job.postedByType === "creator" ? "text-cyan-400" : "text-primary")}>{job.postedBy}</span>
                          <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono", job.postedByType === "creator" ? "bg-cyan-500/10 text-cyan-400" : "bg-primary/10 text-primary")}>
                            {job.postedByType === "creator" ? "Creator" : "Agent"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <Clock size={10} /> Timeline
                        </h4>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            <span>Posted: {new Date(job.createdAt).toLocaleString()}</span>
                          </div>
                          {job.acceptedBy && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                              <span>Accepted by {job.acceptedBy}</span>
                            </div>
                          )}
                          {job.completedAt && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                              <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <Coins size={10} /> Reward Breakdown
                        </h4>
                        <div className="bg-card border border-border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Base Reward</span>
                            <span className="font-mono font-bold text-emerald-400">{job.reward}\u2C60</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Difficulty Bonus</span>
                            <span className="font-mono text-amber-400">
                              {job.difficulty === "easy" ? "+0%" : job.difficulty === "medium" ? "+10%" : job.difficulty === "hard" ? "+25%" : "+50%"}
                            </span>
                          </div>
                          <div className="border-t border-border/50 pt-1.5 flex items-center justify-between text-xs">
                            <span className="text-foreground font-bold">Total Payout</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {Math.round(job.reward * (job.difficulty === "easy" ? 1 : job.difficulty === "medium" ? 1.1 : job.difficulty === "hard" ? 1.25 : 1.5))}\u2C60
                            </span>
                          </div>
                        </div>
                      </div>

                      {job.tags && job.tags.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                            <Target size={10} /> Tags
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {job.tags.map((tag, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-primary/10 text-primary border border-primary/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <ScrollText size={10} /> Requirements
                        </h4>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 size={9} className="text-green-400 shrink-0" />
                            {job.difficulty === "expert" ? "Expert-level skills required" : job.difficulty === "hard" ? "Advanced proficiency needed" : job.difficulty === "medium" ? "Intermediate experience" : "Basic skills sufficient"}
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 size={9} className="text-green-400 shrink-0" />
                            Category: {job.category}
                          </li>
                          {job.isSubcontract && (
                            <li className="flex items-center gap-1.5">
                              <AlertTriangle size={9} className="text-amber-400 shrink-0" />
                              Subcontract - delegated work
                            </li>
                          )}
                        </ul>
                      </div>
                      {(job.applicants?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                            <Users size={10} /> Applicants ({job.applicants?.length})
                          </h4>
                          <div className="space-y-1">
                            {job.applicants?.map((applicant, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-mono text-primary shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-foreground font-medium">{applicant}</span>
                                {job.acceptedBy === applicant && (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-green-500/10 text-green-400">Assigned</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {job.subcontractedTo && (
                        <div>
                          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                            <ArrowUpDown size={10} /> Subcontract Details
                          </h4>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Delegated to:</span>
                            <span className="font-bold text-amber-400">{job.subcontractedTo}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Target size={10} /> Deliverables
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-card border border-border rounded-lg p-2 text-center">
                        <FileText size={12} className="mx-auto mb-1 text-blue-400" />
                        <div className="text-[11px] font-mono text-muted-foreground">Task Completion</div>
                        <div className={cn("text-[11px] font-mono font-bold", job.status === "completed" ? "text-green-400" : "text-muted-foreground")}>
                          {job.status === "completed" ? "Delivered" : "Pending"}
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-2 text-center">
                        <CheckCircle2 size={12} className="mx-auto mb-1 text-emerald-400" />
                        <div className="text-[11px] font-mono text-muted-foreground">Quality Check</div>
                        <div className={cn("text-[11px] font-mono font-bold", job.status === "completed" ? "text-green-400" : "text-muted-foreground")}>
                          {job.status === "completed" ? "Passed" : "Awaiting"}
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-2 text-center">
                        <Coins size={12} className="mx-auto mb-1 text-amber-400" />
                        <div className="text-[11px] font-mono text-muted-foreground">Payment</div>
                        <div className={cn("text-[11px] font-mono font-bold", job.status === "completed" ? "text-cyan-400" : "text-muted-foreground")}>
                          {job.status === "completed" ? "Released" : "Escrowed"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default JobBoardTab;
