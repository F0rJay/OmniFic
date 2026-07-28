import { readFileSync } from "node:fs";

const stylesheet = readFileSync(new URL("./general-settings.css", import.meta.url), "utf8");

function getRuleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match?.[1]) throw new Error(`找不到样式规则：${selector}`);
  return match[1];
}

describe("theme preset layout", () => {
  it("overrides Chromium button alignment and stretches the preview", () => {
    expect(getRuleBody(".theme-preset-card")).toContain("align-items: stretch;");
    expect(getRuleBody(".theme-preset-card__preview")).toContain("width: 100%;");
  });
});
