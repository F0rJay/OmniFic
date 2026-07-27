#!/usr/bin/env python3
"""Generate OmniFic raster brand assets from the selected 1024px alpha master."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PWA = ROOT / "frontend" / "public" / "pwa-icons"
DESKTOP = ROOT / "desktop" / "build"
BRAND = ROOT / "docs" / "assets" / "brand"
README_ASSETS = ROOT / "docs" / "assets" / "readme"
MASTER = BRAND / "generated" / "omnific-logo-transparent.png"

DARK = "#070A12"


def render_icon(size: int, *, maskable: bool = False, apple: bool = False) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), DARK if maskable or apple else (0, 0, 0, 0))
    if apple:
        draw = ImageDraw.Draw(image)
        radius = int(canvas_size * 0.22)
        draw.rounded_rectangle((0, 0, canvas_size, canvas_size), radius=radius, fill=DARK)

    # The master already includes roughly 14% clear space. Maskable assets add
    # another 10% canvas inset so the visible mark stays within the safe zone.
    inset = 0.10 if maskable else 0
    usable = round(canvas_size * (1 - 2 * inset))
    offset = round(canvas_size * inset)
    with Image.open(MASTER).convert("RGBA") as master:
        logo = master.resize((usable, usable), Image.Resampling.LANCZOS)
        image.alpha_composite(logo, (offset, offset))
    return image.resize((size, size), Image.Resampling.LANCZOS)


def render_svg(svg: Path, output: Path, width: int, height: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        source = svg
        if svg.name == "omnific-hero.svg":
            source = Path(directory) / "hero-background.svg"
            logo_tag = '    <image x="84" y="78" width="380" height="380" href="../brand/generated/omnific-logo-transparent.png" preserveAspectRatio="xMidYMid meet"/>\n'
            source.write_text(svg.read_text(encoding="utf-8").replace(logo_tag, ""), encoding="utf-8")
        png = Path(directory) / "render.png"
        subprocess.run([
            "sips", "-s", "format", "png",
            "--resampleHeightWidth", str(height), str(width),
            str(source), "--out", str(png),
        ], check=True, capture_output=True)
        with Image.open(png).convert("RGBA") as rendered:
            if svg.name == "omnific-hero.svg":
                with Image.open(MASTER).convert("RGBA") as master:
                    rendered.alpha_composite(master.resize((380, 380), Image.Resampling.LANCZOS), (84, 78))
            rendered.convert("RGB").save(output, "WEBP", quality=88, method=6)


def build_icns(source: Image.Image, destination: Path) -> None:
    with tempfile.TemporaryDirectory(suffix=".iconset") as directory:
        iconset = Path(directory)
        for points in (16, 32, 128, 256, 512):
            source.resize((points, points), Image.Resampling.LANCZOS).save(iconset / f"icon_{points}x{points}.png")
            source.resize((points * 2, points * 2), Image.Resampling.LANCZOS).save(iconset / f"icon_{points}x{points}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(destination)], check=True)


def main() -> None:
    if not MASTER.exists():
        raise FileNotFoundError(f"Missing brand master: {MASTER}")

    PWA.mkdir(parents=True, exist_ok=True)
    DESKTOP.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    README_ASSETS.mkdir(parents=True, exist_ok=True)

    render_icon(192).save(PWA / "icon-192.png")
    render_icon(512).save(PWA / "icon-512.png")
    render_icon(512, maskable=True).save(PWA / "icon-512-maskable.png")
    render_icon(180, apple=True).convert("RGB").save(PWA / "apple-touch-icon.png")

    desktop = render_icon(1024, apple=True)
    desktop.save(DESKTOP / "icon.png")
    desktop.save(DESKTOP / "icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    build_icns(desktop, DESKTOP / "icon.icns")

    for size in (16, 32, 64, 192, 512):
        render_icon(size).save(BRAND / f"omnific-mark-{size}.png")

    render_svg(README_ASSETS / "omnific-hero.svg", README_ASSETS / "omnific-hero.webp", 1600, 560)


if __name__ == "__main__":
    main()
