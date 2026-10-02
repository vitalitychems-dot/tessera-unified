import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponseFeedbackProps {
  messageId?: string;
  onFeedback?: (type: "positive" | "negative", comment?: string) => void;
  className?: string;
  compact?: boolean;
}

export default function ResponseFeedback({ messageId, onFeedback, className, compact = false }: ResponseFeedbackProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    if (type === "negative") {
      setShowComment(true);
    } else {
      onFeedback?.(type);
      setSubmitted(true);
    }
  };

  const submitWithComment = () => {
    if (!feedback) return;
    onFeedback?.(feedback, comment);
    setSubmitted(true);
    setShowComment(false);
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-1.5 text-[10px] text-emerald-400/70 font-mono", className)}>
        <CheckCheck size={11} />
        <span>Feedback recorded</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <button
          onClick={() => handleFeedback("positive")}
          className={cn("p-1 rounded-lg hover:bg-emerald-500/10 transition-colors", feedback === "positive" ? "text-emerald-400" : "text-slate-600 hover:text-emerald-400")}
          title="Good response"
        >
          <ThumbsUp size={11} />
        </button>
        <button
          onClick={() => handleFeedback("negative")}
          className={cn("p-1 rounded-lg hover:bg-red-500/10 transition-colors", feedback === "negative" ? "text-red-400" : "text-slate-600 hover:text-red-400")}
          title="Bad response"
        >
          <ThumbsDown size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-600 font-mono">Was this helpful?</span>
        <button
          onClick={() => handleFeedback("positive")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all",
            feedback === "positive"
              ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
              : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:border-emerald-500/20 hover:text-emerald-400"
          )}
        >
          <ThumbsUp size={10} />
          Yes
        </button>
        <button
          onClick={() => handleFeedback("negative")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all",
            feedback === "negative"
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:border-red-500/20 hover:text-red-400"
          )}
        >
          <ThumbsDown size={10} />
          No
        </button>
      </div>

      {showComment && (
        <div className="space-y-2 pl-2 border-l border-red-500/20">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What could be improved? (optional)"
            rows={2}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-white/20 resize-none"
          />
          <button
            onClick={submitWithComment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 font-mono transition-all"
          >
            <MessageSquare size={11} />
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
