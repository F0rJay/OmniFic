#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fail closed when OmniFic release-license requirements are not met."""

from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LICENSE_SHA256 = "58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd"
LEGAL_FILES = {
    "LICENSE": ROOT / "LICENSE",
    "NOTICE": ROOT / "NOTICE",
    "THIRD_PARTY_NOTICES": ROOT / "THIRD_PARTY_NOTICES",
    "fonts/FONTS.md": ROOT / "third_party" / "fonts" / "FONTS.md",
    "fonts/OFL-1.1.txt": ROOT / "third_party" / "fonts" / "OFL-1.1.txt",
}
FONT_HASHES = {
    "frontend/public/fonts/ChillKai.woff2": "05493c474ca8846dacedd83c1615f7d106ebab57621d788546554a683976eead",
    "frontend/public/fonts/JetBrainsMapleMono.woff2": "d5d8498809658d1016f16ba24be14b0f7da2fc40cc7230622f432ee7522b7724",
    "frontend/public/fonts/SourceHanSansCN-VF.ttf.woff2": "f971e3bff46f76b49e1d5510556c2297c618ec4b491a295a4e741cdd38257799",
    "frontend/public/fonts/SourceHanSerifCN-VF.ttf.woff2": "556749ba783b148fa1f48644e8883e5b9351f01abd0d1faad0ba24a21185e76a",
}


def fail(message: str) -> None:
    raise RuntimeError(message)


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def check_root_files(*, check_generated: bool) -> None:
    for path in LEGAL_FILES.values():
        if not path.is_file() or path.stat().st_size == 0:
            fail(f"missing legal file: {path.relative_to(ROOT)}")

    license_hash = hashlib.sha256((ROOT / "LICENSE").read_bytes()).hexdigest()
    if license_hash != LICENSE_SHA256:
        fail("LICENSE differs from the expected unmodified Apache-2.0 text")

    notice = (ROOT / "NOTICE").read_text(encoding="utf-8")
    for marker in ("OpenFic v0.7.5", "Dexie.js", "David Fahlander"):
        if marker not in notice:
            fail(f"NOTICE is missing required attribution: {marker}")

    third_party_notices = (ROOT / "THIRD_PARTY_NOTICES").read_text(encoding="utf-8")
    for marker in (
        "cpython-standalone@3.13.14+20260623",
        "cpython@3.12.11",
        "uv@0.11.32",
        "python/lib/python3.13/LICENSE.txt",
        "python/LICENSE.txt",
    ):
        if marker not in third_party_notices:
            fail(f"THIRD_PARTY_NOTICES is missing desktop runtime disclosure: {marker}")

    if check_generated:
        run(sys.executable, "scripts/generate_third_party_notices.py", "--check")

    for relative, expected in FONT_HASHES.items():
        actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
        if actual != expected:
            fail(
                f"font provenance hash changed for {relative}: expected {expected}, got {actual}"
            )

    required_config_markers = {
        "Dockerfile": [
            "FROM python:3.12.11-slim-bookworm",
            "ghcr.io/astral-sh/uv:0.11.32",
            "WORKDIR /build/frontend",
            "COPY scripts/copy-legal-files.mjs /build/scripts/copy-legal-files.mjs",
            "COPY LICENSE NOTICE THIRD_PARTY_NOTICES",
            "COPY third_party/fonts",
            "COPY --from=frontend /build/frontend/dist",
        ],
        ".dockerignore": ["!third_party/fonts/FONTS.md"],
        "desktop/electron-builder.yml": [
            "../LICENSE",
            "../NOTICE",
            "../THIRD_PARTY_NOTICES",
            "../third_party/fonts/OFL-1.1.txt",
            "node_modules/electron/dist/LICENSE",
            "node_modules/electron/dist/LICENSES.chromium.html",
        ],
        "desktop/electron-builder.local-update.yml": [
            "../LICENSE",
            "../NOTICE",
            "../THIRD_PARTY_NOTICES",
            "node_modules/electron/dist/LICENSE",
            "node_modules/electron/dist/LICENSES.chromium.html",
        ],
        "backend/pyproject.toml": [
            '"NOTICE" = "NOTICE"',
            '"THIRD_PARTY_NOTICES" = "THIRD_PARTY_NOTICES"',
            '"third_party/fonts/OFL-1.1.txt" = "third_party/fonts/OFL-1.1.txt"',
        ],
        "frontend/package.json": ["copy-legal-files.mjs dist"],
        "desktop/package.json": ["copy-legal-files.mjs dist"],
        "desktop/src/main/runtime/python-assets.ts": [
            'const PYTHON_VERSION = "3.13.14"',
            'const RELEASE_TAG = "20260623"',
            'UV_VERSION = "0.11.32"',
        ],
        "desktop/src/main/runtime/python.ts": ["getPortablePythonLicensePath"],
        "desktop/src/main/runtime/omnific.ts": ["`uv==${UV_VERSION}`"],
    }
    for relative, markers in required_config_markers.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        for marker in markers:
            if marker not in text:
                fail(f"{relative} does not package required legal material: {marker}")


def check_legal_directory(root: Path) -> None:
    legal_root = root / "legal"
    for relative, source in LEGAL_FILES.items():
        packaged = legal_root / relative
        if not packaged.is_file():
            fail(f"artifact is missing {packaged}")
        if packaged.read_bytes() != source.read_bytes():
            fail(f"artifact contains a stale legal file: {packaged}")


def archive_member_bytes_zip(archive: zipfile.ZipFile, candidates: list[str]) -> bytes:
    names = archive.namelist()
    for candidate in candidates:
        matches = [
            name
            for name in names
            if name == candidate or name.endswith("/" + candidate)
        ]
        if matches:
            return archive.read(sorted(matches, key=len)[0])
    fail(f"archive is missing all candidates: {', '.join(candidates)}")


def check_wheel(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        for relative, source in LEGAL_FILES.items():
            payload = archive_member_bytes_zip(
                archive,
                [relative, f"legal/{relative}", f"omnific/{relative}"],
            )
            if payload != source.read_bytes():
                fail(f"wheel contains a stale legal file: {relative}")


def check_sdist(path: Path) -> None:
    with tarfile.open(path, "r:gz") as archive:
        names = archive.getnames()
        for relative, source in LEGAL_FILES.items():
            matches = [name for name in names if name.endswith("/" + relative)]
            if not matches:
                fail(f"sdist is missing {relative}")
            member = archive.extractfile(sorted(matches, key=len)[0])
            if member is None or member.read() != source.read_bytes():
                fail(f"sdist contains a stale legal file: {relative}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-generated-check",
        action="store_true",
        help="Skip dependency-regeneration comparison when dependency trees are not installed.",
    )
    parser.add_argument("--artifact-dir", action="append", type=Path, default=[])
    parser.add_argument("--desktop-resources", action="append", type=Path, default=[])
    parser.add_argument("--wheel", action="append", type=Path, default=[])
    parser.add_argument("--sdist", action="append", type=Path, default=[])
    args = parser.parse_args()

    try:
        check_root_files(check_generated=not args.skip_generated_check)
        for path in args.artifact_dir:
            check_legal_directory(path.resolve())
        for path in args.desktop_resources:
            check_legal_directory(path.resolve())
        for path in args.wheel:
            check_wheel(path.resolve())
        for path in args.sdist:
            check_sdist(path.resolve())
    except (
        RuntimeError,
        subprocess.CalledProcessError,
        OSError,
        zipfile.BadZipFile,
    ) as exc:
        print(f"license compliance check failed: {exc}", file=sys.stderr)
        return 1

    print("License compliance checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
