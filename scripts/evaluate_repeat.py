"""Repeatability + accuracy: each of the 9 ROSE-O test images sent 5 times through the website (/api/analyze),
every run compared with the expert vessel and FAZ labels. Needs the local demo running without THERMOEYE_BACKEND_KEY.
Run: backend/.venv/Scripts/python.exe scripts/evaluate_repeat.py
"""
import csv, json, statistics as st, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts")); sys.path.insert(0, str(ROOT / "backend"))
# reuse helpers + login from evaluate_ai_real.py without running its evaluation loop
_src = (ROOT / "scripts/evaluate_ai_real.py").read_text(encoding="utf-8")
exec(_src[:_src.index("rows = [")])
from app import octa_pipeline as P  # noqa: E402

RUNS = 5
FAZ_GT = ROOT / "backend/train/data/rose_o_raw/ROSE-O/test/gt/FAZ"
px_mm2 = (P.FAZ_FOV_MM / P.FAZ_GRID) ** 2
rows = [r for r in csv.DictReader(open(DATA / "metadata.csv", encoding="utf-8-sig")) if r["source_split"] == "test"]
out = []
for r in rows:
    n = r["image_id"]; num = n[-2:]
    img = Image.open(DATA / r["image_path"]).convert("L"); png = to_png(img)
    truth = np.asarray(Image.open(DATA / r["vessel_mask_path"]).convert("L")) > 127
    faz_gt = np.asarray(Image.open(FAZ_GT / f"{num}.png").convert("L")) > 0
    faz_expert = faz_gt.sum() * (P.FAZ_FOV_MM ** 2) / faz_gt.size
    band_expert = P._alzheimer_faz_index(faz_expert)["band"]
    for run in range(1, RUNS + 1):
        s, body = web(png, f"{n}-run{run}.png"); a = body.get("analysis", {})
        assert s == 200 and a.get("analysisStatus") == "measured", (n, run, s, a.get("analysisStatus"))
        pred = decode_mask(a["segmentationMaskDataUrl"], truth.shape)
        acc = float((pred == truth).mean())
        s2, direct = post_multipart(f"{BACKEND}/octa/analyze", png, f"{n}.png")
        fm = decode_mask(direct["measurements"]["faz_mask_data_url"], faz_gt.shape)
        faz_dice = 2 * (fm & faz_gt).sum() / (fm.sum() + faz_gt.sum())
        out.append({"image": n, "run": run, "pixel_acc": acc, **scores(pred, truth), "faz_dice": float(faz_dice),
                    "faz": a["fazAreaMm2"], "faz_expert": faz_expert, "index": a["alzheimerFazIndex"],
                    "band": P._alzheimer_faz_index(a["fazAreaMm2"])["band"], "band_expert": band_expert,
                    "perfusion": a.get("perfusion"), "mask_hash": hash(pred.tobytes())})
        print(n, run, f"acc {acc:.4f} dice {out[-1]['dice']:.4f} fazDice {faz_dice:.3f} FAZ {a['fazAreaMm2']:.3f}/{faz_expert:.3f} idx {a['alzheimerFazIndex']}", flush=True)

json.dump(out, open(ROOT / "docs/evidence/ai-eval/repeat_5x.json", "w"), indent=1, default=float)
print("\nPER IMAGE (mean ± SD over runs)")
for n in dict.fromkeys(o["image"] for o in out):
    g = [o for o in out if o["image"] == n]
    f = lambda k: (st.mean(o[k] for o in g), st.pstdev(o[k] for o in g))
    print(n, " ".join(f"{k}={m:.4f}±{sd:.4f}" for k, (m, sd) in ((k, f(k)) for k in ("pixel_acc", "dice", "sensitivity", "specificity", "faz_dice", "faz", "index", "perfusion"))),
          "| identical masks:", len({o["mask_hash"] for o in g}) == 1, "| band ok:", sum(o["band"] == o["band_expert"] for o in g), "/", len(g))
T = lambda k: (st.mean(o[k] for o in out), st.pstdev(o[k] for o in out))
print("ALL 45:", {k: tuple(round(x, 4) for x in T(k)) for k in ("pixel_acc", "dice", "sensitivity", "specificity", "precision", "faz_dice")},
      "FAZ MAE", round(st.mean(abs(o["faz"] - o["faz_expert"]) for o in out), 4), "band", sum(o["band"] == o["band_expert"] for o in out), "/45")
