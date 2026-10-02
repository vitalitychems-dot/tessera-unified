import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const LS_GOALS_KEY = "t9_nlp_goals_raw";
const LS_ACTIVE_KEY = "t9_nlp_goals_active";

interface NLPGoalsContextValue {
  goalsRaw: string;
  goals: string[];
  nlpActive: boolean;
  setGoalsRaw: (raw: string) => void;
  setNlpActive: (v: boolean) => void;
}

const NLPGoalsContext = createContext<NLPGoalsContextValue>({
  goalsRaw: "",
  goals: [],
  nlpActive: false,
  setGoalsRaw: () => {},
  setNlpActive: () => {},
});

function parseGoals(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function NLPGoalsProvider({ children }: { children: ReactNode }) {
  const [goalsRaw, setGoalsRawState] = useState<string>(() => {
    try { return localStorage.getItem(LS_GOALS_KEY) || ""; } catch { return ""; }
  });
  const [nlpActive, setNlpActiveState] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_ACTIVE_KEY) !== "false"; } catch { return true; }
  });

  const setGoalsRaw = useCallback((raw: string) => {
    setGoalsRawState(raw);
    try { localStorage.setItem(LS_GOALS_KEY, raw); } catch {}
  }, []);

  const setNlpActive = useCallback((v: boolean) => {
    setNlpActiveState(v);
    try { localStorage.setItem(LS_ACTIVE_KEY, String(v)); } catch {}
  }, []);

  const goals = parseGoals(goalsRaw);

  return (
    <NLPGoalsContext.Provider value={{ goalsRaw, goals, nlpActive, setGoalsRaw, setNlpActive }}>
      {children}
    </NLPGoalsContext.Provider>
  );
}

export function useNLPGoals() {
  return useContext(NLPGoalsContext);
}
