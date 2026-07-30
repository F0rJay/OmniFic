#!/usr/bin/env python3
"""文档完整性校验。

检查项：
1. docs/README.md 中列出的所有文档真实存在
2. 所有 .md 文件中的相对链接指向存在的文件
3. 关键文档存在性
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = PROJECT_ROOT / "docs"

KEY_ENTRIES = [
    "README.md",
    "README_EN.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "CLAUDE.md",
    "docs/README.md",
    "docs/architecture.md",
    "docs/glossary.md",
    "docs/features/content-export.md",
    "docs/features/writing-readiness.md",
    "docs/runbooks/release.md",
]

FORBIDDEN_TERMS = []  # 未来可添加：已废除术语不应出现在活跃文档中

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def check_key_entries() -> list[str]:
    errors = []
    for entry in KEY_ENTRIES:
        if not (PROJECT_ROOT / entry).exists():
            errors.append(f"MISSING: {entry}")
    return errors


def check_links() -> list[str]:
    errors = []
    md_files = list(PROJECT_ROOT.glob("**/*.md"))
    for md_file in md_files:
        relative_parts = md_file.relative_to(PROJECT_ROOT).parts
        if any(
            part in {"node_modules", ".venv", "third_party"} for part in relative_parts
        ):
            continue
        content = md_file.read_text(encoding="utf-8")
        for match in LINK_RE.finditer(content):
            target = match.group(2)
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            if target.endswith(".png") or target.endswith(".jpg"):
                continue
            target_path = (md_file.parent / target).resolve()
            if not target_path.exists():
                errors.append(
                    f"BROKEN: {md_file.relative_to(PROJECT_ROOT)} -> {target}"
                )
    return errors


def main() -> int:
    errors = check_key_entries() + check_links()
    if errors:
        for e in errors:
            print(f"  ❌ {e}")
        print(f"\n{len(errors)} issue(s) found.")
        return 1
    print("  ✅ All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
