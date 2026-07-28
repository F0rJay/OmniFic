import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputDirectory = path.resolve(process.argv[2] ?? "dist-electron");
const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const version = process.env.OMNIFIC_UPDATE_VERSION ?? packageJson.version;
const allArchitectures = [
  { artifact: "x86_64", executable: "x86_64" },
  { artifact: "aarch64", executable: "arm64" },
];
const requestedArchitecture = process.env.OMNIFIC_ARTIFACT_ARCH;
const architectures = requestedArchitecture
  ? allArchitectures.filter(({ artifact }) => artifact === requestedArchitecture)
  : allArchitectures;

if (architectures.length === 0) {
  throw new Error(`Unsupported macOS artifact architecture: ${requestedArchitecture}`);
}

async function verifyArchive({ artifact, executable }) {
  const zipName = `OmniFic-${version}-mac-${artifact}.zip`;
  const zipPath = path.join(outputDirectory, zipName);
  await execFileAsync("unzip", ["-t", zipPath]);

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "omnific-macos-verify-"));
  try {
    await execFileAsync("unzip", ["-q", zipPath, "-d", tempDirectory]);
    const entries = await readdir(tempDirectory);
    const appName = entries.find((entry) => entry === "OmniFic.app");
    if (!appName) throw new Error(`${zipName} does not contain OmniFic.app`);

    const appPath = path.join(tempDirectory, appName);
    const executablePath = path.join(appPath, "Contents", "MacOS", "OmniFic");
    const frontendIndex = path.join(appPath, "Contents", "Resources", "frontend-dist", "index.html");
    const bundledWheel = path.join(
      appPath,
      "Contents",
      "Resources",
      "omnific-wheel",
      `omnific-${version}-py3-none-any.whl`,
    );
    await execFileAsync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
    const { stdout } = await execFileAsync("file", [executablePath]);
    if (!stdout.toLowerCase().includes(executable)) {
      throw new Error(`${zipName} executable architecture mismatch: expected ${executable}, received ${stdout.trim()}`);
    }
    await execFileAsync("test", ["-f", frontendIndex]);
    if (process.env.OMNIFIC_REQUIRE_BUNDLED_WHEEL === "true") {
      await execFileAsync("test", ["-f", bundledWheel]);
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

await Promise.all(architectures.map(verifyArchive));
