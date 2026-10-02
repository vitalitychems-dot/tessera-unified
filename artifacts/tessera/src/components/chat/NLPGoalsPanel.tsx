import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNLPGoals } from "@/lib/nlpGoalsContext";
import { cn } from "@/lib/utils";

export function NLPGoalsPanel() {
  const { goalsRaw, goals, nlpActive, setGoalsRaw, setNlpActive } = useNLPGoals();
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto mb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border",
            nlpActive && goals.length > 0
              ? "text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15"
              : "text-white/30 border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:text-white/50"
          )}
          data-testid="button-nlp-panel-toggle"
          title="NLP Goal Reinforcement"
        >
          <Brain
            size={11}
            className={cn(
              "transition-all",
              nlpActive && goals.length > 0 ? "text-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.8)]" : "text-white/30"
            )}
          />
          <span className="hidden sm:inline">
            {goals.length > 0 ? `NLP · ${goals.length}` : "NLP"}
          </span>
          {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
        </button>

        {nlpActive && goals.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {goals.slice(0, 4).map((g, i) => {
              const colors = ["text-violet-400", "text-cyan-400", "text-amber-400", "text-emerald-400", "text-rose-400"];
              return (
                <span key={i} className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] shrink-0", colors[i % colors.length])}>
                  {g}
                </span>
              );
            })}
            {goals.length > 4 && (
              <span className="text-[10px] text-white/20 font-mono shrink-0">+{goals.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-1.5"
          >
            <div className="rounded-xl border border-violet-500/20 bg-black/60 backdrop-blur-xl p-3" data-testid="nlp-goals-panel">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={12} className="text-violet-400" />
                <span className="text-[11px] font-mono text-violet-300 tracking-wider uppercase">NLP Goal Reinforcement</span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setNlpActive(!nlpActive)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono border transition-all",
                    nlpActive
                      ? "text-violet-300 border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/20"
                      : "text-white/30 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/50"
                  )}
                  data-testid="button-nlp-active-toggle"
                >
                  {nlpActive ? "ACTIVE" : "PAUSED"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-white/20 hover:text-white/60 transition-colors ml-1"
                  data-testid="button-nlp-panel-close"
                >
                  <X size={12} />
                </button>
              </div>

              <p className="text-[10px] text-white/30 mb-2 leading-relaxed">
                Enter your daily intentions as comma-separated terms. All assistant responses will subtly highlight related words to reinforce your programs.
              </p>

              <textarea
                value={goalsRaw}
                onChange={(e) => setGoalsRaw(e.target.value)}
                placeholder="e.g. discipline, financial sovereignty, focus, confidence, abundance"
                className="w-full bg-white/[0.03] border border-violet-500/20 rounded-lg px-3 py-2 text-[12px] text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/40 font-mono leading-relaxed"
                rows={2}
                data-testid="input-nlp-goals"
              />

              {goals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {goals.map((g, i) => {
                    const colorSets = [
                      { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                      { text: "text-cyan-300",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20"   },
                      { text: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
                      { text: "text-emerald-300",bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
                      { text: "text-rose-300",   bg: "bg-rose-500/10",   border: "border-rose-500/20"   },
                    ];
                    const cs = colorSets[i % colorSets.length];
                    return (
                      <span key={i} className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", cs.text, cs.bg, cs.border)}>
                        {g}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
