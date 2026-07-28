export function resolveFrontendHostPreloadUrl(preloadModuleUrl: string): string {
  return new URL("./frontend-host-preload.cjs", preloadModuleUrl).toString();
}
