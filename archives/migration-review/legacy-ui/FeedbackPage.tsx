import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, TrendingUp, ThumbsUp, ThumbsDown, Minus, Send,
  Loader2, BarChart3, Tag, RefreshCw, CheckCircle2, AlertTriangle, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "agents", label: "AI Agents" },
  { id: "performance", label: "Performance" },
  { id: "community", label: "Community" },
  { id: "transparency", label: "Transparency" },
  { id: "documentation", label: "Documentation" },
  { id: "ui", label: "UI/UX" },
  { id: "api", label: "API" },
];

function SentimentBadge({ sentiment, score }: { sentiment: string; score: number }) {
  if (sentiment === "positive") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
      <ThumbsUp size={9} /> Positive · {Math.round(score * 100)}%
    </span>
  );
  if (sentiment === "negative") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-400">
      <ThumbsDown size={9} /> Negative · {Math.round(score * 100)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
      <Minus size={9} /> Neutral · {Math.round(score * 100)}%
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function FeedbackPage({ embedded }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/ux/feedback"],
    refetchInterval: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: (body: { text: string; category: string }) =>
      apiRequest("POST", "/api/ux/feedback", body),
    onSuccess: () => {
      setFeedbackText("");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/ux/feedback"] });
      toast({ title: "Feedback submitted", description: "Thank you! Your input helps us improve Tess." });
      setTimeout(() => setSubmitted(false), 4000);
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!feedbackText.trim() || feedbackText.trim().length < 3) return;
    submitMutation.mutate({ text: feedbackText.trim(), category: selectedCategory });
  };

  const sentiment = data?.sentiment || { positive: 0, negative: 0, neutral: 0, averageScore: 0 };
  const topIssues: any[] = data?.topIssues || [];
  const weeklyTrend: any[] = data?.weeklyTrend || [];
  const recentFeedback: any[] = data?.recent || [];
  const total = data?.total || 0;

  const positiveRate = total > 0 ? Math.round((sentiment.positive / total) * 100) : 0;
  const negativeRate = total > 0 ? Math.round((sentiment.negative / total) * 100) : 0;
  const maxDayCount = Math.max(...weeklyTrend.map((d: any) => d.total || 0), 1);

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24 md:pb-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare size={20} className="text-violet-400" />
              Feedback
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Submit feedback and track sentiment trends</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={11} className={isRefetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Submit Feedback</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all",
                  selectedCategory === cat.id
                    ? "border-violet-500/60 bg-violet-500/20 text-violet-300"
                    : "border-border/40 bg-black/20 text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Tell us what's working, what's broken, or what you'd like to see..."
            rows={4}
            className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/40 resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{feedbackText.length} chars</span>
            {submitted ? (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <CheckCircle2 size={12} /> Submitted!
              </span>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || feedbackText.trim().length < 3}
                size="sm"
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submitMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/30 bg-black/20 p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{total}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Total Feedback</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{positiveRate}%</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Positive</div>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{negativeRate}%</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Negative</div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{Math.round((sentiment.averageScore || 0) * 100)}%</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Avg Score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/30 bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-cyan-400" />
                  <span className="text-sm font-semibold text-foreground">7-Day Trend</span>
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {weeklyTrend.map((day: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${Math.round((day.total / maxDayCount) * 80) + 4}px` }}>
                        <div className="w-full bg-emerald-500/60 rounded-sm" style={{ height: `${day.positiveRatio}%` }} />
                        <div className="w-full bg-red-500/40 flex-1 rounded-sm" />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> Positive</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40" /> Negative</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">Top Issues</span>
                </div>
                {topIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues yet</p>
                ) : (
                  <div className="space-y-2">
                    {topIssues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-foreground/80 flex-1 capitalize">{issue.tag.replace(/-/g, " ")}</span>
                        <div className="h-1.5 w-20 bg-black/30 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${Math.min(100, (issue.count / Math.max(...topIssues.map((ti: any) => ti.count))) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono w-4 text-right">{issue.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/30 bg-black/20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
                <MessageSquare size={13} className="text-violet-400" />
                <span className="text-sm font-semibold text-foreground">Recent Feedback</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{recentFeedback.length} entries</span>
              </div>
              <div className="divide-y divide-border/10">
                {recentFeedback.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No feedback yet. Be the first!</div>
                ) : recentFeedback.map((entry: any) => (
                  <div key={entry.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SentimentBadge sentiment={entry.sentiment} score={entry.sentimentScore} />
                      <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-0.5 rounded border border-border/30 capitalize">{entry.category}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(entry.submittedAt)}</span>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{entry.text}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {entry.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-border/20 text-muted-foreground capitalize">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      
      {content}
    </div>
  );
}
