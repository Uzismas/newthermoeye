"""Dependency-free preflight for the local APTOS training baseline.

Run from ``backend/train`` before installing PyTorch. It deliberately exits
non-zero when data is absent or malformed so a demo cannot be mistaken for a
completed training run.
"""
import csv
import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "aptos2019"


def fail(message: str) -> int:
    print(f"[FAIL] {message}")
    print("Download an authorised APTOS 2019 copy, de-identify it, and place it under backend/train/data/aptos2019/.")
    return 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate the local APTOS training dataset.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    return parser.parse_args()


def main(data_dir: Path = DATA_DIR) -> int:
    print("Thermoeye training preflight (APTOS DR baseline)")
    csv_path = data_dir / "train.csv"
    image_dir = data_dir / "train_images"
    if not csv_path.exists() or not image_dir.is_dir():
        return fail(f"Expected {csv_path} and {image_dir}")

    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        return fail("train.csv has no rows")

    required = {"id_code", "diagnosis"}
    missing = required.difference(rows[0])
    if missing:
        return fail(f"train.csv is missing columns: {', '.join(sorted(missing))}")

    ids = [str(row["id_code"]).strip() for row in rows]
    labels = [str(row["diagnosis"]).strip() for row in rows]
    if not all(identifier for identifier in ids):
        return fail("train.csv contains an empty id_code")
    if len(set(ids)) != len(ids):
        return fail("train.csv contains duplicate id_code values")
    if not all(label.isdigit() and 0 <= int(label) <= 4 for label in labels):
        return fail("diagnosis must contain integer grades from 0 to 4")
    missing_grades = sorted(set(str(grade) for grade in range(5)) - set(labels))
    if missing_grades:
        return fail(f"diagnosis is missing required grade(s): {', '.join(missing_grades)}")

    missing_images = [identifier for identifier in ids if not (image_dir / f"{identifier}.png").exists()]
    if missing_images:
        return fail(f"{len(missing_images)} image files are missing; first is {missing_images[0]}.png")

    patient_column = next(
        (
            column
            for column in ("patient_id", "patient", "subject_id", "subject")
            if column in rows[0] and all(str(row.get(column, "")).strip() for row in rows)
        ),
        None,
    )
    group_source = patient_column or "id_code (one group per image; confirm dataset patient metadata)"
    print(f"[PASS] rows: {len(rows)}")
    print(f"[PASS] labels: {', '.join(f'{label}={labels.count(label)}' for label in sorted(set(labels), key=int))}")
    print(f"[PASS] images: {len(ids)}")
    print(f"[WARN] patient grouping: {group_source}")
    print("Ready for: python train_dr.py --data-dir data/aptos2019")
    return 0


if __name__ == "__main__":
    sys.exit(main(parse_args().data_dir))
