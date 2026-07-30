// Modified by OmniFic contributors from OpenFic v0.7.5.

const fullChangelogLine = /^\s*(?:\*\*|__)?full changelog(?:\*\*|__)?\s*:\s*https?:\/\/\S+\s*$/i;
const compareLinkLine = /^\s*(?:https?:\/\/)?github\.com\/[^/]+\/[^/]+\/compare\/\S+\s*$/i;

export function cleanReleaseNotes(releaseNotes: string | undefined): string | undefined {
  if (!releaseNotes) return undefined;

  const cleaned = releaseNotes
    .split(/\r?\n/)
    .filter((line) => !fullChangelogLine.test(line) && !compareLinkLine.test(line))
    .join("\n")
    .trim();

  return cleaned || undefined;
}

export function extractChangelogReleaseNotes(changelog: string, version: string): string | undefined {
  const normalizedVersion = version.replace(/^v/i, "");
  const escapedVersion = normalizedVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const versionPattern = new RegExp(`(^|[^0-9.])v?${escapedVersion}($|[^0-9.])`, "i");
  const lines = changelog.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.startsWith("## ") && versionPattern.test(line.slice(3)));
  if (headingIndex < 0) return undefined;

  const nextHeadingOffset = lines.slice(headingIndex + 1).findIndex((line) => line.startsWith("## "));
  const sectionEnd = nextHeadingOffset < 0 ? lines.length : headingIndex + 1 + nextHeadingOffset;
  return cleanReleaseNotes(lines.slice(headingIndex + 1, sectionEnd).join("\n"));
}
