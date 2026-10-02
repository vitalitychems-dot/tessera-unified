export type ProviderStatus = "up" | "degraded" | "down" | "unknown";
export type ProviderTier = "primary" | "fallback" | "backup";

export interface ProviderHealth {
  id: string;
  name: string;
  status: ProviderStatus;
  tier: ProviderTier;
  latencyMs: number;
  successRate: number;
  lastChecked: Date;
  errorCount: number;
  totalRequests: number;
}

export interface ProviderLeaderboard {
  providers: ProviderHealth[];
  bestProvider: string | null;
  totalAvailable: number;
  averageLatency: number;
}

export type AgentStatus = "active" | "idle" | "failed" | "recovering" | "suspended";
export type AgentRole = "orchestrator" | "worker" | "validator" | "monitor" | "memory" | "governance";

export interface AgentDescriptor {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  lastHeartbeat: Date;
  tasksCompleted: number;
  tasksFailed: number;
  currentTask?: string;
  metadata?: Record<string, unknown>;
}

export interface SwarmState {
  totalAgents: number;
  activeAgents: number;
  consensusThreshold: number;
  consensusReached: boolean;
  consensusMethod: string;
  agents: AgentDescriptor[];
  recentMessages: SwarmMessage[];
}

export interface SwarmMessage {
  from: string;
  to?: string;
  content: string;
  timestamp: Date;
  type: "consensus" | "task" | "alert" | "heartbeat" | "governance";
}

export type SovereigntyLevel = "full" | "partial" | "compromised" | "unknown";
export type IntegrityStatus = "clean" | "tampered" | "missing" | "unverified";

export interface SovereigntyMetrics {
  level: SovereigntyLevel;
  score: number;
  integrityChecks: number;
  integrityPassed: number;
  lastAudit: Date;
  anomaliesDetected: number;
  selfHealingEvents: number;
  externalDependencies: number;
}

export interface FileIntegrityRecord {
  filePath: string;
  checksum: string;
  status: IntegrityStatus;
  lastChecked: Date;
  previousChecksum?: string;
}

export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type AnomalyType = "memory" | "cpu" | "error_rate" | "latency" | "integrity" | "connectivity" | "unknown";

export interface AnomalyEvent {
  id?: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  metrics: Record<string, number | string>;
  detectedAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
  autoRemediated: boolean;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogCategory = "system" | "agent" | "provider" | "integrity" | "anomaly" | "recovery" | "audit";

export interface SystemLog {
  id?: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, unknown>;
  createdAt: Date;
  source: string;
}

export type ModuleStatus = "initializing" | "running" | "degraded" | "failed" | "stopped" | "recovering";

export interface ModuleHealth {
  name: string;
  status: ModuleStatus;
  startedAt?: Date;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemDiagnostics {
  status: "healthy" | "degraded" | "critical";
  healthScore: number;
  uptime: {
    seconds: number;
    formatted: string;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssМВ?: number;
    percent: number;
  };
  cpu: {
    loadAvg: number[];
    cores: number;
    model?: string;
  };
  integrity: {
    status: IntegrityStatus;
    totalFiles: number;
    checkedFiles: number;
    passedFiles: number;
    failedFiles: number;
    lastCheck: Date | null;
  };
  anomalies: {
    total: number;
    active: number;
    critical: number;
    lastDetected: Date | null;
  };
  modules: ModuleHealth[];
  sovereignty: SovereigntyMetrics;
  tasks: {
    active: number;
    total: number;
  };
  llmProviders: {
    totalProviders: number;
    healthy: number;
    degraded: number;
    down: number;
    avgHealthScore: number;
  };
  recovery: {
    totalAttempts: number;
    successfulAttempts: number;
    lastAttempt: Date | null;
  };
  generatedAt: Date;
}

export type EvaluationMetric = "accuracy" | "latency" | "cost" | "reliability" | "quality";

export interface EvaluationResult {
  agentId: string;
  taskId: string;
  metric: EvaluationMetric;
  score: number;
  maxScore: number;
  normalizedScore: number;
  details?: Record<string, unknown>;
  evaluatedAt: Date;
}

export interface RecoveryAction {
  id: string;
  triggeredBy: string;
  targetModule: string;
  actionType: "restart" | "restore" | "reconnect" | "reset" | "escalate";
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
