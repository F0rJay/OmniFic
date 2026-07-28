interface SpawnCommand {
  command: string;
  args: string[];
}

export function resolveOmniFicCliPath(venvPythonPath: string): string {
  return process.platform === "win32"
    ? venvPythonPath.replace(/python\.exe$/i, "omnific.exe")
    : venvPythonPath.replace(/python$/i, "omnific");
}
export function createOmniFicVersionCommand(venvPythonPath: string): SpawnCommand {
  return {
    command: venvPythonPath,
    args: ["-c", 'from importlib.metadata import version; print(version("omnific"))'],
  };
}

export function createOmniFicInstallCommand(
  venvPythonPath: string,
  version: string,
  forceReinstall = false,
  installTarget = `omnific==${version}`,
): Omit<SpawnCommand, "command"> {
  return {
    args: ["pip", "install", "--python", venvPythonPath, ...(forceReinstall ? ["--reinstall"] : []), installTarget],
  };
}

export function createOmniFicServeCommand(venvPythonPath: string, port: number): SpawnCommand {
  return {
    command: resolveOmniFicCliPath(venvPythonPath),
    args: ["serve", "--host", "127.0.0.1", "--port", String(port)],
  };
}
