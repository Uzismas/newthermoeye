"""Check FAZ area and the Alzheimer FAZ index on the 9 real ROSE-O test images against the expert FAZ labels.

Needs the ROSE-O FAZ labels (from ROSE-O.zip: ROSE-O/test/gt/FAZ/01.png ... 09.png), kept out of git.
Usage: backend/.venv/Scripts/python.exe scripts/evaluate_faz.py <folder with ROSE-O/test/gt/FAZ>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
from app import octa_pipeline as P  # noqa: E402

gt_dir = Path(sys.argv[1]) / "ROSE-O/test/gt/FAZ"
px = (P.FAZ_FOV_MM / P.FAZ_GRID) ** 2
rows = []
for i in range(1, 10):
    image = ROOT / f"test-upload-images/real-octa/rose_o_test_{i:02d}.png"
    m = P.analyze_octa(image.read_bytes(), image.name, mime_type="image/png", expected_format="PNG")["measurements"]
    gt = np.asarray(Image.open(gt_dir / f"{i:02d}.png")) > 0
    pred = np.asarray(Image.fromarray(P._faz_mask(np.asarray(Image.open(image).convert("L"), dtype=np.float64) / 255.0)))
    dice = 2 * (pred & gt).sum() / (pred.sum() + gt.sum())
    expert = gt.sum() * px
    expert_index = P._alzheimer_faz_index(expert)
    rows.append((dice, m["faz_area_mm2"], expert, m["alzheimer_faz_index"], expert_index["score"], m["alzheimer_faz_band"] == expert_index["band"]))
    print(f"test_{i:02d}  Dice {dice:.3f}  FAZ {m['faz_area_mm2']:.3f} mm2 (expert {expert:.3f})  index {m['alzheimer_faz_index']:.2f} {m['alzheimer_faz_band']:8} (from expert FAZ {expert_index['score']:.2f} {expert_index['band']})")
a = np.array(rows, dtype=float)
print(f"mean Dice {a[:, 0].mean():.3f} | mean FAZ error {np.abs(a[:, 1] - a[:, 2]).mean():.3f} mm2 | r {np.corrcoef(a[:, 1], a[:, 2])[0, 1]:.3f} | "
      f"mean index error {np.abs(a[:, 3] - a[:, 4]).mean():.3f} | same band {int(a[:, 5].sum())}/9")
