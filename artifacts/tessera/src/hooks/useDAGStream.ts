import { useEffect, useRef, useState, useCallback } from "react";

interface DAGNode {
  id: string;
  label: string;
  description: string;
  dependencies: string[];
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}

interface DAGExecution {
  id: string;
  goal: string;
  nodes: DAGNode[];
  status: "decomposing" | "running" | "complete" | "failed";
  createdAt: number;
  completedAt?: number;
  parallelBatches: string[][];
  reasoningChain: Array<{
    step: string;
    content: string;
    timestamp: number;
    nodeIds?: string[];
  }>;
  finalSummary?: string;
}

interface UseDAGStreamResult {
  dag: DAGExecution | null;
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
  connect: (dagId: string) => void;
  disconnect: () => void;
}

export function useDAGStream(initialDagId?: string): UseDAGStreamResult {
  const [dag, setDag] = useState<DAGExecution | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const currentDagId = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const connect = useCallback((dagId: string) => {
    if (currentDagId.current === dagId && esRef.current) return;
    disconnect();

    currentDagId.current = dagId;
    setIsDone(false);
    setError(null);
    setIsStreaming(true);

    const es = new EventSource(`/api/dag/stream/${dagId}`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "dag_update" && payload.dag) {
          setDag(payload.dag);
          if (payload.dag.status === "complete" || payload.dag.status === "failed") {
            setIsDone(true);
            setIsStreaming(false);
          }
        } else if (payload.type === "done") {
          setIsDone(true);
          setIsStreaming(false);
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      setError("SSE connection lost");
      setIsStreaming(false);
      es.close();
    };
  }, [disconnect]);

  useEffect(() => {
    if (initialDagId) connect(initialDagId);
    return () => disconnect();
  }, [initialDagId]);

  return { dag, isStreaming, isDone, error, connect, disconnect };
}
