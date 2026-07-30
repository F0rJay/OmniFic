import { describe, expect, it } from "vitest";

import type { AgentMessage } from "@/lib/agent.types";

import {
  buildAgentConversationItems,
  buildAgentMessageBlocks,
} from "../components/agent/display/agent-message-blocks";
import { normalizeDisplayMessages } from "../components/agent/display/display-message-normalization";

const payload = {
  previous_model_name: "GPT-5.6 Sol",
  model_name: "GPT-5.6 Terra",
};

describe("model change transcript notice", () => {
  it("renders between rounds as a standalone notice block", () => {
    const messages: AgentMessage[] = [
      {
        id: "model-change-1",
        type: "model_changed",
        role: "system",
        status: "completed",
        display: "list",
        payload,
        timestamp: Date.parse("2026-07-30T12:00:00Z"),
      },
    ];

    const blocks = buildAgentMessageBlocks(normalizeDisplayMessages(messages));
    const items = buildAgentConversationItems(blocks);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("notice");
    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("notice");
  });
});
