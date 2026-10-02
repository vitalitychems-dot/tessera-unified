import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { tesseraWS } from "./websocket";
import { useAdmin } from "./adminContext";
import { queryClient } from "./queryClient";

export interface MeshPeer {
  sessionId: string;
  connectedAt: string;
  lastHeartbeat: string;
  metadata: {
    userAgent?: string;
    currentPage?: string;
    activeAgents?: string[];
    taskCount?: number;
  };
}

export interface MeshEvent {
  id: string;
  type: string;
  fromSession?: string;
  eventType?: string;
  payload?: any;
  timestamp: number;
}

export type MeshHealth = "connecting" | "isolated" | "entangled" | "degraded" | "offline";

export interface MeshSharedState {
  meshHealth: string;
  peerCount?: number;
  aggregateStats?: {
    totalActiveTasks: number;
    activeAgents: string[];
    sessionPages: Array<{ sessionId: string; page: string }>;
  };
  recentTasks?: Array<{
    taskId: string;
    task: string;
    selectedDomains: string[];
    status: string;
    agentCount: number;
    overallQuality: number | null;
    createdAt: string | null;
  }>;
  recentDecisions?: Array<{
    id: number;
    action: string;
    category: string | null;
    significance: string | null;
    decidedAt: Date | null;
  }>;
}

interface MeshState {
  sessionId: string | null;
  peers: MeshPeer[];
  health: MeshHealth;
  events: MeshEvent[];
  isRegistered: boolean;
  peerCount: number;
  coordinationMessages: MeshEvent[];
  sharedState: MeshSharedState | null;
  claimedTasks: Set<string>;
  broadcastEvent: (eventType: string, payload: any) => void;
  sendAgentCoordination: (agentId: string, action: string, taskId: string, domain: string, payload?: any) => void;
  updateMetadata: (metadata: Partial<MeshPeer["metadata"]>) => void;
  claimTask: (taskId: string) => boolean;
}

const MeshContext = createContext<MeshState>({
  sessionId: null,
  peers: [],
  health: "offline",
  events: [],
  isRegistered: false,
  peerCount: 0,
  coordinationMessages: [],
  sharedState: null,
  claimedTasks: new Set(),
  broadcastEvent: () => {},
  sendAgentCoordination: () => {},
  updateMetadata: () => {},
  claimTask: () => true,
});

const MAX_EVENTS = 50;
const HEARTBEAT_INTERVAL_MS = 12_000;

export function MeshProvider({ children }: { children: ReactNode }) {
  const { isAdmin, token } = useAdmin();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [health, setHealth] = useState<MeshHealth>("offline");
  const [events, setEvents] = useState<MeshEvent[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [coordinationMessages, setCoordinationMessages] = useState<MeshEvent[]>([]);
  const [sharedState, setSharedState] = useState<MeshSharedState | null>(null);
  const claimedTasksRef = useRef<Set<string>>(new Set());
  const [claimedTasks, setClaimedTasks] = useState<Set<string>>(new Set());

  const isRegisteredRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const sovereignKeyRef = useRef<string>("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPageRef = useRef<string>(window.location.pathname);

  const addEvent = useCallback((event: Omit<MeshEvent, "id">) => {
    setEvents(prev => {
      const newEvent = { ...event, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
      return [newEvent, ...prev].slice(0, MAX_EVENTS);
    });
  }, []);

  const broadcastEvent = useCallback((eventType: string, payload: any) => {
    if (!isRegisteredRef.current) return;
    tesseraWS.send({ type: "mesh:broadcast", eventType, payload });
  }, []);

  const sendAgentCoordination = useCallback((agentId: string, action: string, taskId: string, domain: string, payload?: any) => {
    if (!isRegisteredRef.current) return;
    tesseraWS.send({ type: "mesh:agent-coordination", agentId, action, taskId, domain, payload });
  }, []);

  const updateMetadata = useCallback((metadata: Partial<MeshPeer["metadata"]>) => {
    if (!isRegisteredRef.current) return;
    tesseraWS.send({ type: "mesh:update-metadata", metadata });
  }, []);

  const claimTask = useCallback((taskId: string): boolean => {
    if (claimedTasksRef.current.has(taskId)) return false;
    claimedTasksRef.current.add(taskId);
    setClaimedTasks(new Set(claimedTasksRef.current));
    if (isRegisteredRef.current) {
      tesseraWS.send({ type: "mesh:agent-coordination", agentId: sessionIdRef.current ?? "unknown", action: "task-claimed", taskId, domain: "swarm" });
    }
    return true;
  }, []);

  useEffect(() => {
    if (!isAdmin || !token) {
      setHealth("offline");
      setIsRegistered(false);
      isRegisteredRef.current = false;
      return;
    }

    setHealth("connecting");

    const connectTimeout = setTimeout(() => {
      if (!isRegisteredRef.current) {
        setHealth("isolated");
      }
    }, 5000);

    const sovereignKey = localStorage.getItem("t9_sovereign_key") || token;
    sovereignKeyRef.current = sovereignKey;

    const sendAuth = () => {
      tesseraWS.send({
        type: "mesh:auth",
        token: sovereignKeyRef.current,
        metadata: {
          currentPage: currentPageRef.current,
          activeAgents: [],
          taskCount: 0,
        },
      });
    };

    const handleMeshMessage = (data: any) => {
      if (data.type === "mesh:connected") {
        setHealth("connecting");
        sendAuth();
      } else if (data.type === "mesh:registered") {
        setSessionId(data.sessionId);
        sessionIdRef.current = data.sessionId;
        setIsRegistered(true);
        isRegisteredRef.current = true;
        const peerList: MeshPeer[] = (data.peers || []).filter((p: MeshPeer) => p.sessionId !== data.sessionId);
        setPeers(peerList);
        setHealth(peerList.length > 0 ? "entangled" : "isolated");
        if (data.sharedState) setSharedState(data.sharedState as MeshSharedState);
        addEvent({ type: "mesh:registered", timestamp: data.timestamp || Date.now(), payload: { sessionId: data.sessionId, peerCount: peerList.length } });
      } else if (data.type === "mesh:peer-joined") {
        if (data.sessionId === sessionIdRef.current) return;
        setPeers(prev => {
          const filtered = prev.filter(p => p.sessionId !== data.sessionId);
          const newPeer: MeshPeer = {
            sessionId: data.sessionId,
            connectedAt: new Date(data.timestamp).toISOString(),
            lastHeartbeat: new Date(data.timestamp).toISOString(),
            metadata: data.metadata || {},
          };
          const updated = [...filtered, newPeer];
          setHealth(updated.length > 0 ? "entangled" : "isolated");
          return updated;
        });
        addEvent({ type: "mesh:peer-joined", fromSession: data.sessionId, timestamp: data.timestamp || Date.now(), payload: data.metadata });
      } else if (data.type === "mesh:peer-left") {
        setPeers(prev => {
          const updated = prev.filter(p => p.sessionId !== data.sessionId);
          setHealth(updated.length > 0 ? "entangled" : "isolated");
          return updated;
        });
        addEvent({ type: "mesh:peer-left", fromSession: data.sessionId, timestamp: data.timestamp || Date.now(), payload: { reason: data.reason } });
      } else if (data.type === "mesh:peer-updated") {
        setPeers(prev => prev.map(p =>
          p.sessionId === data.sessionId
            ? { ...p, metadata: { ...p.metadata, ...data.metadata }, lastHeartbeat: new Date(data.timestamp).toISOString() }
            : p
        ));
      } else if (data.type === "mesh:heartbeat-ack") {
        const peerList: MeshPeer[] = (data.peers || []).filter((p: MeshPeer) => p.sessionId !== sessionIdRef.current);
        setPeers(peerList);
        setHealth(peerList.length > 0 ? "entangled" : "isolated");
      } else if (data.type === "mesh:event") {
        addEvent({
          type: "mesh:event",
          fromSession: data.fromSession,
          eventType: data.eventType,
          payload: data.payload,
          timestamp: data.timestamp || Date.now(),
        });
        if (data.fromSession) {
          const et = data.eventType as string;
          if (et === "swarm:task-saved") {
            queryClient.invalidateQueries({ queryKey: ["/api/swarm/tasks"] });
          } else if (et === "memory:stored") {
            queryClient.invalidateQueries({ queryKey: ["/api/memory/embeddings"] });
          } else if (et === "memory:decision-logged") {
            queryClient.invalidateQueries({ queryKey: ["/api/memory/decisions"] });
          } else if (et === "reasoning:goal-created") {
            queryClient.invalidateQueries({ queryKey: ["/api/reasoning/goals"] });
          } else if (et === "reasoning:trace-completed") {
            queryClient.invalidateQueries({ queryKey: ["/api/reasoning/traces"] });
          }
        }
      } else if (data.type === "mesh:agent-coordination") {
        const coordEvent: Omit<MeshEvent, "id"> = {
          type: "mesh:agent-coordination",
          fromSession: data.fromSession,
          eventType: data.action,
          payload: { agentId: data.agentId, taskId: data.taskId, domain: data.domain, ...data.payload },
          timestamp: data.timestamp || Date.now(),
        };
        addEvent(coordEvent);
        setCoordinationMessages(prev => [{ ...coordEvent, id: `coord-${Date.now()}` }, ...prev].slice(0, 20));
        if (data.action === "task-claimed" && data.taskId) {
          claimedTasksRef.current.add(data.taskId);
          setClaimedTasks(new Set(claimedTasksRef.current));
        }
      } else if (data.type === "mesh:auth-failed") {
        setHealth("degraded");
        setIsRegistered(false);
        isRegisteredRef.current = false;
      }
    };

    const unsub = tesseraWS.subscribe("mesh", handleMeshMessage);

    tesseraWS.connect();

    if (tesseraWS.connected && !isRegisteredRef.current) {
      sendAuth();
    }

    heartbeatRef.current = setInterval(() => {
      if (isRegisteredRef.current) {
        tesseraWS.send({
          type: "mesh:heartbeat",
          metadata: {
            currentPage: currentPageRef.current,
            activeAgents: [],
            taskCount: 0,
          },
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleNavigation = () => {
      currentPageRef.current = window.location.pathname;
      if (isRegisteredRef.current) {
        tesseraWS.send({ type: "mesh:update-metadata", metadata: { currentPage: window.location.pathname } });
      }
    };
    window.addEventListener("popstate", handleNavigation);

    return () => {
      clearTimeout(connectTimeout);
      unsub();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      window.removeEventListener("popstate", handleNavigation);
      isRegisteredRef.current = false;
      sessionIdRef.current = null;
      setIsRegistered(false);
      setHealth("offline");
      setSessionId(null);
      setPeers([]);
    };
  }, [isAdmin, token, addEvent]);

  return (
    <MeshContext.Provider value={{
      sessionId,
      peers,
      health,
      events,
      isRegistered,
      peerCount: peers.length,
      coordinationMessages,
      sharedState,
      claimedTasks,
      broadcastEvent,
      sendAgentCoordination,
      updateMetadata,
      claimTask,
    }}>
      {children}
    </MeshContext.Provider>
  );
}

export function useMesh() {
  return useContext(MeshContext);
}
