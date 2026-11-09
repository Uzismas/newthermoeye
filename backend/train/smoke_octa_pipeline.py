"""Dependency/runtime smoke test for the local OCTA pipeline.

This creates an in-memory synthetic image only to verify that image loading,
quality gating, measurements, and the API contract work. It is not training
data and its output must never be used as a clinical metric.
"""

from __future__ import annotations

import sys
import os
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
from PIL import Image, ImageDraw

from app.octa_pipeline import analyze_octa


def main() -> int:
    size = 128
    image = Image.new("L", (size, size), 24)
    draw = ImageDraw.Draw(image)
    for offset in range(-20, 100, 18):
        draw.line((offset, 0, offset + 48, size), fill=205, width=2)
        draw.line((0, offset, size, offset + 42), fill=160, width=2)
    array = np.asarray(image, dtype=np.uint8)
    encoded = BytesIO()
    Image.fromarray(array).save(encoded, format="PNG")
    # Smoke must validate the installed ONNX artifact, never the opt-in baseline.
    previous_engine = os.environ.get("OCTA_SEGMENTATION_ENGINE")
    os.environ["OCTA_SEGMENTATION_ENGINE"] = "onnx_vessel_unet"
    try:
        result = analyze_octa(encoded.getvalue(), "synthetic-smoke.png")
    finally:
        if previous_engine is None:
            os.environ.pop("OCTA_SEGMENTATION_ENGINE", None)
        else:
            os.environ["OCTA_SEGMENTATION_ENGINE"] = previous_engine
    assert result["ok"] is True
    assert result["classification"]["label"] == "indeterminate"
    assert result["analysis_status"] == "measured", result["failure_reason"]
    assert result["engine"] == "onnx_vessel_unet"
    assert result["trained_model_connected"] is True
    assert result["classification"]["risk_level"] == "indeterminate"
    assert result["classification"]["risk_score"] is None
    assert result["classification"]["confidence"] is None
    assert result["classification"]["differentials"] == []
    assert result["measurements"] is not None
    for key in ("vessel_density", "faz_risk_proxy", "perfusion_density"):
        assert key in result["measurements"]
    assert result["measurements"]["perfusion_density"] is None
    assert result["metric_unit"] == "percent_0_100"
    assert result["preprocessing_version"]
    assert len(result["provenance"]["model_sha256"]) == 64
    print(f"Engine: {result['engine']}; model: {result['model_version']}")
    print("OCTA pipeline smoke test passed")
    print("This validates code execution only; no clinical performance is inferred.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
