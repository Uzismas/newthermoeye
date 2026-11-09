"""Prepare ROSE-O SVC images and vessel masks for the local baseline.

ROSE-O stores images and masks in parallel train/test folders with matching
numeric filenames, so the generic filename-token matcher cannot identify the
pair. This script copies only the SVC image and SCC vessel annotation into the
training workspace and records provenance in metadata.csv.

Research use only. ROSE-O does not expose subject identifiers in the archive;
the generated subject_id is therefore a per-image stable identifier and must
not be interpreted as a patient grouping variable.
"""

from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("data/octa"))
    args = parser.parse_args()

    root = args.source_dir / "ROSE-O"
    if not root.is_dir():
        raise SystemExit(f"Expected ROSE-O directory under {args.source_dir}")

    image_out = args.out_dir / "images"
    mask_out = args.out_dir / "vessel_masks"
    image_out.mkdir(parents=True, exist_ok=True)
    mask_out.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, str]] = []

    for split in ("train", "test"):
        image_dir = root / split / "img" / "SVC"
        mask_dir = root / split / "gt" / "vessel" / "SCC"
        if not image_dir.is_dir() or not mask_dir.is_dir():
            raise SystemExit(f"Missing ROSE-O {split} SVC/SCC directories")
        for image in sorted(image_dir.glob("*.tif")):
            mask = mask_dir / image.name
            if not mask.exists():
                raise SystemExit(f"Missing mask for {split}/{image.name}")
            image_id = f"rose_o_{split}_{image.stem}"
            image_name = f"{image_id}.tif"
            mask_name = f"{image_id}.tif"
            shutil.copy2(image, image_out / image_name)
            shutil.copy2(mask, mask_out / mask_name)
            rows.append({
                "subject_id": image_id,
                "image_id": image_id,
                "image_path": f"images/{image_name}",
                "vessel_mask_path": f"vessel_masks/{mask_name}",
                "group": "unknown",
                "device": "Optovue AngioVue",
                "scan_size": "3x3mm",
                "source_split": split,
            })

    metadata = args.out_dir / "metadata.csv"
    with metadata.open("w", newline="", encoding="utf-8") as handle:
        fields = [
            "subject_id", "image_id", "image_path", "vessel_mask_path",
            "group", "device", "scan_size", "source_split",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Prepared {len(rows)} ROSE-O SVC image/mask pairs")
    print(f"Wrote: {metadata}")
    print("Note: subject IDs are per-image because the archive has no subject mapping.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
