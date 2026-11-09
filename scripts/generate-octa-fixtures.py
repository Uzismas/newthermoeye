"""Create deterministic OCTA gate fixtures for the local real-stack test.

Every image is synthetic and has no patient data or clinical ground truth.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def textured(size: tuple[int, int] = (128, 128)) -> Image.Image:
    width, height = size
    image = Image.new("L", size, 35)
    draw = ImageDraw.Draw(image)
    for offset in range(-20, width, 18):
        draw.line((offset, 0, offset + 48, height), fill=205, width=2)
        draw.line((0, offset, width, offset + 42), fill=160, width=2)
    return image


def save(image: Image.Image, output: Path, fmt: str) -> None:
    image.save(output, format=fmt, optimize=True if fmt == "PNG" else False)


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: generate-octa-fixtures.py OUTPUT_DIR")
    root = Path(sys.argv[1]).resolve()
    root.mkdir(parents=True, exist_ok=True)
    gray = textured()
    gray_array = np.asarray(gray, dtype=np.uint8)
    color = Image.fromarray(np.stack([gray_array, np.roll(gray_array, 7, axis=1), np.roll(gray_array, 13, axis=0)], axis=2), mode="RGB")
    tiny = Image.new("L", (32, 32), 120)
    low = Image.new("L", (128, 128), 100)
    # Keep the PNG signature but break the payload so MIME detection passes and
    # the local decoder must reject the corrupt image.
    corrupt = bytearray(b"\x89PNG\r\n\x1a\n") + bytearray(b"corrupt-octa-fixture")
    save(gray, root / "grayscale.png", "PNG")
    save(color, root / "false-color.png", "PNG")
    save(color.convert("RGBA"), root / "rgba.png", "PNG")
    save(gray.convert("P"), root / "palette.png", "PNG")
    save(Image.fromarray(gray_array.astype(np.uint16) * 257), root / "uint16.tiff", "TIFF")
    save(low, root / "low-quality.png", "PNG")
    save(tiny, root / "tiny.png", "PNG")
    (root / "corrupt.png").write_bytes(corrupt)
    manifest = {
        "synthetic": True,
        "description": "Deterministic synthetic OCTA-like fixtures; no patient data or clinical ground truth.",
        "files": sorted(path.name for path in root.iterdir()),
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
