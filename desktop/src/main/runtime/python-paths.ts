import path from "node:path";

/**
 * Resolve the interpreter within an extracted python-build-standalone archive.
 * Keep this Electron-free so the archive layout can be tested under Node.
 */
export function getPortablePythonPath(rootDir: string, platform = process.platform): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  if (platform === "win32") return pathApi.join(rootDir, "python", "python.exe");
  return pathApi.join(rootDir, "python", "bin", "python3");
}
