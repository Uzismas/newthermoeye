"""Prepare a reviewable metadata.csv from an extracted OCTA dataset.

This helper never uploads or deletes data. It copies matched image/mask files
into the local training folder and marks group labels as unknown for review.
Do not train until subject_id and all matches have been checked.
"""

from __future__ import annotations

import argparse
import csv
import re
import shutil
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
MASK_TOKENS = ("mask", "gt", "label", "manual", "annotation", "vessel", "seg")


def normalized_stem(path: Path) -> str:
    value = path.stem.lower()
    for token in MASK_TOKENS:
        value = re.sub(rf"(?:^|[_\-.]){re.escape(token)}(?:$|[_\-.])", "_", value)
    return re.sub(r"[^a-z0-9]+", "_", value).strip("_")


def subject_for(path: Path) -> str:
    parent = path.parent.name.lower()
    if parent not in {"img", "images", "image", "gt", "mask", "masks", "label", "labels"}:
        return path.parent.name
    return re.split(r"[_\-.]", path.stem)[0]


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare OCTA metadata from an extracted dataset.")
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("data/octa"))
    args = parser.parse_args()
    if not args.source_dir.is_dir():
        raise SystemExit(f"Source directory not found: {args.source_dir}")

    files = [path for path in args.source_dir.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS]
    masks = [path for path in files if any(token in path.stem.lower() for token in MASK_TOKENS)]
    images = [path for path in files if path not in masks]
    image_index = {}
    for image in images:
        image_index.setdefault(normalized_stem(image), image)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "images").mkdir(exist_ok=True)
    (args.out_dir / "vessel_masks").mkdir(exist_ok=True)
    rows = []
    unmatched = []
    for mask in masks:
        image = image_index.get(normalized_stem(mask))
        if image is None:
            unmatched.append(str(mask))
            continue
        image_id = normalized_stem(image) or image.stem.lower()
        image_name = f"{image_id}{image.suffix.lower()}"
        mask_name = f"{image_id}.png"
        shutil.copy2(image, args.out_dir / "images" / image_name)
        shutil.copy2(mask, args.out_dir / "vessel_masks" / mask_name)
        rows.append({
            "subject_id": subject_for(image),
            "image_id": image_id,
            "image_path": f"images/{image_name}",
            "vessel_mask_path": f"vessel_masks/{mask_name}",
            "group": "unknown",
            "device": "unknown",
            "scan_size": "unknown",
        })

    with (args.out_dir / "metadata.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["subject_id", "image_id", "image_path", "vessel_mask_path", "group", "device", "scan_size"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Matched rows: {len(rows)}")
    print(f"Unmatched masks: {len(unmatched)}")
    print(f"Wrote: {args.out_dir / 'metadata.csv'}")
    print("Review subject_id, group, device, and scan_size before training.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
