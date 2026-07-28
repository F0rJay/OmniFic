export function selectBundledOmniFicWheel(entries: string[], expectedVersion: string): string | null {
  const prefix = `omnific-${expectedVersion}-`;
  return entries.find((entry) => entry.startsWith(prefix) && entry.endsWith(".whl")) ?? null;
}
