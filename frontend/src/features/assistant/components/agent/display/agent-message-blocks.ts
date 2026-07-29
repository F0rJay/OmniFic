// Modified by OmniFic contributors from OpenFic v0.7.5.
import type { AgentMessage } from "@/lib/agent.types";

import type { BlockDisplayMessage } from "./display-message-types";

export type AgentMessageBlockType = "user" | "agent" | "node";

export interface AgentMessageBlock {
  id: string;
  type: AgentMessageBlockType;
  messages: BlockDisplayMessage[];
  sourceRevisionId?: string;
  agentRoundId?: string;
  nodeId?: string;
  nodeStartedAt?: number;
  nodeEndedAt?: number;
  nodeElapsedBaseMs?: number;
  nodeStatus?: AgentMessage["status"];
}

export interface AgentMessageRound {
  id: string;
  blocks: AgentMessageBlock[];
  messages: BlockDisplayMessage[];
  sourceRevisionId?: string;
  userTimestamp?: number;
}

export type AgentConversationItem =
  | { type: "user"; block: AgentMessageBlock }
  | { type: "round"; round: AgentMessageRound };

interface BuildAgentMessageBlocksOptions {
  closeOpenNodeAt?: number;
}

function isInterruptedNodeEndMessage(message: BlockDisplayMessage): boolean {
  if (message.type !== "node_end") return false;
  if (message.status === "error") return true;
  return message.payload?.status === "error";
}

function getNodeName(message: BlockDisplayMessage | undefined): string | undefined {
  if (!message) return undefined;
  const payloadNode = message.payload?.node;
  if (typeof payloadNode === "string" && payloadNode) return payloadNode;
  return message.agent;
}

function isNodeResumeBoundaryMessage(message: BlockDisplayMessage): boolean {
  return message.type === "tool" && message.toolName === "ask_user";
}

function closeNodeSegment(block: AgentMessageBlock, endedAt: number): void {
  const startedAt = block.nodeStartedAt ?? endedAt;
  block.nodeElapsedBaseMs = (block.nodeElapsedBaseMs ?? 0) + Math.max(0, endedAt - startedAt);
  block.nodeStartedAt = endedAt;
  block.nodeEndedAt = endedAt;
}

interface ResumableNodeBlock {
  nodeName: string;
  nodeId: string;
  block: AgentMessageBlock;
  agentBlock: AgentMessageBlock | null;
}

export function buildAgentMessageBlocks(
  messages: BlockDisplayMessage[],
  options: BuildAgentMessageBlocksOptions = {},
): AgentMessageBlock[] {
  const blocks: AgentMessageBlock[] = [];
  let pendingUserRevisionId: string | undefined;
  let currentAgentBlock: AgentMessageBlock | null = null;
  let activeNodeBlock: AgentMessageBlock | null = null;
  let activeNodeId: string | undefined;
  let activeNodeHasResumeBoundary = false;
  let resumableNodeBlock: ResumableNodeBlock | null = null;
  let activeAgentRoundId: string | undefined;
  let fallbackRoundCount = 0;
  let agentBlockCount = 0;

  const ensureAgentRoundId = () => {
    if (!activeAgentRoundId) {
      fallbackRoundCount += 1;
      activeAgentRoundId = `round:initial:${fallbackRoundCount}`;
    }
    return activeAgentRoundId;
  };

  for (const message of messages) {
    if (message.type === "node_start") {
      const activeNodeName = getNodeName(activeNodeBlock?.messages[0]);
      const nextNodeName = getNodeName(message);
      if (activeNodeBlock && activeNodeName && activeNodeName === nextNodeName) {
        activeNodeBlock.nodeStatus = message.status ?? activeNodeBlock.nodeStatus;
        activeNodeBlock.nodeEndedAt = undefined;
        continue;
      }
      if (resumableNodeBlock && nextNodeName && resumableNodeBlock.nodeName === nextNodeName) {
        activeNodeBlock = resumableNodeBlock.block;
        activeNodeId = resumableNodeBlock.nodeId;
        currentAgentBlock = resumableNodeBlock.agentBlock;
        activeNodeHasResumeBoundary = false;
        activeNodeBlock.nodeStartedAt = message.timestamp;
        activeNodeBlock.nodeEndedAt = undefined;
        activeNodeBlock.nodeStatus = message.status ?? activeNodeBlock.nodeStatus;
        resumableNodeBlock = null;
        continue;
      }
      resumableNodeBlock = null;
      currentAgentBlock = null;
      const agentRoundId = ensureAgentRoundId();
      activeNodeId = message.id;
      activeNodeHasResumeBoundary = false;
      activeNodeBlock = {
        id: `node:${message.id}`,
        type: "node",
        messages: [message],
        sourceRevisionId: pendingUserRevisionId,
        agentRoundId,
        nodeId: message.id,
        nodeStartedAt: message.timestamp,
        nodeStatus: message.status,
      };
      blocks.push(activeNodeBlock);
      continue;
    }

    if (message.type === "node_end") {
      if (activeNodeBlock) {
        closeNodeSegment(activeNodeBlock, message.timestamp);
        activeNodeBlock.nodeStatus = message.status ?? activeNodeBlock.nodeStatus;
        const nodeName = getNodeName(activeNodeBlock.messages[0]);
        const canResumeNode = activeNodeHasResumeBoundary || isInterruptedNodeEndMessage(message);
        if (canResumeNode && nodeName && activeNodeId) {
          resumableNodeBlock = {
            nodeName,
            nodeId: activeNodeId,
            block: activeNodeBlock,
            agentBlock: currentAgentBlock,
          };
        } else {
          resumableNodeBlock = null;
        }
      }
      currentAgentBlock = null;
      activeNodeBlock = null;
      activeNodeId = undefined;
      activeNodeHasResumeBoundary = false;
      continue;
    }

    if (message.type === "user_request") {
      if (activeNodeBlock) {
        closeNodeSegment(activeNodeBlock, message.timestamp);
        activeNodeBlock.nodeStatus = activeNodeBlock.nodeStatus === "error" ? "error" : "completed";
      }
      currentAgentBlock = null;
      activeNodeBlock = null;
      activeNodeId = undefined;
      activeNodeHasResumeBoundary = false;
      resumableNodeBlock = null;
      pendingUserRevisionId = message.revisionId;
      activeAgentRoundId = `round:${message.id}`;
      blocks.push({
        id: `user:${message.id}`,
        type: "user",
        messages: [message],
        sourceRevisionId: message.revisionId,
      });
      continue;
    }

    if (!currentAgentBlock) {
      const agentRoundId = ensureAgentRoundId();
      agentBlockCount += 1;
      currentAgentBlock = {
        id: `agent:${agentRoundId}:${agentBlockCount}`,
        type: "agent",
        messages: [],
        sourceRevisionId: pendingUserRevisionId,
        agentRoundId,
        nodeId: activeNodeId,
      };
      blocks.push(currentAgentBlock);
    }
    if (activeNodeBlock && isNodeResumeBoundaryMessage(message)) {
      activeNodeHasResumeBoundary = true;
    }
    currentAgentBlock.messages.push(message);
  }

  if (activeNodeBlock && typeof options.closeOpenNodeAt === "number") {
    closeNodeSegment(
      activeNodeBlock,
      Math.max(activeNodeBlock.nodeStartedAt ?? options.closeOpenNodeAt, options.closeOpenNodeAt),
    );
    activeNodeBlock.nodeStatus = activeNodeBlock.nodeStatus === "error" ? "error" : "completed";
  }

  return blocks;
}

export function buildAgentConversationItems(blocks: AgentMessageBlock[]): AgentConversationItem[] {
  const items: AgentConversationItem[] = [];
  const rounds = new Map<string, AgentMessageRound>();

  const ensureRound = (
    roundId: string,
    sourceRevisionId?: string,
    userTimestamp?: number,
  ): AgentMessageRound => {
    const existing = rounds.get(roundId);
    if (existing) {
      if (!existing.sourceRevisionId && sourceRevisionId)
        existing.sourceRevisionId = sourceRevisionId;
      if (existing.userTimestamp === undefined && userTimestamp !== undefined) {
        existing.userTimestamp = userTimestamp;
      }
      return existing;
    }

    const round: AgentMessageRound = {
      id: roundId,
      blocks: [],
      messages: [],
      sourceRevisionId,
      userTimestamp,
    };
    rounds.set(roundId, round);
    items.push({ type: "round", round });
    return round;
  };

  for (const block of blocks) {
    if (block.type === "user") {
      items.push({ type: "user", block });
      const message = block.messages[0];
      ensureRound(`round:${message?.id ?? block.id}`, block.sourceRevisionId, message?.timestamp);
      continue;
    }

    const roundId = block.agentRoundId ?? `round:orphan:${block.id}`;
    const round = ensureRound(roundId, block.sourceRevisionId);
    round.blocks.push(block);
    if (block.type === "agent") round.messages.push(...block.messages);
  }

  return items;
}

export function getNodeElapsedMs(block: AgentMessageBlock, now = Date.now()): number {
  if (block.type !== "node") return 0;
  const elapsedBaseMs = block.nodeElapsedBaseMs ?? 0;
  if (typeof block.nodeStartedAt !== "number") return elapsedBaseMs;
  const end = typeof block.nodeEndedAt === "number" ? block.nodeEndedAt : now;
  return Math.max(0, elapsedBaseMs + end - block.nodeStartedAt);
}

export function getAgentRoundLatestTimestamp(round: AgentMessageRound): number | undefined {
  let latest = round.userTimestamp;
  for (const block of round.blocks) {
    for (const message of block.messages) {
      if (!Number.isFinite(message.timestamp)) continue;
      latest = latest === undefined ? message.timestamp : Math.max(latest, message.timestamp);
    }
  }
  return latest;
}

interface AgentRoundElapsedOptions {
  now?: number;
  activeStartedAt?: number;
}

export function getAgentRoundElapsedMs(
  round: AgentMessageRound,
  options: AgentRoundElapsedOptions = {},
): number {
  const now = options.now ?? Date.now();
  const nodeBlocks = round.blocks.filter((block) => block.type === "node");
  if (nodeBlocks.length > 0) {
    return nodeBlocks.reduce((total, block) => total + getNodeElapsedMs(block, now), 0);
  }

  const timestamps = round.messages
    .map((message) => message.timestamp)
    .filter((timestamp) => Number.isFinite(timestamp));
  const earliestMessageTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
  const latestMessageTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  const startedAt =
    options.activeStartedAt ?? earliestMessageTimestamp ?? round.userTimestamp ?? now;
  const endedAt = options.now ?? latestMessageTimestamp ?? startedAt;
  return Math.max(0, endedAt - startedAt);
}

export function getLatestAssistantContentFromBlock(block: AgentMessageBlock): string {
  for (let index = block.messages.length - 1; index >= 0; index -= 1) {
    const message = block.messages[index];
    if (message?.type === "agent_output" && message.content?.trim()) {
      return message.content.trim();
    }
  }
  return "";
}
