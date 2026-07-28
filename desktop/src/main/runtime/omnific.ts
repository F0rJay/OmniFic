import { net } from "electron";
import { spawn } from "node:child_process";
import { access, appendFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { findFreePort } from "../ports.js";
import { startBackendProcess, stopBackendProcess, type BackendProcessHandle } from "../process.js";
import { configureDefaultSystemProxy, getSystemProxyEnvironment } from "../proxy.js";
import { waitForBackend } from "../health.js";
import type { PortablePython, RuntimeIntegrityCheck } from "./python.js";
import {
  createOmniFicInstallCommand,
  createOmniFicServeCommand,
  createOmniFicVersionCommand,
  resolveOmniFicCliPath,
} from "./omnific-commands.js";
import type { StartupProgressTracker } from "../startup-progress.js";
import { selectBundledOmniFicWheel } from "./bundled-wheel.js";

export type OmniFicRuntimeStep = "create-venv" | "install-uv" | "install-omnific";

const ANSI_ESCAPE_SEQUENCE = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*[A-Za-z]`, "g");
const DEFAULT_PYPI_INDEX_URL = "https://pypi.org/simple/";
const TSINGHUA_PYPI_INDEX_URL = "https://pypi.tuna.tsinghua.edu.cn/simple/";
const PYPI_INDEX_PROBE_TIMEOUT_MS = 5_000;
const INSTALL_COMMAND_TIMEOUT_MS = 15 * 60_000;
const INSTALL_LOG_FILE = "install.log";

interface PypiIndexProbe {
  indexUrl: string;
  elapsedMs: number;
}

interface PypiEnvironment {
  environment: NodeJS.ProcessEnv;
  indexUrl: string;
  proxyStatus: string;
}

function getVenvDir(runtimeDir: string): string {
  return path.join(runtimeDir, "venv");
}

function getVenvPythonPath(runtimeDir: string): string {
  if (process.platform === "win32") return path.join(getVenvDir(runtimeDir), "Scripts", "python.exe");
  return path.join(getVenvDir(runtimeDir), "bin", "python");
}

function getUvPath(runtimeDir: string): string {
  if (process.platform === "win32") return path.join(getVenvDir(runtimeDir), "Scripts", "uv.exe");
  return path.join(getVenvDir(runtimeDir), "bin", "uv");
}

export function resolveUvPath(runtimeDir: string): string {
  return getUvPath(runtimeDir);
}

export function resolveVenvPythonPath(runtimeDir: string): string {
  return getVenvPythonPath(runtimeDir);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBundledOmniFicWheel(expectedVersion: string): Promise<string | null> {
  const wheelDirectory = path.join(process.resourcesPath, "omnific-wheel");
  try {
    const wheelName = selectBundledOmniFicWheel(await readdir(wheelDirectory), expectedVersion);
    return wheelName ? path.join(wheelDirectory, wheelName) : null;
  } catch {
    return null;
  }
}

function forwardLines(
  stream: NodeJS.ReadableStream | null,
  writer: NodeJS.WriteStream,
  source: "stdout" | "stderr",
  onLine?: (source: "stdout" | "stderr", line: string) => void,
): void {
  if (!stream) return;

  let buffer = "";
  stream.on("data", (chunk: Buffer | string) => {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    writer.write(text);
    buffer += text.replace(/\r/g, "\n");

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) onLine?.(source, trimmed);
    }
  });

  stream.on("end", () => {
    const trimmed = buffer.trim();
    if (trimmed) onLine?.(source, trimmed);
  });
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_SEQUENCE, "");
}

async function probePypiIndex(
  indexUrl: string,
  packageName: string,
  expectedVersion?: string,
): Promise<PypiIndexProbe | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PYPI_INDEX_PROBE_TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const response = await net.fetch(`${indexUrl}${packageName}/`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const packageIndex = await response.text();
    const elapsedMs = performance.now() - startedAt;
    if (expectedVersion && !packageIndex.includes(`${packageName}-${expectedVersion}`)) return null;
    return { indexUrl, elapsedMs };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getFastestPypiEnvironment(packageName: string, expectedVersion?: string): Promise<PypiEnvironment> {
  await configureDefaultSystemProxy();
  const probes = await Promise.all(
    [DEFAULT_PYPI_INDEX_URL, TSINGHUA_PYPI_INDEX_URL].map((indexUrl) =>
      probePypiIndex(indexUrl, packageName, expectedVersion),
    ),
  );
  let fastestProbe: PypiIndexProbe | null = null;
  for (const probe of probes) {
    if (probe && (!fastestProbe || probe.elapsedMs < fastestProbe.elapsedMs)) fastestProbe = probe;
  }

  const indexUrl = fastestProbe?.indexUrl ?? DEFAULT_PYPI_INDEX_URL;
  const proxyEnvironment = await getSystemProxyEnvironment(indexUrl);
  const proxyStatus = proxyEnvironment.HTTPS_PROXY || proxyEnvironment.https_proxy ? "系统代理：已使用" : "系统代理：未检测到";
  return {
    indexUrl,
    proxyStatus,
    environment: {
      ...proxyEnvironment,
      // Keep network failures bounded and actionable instead of leaving setup on
      // an indeterminate progress screen.
      PIP_DEFAULT_TIMEOUT: "30",
      PIP_RETRIES: "2",
      UV_HTTP_TIMEOUT: "30",
      PIP_INDEX_URL: indexUrl,
      UV_INDEX_URL: indexUrl,
      pip_index_url: indexUrl,
      uv_index_url: indexUrl,
    },
  };
}

function writeInstallLog(cwd: string, source: "stdout" | "stderr", message: string): void {
  const timestamp = new Date().toISOString();
  void appendFile(path.join(cwd, INSTALL_LOG_FILE), `[${timestamp}] [${source}] ${message}\n`, "utf8").catch(() => {
    // Setup must not fail solely because diagnostics cannot be written.
  });
}

function run(
  command: string,
  args: string[],
  cwd: string,
  onStdoutLine?: (line: string) => void,
  environment?: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const recentOutput: string[] = [];
    let timedOut = false;
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...environment },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const onLine = (source: "stdout" | "stderr", line: string) => {
      const text = stripAnsi(line).trim();
      if (!text) return;
      const message = `[${source}] ${text}`;
      recentOutput.push(message);
      if (recentOutput.length > 12) recentOutput.shift();
      writeInstallLog(cwd, source, text);
      onStdoutLine?.(message);
    };
    forwardLines(child.stdout, process.stdout, "stdout", onLine);
    forwardLines(child.stderr, process.stderr, "stderr", onLine);
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, INSTALL_COMMAND_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0 && !timedOut) {
        resolve();
        return;
      }
      const recent = recentOutput.length ? `\n最近输出：\n${recentOutput.join("\n")}` : "";
      const reason = timedOut ? `在 ${Math.round(INSTALL_COMMAND_TIMEOUT_MS / 60_000)} 分钟后超时` : `退出码 ${code ?? "未知"}`;
      reject(new Error(`${command} ${args.join(" ")} ${reason}。请检查网络或开启系统代理。${recent}`));
    });
  });
}

function readOutput(command: string, args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      output += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    child.on("error", () => resolve(null));
    child.on("exit", (code) => resolve(code === 0 ? output.trim() || null : null));
  });
}

function succeeds(command: string, args: string[], cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

export async function inspectOmniFicRuntime(
  runtimeDir: string,
  expectedVersion: string,
): Promise<RuntimeIntegrityCheck> {
  const venvPythonPath = getVenvPythonPath(runtimeDir);
  if (!(await pathExists(venvPythonPath))) {
    return { complete: false, message: "未找到 Python 虚拟环境" };
  }
  if (!(await readOutput(venvPythonPath, ["--version"], runtimeDir))) {
    return { complete: false, message: "Python 虚拟环境不可用" };
  }

  const uvPath = getUvPath(runtimeDir);
  if (!(await pathExists(uvPath)) || !(await readOutput(uvPath, ["--version"], runtimeDir))) {
    return { complete: false, message: "uv 不存在或不可用" };
  }

  const versionCommand = createOmniFicVersionCommand(venvPythonPath);
  const installedVersion = await readOutput(versionCommand.command, versionCommand.args, runtimeDir);
  if (installedVersion !== expectedVersion) {
    return {
      complete: false,
      message: installedVersion ? "OmniFic 后端版本不匹配" : "未找到 OmniFic 后端",
    };
  }
  const omniFicCliPath = resolveOmniFicCliPath(venvPythonPath);
  if (!(await pathExists(omniFicCliPath)) || !(await succeeds(omniFicCliPath, ["--help"], runtimeDir))) {
    return { complete: false, message: "OmniFic 命令行程序缺失或不可用" };
  }

  return { complete: true, message: "OmniFic 运行环境已完整安装" };
}

export async function ensureOmniFicRuntime(
  python: PortablePython,
  runtimeDir: string,
  expectedVersion: string,
  onProgress: (step: OmniFicRuntimeStep, message: string) => void,
): Promise<{ uvPath: string; venvPythonPath: string }> {
  const venvDir = getVenvDir(runtimeDir);
  const venvPythonPath = getVenvPythonPath(runtimeDir);
  const uvPath = getUvPath(runtimeDir);
  let bootstrapPypiEnvironment: Promise<PypiEnvironment> | null = null;
  let omnificPypiEnvironment: Promise<PypiEnvironment> | null = null;
  const bundledWheel = await resolveBundledOmniFicWheel(expectedVersion);
  const getBootstrapPypiEnvironment = () =>
    (bootstrapPypiEnvironment ??= getFastestPypiEnvironment("uv"));
  const getOmnificPypiEnvironment = () =>
    (omnificPypiEnvironment ??= bundledWheel
      ? getFastestPypiEnvironment("fastapi")
      : getFastestPypiEnvironment("omnific", expectedVersion));

  await mkdir(runtimeDir, { recursive: true });

  if (python.wasReplaced) await rm(venvDir, { recursive: true, force: true });

  const venvIsUsable =
    (await pathExists(venvPythonPath)) && Boolean(await readOutput(venvPythonPath, ["--version"], runtimeDir));
  if (!venvIsUsable) {
    await rm(venvDir, { recursive: true, force: true });
    onProgress("create-venv", "创建 OmniFic 运行环境");
    await run(python.pythonPath, ["-m", "venv", venvDir], runtimeDir);
  }

  const uvIsUsable = (await pathExists(uvPath)) && Boolean(await readOutput(uvPath, ["--version"], runtimeDir));
  if (!uvIsUsable) {
    const packageIndex = await getBootstrapPypiEnvironment();
    onProgress("install-uv", `安装 uv（${new URL(packageIndex.indexUrl).host}，${packageIndex.proxyStatus}）`);
    await run(
      venvPythonPath,
      ["-m", "pip", "install", "--force-reinstall", "uv"],
      runtimeDir,
      (message) => onProgress("install-uv", message),
      packageIndex.environment,
    );
  }

  const versionCommand = createOmniFicVersionCommand(venvPythonPath);
  const installedVersion = await readOutput(versionCommand.command, versionCommand.args, runtimeDir);
  const omniFicCliPath = resolveOmniFicCliPath(venvPythonPath);
  const omniFicCliIsUsable =
    (await pathExists(omniFicCliPath)) && (await succeeds(omniFicCliPath, ["--help"], runtimeDir));
  if (installedVersion !== expectedVersion || !omniFicCliIsUsable) {
    const packageIndex = await getOmnificPypiEnvironment();
    onProgress(
      "install-omnific",
      `${installedVersion ? "更新" : "安装"} OmniFic 后端${bundledWheel ? "（内置 wheel）" : ""}（${new URL(packageIndex.indexUrl).host}，${packageIndex.proxyStatus}）`,
    );
    const installCommand = createOmniFicInstallCommand(
      venvPythonPath,
      expectedVersion,
      installedVersion === expectedVersion && !omniFicCliIsUsable,
      bundledWheel ?? undefined,
    );
    await run(
      uvPath,
      installCommand.args,
      runtimeDir,
      (message) => onProgress("install-omnific", message),
      packageIndex.environment,
    );
  }

  return { uvPath, venvPythonPath };
}

const STARTUP_LOG_MILESTONES = [
  {
    text: "Starting OmniFic",
    step: "initialize-backend",
    title: "初始化应用服务",
    message: "正在加载 OmniFic 服务",
    progress: 0.7,
  },
  {
    text: "Database initialization or migration completed",
    step: "initialize-database",
    title: "初始化数据库",
    message: "数据库初始化或迁移已完成",
    progress: 0.82,
  },
  {
    text: "Application startup complete",
    step: "complete-backend-startup",
    title: "完成应用启动",
    message: "应用服务已完成初始化",
    progress: 0.92,
  },
] as const;

export async function startLocalOmniFicBackend(
  venvPythonPath: string,
  expectedVersion: string,
  startupProgress?: StartupProgressTracker,
): Promise<BackendProcessHandle> {
  startupProgress?.begin({
    step: "start-backend",
    title: "启动 OmniFic 服务",
    message: "正在分配本地服务端口",
    progress: 0.6,
  });
  const port = await findFreePort();
  const command = createOmniFicServeCommand(venvPythonPath, port);
  const proxyEnvironment = await getSystemProxyEnvironment("https://pypi.org/");
  let healthFallbackStarted = false;
  let healthFallbackTimer: NodeJS.Timeout | null = null;

  const beginHealthFallback = () => {
    if (healthFallbackStarted) return;
    healthFallbackStarted = true;
    startupProgress?.begin({
      step: "check-health",
      title: "检查服务状态",
      message: "启动阶段停留较久，正在主动检查服务响应",
      progress: 0.96,
    });
  };

  const scheduleHealthFallback = () => {
    if (healthFallbackStarted) return;
    if (healthFallbackTimer) clearTimeout(healthFallbackTimer);
    healthFallbackTimer = setTimeout(beginHealthFallback, 5_000);
  };

  const handle = startBackendProcess({
    command: command.command,
    args: command.args,
    port,
    environment: proxyEnvironment,
    onOutputLine: (line) => {
      if (healthFallbackStarted) return;
      const milestone = STARTUP_LOG_MILESTONES.find((candidate) => line.includes(candidate.text));
      if (!milestone) return;
      startupProgress?.begin(milestone);
      scheduleHealthFallback();
    },
  });

  scheduleHealthFallback();
  try {
    const health = await waitForBackend(handle.baseUrl, { process: handle.process });
    if (healthFallbackTimer) clearTimeout(healthFallbackTimer);
    startupProgress?.begin({
      step: "check-health",
      title: "检查服务状态",
      message: "服务已响应，正在验证版本",
      progress: 0.98,
    });
    if (health.version !== expectedVersion) {
      stopBackendProcess(handle);
      throw new Error(`本地后端版本不匹配：期望 ${expectedVersion}，实际 ${health.version ?? "未知"}`);
    }
    return handle;
  } catch (error) {
    if (healthFallbackTimer) clearTimeout(healthFallbackTimer);
    stopBackendProcess(handle);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}。日志路径：${handle.logPath}`);
  }
}
