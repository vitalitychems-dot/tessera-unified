import { useState } from "react";
import { User, Send, ThumbsUp, ThumbsDown, RotateCcw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  label: string;
  description: string;
  type: "approve" | "reject" | "modify" | "escalate";
  pending?: boolean;
}

interface HumanActionPanelProps {
  title?: string;
  description?: string;
  actions?: Action[];
  onAction?: (actionId: string) => void;
  className?: string;
}

const DEFAULT_ACTIONS: Action[] = [
  { id: "approve", label: "Approve", description: "Accept and execute this sovereign directive", type: "approve" },
  { id: "reject", label: "Reject", description: "Block execution of this directive", type: "reject" },
  { id: "modify", label: "Request Modification", description: "Ask Tessera to revise before execution", type: "modify" },
];

const ACTION_STYLES: Record<string, { text: string; bg: string; border: string; hoverBg: string; Icon: any }> = {
  approve: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", hoverBg: "hover:bg-emerald-500/20", Icon: ThumbsUp },
  reject: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", hoverBg: "hover:bg-red-500/20", Icon: ThumbsDown },
  modify: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", hoverBg: "hover:bg-amber-500/20", Icon: RotateCcw },
  escalate: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25", hoverBg: "hover:bg-violet-500/20", Icon: MessageSquare },
};

export default function HumanActionPanel({
  title = "Human Action Required",
  description = "Tessera requires your approval to proceed with this sovereign directive.",
  actions = DEFAULT_ACTIONS,
  onAction,
  className,
}: HumanActionPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleAction = (id: string) => {
    setSelected(id);
    onAction?.(id);
  };

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    onAction?.(selected);
  };

  if (submitted) {
    return (
      <div className={cn("rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex items-center gap-3", className)}>
        <ThumbsUp size={16} className="text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-medium text-emerald-400">Response Submitted</div>
          <div className="text-xs text-slate-500">Your decision has been recorded and Tessera will act accordingly.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3", className)}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <User size={14} className="text-amber-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-400">{title}</div>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {actions.map(action => {
          const s = ACTION_STYLES[action.type];
          const ActionIcon = s.Icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                s.bg, s.border, s.hoverBg,
                selected === action.id && "ring-1 ring-current opacity-100",
                selected && selected !== action.id && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <ActionIcon size={12} className={s.text} />
                <span className={cn("text-xs font-semibold", s.text)}>{action.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">{action.description}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            rows={2}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-white/20 resize-none"
          />
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 font-mono transition-all"
          >
            <Send size={12} />
            Submit Response
          </button>
        </div>
      )}
    </div>
  );
}
