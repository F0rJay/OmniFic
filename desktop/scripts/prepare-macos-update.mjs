import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve(process.argv[2] ?? "dist-electron");
const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const version = process.env.OMNIFIC_UPDATE_VERSION ?? packageJson.version;
const architectures = ["x86_64", "arm64"];

async function getFileInfo(fileName) {
  const filePath = path.join(outputDirectory, fileName);
  const contents = await readFile(filePath);
  const fileStats = await stat(filePath);
  return {
    fileName,
    sha512: createHash("sha512").update(contents).digest("base64"),
    size: fileStats.size,
  };
}

const files = await Promise.all(
  architectures.map((architecture) => getFileInfo(`OmniFic-${version}-mac-${architecture}.zip`)),
);
const releaseDate = new Date().toISOString();
const firstFile = files[0];
const updateInfo = [
  `version: ${version}`,
  "files:",
  ...files.flatMap((file) => [
    `  - url: ${file.fileName}`,
    `    sha512: ${file.sha512}`,
    `    size: ${file.size}`,
  ]),
  `path: ${firstFile.fileName}`,
  `sha512: ${firstFile.sha512}`,
  `releaseDate: '${releaseDate}'`,
  "",
].join("\n");

await writeFile(path.join(outputDirectory, "latest-mac.yml"), updateInfo, "utf8");
