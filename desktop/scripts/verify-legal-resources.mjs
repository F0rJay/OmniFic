// SPDX-License-Identifier: Apache-2.0
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(desktopRoot, "..");
const outputRoot = path.join(desktopRoot, "dist-electron");
const required = [
  ["LICENSE", "LICENSE"],
  ["NOTICE", "NOTICE"],
  ["THIRD_PARTY_NOTICES", "THIRD_PARTY_NOTICES"],
  ["third_party/fonts/FONTS.md", "fonts/FONTS.md"],
  ["third_party/fonts/OFL-1.1.txt", "fonts/OFL-1.1.txt"],
  ["desktop/node_modules/electron/dist/LICENSE", "electron/LICENSE"],
  ["desktop/node_modules/electron/dist/LICENSES.chromium.html", "electron/LICENSES.chromium.html"],
];

async function findLegalDirectories(root) {
  const matches = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.name === "legal" && path.basename(directory).toLowerCase() === "resources") {
        matches.push(candidate);
      } else {
        await visit(candidate);
      }
    }
  }
  await visit(root);
  return matches;
}

await stat(outputRoot);
const legalDirectories = await findLegalDirectories(outputRoot);
if (legalDirectories.length === 0) {
  throw new Error(`No packaged resources/legal directory found below ${outputRoot}`);
}

for (const legalDirectory of legalDirectories) {
  for (const [sourceRelative, packagedRelative] of required) {
    const source = await readFile(path.join(repositoryRoot, sourceRelative));
    const packaged = await readFile(path.join(legalDirectory, packagedRelative));
    if (!source.equals(packaged)) {
      throw new Error(`Stale legal file in desktop package: ${path.join(legalDirectory, packagedRelative)}`);
    }
  }
}

console.log(`Verified legal resources in ${legalDirectories.length} packaged desktop application(s).`);
