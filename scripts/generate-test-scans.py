from __future__ import annotations

import json
import math
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter


OUTPUT_DIR = Path("test-assets/scans")
WIDTH = 666
HEIGHT = 375


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    specs = [
        # Keep existing filenames for asset compatibility; names are not labels or diagnoses.
        ("upload-demo-normal-octa.png", "synthetic_dense_vessels", 0, 72, 5, 12, 68),
        ("upload-demo-alzheimer-risk-octa.png", "synthetic_sparse_vessels", 0, 34, 4, 26, 68),
        ("upload-demo-quality-blocked-octa.png", "synthetic_large_center", 0, 22, 2, 42, 68),
        ("normal-control-01-octa.png", "synthetic_variant_01", 0, 60, 5, 24, 34),
        ("normal-control-02-octa.png", "synthetic_variant_02", 1, 60, 5, 24, 34),
        ("normal-control-03-octa.png", "synthetic_variant_03", 2, 60, 5, 24, 34),
        ("autism-demo-placeholder-01-octa.png", "synthetic_large_center_01", 10, 45, 4, 55, 12),
        ("autism-demo-placeholder-02-octa.png", "synthetic_large_center_02", 11, 50, 4, 55, 12),
        ("autism-demo-placeholder-03-octa.png", "synthetic_large_center_03", 12, 55, 4, 55, 12),
    ]

    records = []
    for filename, intended_label, seed, vessel_count, branch_depth, faz_radius, demo_age in specs:
        image = draw_scan(seed=seed, vessel_count=vessel_count, branch_depth=branch_depth, faz_radius=faz_radius)
        path = OUTPUT_DIR / filename
        image.save(path)
        metrics = analyze_image(image)
        classification = classify_metrics(metrics, age=demo_age)
        records.append(
            {
                "file": str(path),
                "intended_demo_label": intended_label,
                "current_app_expected_result": classification["label"],
                "classification": classification,
                "demo_age": demo_age,
                "analysis_status": "unavailable",
                "filename_notice": "Historical filename retained for compatibility; not a clinical label.",
                "medical_use": "synthetic demo asset only; not diagnostic; not derived from patient data",
                "generator_metadata": metrics,
            }
        )

    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    (OUTPUT_DIR / "README.md").write_text(readme(records), encoding="utf-8")

    for record in records:
        print(
            f"{record['file']} -> {record['intended_demo_label']} / "
            f"{record['current_app_expected_result']} "
            "(synthetic asset; disease risk/confidence unavailable)"
        )


def draw_scan(seed: int, vessel_count: int, branch_depth: int, faz_radius: int) -> Image.Image:
    rng = Random(seed)
    image = Image.new("RGB", (WIDTH, HEIGHT), (226, 232, 230))
    draw = ImageDraw.Draw(image)

    center = (WIDTH // 2 + rng.randint(-18, 18), HEIGHT // 2 + rng.randint(-10, 10))
    radius_x = 270
    radius_y = 158
    draw.ellipse(
        [center[0] - radius_x, center[1] - radius_y, center[0] + radius_x, center[1] + radius_y],
        fill=(218, 229, 225),
        outline=(166, 184, 180),
        width=2,
    )

    for index in range(vessel_count):
        angle = (math.tau * index / max(1, vessel_count)) + rng.uniform(-0.09, 0.09)
        start_radius = rng.uniform(faz_radius + 6, faz_radius + 22)
        end_radius = rng.uniform(118, 168)
        start = (
            center[0] + math.cos(angle) * start_radius * 1.45,
            center[1] + math.sin(angle) * start_radius * 0.9,
        )
        end = (
            center[0] + math.cos(angle + rng.uniform(-0.22, 0.22)) * end_radius * 1.55,
            center[1] + math.sin(angle + rng.uniform(-0.15, 0.15)) * end_radius,
        )
        width = rng.choice([2, 2, 3, 4])
        draw_curved_vessel(draw, rng, start, end, width)
        draw_branches(draw, rng, start, end, branch_depth, width)

    draw.ellipse(
        [center[0] - faz_radius, center[1] - faz_radius, center[0] + faz_radius, center[1] + faz_radius],
        fill=(236, 240, 238),
        outline=(159, 174, 170),
        width=1,
    )

    image = add_texture(image, rng)
    return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))


def draw_curved_vessel(draw: ImageDraw.ImageDraw, rng: Random, start: tuple[float, float], end: tuple[float, float], width: int) -> None:
    mid = ((start[0] + end[0]) / 2 + rng.uniform(-45, 45), (start[1] + end[1]) / 2 + rng.uniform(-26, 26))
    points = []
    for step in range(22):
        t = step / 21
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * mid[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * mid[1] + t**2 * end[1]
        points.append((x, y))
    draw.line(points, fill=(36, 52, 55), width=width, joint="curve")


def draw_branches(
    draw: ImageDraw.ImageDraw,
    rng: Random,
    start: tuple[float, float],
    end: tuple[float, float],
    depth: int,
    base_width: int,
) -> None:
    if depth <= 0:
        return
    for _ in range(rng.randint(1, 3)):
        t = rng.uniform(0.35, 0.82)
        origin = (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)
        angle = math.atan2(end[1] - start[1], end[0] - start[0]) + rng.choice([-1, 1]) * rng.uniform(0.35, 0.95)
        length = rng.uniform(24, 58)
        branch_end = (origin[0] + math.cos(angle) * length, origin[1] + math.sin(angle) * length)
        width = max(1, base_width - 1)
        draw_curved_vessel(draw, rng, origin, branch_end, width)
        draw_branches(draw, rng, origin, branch_end, depth - 1, width)


def add_texture(image: Image.Image, rng: Random) -> Image.Image:
    pixels = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if rng.random() > 0.045:
                continue
            r, g, b = pixels[x, y]
            delta = rng.randint(-10, 10)
            pixels[x, y] = (clamp(r + delta), clamp(g + delta), clamp(b + delta))
    return image


def analyze_image(image: Image.Image) -> dict[str, int | str | None]:
    """Describe generated assets only. Actual analysis belongs to the local backend."""
    return {
        "artifactScore": None,
        "brightness": None,
        "confidenceScore": None,
        "contrast": None,
        "demoEngineVersion": "synthetic-generator-no-inference",
        "fazRiskProxy": None,
        "imageHeight": image.height,
        "imageWidth": image.width,
        "perfusionDensityProxy": None,
        "qualityScore": None,
        "sharpness": None,
        "vesselDensity": None,
    }


def classify_metrics(metrics: dict[str, object], age: int) -> dict[str, object]:
    """Compatibility helper: synthetic pixels and age cannot establish a diagnosis."""
    return {
        "kind": "indeterminate", "primaryDisease": "indeterminate", "riskLevel": "indeterminate",
        "riskScore": None, "confidence": None, "differentials": [], "label": "Indeterminate",
    }


def readme(records: list[dict[str, object]]) -> str:
    lines = [
        "# Synthetic Thermoeye Test Scans",
        "",
        "These PNG files are generated demo assets for exercising the upload and analysis workflow.",
        "They are not patient data, are not diagnostic, and must not be used as evidence for autism, Alzheimer disease, or any clinical condition.",
        "",
        "Quick upload test files:",
        "",
        "All assets have disease status `indeterminate`, `riskScore: null`, `confidence: null`, and no differentials.",
        "Quality, modality, and vessel measurements are unavailable until the actual local backend processes an upload.",
        "",
        "Historical filenames containing normal, Alzheimer, autism, or quality-blocked are retained only for compatibility.",
        "They are not clinical labels or promises about the backend quality gate. No disease classifier is provided by this generator.",
        "",
        "## Files",
        "",
    ]
    for record in records:
        lines.append(
            f"- `{Path(str(record['file'])).name}`: intended demo label `{record['intended_demo_label']}`, "
            f"disease status `{record['current_app_expected_result']}`; no measured result is generated."
        )
    lines.append("")
    return "\n".join(lines)


def clamp(value: int) -> int:
    return max(0, min(255, value))


if __name__ == "__main__":
    main()
