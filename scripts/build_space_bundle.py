"""Build a self-contained Hugging Face Space (Docker) bundle for the OCTA inference backend.

Output goes OUTSIDE the repo (default D:/Themoeye/deploy/hf-space) so the model weights are never committed.
Run: backend/.venv/Scripts/python.exe scripts/build_space_bundle.py [output_dir]
"""
import json
import shutil
import sys
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "D:/Themoeye/deploy/hf-space")
MODEL = ROOT / "backend/models/octa/octa_vessel_unet.onnx"
CARD = ROOT / "backend/models/octa/model_card.json"

card = json.loads(CARD.read_text(encoding="utf-8"))
digest = sha256(MODEL.read_bytes()).hexdigest()
assert digest == card["artifact_sha256"], "model file does not match model_card.json; refusing to bundle"

if OUT.exists():
    shutil.rmtree(OUT)
(OUT / "models/octa").mkdir(parents=True)
shutil.copytree(ROOT / "backend/app", OUT / "app", ignore=shutil.ignore_patterns("__pycache__"))
shutil.copy(MODEL, OUT / "models/octa/octa_vessel_unet.onnx")
shutil.copy(CARD, OUT / "models/octa/model_card.json")
shutil.copy(ROOT / "backend/requirements-local.txt", OUT / "requirements.txt")

(OUT / "Dockerfile").write_text('''FROM python:3.12-slim
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=user . .
USER user
ENV PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
''', encoding="utf-8")

(OUT / "README.md").write_text('''---
title: Eyezheimer OCTA inference
emoji: 👁
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

Research-only OCTA vessel segmentation service (ONNX U-Net trained on ROSE-O).
Not a medical device. Set the secret `THERMOEYE_BACKEND_KEY` in the Space settings; every `/octa/*` call must send it as the `X-Thermoeye-Key` header.
''', encoding="utf-8")

size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
print(f"bundle: {OUT}  ({size / 1e6:.1f} MB, model sha256 {digest[:12]}...)")
