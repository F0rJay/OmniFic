// Modified by OmniFic contributors from OpenFic v0.7.5.
import { app } from "electron";
import { spawn } from "node:child_process";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { downloadFile, extractTarGz } from "./archive.js";
import { resolvePythonAsset } from "./python-assets.js";
import { getPortablePythonLicensePath, getPortablePythonPath } from "./python-paths.js";
import { matchesPortablePythonVersion } from "./python-version.js";

export { getPortablePythonPath } from "./python-paths.js";

export interface PortablePython {
  pythonPath: string;
  rootDir: string;
  wasReplaced: boolean;
}

export interface DownloadProgress {
  received: number;
  total: number;
}

export interface RuntimeIntegrityCheck {
  complete: boolean;
  message: string;
}

export function getDefaultInstallDir(): string {
  return app.getPath("userData");
}

export function resolveRuntimeDir(installDir: string | null): string {
  const base = installDir ?? app.getPath("userData");
  return path.join(base, "runtime");
}

export function getPortablePythonRoot(runtimeDir: string): string {
  return path.join(runtimeDir, "python");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const value = bytes / Math.pow(1024, Math.floor(Math.log(bytes) / Math.log(1024)));
  const unit = units[Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)];
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

function readPythonVersion(pythonPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(pythonPath, ["--version"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const appendOutput = (chunk: Buffer | string) => {
      output += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    };
    child.stdout.on("data", appendOutput);
    child.stderr.on("data", appendOutput);
    child.on("error", () => resolve(null));
    child.on("exit", (code) => resolve(code === 0 ? output.trim() || null : null));
  });
}

export async function inspectPortablePython(runtimeDir: string): Promise<RuntimeIntegrityCheck> {
  const rootDir = getPortablePythonRoot(runtimeDir);
  const asset = resolvePythonAsset();
  const pythonPath = getPortablePythonPath(rootDir);
  if (!(await pathExists(pythonPath))) {
    return { complete: false, message: "未找到便携式 Python" };
  }

  const installedVersion = await readPythonVersion(pythonPath);
  if (!installedVersion || !matchesPortablePythonVersion(installedVersion, asset.version)) {
    return { complete: false, message: "便携式 Python 不可用或版本不匹配" };
  }
  if (!(await pathExists(getPortablePythonLicensePath(rootDir, asset.version)))) {
    return { complete: false, message: "便携式 Python 缺少许可证文件" };
  }

  return { complete: true, message: "便携式 Python 已就绪" };
}

export async function ensurePortablePython(
  runtimeDir: string,
  onPhase: (phase: "download" | "extract", message: string) => void,
  onDownload: (progress: DownloadProgress) => void,
): Promise<PortablePython> {
  const rootDir = getPortablePythonRoot(runtimeDir);
  const pythonPath = getPortablePythonPath(rootDir);
  const asset = resolvePythonAsset();
  if (await pathExists(pythonPath)) {
    const installedVersion = await readPythonVersion(pythonPath);
    if (installedVersion && matchesPortablePythonVersion(installedVersion, asset.version)) {
      return { pythonPath, rootDir, wasReplaced: false };
    }
    await rm(rootDir, { recursive: true, force: true });
  }

  // A partial extraction may not contain the Python executable at all.
  await rm(rootDir, { recursive: true, force: true });

  const archivePath = path.join(runtimeDir, `python-${asset.version}-${asset.target}.tar.gz`);
  await mkdir(runtimeDir, { recursive: true });

  onPhase("download", `下载 Python ${asset.version}`);
  await downloadFile(asset.urls, archivePath, (received, total) => onDownload({ received, total }));

  onPhase("extract", "解压 Python");
  await extractTarGz(archivePath, rootDir);

  if (!(await pathExists(pythonPath))) {
    throw new Error(`portable Python not found after extraction: ${pythonPath}`);
  }
  const licensePath = getPortablePythonLicensePath(rootDir, asset.version);
  if (!(await pathExists(licensePath))) {
    throw new Error(`portable Python license not found after extraction: ${licensePath}`);
  }

  await rm(archivePath, { force: true });

  return { pythonPath, rootDir, wasReplaced: true };
}

export function describeDownloadProgress(progress: DownloadProgress): string {
  if (!progress.total) return formatBytes(progress.received);
  return `${formatBytes(progress.received)} / ${formatBytes(progress.total)}`;
}
