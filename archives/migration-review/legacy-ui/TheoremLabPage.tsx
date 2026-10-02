import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, ChevronDown, ChevronUp, Download, FileText, Loader2,
  Play, Search, Trash2, Edit3, Check, X, Copy, Archive, Sparkles, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import katex from "katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Tab = "prove" | "library";

interface ProofStep {
  id: string;
  type: string;
  title: string;
  claim: string;
  reasoning: string;
  notation: string;
  confidence: number;
}

interface Proof {
  id: string;
  title: string;
  abstract: string;
  category: string;
  author: string;
  problem: string;
  steps: ProofStep[];
  confidence: number;
  completeness: number;
  createdAt: string;
  status: string;
}

function KaTeX({ math, display = false }: { math: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && math) {
      try {
        katex.render(math, ref.current, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = math;
      }
    }
  }, [math, display]);

  return <span ref={ref} className={display ? "block my-2 overflow-x-auto" : "inline"} />;
}

const CONFIDENCE_STYLES: Record<string, { bar: string; text: string }> = {
  emerald: { bar: "bg-emerald-500", text: "text-emerald-400" },
  amber: { bar: "bg-amber-500", text: "text-amber-400" },
  red: { bar: "bg-red-500", text: "text-red-400" },
};

function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  const colorKey = value >= 90 ? "emerald" : value >= 70 ? "amber" : "red";
  const styles = CONFIDENCE_STYLES[colorKey];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${styles.bar} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono ${styles.text}`}>{value}%</span>
    </div>
  );
}

const STEP_COLORS: Record<string, string> = {
  definition: "border-blue-500/30 bg-blue-500/5",
  axiom: "border-violet-500/30 bg-violet-500/5",
  lemma: "border-amber-500/30 bg-amber-500/5",
  theorem: "border-emerald-500/30 bg-emerald-500/5",
  proof: "border-cyan-500/30 bg-cyan-500/5",
  corollary: "border-purple-500/30 bg-purple-500/5",
  conclusion: "border-emerald-500/30 bg-emerald-500/5",
};

const STEP_TEXT_COLORS: Record<string, string> = {
  definition: "text-blue-400",
  axiom: "text-violet-400",
  lemma: "text-amber-400",
  theorem: "text-emerald-400",
  proof: "text-cyan-400",
  corollary: "text-purple-400",
  conclusion: "text-emerald-400",
};

const CATEGORIES = [
  { id: "", label: "Auto-detect" },
  { id: "pure-mathematics", label: "Pure Mathematics" },
  { id: "number-theory", label: "Number Theory" },
  { id: "analysis", label: "Analysis" },
  { id: "algebra", label: "Algebra" },
  { id: "geometry", label: "Geometry" },
  { id: "topology", label: "Topology" },
  { id: "combinatorics", label: "Combinatorics" },
  { id: "graph-theory", label: "Graph Theory" },
  { id: "set-theory", label: "Set Theory" },
  { id: "logic", label: "Logic" },
  { id: "probability", label: "Probability" },
  { id: "computer-science", label: "Computer Science" },
  { id: "physics", label: "Physics" },
  { id: "economics", label: "Economics" },
  { id: "philosophy", label: "Philosophy" },
];

function StepCard({
  step,
  index,
  proofId,
  expanded,
  onToggle,
  onProofUpdate,
}: {
  step: ProofStep;
  index: number;
  proofId: string;
  expanded: boolean;
  onToggle: () => void;
  onProofUpdate?: (proof: Proof) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editClaim, setEditClaim] = useState(step.claim);
  const [editReasoning, setEditReasoning] = useState(step.reasoning);
  const [editNotation, setEditNotation] = useState(step.notation);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStep = useMutation({
    mutationFn: async (data: Partial<ProofStep>) => {
      const res = await apiRequest("PATCH", `/api/theorem-lab/proofs/${proofId}/steps/${step.id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/theorem-lab/proofs"] });
      if (data.proof && onProofUpdate) onProofUpdate(data.proof);
      setEditing(false);
      toast({ title: "Step updated" });
    },
    onError: () => toast({ title: "Failed to update step", variant: "destructive" }),
  });

  const regenerateStep = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/theorem-lab/proofs/${proofId}/steps/${step.id}/regenerate`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/theorem-lab/proofs"] });
      if (data.proof && onProofUpdate) onProofUpdate(data.proof);
      toast({ title: "Step regenerated" });
    },
    onError: () => toast({ title: "Failed to regenerate step", variant: "destructive" }),
  });

  const handleSave = () => {
    updateStep.mutate({ claim: editClaim, reasoning: editReasoning, notation: editNotation });
  };

  const typeColor = STEP_COLORS[step.type] || "border-slate-500/30 bg-slate-500/5";
  const textColor = STEP_TEXT_COLORS[step.type] || "text-slate-400";

  return (
    <div className={`rounded-xl border ${typeColor} overflow-hidden transition-all`}>
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-6 h-6 rounded-lg ${typeColor} border flex items-center justify-center text-[10px] font-bold ${textColor} shrink-0`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>{step.type}</span>
            <span className="text-xs font-medium text-white truncate">{step.title}</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">{step.claim}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] font-mono ${step.confidence >= 0.9 ? "text-emerald-400" : step.confidence >= 0.7 ? "text-amber-400" : "text-red-400"}`}>
            {Math.round(step.confidence * 100)}%
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-3">
          {editing ? (
            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-slate-600 uppercase tracking-wider">Claim</label>
                <Textarea
                  value={editClaim}
                  onChange={e => setEditClaim(e.target.value)}
                  className="bg-black/30 border-white/10 text-white text-xs mt-1 h-16 resize-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase tracking-wider">Reasoning</label>
                <Textarea
                  value={editReasoning}
                  onChange={e => setEditReasoning(e.target.value)}
                  className="bg-black/30 border-white/10 text-white text-xs mt-1 h-20 resize-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-600 uppercase tracking-wider">LaTeX Notation</label>
                <Textarea
                  value={editNotation}
                  onChange={e => setEditNotation(e.target.value)}
                  className="bg-black/30 border-white/10 text-white text-xs mt-1 h-16 resize-none font-mono"
                />
                <div className="mt-1 p-2 rounded bg-black/20 border border-white/5">
                  <KaTeX math={editNotation} display />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateStep.isPending} size="sm" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 h-7 text-[10px]">
                  {updateStep.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save
                </Button>
                <Button onClick={() => { setEditing(false); setEditClaim(step.claim); setEditReasoning(step.reasoning); setEditNotation(step.notation); }} size="sm" variant="outline" className="border-white/10 text-slate-400 h-7 text-[10px]">
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Claim</div>
                <div className="text-[11px] text-slate-300">{step.claim}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Reasoning</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{step.reasoning}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Formal Notation</div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/5 overflow-x-auto">
                  <KaTeX math={step.notation} display />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => regenerateStep.mutate()}
                  disabled={regenerateStep.isPending}
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-6 text-[9px]"
                >
                  {regenerateStep.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />} Regenerate
                </Button>
                <Button onClick={() => setEditing(true)} size="sm" variant="outline" className="border-white/10 text-slate-400 h-6 text-[9px]">
                  <Edit3 className="w-3 h-3 mr-1" /> Edit Step
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

async function generateProofPDF(proof: Proof): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;padding:40px;background:#fff;color:#000;font-family:serif;font-size:14px;line-height:1.6;";
  document.body.appendChild(container);

  const renderMath = (latex: string, display: boolean): string => {
    try {
      return katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false, trust: false });
    } catch {
      return "";
    }
  };

  const el = (tag: string, styles: string, text?: string): HTMLElement => {
    const node = document.createElement(tag);
    node.style.cssText = styles;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const dateStr = new Date(proof.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const year = new Date(proof.createdAt).getFullYear();

  const header = el("div", "text-align:center;margin-bottom:24px");
  header.appendChild(el("h1", "font-size:22px;margin:0 0 8px 0;font-weight:bold", proof.title));
  header.appendChild(el("div", "font-size:13px;color:#444", proof.author));
  header.appendChild(el("div", "font-size:12px;color:#666", dateStr));
  container.appendChild(header);

  const abstractSection = el("div", "margin-bottom:20px");
  abstractSection.appendChild(el("h2", "font-size:15px;font-weight:bold;margin:0 0 6px 0", "Abstract"));
  abstractSection.appendChild(el("p", "font-size:12px;color:#333;text-align:justify", proof.abstract));
  container.appendChild(abstractSection);

  const problemSection = el("div", "margin-bottom:20px");
  problemSection.appendChild(el("h2", "font-size:15px;font-weight:bold;margin:0 0 6px 0", "Problem Statement"));
  problemSection.appendChild(el("p", "font-size:13px", proof.problem));
  container.appendChild(problemSection);

  container.appendChild(el("h2", "font-size:15px;font-weight:bold;margin:0 0 12px 0", "Proof"));

  proof.steps.forEach((step, i) => {
    const stepDiv = el("div", "margin-bottom:16px;padding:10px;border:1px solid #ddd;border-radius:4px");
    const typeLabel = step.type.charAt(0).toUpperCase() + step.type.slice(1);
    stepDiv.appendChild(el("div", "font-size:13px;font-weight:bold;margin-bottom:4px", `${typeLabel} ${i + 1}. ${step.title}`));
    stepDiv.appendChild(el("div", "font-size:12px;font-style:italic;margin-bottom:6px;color:#333", step.claim));
    stepDiv.appendChild(el("div", "font-size:12px;margin-bottom:8px;color:#444", step.reasoning));
    const mathDiv = el("div", "background:#f8f8f8;padding:8px;border-radius:4px;text-align:center;overflow-x:auto");
    mathDiv.innerHTML = renderMath(step.notation, true);
    stepDiv.appendChild(mathDiv);
    container.appendChild(stepDiv);
  });

  const confSection = el("div", "margin-top:16px");
  confSection.appendChild(el("h2", "font-size:15px;font-weight:bold;margin:0 0 6px 0", "Confidence Analysis"));
  confSection.appendChild(el("p", "font-size:12px", `Overall chain confidence: ${proof.confidence}%. Completeness: ${proof.completeness}%.`));
  container.appendChild(confSection);

  const refSection = el("div", "margin-top:16px");
  refSection.appendChild(el("h2", "font-size:15px;font-weight:bold;margin:0 0 6px 0", "References"));
  const refList = el("div", "font-size:11px");
  const refs = [
    `[1] Tessera Sovereign System, Automated Theorem Proving Engine, ${year}.`,
    '[2] Enderton, H.B., A Mathematical Introduction to Logic, Academic Press, 2001.',
    '[3] Buss, S.R., Handbook of Proof Theory, Elsevier, 1998.',
  ];
  refs.forEach(r => refList.appendChild(el("p", "", r)));
  refSection.appendChild(refList);
  container.appendChild(refSection);

  const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
  heightLeft -= (pdfHeight - 20);

  while (heightLeft > 0) {
    position = position - pdfHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);
  }

  pdf.save(`${proof.title.replace(/\W+/g, "_")}.pdf`);
}

function generateLatexLocally(proof: Proof): { latex: string; filename: string } {
  const year = new Date(proof.createdAt).getFullYear();
  const dateStr = new Date(proof.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const escTex = (s: string) => s.replace(/[&%$#_{}~^\\]/g, m => `\\${m}`);

  const stepsLatex = proof.steps.map((step, i) => {
    const typeLabel = step.type.charAt(0).toUpperCase() + step.type.slice(1);
    return `\\subsection*{${typeLabel} ${i + 1}. ${escTex(step.title)}}
\\textit{${escTex(step.claim)}}

${escTex(step.reasoning)}

$$${step.notation}$$
`;
  }).join("\n");

  const latex = `\\documentclass[12pt]{article}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage[margin=1in]{geometry}
\\title{${escTex(proof.title)}}
\\author{${escTex(proof.author)}}
\\date{${dateStr}}
\\begin{document}
\\maketitle
\\begin{abstract}
${escTex(proof.abstract)}
\\end{abstract}
\\section*{Problem Statement}
${escTex(proof.problem)}
\\section*{Proof}
${stepsLatex}
\\section*{Confidence Analysis}
Overall chain confidence: ${proof.confidence}\\%. Completeness: ${proof.completeness}\\%.
\\begin{thebibliography}{9}
\\bibitem{tessera} Tessera Sovereign System, \\textit{Automated Theorem Proving Engine}, ${year}.
\\bibitem{enderton} Enderton, H.B., \\textit{A Mathematical Introduction to Logic}, Academic Press, 2001.
\\bibitem{buss} Buss, S.R., \\textit{Handbook of Proof Theory}, Elsevier, 1998.
\\end{thebibliography}
\\end{document}`;

  return { latex, filename: `${proof.title.replace(/\W+/g, "_")}.tex` };
}

const LOCAL_STORAGE_KEY = "tessera_theorem_lab_proofs";

function loadLocalProofs(): Proof[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProof(proof: Proof) {
  try {
    const proofs = loadLocalProofs();
    const idx = proofs.findIndex(p => p.id === proof.id);
    if (idx >= 0) proofs[idx] = proof;
    else proofs.unshift(proof);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(proofs.slice(0, 100)));
  } catch {}
}

function removeLocalProof(proofId: string) {
  try {
    const proofs = loadLocalProofs().filter(p => p.id !== proofId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(proofs));
  } catch {}
}

function ProveTab() {
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState("");
  const [currentProof, setCurrentProof] = useState<Proof | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateProof = useMutation({
    mutationFn: async () => {
      const body: { problem: string; category?: string } = { problem };
      if (category) body.category = category;
      const res = await apiRequest("POST", "/api/theorem-lab/prove", body);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentProof(data.proof);
      saveLocalProof(data.proof);
      queryClient.invalidateQueries({ queryKey: ["/api/theorem-lab/proofs"] });
      toast({ title: "Proof generated", description: `${data.proof.steps.length} steps, ${data.proof.confidence}% confidence` });
    },
    onError: () => toast({ title: "Proof generation failed", variant: "destructive" }),
  });

  const downloadLatex = useCallback((data: { latex: string; filename: string }) => {
    const blob = new Blob([data.latex], { type: "text/x-latex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "LaTeX exported", description: data.filename });
  }, [toast]);

  const exportLatex = useMutation({
    mutationFn: async (proof: Proof) => {
      try {
        const res = await apiRequest("POST", "/api/theorem-lab/export/latex", { proofId: proof.id });
        return res.json();
      } catch {
        return generateLatexLocally(proof);
      }
    },
    onSuccess: (data) => downloadLatex(data),
    onError: () => toast({ title: "Export failed", variant: "destructive" }),
  });

  const exportPDF = useCallback(async (proof: Proof) => {
    try {
      await generateProofPDF(proof);
      toast({ title: "PDF exported", description: `${proof.title.replace(/\W+/g, "_")}.pdf` });
    } catch {
      toast({ title: "PDF generation failed", variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-300">Theorem Prover</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Enter a mathematical problem, conjecture, or theorem. The system will generate a structured proof with formal notation, step-by-step reasoning, and confidence analysis.
        </p>

        <div className="space-y-3">
          <Textarea
            value={problem}
            onChange={e => setProblem(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey && problem.trim()) generateProof.mutate(); }}
            placeholder="e.g. Prove that there are infinitely many prime numbers..."
            className="bg-black/30 border-white/10 text-white text-sm resize-none h-24"
          />

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-cyan-500/50 appearance-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => generateProof.mutate()}
              disabled={!problem.trim() || generateProof.isPending}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-4"
            >
              {generateProof.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Begin Proof
            </Button>
          </div>
        </div>
      </div>

      {currentProof && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{currentProof.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px]">
                    {currentProof.category.replace(/-/g, " ")}
                  </Badge>
                  <span className="text-[9px] text-slate-500">{currentProof.steps.length} steps</span>
                  <span className="text-[9px] text-slate-500">{new Date(currentProof.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportPDF(currentProof)}
                  size="sm"
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 h-7 text-[10px]"
                >
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
                <Button
                  onClick={() => exportLatex.mutate(currentProof)}
                  disabled={exportLatex.isPending}
                  size="sm"
                  className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 h-7 text-[10px]"
                >
                  <FileText className="w-3 h-3 mr-1" /> LaTeX
                </Button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <ConfidenceMeter value={currentProof.confidence} label="Confidence" />
              <ConfidenceMeter value={currentProof.completeness} label="Completeness" />
            </div>

            <div className="rounded-lg bg-black/20 border border-white/5 p-3 mb-3">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Abstract</div>
              <div className="text-[10px] text-slate-400 leading-relaxed">{currentProof.abstract}</div>
            </div>
          </div>

          <div className="space-y-2">
            {currentProof.steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                proofId={currentProof.id}
                expanded={expandedStep === step.id}
                onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                onProofUpdate={(p) => { setCurrentProof(p); saveLocalProof(p); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryTab() {
  const [search, setSearch] = useState("");
  const [expandedProof, setExpandedProof] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ proofs: Proof[]; count: number }>({
    queryKey: ["/api/theorem-lab/proofs"],
    refetchInterval: 15000,
  });

  const deleteProof = useMutation({
    mutationFn: async (proofId: string) => {
      removeLocalProof(proofId);
      try {
        const res = await apiRequest("DELETE", `/api/theorem-lab/proofs/${proofId}`);
        return res.json();
      } catch {
        return { ok: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/theorem-lab/proofs"] });
      toast({ title: "Proof deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const exportLatex = useMutation({
    mutationFn: async (proof: Proof) => {
      try {
        const res = await apiRequest("POST", "/api/theorem-lab/export/latex", { proofId: proof.id });
        return res.json();
      } catch {
        return generateLatexLocally(proof);
      }
    },
    onSuccess: (data) => {
      const blob = new Blob([data.latex], { type: "text/x-latex" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "LaTeX exported" });
    },
    onError: () => toast({ title: "Export failed", variant: "destructive" }),
  });

  const exportPDF = useCallback(async (proof: Proof) => {
    try {
      await generateProofPDF(proof);
      toast({ title: "PDF exported" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
    }
  }, [toast]);

  const mergedProofs = (() => {
    const serverProofs = data?.proofs ?? [];
    const localProofs = loadLocalProofs();
    const serverIds = new Set(serverProofs.map(p => p.id));
    const localOnly = localProofs.filter(p => !serverIds.has(p.id));
    return [...serverProofs, ...localOnly]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  const proofs = mergedProofs.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.problem.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Archive className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-300">Proof Library</span>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[9px]">{mergedProofs.length}</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search proofs by title, problem, or category..."
            className="w-full bg-black/30 border border-white/10 text-white text-xs pl-9 pr-3 py-2 rounded-lg outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></div>
      ) : proofs.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          {search ? "No proofs match your search." : "No proofs yet. Create your first proof in the Prove tab."}
        </div>
      ) : (
        <div className="space-y-2">
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setExpandedProof(expandedProof === proof.id ? null : proof.id)}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{proof.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[8px] px-1 py-0">
                      {proof.category.replace(/-/g, " ")}
                    </Badge>
                    <span className="text-[9px] text-slate-500">{proof.steps.length} steps</span>
                    <span className="text-[9px] text-slate-500">{new Date(proof.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-mono ${proof.confidence >= 90 ? "text-emerald-400" : proof.confidence >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {proof.confidence}%
                  </span>
                  {expandedProof === proof.id ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </div>
              </button>

              {expandedProof === proof.id && (
                <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-3">
                  <div className="space-y-2">
                    <ConfidenceMeter value={proof.confidence} label="Confidence" />
                    <ConfidenceMeter value={proof.completeness} label="Completeness" />
                  </div>

                  <div className="rounded-lg bg-black/20 border border-white/5 p-2">
                    <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Problem</div>
                    <div className="text-[10px] text-slate-400">{proof.problem}</div>
                  </div>

                  <div className="space-y-1.5">
                    {proof.steps.map((step, i) => (
                      <StepCard
                        key={step.id}
                        step={step}
                        index={i}
                        proofId={proof.id}
                        expanded={expandedStep === step.id}
                        onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => exportPDF(proof)}
                      size="sm"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 h-7 text-[10px]"
                    >
                      <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                    <Button
                      onClick={() => exportLatex.mutate(proof)}
                      size="sm"
                      className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 h-7 text-[10px]"
                    >
                      <FileText className="w-3 h-3 mr-1" /> LaTeX
                    </Button>
                    <Button
                      onClick={() => deleteProof.mutate(proof.id)}
                      disabled={deleteProof.isPending}
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TheoremLabPage({ embedded }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>("prove");

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "prove", label: "Prove", icon: Sparkles },
    { id: "library", label: "Library", icon: Archive },
  ];

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <h1 className="text-lg font-bold text-white">Theorem Lab</h1>
        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px]">Sovereign</Badge>
      </div>

      <div className="flex gap-1 mb-4 rounded-xl bg-white/[0.02] border border-white/5 p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prove" && <ProveTab />}
      {tab === "library" && <LibraryTab />}
    </div>
  );
}
