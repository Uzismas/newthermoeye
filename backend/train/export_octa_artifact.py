"""Export and validate an OCTA checkpoint without retraining it."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import onnx
import onnxruntime as ort
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from train.train_octa_segmentation import IMAGE_SIZE, OCTADataset, SmallUNet, run_epoch


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("data/octa"))
    parser.add_argument("--model-dir", type=Path, default=Path("models/octa"))
    args = parser.parse_args()

    checkpoint = args.model_dir / "octa_vessel_unet.pt"
    onnx_path = args.model_dir / "octa_vessel_unet.onnx"
    if not checkpoint.exists():
        raise SystemExit(f"Missing checkpoint: {checkpoint}")

    with (args.data_dir / "metadata.csv").open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    test_rows = [row for row in rows if row.get("source_split") == "test"]
    if not test_rows:
        raise SystemExit("metadata.csv has no published test rows")

    model = SmallUNet().eval()
    model.load_state_dict(torch.load(checkpoint, map_location="cpu", weights_only=True))
    test_metrics = run_epoch(
        model,
        DataLoader(OCTADataset(test_rows, args.data_dir), batch_size=4, shuffle=False),
        None,
        "cpu",
        False,
    )
    torch.onnx.export(
        model,
        torch.zeros(1, 1, IMAGE_SIZE, IMAGE_SIZE),
        onnx_path,
        input_names=["image"],
        output_names=["vessel_logits"],
        opset_version=17,
        dynamo=False,
    )
    onnx.checker.check_model(onnx.load(onnx_path))
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    session.run(None, {"image": torch.zeros(1, 1, IMAGE_SIZE, IMAGE_SIZE).numpy()})
    (args.model_dir / "model_card.json").write_text(json.dumps({
        "name": "Thermoeye OCTA vessel segmentation baseline",
        "scope": "Vessel segmentation only; not AD/MCI classification or diagnosis",
        "image_size": IMAGE_SIZE,
        "device": "cpu",
        "checkpoint": str(checkpoint),
        "test": test_metrics,
        "test_rows": len(test_rows),
        "split": "published ROSE-O test split",
        "note": "Artifact exported from the completed checkpoint; independent clinical validation is required.",
    }, indent=2), encoding="utf-8")
    print(f"Exported and validated: {onnx_path}")
    print(f"Test rows: {len(test_rows)}; Dice: {test_metrics['dice']:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
