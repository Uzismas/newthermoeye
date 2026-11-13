"""Non-diagnostic OCTA vessel measurements with explicit engine provenance.

The default requires ONNX. The heuristic must be explicitly selected using
OCTA_SEGMENTATION_ENGINE; it is never a fallback for a failed model.
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone
from functools import lru_cache
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import re
from typing import Any
from uuid import uuid4
import warnings

import numpy as np
from PIL import Image, UnidentifiedImageError

MODEL_ROOT = Path(__file__).resolve().parents[1] / "models"
PIPELINE_VERSION = "octa-measurement-2026.09.19"
PREPROCESSING_VERSION = "octa-luma-u16-v2"
MAX_PIXELS = 16_000_000
MAX_BYTES = 8 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "TIFF"}
COLOR_FRACTION_WARNING_THRESHOLD = 0.12
ONNX_MODEL_PATHS = (
    MODEL_ROOT / "octa" / "octa_vessel_unet.onnx",
    MODEL_ROOT / "octa_vessel_unet.onnx",  # Earlier local installations.
)
ONNX_THRESHOLD = 0.5


class OCTAInputError(ValueError):
    """The uploaded file is not a safe, readable image."""


class OCTAEngineError(RuntimeError):
    """A non-sensitive reason for unavailable segmentation."""


def _load_grayscale(data: bytes, expected_format: str | None = None) -> tuple[np.ndarray, int, int, dict[str, Any], float]:
    """Decode once, checking size before allocating pixels.

    Colour uses ITU-R 601 luma with alpha ignored. Unsigned 16-bit grayscale
    uses a fixed 65535 divisor, never per-image contrast stretching.
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                width, height = image.size
                if width < 64 or height < 64:
                    raise OCTAInputError("Image must be at least 64x64 pixels.")
                if width * height > MAX_PIXELS:
                    raise OCTAInputError("Image has too many pixels.")
                if image.format not in ALLOWED_FORMATS:
                    raise OCTAInputError("Decoded format must be JPEG, PNG, WebP, or TIFF.")
                if expected_format is not None and image.format != expected_format:
                    raise OCTAInputError("Declared MIME type does not match the decoded image format.")
                if getattr(image, "n_frames", 1) != 1:
                    raise OCTAInputError("Multi-frame images are unsupported; export one OCT/OCTA image.")
                original_mode, decoded_format = image.mode, image.format
                image.load()
                if original_mode.startswith("I;16") or original_mode == "I":
                    values = np.asarray(image)
                    if values.min() < 0 or values.max() > 65535:
                        raise OCTAInputError("Only unsigned 16-bit integer grayscale is supported.")
                    gray = values.astype(np.float32) / 65535.0
                    conversion = "Unsigned 16-bit grayscale / 65535; fixed full-range normalization"
                    color_fraction = 0.0
                elif original_mode in {"1", "L", "LA", "P", "RGB", "RGBA", "CMYK", "YCbCr"}:
                    gray = np.asarray(image.convert("L"), dtype=np.float32) / 255.0
                    conversion = "Pillow ITU-R 601 luma (0.299R + 0.587G + 0.114B) / 255; alpha ignored"
                    sample = image.copy()
                    sample.thumbnail((512, 512), Image.Resampling.NEAREST)
                    rgb = np.asarray(sample.convert("RGB"), dtype=np.int16)
                    color_fraction = float((rgb.max(axis=2) - rgb.min(axis=2) > 24).mean())
                else:
                    raise OCTAInputError("Unsupported image mode; export an 8-bit or unsigned 16-bit scan.")
                metadata = {
                    "original_mode": original_mode, "original_channels": len(image.getbands()),
                    "decoded_channels": 1, "decoded_format": decoded_format,
                    "grayscale_conversion": conversion,
                }
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise OCTAInputError("Uploaded file is not a safe, readable image.") from exc
    return gray, width, height, metadata, color_fraction


def _modality_gate(color_fraction: float, filename: str | None) -> dict[str, Any]:
    """Conservative filename preflight, not a validated modality classifier."""
    blocked = bool(re.search(r"(?:^|[^a-z])(?:acne|skin|face|portrait|selfie|person|people|fundus)(?:[^a-z]|$)", filename or "", re.IGNORECASE))
    status = "blocked" if blocked else ("passed_with_color_warning" if color_fraction > COLOR_FRACTION_WARNING_THRESHOLD else "passed")
    reason = (
        "Explicit non-OCT photograph term in filename." if blocked else
        "Color OCT/OCTA overlays are allowed and converted to grayscale; source modality requires review."
        if status == "passed_with_color_warning" else
        "No explicit non-OCT filename signal; source modality requires review."
    )
    return {
        "status": status, "reason": reason, "color_fraction": round(color_fraction, 4),
        "color_fraction_warning_threshold": COLOR_FRACTION_WARNING_THRESHOLD,
        "validated_modality_classifier": False,
    }


def _content_gate(gray: np.ndarray) -> dict[str, Any]:
    """Reject inputs that cannot be an en-face OCTA scan, before the model sees them.

    Thresholds come from the 39 ROSE-O images plus blurred / darkened / noisy / JPEG / downscaled copies
    (lag1 0.49-0.96, detail 0.22-1.88, skew 0.89-1.90, extremes <= 0.19) with a wide margin on each side.
    Heuristic only: it cannot prove an image is OCTA, it only catches clear non-scans.
    """
    g = gray.astype(np.float64)
    std = float(g.std()) + 1e-9
    x = g - g.mean()
    lag1 = float((x[:, :-1] * x[:, 1:]).mean() / (std * std))
    detail = float(np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]).mean() / std)
    skew = float(((x / std) ** 3).mean())
    extremes = float(((g < 0.03) | (g > 0.97)).mean())
    checks = [
        (lag1 < 0.25, "pixel noise without connected vessel structure"),
        (detail < 0.10, "no fine vessel detail (smooth gradient or flat image)"),
        (extremes > 0.60, "mostly pure black and white pixels (graphic, not a scan)"),
        (skew < 0.20, "vessels are not bright on a dark background (inverted or not an OCTA scan)"),
    ]
    reasons = [text for failed, text in checks if failed]
    return {
        "status": "blocked" if reasons else "passed",
        "reason": ("Image does not look like an en-face OCTA scan: " + "; ".join(reasons) + ".") if reasons else None,
        "neighbour_correlation": round(lag1, 3), "detail": round(detail, 3), "skewness": round(skew, 3), "extreme_fraction": round(extremes, 3),
        "validated_modality_classifier": False,
    }


def _quality(gray: np.ndarray) -> dict[str, Any]:
    # Acquisition heuristics, not a clinically validated quality model.
    brightness, contrast = float(gray.mean() * 100), float(gray.std() * 100)
    dx, dy = np.abs(np.diff(gray, axis=1)).mean(), np.abs(np.diff(gray, axis=0)).mean()
    sharpness = float(min(100.0, (dx + dy) * 900.0))
    dark_fraction, clipped_fraction = float((gray < 0.03).mean()), float((gray > 0.98).mean())
    artifact_score = float(min(100.0, (dark_fraction + clipped_fraction) * 120.0))
    score = float(np.clip(42.0 + contrast * 0.52 + sharpness * 0.22 - artifact_score * 0.35, 0.0, 99.0))
    blocked = score < 45.0 or contrast < 4.0 or dark_fraction > 0.92
    return {
        "quality_score": round(score, 2), "brightness": round(brightness, 2),
        "contrast": round(contrast, 2), "sharpness": round(sharpness, 2),
        "artifact_score": round(artifact_score, 2), "blocked": blocked,
        "status": "blocked" if blocked else "passed", "metric_unit": "percent_0_100",
        "failure_reason": "Low contrast, excessive artifact, or insufficient signal." if blocked else None,
    }


def _heuristic_vessel_mask(gray: np.ndarray) -> np.ndarray:
    """Explicitly selected research proposal; not an AI model."""
    padded = np.pad(gray, 1, mode="reflect")
    neighbours = np.stack([padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:]])
    signal = gray * 0.55 + (neighbours.max(axis=0) - neighbours.min(axis=0)) * 1.8
    mask = signal >= float(np.quantile(signal, 0.72))
    mask_padded = np.pad(mask.astype(np.uint8), 1, mode="constant")
    neighbour_count = sum(mask_padded[dy:dy + mask.shape[0], dx:dx + mask.shape[1]] for dy in range(3) for dx in range(3))
    return mask & (neighbour_count >= 3)


@lru_cache(maxsize=2)
def _onnx_session(path: str, modified_ns: int, size: int):
    # The file identity invalidates the cache on artifact changes.
    del modified_ns, size
    import onnxruntime as ort
    session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    specs = session.get_inputs()
    if len(specs) != 1 or specs[0].shape != [1, 1, 256, 256] or specs[0].type != "tensor(float)":
        raise OCTAEngineError("onnx_input_contract_mismatch")
    return session, sha256(Path(path).read_bytes()).hexdigest()


def _trained_vessel_mask(gray: np.ndarray) -> tuple[np.ndarray, str]:
    model_path = next((path for path in ONNX_MODEL_PATHS if path.is_file()), None)
    if model_path is None:
        raise OCTAEngineError("onnx_artifact_missing")
    try:
        stat = model_path.stat()
        session, model_hash = _onnx_session(str(model_path), stat.st_mtime_ns, stat.st_size)
        # Training uses L images, bilinear resize and float32 / 255, without
        # mean/std normalization. Quantize 16-bit input once to this contract.
        image = Image.fromarray(np.uint8(np.rint(np.clip(gray, 0, 1) * 255)))
        resized = image.resize((256, 256), Image.Resampling.BILINEAR)
        tensor = np.asarray(resized, dtype=np.float32)[None, None, :, :] / 255.0
        logits = np.asarray(session.run(None, {session.get_inputs()[0].name: tensor})[0])
        if logits.shape != (1, 1, 256, 256) or not np.isfinite(logits).all():
            raise OCTAEngineError("onnx_output_contract_mismatch")
        probability = 1.0 / (1.0 + np.exp(-np.clip(logits[0, 0], -80, 80)))
        mask = Image.fromarray(np.uint8(probability > ONNX_THRESHOLD) * 255).resize(
            (gray.shape[1], gray.shape[0]), Image.Resampling.NEAREST,
        )
        return np.asarray(mask) > 0, model_hash
    except OCTAEngineError:
        raise
    except ImportError as exc:
        raise OCTAEngineError("onnx_runtime_unavailable") from exc
    except Exception as exc:
        # Runtime exceptions may contain local paths; expose only a safe code.
        raise OCTAEngineError("onnx_load_or_inference_failed") from exc


def inspect_model_readiness() -> dict[str, Any]:
    """Load and identify the configured ONNX model without processing an image."""
    model_path = next((path for path in ONNX_MODEL_PATHS if path.is_file()), None)
    if model_path is None:
        return {
            "status": "missing", "engine": "onnx_vessel_unet", "model_hash": None,
            "model_version": None, "artifact": "backend/models/octa/octa_vessel_unet.onnx",
            "error": "ONNX model artifact is missing. Restore backend/models/octa/octa_vessel_unet.onnx.",
        }

    model_hash = None
    model_version = None
    try:
        stat = model_path.stat()
        model_hash = sha256(model_path.read_bytes()).hexdigest()
        model_version = f"octa-vessel-unet-sha256:{model_hash}"
        card_path = ONNX_MODEL_PATHS[0].parent / "model_card.json"
        card = json.loads(card_path.read_text(encoding="utf-8"))
        expected_hash = card.get("artifact_sha256")
        if not isinstance(expected_hash, str) or expected_hash != model_hash:
            return {
                "status": "corrupt", "engine": "onnx_vessel_unet", "model_hash": model_hash,
                "model_version": model_version, "artifact": _artifact_name(model_path),
                "error": "ONNX model hash does not match model_card.json. Restore the reviewed model artifact and matching model card.",
            }
        _onnx_session(str(model_path), stat.st_mtime_ns, stat.st_size)
    except ImportError:
        status = "runtime_missing"
        error = "ONNX Runtime is unavailable. Use the project backend virtual environment and its reviewed local requirements."
    except Exception:
        status = "corrupt"
        error = "ONNX model could not be loaded or its model card is invalid. Restore the reviewed model artifact and model_card.json."
    else:
        return {
            "status": "ready", "engine": "onnx_vessel_unet", "model_hash": model_hash,
            "model_version": model_version, "artifact": _artifact_name(model_path), "error": None,
        }
    return {
        "status": status, "engine": "onnx_vessel_unet", "model_hash": model_hash,
        "model_version": model_version, "artifact": _artifact_name(model_path), "error": error,
    }


def _artifact_name(path: Path) -> str:
    return "backend/models/octa/octa_vessel_unet.onnx" if path == ONNX_MODEL_PATHS[0] else "backend/models/octa_vessel_unet.onnx"


def _mask_data_url(mask: np.ndarray) -> str:
    preview = Image.fromarray(np.uint8(mask) * 255)
    preview.thumbnail((512, 512), Image.Resampling.NEAREST)
    encoded = BytesIO()
    preview.save(encoded, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(encoded.getvalue()).decode("ascii")


def _gray_data_url(gray: np.ndarray) -> str:
    """Browser-compatible preview of the decoded source, including TIFF.

    Previews retain aspect ratio and contain only pixels, with no EXIF, TIFF
    tags or original filenames. They are returned to the caller, never logged.
    """
    preview = Image.fromarray(np.uint8(np.rint(np.clip(gray, 0, 1) * 255)))
    preview.thumbnail((512, 512), Image.Resampling.BILINEAR)
    encoded = BytesIO()
    preview.save(encoded, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(encoded.getvalue()).decode("ascii")


def _measure(mask: np.ndarray, engine: str) -> dict[str, Any]:
    height, width = mask.shape
    density = float(mask.mean() * 100)
    central = mask[int(height * 0.35):int(height * 0.65), int(width * 0.35):int(width * 0.65)]
    return {
        "vessel_density": round(density, 2),
        # Legacy transport name: central 30% rectangle non-vessel fraction,
        # not anatomical FAZ area, disease risk or a calibrated perfusion value.
        "faz_risk_proxy": round(float((1.0 - central.mean()) * 100.0), 2),
        "perfusion_density": None, "mask_coverage": round(density, 2),
        "mask_data_url": _mask_data_url(mask), "mask_width": width, "mask_height": height,
        "segmentation": {"available": True, "engine": engine, "trained_model_connected": engine == "onnx_vessel_unet"},
    }


def analyze_octa(data: bytes, filename: str | None = None, *, mime_type: str | None = None, request_id: str | None = None, expected_format: str | None = None) -> dict[str, Any]:
    if not isinstance(data, (bytes, bytearray)) or not data:
        raise OCTAInputError("Uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise OCTAInputError("Image is larger than 8 MB.")
    gray, width, height, metadata, color_fraction = _load_grayscale(data, expected_format)
    modality_gate, quality = _modality_gate(color_fraction, filename), _quality(gray)
    result: dict[str, Any] = {
        "ok": True, "analysis_status": "unavailable", "engine": "none",
        "model_version": None, "model_task": "vessel_segmentation", "trained_model_connected": False,
        "preprocessing_version": PREPROCESSING_VERSION, "threshold": None, "failure_reason": None,
        "provenance": {
            "request_id": request_id or str(uuid4()), "input_sha256": sha256(bytes(data)).hexdigest(),
            "model_sha256": None, "pipeline": "local_octa_measurement", "pipeline_version": PIPELINE_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "intended_use": "research_measurement_only", "clinical_use": "not_clinically_validated",
        },
        "input": {"width": width, "height": height, "mime_type": mime_type, **metadata},
        "preview_data_url": _gray_data_url(gray),
        "modality_gate": modality_gate, "metric_unit": "percent_0_100", "quality": quality,
        "classification": {
            "label": "indeterminate", "risk_level": "indeterminate", "risk_score": None,
            "confidence": None, "differentials": [], "reason": "No validated disease classifier is connected.", "engine": "none",
        },
        "measurements": None,
        "limitations": [
            "Vessel segmentation measurements only; no disease classification or clinical validation.",
            "Central non-vessel fraction is a research proxy, not FAZ area or disease risk; perfusion is unavailable.",
            "Modality preflight uses filename terms and simple image statistics, not a validated image classifier; some non-OCTA images may still pass.",
        ],
    }
    if modality_gate["status"] == "blocked":
        result.update(analysis_status="modality_blocked", failure_reason=modality_gate["reason"])
        return result
    content = _content_gate(gray)
    result["modality_gate"]["content_checks"] = content
    if content["status"] == "blocked" and not quality["blocked"]:
        result["modality_gate"].update(status="blocked", reason=content["reason"])
        result.update(analysis_status="modality_blocked", failure_reason=content["reason"])
        return result
    if quality["blocked"]:
        result.update(analysis_status="quality_blocked", failure_reason=quality["failure_reason"])
        return result
    engine = os.environ.get("OCTA_SEGMENTATION_ENGINE", "onnx_vessel_unet")
    if engine == "heuristic_research_baseline":
        mask = _heuristic_vessel_mask(gray)
        result["model_version"] = "heuristic-local-contrast-v1"
    elif engine == "onnx_vessel_unet":
        try:
            mask, model_hash = _trained_vessel_mask(gray)
        except OCTAEngineError as exc:
            result["failure_reason"] = str(exc)
            return result
        result.update(model_version=f"octa-vessel-unet-sha256:{model_hash}", trained_model_connected=True, threshold=ONNX_THRESHOLD)
        result["provenance"]["model_sha256"] = model_hash
    else:
        result["failure_reason"] = "unsupported_segmentation_engine"
        return result
    result.update(engine=engine, analysis_status="measured", measurements=_measure(mask, engine))
    return result
