#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate a deterministic third-party license and notice bundle.

The generated file covers the production dependency graphs shipped by the
frontend, desktop shell, and Python backend, plus the bundled fonts.  License
and NOTICE files are taken from the installed distributions.  A canonical
license text is used only when a package omitted its license file while still
declaring a recognized license in package metadata.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "THIRD_PARTY_NOTICES"
LEGAL_PREFIXES = ("license", "licence", "copying", "notice", "patents")
UNIVERSAL_PYTHON_PACKAGES = (
    ("brotlicffi", "1.2.0.1", "MIT", "brotlicffi-1.2.0.1"),
    ("colorama", "0.4.6", "BSD-3-Clause", "colorama-0.4.6"),
    ("pywin32", "312", "PSF-2.0 and bundled component licenses", "pywin32-312"),
    ("win32-setctime", "1.2.0", "MIT", "win32-setctime-1.2.0"),
)
DESKTOP_PYTHON_VERSION = "3.13.14"
DESKTOP_PYTHON_RELEASE = "20260623"
DESKTOP_UV_VERSION = "0.11.32"
DOCKER_PYTHON_VERSION = "3.12.11"


MIT_TEXT = """MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the \"Software\"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""


ZERO_BSD_TEXT = """Zero-Clause BSD License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED \"AS IS\" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
"""


@dataclass(frozen=True, order=True)
class PackageRef:
    ecosystem: str
    name: str
    version: str
    declared_license: str
    author: str = ""
    homepage: str = ""

    @property
    def identity(self) -> str:
        return f"{self.name}@{self.version}"


@dataclass
class LegalArtifact:
    text: str
    labels: set[str] = field(default_factory=set)
    packages: set[PackageRef] = field(default_factory=set)


def command(args: list[str], *, cwd: Path) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return result.stdout


def normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").strip() + "\n"


def normalize_package_name(name: str) -> str:
    return name.lower().replace("_", "-")


def read_legal_files(package_root: Path) -> list[tuple[str, str]]:
    if not package_root.is_dir():
        return []
    results: list[tuple[str, str]] = []
    for path in sorted(package_root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(package_root)
        if "node_modules" in relative.parts or len(relative.parts) > 3:
            continue
        if not path.name.lower().startswith(LEGAL_PREFIXES):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        results.append((str(relative), normalize_text(text)))
    return results


def canonical_fallback(expression: str) -> str | None:
    normalized = expression.lower().replace("license", "").strip()
    if normalized in {"mit", "osi approved :: mit"} or "mit" in normalized:
        return MIT_TEXT
    if normalized in {
        "0bsd",
        "zero-clause bsd (0bsd)",
        "osi approved :: zero-clause bsd (0bsd)",
    }:
        return ZERO_BSD_TEXT
    if "apache" in normalized:
        return (ROOT / "LICENSE").read_text(encoding="utf-8")
    return None


def add_artifact(
    artifacts: dict[str, LegalArtifact],
    package: PackageRef,
    label: str,
    text: str,
) -> None:
    normalized = normalize_text(text)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    artifact = artifacts.setdefault(digest, LegalArtifact(text=normalized))
    artifact.labels.add(label)
    artifact.packages.add(package)


def npm_packages(project: str, artifacts: dict[str, LegalArtifact]) -> set[PackageRef]:
    project_root = ROOT / project
    raw = command(["pnpm", "licenses", "list", "--prod", "--json"], cwd=project_root)
    grouped = json.loads(raw)
    packages: set[PackageRef] = set()

    for expression, entries in grouped.items():
        for entry in entries:
            versions = entry.get("versions") or ["unknown"]
            package = PackageRef(
                ecosystem=project,
                name=entry["name"],
                version=", ".join(versions),
                declared_license=expression,
                author=str(entry.get("author") or ""),
                homepage=str(entry.get("homepage") or "")
                or f"https://www.npmjs.com/package/{entry['name']}",
            )
            packages.add(package)
            found = False
            for raw_path in entry.get("paths") or []:
                package_root = Path(raw_path)
                for label, text in read_legal_files(package_root):
                    found = True
                    add_artifact(artifacts, package, f"{project}:{label}", text)
            if not found:
                fallback = canonical_fallback(expression)
                if fallback is None:
                    raise RuntimeError(
                        f"{project} package {package.identity} declares {expression!r} "
                        "but contains no readable license file and has no canonical fallback"
                    )
                add_artifact(
                    artifacts, package, f"{project}:canonical:{expression}", fallback
                )
    return packages


def python_metadata() -> list[dict[str, object]]:
    interpreter = ROOT / "backend" / ".venv" / "bin" / "python"
    if os.name == "nt":
        interpreter = ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
    if not interpreter.exists():
        raise RuntimeError(
            "backend/.venv is missing; run `uv sync --no-dev` in backend first"
        )

    helper = r"""
import importlib.metadata as metadata
import json
rows = []
for distribution in metadata.distributions():
    name = (distribution.metadata.get("Name") or "").strip()
    if not name or name.lower() == "omnific":
        continue
    classifiers = [
        value.split("License ::", 1)[1].strip()
        for value in distribution.metadata.get_all("Classifier", [])
        if value.startswith("License ::")
    ]
    files = []
    for relative in distribution.files or []:
        parts = str(relative).split("/")
        if not any(part.lower().startswith(("license", "licence", "copying", "notice", "patents")) for part in parts):
            continue
        path = distribution.locate_file(relative)
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        files.append({"label": str(relative), "text": text})
    rows.append({
        "name": name,
        "version": distribution.version,
        "expression": (distribution.metadata.get("License-Expression") or "").strip(),
        "license": (distribution.metadata.get("License") or "").strip(),
        "classifiers": classifiers,
        "author": (distribution.metadata.get("Author") or "").strip(),
        "homepage": (distribution.metadata.get("Home-page") or "").strip(),
        "project_urls": distribution.metadata.get_all("Project-URL", []),
        "files": files,
    })
print(json.dumps(rows))
"""
    raw = command([str(interpreter), "-c", helper], cwd=ROOT / "backend")
    return json.loads(raw)


def locked_python_packages() -> dict[str, str]:
    raw = command(
        [
            "uv",
            "tree",
            "--preview-features",
            "json-output",
            "--universal",
            "--no-dev",
            "--frozen",
            "--format",
            "json",
        ],
        cwd=ROOT / "backend",
    )
    resolution = json.loads(raw).get("resolution") or {}
    locked: dict[str, str] = {}
    for item in resolution.values():
        name = normalize_package_name(str(item.get("name") or ""))
        version = str(item.get("version") or "")
        if not name or not version or name == "omnific":
            continue
        previous = locked.setdefault(name, version)
        if previous != version:
            raise RuntimeError(
                f"universal lock graph contains multiple versions of {name}: "
                f"{previous}, {version}"
            )
    if not locked:
        raise RuntimeError("universal Python lock graph is empty")
    return locked


def declared_python_license(row: dict[str, object]) -> str:
    expression = str(row.get("expression") or "").strip()
    if expression:
        return expression
    classifiers = [str(value) for value in row.get("classifiers") or []]
    if classifiers:
        return " / ".join(classifiers)
    license_value = str(row.get("license") or "").strip()
    if license_value and len(license_value) <= 160 and "\n" not in license_value:
        return license_value
    if license_value:
        return "License text embedded in package metadata"
    return "Unknown"


def python_source_url(row: dict[str, object]) -> str:
    homepage = str(row.get("homepage") or "").strip()
    if homepage:
        return homepage
    preferred = {"source", "source code", "repository", "homepage", "code"}
    project_urls = [str(value) for value in row.get("project_urls") or []]
    for value in project_urls:
        label, separator, url = value.partition(",")
        if separator and label.strip().lower() in preferred and url.strip():
            return url.strip()
    for value in project_urls:
        _, separator, url = value.partition(",")
        if separator and url.strip():
            return url.strip()
    return f"https://pypi.org/project/{row['name']}/{row['version']}/"


def python_packages(
    artifacts: dict[str, LegalArtifact],
    locked: dict[str, str],
    vendored_names: set[str],
) -> set[PackageRef]:
    packages: set[PackageRef] = set()
    installed: dict[tuple[str, str], dict[str, object]] = {}
    installed_versions: dict[str, set[str]] = {}
    for row in python_metadata():
        name = normalize_package_name(str(row["name"]))
        version = str(row["version"])
        installed[(name, version)] = row
        installed_versions.setdefault(name, set()).add(version)

    for name, version in sorted(locked.items()):
        if name in vendored_names:
            continue
        row = installed.get((name, version))
        if row is None:
            found = (
                ", ".join(sorted(installed_versions.get(name, set())))
                or "not installed"
            )
            raise RuntimeError(
                f"locked Python package {name}@{version} is unavailable in backend/.venv "
                f"(found: {found}); run `uv sync --frozen --no-dev`"
            )
        expression = declared_python_license(row)
        package = PackageRef(
            ecosystem="python-runtime",
            name=str(row["name"]),
            version=str(row["version"]),
            declared_license=expression,
            author=str(row.get("author") or ""),
            homepage=python_source_url(row),
        )
        packages.add(package)
        files = row.get("files") or []
        if files:
            for item in files:
                add_artifact(
                    artifacts,
                    package,
                    f"python-runtime:{item['label']}",
                    str(item["text"]),
                )
            continue

        fallback = canonical_fallback(expression)
        if fallback is None:
            raise RuntimeError(
                f"Python package {package.identity} declares {expression!r} "
                "but contains no readable license file and has no canonical fallback"
            )
        add_artifact(
            artifacts, package, f"python-runtime:canonical:{expression}", fallback
        )
    return packages


def universal_python_packages(
    artifacts: dict[str, LegalArtifact], locked: dict[str, str]
) -> set[PackageRef]:
    packages: set[PackageRef] = set()
    root = ROOT / "third_party" / "python-universal"
    for name, version, expression, directory in UNIVERSAL_PYTHON_PACKAGES:
        normalized_name = normalize_package_name(name)
        locked_version = locked.get(normalized_name)
        if locked_version != version:
            raise RuntimeError(
                f"vendored legal files for {name}@{version} do not match the universal "
                f"lock graph ({locked_version or 'package absent'})"
            )
        package = PackageRef(
            ecosystem="python-runtime",
            name=name,
            version=version,
            declared_license=expression,
        )
        packages.add(package)
        package_root = root / directory
        legal_files = []
        if package_root.is_dir():
            for path in sorted(package_root.iterdir()):
                if not path.is_file():
                    continue
                legal_files.append(
                    (path.name, normalize_text(path.read_text(encoding="utf-8")))
                )
        if not legal_files:
            raise RuntimeError(f"missing vendored legal files for {package.identity}")
        for label, text in legal_files:
            add_artifact(
                artifacts, package, f"python-universal:{directory}/{label}", text
            )
    return packages


def desktop_runtime_packages(artifacts: dict[str, LegalArtifact]) -> set[PackageRef]:
    python_package = PackageRef(
        ecosystem="desktop-runtime",
        name="cpython-standalone",
        version=f"{DESKTOP_PYTHON_VERSION}+{DESKTOP_PYTHON_RELEASE}",
        declared_license="PSF-2.0 and platform-specific bundled component terms",
        homepage=(
            "https://github.com/astral-sh/python-build-standalone/releases/tag/"
            f"{DESKTOP_PYTHON_RELEASE}"
        ),
    )
    python_notice = f"""Portable CPython {DESKTOP_PYTHON_VERSION} is downloaded unmodified from
the python-build-standalone {DESKTOP_PYTHON_RELEASE} release during desktop setup.
The archive retains its complete Python and bundled-component license texts.
OmniFic verifies the platform license after extraction at:

- POSIX: python/lib/python3.13/LICENSE.txt
- Windows: python/LICENSE.txt

The archive also retains pip's license and the license files for pip's vendored
components below the installed pip package directory.
"""
    add_artifact(
        artifacts,
        python_package,
        "desktop-runtime:python-build-standalone:embedded-license-locations",
        python_notice,
    )

    uv_package = PackageRef(
        ecosystem="desktop-runtime",
        name="uv",
        version=DESKTOP_UV_VERSION,
        declared_license="MIT OR Apache-2.0",
        homepage=f"https://github.com/astral-sh/uv/releases/tag/{DESKTOP_UV_VERSION}",
    )
    add_artifact(artifacts, uv_package, "desktop-runtime:uv:MIT", MIT_TEXT)
    add_artifact(
        artifacts,
        uv_package,
        "desktop-runtime:uv:Apache-2.0",
        (ROOT / "LICENSE").read_text(encoding="utf-8"),
    )
    return {python_package, uv_package}


def docker_runtime_packages(artifacts: dict[str, LegalArtifact]) -> set[PackageRef]:
    python_package = PackageRef(
        ecosystem="docker-runtime",
        name="cpython",
        version=DOCKER_PYTHON_VERSION,
        declared_license="PSF-2.0 and bundled component terms",
        homepage=f"https://github.com/python/cpython/tree/v{DOCKER_PYTHON_VERSION}",
    )
    python_notice = f"""The final Docker image is based on the official
python:{DOCKER_PYTHON_VERSION}-slim-bookworm image. The Python and Debian base
layers are redistributed without removing their installed copyright and
license materials. Debian package copyright files remain available under
/usr/share/doc inside the image.
"""
    add_artifact(
        artifacts,
        python_package,
        "docker-runtime:official-python-image:retained-license-materials",
        python_notice,
    )

    uv_package = PackageRef(
        ecosystem="docker-runtime",
        name="uv",
        version=DESKTOP_UV_VERSION,
        declared_license="MIT OR Apache-2.0",
        homepage=f"https://github.com/astral-sh/uv/releases/tag/{DESKTOP_UV_VERSION}",
    )
    add_artifact(artifacts, uv_package, "docker-runtime:uv:MIT", MIT_TEXT)
    add_artifact(
        artifacts,
        uv_package,
        "docker-runtime:uv:Apache-2.0",
        (ROOT / "LICENSE").read_text(encoding="utf-8"),
    )
    return {python_package, uv_package}


def attach_cpython_license(
    artifacts: dict[str, LegalArtifact], packages: set[PackageRef]
) -> None:
    license_text = next(
        (
            artifact.text
            for artifact in artifacts.values()
            if "A. HISTORY OF THE SOFTWARE" in artifact.text
            and "PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2" in artifact.text
        ),
        None,
    )
    if license_text is None:
        raise RuntimeError(
            "complete Python Software Foundation license text is unavailable"
        )
    for package in packages:
        if package.name in {"cpython", "cpython-standalone"}:
            add_artifact(artifacts, package, "canonical:CPython-LICENSE", license_text)


def render_inventory(packages: set[PackageRef]) -> list[str]:
    lines: list[str] = []
    for ecosystem in (
        "frontend",
        "desktop",
        "desktop-runtime",
        "docker-runtime",
        "python-runtime",
    ):
        selected = sorted(
            package for package in packages if package.ecosystem == ecosystem
        )
        lines.extend([f"## {ecosystem}", ""])
        for package in selected:
            metadata = []
            if package.author:
                metadata.append(f"author: {package.author}")
            if package.homepage:
                metadata.append(f"homepage: {package.homepage}")
            suffix = f"; {'; '.join(metadata)}" if metadata else ""
            lines.append(
                f"- {package.identity} — declared license: {package.declared_license}{suffix}"
            )
        lines.append("")
    return lines


def render(artifacts: dict[str, LegalArtifact], packages: set[PackageRef]) -> str:
    lines = [
        "THIRD-PARTY SOFTWARE NOTICES AND LICENSES",
        "=========================================",
        "",
        "This file is generated by scripts/generate_third_party_notices.py from",
        "the locked production dependency graphs and the license/NOTICE files in",
        "the installed distributions. Do not edit it manually.",
        "",
        "The presence of a license below does not change the Apache-2.0 license",
        "of OmniFic's own code. Each third-party component remains under its own",
        "license terms.",
        "",
        "PACKAGE INVENTORY",
        "=================",
        "",
    ]
    lines.extend(render_inventory(packages))
    lines.extend(
        [
            "SOURCE CODE AVAILABILITY",
            "========================",
            "",
            "For components whose license requires source-code availability, including",
            "components offered under MPL-2.0, the corresponding source for the exact",
            "package versions listed above can be obtained from each package's",
            "source/homepage or registry URL in the inventory.",
            "",
            "LICENSE AND NOTICE TEXTS",
            "========================",
            "",
        ]
    )

    ordered = sorted(
        artifacts.items(),
        key=lambda item: (
            sorted(package.identity.lower() for package in item[1].packages),
            item[0],
        ),
    )
    for index, (digest, artifact) in enumerate(ordered, start=1):
        lines.extend(
            [
                f"Artifact {index} — SHA-256 {digest}",
                "-" * 80,
                "Applies to:",
            ]
        )
        for package in sorted(artifact.packages):
            lines.append(f"- [{package.ecosystem}] {package.identity}")
        lines.append("Source labels:")
        for label in sorted(artifact.labels):
            lines.append(f"- {label}")
        lines.extend(["", artifact.text.rstrip(), "", "=" * 80, ""])

    fonts = (ROOT / "third_party" / "fonts" / "FONTS.md").read_text(encoding="utf-8")
    ofl = (ROOT / "third_party" / "fonts" / "OFL-1.1.txt").read_text(encoding="utf-8")
    lines.extend(
        [
            "BUNDLED FONT ATTRIBUTION",
            "========================",
            "",
            fonts.rstrip(),
            "",
            "SIL OPEN FONT LICENSE 1.1",
            "-------------------------",
            "",
            ofl.rstrip(),
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    artifacts: dict[str, LegalArtifact] = {}
    packages: set[PackageRef] = set()
    packages.update(npm_packages("frontend", artifacts))
    packages.update(npm_packages("desktop", artifacts))
    packages.update(desktop_runtime_packages(artifacts))
    packages.update(docker_runtime_packages(artifacts))
    locked = locked_python_packages()
    vendored_names = {
        normalize_package_name(name) for name, _, _, _ in UNIVERSAL_PYTHON_PACKAGES
    }
    packages.update(python_packages(artifacts, locked, vendored_names))
    packages.update(universal_python_packages(artifacts, locked))
    attach_cpython_license(artifacts, packages)
    recorded_python = {
        (normalize_package_name(package.name), package.version)
        for package in packages
        if package.ecosystem == "python-runtime"
    }
    expected_python = set(locked.items())
    if recorded_python != expected_python:
        raise RuntimeError(
            "Python notice inventory does not exactly match the universal lock graph: "
            f"missing={sorted(expected_python - recorded_python)}, "
            f"extra={sorted(recorded_python - expected_python)}"
        )
    generated = render(artifacts, packages)

    output = args.output if args.output.is_absolute() else ROOT / args.output
    if args.check:
        if not output.exists() or output.read_text(encoding="utf-8") != generated:
            print(f"{output.relative_to(ROOT)} is missing or stale", file=sys.stderr)
            return 1
        print(
            f"Verified {output.relative_to(ROOT)} for {len(packages)} package records "
            f"and {len(artifacts)} unique legal texts."
        )
        return 0

    output.write_text(generated, encoding="utf-8")
    print(
        f"Generated {output.relative_to(ROOT)} for {len(packages)} package records "
        f"and {len(artifacts)} unique legal texts."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
