import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    },
  });
});

import { getToolDescriptor, isRegisteredToolName } from "./tool-message-registry";

const WRITING_READINESS_TOOLS = [
  "get_writing_readiness",
  "authorize_writing_request",
  "submit_writing_readiness_review",
] as const;

describe("tool message registry", () => {
  it.each(WRITING_READINESS_TOOLS)("registers the backend tool %s", (toolName) => {
    const descriptor = getToolDescriptor(toolName);

    expect(isRegisteredToolName(toolName)).toBe(true);
    expect(descriptor).not.toBeNull();
    expect(descriptor?.getTitle({ toolName } as never)).not.toBe("Unregistered tool");
  });

  it("uses a quiet generic descriptor for a newly added backend tool", () => {
    const descriptor = getToolDescriptor("future_backend_tool");

    expect(isRegisteredToolName("future_backend_tool")).toBe(false);
    expect(descriptor).not.toBeNull();
    expect(descriptor?.contentMode).toBe("hidden");
    expect(descriptor?.getTitle({ toolName: "future_backend_tool" } as never)).toBe(
      "future_backend_tool",
    );
  });
});
