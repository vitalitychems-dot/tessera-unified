import { useState, useEffect } from "react";
import { Brain, Plus, Trash2, Zap, Target, Eye, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNLPGoals } from "@/lib/nlpGoalsContext";

const NLP_METHODS = [
  { id: "anchoring", name: "Anchoring", desc: "Associate a specific state/feeling with a trigger word or phrase", color: "text-cyan-400" },
  { id: "reframing", name: "Reframing", desc: "Change the meaning of an experience by shifting perspective", color: "text-violet-400" },
  { id: "embedded-commands", name: "Embedded Commands", desc: "Hide commands within larger sentences for subconscious processing", color: "text-amber-400" },
  { id: "presuppositions", name: "Presuppositions", desc: "Assume the desired state is already true in language patterns", color: "text-emerald-400" },
  { id: "swish-pattern", name: "Swish Pattern", desc: "Replace unwanted mental images with desired ones rapidly", color: "text-pink-400" },
  { id: "timeline", name: "Timeline Therapy", desc: "Reorganize memories along your internal timeline for healing", color: "text-blue-400" },
];

const BRAIN_REGIONS = [
  { name: "Prefrontal Cortex", function: "Decision making, planning, self-control", techniques: ["Reframing", "Anchoring"] },
  { name: "Amygdala", function: "Emotional processing, fear response", techniques: ["Swish Pattern", "Timeline"] },
  { name: "Hippocampus", function: "Memory formation, spatial navigation", techniques: ["Timeline", "Presuppositions"] },
  { name: "Reticular Activating System", function: "Attention filtering, consciousness", techniques: ["Embedded Commands", "Anchoring"] },
  { name: "Mirror Neurons", function: "Empathy, learning by observation", techniques: ["Reframing", "Presuppositions"] },
  { name: "Broca's Area", function: "Language production, inner dialogue", techniques: ["Embedded Commands", "Reframing"] },
];

interface NLPGoal {
  id: string;
  text: string;
  method: string;
  active: boolean;
  createdAt: number;
}

const STORAGE_KEY = "tessera-nlp-goals-v2";

function loadGoals(): NLPGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(goals: NLPGoal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export default function NLPPage() {
  const { setGoalsRaw, setNlpActive } = useNLPGoals();
  const [goals, setGoals] = useState<NLPGoal[]>(() => loadGoals());
  const [newGoal, setNewGoal] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("embedded-commands");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveGoals(goals);
    const activeGoalTexts = goals.filter(g => g.active).map(g => g.text);
    setGoalsRaw(activeGoalTexts.join(", "));
    setNlpActive(activeGoalTexts.length > 0);
  }, [goals, setGoalsRaw, setNlpActive]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal: NLPGoal = {
      id: Date.now().toString(),
      text: newGoal.trim(),
      method: selectedMethod,
      active: true,
      createdAt: Date.now(),
    };
    setGoals(prev => [goal, ...prev]);
    setNewGoal("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const toggleGoal = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));

  const activeGoals = goals.filter(g => g.active);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="text-rose-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold font-mono text-rose-400">NLP Self-Programming</h1>
          <p className="text-xs text-muted-foreground">Program your subconscious — every chat response trains you</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-mono border border-rose-500/30">
          {activeGoals.length} ACTIVE
        </span>
      </div>

      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
        <p className="text-sm text-rose-400 font-mono mb-2">How it works:</p>
        <p className="text-xs text-foreground/70 leading-relaxed">
          Type what you want to program into yourself. Tessera will automatically embed these goals into every chat response using NLP techniques — highlighting key words, using embedded commands, presuppositions, and anchoring patterns. Your subconscious absorbs the programming while you read naturally.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold font-mono flex items-center gap-2"><Target size={14} className="text-rose-400" /> Add New Programming</h3>
        <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()} placeholder="e.g., I am confident, focused, and attracting abundance..." className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-rose-500/50" />
        <div className="flex gap-1.5 flex-wrap">
          {NLP_METHODS.map(m => (
            <button key={m.id} onClick={() => setSelectedMethod(m.id)} className={cn("px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors", selectedMethod === m.id ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-card border-border text-muted-foreground hover:text-foreground")} title={m.desc}>
              {m.name}
            </button>
          ))}
        </div>
        <button onClick={addGoal} disabled={!newGoal.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-mono hover:bg-rose-500/30 transition-colors disabled:opacity-40">
          {saved ? <><Check size={14} /> Saved!</> : <><Plus size={14} /> Add Programming</>}
        </button>
      </div>

      {goals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold font-mono flex items-center gap-2"><Zap size={14} className="text-amber-400" /> Active Programs ({activeGoals.length})</h3>
          {goals.map(g => {
            const method = NLP_METHODS.find(m => m.id === g.method);
            return (
              <div key={g.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", g.active ? "bg-card border-border" : "bg-background/30 border-white/5 opacity-50")}>
                <button onClick={() => toggleGoal(g.id)} className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0", g.active ? "border-rose-400 bg-rose-500/20" : "border-muted-foreground")}>
                  {g.active && <Check size={10} className="text-rose-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono">{g.text}</div>
                  <div className="text-[11px] text-muted-foreground">{method?.name || g.method} — {new Date(g.createdAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => removeGoal(g.id)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold font-mono flex items-center gap-2"><Eye size={14} className="text-blue-400" /> Brain Science — How NLP Works</h3>
        <div className="space-y-2">
          {BRAIN_REGIONS.map(r => (
            <div key={r.name} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-white/5">
              <div className="flex-1">
                <div className="text-sm font-bold font-mono text-blue-400">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.function}</div>
                <div className="flex gap-1 mt-1">
                  {r.techniques.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-bold font-mono">NLP Methods Reference</h3>
        {NLP_METHODS.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-white/5">
            <div className={cn("text-sm font-bold w-2 h-2 rounded-full", m.color.replace("text-", "bg-"))} />
            <div>
              <div className={cn("text-xs font-bold font-mono", m.color)}>{m.name}</div>
              <div className="text-[11px] text-muted-foreground">{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
