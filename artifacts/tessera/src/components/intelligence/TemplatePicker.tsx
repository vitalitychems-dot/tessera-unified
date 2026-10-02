import { cn } from "@/lib/utils";
import { Brain, Zap, Shield, Sparkles, Target, Layers } from "lucide-react";

interface TemplatePickerProps {
  currentGoal: string;
  onRunGoal: (goal: string) => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  className?: string;
}

const TEMPLATES = [
  { id: "chain-of-thought", name: "Chain of Thought", description: "Step-by-step logical reasoning", icon: Brain, color: "violet", goal: "Analyze and reason through the problem step by step" },
  { id: "rapid-response", name: "Rapid Response", description: "Fast single-hop inference", icon: Zap, color: "amber", goal: "Provide a fast, direct answer" },
  { id: "adversarial", name: "Adversarial Check", description: "Devil's advocate reasoning", icon: Shield, color: "red", goal: "Challenge assumptions and find counter-arguments" },
  { id: "creative-synthesis", name: "Creative Synthesis", description: "Cross-domain idea generation", icon: Sparkles, color: "cyan", goal: "Combine ideas from multiple domains creatively" },
  { id: "precision-analysis", name: "Precision Analysis", description: "Deep factual accuracy", icon: Target, color: "emerald", goal: "Verify facts with high accuracy and confidence scoring" },
  { id: "multi-agent", name: "Multi-Agent Deliberation", description: "Council-based consensus", icon: Layers, color: "purple", goal: "Deliberate across multiple agent perspectives for consensus" },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", hover: "hover:border-violet-500/50" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", hover: "hover:border-amber-500/50" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", hover: "hover:border-red-500/50" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", hover: "hover:border-cyan-500/50" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", hover: "hover:border-emerald-500/50" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", hover: "hover:border-purple-500/50" },
};

export function TemplatePicker({ currentGoal, onRunGoal, templateName, onTemplateNameChange, className }: TemplatePickerProps) {
  return (
    <div className={cn("space-y-2", className)} data-testid="template-picker">
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Reasoning Templates</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const c = colorClasses[t.color] || colorClasses.violet;
          const isActive = templateName === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                onTemplateNameChange(isActive ? "" : t.id);
                if (!isActive && !currentGoal) {
                  onRunGoal(t.goal);
                }
              }}
              className={cn(
                "text-left p-3 rounded-xl border transition-all",
                isActive ? cn(c.bg, c.border, "shadow-sm") : cn("bg-black/20 border-white/[0.06]", c.hover)
              )}
              data-testid={`template-${t.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <t.icon size={14} className={c.text} />
                <span className={cn("text-xs font-bold", isActive ? c.text : "text-foreground/80")}>{t.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
