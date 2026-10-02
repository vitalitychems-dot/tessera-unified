import { useNLPGoals } from "@/lib/nlpGoalsContext";
import { applyNLPHighlights } from "@/lib/nlpGoalEngine";

type NLPMeta = NonNullable<ReturnType<typeof applyNLPHighlights>[0]["nlp"]>;

function NLPWord({ text, nlp }: { text: string; nlp: NLPMeta }) {
  const display = nlp.uppercase ? text.toUpperCase() : text;
  return (
    <span
      style={{
        color: nlp.textColor,
        fontWeight: nlp.bold ? 700 : undefined,
        fontStyle: nlp.italic ? "italic" : undefined,
      }}
      className={nlp.sizeClass}
      data-nlp-technique={nlp.technique}
    >
      {display}
    </span>
  );
}

function EnhancedPlainText({ text, goals }: { text: string; goals: string[] }) {
  if (!goals.length) return <>{text}</>;
  const segments = applyNLPHighlights(text, goals);
  return (
    <>
      {segments.map((seg, i) =>
        seg.nlp ? (
          <NLPWord key={i} text={seg.text} nlp={seg.nlp} />
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function ColorizedText({ text }: { text: string }) {
  const { goals, nlpActive } = useNLPGoals();
  const activeGoals = nlpActive ? goals : [];

  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i} className="text-cyan-300">{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="px-1 py-0.5 rounded bg-white/5 text-cyan-400 text-xs font-mono">{part.slice(1, -1)}</code>;
        return <EnhancedPlainText key={i} text={part} goals={activeGoals} />;
      })}
    </span>
  );
}
