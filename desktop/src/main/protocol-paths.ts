const BACKEND_PATH_PREFIXES = [
  "/api/",
  "/socket.io/",
  "/icons/",
  "/covers/",
  "/character-images/",
];

export function isBackendResourcePath(pathname: string): boolean {
  return BACKEND_PATH_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  );
}
