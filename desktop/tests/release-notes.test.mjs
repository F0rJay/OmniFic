import assert from "node:assert/strict";
import test from "node:test";

import { cleanReleaseNotes, extractChangelogReleaseNotes } from "../dist/shared/release-notes.js";

test("removes GitHub's link-only generated release notes", () => {
  assert.equal(
    cleanReleaseNotes("**Full Changelog**: https://github.com/F0rJay/OmniFic/compare/v0.8.1...v0.8.2"),
    undefined,
  );
});

test("keeps curated Markdown release notes", () => {
  assert.equal(
    cleanReleaseNotes("### 本次更新\n\n- 支持导出章节\n- 优化更新体验"),
    "### 本次更新\n\n- 支持导出章节\n- 优化更新体验",
  );
});

test("extracts the requested version without including adjacent versions", () => {
  const changelog = `# Changelog

## 0.8.2 (2026-07-31)

- 支持导出章节
- 优化更新体验

## 0.8.1 (2026-07-29)

- 修复启动问题
`;

  assert.equal(
    extractChangelogReleaseNotes(changelog, "v0.8.2"),
    "- 支持导出章节\n- 优化更新体验",
  );
  assert.equal(extractChangelogReleaseNotes(changelog, "0.8.20"), undefined);
});
