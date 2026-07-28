import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { selectBundledOmniFicWheel } from "../dist/main/runtime/bundled-wheel.js";

const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const wheelDirectory = path.resolve("resources", "omnific-wheel");
const wheelName = selectBundledOmniFicWheel(await readdir(wheelDirectory), packageJson.version);

if (!wheelName) {
  throw new Error(`Missing bundled OmniFic ${packageJson.version} wheel in ${wheelDirectory}`);
}

console.log(`Bundled backend wheel: ${wheelName}`);
