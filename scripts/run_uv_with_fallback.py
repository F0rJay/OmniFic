#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Run a uv command with a fallback Python package index."""

from __future__ import annotations

import os
import subprocess
import sys


FALLBACK_INDEX = os.environ.get(
    "OMNIFIC_PYPI_FALLBACK_INDEX",
    "https://pypi.tuna.tsinghua.edu.cn/simple",
)


def main() -> int:
    arguments = sys.argv[1:]
    if not arguments:
        print("usage: run_uv_with_fallback.py <uv arguments...>", file=sys.stderr)
        return 2

    command = ["uv", *arguments]
    result = subprocess.run(command, check=False)
    if result.returncode == 0:
        return 0

    if "--default-index" in arguments:
        return result.returncode

    print(
        "::warning::The primary Python package index failed; "
        f"retrying uv with {FALLBACK_INDEX}",
        file=sys.stderr,
    )
    fallback_command = [*command, "--default-index", FALLBACK_INDEX]
    return subprocess.run(fallback_command, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
