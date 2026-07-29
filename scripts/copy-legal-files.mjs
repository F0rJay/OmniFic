// SPDX-License-Identifier: Apache-2.0
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinationRoot = path.resolve(process.cwd(), process.argv[2] ?? "dist");
const legalDirectory = path.join(destinationRoot, "legal");

const files = [
  ["LICENSE", "LICENSE"],
  ["NOTICE", "NOTICE"],
  ["THIRD_PARTY_NOTICES", "THIRD_PARTY_NOTICES"],
  ["third_party/fonts/FONTS.md", "fonts/FONTS.md"],
  ["third_party/fonts/OFL-1.1.txt", "fonts/OFL-1.1.txt"],
];

await mkdir(legalDirectory, { recursive: true });

for (const [source, destination] of files) {
  const target = path.join(legalDirectory, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(repositoryRoot, source), target);
}

const notice = await readFile(path.join(repositoryRoot, "NOTICE"), "utf8");
const escapedNotice = notice
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OmniFic Legal Notices</title>
  </head>
  <body>
    <main>
      <h1>OmniFic Legal Notices</h1>
      <pre>${escapedNotice}</pre>
      <ul>
        <li><a href="LICENSE">Apache License 2.0</a></li>
        <li><a href="NOTICE">NOTICE</a></li>
        <li><a href="THIRD_PARTY_NOTICES">Third-party notices and licenses</a></li>
        <li><a href="fonts/FONTS.md">Bundled font attribution</a></li>
        <li><a href="fonts/OFL-1.1.txt">SIL Open Font License 1.1</a></li>
      </ul>
    </main>
  </body>
</html>
`;
await writeFile(path.join(legalDirectory, "index.html"), index, "utf8");

console.log(`Copied legal files to ${legalDirectory}`);
