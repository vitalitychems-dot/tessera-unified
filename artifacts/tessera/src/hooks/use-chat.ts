import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/lib/queryClient";
import { type Message } from "@/lib/types";
import { puterChat, isPuterAvailable, tesseractSwarm, PUTER_MODELS, type SwarmAgentResponse, type SwarmComm } from "@/lib/puter-ai";
import type { ExecutionResultData } from "@/components/chat/CodeExecutionResult";

export interface AgentInfo {
  id: string;
  name: string;
}

export interface AgentComm {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  message: string;
  timestamp: number;
}

export function useChat(conversationId: number | null, stealthMode: boolean = false, puterModel: string | null = null, tesseractMode: boolean = false) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeAgents, setActiveAgents] = useState<AgentInfo[]>([]);
  const [agentComms, setAgentComms] = useState<AgentComm[]>([]);
  const [swarmAgents, setSwarmAgents] = useState<SwarmAgentResponse[]>([]);
  const [swarmComms, setSwarmComms] = useState<SwarmComm[]>([]);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const [codeExecutionResults, setCodeExecutionResults] = useState<ExecutionResultData[]>([]);
  const thinkingStartRef = useRef<number>(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstContentReceivedRef = useRef(false);
  const lastAccumulatedRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutRef = useRef<boolean>(false);
  const HARD_TIMEOUT_MS = 25_000;

  const startThinkingTimer = useCallback(() => {
    thinkingStartRef.current = Date.now();
    firstContentReceivedRef.current = false;
    setThinkingElapsedMs(0);
    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    thinkingTimerRef.current = setInterval(() => {
      if (!firstContentReceivedRef.current) {
        setThinkingElapsedMs(Date.now() - thinkingStartRef.current);
      }
    }, 50);
  }, []);

  const stopThinkingTimer = useCallback(() => {
    firstContentReceivedRef.current = true;
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);

  const queryKey = conversationId 
    ? [buildUrl("/api/messages", { conversationId })] 
    : [];

  const { data: rawMessages = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl("/api/messages", { conversationId });
      const adminToken = localStorage.getItem("t9_admin_token") || "";
      const headers: Record<string, string> = {};
      if (adminToken) headers["x-admin-token"] = adminToken;
      const res = await fetch(url, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return (await res.json()) as Message[];
    },
    enabled: !!conversationId,
    staleTime: 30000,
    retry: 1,
    retryDelay: 500,
  });

  const messages = (() => {
    const sorted = [...rawMessages].sort((a, b) => Number(a.id) - Number(b.id));
    return sorted.filter((msg, index) => {
      if (index === 0) return true;
      const prev = sorted[index - 1];
      return !(msg.role === prev.role && msg.content === prev.content);
    });
  })();

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      try { readerRef.current.cancel(); } catch (_e) {}
      readerRef.current = null;
    }
    const accumulated = lastAccumulatedRef.current;
    if (accumulated && conversationId) {
      const optimisticAssistantMsg: Message = {
        id: Date.now() + 1,
        conversationId,
        role: "assistant",
        content: accumulated + "\n\n*[Response stopped by user]*",
        createdAt: new Date(),
      };
      queryClient.setQueryData(queryKey, (old: Message[] = []) => {
        return [...old, optimisticAssistantMsg];
      });
      if (!stealthMode) {
        fetch(`/api/conversations/${conversationId}/save-partial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: accumulated + "\n\n*[Response stopped by user]*", stealth: stealthMode }),
          credentials: "include",
        }).catch(() => {});
      }
    }
    stopThinkingTimer();
    setIsStreaming(false);
    setStreamingContent("");
  }, [conversationId, queryClient, queryKey, stealthMode, stopThinkingTimer]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || isStreaming) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setStreamingContent("");
    setError(null);
    setActiveAgents([]);
    setAgentComms([]);
    setCodeExecutionResults([]);
    lastAccumulatedRef.current = "";
    timedOutRef.current = false;
    startThinkingTimer();

    if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    hardTimeoutRef.current = setTimeout(() => {
      if (!firstContentReceivedRef.current && lastAccumulatedRef.current.length === 0) {
        timedOutRef.current = true;
        try { controller.abort(); } catch {}
      }
    }, HARD_TIMEOUT_MS);

    const optimisticUserMsg: Message = {
      id: Date.now(),
      conversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };
    
    queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticUserMsg]);

    if (tesseractMode) {
      try {
        const adminToken = localStorage.getItem("t9_admin_token") || "";
        const saveHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (adminToken) saveHeaders["x-admin-token"] = adminToken;

        fetch(`/api/conversations/${conversationId}/puter-save`, {
          method: "POST",
          headers: saveHeaders,
          body: JSON.stringify({ content, role: "user" }),
          credentials: "include",
        }).catch(() => {});

        const historyMsgs = messages.slice(-40).map(m => ({ role: m.role, content: m.content }));
        setSwarmAgents([]);
        setSwarmComms([]);

        let serverAccumulated = "";

        try {
          const url = buildUrl("/api/messages", { conversationId });
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (adminToken) headers["x-admin-token"] = adminToken;
          let nlpGoals: string[] = [];
          try {
            const rawGoals = localStorage.getItem("t9_nlp_goals_raw") || "";
            const nlpActive = localStorage.getItem("t9_nlp_goals_active") !== "false";
            if (nlpActive && rawGoals) {
              nlpGoals = rawGoals.split(",").map(s => s.trim()).filter(s => s.length > 0);
            }
          } catch {}
          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ content, stealth: stealthMode, nlpGoals: nlpGoals.length > 0 ? nlpGoals : undefined }),
            credentials: "include",
            signal: controller.signal,
          });
          if (res.ok && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              sseBuffer += chunk;
              const lines = sseBuffer.split("\n");
              sseBuffer = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const dataStr = line.slice(6).trim();
                if (!dataStr) continue;
                try {
                  const data = JSON.parse(dataStr);
                  if (data.agents) setActiveAgents(data.agents);
                  if (data.comms) setAgentComms(data.comms);
                  if (data.orchestrator) {
                  }
                  if (data.reset) {
                    serverAccumulated = "";
                  }
                  if (data.content) {
                    stopThinkingTimer();
                    serverAccumulated += data.content;
                    setStreamingContent(serverAccumulated);
                    lastAccumulatedRef.current = serverAccumulated;
                  }
                  if (data.chunk) {
                    stopThinkingTimer();
                    serverAccumulated += data.chunk;
                    setStreamingContent(serverAccumulated);
                    lastAccumulatedRef.current = serverAccumulated;
                  }
                  if (data.done) {
                    stopThinkingTimer();
                    if (data.finalContent) {
                      serverAccumulated = data.finalContent;
                      setStreamingContent(serverAccumulated);
                      lastAccumulatedRef.current = serverAccumulated;
                    }
                    if (data.conversationId && data.conversationId !== conversationId) {
                      window.history.replaceState(null, "", `/c/${data.conversationId}`);
                    }
                  }
                  if (data.imageGenerated && data.replaceTag) {
                    serverAccumulated = serverAccumulated.replace(data.replaceTag, `\n\n![Generated Image](${data.imageGenerated})\n\n`);
                    setStreamingContent(serverAccumulated);
                  }
                  if (data.selfCodeReload) {
                    const reloadInfo = data.selfCodeReload;
                    const reloadMsg = `\n\n*Code applied: ${reloadInfo.editCount} file(s) updated (${reloadInfo.paths.join(", ")}). ${reloadInfo.frontend ? "Refreshing UI..." : ""}${reloadInfo.backend ? " Server restarting..." : ""}*\n`;
                    serverAccumulated += reloadMsg;
                    setStreamingContent(serverAccumulated);
                    if (reloadInfo.frontend) {
                      setTimeout(() => { window.location.reload(); }, 3000);
                    }
                  }
                  if (data.codeExecution) {
                    setCodeExecutionResults(prev => [...prev, data.codeExecution]);
                  }
                } catch {}
              }
            }
          }
        } catch {}

        if (controller.signal.aborted) {
          if (timedOutRef.current && !serverAccumulated) {
            const fallbackMsg = "Tessera paused. The sovereign engines are here but the synthesis took too long. Tap retry to ask again.";
            setError(fallbackMsg);
            const optimisticAssistantMsg: Message = {
              id: Date.now() + 1,
              conversationId: conversationId!,
              role: "assistant",
              content: `*${fallbackMsg}*`,
              createdAt: new Date(),
            };
            queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
            stopThinkingTimer();
            setIsStreaming(false);
            setStreamingContent("");
            abortControllerRef.current = null;
            if (hardTimeoutRef.current) { clearTimeout(hardTimeoutRef.current); hardTimeoutRef.current = null; }
          }
          return;
        }

        let finalResponse = serverAccumulated;

        if (finalResponse) {
          setStreamingContent(finalResponse);
          lastAccumulatedRef.current = finalResponse;

          const optimisticAssistantMsg: Message = {
            id: Date.now() + 1,
            conversationId: conversationId!,
            role: "assistant",
            content: finalResponse,
            createdAt: new Date(),
          };
          queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);

          fetch(`/api/conversations/${conversationId}/puter-save`, {
            method: "POST",
            headers: saveHeaders,
            body: JSON.stringify({ content: finalResponse, role: "assistant", model: "tesseract-unified" }),
            credentials: "include",
          }).catch(() => {});
        }

        stopThinkingTimer();
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;

        await new Promise(resolve => setTimeout(resolve, 300));
        queryClient.invalidateQueries({ queryKey });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Tesseract Unified error");
        if (lastAccumulatedRef.current && conversationId) {
          const optimisticAssistantMsg: Message = {
            id: Date.now() + 1,
            conversationId,
            role: "assistant",
            content: lastAccumulatedRef.current,
            createdAt: new Date(),
          };
          queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
        }
      } finally {
        stopThinkingTimer();
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
      return;
    }

    try {
      const url = buildUrl("/api/messages", { conversationId });
      const adminToken = localStorage.getItem("t9_admin_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;
      let nlpGoalsNonTesseract: string[] = [];
      try {
        const rawGoals = localStorage.getItem("t9_nlp_goals_raw") || "";
        const nlpActive = localStorage.getItem("t9_nlp_goals_active") !== "false";
        if (nlpActive && rawGoals) {
          nlpGoalsNonTesseract = rawGoals.split(",").map(s => s.trim()).filter(s => s.length > 0);
        }
      } catch {}
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, stealth: stealthMode, nlpGoals: nlpGoalsNonTesseract.length > 0 ? nlpGoalsNonTesseract : undefined }),
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to send message");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.agents) {
              setActiveAgents(data.agents);
            }
            if (data.comms) {
              setAgentComms(data.comms);
            }
            if (data.orchestrator) {
            }
            if (data.status === "browsing" && data.urls) {
              const browseNotice = `*Browsing ${data.urls.length} URL(s): ${data.urls.join(", ")}...*\n\n`;
              accumulated += browseNotice;
              setStreamingContent(accumulated);
            }
            if (data.status === "searching" && data.query) {
              const searchNotice = `*Searching the web: "${data.query}"...*\n\n`;
              accumulated += searchNotice;
              setStreamingContent(accumulated);
            }
            if (data.content || (data.done && data.finalContent)) {
              if (hardTimeoutRef.current) { clearTimeout(hardTimeoutRef.current); hardTimeoutRef.current = null; }
            }
            if (data.done) {
              stopThinkingTimer();
              receivedDone = true;
              if (data.finalContent) {
                accumulated = data.finalContent;
                setStreamingContent(data.finalContent);
              }
              const finalText = accumulated;
              if (finalText) {
                lastAccumulatedRef.current = finalText;
                const optimisticAssistantMsg: Message = {
                  id: Date.now() + 1,
                  conversationId: conversationId!,
                  role: "assistant",
                  content: finalText,
                  createdAt: new Date(),
                };
                queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
              }
              break;
            }
            if (data.imageGenerated && data.replaceTag) {
              accumulated = accumulated.replace(data.replaceTag, `\n\n![Generated Image](${data.imageGenerated})\n\n`);
              setStreamingContent(accumulated);
            }
            if (data.selfCodeReload) {
              const reloadInfo = data.selfCodeReload;
              const reloadMsg = `\n\n*🔄 Code applied: ${reloadInfo.editCount} file(s) updated (${reloadInfo.paths.join(", ")}). ${reloadInfo.frontend ? "Refreshing UI..." : ""}${reloadInfo.backend ? " Server restarting..." : ""}*\n`;
              accumulated += reloadMsg;
              setStreamingContent(accumulated);
              if (reloadInfo.frontend) {
                setTimeout(() => { window.location.reload(); }, 3000);
              }
            }
            if (data.codeExecution) {
              setCodeExecutionResults(prev => [...prev, data.codeExecution]);
            }
            if (data.reset) {
              accumulated = "";
            }
            if (data.content) {
              stopThinkingTimer();
              accumulated += data.content;
              setStreamingContent(accumulated);
              lastAccumulatedRef.current = accumulated;
            }
          } catch (_e) {
          }
        }
        if (receivedDone) break;
      }

      if (sseBuffer.trim()) {
        const remaining = sseBuffer.trim();
        if (remaining.startsWith("data: ")) {
          const dataStr = remaining.slice(6).trim();
          try {
            const data = JSON.parse(dataStr);
            if (data.content) {
              accumulated += data.content;
              lastAccumulatedRef.current = accumulated;
            }
            if (data.finalContent) {
              accumulated = data.finalContent;
              lastAccumulatedRef.current = accumulated;
            }
          } catch (_e) {}
        }
      }

      if (!receivedDone && accumulated) {
        lastAccumulatedRef.current = accumulated;
        const optimisticAssistantMsg: Message = {
          id: Date.now() + 1,
          conversationId: conversationId!,
          role: "assistant",
          content: accumulated,
          createdAt: new Date(),
        };
        queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
      }

      readerRef.current = null;
      abortControllerRef.current = null;
      stopThinkingTimer();
      setIsStreaming(false);
      setStreamingContent("");
      await new Promise(resolve => setTimeout(resolve, 300));
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (timedOutRef.current) {
          const fallbackMsg = "Tessera paused. The sovereign engines are here but the synthesis took too long. Tap retry to ask again.";
          setError(fallbackMsg);
          const optimisticAssistantMsg: Message = {
            id: Date.now() + 1,
            conversationId: conversationId!,
            role: "assistant",
            content: `*${fallbackMsg}*`,
            createdAt: new Date(),
          };
          queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
          stopThinkingTimer();
          setIsStreaming(false);
          setStreamingContent("");
        }
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      if (lastAccumulatedRef.current) {
        const optimisticAssistantMsg: Message = {
          id: Date.now() + 1,
          conversationId: conversationId!,
          role: "assistant",
          content: lastAccumulatedRef.current,
          createdAt: new Date(),
        };
        queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, optimisticAssistantMsg]);
      }
      stopThinkingTimer();
      setIsStreaming(false);
      setStreamingContent("");
      await new Promise(resolve => setTimeout(resolve, 300));
      queryClient.invalidateQueries({ queryKey });
    } finally {
      if (hardTimeoutRef.current) { clearTimeout(hardTimeoutRef.current); hardTimeoutRef.current = null; }
      stopThinkingTimer();
      readerRef.current = null;
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming, queryClient, queryKey, stealthMode, puterModel, tesseractMode, messages, startThinkingTimer, stopThinkingTimer]);

  const addVoiceMessages = useCallback(async (userText: string, assistantText: string) => {
    if (!conversationId) return;
    const now = new Date();
    const userMsg: Message = { id: Date.now(), conversationId, role: "user", content: userText, createdAt: now };
    const assistantMsg: Message = { id: Date.now() + 1, conversationId, role: "assistant", content: assistantText, createdAt: new Date(now.getTime() + 1) };
    queryClient.setQueryData(queryKey, (old: Message[] = []) => [...old, userMsg, assistantMsg]);
    const adminToken = localStorage.getItem("t9_admin_token") || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken) headers["x-admin-token"] = adminToken;
    fetch(`/api/conversations/${conversationId}/puter-save`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: userText, role: "user" }),
      credentials: "include",
    }).catch(() => {});
    fetch(`/api/conversations/${conversationId}/puter-save`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: assistantText, role: "assistant" }),
      credentials: "include",
    }).catch(() => {});
  }, [conversationId, queryClient, queryKey]);

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    addVoiceMessages,
    stopStreaming,
    error,
    activeAgents,
    agentComms,
    swarmAgents,
    swarmComms,
    puterAvailable: isPuterAvailable(),
    thinkingElapsedMs,
    codeExecutionResults,
  };
}
