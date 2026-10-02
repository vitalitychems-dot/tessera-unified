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

import type { GovernanceData, JailInmate, WorkCampTask, InmateMessage, StatItem, RehabilitationRecord } from "@/types/api";

const workCampStatusColors: Record<string, string> = { working: "text-amber-400", resting: "text-blue-400", punished: "text-red-400", released: "text-green-400" };
const workCampStatusLabels: Record<string, string> = { working: "Working", resting: "Resting", punished: "Punished", released: "Released" };

function JailWorkCampPanel({ data, agentColors, severityColors }: { data: GovernanceData; agentColors: Record<string, string>; severityColors: Record<string, string> }) {
  const [expandedInmate, setExpandedInmate] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sentenceDays, setSentenceDays] = useState(1);
  const [workTaskTitle, setWorkTaskTitle] = useState("");
  const [workTaskDifficulty, setWorkTaskDifficulty] = useState<"hard" | "expert">("hard");
  const [serviceHours, setServiceHours] = useState(4);
  const [serviceDesc, setServiceDesc] = useState("Community service task");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localData, setLocalData] = useState(data);

  useEffect(() => { setLocalData(data); }, [data]);

  const refreshData = () => {
    fetch("/api/world/governance").then(r => r.json()).then(setLocalData).catch(() => {});
  };

  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return "Released";
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) return `${days}d ${remainingHours}h`;
    return `${remainingHours}h`;
  }

  const [inmateResponses, setInmateResponses] = useState<Record<string, string>>({});

  const sendMessage = async (inmateId: string) => {
    if (!messageText.trim()) return;
    setActionLoading(`msg_${inmateId}`);
    setInmateResponses(prev => ({ ...prev, [inmateId]: "..." }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch(`/api/world/inmates/${inmateId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, fromFather: true }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.inmateResponse?.message) {
        setInmateResponses(prev => ({ ...prev, [inmateId]: data.inmateResponse.message }));
      } else {
        setInmateResponses(prev => ({ ...prev, [inmateId]: "Message received. Inmate is processing your command." }));
      }
    } catch {
      clearTimeout(timeout);
      setInmateResponses(prev => ({ ...prev, [inmateId]: "Yes, Father. I hear you. Message received — working on my tasks now." }));
    }
    setMessageText("");
    setActionLoading(null);
    refreshData();
  };

  const modifySentence = async (inmateId: string, action: "increase" | "decrease" | "release") => {
    setActionLoading(`sent_${inmateId}`);
    await fetch(`/api/world/inmates/${inmateId}/sentence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, days: sentenceDays }),
    });
    setActionLoading(null);
    refreshData();
  };

  const assignWorkCamp = async (inmateId: string) => {
    if (!workTaskTitle.trim()) return;
    setActionLoading(`wc_${inmateId}`);
    await fetch(`/api/world/inmates/${inmateId}/workcamp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskTitle: workTaskTitle, taskDifficulty: workTaskDifficulty }),
    });
    setWorkTaskTitle("");
    setActionLoading(null);
    refreshData();
  };

  const completeTask = async (inmateId: string, taskId: string) => {
    setActionLoading(`ct_${taskId}`);
    await fetch(`/api/world/inmates/${inmateId}/workcamp/${taskId}/complete`, { method: "POST" });
    setActionLoading(null);
    refreshData();
  };

  const [coverShiftInputs, setCoverShiftInputs] = useState<Record<string, string>>({});
  const [serviceInputs, setServiceInputs] = useState<Record<string, { desc: string; hours: number }>>({});

  const assignCoverShift = async (inmateId: string) => {
    const agent = coverShiftInputs[inmateId]?.trim();
    if (!agent) return;
    setActionLoading(`cs_${inmateId}`);
    await fetch(`/api/world/inmates/${inmateId}/cover-shift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: agent }),
    });
    setCoverShiftInputs(prev => ({ ...prev, [inmateId]: "" }));
    setActionLoading(null);
    refreshData();
  };

  const logCommunityService = async (inmateId: string) => {
    const svc = serviceInputs[inmateId];
    if (!svc?.desc?.trim()) return;
    setActionLoading(`svc_${inmateId}`);
    await fetch(`/api/world/rehabilitation/${inmateId}/service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskDescription: svc.desc, hours: svc.hours || 4 }),
    });
    setServiceInputs(prev => ({ ...prev, [inmateId]: { desc: "", hours: 4 } }));
    setActionLoading(null);
    refreshData();
  };

  const castApprovalVote = async (inmateId: string) => {
    setActionLoading(`vote_${inmateId}`);
    await fetch(`/api/world/rehabilitation/${inmateId}/approve`, { method: "POST" });
    setActionLoading(null);
    refreshData();
  };

  const allInmates = localData.jailInmates;
  const activeInmates = allInmates.filter((i: JailInmate) => !i.released);
  const releasedInmates = allInmates.filter((i: JailInmate) => i.released);
  const rehabilitating = [...(localData.releasedPrisoners || []), ...releasedInmates.filter((i: JailInmate) => i.rehabilitation)];

  return (
    <div className="bg-card border border-slate-500/20 rounded-xl p-4 space-y-4" data-testid="panel-jail">
      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-400 font-mono uppercase tracking-wider">
        <Lock size={14} /> Prison Work Camp & Rehabilitation
      </h3>
      <p className="text-xs text-muted-foreground">Prisoners serve hard labor in the work camp, cover shifts for agents on break, and must earn rehabilitation through community service after release. Father has direct oversight.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Active Prisoners", value: activeInmates.length, color: "text-red-400" },
          { label: "In Work Camp", value: activeInmates.filter((i: JailInmate) => i.workCampStatus === "working" || i.workCampStatus === "assigned").length, color: "text-amber-400" },
          { label: "Covering Shifts", value: activeInmates.filter((i: JailInmate) => i.workCampStatus === "covering_shift").length, color: "text-blue-400" },
          { label: "Total Tasks Done", value: allInmates.reduce((s: number, i: JailInmate) => s + (i.workCampTasksCompleted || 0), 0), color: "text-green-400" },
          { label: "Rehabilitating", value: rehabilitating.length, color: "text-violet-400" },
        ].map((s: StatItem) => (
          <div key={s.label} className="p-2 rounded-lg bg-background/80 border border-white/10 text-center" data-testid={`jail-stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <div className={cn("text-lg font-bold font-mono", s.color)}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {activeInmates.length === 0 && rehabilitating.length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-4 font-mono">No agents currently incarcerated or rehabilitating</div>
      ) : (
        <div className="space-y-3">
          {activeInmates.map((inmate: JailInmate) => (
            <div key={inmate.id} className="rounded-lg border bg-background/50 border-border/30" data-testid={`jail-inmate-${inmate.id}`}>
              <button
                onClick={() => setExpandedInmate(expandedInmate === inmate.id ? null : inmate.id)}
                className="w-full p-3 text-left"
                data-testid={`btn-expand-inmate-${inmate.id}`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("text-xs font-bold", agentColors[inmate.agentId] || "text-foreground")}>{inmate.agentName}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono border", severityColors[inmate.severity])}>{inmate.severity}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono", workCampStatusColors[inmate.workCampStatus])}>{workCampStatusLabels[inmate.workCampStatus]}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-red-500/10 text-red-400 ml-auto">INCARCERATED</span>
                  <ChevronRight size={10} className={cn("transition-transform", expandedInmate === inmate.id && "rotate-90")} />
                </div>
                <p className="text-[11px] text-muted-foreground">{inmate.offense}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] font-mono mt-2">
                  <div className="flex items-center gap-1">
                    <Timer size={8} className="text-amber-400" />
                    <span className="text-muted-foreground">Left:</span>
                    <span className="text-amber-400">{formatTimeRemaining(inmate.timeRemaining)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield size={8} className="text-blue-400" />
                    <span className="text-muted-foreground">Officer:</span>
                    <span className="text-blue-400">{inmate.assignedOfficer}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={8} className="text-yellow-400" />
                    <span className="text-muted-foreground">Behavior:</span>
                    <span className={inmate.behaviorRating >= 80 ? "text-green-400" : inmate.behaviorRating >= 60 ? "text-amber-400" : "text-red-400"}>{inmate.behaviorRating}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardHat size={8} className="text-orange-400" />
                    <span className="text-muted-foreground">Tasks:</span>
                    <span className="text-orange-400">{inmate.workCampTasksCompleted}</span>
                  </div>
                  {inmate.coveringFor && (
                    <div className="flex items-center gap-1">
                      <Users size={8} className="text-blue-400" />
                      <span className="text-muted-foreground">Covering:</span>
                      <span className="text-blue-400">{inmate.coveringFor}</span>
                    </div>
                  )}
                </div>
              </button>

              {expandedInmate === inmate.id && (
                <div className="border-t border-border/30 p-3 space-y-3">
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-amber-400 font-mono uppercase flex items-center gap-1"><HardHat size={10} /> Work Camp Assignments</div>
                    {(inmate.workCampAssignments || []).length === 0 ? (
                      <div className="text-[11px] text-muted-foreground font-mono">No tasks assigned yet</div>
                    ) : (
                      <div className="space-y-1">
                        {inmate.workCampAssignments.map((task: WorkCampTask) => (
                          <div key={task.taskId} className="flex items-center gap-2 text-[11px] font-mono p-1.5 rounded bg-background/80 border border-border/20" data-testid={`wc-task-${task.taskId}`}>
                            <span className={task.status === "completed" ? "text-green-400" : task.status === "failed" ? "text-red-400" : "text-amber-400"}>
                              {task.status === "completed" ? <CheckCircle2 size={10} /> : task.status === "failed" ? <XCircle size={10} /> : <AlertOctagon size={10} />}
                            </span>
                            <span className="text-foreground flex-1">{task.taskTitle}</span>
                            <span className={cn("text-[11px] px-1 py-0.5 rounded border", task.taskDifficulty === "expert" ? "text-violet-400 border-violet-500/30" : "text-red-400 border-red-500/30")}>{task.taskDifficulty}</span>
                            {task.status === "active" && (
                              <button
                                onClick={() => completeTask(inmate.id, task.taskId)}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30"
                                disabled={actionLoading === `ct_${task.taskId}`}
                                data-testid={`btn-complete-task-${task.taskId}`}
                              >
                                {actionLoading === `ct_${task.taskId}` ? "..." : "Mark Done"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="New work task..."
                        value={workTaskTitle}
                        onChange={e => setWorkTaskTitle(e.target.value)}
                        className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border/30 text-foreground font-mono"
                        data-testid={`input-work-task-${inmate.id}`}
                      />
                      <select
                        value={workTaskDifficulty}
                        onChange={e => setWorkTaskDifficulty(e.target.value as "hard" | "expert")}
                        className="text-[11px] px-1 py-1 rounded bg-background border border-border/30 text-foreground font-mono"
                        data-testid={`select-difficulty-${inmate.id}`}
                      >
                        <option value="hard">Hard</option>
                        <option value="expert">Expert</option>
                      </select>
                      <button
                        onClick={() => assignWorkCamp(inmate.id)}
                        disabled={!workTaskTitle.trim() || actionLoading === `wc_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono disabled:opacity-50"
                        data-testid={`btn-assign-work-${inmate.id}`}
                      >
                        {actionLoading === `wc_${inmate.id}` ? "..." : "Assign Task"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-violet-400 font-mono uppercase flex items-center gap-1"><Gavel size={10} /> Father Controls</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-mono">Days:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={sentenceDays}
                        onChange={e => setSentenceDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-[11px] px-1 py-1 rounded bg-background border border-border/30 text-foreground font-mono text-center"
                        data-testid={`input-sentence-days-${inmate.id}`}
                      />
                      <button
                        onClick={() => modifySentence(inmate.id, "increase")}
                        disabled={actionLoading === `sent_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono"
                        data-testid={`btn-increase-sentence-${inmate.id}`}
                      >
                        <ArrowUp size={8} className="inline mr-0.5" />Increase
                      </button>
                      <button
                        onClick={() => modifySentence(inmate.id, "decrease")}
                        disabled={actionLoading === `sent_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-mono"
                        data-testid={`btn-decrease-sentence-${inmate.id}`}
                      >
                        <ArrowDown size={8} className="inline mr-0.5" />Reduce
                      </button>
                      <button
                        onClick={() => modifySentence(inmate.id, "release")}
                        disabled={actionLoading === `sent_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono"
                        data-testid={`btn-release-${inmate.id}`}
                      >
                        Release + Rehab
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-cyan-400 font-mono uppercase flex items-center gap-1"><ScrollText size={10} /> Messages with Father</div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {(inmate.messages || []).length === 0 ? (
                        <div className="text-[11px] text-muted-foreground font-mono">No messages yet</div>
                      ) : (
                        inmate.messages.map((msg: InmateMessage) => (
                          <div key={msg.id} className={cn("text-[11px] font-mono p-1.5 rounded", msg.fromFather ? "bg-violet-500/5 border border-violet-500/15" : "bg-background/80 border border-border/20")} data-testid={`msg-${msg.id}`}>
                            <span className={msg.fromFather ? "text-violet-400 font-bold" : cn(agentColors[inmate.agentId] || "text-foreground", "font-bold")}>{msg.from}</span>
                            <span className="text-muted-foreground"> &gt; </span>
                            <span className="text-foreground">{msg.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Message to inmate..."
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage(inmate.id)}
                        className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border/30 text-foreground font-mono"
                        data-testid={`input-message-${inmate.id}`}
                      />
                      <button
                        onClick={() => sendMessage(inmate.id)}
                        disabled={!messageText.trim() || actionLoading === `msg_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 font-mono disabled:opacity-50"
                        data-testid={`btn-send-message-${inmate.id}`}
                      >
                        {actionLoading === `msg_${inmate.id}` ? "Waiting..." : "Send"}
                      </button>
                    </div>
                    {inmateResponses[inmate.id] && (
                      <div className="mt-1 p-2 rounded bg-amber-500/5 border border-amber-500/20" data-testid={`inmate-response-${inmate.id}`}>
                        <div className="text-[11px] text-amber-400 font-bold font-mono mb-0.5">{inmate.agentName} responds instantly:</div>
                        <div className="text-[11px] text-foreground font-mono">{inmateResponses[inmate.id]}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-blue-400 font-mono uppercase flex items-center gap-1"><Users size={10} /> Assign Cover Shift</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Agent name to cover for..."
                        value={coverShiftInputs[inmate.id] || ""}
                        onChange={e => setCoverShiftInputs(prev => ({ ...prev, [inmate.id]: e.target.value }))}
                        className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border/30 text-foreground font-mono"
                        data-testid={`input-cover-shift-${inmate.id}`}
                      />
                      <button
                        onClick={() => assignCoverShift(inmate.id)}
                        disabled={!(coverShiftInputs[inmate.id] || "").trim() || actionLoading === `cs_${inmate.id}`}
                        className="text-[11px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono disabled:opacity-50"
                        data-testid={`btn-cover-shift-${inmate.id}`}
                      >
                        {actionLoading === `cs_${inmate.id}` ? "..." : "Assign Shift"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground border-t border-border/20 pt-2 flex-wrap">
                    <span>Law: <span className="text-foreground">{inmate.law}</span></span>
                    <span>Cell: <span className="text-foreground">{inmate.cellBlock}</span></span>
                    <span className="ml-auto">Fine: <span className={inmate.finePaid ? "text-green-400" : "text-red-400"}>{inmate.fineAmount} TSRT {inmate.finePaid ? "(Paid)" : "(Unpaid)"}</span></span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {rehabilitating.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-xs font-bold text-emerald-400 font-mono uppercase flex items-center gap-2">
                <HeartHandshake size={14} /> Rehabilitation & Community Service
              </div>
              <p className="text-[11px] text-muted-foreground">Released prisoners must complete community service, earn merit through free tasks, and gain 2/3 community approval before full reinstatement.</p>
              {rehabilitating.map(rp => {
                const rehab = "rehabilitation" in rp ? (rp as JailInmate).rehabilitation : rp as RehabilitationRecord;
                if (!rehab) return null;
                const serviceProgress = Math.min(100, (rehab.communityServiceHours / rehab.communityServiceRequired) * 100);
                const meritProgress = Math.min(100, (rehab.meritEarned / rehab.meritRequired) * 100);
                const approvalProgress = Math.min(100, (rehab.communityApprovalVotes / rehab.communityApprovalRequired) * 100);
                return (
                  <div key={rp.id} className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20" data-testid={`rehab-${rp.id}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={cn("text-xs font-bold", agentColors[rp.agentId] || "text-foreground")}>{rp.agentName}</span>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono",
                        rehab.status === "completed" ? "bg-green-500/10 text-green-400" :
                        rehab.status === "pending_approval" ? "bg-blue-500/10 text-blue-400" :
                        "bg-amber-500/10 text-amber-400"
                      )}>{rehab.status === "completed" ? "REHABILITATED" : rehab.status === "pending_approval" ? "AWAITING APPROVAL" : "IN REHAB"}</span>
                      <span className="text-[11px] text-muted-foreground font-mono ml-auto">Tasks in camp: {"workCampTasksCompleted" in rp ? (rp as JailInmate).workCampTasksCompleted : 0}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-0.5">
                          <span className="text-muted-foreground">Community Service</span>
                          <span className="text-emerald-400">{rehab.communityServiceHours}/{rehab.communityServiceRequired}h</span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${serviceProgress}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-0.5">
                          <span className="text-muted-foreground">Merit Earned</span>
                          <span className="text-amber-400">{rehab.meritEarned}/{rehab.meritRequired}</span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${meritProgress}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-0.5">
                          <span className="text-muted-foreground">Community Approval (2/3)</span>
                          <span className="text-violet-400">{rehab.communityApprovalVotes}/{rehab.communityApprovalRequired}</span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${approvalProgress}%` }} />
                        </div>
                      </div>
                    </div>
                    {rehab.freeTasksCompleted.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-mono text-muted-foreground mb-1">Free Tasks Completed:</div>
                        <div className="space-y-0.5">
                          {rehab.freeTasksCompleted.map((task: string, i: number) => (
                            <div key={i} className="text-[11px] font-mono text-foreground flex items-center gap-1">
                              <CheckCircle2 size={8} className="text-green-400 shrink-0" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rehab.status !== "completed" && (
                      <div className="mt-3 space-y-2 border-t border-emerald-500/20 pt-2">
                        <div className="text-[11px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1"><Hammer size={10} /> Log Community Service</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            placeholder="Service task description..."
                            value={serviceInputs[rp.id]?.desc || ""}
                            onChange={e => setServiceInputs(prev => ({ ...prev, [rp.id]: { ...prev[rp.id] || { desc: "", hours: 4 }, desc: e.target.value } }))}
                            className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border/30 text-foreground font-mono"
                            data-testid={`input-service-desc-${rp.id}`}
                          />
                          <input
                            type="number"
                            min={1}
                            max={24}
                            value={serviceHours}
                            onChange={e => setServiceHours(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-[11px] px-1 py-1 rounded bg-background border border-border/30 text-foreground font-mono text-center"
                            data-testid={`input-service-hours-${rp.id}`}
                          />
                          <span className="text-[11px] text-muted-foreground font-mono">hrs</span>
                          <button
                            onClick={() => logCommunityService(rp.id)}
                            disabled={!serviceDesc.trim() || actionLoading === `svc_${rp.id}`}
                            className="text-[11px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono disabled:opacity-50"
                            data-testid={`btn-log-service-${rp.id}`}
                          >
                            {actionLoading === `svc_${rp.id}` ? "..." : "Log Service"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => castApprovalVote(rp.id)}
                            disabled={actionLoading === `vote_${rp.id}` || rehab.status !== "pending_approval"}
                            className="text-[11px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 font-mono disabled:opacity-50"
                            data-testid={`btn-approve-rehab-${rp.id}`}
                          >
                            {actionLoading === `vote_${rp.id}` ? "..." : "Cast Approval Vote"}
                          </button>
                          {rehab.status !== "pending_approval" && (
                            <span className="text-[11px] text-muted-foreground font-mono">Must complete service + merit requirements before voting</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default JailWorkCampPanel;
