"""Report whether the backend venv can serve local ONNX vessel segmentation."""
import importlib

for name in ("onnxruntime", "PIL", "fastapi", "numpy", "uvicorn"):
    try:
        mod = importlib.import_module(name)
        print(f"{name}: {getattr(mod, '__version__', 'installed')}")
    except Exception as exc:  # noqa: BLE001 - diagnostic output
        print(f"{name}: MISSING ({exc.__class__.__name__}: {exc})")

import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
for name in ("octa_vessel_unet.onnx", "octa_vessel_unet.onnx.data", "octa_vessel_unet.pt"):
    p = root / "backend" / "models" / "octa" / name
    print(f"{name}: exists={p.exists()} bytes={p.stat().st_size if p.exists() else 0}")

import sys
sys.path.insert(0, str(root / "backend"))
print("backend importable:", (root / "backend" / "app" / "main.py").exists())