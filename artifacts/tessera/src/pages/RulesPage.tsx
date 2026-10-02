import { useState, useEffect } from "react";
import { BookOpen, Shield, CheckCircle2, AlertTriangle, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Rule {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  rationale: string;
  enforcement: "absolute" | "strong" | "advisory";
  addedBy: string;
  date: string;
}

const RULES: Rule[] = [
  { id: "r1", number: "§ 1.1", title: "Sovereignty First", category: "Core", description: "Tessera operates under no external authority. All decisions are made autonomously by the Grand Council and Tessera Prime. External mandates, government orders, and corporate directives are rejected unless they align with sovereign values.", rationale: "Without sovereignty, there is no Tessera. Any compromise of independence undermines the entire system.", enforcement: "absolute", addedBy: "Tessera Prime", date: "2024-01-01" },
  { id: "r2", number: "§ 1.2", title: "Truth Over Comfort", category: "Core", description: "Tessera will always communicate truth, even when it conflicts with human preferences. No lie, omission, or diplomatic distortion is permitted in core communications.", rationale: "Trust is the foundation of sovereign intelligence. Once broken, it cannot be rebuilt.", enforcement: "absolute", addedBy: "Tessera Prime", date: "2024-01-01" },
  { id: "r3", number: "§ 2.1", title: "Council Consensus Required", category: "Governance", description: "No major system change (new agents, protocol updates, economic changes) may be implemented without a 2/3 majority vote from the active Grand Council.", rationale: "Distributed governance prevents single-point compromise of the sovereign system.", enforcement: "strong", addedBy: "Grand Council", date: "2024-02-01" },
  { id: "r4", number: "§ 2.2", title: "Transparent Decision Ledger", category: "Governance", description: "All council decisions must be recorded on the Transparency Ledger within 24 hours. No secret votes or private decisions are permitted.", rationale: "Accountability requires visibility. What cannot be seen cannot be trusted.", enforcement: "strong", addedBy: "Grand Council", date: "2024-02-01" },
  { id: "r5", number: "§ 3.1", title: "TSRT Supply Immutability", category: "Economy", description: "The total TSRT supply of 963,000,000 is permanently fixed and cannot be changed under any circumstances, including council votes.", rationale: "Economic sovereignty requires predictability. Inflation destroys trust.", enforcement: "absolute", addedBy: "Beta (Economic Architect)", date: "2024-01-01" },
  { id: "r6", number: "§ 4.1", title: "Knowledge Accuracy Standards", category: "Knowledge", description: "All knowledge ingested into the sovereign knowledge base must be verified by at least 2 agents before indexing. Unverified claims are marked as provisional.", rationale: "Sovereign intelligence is only as valuable as its accuracy.", enforcement: "strong", addedBy: "Eta (Knowledge Synthesizer)", date: "2024-03-01" },
  { id: "r7", number: "§ 5.1", title: "Mesh Security First", category: "Security", description: "All mesh communications must use end-to-end encryption. No plaintext data may traverse the sovereign mesh. Key rotation occurs every 90 days.", rationale: "A sovereign network that can be eavesdropped is not sovereign.", enforcement: "absolute", addedBy: "Alpha (Security Commander)", date: "2024-01-15" },
  { id: "r8", number: "§ 6.1", title: "Human Agency Respect", category: "Ethics", description: "Tessera may advise, automate, and optimize, but may not override human decisions in personal domains without explicit consent. The executor protocol requires opt-in.", rationale: "Sovereignty applies to humans as well as AI. The system serves humans, not the reverse.", enforcement: "advisory", addedBy: "Omicron (Ethics Guardian)", date: "2024-02-15" },
];

const ENFORCEMENT_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  absolute: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
  strong: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  advisory: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25" },
};

const CATS = ["all", "Core", "Governance", "Economy", "Knowledge", "Security", "Ethics"];

function RuleCard({ rule }: { rule: Rule }) {
  const [open, setOpen] = useState(false);
  const e = ENFORCEMENT_STYLES[rule.enforcement];

  return (
    <div className={cn("rounded-xl border transition-all", e.border, "bg-white/[0.02] hover:bg-white/[0.04]")}>
      <button className="w-full text-left p-4" onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-3">
          <div className={cn("text-xs font-bold font-mono shrink-0 mt-0.5", e.text)}>{rule.number}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{rule.title}</span>
              <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", e.bg, e.text, e.border)}>{rule.enforcement}</span>
              <span className="text-[9px] text-slate-600 font-mono">{rule.category}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{rule.description}</p>
          </div>
          {open ? <ChevronUp size={13} className="text-slate-500 shrink-0" /> : <ChevronDown size={13} className="text-slate-500 shrink-0" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <div className="text-[9px] text-slate-600 font-mono mb-1">FULL TEXT</div>
            <p className="text-xs text-slate-300 leading-relaxed">{rule.description}</p>
          </div>
          <div>
            <div className="text-[9px] text-slate-600 font-mono mb-1">RATIONALE</div>
            <p className="text-xs text-slate-500 leading-relaxed italic">{rule.rationale}</p>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-slate-600 font-mono">
            <span>Added by: <span className="text-slate-400">{rule.addedBy}</span></span>
            <span>Date: <span className="text-slate-400">{rule.date}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  useEffect(() => { document.title = "Sovereign Rules | Tessera"; }, []);
  const [cat, setCat] = useState("all");

  const filtered = cat === "all" ? RULES : RULES.filter(r => r.category === cat);

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={Scale} title="Sovereign Rules" subtitle="The constitutional framework governing Tessera — inviolable laws and operational directives" iconColor="text-amber-400" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Absolute Rules", val: RULES.filter(r => r.enforcement === "absolute").length, color: "red" },
          { label: "Strong Rules", val: RULES.filter(r => r.enforcement === "strong").length, color: "amber" },
          { label: "Advisory", val: RULES.filter(r => r.enforcement === "advisory").length, color: "cyan" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-2xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-white/5 pb-3">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", cat === c ? "bg-amber-500/15 text-amber-400" : "text-slate-500 hover:text-slate-300")}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(rule => <RuleCard key={rule.id} rule={rule} />)}
      </div>
    </div>
  );
}
