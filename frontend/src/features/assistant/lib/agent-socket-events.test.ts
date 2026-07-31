vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
});

const { toAgentEvent } = await import("./agent-socket-events");

describe("compaction socket events", () => {
  it("preserves persisted compaction window metrics", () => {
    const event = toAgentEvent("agent:compaction_success", "session-1", {
      session_id: "session-1",
      compaction_id: "cmp-1",
      trigger: "auto",
      start_seq: 2,
      end_seq: 5,
      source_input_tokens: 500,
      summary_tokens: 40,
      generation: 3,
      model_input_tokens: 460,
      post_compaction_tokens: 180,
      retained_user_tokens: 70,
      dropped_turn_count: 1,
      dropped_message_count: 2,
      strategy: "token_budget",
      fallback_reason: "llm_error",
    });

    expect(event.payload).toMatchObject({
      generation: 3,
      model_input_tokens: 460,
      post_compaction_tokens: 180,
      retained_user_tokens: 70,
      dropped_turn_count: 1,
      dropped_message_count: 2,
      strategy: "token_budget",
      fallback_reason: "llm_error",
    });
  });

  it("keeps token-budget fallback attached to the running compaction", () => {
    const event = toAgentEvent("agent:compaction_fallback", "session-1", {
      session_id: "session-1",
      trigger: "auto",
      reason: "llm_error",
      start_seq: 2,
      end_seq: 5,
      source_input_tokens: 500,
      generation: 3,
      post_compaction_tokens: 180,
      retained_user_tokens: 70,
    });

    expect(event).toMatchObject({
      id: "compaction:session-1:2:5:pending",
      type: "compaction",
      status: "running",
      payload: {
        strategy: "token_budget",
        fallback_reason: "llm_error",
      },
    });
  });

  it("maps cancellation to a hidden terminal compaction event", () => {
    const event = toAgentEvent("agent:compaction_cancelled", "session-1", {
      session_id: "session-1",
      task_id: "task-1",
      trigger: "auto",
      start_seq: 2,
      end_seq: 5,
      source_input_tokens: 500,
      phase: "model_request",
      persisted: false,
    });

    expect(event).toMatchObject({
      id: "compaction:session-1:2:5:pending",
      type: "compaction",
      status: "error",
      display: "hidden",
      payload: {
        session_id: "session-1",
        trigger: "auto",
        phase: "model_request",
        persisted: false,
        cancelled: true,
      },
    });
  });
});
