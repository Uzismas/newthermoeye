"""Validate an OCTA segmentation metadata file before training."""

import argparse
import csv
import sys
from pathlib import Path


REQUIRED = {"subject_id", "image_path", "vessel_mask_path"}


def fail(message: str) -> int:
    print(f"[FAIL] {message}")
    return 2


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("data/octa"))
    args = parser.parse_args()
    csv_path = args.data_dir / "metadata.csv"
    if not csv_path.exists():
        return fail(f"Missing {csv_path}; add authorised OCTA metadata first.")
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        return fail("metadata.csv has no rows")
    missing = REQUIRED.difference(rows[0])
    if missing:
        return fail(f"Missing columns: {', '.join(sorted(missing))}")
    subjects = [row["subject_id"].strip() for row in rows]
    if not all(subjects):
        return fail("subject_id cannot be empty")
    missing_files = []
    for row in rows:
        for column in ("image_path", "vessel_mask_path"):
            path = args.data_dir / row[column]
            if not path.exists():
                missing_files.append(str(path))
    if missing_files:
        return fail(f"Missing {len(missing_files)} image/mask files; first is {missing_files[0]}")
    print(f"[PASS] rows: {len(rows)}")
    print(f"[PASS] subjects: {len(set(subjects))}")
    print("[PASS] image and vessel-mask paths exist")
    print("Ready for: python train_octa_segmentation.py --data-dir data/octa")
    return 0


if __name__ == "__main__":
    sys.exit(main())
