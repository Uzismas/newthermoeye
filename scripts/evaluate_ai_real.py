"""Independent evaluation of the OCTA vessel AI through the same path the website uses.

1. All 9 held-out ROSE-O test images -> POST /api/analyze (website) -> mask vs expert mask.
2. Same images straight to the backend -> masks must be pixel-identical to (1) (the web proxy must not alter results).
3. Robustness: flips, rotation, JPEG, blur, darkening, noise, downscale.
4. Negative controls: inputs that are not OCTA must not be measured.
Writes docs/evidence/ai-eval/{results.json,examples.png}. Needs the local demo running WITHOUT THERMOEYE_BACKEND_KEY.
Run: backend/.venv/Scripts/python.exe scripts/evaluate_ai_real.py
"""
import base64, csv, io, json, statistics, sys, urllib.error, urllib.request, uuid
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "backend/train/data/octa"
OUT = ROOT / "docs/evidence/ai-eval"; OUT.mkdir(parents=True, exist_ok=True)
APP, BACKEND = "http://127.0.0.1:3000", "http://127.0.0.1:8000"


def post_multipart(url, png, name, headers=None):
    b = uuid.uuid4().hex
    body = f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: image/png\r\n\r\n'.encode() + png + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(url, body, {"Content-Type": f"multipart/form-data; boundary={b}", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, {}


def to_png(img):
    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()


def decode_mask(data_url, shape):
    m = Image.open(io.BytesIO(base64.b64decode(data_url.split(",", 1)[1]))).convert("L")
    if m.size != (shape[1], shape[0]):
        m = m.resize((shape[1], shape[0]), Image.NEAREST)
    return np.asarray(m) > 127


def scores(pred, truth):
    tp = int((pred & truth).sum()); fp = int((pred & ~truth).sum()); fn = int((~pred & truth).sum()); tn = int((~pred & ~truth).sum())
    return {"dice": 2 * tp / (2 * tp + fp + fn), "iou": tp / (tp + fp + fn), "sensitivity": tp / (tp + fn), "specificity": tn / (tn + fp), "precision": tp / (tp + fp) if tp + fp else 0.0,
            "vd_ai": 100 * pred.mean(), "vd_truth": 100 * truth.mean()}


login = urllib.request.Request(f"{APP}/api/session", json.dumps({"email": "doctor@thermoeye.demo", "password": "pilot-access"}).encode(), {"Content-Type": "application/json"})
cookie = urllib.request.urlopen(login).headers["set-cookie"].split(";")[0]
web = lambda png, name: post_multipart(f"{APP}/api/analyze", png, name, {"cookie": cookie})

rows = [r for r in csv.DictReader(open(DATA / "metadata.csv", encoding="utf-8-sig")) if r["source_split"] == "test"]
results = {"held_out": [], "robustness": [], "negative_controls": []}
cache = {}
for r in rows:
    img = Image.open(DATA / r["image_path"]).convert("L"); truth = np.asarray(Image.open(DATA / r["vessel_mask_path"]).convert("L")) > 127
    png = to_png(img)
    st, body = web(png, r["image_id"] + ".png"); a = body.get("analysis", {})
    entry = {"image": r["image_id"], "http": st, "status": a.get("analysisStatus"), "engine": a.get("engine"), "api_vd": a.get("vesselDensity")}
    if a.get("analysisStatus") == "measured":
        pred = decode_mask(a["segmentationMaskDataUrl"], truth.shape)
        entry.update({k: round(v, 4) for k, v in scores(pred, truth).items()})
        st2, direct = post_multipart(f"{BACKEND}/octa/analyze", png, r["image_id"] + ".png")
        direct_mask = decode_mask(direct["measurements"]["mask_data_url"], truth.shape) if st2 == 200 else None
        entry["web_equals_backend"] = bool(direct_mask is not None and (direct_mask == pred).all())
        entry["api_vd_matches_mask"] = bool(abs(a["vesselDensity"] - 100 * pred.mean()) < 0.01)
        cache[r["image_id"]] = (img, truth, pred)
    results["held_out"].append(entry)

# robustness on three images
def robust(name, fn_img, fn_mask, ids=("rose_o_test_01", "rose_o_test_05", "rose_o_test_09")):
    vals = []
    for i in ids:
        img, truth, _ = cache[i]
        t_img, t_truth = fn_img(img), fn_mask(Image.fromarray(truth.astype(np.uint8) * 255))
        t_truth = np.asarray(t_truth.convert("L")) > 127
        st, body = web(to_png(t_img) if not isinstance(t_img, bytes) else t_img, f"{i}-{name}.png"); a = body.get("analysis", {})
        if a.get("analysisStatus") == "measured":
            vals.append(scores(decode_mask(a["segmentationMaskDataUrl"], t_truth.shape), t_truth)["dice"])
        else:
            vals.append(None)
    ok = [v for v in vals if v is not None]
    results["robustness"].append({"transform": name, "measured": f"{len(ok)}/{len(vals)}", "mean_dice": round(statistics.mean(ok), 4) if ok else None})

ident = lambda m: m
def jpeg(img, q=60):
    b = io.BytesIO(); img.save(b, "JPEG", quality=q); return Image.open(io.BytesIO(b.getvalue())).convert("L")
rng = np.random.default_rng(0)
robust("original", lambda i: i, ident)
robust("flip horizontal", ImageOps.mirror, ImageOps.mirror)
robust("rotate 90", lambda i: i.rotate(90), lambda m: m.rotate(90))
robust("JPEG quality 60", jpeg, ident)
robust("blur radius 1.5", lambda i: i.filter(ImageFilter.GaussianBlur(1.5)), ident)
robust("darker 40%", lambda i: i.point(lambda p: int(p * 0.6)), ident)
robust("gaussian noise sd 20", lambda i: Image.fromarray(np.clip(np.asarray(i, float) + rng.normal(0, 20, (i.height, i.width)), 0, 255).astype(np.uint8)), ident)
robust("downscale to 152 px", lambda i: i.resize((152, 152), Image.BILINEAR), lambda m: m.resize((152, 152), Image.NEAREST))

# negative controls: none of these should be measured
noise = Image.fromarray(rng.integers(0, 256, (304, 304), dtype=np.uint8))
grad = Image.fromarray(np.tile(np.linspace(0, 255, 304, dtype=np.uint8), (304, 1)))
checker = Image.fromarray(((np.indices((304, 304)).sum(0) // 16) % 2 * 255).astype(np.uint8))
text = Image.new("L", (304, 304), 255); ImageDraw.Draw(text).text((20, 140), "NOT AN OCTA SCAN", fill=0)
negatives = {"random noise": noise, "blank black": Image.new("L", (304, 304), 0), "horizontal gradient": grad, "checkerboard": checker, "text on white": text,
             "photo (non-OCTA)": Image.open(ROOT / "tmp/generic-photo.png"), "OCTA colour-inverted": ImageOps.invert(cache["rose_o_test_01"][0])}
for name, img in negatives.items():
    st, body = web(to_png(img.convert("RGB") if img.mode not in ("L", "RGB") else img), "scan.png"); a = body.get("analysis", {})
    results["negative_controls"].append({"input": name, "http": st, "status": a.get("analysisStatus"), "vd": a.get("vesselDensity"), "reason": (a.get("failureReason") or "")[:90]})

# visual examples: best / median / worst by Dice
measured = sorted([e for e in results["held_out"] if "dice" in e], key=lambda e: e["dice"])
picks = [measured[-1], measured[len(measured) // 2], measured[0]]
tile = 220
sheet = Image.new("RGB", (tile * 4 + 50, (tile + 34) * len(picks) + 40), "white"); d = ImageDraw.Draw(sheet)
for c, title in enumerate(["OCTA input", "AI vessel mask", "Expert mask", "Overlay"]):
    d.text((20 + c * (tile + 10), 10), title, fill=(20, 38, 61))
for r_i, e in enumerate(picks):
    img, truth, pred = cache[e["image"]]
    over = np.zeros(truth.shape + (3,), np.uint8)
    over[pred & truth] = (255, 255, 255); over[pred & ~truth] = (234, 88, 12); over[~pred & truth] = (56, 189, 248)
    panels = [img.convert("RGB"), Image.fromarray(pred.astype(np.uint8) * 255).convert("RGB"), Image.fromarray(truth.astype(np.uint8) * 255).convert("RGB"), Image.fromarray(over)]
    y = 34 + r_i * (tile + 34)
    for c, p in enumerate(panels):
        sheet.paste(p.resize((tile, tile)), (20 + c * (tile + 10), y))
    d.text((20, y + tile + 4), f"{e['image']}  Dice {e['dice']:.3f}  VD AI {e['vd_ai']:.1f}% vs expert {e['vd_truth']:.1f}%   overlay: white=both, orange=AI only, blue=missed", fill=(60, 70, 90))
sheet.save(OUT / "examples.png")

ho = [e for e in results["held_out"] if "dice" in e]
results["summary"] = {
    "measured": f"{len(ho)}/{len(results['held_out'])}",
    "mean_dice": round(statistics.mean(e["dice"] for e in ho), 4), "min_dice": round(min(e["dice"] for e in ho), 4), "max_dice": round(max(e["dice"] for e in ho), 4),
    "mean_iou": round(statistics.mean(e["iou"] for e in ho), 4), "mean_sensitivity": round(statistics.mean(e["sensitivity"] for e in ho), 4),
    "mean_specificity": round(statistics.mean(e["specificity"] for e in ho), 4), "mean_precision": round(statistics.mean(e["precision"] for e in ho), 4),
    "mean_vd_bias_points": round(statistics.mean(e["vd_ai"] - e["vd_truth"] for e in ho), 2),
    "vd_correlation": round(float(np.corrcoef([e["vd_ai"] for e in ho], [e["vd_truth"] for e in ho])[0, 1]), 3),
    "web_equals_backend_all": all(e.get("web_equals_backend") for e in ho), "api_vd_matches_mask_all": all(e.get("api_vd_matches_mask") for e in ho),
    "negatives_wrongly_measured": [n["input"] for n in results["negative_controls"] if n["status"] == "measured"],
}
(OUT / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps(results, indent=1))
