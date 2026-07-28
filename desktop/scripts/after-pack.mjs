import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Developer ID signing is intentionally deferred until credentials are
 * available. An ad-hoc signature still gives macOS a structurally valid app
 * bundle and prevents ARM64 archives from being reported as damaged solely
 * because their nested binaries have no signature.
 */
export default async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const productName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productName}.app`);
  await access(appPath);
  await execFileAsync("codesign", ["--force", "--deep", "--sign", "-", appPath]);
}
