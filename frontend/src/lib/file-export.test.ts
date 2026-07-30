import { describe, expect, it } from "vitest";

import {
  buildCharacterCardExport,
  buildMarkdownExport,
  buildSillyTavernWorldBookExport,
  sanitizeExportFilename,
} from "./file-export";

describe("file export helpers", () => {
  it("creates a safe, bounded file name", () => {
    expect(sanitizeExportFilename("  chapter: 1 / draft?.  ", "export")).toBe(
      "chapter_ 1 _ draft_",
    );
    expect(sanitizeExportFilename("...", "export")).toBe("export");
    expect(sanitizeExportFilename("a".repeat(160), "export")).toHaveLength(120);
  });

  it("builds a markdown document from the current title and content", () => {
    expect(buildMarkdownExport("Chapter 1", "Opening\r\n\r\nEnding\n")).toBe(
      "# Chapter 1\n\nOpening\n\nEnding\n",
    );
  });

  it("builds a re-importable SillyTavern world book", () => {
    const result = JSON.parse(
      buildSillyTavernWorldBookExport({
        uid: 7,
        name: "Sky City",
        content: "A floating city.",
        order: 3,
        isEnabled: false,
      }),
    );

    expect(result.entries["7"]).toMatchObject({
      uid: 7,
      name: "Sky City",
      comment: "Sky City",
      content: "A floating city.",
      disable: true,
      order: 3,
    });
  });

  it("builds a SillyTavern V2 character card", () => {
    const result = JSON.parse(
      buildCharacterCardExport({
        id: "character-1",
        name: "Lin",
        description: "A cartographer.",
        imageUrl: "/avatar.png",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      }),
    );

    expect(result).toMatchObject({
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: "Lin",
        description: "A cartographer.",
        extensions: { omnific: { id: "character-1", image_url: "/avatar.png" } },
      },
    });
  });
});
