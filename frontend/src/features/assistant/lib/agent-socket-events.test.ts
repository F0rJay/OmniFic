vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
});

const { toAgentEvent } = await import("./agent-socket-events");

describe("compaction socket events", () => {
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
