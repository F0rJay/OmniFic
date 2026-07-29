import assert from "node:assert/strict";
import test from "node:test";

import {
  getPortablePythonLicensePath,
  getPortablePythonPath,
} from "../dist/main/runtime/python-paths.js";

test("uses python/bin/python3 for macOS python-build-standalone archives", () => {
  assert.equal(getPortablePythonPath("/runtime", "darwin"), "/runtime/python/bin/python3");
});

test("retains the Windows python/python.exe archive layout", () => {
  assert.equal(getPortablePythonPath("C:\\runtime", "win32"), "C:\\runtime\\python\\python.exe");
});

test("locates the license retained by POSIX Python standalone archives", () => {
  assert.equal(
    getPortablePythonLicensePath("/runtime", "3.13.14", "darwin"),
    "/runtime/python/lib/python3.13/LICENSE.txt",
  );
});

test("locates the Windows Python standalone license and build terms", () => {
  assert.equal(
    getPortablePythonLicensePath("C:\\runtime", "3.13.14", "win32"),
    "C:\\runtime\\python\\LICENSE.txt",
  );
});
