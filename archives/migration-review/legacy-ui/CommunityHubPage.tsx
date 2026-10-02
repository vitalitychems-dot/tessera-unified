import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users, MessageSquare, Search, Plus, ThumbsUp, CheckCircle2, Pin,
  Loader2, RefreshCw, BookOpen, BarChart3, Tag, Clock, ArrowLeft,
  Send, ChevronRight, Star, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "technical", label: "Technical" },
  { id: "feature-request", label: "Feature Requests" },
  { id: "announcements", label: "Announcements" },
  { id: "help", label: "Help & Support" },
  { id: "feedback", label: "Feedback" },
];

const CATEGORY_COLORS: Record<string, string> = {
  technical: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  "feature-request": "text-violet-400 border-violet-500/30 bg-violet-500/10",
  announcements: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  help: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  feedback: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  general: "text-blue-400 border-blue-500/30 bg-blue-500/10",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function ThreadCard({ thread, onClick }: { thread: any; onClick: () => void }) {
  const catCls = CATEGORY_COLORS[thread.category] || CATEGORY_COLORS.general;
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/30 bg-black/20 hover:bg-white/5 hover:border-border/50 transition-all p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {thread.pinned && <Pin size={10} className="text-amber-400 shrink-0" />}
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize", catCls)}>
              {thread.category}
            </span>
            {thread.solved && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={9} /> Solved
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{thread.title}</h3>
          <p className="text-[12px] text-muted-foreground line-clamp-2">{thread.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="font-mono text-foreground/60">{thread.author}</span>
            <span className="flex items-center gap-1"><MessageSquare size={9} /> {thread.replies?.length || 0}</span>
            <span className="flex items-center gap-1"><Activity size={9} /> {thread.views}</span>
            <span className="flex items-center gap-1 ml-auto"><Clock size={9} /> {timeAgo(thread.updatedAt)}</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );
}

function ThreadView({ thread, onBack }: { thread: any; onBack: () => void }) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [authorName, setAuthorName] = useState("anonymous");

  const { data: fullThread, isLoading } = useQuery<any>({
    queryKey: ["/api/ux/community/threads", thread.id],
    queryFn: () => fetch(`/api/ux/community/threads/${thread.id}`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const replyMutation = useMutation({
    mutationFn: (body: { content: string; author: string }) =>
      apiRequest("POST", `/api/ux/community/threads/${thread.id}/replies`, body),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/ux/community/threads", thread.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/ux/community/threads"] });
      toast({ title: "Reply posted!" });
    },
    onError: () => toast({ title: "Failed to post reply", variant: "destructive" }),
  });

  const upvoteMutation = useMutation({
    mutationFn: (replyId: string) =>
      apiRequest("POST", `/api/ux/community/threads/${thread.id}/replies/${replyId}/upvote`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ux/community/threads", thread.id] }),
  });

  const t = fullThread || thread;
  const catCls = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/20 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-border/30 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {t.pinned && <Pin size={10} className="text-amber-400" />}
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize", catCls)}>{t.category}</span>
            {t.solved && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1"><CheckCircle2 size={9} /> Solved</span>}
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">{t.title}</h2>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{t.content}</p>
          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
            <span className="font-mono text-foreground/70">{t.author}</span>
            <span>{timeAgo(t.createdAt)}</span>
            {t.tags?.length > 0 && (
              <div className="flex gap-1">
                {t.tags.map((tag: string) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded border border-border/20 bg-white/5 text-[9px] font-mono">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && !fullThread && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-emerald-400" />
          </div>
        )}

        {(t.replies || []).length > 0 && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider px-1">
              {t.replies.length} {t.replies.length === 1 ? "Reply" : "Replies"}
            </div>
            {(t.replies || []).map((reply: any) => (
              <div
                key={reply.id}
                className={cn(
                  "rounded-xl border p-4",
                  reply.isBestAnswer
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border/30 bg-black/20"
                )}
              >
                {reply.isBestAnswer && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono mb-2">
                    <Star size={10} /> Best Answer
                  </div>
                )}
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] font-mono text-foreground/60">{reply.author}</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  <button
                    onClick={() => upvoteMutation.mutate(reply.id)}
                    disabled={upvoteMutation.isPending}
                    className="ml-auto flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    <ThumbsUp size={10} /> {reply.upvotes}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border/30 bg-black/20 p-4 space-y-3">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Post a Reply</div>
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
          />
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            rows={3}
            className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40 resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => replyMutation.mutate({ content: replyText.trim(), author: authorName.trim() || "anonymous" })}
              disabled={replyMutation.isPending || !replyText.trim()}
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {replyMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Post Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewThreadForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("anonymous");
  const [category, setCategory] = useState("general");
  const [tagsInput, setTagsInput] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/ux/community/threads", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ux/community/threads"] });
      toast({ title: "Thread created!" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create thread", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    const tags = tagsInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    createMutation.mutate({ title: title.trim(), content: content.trim(), author: author.trim() || "anonymous", category, tags });
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Plus size={14} className="text-emerald-400" />
        <span className="text-sm font-semibold text-foreground">New Thread</span>
        <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-sm">Cancel</button>
      </div>
      <input
        value={author}
        onChange={e => setAuthor(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
      />
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Thread title..."
        className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        className="w-full bg-black/30 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40 resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-black/30 border border-border/40 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-emerald-500/40"
        >
          {CATEGORIES.filter(c => c.id !== "all").map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <input
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="Tags (comma separated)"
          className="bg-black/30 border border-border/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !title.trim() || !content.trim()}
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Create Thread
        </Button>
      </div>
    </div>
  );
}

export default function CommunityHubPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [docSearch, setDocSearch] = useState("");

  const threadsQuery = useQuery<any>({
    queryKey: ["/api/ux/community/threads", selectedCategory, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "30" });
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      return fetch(`/api/ux/community/threads?${params}`).then(r => r.json());
    },
    refetchInterval: 30000,
  });

  const docsQuery = useQuery<any>({
    queryKey: ["/api/ux/community/docs", docSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (docSearch) params.set("search", docSearch);
      return fetch(`/api/ux/community/docs?${params}`).then(r => r.json());
    },
  });

  const threads: any[] = threadsQuery.data?.threads || [];
  const topContributors: any[] = threadsQuery.data?.topContributors || [];
  const metrics: any = threadsQuery.data?.engagementMetrics || {};
  const docs: any[] = docsQuery.data?.docs || [];

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {selectedThread ? (
        <ThreadView thread={selectedThread} onBack={() => setSelectedThread(null)} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24 md:pb-5">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Users size={20} className="text-emerald-400" />
                Community Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Forums, documentation, and engagement metrics</p>
            </div>
            <button
              onClick={() => threadsQuery.refetch()}
              disabled={threadsQuery.isRefetching}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw size={11} className={threadsQuery.isRefetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="flex gap-1 border-b border-border/20 pb-1">
            {(["forum", "docs", "metrics"] as const).map(tab => (
              <button
                key={tab}
                
                className={cn(
                  "text-sm px-4 py-1.5 rounded-t-lg transition-all font-medium capitalize",
                  activeTab === tab
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "docs" ? "Documentation" : tab === "metrics" ? "Dashboard" : "Forum"}
              </button>
            ))}
          </div>

          {(
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search threads..."
                    className="w-full bg-black/30 border border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <Button
                  onClick={() => setShowNewThread(v => !v)}
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Plus size={12} />
                  New Thread
                </Button>
              </div>

              {showNewThread && <NewThreadForm onClose={() => setShowNewThread(false)} />}

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all",
                      selectedCategory === cat.id
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                        : "border-border/40 bg-black/20 text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {threadsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-emerald-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {threads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No threads yet. Start the conversation!
                    </div>
                  ) : threads.map((thread: any) => (
                    <ThreadCard key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
                  ))}
                </div>
              )}
            </>
          )}

          {(
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  placeholder="Search documentation..."
                  className="w-full bg-black/30 border border-border/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="space-y-2">
                {docs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No docs found</div>
                ) : docs.map((doc: any) => (
                  <div key={doc.id} className="rounded-xl border border-border/30 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{doc.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] font-mono text-cyan-400/70 border border-cyan-500/20 px-1.5 py-0.5 rounded bg-cyan-500/5 capitalize">{doc.module}</span>
                          {doc.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-mono text-muted-foreground border border-border/20 px-1.5 py-0.5 rounded bg-white/5">{tag}</span>
                          ))}
                          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1"><Activity size={9} /> {doc.views} views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Threads", value: metrics.totalThreads || 0, icon: MessageSquare, color: "text-emerald-400" },
                  { label: "Replies", value: metrics.totalReplies || 0, icon: MessageSquare, color: "text-cyan-400" },
                  { label: "Total Views", value: metrics.totalViews || 0, icon: Activity, color: "text-violet-400" },
                  { label: "Solved", value: metrics.solvedCount || 0, icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "This Week (Threads)", value: metrics.recentThreads || 0, icon: BarChart3, color: "text-amber-400" },
                  { label: "This Week (Replies)", value: metrics.recentReplies || 0, icon: BarChart3, color: "text-amber-400" },
                ].map((stat, i) => (
                  <div key={i} className="rounded-lg border border-border/30 bg-black/20 p-3 text-center">
                    <stat.icon size={14} className={cn("mx-auto mb-1", stat.color)} />
                    <div className="text-xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {topContributors.length > 0 && (
                <div className="rounded-xl border border-border/30 bg-black/20">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
                    <Star size={13} className="text-amber-400" />
                    <span className="text-sm font-semibold text-foreground">Top Contributors</span>
                  </div>
                  <div className="divide-y divide-border/10">
                    {topContributors.map((c: any, i: number) => (
                      <div key={c.author} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-400">
                          {i + 1}
                        </div>
                        <span className="font-mono text-sm text-foreground flex-1">{c.author}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{c.threads}T</span>
                          <span>{c.replies}R</span>
                          <span className="text-emerald-400 font-bold">{c.score}pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/30 bg-black/20 p-4">
                <div className="text-sm font-semibold text-foreground mb-3">Activity Overview</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground flex-1">Avg replies per thread</span>
                    <span className="font-mono text-foreground">{metrics.avgRepliesPerThread || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground flex-1">Problem resolution rate</span>
                    <span className="font-mono text-emerald-400">
                      {metrics.totalThreads > 0 ? Math.round((metrics.solvedCount / metrics.totalThreads) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      
      {content}
    </div>
  );
}
