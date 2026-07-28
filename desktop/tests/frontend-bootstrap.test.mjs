import assert from "node:assert/strict";
import test from "node:test";

import { isBackendResourcePath } from "../dist/main/protocol-paths.js";
import { getUpdateArchitectureName } from "../dist/main/update-support.js";
import { resolveFrontendHostPreloadUrl } from "../dist/preload/preload-url.mjs";

test("does not turn early backend requests into the frontend index document", () => {
  assert.equal(isBackendResourcePath("/api/v1/settings"), true);
  assert.equal(isBackendResourcePath("/socket.io/"), true);
  assert.equal(isBackendResourcePath("/projects/example"), false);
});

test("exposes the webview preload as a file URL", () => {
  assert.equal(
    resolveFrontendHostPreloadUrl("file:///Applications/OmniFic.app/Contents/Resources/app.asar/dist/preload/preload.mjs"),
    "file:///Applications/OmniFic.app/Contents/Resources/app.asar/dist/preload/frontend-host-preload.cjs",
  );
});

test("uses desktop-friendly architecture names for Windows updates", () => {
  assert.equal(getUpdateArchitectureName({ platform: "win32", arch: "x64" }), "x86_64");
  assert.equal(getUpdateArchitectureName({ platform: "win32", arch: "arm64" }), "arm64");
});
