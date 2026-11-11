"""End-to-end check: real OCTA images -> website /api/analyze -> ONNX model -> mask compared with expert ground truth.

Needs the local demo running (scripts/local-demo.ps1 start) and the ROSE-O data in backend/train/data/octa.
Run: backend/.venv/Scripts/python.exe scripts/real_octa_e2e_test.py
"""
import base64, io, json, sys, urllib.request, uuid
from pathlib import Path

import numpy as np
from PIL import Image

APP = "http://127.0.0.1:3000"
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "backend/train/data/octa"


def login() -> str:
    req = urllib.request.Request(f"{APP}/api/session", json.dumps({"email": "doctor@thermoeye.demo", "password": "pilot-access"}).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return r.headers["set-cookie"].split(";")[0]


def analyze(cookie: str, name: str, data: bytes, mime: str) -> dict:
    b = uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n').encode() + data + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(f"{APP}/api/analyze", body, {"Content-Type": f"multipart/form-data; boundary={b}", "cookie": cookie})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)["analysis"]
    except urllib.error.HTTPError as e:  # rejected uploads are a valid outcome for negative tests
        return {"analysisStatus": f"http_{e.code}", "failureReason": e.read().decode()[:120]}


def png(img: Image.Image) -> bytes:
    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()


cookie = login()
rows, failed = [], 0

for n in range(1, 6):  # 5 real OCTA images with expert-drawn vessel masks
    stem = f"rose_o_test_{n:02d}"
    a = analyze(cookie, f"{stem}.png", png(Image.open(DATA / "images" / f"{stem}.tif").convert("L")), "image/png")
    truth = np.array(Image.open(DATA / "vessel_masks" / f"{stem}.tif").convert("L")) > 127
    ok = a.get("analysisStatus") == "measured" and a.get("engine") == "onnx_vessel_unet" and a.get("segmentationMaskDataUrl")
    dice = None
    if ok:
        mask = np.array(Image.open(io.BytesIO(base64.b64decode(a["segmentationMaskDataUrl"].split(",")[1]))).convert("L").resize(truth.shape[::-1], Image.NEAREST)) > 127
        dice = 2 * (mask & truth).sum() / (mask.sum() + truth.sum())
        ok = dice >= 0.6 and a["primaryDisease"] == "indeterminate" and a["riskScore"] is None
    failed += not ok
    rows.append((stem, "real OCTA", a.get("analysisStatus"), a.get("vesselDensity"), round(float(truth.mean() * 100), 2), None if dice is None else round(float(dice), 3), "PASS" if ok else "FAIL"))

negatives = {
    "photo (not OCTA)": (ROOT / "tmp/generic-photo.png").read_bytes(),
    "blank image": png(Image.new("L", (304, 304), 0)),
    "tiny 16x16 image": png(Image.new("L", (16, 16), 128)),
}
for label, data in negatives.items():  # the system must refuse to produce measurements
    a = analyze(cookie, "scan.png", data, "image/png")
    ok = a.get("analysisStatus") != "measured" and a.get("vesselDensity") is None
    failed += not ok
    rows.append((label, "must be blocked", a.get("analysisStatus"), a.get("vesselDensity"), None, None, "PASS" if ok else "FAIL"))

print(f"{'input':22}{'kind':17}{'status':18}{'AI VD%':>8}{'truth VD%':>10}{'Dice':>7}  result")
for r in rows:
    print(f"{r[0]:22}{r[1]:17}{str(r[2]):18}{str(r[3]):>8}{str(r[4]):>10}{str(r[5]):>7}  {r[6]}")
sys.exit(1 if failed else 0)
