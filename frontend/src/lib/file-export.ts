interface TextFileDownload {
  filename: string;
  content: string;
  mimeType: string;
}

interface SillyTavernWorldBookEntry {
  uid: number;
  name: string;
  content: string;
  order: number;
  isEnabled: boolean;
}

interface CharacterCardData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*]/g;
const MAX_FILENAME_STEM_LENGTH = 120;

export function sanitizeExportFilename(name: string, fallback: string): string {
  const sanitized = Array.from(name, (character) =>
    character.charCodeAt(0) < 32 ? "_" : character,
  )
    .join("")
    .trim()
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, MAX_FILENAME_STEM_LENGTH);

  return sanitized || fallback;
}

export function buildMarkdownExport(title: string, content: string): string {
  const normalizedTitle = title.trim().replace(/\s*\n\s*/g, " ");
  const normalizedContent = content.replace(/\r\n?/g, "\n").trimEnd();

  if (!normalizedTitle) return normalizedContent ? `${normalizedContent}\n` : "";
  if (!normalizedContent) return `# ${normalizedTitle}\n`;
  return `# ${normalizedTitle}\n\n${normalizedContent}\n`;
}

export function buildSillyTavernWorldBookExport(entry: SillyTavernWorldBookEntry): string {
  return `${JSON.stringify(
    {
      entries: {
        [String(entry.uid)]: {
          uid: entry.uid,
          name: entry.name,
          content: entry.content,
          comment: entry.name,
          disable: !entry.isEnabled,
          order: entry.order,
        },
      },
    },
    null,
    2,
  )}\n`;
}

export function buildCharacterCardExport(character: CharacterCardData): string {
  return `${JSON.stringify(
    {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: character.name,
        description: character.description,
        personality: "",
        scenario: "",
        first_mes: "",
        mes_example: "",
        creator_notes: "",
        system_prompt: "",
        post_history_instructions: "",
        alternate_greetings: [],
        tags: [],
        creator: "OmniFic",
        character_version: "1.0",
        extensions: {
          omnific: {
            id: character.id,
            image_url: character.imageUrl,
            created_at: character.createdAt,
            updated_at: character.updatedAt,
          },
        },
      },
    },
    null,
    2,
  )}\n`;
}

export function downloadTextFile({ filename, content, mimeType }: TextFileDownload): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function exportMarkdownFile(title: string, content: string, fallbackName: string): void {
  downloadTextFile({
    filename: `${sanitizeExportFilename(title, fallbackName)}.md`,
    content: buildMarkdownExport(title, content),
    mimeType: "text/markdown",
  });
}

export function exportJsonFile(filenameStem: string, content: string, fallbackName: string): void {
  downloadTextFile({
    filename: `${sanitizeExportFilename(filenameStem, fallbackName)}.json`,
    content,
    mimeType: "application/json",
  });
}
