#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Apply and verify Apache-2.0 section 4(b) modification notices.

OmniFic is derived from OpenFic v0.7.5.  Apache-2.0 section 4(b)
requires files changed from that work to carry a prominent notice stating
that they were changed.  This utility derives the file set from Git instead
of relying on a manually maintained list.
"""

from __future__ import annotations

import argparse
import binascii
import json
import struct
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = "v0.7.5"
NOTICE_TEXT = "Modified by OmniFic contributors from OpenFic v0.7.5."
JSON_NOTICE_KEY = "_omnificModificationNotice"
RELEASE_MANIFEST_NOTICE_KEY = "MODIFIED-BY-OMNIFIC-CONTRIBUTORS-FROM-OPENFIC-V0.7.5"
PNG_NOTICE_KEY = "Modification Notice"


HASH_COMMENT_NAMES = {
    ".gitignore",
    "Dockerfile",
    "justfile",
}
HASH_COMMENT_SUFFIXES = {
    ".gitignore",
    ".ini",
    ".lock",
    ".py",
    ".spec",
    ".toml",
    ".yaml",
    ".yml",
}
SLASH_COMMENT_SUFFIXES = {".cts", ".js", ".mjs", ".mts", ".ts", ".tsx"}
BLOCK_COMMENT_SUFFIXES = {".css"}
HTML_COMMENT_SUFFIXES = {".html", ".md", ".svg"}
JSON_SUFFIXES = {".json", ".webmanifest"}


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return result.stdout


def modified_paths(baseline: str) -> list[Path]:
    output = run_git(
        "diff",
        "--name-only",
        "--diff-filter=MR",
        "--find-renames",
        baseline,
        "--",
    )
    return [ROOT / line for line in output.splitlines() if line]


def text_notice_for(path: Path) -> str | None:
    suffix = path.suffix.lower()
    if path.name in HASH_COMMENT_NAMES or suffix in HASH_COMMENT_SUFFIXES:
        return f"# {NOTICE_TEXT}"
    if suffix in SLASH_COMMENT_SUFFIXES:
        return f"// {NOTICE_TEXT}"
    if suffix in BLOCK_COMMENT_SUFFIXES:
        return f"/* {NOTICE_TEXT} */"
    if suffix in HTML_COMMENT_SUFFIXES:
        return f"<!-- {NOTICE_TEXT} -->"
    return None


def insertion_offset(text: str, path: Path) -> int:
    lines = text.splitlines(keepends=True)
    if not lines:
        return 0

    first = lines[0].lower()
    if first.startswith("#!"):
        return len(lines[0])
    if path.name == "Dockerfile" and first.startswith("# syntax="):
        return len(lines[0])
    if first.startswith("<?xml") or first.startswith("<!doctype"):
        return len(lines[0])
    if first.strip() == "---":
        return len(lines[0])
    return 0


def apply_text_notice(path: Path, *, check: bool) -> bool:
    notice = text_notice_for(path)
    if notice is None:
        return False
    payload = path.read_bytes()
    text = payload.decode("utf-8")
    if notice in text[:2048]:
        notice_crlf = (notice + "\r\n").encode("utf-8")
        if notice_crlf in payload[:2048]:
            if check:
                return False
            path.write_bytes(
                payload.replace(notice_crlf, (notice + "\n").encode("utf-8"), 1)
            )
        return True
    if check:
        return False
    offset = insertion_offset(text, path)
    updated = text[:offset] + notice + "\n" + text[offset:]
    path.write_bytes(updated.encode("utf-8"))
    return True


def json_supports_comments(path: Path) -> bool:
    return path.name.startswith("tsconfig")


def apply_json_notice(path: Path, *, check: bool) -> bool:
    payload = path.read_bytes()
    text = payload.decode("utf-8")
    newline = "\r\n" if b"\r\n" in payload else "\n"
    if json_supports_comments(path):
        notice = f"// {NOTICE_TEXT}"
        if notice in text[:2048]:
            return True
        if check:
            return False
        path.write_bytes((notice + newline + text).encode("utf-8"))
        return True

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return False
    if not isinstance(data, dict):
        return False

    if path.name == "release-please-config.json":
        footer = str(data.get("pull-request-footer") or "")
        if NOTICE_TEXT in footer:
            return True
        if check:
            return False
        brace = text.find("{")
        insertion = (
            f'{newline}  "pull-request-footer": '
            f"{json.dumps('Release configuration: ' + NOTICE_TEXT)},"
        )
        path.write_bytes(
            (text[: brace + 1] + insertion + text[brace + 1 :]).encode("utf-8")
        )
        return True

    if path.name == ".release-please-manifest.json":
        if data.get(RELEASE_MANIFEST_NOTICE_KEY) == "0.0.0":
            return True
        if check:
            return False
        brace = text.find("{")
        insertion = f'{newline}  "{RELEASE_MANIFEST_NOTICE_KEY}": "0.0.0",'
        path.write_bytes(
            (text[: brace + 1] + insertion + text[brace + 1 :]).encode("utf-8")
        )
        return True

    if data.get(JSON_NOTICE_KEY) == NOTICE_TEXT:
        return True
    if check:
        return False

    # Preserve the existing formatting and key order by inserting one field
    # immediately after the opening brace instead of serializing the file.
    brace = text.find("{")
    if brace < 0:
        return False
    tail = text[brace + 1 :]
    separator = "" if tail.lstrip().startswith("}") else ","
    insertion = f'{newline}  "{JSON_NOTICE_KEY}": {json.dumps(NOTICE_TEXT)}{separator}'
    path.write_bytes((text[: brace + 1] + insertion + tail).encode("utf-8"))
    return True


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_chunks(payload: bytes):
    if not payload.startswith(PNG_SIGNATURE):
        raise ValueError("not a PNG file")
    offset = len(PNG_SIGNATURE)
    while offset < len(payload):
        length = struct.unpack(">I", payload[offset : offset + 4])[0]
        chunk_type = payload[offset + 4 : offset + 8]
        data_start = offset + 8
        data_end = data_start + length
        chunk_end = data_end + 4
        yield chunk_type, payload[data_start:data_end], payload[offset:chunk_end]
        offset = chunk_end


def make_png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = binascii.crc32(chunk_type)
    crc = binascii.crc32(data, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def apply_png_notice(path: Path, *, check: bool) -> bool:
    payload = path.read_bytes()
    chunks = list(png_chunks(payload))
    wanted = PNG_NOTICE_KEY.encode("latin-1") + b"\x00" + NOTICE_TEXT.encode("latin-1")
    if any(chunk_type == b"tEXt" and data == wanted for chunk_type, data, _ in chunks):
        return True
    if check:
        return False

    output = bytearray(PNG_SIGNATURE)
    for chunk_type, data, raw in chunks:
        if chunk_type == b"tEXt" and data.startswith(
            PNG_NOTICE_KEY.encode("latin-1") + b"\x00"
        ):
            continue
        if chunk_type == b"IEND":
            output.extend(make_png_chunk(b"tEXt", wanted))
        output.extend(raw)
    path.write_bytes(bytes(output))
    return True


def handle_path(path: Path, *, check: bool) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() == ".png":
        return apply_png_notice(path, check=check)
    if path.suffix.lower() in JSON_SUFFIXES:
        return apply_json_notice(path, check=check)
    return apply_text_notice(path, check=check)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", default=DEFAULT_BASELINE)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    missing: list[str] = []
    paths = modified_paths(args.baseline)
    for path in paths:
        if not handle_path(path, check=args.check):
            missing.append(str(path.relative_to(ROOT)))

    if missing:
        action = "Missing or unsupported" if args.check else "Unsupported"
        print(f"{action} modification notices:", file=sys.stderr)
        for item in missing:
            print(f"  {item}", file=sys.stderr)
        return 1

    verb = "Verified" if args.check else "Applied"
    print(
        f"{verb} modification notices for {len(paths)} files changed from {args.baseline}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
