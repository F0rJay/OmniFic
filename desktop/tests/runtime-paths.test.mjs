import assert from "node:assert/strict";
import test from "node:test";

import { getPortablePythonPath } from "../dist/main/runtime/python-paths.js";

test("uses python/bin/python3 for macOS python-build-standalone archives", () => {
  assert.equal(getPortablePythonPath("/runtime", "darwin"), "/runtime/python/bin/python3");
});

test("retains the Windows python/python.exe archive layout", () => {
  assert.equal(getPortablePythonPath("C:\\runtime", "win32"), "C:\\runtime\\python\\python.exe");
});
