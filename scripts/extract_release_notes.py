#!/usr/bin/env python3
"""Extract one version section from CHANGELOG.md for release publishing."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def extract_release_notes(changelog: str, version: str) -> str:
    normalized_version = version.removeprefix("v")
    version_pattern = re.compile(
        rf"(?<![0-9.])v?{re.escape(normalized_version)}(?![0-9.])",
        re.IGNORECASE,
    )
    lines = changelog.splitlines()
    section_start: int | None = None

    for index, line in enumerate(lines):
        if line.startswith("## ") and version_pattern.search(line[3:]):
            section_start = index + 1
            break

    if section_start is None:
        raise ValueError(f"CHANGELOG 中未找到版本 {normalized_version}")

    section_end = len(lines)
    for index in range(section_start, len(lines)):
        if lines[index].startswith("## "):
            section_end = index
            break

    notes = "\n".join(lines[section_start:section_end]).strip()
    if not notes:
        raise ValueError(f"CHANGELOG 中版本 {normalized_version} 没有发行说明")
    return notes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("changelog", type=Path)
    parser.add_argument("version")
    args = parser.parse_args()

    try:
        notes = extract_release_notes(
            args.changelog.read_text(encoding="utf-8"),
            args.version,
        )
    except (OSError, ValueError) as error:
        parser.error(str(error))

    print(notes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
