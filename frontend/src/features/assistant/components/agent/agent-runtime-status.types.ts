import type { AgentSessionStatus } from "@/lib/agent.types";

export interface AgentRuntimeStatusInfo {
  taskId: string | null;
  sessionId: string | null;
  status: AgentSessionStatus;
  activityLabel: string;
  runStartedAt: string | null;
  contextInputTokens: number;
  contextLength: number;
  tokenInput: number;
  tokenOutput: number;
  tokenCache: number;
  rateLimits: null;
}
