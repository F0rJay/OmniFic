import { transformSettings } from "./settings-api";
import type { SettingsResponse } from "./settings.types";

function createSettingsResponse(overrides: Partial<SettingsResponse> = {}): SettingsResponse {
  return {
    language: "zh-CN",
    theme: "light",
    font_family: "SourceHanSerifCN-VF",
    default_model: "",
    light_model: "",
    default_embedding_model: "",
    index_mode: "off",
    index_enabled_projects: [],
    index_chunk_size: 800,
    index_chunk_overlap: 100,
    index_auto_strategy: "off",
    index_rerank_enabled: false,
    default_rerank_model: "",
    agent_bypass_tool_approval: false,
    agent_tool_permissions: [],
    audit_persist_details: false,
    ...overrides,
  };
}

describe("transformSettings", () => {
  it("rejects an HTML document returned by the desktop app protocol", () => {
    expect(() => transformSettings("<!doctype html>" as unknown as SettingsResponse)).toThrow(
      "设置响应格式无效",
    );
  });

  it("normalizes an unsupported theme instead of exposing it to the renderer", () => {
    expect(transformSettings(createSettingsResponse({ theme: "system" })).theme).toBe("light");
  });
});
