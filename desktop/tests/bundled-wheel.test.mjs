import assert from "node:assert/strict";
import test from "node:test";

import { selectBundledOmniFicWheel } from "../dist/main/runtime/bundled-wheel.js";

test("selects only the wheel matching the desktop version", () => {
  assert.equal(
    selectBundledOmniFicWheel(
      ["omnific-0.8.0-py3-none-any.whl", "omnific-0.8.1-py3-none-any.whl"],
      "0.8.1",
    ),
    "omnific-0.8.1-py3-none-any.whl",
  );
});

test("does not fall back to a mismatched bundled version", () => {
  assert.equal(selectBundledOmniFicWheel(["omnific-0.8.0-py3-none-any.whl"], "0.8.1"), null);
});
